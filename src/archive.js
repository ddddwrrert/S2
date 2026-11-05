/**
 * Light archive + signature entropy for collapse detection.
 * @module s2/archive
 */

import { ARCHIVE_CAP } from './constants.js'

export function createArchive(cap = ARCHIVE_CAP) {
  const items = []

  function upsert(cand) {
    if (!cand || typeof cand.score !== 'number') return false
    const sig = cand.signature || String(cand.id)
    const idx = items.findIndex(x => x.signature === sig)
    if (idx >= 0) {
      if (cand.score > items[idx].score) {
        items[idx] = { ...items[idx], ...cand, signature: sig }
        return true
      }
      return false
    }
    items.push({ ...cand, signature: sig })
    items.sort((a, b) => b.score - a.score)
    while (items.length > cap) items.pop()
    return true
  }

  function pick(rng = Math.random) {
    if (!items.length) return null
    return items[Math.floor(rng() * items.length)]
  }

  return { items, upsert, pick, get cap() { return cap } }
}

export function signatureOf(payload) {
  if (payload == null) return 'null'
  if (typeof payload === 'string') {
    return payload.replace(/\s+/g, ' ').trim().slice(0, 120) || 'empty'
  }
  if (typeof payload === 'object') {
    try {
      const { x, y, speed, depth, bugs } = payload
      if (x != null) {
        return `x${x.toFixed?.(1) ?? x}|y${y?.toFixed?.(1) ?? y}|s${speed}|d${depth}|b${bugs}`
      }
      return JSON.stringify(payload).slice(0, 120)
    } catch {
      return 'obj'
    }
  }
  return String(payload).slice(0, 120)
}

/**
 * Rough entropy of recent signatures in [0,1].
 * @param {string[]} signatures
 */
export function signatureEntropy(signatures) {
  if (!signatures.length) return 1
  const counts = new Map()
  for (const s of signatures) counts.set(s, (counts.get(s) || 0) + 1)
  const n = signatures.length
  let h = 0
  for (const c of counts.values()) {
    const p = c / n
    h -= p * Math.log2(p)
  }
  const maxH = Math.log2(Math.min(n, counts.size) || 1) || 1
  return Math.min(1, h / (maxH || 1))
}
