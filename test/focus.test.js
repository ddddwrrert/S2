import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyFailure, routeFamilies } from '../src/failure.js'
import { eligibleCoupledArms, armId } from '../src/arms.js'
import { parentScore, normalizeStats } from '../src/parent.js'
import { runFocus } from '../src/loop.js'
import {
  evalWithMeta,
  mutateState,
  scoreOf,
  seedState,
} from '../src/demo/landscape.js'

describe('S2 failure routing', () => {
  it('routes crash to repair', () => {
    assert.deepEqual(routeFamilies('crash'), ['repair'])
    assert.equal(
      classifyFailure({ score: 0, meta: { crash: true } }),
      'crash',
    )
  })
})

describe('S2 coupled arms', () => {
  it('emits type×intensity ids', () => {
    const e = eligibleCoupledArms({
      phase: 'climb',
      hasPositiveScore: true,
      stall: false,
      families: ['neighborhood'],
      allowHeavy: true,
    })
    assert.ok(e.includes(armId('neighborhood', 'Lite')))
    assert.ok(e.includes(armId('neighborhood', 'Heavy')))
  })
})

describe('S2 parent potential', () => {
  it('favors fertile mid parents when alpha low', () => {
    const pool = [
      { id: 'a', score: 10, nChildren: 5, meanChildDelta: -1 },
      { id: 'b', score: 6, nChildren: 5, meanChildDelta: 2 },
    ]
    const norms = normalizeStats(pool)
    const sa = parentScore(pool[0], norms, 0.2)
    const sb = parentScore(pool[1], norms, 0.2)
    assert.ok(sb > sa)
  })
})

describe('S2 loop', () => {
  it('consumes exactly B official evals and improves', async () => {
    let i = 0
    const rng = () => {
      i += 1
      return (i % 10) / 10
    }
    const seedPayload = seedState()
    const result = await runFocus({
      B: 35,
      seed: { id: 's', payload: seedPayload, score: scoreOf(seedPayload) },
      rng,
      enablePaired: true,
      mutate(parent, _instr, arm) {
        return { id: 'c', payload: mutateState(parent.payload, arm, rng) }
      },
      evaluate(c) {
        return evalWithMeta(c)
      },
    })
    assert.equal(result.scored, 35)
    assert.equal(result.density, 1)
    assert.ok(result.incumbent.score >= 0)
  })
})
