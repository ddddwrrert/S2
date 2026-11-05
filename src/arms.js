/**
 * Coupled arms: (edit_type × intensity).
 * @module s2/arms
 */

import { EDIT_TYPES, INTENSITIES } from './constants.js'

/**
 * @param {string} type
 * @param {string} intensity
 * @returns {string} arm id
 */
export function armId(type, intensity) {
  return `${type}:${intensity}`
}

export function parseArmId(id) {
  const [type, intensity] = String(id).split(':')
  return { type, intensity: intensity || 'Med' }
}

export function allCoupledArms() {
  const out = []
  for (const t of EDIT_TYPES) {
    for (const i of INTENSITIES) out.push(armId(t, i))
  }
  return out
}

/**
 * @param {{ phase: string, hasPositiveScore: boolean, stall: boolean, families?: string[]|null, ban?: Set<string>, allowHeavy?: boolean }} ctx
 * @returns {string[]}
 */
export function eligibleCoupledArms(ctx) {
  const {
    phase,
    hasPositiveScore,
    stall,
    families = null,
    ban = new Set(),
    allowHeavy = true,
  } = ctx

  let types
  if (phase === 'bootstrap' || !hasPositiveScore) {
    types = ['repair', 'skeleton']
  } else if (phase === 'endgame') {
    types = ['neighborhood', 'speed']
  } else if (stall || phase === 'break') {
    types = ['neighborhood', 'speed', 'depth', 'inspire', 'restart']
  } else {
    types = ['neighborhood', 'speed', 'depth']
  }

  if (families && families.length) {
    types = types.filter(t => families.includes(t))
    if (!types.length) types = [...families]
  }

  const intensities =
    phase === 'bootstrap'
      ? ['Lite', 'Med']
      : allowHeavy
        ? [...INTENSITIES]
        : ['Lite', 'Med']

  const out = []
  for (const t of types) {
    for (const i of intensities) {
      const id = armId(t, i)
      if (!ban.has(id) && !ban.has(t)) out.push(id)
    }
  }
  return out.length ? out : [armId('repair', 'Lite')]
}

/**
 * @param {string} coupledId
 * @param {string[]} [hints]
 * @returns {string}
 */
export function closedTemplate(coupledId, hints = []) {
  const { type, intensity } = parseArmId(coupledId)
  const intensityRule = {
    Lite: 'Minimal diff only (few parameters or one operator).',
    Med: 'Rewrite a single mechanism; keep the verified main loop.',
    Heavy:
      'Larger patch allowed, but MUST preserve the verified main-loop markers. No positive Δ → this Heavy arm cools down.',
  }[intensity]

  const typeRule = {
    repair: 'Fix crash / illegal only.',
    skeleton: 'Build minimal local-search skeleton.',
    neighborhood: 'Change exactly one neighborhood operator.',
    speed: 'Cache / incremental score / prune for more iterations.',
    depth: 'Increase depth at one call site.',
    inspire: 'Graft one archive mechanism onto incumbent.',
    restart: 'Fresh skeleton branch; do not erase incumbent.',
  }[type]

  const hintBlock =
    hints.length > 0
      ? `\nUtility-ranked hints:\n- ${hints.slice(0, 3).join('\n- ')}`
      : ''

  return `[S2/${coupledId}] ${typeRule} ${intensityRule} Preserve-and-extend: never delete verified main loop.${hintBlock}`
}
