/**
 * Synthetic landscape for S2 demos (bugs / timeout / preserveMark).
 */

export function seedState() {
  return {
    x: 0,
    y: 0,
    bugs: 2,
    speed: 1,
    depth: 1,
    preserveMark: true,
    syntaxError: false,
  }
}

export function scoreOf(s) {
  if (!s || s.bugs > 0 || s.syntaxError) return 0
  const dist = Math.hypot(s.x - 5, s.y - 3)
  const quality = Math.max(0, 20 - dist) * s.speed * Math.sqrt(s.depth)
  return Number(quality.toFixed(4))
}

/**
 * @param {object} parentPayload
 * @param {string} coupledArm  e.g. neighborhood:Lite
 * @param {() => number} rng
 */
export function mutateState(parentPayload, coupledArm, rng = Math.random) {
  const [type, intensity = 'Med'] = String(coupledArm).split(':')
  const scale = intensity === 'Lite' ? 0.5 : intensity === 'Heavy' ? 1.6 : 1
  const s = { ...parentPayload, preserveMark: true }
  const jitter = () => (rng() - 0.5) * 0.35 * scale

  switch (type) {
    case 'repair':
      s.bugs = 0
      break
    case 'skeleton':
      if (s.bugs === 0) {
        s.x += 0.4 * scale + jitter()
        s.y += 0.25 * scale + jitter()
      }
      break
    case 'neighborhood':
      s.x += 0.7 * scale + jitter()
      s.y += 0.45 * scale + jitter()
      break
    case 'speed':
      s.speed = Math.min(3, s.speed + 0.2 * scale)
      break
    case 'depth':
      s.depth = Math.min(4, s.depth + 0.3 * scale)
      break
    case 'inspire':
      s.x = (s.x + 5) / 2 + jitter()
      s.y = (s.y + 3) / 2 + jitter()
      break
    case 'restart':
      return {
        x: rng() * 2,
        y: rng() * 2,
        bugs: 0,
        speed: 1,
        depth: 1,
        preserveMark: true,
        syntaxError: false,
      }
    default:
      break
  }
  // rare Heavy preserve violation (should be rejected)
  if (intensity === 'Heavy' && rng() < 0.05) {
    s.preserveMark = false
  }
  return s
}

export function evalWithMeta(cand) {
  const score = scoreOf(cand.payload)
  const meta = {}
  if (cand.payload?.bugs > 0) meta.crash = true
  return { score, meta }
}
