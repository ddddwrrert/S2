/**
 * Evolve select — sticky + offspring-potential roulette on archive.
 * @module s2/providers/s2-select
 */

import { resolvePhase } from '../phase.js'
import { normalizeStats, parentScore } from '../parent.js'
import { alive, incumbentOf, merit } from '../host/population.js'
import { loadLineage, loadState } from '../host/state.js'

export const name = 's2-select'

export async function select(population, evolve) {
  const rows = await population.rows()
  const pool = alive(rows)
  if (!pool.length) throw new Error('S2 select: no alive candidates')

  const context = await evolve.context()
  const budget = context.budget || {}
  const B = Math.max(1, budget.max ?? 1)
  const used = budget.used ?? 0
  const t = used + 1

  const state = await loadState(evolve.files)
  const lineage = await loadLineage(evolve.files)
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

  if (Math.random() < phaseInfo.pSticky || !incumbent) {
    return (incumbent || pool[0]).id
  }

  const enriched = pool.map(r => ({
    id: r.id,
    score: merit(r.fitness),
    nChildren: lineage[r.id]?.nChildren || 0,
    meanChildDelta: lineage[r.id]?.meanChildDelta || 0,
  }))
  const norms = normalizeStats(enriched)
  const weights = enriched.map(p => Math.max(1e-6, parentScore(p, norms)))
  const sum = weights.reduce((a, b) => a + b, 0)
  let ticket = Math.random() * sum
  for (let i = 0; i < enriched.length; i++) {
    ticket -= weights[i]
    if (ticket <= 0) return enriched[i].id
  }
  return enriched[enriched.length - 1].id
}

export default { name, select }
