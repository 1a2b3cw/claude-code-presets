# 当前任务上下文不清晰

> Change ID：CI-20260711-N6-001
> Status：draft
> Source Feedback：用户在看到当前任务时，不容易判断它归属于哪条产品与架构主线，也不知道局部体验调整需要同步哪些内容。
> Change Kind：experience
> Owner Layer：A2,A4,A5
> Target Module：N6
> Capability ID：C6
> Journey ID：J3
> Architecture Component ID：A4,A5
> Affected Components：A2,A4,A5
> Dependency Direction：A6(feedback) -> A2/A3 -> A4 -> A5 -> A6
> Change Scope：product,planning,delivery
> Analysis Command：`node create-claude-team/cli.js change analyze N6 --kind experience`

## 归属判断

主归属是 A2 的 J3 用户结果：Owner 需要理解体验问题会改变什么。该结果通过 A4 的 Change Impact Brief 交给 A5 受控开发，因此不是 status、events 或 Workbench 的展示问题，也不自动修改 A3 架构事实。

## 影响范围

- 上游：`product-model.md` 的 J3 和 C6 说明用户为何需要安全修改能力。
- 规划：N6 feature spec/tasks、Change Impact Contract 与未来实际变更的 Brief。
- 交付：`change analyze` / `change validate`、`delivery preflight --change`、`/fix`、`/dev`、Builder 和 review 入口。
- 证据：smoke test、review report 和 events；它们只证明执行结果，不拥有归属判断。
- 使用方：N7、N8 依赖 N6，不在本次提前实现它们的运行或迁移能力。

## 同步项

- [ ] `product-model.md`：复核 J3 的用户结果仍由 C6 支撑，不复制 roadmap 或任务状态。
- [ ] `spec.md`：将体验反馈的归属、范围和验收场景落实到 N6 feature spec。
- [ ] `tasks.md`：记录 N6 的实现、命令接入与验证进度。
- [ ] 用户流程测试：覆盖从反馈到 analyze/validate/preflight 的可观察闭环。

## 验证计划

- 修改 planning artifact 后运行 `node create-claude-team/cli.js planning validate`。
- 在实现前运行 `node create-claude-team/cli.js delivery preflight N6 --task N6.2 --change .claude/workspace/changes/2026-07-11-ci-n6-task-context.md`。
- 运行 `change validate`、`npm test` 和生成后的 Claude/Codex command smoke，确认用户能得到归属、同步项和下一步。
