# N5 受控开发循环 Tasks

> 状态：done
> Task Set：N5-TASKS-001
> Spec：`spec.md`
> Roadmap Module：N5
> 执行包：`.claude/workspace/features/n5-controlled-delivery-loop/`
> 更新于：2026-07-11

## Spec/Task Quality Gate

- 当前结果：pass
- 本轮范围：A5 开工 preflight、状态迁移判定、命令接入和双端验证。
- 不做：写状态 CLI、N6 影响图、N7 真实安全发布/运维门禁。
- Builder 状态：N5.1-N5.4 已完成并通过 review；release not_required。

### N5.1 定义受控交付合同与 N5 执行包

- **任务 ID**：N5.1
- **状态**：done
- **描述**：定义 preflight 输入、结果、开工条件、安全升级和状态迁移规则，并建立可追溯 feature package。
- **验收标准**：Owner 可解释何时能开工、何时必须补规划、何时被依赖阻止，以及状态由谁写入。
- **验收命令**：`node create-claude-team/cli.js planning validate`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/planning/delivery-contract.md`、`spec.md`、`tasks.md`
- **最近更新**：2026-07-11

### N5.2 实现 delivery preflight 与状态迁移 CLI

- **任务 ID**：N5.2
- **状态**：done
- **描述**：复用 planning parser 检查目标、依赖、feature 完整性、安全风险与允许迁移，并输出 JSON/人类可读结论。
- **验收标准**：D4-D6 的 pass、needs_revision、blocked 与拒绝迁移均可自动验证。
- **验收命令**：`npm test`、`node create-claude-team/cli.js delivery preflight N5 --task N5.2`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`create-claude-team/lib/delivery-control.js`、`create-claude-team/cli.js`、`create-claude-team/scripts/smoke-test.js`
- **最近更新**：2026-07-11

### N5.3 接入开发、检查、审查和发布命令

- **任务 ID**：N5.3
- **状态**：done
- **描述**：让 Claude/Codex 的 `/dev`、Builder、`/check`、`/review-all` 和 `/ship` 在进入相应阶段前使用同一 preflight/transition 契约。
- **验收标准**：生成后的 Claude/Codex 文档均引用同一 CLI，且不将证据或视图改成状态源。
- **验收命令**：`node create-claude-team/cli.js update`、`npm test`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/commands/`、`.claude/agents/builder.md`、`.agents/`
- **最近更新**：2026-07-11

### N5.4 Dogfood、审查与状态收口

- **任务 ID**：N5.4
- **状态**：done
- **描述**：以 N5 package 验证开工和迁移场景，执行系统审查、全套校验并记录证据和最终状态。
- **验收标准**：D4-D6 与所有 N5 验收命令通过；review report 说明残余 N7 边界。
- **验收命令**：`npm run validate`、`npm test`、`npm run test:tarball`、`node create-claude-team/cli.js planning validate`、`node create-claude-team/cli.js events validate`、`node workbench/poc/server.mjs --check`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/reviews/2026-07-11-n5-controlled-delivery-loop.md`、`.claude/workspace/events.jsonl`
- **最近更新**：2026-07-11

## 建议顺序

```text
N5.1 -> N5.2 -> N5.3 -> N5.4
```

N5.2 以 N5.1 的合同为输入；N5.3 只引用 N5.2 的 CLI，不能复制判断；N5.4 最后验证两端入口和证据链。
