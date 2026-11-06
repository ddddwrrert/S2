import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { installS2Providers } from '../src/install.js'

describe('S2 evolve install', () => {
  it('registers loop/select/mutate/survive', () => {
    const stack = { loop: [], select: [], mutate: [], survive: [], evaluate: [] }
    const evolve = {
      register(slot, provider) {
        stack[slot].push(provider)
        return () => {
          stack[slot] = stack[slot].filter(p => p !== provider)
        }
      },
    }
    const { installed, dispose } = installS2Providers(evolve)
    assert.ok(installed.includes('loop=s2-loop'))
    assert.ok(installed.includes('survive=s2-survive'))
    assert.equal(stack.mutate.at(-1).name, 's2-mutate')
    dispose()
    assert.equal(stack.select.length, 0)
  })
})
