# S2 — FOCUS

**S2** is a standalone AHC inner-loop search strategy (independent of S1).

**FOCUS** = **F**ailure-routed · **O**ffspring-potential parents · **C**oupled (type×intensity) UCB · **U**nsparing reject · **S**moke-then-score

Same official `evaluate` budget **B** as a bare baseline. Smoke tests do **not** consume B. Paired real probes spend **2B** only on stall.

## Install

```bash
npm install
npm test
npm run demo
```

## Use

```js
import { runFocus } from 's2-focus'

const result = await runFocus({
  B: 100,
  seed: { id: 'seed', payload: codeOrState, score: 0 },
  async mutate(parent, instr, arm) {
    // arm like "neighborhood:Lite"
    return { id: 'child', payload: await llmEdit(parent.payload, instr) }
  },
  async evaluate(cand) {
    // number or { score, meta: { crash, timeout, ... } }
    return officialJudge(cand.payload)
  },
  // optional tax=0 smoke; return false to skip official eval (no B burn)
  async smoke(cand) {
    return syntaxOk(cand.payload)
  },
})
```

## vs S1

| | S1 (IUBC) | **S2 (FOCUS)** |
|--|-----------|----------------|
| Arms | edit type | **type × intensity** |
| Parent | sticky + archive | sticky + **offspring potential** |
| Routing | phase gates | **failure fingerprint → family** then UCB |
| Promote | beat I / archive | **strict reject + preserve** |
| Stall | raise exploration | **paired real probe** (2B) |
| Pre-check | none | **smoke (0B)** |

## Docs

- [`docs/SPEC.md`](docs/SPEC.md)
- [`docs/MEMORY.md`](docs/MEMORY.md)

## Not in scope

- Evolution / held-out outer loops
- Changing the sealed evaluator
- Default every-step paired evals
