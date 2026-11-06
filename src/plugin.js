/**
 * Cordis plugin: overlays S2 FOCUS onto host `evolve`.
 * Does not touch sealed evaluate.
 */

import { installS2Providers } from './install.js'

export const name = 's2-focus'
export const inject = ['evolve']

export function apply(ctx) {
  const evolve = ctx.evolve
  if (!evolve) {
    throw new Error('s2-focus plugin requires inject evolve (install beside dsh-evolve-*)')
  }
  const { installed, dispose } = installS2Providers(evolve)
  ctx.effect(() => dispose)
  if (typeof ctx.logger?.info === 'function') {
    ctx.logger.info(`S2 FOCUS mounted: ${installed.join(', ')}`)
  }
}

export default { name, inject, apply }
