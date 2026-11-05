/**
 * UCB over coupled (type × intensity) arms + cooldown / ban.
 * @module s2/ucb
 */

import {
  BAN_STEPS,
  COOLDOWN_STEPS,
  HEAVY_FAIL_COOLDOWN,
  SPEED_BIAS,
  UCB_C,
} from './constants.js'
import { allCoupledArms, parseArmId } from './arms.js'

export function createUcbState(arms = allCoupledArms()) {
  const pulls = {}
  const sumDelta = {}
  const cooldownUntil = {}
  const banUntil = {}
  for (const a of arms) {
    pulls[a] = 0
    sumDelta[a] = 0
    cooldownUntil[a] = 0
    banUntil[a] = 0
  }
  return { pulls, sumDelta, cooldownUntil, banUntil, total: 0, emptyStreak: {} }
}

export function updateUcb(state, arm, delta, t) {
  if (!(arm in state.pulls)) {
    state.pulls[arm] = 0
    state.sumDelta[arm] = 0
    state.cooldownUntil[arm] = 0
    state.banUntil[arm] = 0
  }
  state.pulls[arm] += 1
  state.sumDelta[arm] += delta
  state.total += 1
  state.emptyStreak[arm] = (state.emptyStreak[arm] || 0)
  if (delta > 0) {
    state.emptyStreak[arm] = 0
    state.cooldownUntil[arm] = t + COOLDOWN_STEPS
  } else {
    state.emptyStreak[arm] = (state.emptyStreak[arm] || 0) + 1
    const { intensity } = parseArmId(arm)
    if (intensity === 'Heavy') {
      state.cooldownUntil[arm] = t + HEAVY_FAIL_COOLDOWN
    }
    if (state.emptyStreak[arm] >= 4) {
      state.banUntil[arm] = t + BAN_STEPS
      state.emptyStreak[arm] = 0
    }
  }
}

export function meanDelta(state, arm) {
  const n = state.pulls[arm] || 0
  if (!n) return 0
  return state.sumDelta[arm] / n
}

/**
 * @returns {Set<string>}
 */
export function activeBans(state, t) {
  const ban = new Set()
  for (const [arm, until] of Object.entries(state.banUntil || {})) {
    if (until > t) ban.add(arm)
  }
  for (const [arm, until] of Object.entries(state.cooldownUntil || {})) {
    if (until > t && meanDelta(state, arm) > 0) {
      // positive-Δ cooldown: soft avoid (still eligible if nothing else)
      ban.add(`soft:${arm}`)
    }
  }
  return ban
}

export function selectArm({
  state,
  eligible,
  c = UCB_C,
  t = 0,
  speedBias = false,
  rng = Math.random,
  forceExplore = false,
}) {
  const hardBan = new Set()
  for (const [arm, until] of Object.entries(state.banUntil || {})) {
    if (until > t) hardBan.add(arm)
  }
  let pool = eligible.filter(a => !hardBan.has(a))
  if (!pool.length) pool = eligible
  // Prefer not soft-cooled arms
  const softOk = pool.filter(a => (state.cooldownUntil[a] || 0) <= t)
  if (softOk.length) pool = softOk

  if (forceExplore) {
    return pool[Math.floor(rng() * pool.length)]
  }
  const unseen = pool.filter(a => (state.pulls[a] || 0) === 0)
  if (unseen.length) return unseen[Math.floor(rng() * unseen.length)]

  const N = Math.max(1, state.total)
  let best = pool[0]
  let bestScore = -Infinity
  for (const arm of pool) {
    const n = state.pulls[arm] || 0
    let score = meanDelta(state, arm) + c * Math.sqrt(Math.log(N) / (n + 1))
    const { type } = parseArmId(arm)
    if (speedBias && type === 'speed') score *= 1 + SPEED_BIAS
    if (score > bestScore) {
      bestScore = score
      best = arm
    }
  }
  return best
}
