/**
 * Utility-ranked memory (MemRL-style EMA), tax=0.
 * @module s2/memory
 */

import { MEMORY_CAP } from './constants.js'

const ETA = 0.3

export function createMemory(cap = MEMORY_CAP) {
  const entries = []

  function commit({ arm, delta, when, fingerprint, utility }) {
    const u0 = typeof utility === 'number' ? utility : delta
    const existing = entries.find(
      e => e.arm === arm && e.when === when && e.fingerprint === fingerprint,
    )
    if (existing) {
      existing.delta = delta
      existing.utility = existing.utility + ETA * (u0 - existing.utility)
      existing.n = (existing.n || 1) + 1
      return
    }
    entries.push({
      arm,
      delta,
      when: when || '',
      fingerprint: fingerprint || '',
      utility: u0,
      n: 1,
    })
    while (entries.length > cap) entries.shift()
  }

  function retrieve(arm, when = '', k = 3) {
    return entries
      .filter(e => e.arm === arm || e.arm.split(':')[0] === arm.split(':')[0])
      .map(e => {
        const overlap =
          when && e.when
            ? Number(e.when.split('|').some(t => when.includes(t)))
            : 0
        return { e, rank: e.utility + overlap }
      })
      .sort((a, b) => b.rank - a.rank)
      .slice(0, k)
      .map(x => x.e.when || `u=${x.e.utility.toFixed(3)}`)
  }

  return { entries, commit, retrieve }
}
