# S2 · 比 S1 更胜一筹的 AHC 搜索策略

**相对 S1：** S1=IUBC（钉 incumbent + UCB 改法臂 + 闭集 + 轻记忆）。  
**S2 多出来的胜率**不来自进化集/验证集，而来自平台记忆里 S1 **还没吃透**的几块：失败可观测先行、后代潜力选父、双层臂（类型×强度）、提议稀疏正则、配对对照、ACT/HOLD/AVOID 相位元策略、preserve-and-extend。

**记忆句：** 先看见失败模式再选臂；父代看「会不会生分」不看「自己多高分」；多数提案默认拒；强度分档进 UCB；对照配对不占额外叙事税。

---

## 1. 三平台还学到了什么（S1 未充分用）

| 记忆 | 含义 | S1 缺口 | S2 吃法 |
|------|------|---------|---------|
| AHE / B09 可观测三支柱 | 看不见失败模式就盲搜 | UCB 只看 Δ，不看「为什么挂」 | **失败指纹 → 路由臂族** 再 UCB |
| Harness² 行为对比 | 同任务两次跑才能提炼该改啥 | 对照只写课后笔记 | **配对 Probe**：同父两条候选，只 compose 赢家 |
| HGM 后代潜力 | 高分个体未必能生出更好后代 | sticky 偏 incumbent 分 | 父代分 = **子代平均 Δ**（谱系潜力） |
| RRSI / B11 | 提议要稀疏；选择要滤噪声复杂度 | 不限制改动幅度 | **编辑预算 L0** + 无 Δ 的复杂 diff 拒收 |
| AIDE² 多数拒绝 | 默认拒绝提案 | 几乎 evaluate 了就进种群叙事 | **Δ≤ε 且无 novelty → 丢弃不进 Archive** |
| HarnessPro Lite/Med/Heavy | 强度分档控成本 | 臂只有改法类型 | 臂 = **(edit_type × intensity)** |
| Meta² ACT/HOLD/AVOID | 教「何时改策略」 | 相位写死在进度百分比 | **事件驱动**：stall/崩谱系才 ACT |
| DarwinX preserve-extend | 保核扩展 | 闭集未强制保可运行核 | 模板硬约束：**不得删掉已验证主循环** |
| Meta-Harness 原始轨迹 | 摘要掉点 | hint 过短 | repair 时允许读 **父代运行日志指针**（非整摘要） |
| SoL-Pi / B05 | 同预算多试；先砍浪费 | 无「廉价预检」 | allocate 前 **tax=0 语法/可运行烟测**；挂则换臂不扣 B |
| MemRL / ACE | 效用≠相似度；δ 补丁 | retrieve 偏 type | 记忆条带 **utility**，按历史贡献重排 |
| 冷却单槽 M03 | 改完要冷却 | 臂可每步乱跳 | 正 Δ 后对该臂 **cooldown k 步**（防痴迷换招） |
| 多样性崩塌 D20 | 越转越像自己 | Archive 弱 | 签名熵过低 → 强制 `inspire/restart` |
| 田渊栋 B13 | 动作要有可辨差异 | 臂偏工程标签 | 每臂必须对应 **可观测行为差**（如邻域半径、温度） |

---

## 2. S2 策略名：**FOCUS**

**F**ailure-routed · **O**ffspring-potential parents · **C**oupled (type×intensity) UCB · **U**nsparing reject · **S**moke-then-score  

在 S1 骨架上加五层，每步仍 **≤1 次官方 evaluate**（烟测不占 B）。

---

## 3. S2 相对 S1 的具体一步

### 3.1 失败路由（先于 UCB）

维护失败指纹（tax=0，从 evaluator 退出码/日志规则抽）：

| 指纹 | 强制臂族 |
|------|----------|
| crash / illegal | `{repair}` |
| runnable · score≈0 | `{skeleton}` |
| 正分但平台期 | `{neighborhood, depth}` |
| 分还行但超时切分 | `{speed}` 优先 |
| 谱系签名坍缩 | `{inspire, restart}` |

族内再用 UCB；族外臂本步权重×0。→ AHE「先看见再进化」。

### 3.2 父代：后代潜力（轻 HGM）

对每个候选记 `n_children`、`mean_child_Δ`。

\[
\mathrm{parent\_score}(x)=
\alpha\cdot \mathrm{norm}(\mathrm{fitness}(x))
+(1-\alpha)\cdot \mathrm{norm}(\mathrm{mean\_child\_\Delta}(x))
\]

- Incumbent 仍 sticky，但 **非 sticky 抽父时按 parent_score**，不是纯 fitness 轮盘。  
- 无子代者用先验（fitness 作代理）。→ 避免「高原分不育」锁死。

### 3.3 双层臂：类型 × 强度

\[
a = (t, i),\quad t\in T,\ i\in\{\mathrm{Lite},\mathrm{Med},\mathrm{Heavy}\}
\]

- Lite：最小 diff（几处参数/一处算子）  
- Med：单机制重写  
- Heavy：允许更大补丁，但 **RRSI**：无正 Δ 则该 (t,Heavy) 冷却并降权  

UCB 开在 \((t,i)\) 上。→ HarnessPro 帕累托思想内化成「强度税」。

### 3.4 配对 Compose（可选，仍 2B 要算清楚）

当且仅当 **stall 且剩余 B≥2**：

1. 同父、同指纹路由下抽 **两个不同臂**（或同臂 Lite/Med）  
2. 各 evaluate 一次（花 2B）  
3. 只保留更高分者；另一条只记负例指纹  

→ Harness² Propose–Probe–Compose；**禁止**无配对的「只写反思」。  
日常步仍 1B，避免密度崩盘（B05）。

### 3.5 默认拒绝 + preserve-and-extend

晋升条件（同时）：

1. `score > score(I) + ε` **或**（Archive 空位且签名新颖）  
2. diff 未删除「已验证主循环」标记区（preserve）  
3. 烟测通过（语法/可运行）  

否则：**丢弃**，不进 top-k 式养老。→ AIDE² 多数拒绝 + DarwinX。

### 3.6 ACT / HOLD / AVOID（事件元策略）

| 信号 | 动作 |
|------|------|
| 连续正 Δ | **HOLD**：提高 sticky，降探索 c |
| stall M 步 | **ACT**：开配对或 inspire；短暂提高 c |
| 某臂连续空耗 | **AVOID**：臂冻结 \(n_{\mathrm{ban}}\) 步 |
| 签名熵低 | **ACT**：强制异质父代 |

→ Meta²，但只调搜索超参，不改 evaluate。

### 3.7 记忆：utility 重排

条目：`arm | Δ | when | utility`  
`utility ← utility + η(Δ - utility)`（MemRL 非参数）。  
retrieve = 相似 when 召回后 **按 utility 重排**，不是纯语义相似。

---

## 4. 为何可能比 S1 / 原框架更胜

| | 原框架 | S1 | **S2** |
|--|--------|-----|--------|
| 密度 | 高 | ≈高 | ≈高（烟测不占 B；配对仅 stall） |
| 选改法 | 无 | UCB 类型 | **失败路由 + 类型×强度 UCB** |
| 选父代 | 分轮盘 | sticky+弱 archive | **sticky + 后代潜力** |
| 晋升 | 进种群再 top-k | 更新 I/Archive | **严格拒收 + 保核** |
| 卡住时 | 继续轮盘 | 加探索 | **配对 Compose / ACT** |
| 记忆 | 几乎无 | Δ×臂 | **+utility + 失败指纹** |

多出来的分：更少「改错层」、更少「养不育高原分父母」、更少「大 diff 零收益」、卡住时用 **成对真 Probe** 而不是空想。

---

## 5. 仍不做

- 进化集 / held-out 外环（用户约束）  
- 改官方 evaluator  
- 默认多 worker 抢 B（仅配对这一种受控 2B）  
- 只喂 LLM 摘要当唯一反馈  

---

## 6. 落地优先级（若从 S1 升级）

1. 失败指纹路由 + 烟测（最大 roofline，实现轻）  
2. 臂改为 (type×intensity) + 编辑稀疏  
3. 父代后代潜力  
4. stall 配对 Compose  
5. utility 记忆 + ACT/HOLD/AVOID  

验收仍用 S1 同套：同 B、best 分、密度护栏、早期不塌。
