import { createUcbState } from '../ucb.js'
import { LINEAGE_FILE, MEMORY_LOG, STATE_FILE, UCB_FILE } from './paths.js'

export async function loadState(files) {
  const raw = await files.read(STATE_FILE)
  if (!raw) {
    return {
      stall: 0,
      commits: 0,
      lastBest: null,
      positiveStreak: 0,
      fingerprint: 'ok',
    }
  }
  try {
    const p = JSON.parse(raw)
    return {
      stall: Number(p.stall) || 0,
      commits: Number(p.commits) || 0,
      lastBest: typeof p.lastBest === 'number' ? p.lastBest : null,
      positiveStreak: Number(p.positiveStreak) || 0,
      fingerprint: p.fingerprint || 'ok',
    }
  } catch {
    return {
      stall: 0,
      commits: 0,
      lastBest: null,
      positiveStreak: 0,
      fingerprint: 'ok',
    }
  }
}

export async function saveState(files, state) {
  await files.write(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`)
}

export async function loadUcb(files) {
  const raw = await files.read(UCB_FILE)
  const base = createUcbState()
  if (!raw) return base
  try {
    const p = JSON.parse(raw)
    return {
      pulls: { ...base.pulls, ...(p.pulls || {}) },
      sumDelta: { ...base.sumDelta, ...(p.sumDelta || {}) },
      cooldownUntil: { ...base.cooldownUntil, ...(p.cooldownUntil || {}) },
      banUntil: { ...base.banUntil, ...(p.banUntil || {}) },
      emptyStreak: { ...(p.emptyStreak || {}) },
      total: Number(p.total) || 0,
    }
  } catch {
    return base
  }
}

export async function saveUcb(files, ucb) {
  await files.write(UCB_FILE, `${JSON.stringify(ucb, null, 2)}\n`)
}

export async function loadLineage(files) {
  const raw = await files.read(LINEAGE_FILE)
  if (!raw) return {}
  try {
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

export async function saveLineage(files, lineage) {
  await files.write(LINEAGE_FILE, `${JSON.stringify(lineage, null, 2)}\n`)
}

export function recordLineage(lineage, parentId, delta) {
  const cur = lineage[parentId] || { nChildren: 0, meanChildDelta: 0 }
  const n = cur.nChildren + 1
  lineage[parentId] = {
    nChildren: n,
    meanChildDelta: cur.meanChildDelta + (delta - cur.meanChildDelta) / n,
  }
  return lineage
}

export function parseJsonl(raw) {
  if (!raw) return []
  const rows = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try {
      rows.push(JSON.parse(line))
    } catch { /* skip */ }
  }
  return rows
}

export async function commitMemory(files, entry) {
  await files.append(MEMORY_LOG, `${JSON.stringify({
    ts: new Date().toISOString(),
    ...entry,
  })}\n`)
}

export async function retrieveMemory(files, { arm, bootstrap = false, limit = 3 } = {}) {
  if (bootstrap) return []
  const rows = parseJsonl(await files.read(MEMORY_LOG))
  const type = String(arm).split(':')[0]
  return rows
    .filter(r => {
      if (typeof r.delta !== 'number' || r.delta <= 0) return false
      return r.arm === arm || String(r.arm).split(':')[0] === type
    })
    .sort((a, b) => (b.utility ?? b.delta) - (a.utility ?? a.delta))
    .slice(0, limit)
    .map(r => r.when || `u=${r.utility ?? r.delta}`)
}
