# N8.4 Ecosystem Boundary Tasks

> 状态：completed
> Task Set：N8.4-TASKS-001
> Spec：spec.md
> Roadmap Module：N8
> 执行包：.claude/workspace/features/n8-ecosystem-boundary/
> 更新于：2026-07-12

## Spec/Task Quality Gate

- 当前结果：pass。
- 本轮范围：N8 编号/状态对账、成熟生态对照、复用边界和 N8.5 决策输入。
- 不做：安装/复制第三方执行层、删除 legacy artifact、产品形态切换或发布。
- Builder 状态：可以开始；N8.5 仍需独立 Owner Decision。

### N8.4.1 对账 N8 编号、状态与证据

- **任务 ID**：N8.4.1
- **状态**：done
- **描述**：将 Lifecycle 包的历史内部任务改为三级语义编号，修正已完成 package 的 spec/tasks 状态，并创建唯一映射表。
- **验收标准**：人和 CLI 能区分 Lifecycle 子任务、Owner Gate、Dogfood、生态边界与最终切换；所有引用仍可追溯。
- **验收命令**：`node create-claude-team/cli.js planning validate`、`node create-claude-team/cli.js events validate`
- **阻塞原因**：无。
- **Gate 结果**：spec/task pass；delivery preflight/transition pass；local pass（planning/events 与编号映射核验）；review pass；release not_required
- **产物**：`.claude/workspace/n8-evidence-map.md`、Lifecycle/Owner Gate 的修订 spec/tasks/review 引用
- **最近更新**：2026-07-12

### N8.4.2 形成成熟执行层与治理层边界

- **任务 ID**：N8.4.2
- **状态**：done
- **描述**：评估 Superpowers 与 MY2 的能力重叠、许可证和安全边界，写出复用/保留/不做结论。
- **验收标准**：通用执行能力不再被列为 MY2 的继续建设目标；保留能力有 N8 Dogfood 或确定性 gate 证据。
- **验收命令**：边界报告 checklist、`node create-claude-team/cli.js planning validate`
- **阻塞原因**：依赖 N8.4.1。
- **Gate 结果**：spec/task pass；delivery preflight/transition pass；local pass（来源、许可证、安全与能力边界核验）；review pass；release not_required
- **产物**：`.claude/workspace/n8-ecosystem-boundary.md`
- **最近更新**：2026-07-12

### N8.4.3 准备 N8.5 的决策输入

- **任务 ID**：N8.4.3
- **状态**：done
- **描述**：将 N8.1-N8.4 证据、Claude 未验证项和 legacy 迁移范围写入 N8.5 Owner Decision Brief 草稿。
- **验收标准**：Brief 明确推荐、选项、不会自动执行的影响和安全默认；未确认时 N8.5 preflight 被拦截。
- **验收命令**：`node create-claude-team/cli.js decision validate <brief>`（预期 blocked，直到 Owner 确认）
- **阻塞原因**：依赖 N8.4.2。
- **Gate 结果**：spec/task pass；delivery preflight/transition pass；local pass（OD-N8-005 未确认时 decision validate = blocked）；review pass；release not_required
- **产物**：`.claude/workspace/decisions/2026-07-12-n8-cutover-or-converge.md`
- **最近更新**：2026-07-12

## 建议顺序

N8.4.1 -> N8.4.2 -> N8.4.3
