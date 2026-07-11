# N6 变更影响与完整性 Tasks

> 状态：done
> Task Set：N6-TASKS-001
> Spec：`spec.md`
> Roadmap Module：N6
> 执行包：`.claude/workspace/features/n6-change-impact-integrity/`
> 更新于：2026-07-11

## Spec/Task Quality Gate

- 当前结果：pass
- 本轮范围：变更 Brief、影响分析/校验 CLI、受控开发接入和系统验证。
- 不做：自动调用图、自动改代码/文档、N7 运行保障、N8 迁移删除。
- Builder 状态：N6.1-N6.4 已完成；审查与本地门禁均通过。

### N6.1 建立 Change Impact Contract 与执行包

- **任务 ID**：N6.1
- **状态**：done
- **描述**：定义反馈归属、Brief 字段、Kind 同步项、验证计划和上游事实边界。
- **验收标准**：Owner 可读懂一处体验问题属于哪层、要同步什么、何时需要升级架构/安全决策。
- **验收命令**：`node create-claude-team/cli.js planning validate`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/planning/change-impact-contract.md`、`spec.md`、`tasks.md`
- **最近更新**：2026-07-11

### N6.2 实现 change analyze / validate 与 delivery 关联

- **任务 ID**：N6.2
- **状态**：done
- **描述**：从 planning chain 生成影响范围和同步建议，校验 Brief，并允许 delivery preflight 验证已通过的 Brief。
- **验收标准**：D7-D9 中定位、架构同步拒绝、通过 Brief 的受控开工均可自动验证。
- **验收命令**：`npm test`、`node create-claude-team/cli.js change analyze N6 --kind experience`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`create-claude-team/lib/change-impact.js`、`delivery-control.js`、`cli.js`、smoke test
- **最近更新**：2026-07-11

### N6.3 接入变更命令和角色

- **任务 ID**：N6.3
- **状态**：done
- **描述**：让 `/fix`、`/dev`、Builder、Architect-Planner、Delivery Steward 和 `/review-all` 使用同一 Brief 合同。
- **验收标准**：Claude/Codex 生成入口都说明先分析、后修改、审查验证 Brief 与实际变更一致。
- **验收命令**：`node create-claude-team/cli.js update`、`npm test`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/commands/`、`.claude/agents/`、`.agents/`
- **最近更新**：2026-07-11

### N6.4 Dogfood、系统审查与状态收口

- **任务 ID**：N6.4
- **状态**：done
- **描述**：用真实 N6 Brief 走通分析、验证和 delivery preflight，完成系统审查、证据和状态收口。
- **验收标准**：D7-D9、N6 全部验收命令和 review report 通过，明确 N7/N8 残余边界。
- **验收命令**：`npm run gate`、`npm run test:tarball`、`node create-claude-team/cli.js events validate`、`node workbench/poc/server.mjs --check`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/changes/`、`.claude/workspace/reviews/2026-07-11-n6-change-impact-integrity.md`、`.claude/workspace/events.jsonl`
- **最近更新**：2026-07-11

## 建议顺序

```text
N6.1 -> N6.2 -> N6.3 -> N6.4
```

N6.2 复用 N4/N5 的 parser 和 gate；N6.3 只调用 N6.2 的 CLI，不能重新解释影响规则；N6.4 最后以真实 Brief 验证闭环。

## 收口证据

- 审查报告：`.claude/workspace/reviews/2026-07-11-n6-change-impact-integrity.md`
- 本地门禁：`npm run gate`、`npm run test:tarball` 通过。
- 主链验证：`planning validate`、`events validate`、Workbench `--check` 通过。
- 发布：不涉及面向最终用户的软件发布；N7 仍负责安全、上线和运行保障，N8 仍负责迁移和替换。
