#!/usr/bin/env node
import { runFocus } from '../loop.js'
import { evalWithMeta, mutateState, scoreOf, seedState } from './landscape.js'

function mulberry32(a) {
  return function rng() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const B = Number(process.argv[2] || 40)
const rng = mulberry32(7)
const seedPayload = seedState()
const seed = {
  id: 'seed',
  payload: seedPayload,
  score: scoreOf(seedPayload),
}

const result = await runFocus({
  B,
  seed,
  rng,
  enablePaired: true,
  mutate(parent, _instr, arm) {
    return { id: `m-${arm}`, payload: mutateState(parent.payload, arm, rng) }
  },
  evaluate(cand) {
    return evalWithMeta(cand)
  },
  onStep(ev) {
    if (ev.smokeFail) return
    if (ev.t % 5 === 0 || ev.promoted || ev.paired) {
      console.log(
        `#${ev.t} ${ev.phase}/${ev.meta} arm=${ev.arm} paired=${!!ev.paired} Δ=${(ev.delta ?? 0).toFixed(3)} best=${ev.best.toFixed(3)} fp=${ev.fingerprint}`,
      )
    }
  },
})

console.log(
  JSON.stringify(
    {
      strategy: 'S2-FOCUS',
      B,
      best: result.incumbent.score,
      density: result.density,
      promotions: result.history.filter(h => h.promoted).length,
      pairedSteps: result.history.filter(h => h.paired).length,
      rejects: result.history.filter(h => h.rejected).length,
      payload: result.incumbent.payload,
    },
    null,
    2,
  ),
)
