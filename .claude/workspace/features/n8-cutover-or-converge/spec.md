# N8.5 Cutover Or Converge Spec

> 状态：completed
> Spec ID：N8-SPEC-005
> Roadmap Module：N8
> Product Brief：product-brief.md
> Product Model：product-model.md
> Capability ID：C8
> Journey ID：J1,J2
> Architecture：architecture.md
> Architecture Component ID：A2,A4,A5,A7
> Affected Components：A1,A2,A4,A5,A6,A7
> Dependency Direction：A1 -> A2/A3 -> A4 -> A5 -> A6 -> A7(read-only)
> Security Impact：切换会改变当前事实读取与 legacy artifact 生命周期；不得删除决策证据、秘密或用户数据。任何归档只能是可逆、可追溯的状态变更。
> Security Risk Level：high
> Threat Model：风险是将有限 Dogfood 误当成普遍可靠，或在没有 Owner 选择时归档仍在使用的主线。缓解为明确 Owner Decision、先修复状态选择歧义、仅可逆归档、全量 planning/events/gate 验证。
> Operational Impact：若 Owner 选择切换，status/Workbench 读取将选择当前活跃 feature，legacy 只作为 reference；不发布、不删除历史 artifact。
> Owner Decision Required：yes
> Owner Decision Types：architecture,irreversible_operation,product_scope
> 执行包：.claude/workspace/features/n8-cutover-or-converge/
> 更新于：2026-07-12

## 开工说明

N8.1-N8.4 的证据会决定 MY2 是保留“项目治理层 + 成熟执行层复用”的产品形态，还是收敛成轻量模板。该选择会改变长期架构、状态读取和 legacy artifact 生命周期，不能由工具权限或 AI 推荐自动确认。

## 本次包含

- 根据已确认路线实现当前活跃 feature 的确定性选择，消除同一 roadmap module 多个 feature package 时“按目录第一个”读取的歧义。
- 将 legacy 产物标为 `reference` 或 `archived`，保留原始路径与决策证据，不硬删除。
- 输出 N8 完成/收敛报告，并在确认的范围内更新 roadmap 的 N8 状态。

## 本次不包含

- 删除历史 artifact、重写 N1-N7、发布 npm 包、安装或 vendoring Superpowers。
- 用 Codex 证据替代 Claude 实机验证；若 Owner 接受有限证据，必须明确记录为风险接受。

## 验收场景

### C1：Owner 能看懂并确认最终形态

目标用户：项目 Owner。入口：OD-N8-005。主流程：阅读治理层切换、延后切换与轻量收敛的取舍，明确选择 A；成功结果：只在确认后放行 N8.5，确认范围和已接受风险可定位。

### C2：状态投影选择真正活跃的 feature

目标用户：使用 `/standup` 或 `status` 的 Owner。入口：同一 roadmap module 下存在多个 feature package。主流程：一个 feature 的任务为 `in_progress`，其他 package 已完成；成功结果：`status --json` 返回活跃 package 和任务，而非目录排序第一个 package。

### C3：旧证据不再压过主线但仍可追溯

目标用户：后续维护者。入口：N8 完成后的 planning/status/readme。主流程：读取 current roadmap 与 N8 final report；成功结果：vNext roadmap 是唯一主线，legacy 仅标 `reference`，没有删除历史证据。

## 验收标准

- Owner 明确选择产品形态和可接受的验证边界；未确认时 delivery gate 必须 blocked。
- `status` 不再错误选择同模块的第一个 feature package；测试覆盖多 package 情形。
- planning/events/gate/tarball smoke 通过；N8 结论可追溯且 legacy artifact 未被静默删除。

## Spec/Task Quality Gate

- Product Lead：pass。Owner 已于 2026-07-12 选择 A，并明确接受有限验证风险与可逆切换边界。
- Architect-Planner：pass。状态选择、可逆归档和验证路径可实现。
- Delivery Steward：pass。历史证据保留且 lifecycle 状态可追溯。
- Builder readiness：pass。
