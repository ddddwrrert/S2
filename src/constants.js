/** @module s2/constants — FOCUS defaults */

export const EDIT_TYPES = Object.freeze([
  'repair',
  'skeleton',
  'neighborhood',
  'speed',
  'depth',
  'inspire',
  'restart',
])

export const INTENSITIES = Object.freeze(['Lite', 'Med', 'Heavy'])

export const BOOTSTRAP_FRACTION = 0.15
export const ENDGAME_FRACTION = 0.15
export const STALL_STREAK = 5
export const P_STICKY_DEFAULT = 0.75
export const P_STICKY_BOOTSTRAP = 1.0
export const P_STICKY_HOLD = 0.9
export const P_STICKY_ACT = 0.5
export const UCB_C = 1.2
export const UCB_C_ACT = 1.9
export const SPEED_BIAS = 0.15
export const ARCHIVE_CAP = 8
export const MEMORY_CAP = 96
export const PARENT_ALPHA = 0.55
export const REJECT_EPS = 1e-6
export const COOLDOWN_STEPS = 3
export const BAN_STEPS = 8
export const HEAVY_FAIL_COOLDOWN = 6
export const META_POSITIVE_STREAK = 3
export const SMOKE_TAX = 0 // smoke never consumes official B
