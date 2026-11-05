/**
 * Failure-routed + offspring-potential + coupled UCB selection.
 * @module s2/select
 */

import { eligibleCoupledArms } from './arms.js'
import { routeFamilies } from './failure.js'
import { selectParent } from './parent.js'
import { selectArm } from './ucb.js'

/**
 * @param {object} args
 * @returns {{ parent: object, arm: string, fromArchive: boolean, families: string[]|null }}
 */
export function selectParentAndArm({
  incumbent,
  archive,
  ucb,
  phaseInfo,
  fingerprint = 'ok',
  t,
  B,
  rng = Math.random,
}) {
  const { parent, fromArchive } = selectParent({
    incumbent,
    archive: archive.items,
    pSticky: phaseInfo.pSticky,
    rng,
  })

  const families = routeFamilies(fingerprint)
  let eligible = eligibleCoupledArms({
    phase: phaseInfo.phase,
    hasPositiveScore: phaseInfo.hasPositiveScore,
    stall: phaseInfo.stall,
    families,
    allowHeavy: phaseInfo.allowHeavy,
  })

  if (phaseInfo.forceInspire && phaseInfo.phase === 'break') {
    const inspire = eligible.filter(a => a.startsWith('inspire') || a.startsWith('restart'))
    if (inspire.length) eligible = inspire
  }

  const forceExplore = t <= Math.max(1, Math.floor(0.1 * B))
  const arm = selectArm({
    state: ucb,
    eligible,
    c: phaseInfo.ucbC,
    t,
    speedBias: phaseInfo.speedBias,
    rng,
    forceExplore,
  })

  return { parent, arm, fromArchive, families }
}

/**
 * Pick a second distinct arm for paired probe (same families).
 */
export function selectPairedArm({
  ucb,
  phaseInfo,
  fingerprint,
  excludeArm,
  t,
  rng = Math.random,
}) {
  const families = routeFamilies(fingerprint)
  let eligible = eligibleCoupledArms({
    phase: phaseInfo.phase,
    hasPositiveScore: phaseInfo.hasPositiveScore,
    stall: true,
    families,
    allowHeavy: phaseInfo.allowHeavy,
  }).filter(a => a !== excludeArm)

  if (eligible.length < 1) {
    // same type, different intensity
    const type = excludeArm.split(':')[0]
    eligible = eligibleCoupledArms({
      phase: phaseInfo.phase,
      hasPositiveScore: true,
      stall: true,
      families: [type],
      allowHeavy: true,
    }).filter(a => a !== excludeArm)
  }
  if (!eligible.length) return null
  return selectArm({
    state: ucb,
    eligible,
    c: phaseInfo.ucbC,
    t,
    speedBias: phaseInfo.speedBias,
    rng,
    forceExplore: true,
  })
}
