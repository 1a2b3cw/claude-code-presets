# N8 Cutover Report — Governance Layer Decision

> 状态：reference（切换决策已完成；N8 因 feedback 闭环缺口重开）
> 决策：OD-N8-005，Owner 选择 A
> 产品形态：MY2 保留项目治理层；通用执行层优先复用成熟生态。

> 2026-07-12 复盘更正：本报告足以证明治理层切换决策，但不足以证明 `generate -> review -> validate -> activate -> feedback` 全生命周期已闭合。当前唯一 P0 剩余项为 N8.1.5；当前模块状态以 `roadmap.md` 为准。

## 完成项

| 阶段 | 结果 | 关键证据 |
|---|---|---|
| N8.1 Project Preset Lifecycle | in progress | generate/review/validate/activate 已完成；feedback 受控更新待 N8.1.5 验证 |
| N8.2 Owner Decision Gate | completed | confirmed Brief 才可 preflight/transition；模块/类型不匹配被拦截 |
| N8.3 Real Project Dogfood | completed with limitation | PetCare/ai-kefu/sub-manager 的 D21-D23 证据与四项指标 |
| N8.4 Ecosystem Boundary | completed | Superpowers 对照、复用/保留/不做边界、编号对账 |
| N8.5 Cutover | completed | OD-N8-005、活跃 feature 选择、legacy reference 分类、全量验证 |

## 最终产品边界

- MY2 保留：项目事实和 project-preset 生命周期、Owner Decision、产品/架构/roadmap/task 的追溯、change impact、operations evidence、只读状态投影。
- MY2 不再扩建：通用 TDD、调试、review、worktree、子代理/agent swarm 和通用执行框架。
- Superpowers 是可复用的成熟执行层参考，未被安装、复制或 vendoring；MIT 许可仅作为未来按需改写的准入条件，不构成自动采用。

## 切换结果

- 多 feature package 同属一个 roadmap module 时，`status`、delivery 与 change 分析优先选择真正有活跃任务的 package，不再按目录第一个误选旧包。
- 该行为有 smoke 回归：一个已完成 package 排在目录前，仍会选择名称靠后的 `in_progress` package。
- 根 `spec.md` 已标为 `reference`；其余 legacy/reference artifact 的生命周期在 cleanup report 中集中记录。没有删除、移动或隐匿历史证据。
- PetCare Hub 已完成真实 project-preset 生成与激活验证（D24）；validator/context 返回 pass 和实际加载文件列表。

## 已接受风险

| 风险 | 状态 | Owner 处理 |
|---|---|---|
| Claude Code A1-A4 实机验证 | 未通过也未失败；环境阻塞 | 已接受。CLI 已认证，但本地 gateway `localhost:20128` 返回 API 502，不能由 Codex 结果替代。恢复后应补跑。 |
| D21 是既有 PRD 回放 | 有限证据 | 已接受。D24 补充了真实 preset 激活；未来仍应补一次无上下文实时探索。 |

## 验收证据

- `npm run gate`：pass，723 smoke tests、配置校验与 pack dry-run 通过。
- `npm run test:tarball`：pass，安装包可执行 help/base init/validate/project-preset fallback。
- `planning validate`、`events validate`、OD-N8-005 `decision validate`：pass。
- PetCare D24：`project-preset validate` 与 `context --json`：pass。

## 后续维护

- Claude gateway 恢复后，补跑 N1 A1-A4；若与 Codex 有行为差异，创建新 feature 修正入口契约，不回写 N8 已接受事实。
- 从 PetCare 等至少三个已激活 project-preset 中收集稳定共性，再决定是否孵化公共 preset；在此之前不扩张 preset 目录。
