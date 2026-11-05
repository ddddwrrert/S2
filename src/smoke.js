/**
 * Tax=0 smoke test before official evaluate.
 * @module s2/smoke
 */

/**
 * Default smoke: payload must exist; optional user checker.
 * @param {object} cand
 * @param {(cand: object) => boolean|Promise<boolean>} [checker]
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function smokeTest(cand, checker) {
  if (!cand || cand.payload == null) {
    return { ok: false, reason: 'missing_payload' }
  }
  if (typeof checker === 'function') {
    try {
      const ok = await checker(cand)
      return ok ? { ok: true } : { ok: false, reason: 'checker_fail' }
    } catch (e) {
      return { ok: false, reason: String(e?.message || e) }
    }
  }
  // Default: only reject hard syntax / empty; crashes still go to official Probe
  // so failure fingerprints can route arms.
  if (typeof cand.payload === 'object' && cand.payload.syntaxError) {
    return { ok: false, reason: 'syntax' }
  }
  return { ok: true }
}
