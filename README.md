# S2 — FOCUS（可挂 evolve）

**FOCUS** = Failure-routed · Offspring-potential · Coupled type×intensity UCB · Unsparing reject · Smoke-then-score

v2：**纯策略库** + **嵌进宿主 evolve 五槽**（不改密封 evaluate）。

## 挂到 evolve

宿主需已提供 `evolve`（`dsh-evolve-a2` / `dsh-evolve-loop`）。

```js
import { installS2Providers } from 's2-focus'

const { installed, dispose } = installS2Providers(evolve)
// loop=s2-loop · select=s2-select · mutate=s2-mutate · survive=s2-survive
```

或装 DSH bundle（`cordis.patch.yml` → 插件 `s2-focus`）。

`evolve_run` 路径：

`s2-select`（后代潜力）→ `s2-mutate`（失败路由 + type×intensity UCB）→ **官方 evaluate** → 严格晋升 / stall 时成对真探针（2B）→ `s2-survive`

## 纯策略库

```js
import { runFocus } from 's2-focus'
await runFocus({ B: 100, seed, mutate, evaluate })
```

```bash
npm test
npm run demo
```

## 槽位

| Slot | Provider | 行为 |
|------|----------|------|
| select | `s2-select` | sticky + offspring-potential |
| mutate | `s2-mutate` | 失败指纹路由 + `(t,i)` UCB |
| loop | `s2-loop` | 日常 1B；stall 配对 2B；拒无效 |
| survive | `s2-survive` | 偏正分 top-k |
| evaluate | （宿主） | **不碰** |

## Docs

- [`docs/SPEC.md`](docs/SPEC.md)
- [`docs/MEMORY.md`](docs/MEMORY.md)
