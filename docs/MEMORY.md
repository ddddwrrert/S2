# S2 · AHC 搜索策略可落库记忆

**状态：** 已命名落库 · 2026-11-05  
**编号：** **S2**  
**机制：** FOCUS（Failure-routed · Offspring-potential parents · Coupled type×intensity UCB · Unsparing reject · Smoke-then-score）  
**详录：** [`S2_AHC_SEARCH.md`](S2_AHC_SEARCH.md)  
**对照：** 原框架 = 分轮盘赌父代 + 自由 mutate + top-k；A2 = 分优先工程包（可挂载 S2）；S1 = 更简 IUBC。

**总记忆句：** S2=FOCUS；失败路由先于UCB；后代潜力选父；类型×强度双层臂；严格拒收+烟测；stall才成对真探针；同B保密度。

---

## S2M01 · 编号与范围

| | |
|--|--|
| **id** | `s2_scope` |
| **slot** | `select` · `mutate` · `survive` · `loop` |
| **claim** | S2 是内环搜索日程；官方 evaluate 为唯一 Probe；日常 1B，仅 stall 可 2B 成对真探针 |
| **do** | 实现为 select+mutate+严格晋升调度；不改密封 evaluator |
| **guard** | 每步都成对评测；或做成 held-out 外环 |
| **src** | S2 规格 §1·§4 |

## S2M02 · 相对原框架

| | |
|--|--|
| **id** | `s2_vs_baseline` |
| **slot** | `select` · `mutate` · `survive` |
| **claim** | 原框架=轮盘+自由长文+top-k；S2=失败路由+(t,i)UCB+后代潜力父代+严格拒收 |
| **do** | 密度≈原框架；靠命中率与拒无效 diff 打赢，不靠多花 B |
| **guard** | 诊断/烟测占官方 B；无必要 Heavy 空耗 |
| **src** | S2 规格 §2·§8 |

## S2M03 · FOCUS 五件套

| | |
|--|--|
| **id** | `s2_focus` |
| **slot** | `select` · `mutate` · `memory` · `meta` |
| **claim** | Failure-routed · Offspring-potential · Coupled UCB · Unsparing reject · Smoke-then-score |
| **do** | 见详录 §3–§7；相位 Bootstrap→Climb→Break→Endgame；叠 ACT/HOLD/AVOID |
| **guard** | 无失败指纹就全开 inspire；配对变成默认步 |
| **src** | 抖音/B站 HGM·HarnessPro·RRSI·DarwinX·Harness² |

## S2M04 · 成对真探针

| | |
|--|--|
| **id** | `s2_paired_probe` |
| **slot** | `evaluate` · `mutate` |
| **claim** | 成对=同父双候选；真探针=官方分；仅 stall 且剩余 B≥2 |
| **do** | 两臂各 evaluate 一次，只晋升分高者；低分记负例 |
| **guard** | 日常步双评；用模型自评代替官方分 |
| **src** | S2 规格 §4 |

## S2M05 · 验收

| | |
|--|--|
| **id** | `s2_accept` |
| **slot** | `evaluate` · `meta` |
| **claim** | 同题同模同 B：best(S2)>best(原框架)；scored/B≥0.95；前 15%B ≥原框架 95% |
| **do** | 不满足则关配对与 Heavy，退失败路由+sticky+Lite/Med UCB |
| **guard** | 无密度护栏宣称胜利 |
| **src** | S2 规格 §9 |
