/**
 * Bootstrap → Climb → Break → Endgame (+ meta overlay).
 * @module s2/phase
 */

import {
  BOOTSTRAP_FRACTION,
  ENDGAME_FRACTION,
  STALL_STREAK,
} from './constants.js'
import { metaKnobs, resolveMetaMode } from './meta.js'

/**
 * @param {object} args
 */
export function resolvePhase({
  t,
  B,
  stall,
  bestScore,
  positiveStreak = 0,
  signatureEntropy = 1,
}) {
  const usedFrac = (t - 1) / Math.max(1, B)
  const remainFrac = (B - t + 1) / Math.max(1, B)
  const hasPositiveScore = bestScore > 0
  const inBootstrap = usedFrac < BOOTSTRAP_FRACTION || !hasPositiveScore
  const inEndgame = remainFrac <= ENDGAME_FRACTION && hasPositiveScore
  const stalling = stall >= STALL_STREAK

  let phase = 'climb'
  if (inBootstrap) phase = 'bootstrap'
  else if (inEndgame) phase = 'endgame'
  else if (stalling) phase = 'break'

  const mode = resolveMetaMode({
    positiveStreak,
    stall,
    signatureEntropy,
  })
  const knobs = metaKnobs(mode, { phase })

  return {
    phase,
    hasPositiveScore,
    stall: stalling,
    meta: mode,
    pSticky: knobs.pSticky,
    ucbC: knobs.ucbC,
    paired: knobs.paired && stalling,
    forceInspire: knobs.forceInspire,
    speedBias: hasPositiveScore && phase !== 'bootstrap',
    allowHeavy: phase !== 'bootstrap' && phase !== 'endgame',
  }
}
