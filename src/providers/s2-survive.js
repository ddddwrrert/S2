/**
 * Evolve survive — unsparing top-k (prefer positive fitness, then merit).
 * @module s2/providers/s2-survive
 */

import { alive, merit } from '../host/population.js'

export const name = 's2-survive'
export const DEFAULT_K = 5

export async function survive(population, evolve) {
  const { k } = await evolve.context()
  const rows = await population.rows()
  const pool = alive(rows)
  const ranked = [...pool].sort((a, b) => {
    const pa = merit(a.fitness) > 0 ? 1 : 0
    const pb = merit(b.fitness) > 0 ? 1 : 0
    if (pb !== pa) return pb - pa
    return merit(b.fitness) - merit(a.fitness)
  })
  const keep = Math.max(1, k ?? DEFAULT_K)
  const survivors = new Set(ranked.slice(0, keep).map(r => r.id))

  await population.write(rows.map(row => (
    row.survival === 'yes' && !survivors.has(row.id)
      ? { ...row, survival: 'no' }
      : row
  )))
}

export default { name, survive }
