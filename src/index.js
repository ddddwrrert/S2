/**
 * S2 — FOCUS
 *
 * 1) Pure: `runFocus({ B, seed, mutate, evaluate })`
 * 2) Evolve mount: `installS2Providers(evolve)` / Cordis plugin `s2-focus`
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

export { installS2Providers } from './install.js'
export { default as s2Select } from './providers/s2-select.js'
export { default as s2Mutate } from './providers/s2-mutate.js'
export { default as s2Loop } from './providers/s2-loop.js'
export { default as s2Survive } from './providers/s2-survive.js'

export { name, inject, apply } from './plugin.js'
