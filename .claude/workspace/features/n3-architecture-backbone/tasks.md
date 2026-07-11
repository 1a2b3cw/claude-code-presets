# N3 架构主干 Tasks

> 状态：in_progress
> Task Set：N3-TASKS-001
> Spec：`spec.md`
> Roadmap Module：N3
> 执行包：`.claude/workspace/features/n3-architecture-backbone/`
> 更新于：2026-07-11

## Spec/Task Quality Gate

- 当前结果：pass
- 本轮范围：架构模型、ADR、角色/命令读取、静态测试、Codex dogfood 与系统审查。
- 不做：artifact 自动校验、运行保障实现、Workbench 改造、具体技术栈选型。
- Builder 状态：可以按 N3.1 开工。

### N3.1 建立架构模型与 ADR

- **任务 ID**：N3.1
- **状态**：in_progress
- **描述**：建立 A1-A7 架构、接口、数据流、依赖、安全边界、迁移规则和 ADR。
- **验收标准**：Owner 能定位每类事实和视图的归属；架构不复制产品范围或任务状态。
- **验收命令**：`rg -n "Architecture Component ID|安全边界|迁移与兼容" architecture.md`、`git diff --check`
- **阻塞原因**：无
- **Gate 结果**：local pending / review pending / release not_required
- **产物**：`architecture.md`、`.claude/workspace/decisions/2026-07-11-vnext-architecture.md`
- **最近更新**：2026-07-11

### N3.2 连接 roadmap 与架构引用

- **任务 ID**：N3.2
- **状态**：planned
- **描述**：为 roadmap 模块增加 Architecture Component ID 映射，保持 Capability ID 与模块状态职责不混淆。
- **验收标准**：每个 N1-N8 模块都能定位产品能力与架构组件，且架构文件不维护模块状态。
- **验收命令**：`rg -n "Architecture Component ID" roadmap.md`、`git diff --check`
- **阻塞原因**：无
- **Gate 结果**：local pending / review pending / release not_required
- **产物**：`roadmap.md`、`product-model.md`
- **最近更新**：2026-07-11

### N3.3 注入架构读取与回归测试

- **任务 ID**：N3.3
- **状态**：planned
- **描述**：让 L/XL `/dev`、Architect-Planner、Delivery Steward 和 system review 在架构存在时检查 Component ID、依赖方向、安全和兼容边界，并固化 Claude/Codex 契约测试。
- **验收标准**：入口不会在缺少或违反架构边界时闷头开工；生成两端保持一致。
- **验收命令**：`npm run validate`、`npm test`、`node create-claude-team/cli.js update`
- **阻塞原因**：无
- **Gate 结果**：local pending / review pending / release not_required
- **产物**：`.claude/commands/dev.md`、`.claude/commands/review-all.md`、`.claude/agents/architect-planner.md`、`.claude/agents/delivery-steward.md`、`create-claude-team/scripts/smoke-test.js`
- **最近更新**：2026-07-11

### N3.4 执行架构 dogfood 与系统审查

- **任务 ID**：N3.4
- **状态**：planned
- **描述**：执行 C1-C3，审查组件归属、单向依赖、只读视图和跨平台一致性；输出 system health review。
- **验收标准**：C1-C3 全部通过；审查涵盖架构形状、产品验收、一致性、文档熵和遗留迁移风险。
- **验收命令**：`npm run test:tarball`、`node create-claude-team/cli.js events validate`、`/review-all --system N3`
- **阻塞原因**：无；Claude 实机体验由 Owner 后续在 N8 前验证。
- **Gate 结果**：local pending / review pending / release not_required
- **产物**：`.claude/workspace/reviews/YYYY-MM-DD-n3-architecture.md`
- **最近更新**：2026-07-11
