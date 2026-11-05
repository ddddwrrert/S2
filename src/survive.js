/**
 * Unsparing reject + preserve-and-extend promotion.
 * @module s2/survive
 */

import { REJECT_EPS } from './constants.js'
import { signatureOf } from './archive.js'

/**
 * @param {object} args
 * @param {object|null} args.incumbent
 * @param {{ upsert: Function, items: object[] }} args.archive
 * @param {object} args.child
 * @param {boolean} [args.smokeOk]
 * @param {number} [args.eps]
 * @returns {{ incumbent: object, promoted: boolean, archived: boolean, rejected: boolean, reason?: string }}
 */
export function survive({
  incumbent,
  archive,
  child,
  smokeOk = true,
  eps = REJECT_EPS,
}) {
  const sig = child.signature || signatureOf(child.payload)
  const row = { ...child, signature: sig }

  if (!smokeOk) {
    return {
      incumbent,
      promoted: false,
      archived: false,
      rejected: true,
      reason: 'smoke',
    }
  }

  // preserve-and-extend: reject if parent had preserveMark and child cleared it
  if (
    child.parentPreserveMark &&
    child.payload &&
    child.payload.preserveMark === false
  ) {
    return {
      incumbent,
      promoted: false,
      archived: false,
      rejected: true,
      reason: 'preserve_violated',
    }
  }

  const beats =
    !incumbent || row.score > (incumbent.score ?? -Infinity) + eps
  const novel =
    archive.items.length < archive.cap &&
    !archive.items.some(x => x.signature === sig)

  if (beats) {
    return {
      incumbent: { ...row, preserveMark: true },
      promoted: true,
      archived: false,
      rejected: false,
    }
  }

  if (novel && row.score > 0) {
    const archived = archive.upsert(row)
    return {
      incumbent,
      promoted: false,
      archived,
      rejected: !archived,
      reason: archived ? undefined : 'archive_dup',
    }
  }

  // AIDE²-style: no Δ and no novelty → discard
  return {
    incumbent,
    promoted: false,
    archived: false,
    rejected: true,
    reason: 'no_gain',
  }
}
