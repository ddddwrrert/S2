/**
 * Evolve loop — S2 FOCUS.
 * Daily: 1 official evaluate. Stall + remaining≥2: paired real probe (2B).
 * Unsparing: non-improving non-novel children marked survival=no immediately.
 * @module s2/providers/s2-loop
 */

import { classifyFailure } from '../failure.js'
import { resolvePhase } from '../phase.js'
import { updateUcb } from '../ucb.js'
import { alive, merit } from '../host/population.js'
import { MUTATION_LOG } from '../host/paths.js'
import {
  commitMemory,
  loadLineage,
  loadState,
  loadUcb,
  parseJsonl,
  recordLineage,
  saveLineage,
  saveState,
  saveUcb,
} from '../host/state.js'

export const name = 's2-loop'

export async function run(args, evolve) {
  const { maxPopulation, candidates } = await evolve.context()
  const population = evolve.population()
  const runState = evolve.currentRun()
  const files = evolve.files

  let rows = await population.rows()
  if (rows.length === 0) {
    const base = await evolve.copyTask()
    const baseFitness = await evolve.evaluate(base)
    await population.append({
      id: base.id,
      parent: null,
      fitness: baseFitness,
      survival: 'yes',
    })
    rows = await population.rows()
  }

  const limit = candidates ?? Infinity
  let created = 0
  let state = await loadState(files)
  let ucb = await loadUcb(files)
  let lineage = await loadLineage(files)

  while ((await evolve.context()).budget.remaining > 0 && created < limit) {
    runState.signal.throwIfAborted()

    const context = await evolve.context()
    rows = await population.rows()
    const incumbentBefore = bestFitness(rows)
    const B = Math.max(1, context.budget.max ?? 1)
    const used = context.budget.used ?? 0
    const t = used + 1
    const phaseInfo = resolvePhase({
      t,
      B,
      stall: state.stall,
      bestScore: incumbentBefore,
      positiveStreak: state.positiveStreak,
      signatureEntropy: 1,
    })

    const parentId = await evolve.select(population)
    const remaining = context.budget.remaining
    const doPaired = phaseInfo.paired && remaining >= 2 && created + 2 <= limit

    if (doPaired) {
      const c1 = await evolve.mutate({ parent: parentId })
      created += 1
      const f1 = await evolve.evaluate(c1)
      await afterScore({
        files, population, ucb, lineage, state,
        candidate: c1, parentId, fitness: f1, rows, incumbentBefore,
      })
      ucb = await loadUcb(files)
      lineage = await loadLineage(files)
      state = await loadState(files)

      if ((await evolve.context()).budget.remaining <= 0 || created >= limit) break

      const arm1 = c1.s2?.arm
      const c2 = await evolve.mutate({
        parent: parentId,
        forceArm: arm1 ? undefined : undefined,
      })
      created += 1
      const f2 = await evolve.evaluate(c2)
      await afterScore({
        files, population, ucb, lineage, state,
        candidate: c2, parentId, fitness: f2, rows, incumbentBefore: bestFitness(await population.rows()),
      })

      // Keep only the better of the pair alive if both failed to beat incumbent
      rows = await population.rows()
      const pair = rows.filter(r => r.id === c1.id || r.id === c2.id)
      if (pair.length === 2) {
        const winner = merit(pair[0].fitness) >= merit(pair[1].fitness) ? pair[0] : pair[1]
        const loser = winner.id === pair[0].id ? pair[1] : pair[0]
        if (merit(loser.fitness) <= incumbentBefore) {
          await population.write(rows.map(r => (
            r.id === loser.id ? { ...r, survival: 'no' } : r
          )))
        }
      }
    } else {
      const candidate = await evolve.mutate({ parent: parentId })
      created += 1
      const fitness = await evolve.evaluate(candidate)
      await afterScore({
        files, population, ucb, lineage, state,
        candidate, parentId, fitness, rows, incumbentBefore,
      })
    }

    ucb = await loadUcb(files)
    lineage = await loadLineage(files)
    state = await loadState(files)

    rows = await population.rows()
    if (alive(rows).length >= maxPopulation) {
      await evolve.survive(population)
    }
  }

  rows = await population.rows()
  let best = rows[0]
  for (const row of rows) {
    if (!best || merit(row.fitness) > merit(best.fitness)) best = row
  }
  const budget = (await evolve.context()).budget
  return {
    best_id: best?.id ?? 'c000000',
    best_fitness: best?.fitness ?? 0,
    remaining: budget.remaining,
  }
}

async function afterScore({
  files, population, ucb, lineage, state,
  candidate, parentId, fitness, rows, incumbentBefore,
}) {
  const arm = candidate.s2?.arm ?? (await readArm(files, candidate.id)) ?? 'neighborhood:Med'
  const parentFitness = typeof candidate.s2?.parentFitness === 'number'
    ? candidate.s2.parentFitness
    : (rows.find(r => r.id === parentId)?.fitness ?? 0)
  const delta = fitness - (parentFitness ?? 0)
  const t = (state.commits || 0) + 1

  updateUcb(ucb, arm, delta, t)
  await saveUcb(files, ucb)

  lineage = recordLineage(lineage, parentId, delta)
  await saveLineage(files, lineage)

  const fingerprint = classifyFailure({
    score: fitness,
    meta: {},
    prevBest: incumbentBefore,
    stall: state.stall,
  })

  await commitMemory(files, {
    id: candidate.id,
    parent: parentId,
    arm,
    delta,
    utility: delta,
    fingerprint,
    when: `${candidate.s2?.phase || ''}|${arm}|${parentId}`,
  })

  const promotes = fitness > incumbentBefore
  const survival = promotes || fitness > 0 ? 'yes' : 'no'

  await population.append({
    id: candidate.id,
    parent: parentId,
    fitness,
    survival,
  })

  if (promotes) {
    state.stall = 0
    state.positiveStreak = (state.positiveStreak || 0) + 1
  } else {
    state.stall = (state.stall || 0) + 1
    state.positiveStreak = 0
  }
  state.commits = t
  state.lastBest = Math.max(incumbentBefore, fitness)
  state.fingerprint = fingerprint
  await saveState(files, state)
}

function bestFitness(rows) {
  let best = Number.NEGATIVE_INFINITY
  for (const row of alive(rows)) {
    const m = merit(row.fitness)
    if (m > best) best = m
  }
  return Number.isFinite(best) ? best : 0
}

async function readArm(files, id) {
  const rows = parseJsonl(await files.read(MUTATION_LOG))
  const row = [...rows].reverse().find(r => r.id === id)
  return typeof row?.arm === 'string' ? row.arm : null
}

export default { name, run }
