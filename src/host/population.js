export function alive(rows) {
  return (rows || []).filter(row => row.survival === 'yes')
}

export function merit(fitness) {
  const n = Number(fitness)
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY
}

export function incumbentOf(rows) {
  const pool = alive(rows)
  if (!pool.length) return null
  let best = pool[0]
  for (const row of pool) {
    if (merit(row.fitness) > merit(best.fitness)) best = row
  }
  return best
}
