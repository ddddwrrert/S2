/**
 * S2 — FOCUS search strategy
 * Failure-routed · Offspring-potential · Coupled type×intensity UCB ·
 * Unsparing reject · Smoke-then-score
 */

export * as constants from './constants.js'
export { EDIT_TYPES, INTENSITIES } from './constants.js'
export {
  armId,
  parseArmId,
  allCoupledArms,
  eligibleCoupledArms,
  closedTemplate,
} from './arms.js'
export { classifyFailure, routeFamilies } from './failure.js'
export {
  createUcbState,
  updateUcb,
  meanDelta,
  selectArm,
  activeBans,
} from './ucb.js'
export {
  parentScore,
  normalizeStats,
  selectParent,
  recordOffspring,
} from './parent.js'
export { resolveMetaMode, metaKnobs } from './meta.js'
export { resolvePhase } from './phase.js'
export { smokeTest } from './smoke.js'
export { createArchive, signatureOf, signatureEntropy } from './archive.js'
export { createMemory } from './memory.js'
export { selectParentAndArm, selectPairedArm } from './select.js'
export { survive } from './survive.js'
export { runFocus } from './loop.js'
