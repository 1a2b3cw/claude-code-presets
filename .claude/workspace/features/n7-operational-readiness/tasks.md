# N7 安全、发布与运行保障 Tasks

> 状态：done
> Task Set：N7-TASKS-001
> Spec：`spec.md`
> Roadmap Module：N7
> 执行包：`.claude/workspace/features/n7-operational-readiness/`
> 更新于：2026-07-11

## Spec/Task Quality Gate

- 当前结果：pass
- 本轮范围：运行准备度合同、只读 CLI、`/ship`/DevOps 入口和系统验证。
- 不做：真实生产部署、供应商配置、自动恢复、N8 迁移与删除。
- Builder 状态：N7.1-N7.4 已完成；本地门禁和系统审查均通过。

### N7.1 建立运行准备度合同与执行包

- **任务 ID**：N7.1
- **状态**：done
- **描述**：定义 A6 Readiness Brief、风险等级、秘密边界、运行证据和 release report 的职责分离。
- **验收标准**：Owner 能理解上线前必须准备什么、什么仍由项目 DevOps 真实执行。
- **验收命令**：`node create-claude-team/cli.js planning validate`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/planning/operational-readiness-contract.md`、`spec.md`、`tasks.md`
- **最近更新**：2026-07-11

### N7.2 实现 operations validate

- **任务 ID**：N7.2
- **状态**：done
- **描述**：校验 Readiness Brief 的目标模块、章节、风险要求、完成状态和秘密边界。
- **验收标准**：D10-D12 的有效、缺高风险证据和秘密泄露场景可自动区分。
- **验收命令**：`npm test`、`node create-claude-team/cli.js operations validate <brief>`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`create-claude-team/lib/operational-readiness.js`、`cli.js`、smoke test
- **最近更新**：2026-07-11

### N7.3 接入发布与 DevOps 入口

- **任务 ID**：N7.3
- **状态**：done
- **描述**：让 `/ship`、DevOps 和 Claude/Codex 生成入口引用同一个运行准备度校验与升级规则。
- **验收标准**：高风险发布不能只靠 release report 放行；生成入口要求先验证 Brief。
- **验收命令**：`node create-claude-team/cli.js update`、`npm test`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/commands/ship.md`、`.claude/agents/devops.md`、`.agents/`、`.codex/agents/devops.toml`
- **最近更新**：2026-07-11

### N7.4 Dogfood、系统审查与状态收口

- **任务 ID**：N7.4
- **状态**：done
- **描述**：用真实 N7 Brief 验证合同、CLI 和发布入口，完成系统审查、证据和状态收口。
- **验收标准**：D10-D12、N7 全部验收命令和 review report 通过，明确 N8 迁移验证边界。
- **验收命令**：`npm run gate`、`npm run test:tarball`、`node create-claude-team/cli.js events validate`、`node workbench/poc/server.mjs --check`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/operations/`、`.claude/workspace/reviews/2026-07-11-n7-operational-readiness.md`、`.claude/workspace/events.jsonl`
- **最近更新**：2026-07-11

## 建议顺序

```text
N7.1 -> N7.2 -> N7.3 -> N7.4
```

N7.2 只读解析 N4 主链和 N7 Brief；N7.3 只引用 N7.2 的 CLI，不能复制另一套发布门禁；N7.4 以真实 Brief 和生成入口验证闭环。

## 收口证据

- 真实 high-risk Brief：`.claude/workspace/operations/2026-07-11-n7-operational-readiness.md`。
- 审查报告：`.claude/workspace/reviews/2026-07-11-n7-operational-readiness.md`。
- 本地门禁：`npm run gate`（682 通过）、`npm run test:tarball` 通过。
- 主链验证：`operations validate`、`planning validate`、`events validate`、Workbench `--check` 通过。
- 发布：N7 建立发布准备度门禁，但没有执行真实生产部署；每个项目的 CI/CD 和 DevOps 仍必须完成环境验证与恢复演练。
