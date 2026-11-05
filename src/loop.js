/**
 * S2 FOCUS main loop.
 * Daily step: ≤1 official evaluate (smoke free).
 * Stall + remaining B≥2: optional paired real probe (2B).
 * @module s2/loop
 */

import { createArchive, signatureEntropy, signatureOf } from './archive.js'
import { closedTemplate } from './arms.js'
import { classifyFailure } from './failure.js'
import { createMemory } from './memory.js'
import { recordOffspring } from './parent.js'
import { resolvePhase } from './phase.js'
import { selectPairedArm, selectParentAndArm } from './select.js'
import { smokeTest } from './smoke.js'
import { survive } from './survive.js'
import { createUcbState, updateUcb } from './ucb.js'

/**
 * @param {object} opts
 * @param {number} opts.B
 * @param {object} opts.seed
 * @param {Function} opts.mutate
 * @param {Function} opts.evaluate
 * @param {Function} [opts.smoke]
 * @param {Function} [opts.rng]
 * @param {Function} [opts.onStep]
 * @param {boolean} [opts.enablePaired=true]
 */
export async function runFocus(opts) {
  const {
    B,
    seed,
    mutate,
    evaluate,
    smoke,
    rng = Math.random,
    onStep,
    enablePaired = true,
  } = opts

  if (!B || B < 1) throw new Error('B must be >= 1')
  if (!seed) throw new Error('seed required')

  const archive = createArchive()
  const ucb = createUcbState()
  const mem = createMemory()

  let incumbent = await ensureScored(seed, evaluate)
  incumbent.preserveMark = true
  incumbent.signature = incumbent.signature || signatureOf(incumbent.payload)

  const history = []
  const recentSigs = [incumbent.signature]
  let stall = 0
  let positiveStreak = 0
  let scored = 0
  let t = 0
  let lastFp = classifyFailure({ score: incumbent.score, meta: {} })
  let safety = 0

  while (scored < B && safety < B * 5) {
    safety += 1
    t += 1
    const remaining = B - scored
    const entropy = signatureEntropy(recentSigs.slice(-12))
    const phaseInfo = resolvePhase({
      t,
      B,
      stall,
      bestScore: incumbent.score,
      positiveStreak,
      signatureEntropy: entropy,
    })

    const { parent, arm, fromArchive, families } = selectParentAndArm({
      incumbent,
      archive,
      ucb,
      phaseInfo,
      fingerprint: lastFp,
      t,
      B,
      rng,
    })

    const tryOne = async (a) => {
      const step = await proposeProbeCompose({
        parent,
        arm: a,
        mutate,
        evaluate,
        smoke,
        mem,
        phaseInfo,
        lastFp,
      })
      if (step.skipEval) {
        updateUcb(ucb, a, -0.01, t)
        return { ...step, consumed: 0 }
      }
      updateUcb(ucb, a, step.delta, t)
      recordOffspring(parent, step.delta)
      return { ...step, consumed: 1 }
    }

    const doPaired = enablePaired && phaseInfo.paired && remaining >= 2
    if (doPaired) {
      const arm2 = selectPairedArm({
        ucb,
        phaseInfo,
        fingerprint: lastFp,
        excludeArm: arm,
        t,
        rng,
      })
      const r1 = await tryOne(arm)
      if (!r1.consumed) {
        history.push({ t, smokeFail: true, arm })
        continue
      }
      scored += 1
      let winner = r1
      if (arm2 && scored < B) {
        const r2 = await tryOne(arm2)
        if (r2.consumed) {
          scored += 1
          winner = r1.child.score >= r2.child.score ? r1 : r2
        }
      }
      const sv = applySurvive({
        incumbent,
        archive,
        child: winner.child,
        parent,
      })
      incumbent = sv.incumbent
      lastFp = winner.fingerprint
      recentSigs.push(winner.child.signature)
      if (sv.promoted) {
        stall = 0
        positiveStreak += 1
      } else {
        stall += 1
        positiveStreak = 0
      }
      const ev = {
        t,
        phase: phaseInfo.phase,
        meta: phaseInfo.meta,
        paired: true,
        arm: winner.arm,
        fromArchive,
        families,
        childScore: winner.child.score,
        delta: winner.delta,
        best: incumbent.score,
        stall,
        promoted: sv.promoted,
        rejected: sv.rejected,
        fingerprint: lastFp,
      }
      history.push(ev)
      if (onStep) onStep(ev)
      continue
    }

    const step = await tryOne(arm)
    if (!step.consumed) {
      history.push({ t, smokeFail: true, arm })
      continue
    }
    scored += 1
    const sv = applySurvive({
      incumbent,
      archive,
      child: step.child,
      parent,
    })
    incumbent = sv.incumbent
    lastFp = step.fingerprint
    recentSigs.push(step.child.signature)
    if (sv.promoted) {
      stall = 0
      positiveStreak += 1
    } else {
      stall += 1
      positiveStreak = 0
    }
    const ev = {
      t,
      phase: phaseInfo.phase,
      meta: phaseInfo.meta,
      paired: false,
      arm,
      fromArchive,
      families,
      childScore: step.child.score,
      delta: step.delta,
      best: incumbent.score,
      stall,
      promoted: sv.promoted,
      rejected: sv.rejected,
      fingerprint: lastFp,
    }
    history.push(ev)
    if (onStep) onStep(ev)
  }

  return {
    incumbent,
    history,
    scored,
    density: scored / B,
    ucb,
    archive: archive.items,
    memory: mem.entries,
  }
}

async function ensureScored(seed, evaluate) {
  if (typeof seed.score === 'number') {
    return {
      ...seed,
      signature: seed.signature || signatureOf(seed.payload),
    }
  }
  const got = await evaluate(seed)
  const { score, meta } = unpackEval(got)
  return {
    ...seed,
    score,
    meta,
    signature: seed.signature || signatureOf(seed.payload),
  }
}

function unpackEval(got) {
  if (typeof got === 'number') return { score: got, meta: {} }
  return { score: Number(got.score) || 0, meta: got.meta || {} }
}

function applySurvive({ incumbent, archive, child, parent }) {
  return survive({
    incumbent,
    archive,
    child: {
      ...child,
      parentPreserveMark: parent.preserveMark,
    },
    smokeOk: true,
  })
}

async function proposeProbeCompose({
  parent,
  arm,
  mutate,
  evaluate,
  smoke,
  mem,
  phaseInfo,
  lastFp,
}) {
  const hints = mem.retrieve(arm, parent.signature || '')
  const instr = closedTemplate(arm, hints)
  const childRaw = await mutate(parent, instr, arm)
  const child = {
    id: childRaw.id || `c-${arm}`,
    payload: childRaw.payload ?? childRaw,
    signature: childRaw.signature || signatureOf(childRaw.payload ?? childRaw),
    score: 0,
    preserveMark: true,
  }

  const sm = await smokeTest(child, smoke)
  if (!sm.ok) {
    mem.commit({
      arm,
      delta: 0,
      when: `${phaseInfo.phase}|smoke_fail|${sm.reason}`,
      fingerprint: lastFp,
      utility: -0.1,
    })
    return {
      arm,
      child: { ...child, score: parent.score ?? 0 },
      delta: 0,
      skipEval: true,
      fingerprint: lastFp,
    }
  }

  const got = await evaluate(child)
  const { score, meta } = unpackEval(got)
  child.score = score
  const delta = score - (parent.score ?? 0)
  const fingerprint = classifyFailure({
    score,
    meta,
    prevBest: parent.score ?? 0,
    stall: phaseInfo.stall ? 5 : 0,
  })
  mem.commit({
    arm,
    delta,
    when: `${phaseInfo.phase}|${arm}|${parent.signature || ''}`,
    fingerprint,
    utility: delta,
  })
  return { arm, child, delta, skipEval: false, fingerprint }
}
