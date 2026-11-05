/**
 * Failure fingerprints → forced arm families (before UCB).
 * @module s2/failure
 */

/**
 * @typedef {'crash'|'zero'|'plateau'|'timeout'|'collapse'|'ok'} Fingerprint
 */

/**
 * Extract fingerprint from evaluator side-channel (tax=0).
 * Prefer explicit `meta.fingerprint`; else infer from score / flags.
 * @param {object} args
 * @param {number} args.score
 * @param {object} [args.meta]
 * @param {number} [args.prevBest]
 * @param {number} [args.stall]
 * @param {number} [args.signatureEntropy]
 * @returns {Fingerprint}
 */
export function classifyFailure({
  score,
  meta = {},
  prevBest = 0,
  stall = 0,
  signatureEntropy = 1,
}) {
  if (meta.fingerprint) return meta.fingerprint
  if (meta.crash || meta.illegal) return 'crash'
  if (meta.timeout) return 'timeout'
  if (signatureEntropy < 0.25) return 'collapse'
  if (score <= 0) return 'zero'
  if (stall >= 3 && score <= prevBest + 1e-9) return 'plateau'
  return 'ok'
}

/**
 * Arm families allowed under a fingerprint.
 * @param {Fingerprint} fp
 * @returns {string[]|null} null = no force (all phase-eligible)
 */
export function routeFamilies(fp) {
  switch (fp) {
    case 'crash':
      return ['repair']
    case 'zero':
      return ['skeleton']
    case 'timeout':
      return ['speed']
    case 'plateau':
      return ['neighborhood', 'depth']
    case 'collapse':
      return ['inspire', 'restart']
    default:
      return null
  }
}
