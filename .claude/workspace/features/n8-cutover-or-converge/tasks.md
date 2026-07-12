# N8.5 Cutover Or Converge Tasks

> 状态：completed
> Task Set：N8.5-TASKS-001
> Spec：spec.md
> Roadmap Module：N8
> 执行包：.claude/workspace/features/n8-cutover-or-converge/
> 更新于：2026-07-12

## Spec/Task Quality Gate

- 当前结果：pass。
- 本轮范围：经 Owner 确认后完成状态读取切换、可逆 legacy 生命周期标记、全量验证和 N8 收口。
- 不做：删除历史 artifact、发布、复制第三方执行层。
- Builder 状态：OD-N8-005 已确认 A；允许开始可逆切换与验证。

### N8.5.1 确认切换或收敛方向

- **任务 ID**：N8.5.1
- **状态**：done
- **描述**：由 Owner 选择“治理层切换”或“轻量收敛”，并明确是否接受 Claude CLI 本轮超时作为未验证风险。
- **验收标准**：Decision Brief 为 confirmed，类型与目标模块匹配。
- **验收命令**：`node create-claude-team/cli.js decision validate .claude/workspace/decisions/2026-07-12-n8-cutover-or-converge.md`
- **阻塞原因**：无。
- **Gate 结果**：spec/task pass；decision confirmed；delivery preflight/transition pass；local pass（OD-N8-005 validate pass）；review pass；release not_required
- **产物**：`.claude/workspace/decisions/2026-07-12-n8-cutover-or-converge.md`
- **最近更新**：2026-07-12

### N8.5.2 切换状态读取并保留 legacy 证据

- **任务 ID**：N8.5.2
- **状态**：done
- **描述**：实现活跃 feature 选择，标注 legacy lifecycle，不删除历史内容。
- **验收标准**：多 feature package 的 active task 被优先读取；旧 artifact 仍可定位且不会压过 vNext 主线。
- **验收命令**：`npm test`、`node create-claude-team/cli.js status --json`、`node create-claude-team/cli.js planning validate`
- **阻塞原因**：依赖 N8.5.1。
- **Gate 结果**：spec/task pass；decision confirmed；delivery preflight/transition pass；local pass（723 smoke、status active-feature、cleanup 分类）；review pass；release not_required
- **产物**：`create-claude-team/lib/planning-artifacts.js`、相关 smoke、cleanup report
- **最近更新**：2026-07-12

### N8.5.3 全量验证与 N8 收口

- **任务 ID**：N8.5.3
- **状态**：done
- **描述**：运行 gate、tarball smoke、planning/events、system review；在确认范围内更新 roadmap 与事件。
- **验收标准**：N8 总验收的每一项都有证据或已确认风险接受；未满足项不会被标为 done。
- **验收命令**：`npm run gate`、`npm run test:tarball`、`node create-claude-team/cli.js planning validate`、`node create-claude-team/cli.js events validate`
- **阻塞原因**：依赖 N8.5.1,N8.5.2。
- **Gate 结果**：spec/task pass；decision confirmed；delivery preflight/transition pass；local pass（gate、tarball、planning/events、D24、final report）；review pass；release not_required
- **产物**：N8 final report、review、events、roadmap 更新
- **最近更新**：2026-07-12

## 建议顺序

N8.5.1 -> N8.5.2 -> N8.5.3
