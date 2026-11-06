/**
 * Evolve mutate — failure-routed coupled (type×intensity) UCB + closed template.
 * @module s2/providers/s2-mutate
 */

import { closedTemplate, eligibleCoupledArms } from '../arms.js'
import { routeFamilies } from '../failure.js'
import { resolvePhase } from '../phase.js'
import { selectArm } from '../ucb.js'
import { incumbentOf, merit } from '../host/population.js'
import { MUTATION_LOG } from '../host/paths.js'
import {
  loadState,
  loadUcb,
  retrieveMemory,
  saveUcb,
} from '../host/state.js'

export const name = 's2-mutate'

export function persona() {
  return 'You are a solution worker in an AHC-style search (S2/FOCUS). '
    + 'Implement the single assigned edit; preserve the verified main loop. '
    + 'IMPLEMENT A SINGLE SOLUTION. DO NOT ATTEMPT MULTIPLE SOLUTIONS.'
}

export async function mutate(options, evolve) {
  const { parent, model, allowedTools, allowShell = true, forceArm } = options ?? {}
  if (!parent) throw new Error('s2-mutate needs parent')

  const files = evolve.files
  const context = await evolve.context()
  const rows = await evolve.population().rows()
  const parentRow = rows.find(r => r.id === parent)
  const parentFitness = options.parentFitness ?? parentRow?.fitness

  const budget = context.budget || {}
  const B = Math.max(1, budget.max ?? 1)
  const used = budget.used ?? 0
  const t = used + 1

  const state = await loadState(files)
  const incumbent = incumbentOf(rows)
  const bestScore = incumbent ? merit(incumbent.fitness) : 0
  const phaseInfo = resolvePhase({
    t,
    B,
    stall: state.stall,
    bestScore,
    positiveStreak: state.positiveStreak,
    signatureEntropy: 1,
  })

  const families = routeFamilies(state.fingerprint || 'ok')
  let ucb = await loadUcb(files)
  let eligible = eligibleCoupledArms({
    phase: phaseInfo.phase,
    hasPositiveScore: phaseInfo.hasPositiveScore,
    stall: phaseInfo.stall,
    families,
    allowHeavy: phaseInfo.allowHeavy,
  })

  if (phaseInfo.forceInspire && phaseInfo.phase === 'break') {
    const inspire = eligible.filter(a => a.startsWith('inspire') || a.startsWith('restart'))
    if (inspire.length) eligible = inspire
  }

  let arm = typeof forceArm === 'string' && forceArm.trim()
    ? forceArm.trim()
    : selectArm({
      state: ucb,
      eligible,
      c: phaseInfo.ucbC,
      t,
      speedBias: phaseInfo.speedBias,
      forceExplore: used < Math.floor(0.1 * B),
    })

  const hints = await retrieveMemory(files, {
    arm,
    bootstrap: phaseInfo.phase === 'bootstrap',
  })
  const instr = closedTemplate(arm, hints)
  const fitnessLine = typeof parentFitness === 'number'
    ? `\nParent official fitness: ${parentFitness}.`
    : ''
  const instruction = [
    'Read the task and the parent solution in this directory.',
    fitnessLine,
    '',
    instr,
    '',
    'Edit only code between #EVOLVE_START and #EVOLVE_END.',
    'Preserve-and-extend: do not delete the verified main search loop.',
    'Do not run the official evaluator; the search loop scores you after.',
  ].filter(Boolean).join('\n')

  const candidate = await evolve.allocate(parent)
  await files.append(MUTATION_LOG, `${JSON.stringify({
    ts: new Date().toISOString(),
    id: candidate.id,
    parent,
    arm,
    phase: phaseInfo.phase,
    fingerprint: state.fingerprint,
    parentFitness: typeof parentFitness === 'number' ? parentFitness : null,
  })}\n`)

  try {
    await evolve.spawnWorker(candidate.dir, instruction, {
      label: `s2-${arm}`,
      persona: persona(),
      model,
      allowShell,
      allowedTools,
    })
  } catch (error) {
    if (evolve.currentRun?.()?.signal?.aborted) throw error
  }

  await saveUcb(files, ucb)

  candidate.s2 = {
    arm,
    phase: phaseInfo.phase,
    fingerprint: state.fingerprint,
    parentFitness: typeof parentFitness === 'number' ? parentFitness : null,
  }
  return candidate
}

export default { name, mutate, persona }
