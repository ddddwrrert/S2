/**
 * Offspring-potential parent scoring (light HGM).
 * @module s2/parent
 */

import { PARENT_ALPHA, P_STICKY_DEFAULT } from './constants.js'

/**
 * @typedef {{ id: string, score: number, nChildren?: number, meanChildDelta?: number, signature?: string, payload?: unknown, preserveMark?: boolean }} Cand
 */

/**
 * @param {Cand} x
 * @param {{ minS: number, maxS: number, minD: number, maxD: number }} norms
 * @param {number} alpha
 */
export function parentScore(x, norms, alpha = PARENT_ALPHA) {
  const ns = norms.maxS === norms.minS
    ? 0.5
    : (x.score - norms.minS) / (norms.maxS - norms.minS)
  const d =
    typeof x.meanChildDelta === 'number'
      ? x.meanChildDelta
      : 0 // no kids → prior 0; fitness still via alpha
  const nd =
    norms.maxD === norms.minD ? 0.5 : (d - norms.minD) / (norms.maxD - norms.minD)
  // childless: lean on fitness
  if (!x.nChildren) return ns
  return alpha * ns + (1 - alpha) * nd
}

/**
 * @param {Cand[]} pool
 */
export function normalizeStats(pool) {
  const scores = pool.map(p => p.score)
  const deltas = pool.map(p =>
    typeof p.meanChildDelta === 'number' ? p.meanChildDelta : 0,
  )
  return {
    minS: Math.min(...scores),
    maxS: Math.max(...scores),
    minD: Math.min(...deltas),
    maxD: Math.max(...deltas),
  }
}

/**
 * Sticky incumbent, else roulette on parentScore over archive∪{I}.
 * @param {object} args
 * @param {Cand} args.incumbent
 * @param {Cand[]} args.archive
 * @param {number} [args.pSticky]
 * @param {() => number} [args.rng]
 */
export function selectParent({
  incumbent,
  archive,
  pSticky = P_STICKY_DEFAULT,
  rng = Math.random,
}) {
  if (rng() < pSticky || !archive.length) {
    return { parent: incumbent, fromArchive: false }
  }
  const pool = [incumbent, ...archive]
  const norms = normalizeStats(pool)
  const weights = pool.map(p => Math.max(1e-6, parentScore(p, norms)))
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = rng() * sum
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) {
      return {
        parent: pool[i],
        fromArchive: pool[i].id !== incumbent.id,
      }
    }
  }
  return { parent: pool[pool.length - 1], fromArchive: true }
}

/**
 * Update lineage stats after a scored child.
 * @param {Cand} parent
 * @param {number} delta
 */
export function recordOffspring(parent, delta) {
  const n = (parent.nChildren || 0) + 1
  const prev = parent.meanChildDelta || 0
  parent.nChildren = n
  parent.meanChildDelta = prev + (delta - prev) / n
}
