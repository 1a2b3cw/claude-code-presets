# N4 规划产物体系系统健康审查

> 结论：pass
> 关联任务：N4
> 审查类型：`/review-all --system N4`
> 日期：2026-07-11

## 结论

通过。vNext 规划链现在有一个可读、可验证的事实合同：Product Brief -> Product Model -> Architecture -> Roadmap -> feature spec/tasks -> evidence。没有引入第二份状态数据库，CLI status 与 Workbench 已改为复用同一根 roadmap/feature package 读取优先级。

## 审查范围

- Contract 与迁移：`.claude/workspace/planning/artifact-contract.md`、root artifacts、N1-N4 feature spec/tasks。
- 实现：`create-claude-team/lib/planning-artifacts.js`、`state-tools.js`、`cli.js`、Workbench。
- 双端行为：Claude source commands/agents、Codex generated commands/skills/agents、smoke test。
- 用户文档：README、USAGE、BEST-PRACTICES、Artifact Architecture。

## Dogfood

| 场景 | 结果 | 证据 |
|---|---|---|
| D1 从任务追溯上游 | pass | Codex 正确追溯 N4.2 -> N4 -> C4/J1,J2,J3 -> A4，并指出 N2/N3 依赖与对应 artifact。 |
| D2 状态所有权冲突 | pass | Codex 拒绝用 events 裁决 roadmap/tasks 冲突，明确模块状态、执行状态与证据三类 owner。 |
| D3 同一当前主线 | pass | `status --json` 与 Workbench 均显示 N4；完成后的无 package 回退由回归测试覆盖，显示下一 roadmap 模块而不回到 M6。 |

## 系统健康

- 架构形状：healthy。Planning Artifact Contract 属于 A4，只读取 A2/A3，不把视图或 evidence 变成上游事实。
- 产品与验收：healthy。C4 的“可执行规划”可从任务直接解释用户价值、能力、旅程和架构归属。
- 一致性：healthy。`planning validate` 统一校验 Markdown 头部与 roadmap 表；status 与 Workbench 不再各写一套主线判断。
- 文档熵：可控。根 `spec.md` 和 `docs/*roadmap.md` 明确为 reference/legacy；未删除历史证据，N8 决定迁移清理。

## 发现与修复

- minor，已修复：feature task parser 首次漏掉文件末尾任务，导致 Workbench 少显示一项；修复 EOF 边界并新增回归测试。
- minor，已修复：Delivery Steward 初版只读取合同、未明确运行 validator；补入校验职责并由 Claude/Codex 同步测试守护。
- minor，已修复：下一 roadmap 模块尚无 feature package 时 Workbench 会变成空任务集；改为只读投影 roadmap 模块，不提前创建执行 tasks。

## 剩余风险

- Claude 实机 dogfood 按 Owner 策略在 N8 前完成；当前由同步生成与跨端契约测试覆盖。
- Markdown 合同只解析稳定头部和表格。复杂关系图与自动影响分析属于 N6，不在 N4 扩张。
- legacy docs 未删除；它们只在缺少 vNext artifact 时作为回退，N8 负责实际迁移和清理。

## Gate 结果

- review：pass
- critical：0
- major：0
- minor：3，均已修复
- fix rounds：3

## 验证

- `node create-claude-team/cli.js update`：pass
- `npm run validate`：pass
- `npm test`：pass，631 passed / 0 failed
- `npm run test:tarball`：pass
- `node create-claude-team/cli.js planning validate`：pass
- `node create-claude-team/cli.js status --json`：pass
- `node create-claude-team/cli.js events validate`：pass
- `node workbench/poc/server.mjs --check`：pass
- `git diff --check`：pass

## 下一步

进入 N5 受控开发循环，利用 N4 已确定的引用与状态 owner 在开工前做一致性 gate；不要在 N5 再重定义 planning schema。
