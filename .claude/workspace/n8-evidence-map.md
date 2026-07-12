# N8 编号与证据映射

> 状态：active
> 更新于：2026-07-12
> Owner：A4 Planning Context

## 为什么需要这份映射

最初的 Project Preset Lifecycle 包曾将自身四个内部任务写为 `N8.1` 至 `N8.4`。后来 roadmap 又把 N8 的验证阶段写为 `N8.1` 至 `N8.5`，导致同一个 ID 同时指向不同工作。这份文件只解释编号和证据路径；模块状态仍只由 `roadmap.md` 拥有。

## 唯一编号

| roadmap 阶段 | 执行包 | 内部任务 | 当前证据 | 状态 |
|---|---|---|---|---|
| N8.1 Project Preset Lifecycle | `n8-project-preset-lifecycle` | N8.1.1 Contract；N8.1.2 validator/context；N8.1.3 入口同步；N8.1.4 系统验证；N8.1.5 feedback 受控更新 | 前四项由 `2026-07-12-n8-project-preset-lifecycle.md`、gate/tarball 事件证明；N8.1.5 待生成真实项目更新证据 | in_progress |
| N8.2 Owner Decision Gate | `n8-owner-decision-gate` | N8.2.1-N8.2.4 | `2026-07-12-n8-owner-decision-gate.md`、ODC/CLI 测试 | completed |
| N8.3 Real Project Dogfood | `n8-real-project-dogfood` | N8.3.1-N8.3.5 | Ledger、D21/D22/D23、`2026-07-12-n8-real-project-dogfood.md`；N8.5 的 D24 激活补测 | completed with accepted limitation |
| N8.4 Ecosystem Boundary | `n8-ecosystem-boundary` | N8.4.1-N8.4.3 | 本文件、生态边界报告、N8.5 Brief | completed |
| N8.5 Cutover Or Converge | `n8-cutover-or-converge` | N8.5.1-N8.5.3 | OD-N8-005、状态读取测试、cleanup/review/final report | completed with accepted risk |

## 已验证与未验证

- 已验证：project-preset 的结构、只读 validator/context、Owner Decision 的确定性拦截、三个 Owner 指定项目的只读行为证据、PetCare 的真实 preset 激活以及治理层切换。
- 未验证：project-preset 从真实 feedback 到受控更新的行为闭环（N8.1.5）；Claude Code 的 N1 A1-A4 实机行为仍因推理 gateway `localhost:20128` 返回 502 而未验证。
- 影响：N8.1.5 是 N8 关单前的 P0 功能缺口；Claude runtime 与 Dogfood 样本局限是 OD-N8-005 已接受的可信度风险，不应冒充已通过证据。
