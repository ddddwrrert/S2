/**
 * Event-driven ACT / HOLD / AVOID (Meta² lite) — tunes search hparams only.
 * @module s2/meta
 */

import {
  META_POSITIVE_STREAK,
  P_STICKY_ACT,
  P_STICKY_DEFAULT,
  P_STICKY_HOLD,
  STALL_STREAK,
  UCB_C,
  UCB_C_ACT,
} from './constants.js'

/**
 * @param {object} args
 * @param {number} args.positiveStreak
 * @param {number} args.stall
 * @param {number} args.signatureEntropy
 * @returns {'ACT'|'HOLD'|'AVOID'|'NEUTRAL'}
 */
export function resolveMetaMode({ positiveStreak, stall, signatureEntropy }) {
  if (signatureEntropy < 0.25 || stall >= STALL_STREAK) return 'ACT'
  if (positiveStreak >= META_POSITIVE_STREAK) return 'HOLD'
  return 'NEUTRAL'
}

/**
 * @param {string} mode
 * @param {{ phase: string }} phaseInfo
 */
export function metaKnobs(mode, phaseInfo) {
  if (mode === 'HOLD') {
    return {
      pSticky: P_STICKY_HOLD,
      ucbC: UCB_C * 0.85,
      paired: false,
      forceInspire: false,
    }
  }
  if (mode === 'ACT') {
    return {
      pSticky: P_STICKY_ACT,
      ucbC: UCB_C_ACT,
      paired: phaseInfo.phase !== 'bootstrap',
      forceInspire: true,
    }
  }
  return {
    pSticky: P_STICKY_DEFAULT,
    ucbC: UCB_C,
    paired: false,
    forceInspire: false,
  }
}
