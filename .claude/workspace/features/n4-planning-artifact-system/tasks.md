# N4 规划产物体系 Tasks

> 状态：done
> Task Set：N4-TASKS-001
> Spec：`spec.md`
> Roadmap Module：N4
> 执行包：`.claude/workspace/features/n4-planning-artifact-system/`
> 更新于：2026-07-11

## Spec/Task Quality Gate

- 当前结果：pass
- 本轮范围：A4 artifact 合同、校验、vNext-first 读取和 dogfood。
- 不做：第二份状态数据库、N5 门禁、N6 影响图、N8 清理删除。
- Builder 状态：N4.1-N4.4 已完成。

### N4.1 建立 Planning Artifact Contract 与迁移头部

- **任务 ID**：N4.1
- **状态**：done
- **描述**：定义唯一事实源、读取顺序、稳定 ID、spec/tasks 最小字段和 legacy 分类；迁移 N1-N4 头部。
- **验收标准**：Owner 能从合同定位任一事实归属，历史 package 不再缺少上游引用。
- **验收命令**：`rg -n "Planning Artifact Contract|Architecture Component ID|Roadmap ID" .claude/workspace/planning product-brief.md roadmap.md`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/planning/artifact-contract.md`、root artifacts、N1-N4 spec/tasks
- **最近更新**：2026-07-11

### N4.2 实现规划校验器与 CLI

- **任务 ID**：N4.2
- **状态**：done
- **描述**：解析稳定 Markdown 头部/roadmap 表，校验 ID、引用、依赖、状态和 feature package 合同，提供 CLI 命令。
- **验收标准**：错误定位到具体 artifact/字段；正常 vNext 主线通过；smoke 覆盖至少一个坏引用。
- **验收命令**：`node create-claude-team/cli.js planning validate`、`npm test`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`create-claude-team/lib/planning-artifacts.js`、`cli.js`、tests
- **最近更新**：2026-07-11

### N4.3 切换 CLI status 与 Workbench 的读取优先级

- **任务 ID**：N4.3
- **状态**：done
- **描述**：让 status 与 Workbench 优先使用 planning parser 的 root roadmap 和 feature tasks，旧 M6 仅回退。
- **验收标准**：D3 中 CLI 与 Workbench 均显示 N4，不读取旧 docs 作为当前主线。
- **验收命令**：`node create-claude-team/cli.js status --json`、`node workbench/poc/server.mjs --check`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`create-claude-team/lib/state-tools.js`、`workbench/poc/server.mjs`
- **最近更新**：2026-07-11

### N4.4 注入命令/角色契约并完成 dogfood 与审查

- **任务 ID**：N4.4
- **状态**：done
- **描述**：同步 Claude/Codex 的 planning 读取约束，执行 D1-D3、系统审查和发布包验证。
- **验收标准**：D1-D3 通过；报告覆盖状态所有权、legacy 风险与 Claude 后续验证。
- **验收命令**：`node create-claude-team/cli.js update`、`npm run test:tarball`、`/review-all --system N4`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/reviews/2026-07-11-n4-planning-artifacts.md`
- **最近更新**：2026-07-11

## 建议顺序

```text
N4.1 -> N4.2 -> N4.3 -> N4.4
```

N4.2 的 parser 以 N4.1 的合同为输入；N4.3 必须复用同一 parser，不能在 Workbench 复制解析规则；N4.4 最后验证两端同步与实际主线一致性。
