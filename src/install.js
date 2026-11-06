import s2Loop from './providers/s2-loop.js'
import s2Mutate from './providers/s2-mutate.js'
import s2Select from './providers/s2-select.js'
import s2Survive from './providers/s2-survive.js'

/**
 * @param {object} evolve
 * @returns {{ installed: string[], dispose: () => void }}
 */
export function installS2Providers(evolve) {
  if (!evolve || typeof evolve.register !== 'function') {
    throw new Error('installS2Providers needs evolve.register')
  }
  const providers = {
    loop: s2Loop,
    select: s2Select,
    mutate: s2Mutate,
    survive: s2Survive,
  }
  const disposers = []
  const installed = []
  for (const [slot, provider] of Object.entries(providers)) {
    disposers.push(evolve.register(slot, provider))
    installed.push(`${slot}=${provider.name}`)
  }
  return {
    installed,
    dispose: () => {
      for (const d of disposers.reverse()) d()
    },
  }
}

export default installS2Providers
