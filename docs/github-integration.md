# GitHub Issue / PR 集成规划

## 目标

GitHub 集成把本地交付 artifact 和 GitHub 协作对象打通，让 Issue、PR、Release 能复用同一套事实来源：

1. Issue 能映射到 `tasks.md` 中的任务。
2. Review report 能映射到 PR comment 或 PR summary。
3. Release report 能映射到 GitHub release notes。
4. `/standup` 和 Workbench 可以引用 GitHub 链接，但不把 GitHub 当唯一状态源。

T6 只做规划，不实现 API 调用、不新增 OAuth、不创建自动同步服务。

## 设计原则

- 本地 artifact 仍是交付事实源：`roadmap.md`、`tasks.md`、`.claude/workspace/events.jsonl`、review/release reports 优先。
- GitHub 是协作出口：Issue/PR/Release 用于团队沟通、审查和发布记录。
- 映射必须可追溯：每个 GitHub 对象都能反查到 task、event 或 report。
- 不重复维护状态：GitHub label/comment 可以反映状态，但不取代 `tasks.md` 状态机。
- 第一版人工触发：先生成建议内容和映射规则，由人或后续命令确认后发布。

## 数据对象映射

| 本地对象 | GitHub 对象 | 方向 | 用途 |
|----------|-------------|------|------|
| `tasks.md` task | Issue | 双向规划 | 任务拆解、owner、阻塞讨论 |
| review report | PR comment / PR review body | 本地到 GitHub | 审查结论、问题列表、剩余风险 |
| release report | GitHub release notes | 本地到 GitHub | 发布结论、检查结果、回滚和验证 |
| `events.jsonl` event | Issue/PR timeline reference | 本地到 GitHub | 记录 run、checks、next action |
| roadmap module | Milestone / Project item | 可选 | 阶段进度和发布范围 |

## Issue 到 Task 映射

### 推荐字段

| Issue 字段 | Task 字段 | 说明 |
|------------|-----------|------|
| Title | 任务描述短标题 | 建议包含任务 ID，例如 `T6.3 GitHub Issue / PR 集成规划` |
| Body | 描述、验收标准、验收命令、阻塞原因 | 保留 Markdown checklist，便于人工确认 |
| Labels | 状态、级别、类型 | 例如 `status:planned`、`level:L`、`type:docs` |
| Assignees | owner / 确认人 | 当前无法判断时写入待确认 |
| Milestone | roadmap phase | 例如 `Phase 6 Multi-project / Team` |
| Linked PR | 关联提交或 PR | PR 合并后回写 task 证据 |

### Task 扩展字段建议

未来如果要稳定双向同步，`tasks.md` 可以增加可选字段：

- `GitHub Issue`：Issue URL 或 `owner/repo#number`。
- `Owner`：负责推进的人。
- `External Status`：GitHub label 或 Project 状态快照。

这些字段是可选增强；第一版不要求所有 task 都有 GitHub 链接。

### 状态映射

| tasks.md 状态 | 推荐 Issue label | 说明 |
|---------------|------------------|------|
| `ready` | `status:ready` | 信息足够，可进入计划 |
| `planned` | `status:planned` | 已排期，尚未开始 |
| `in_progress` | `status:in-progress` | 正在实现 |
| `local_gate` | `status:local-gate` | 本地验证中 |
| `review_gate` | `status:review` | 等待审查或修审查问题 |
| `release_gate` | `status:release` | 等待发布检查 |
| `blocked` | `status:blocked` | 必须保留阻塞原因和确认人 |
| `done` | `status:done` | 无需发布，已完成 |
| `shipped` | `status:shipped` | 已发布或发布检查确认上线 |

GitHub label 只表达快照；发生冲突时，以 `tasks.md` 为准，并在 `/standup` 数据源状态中提示不一致。

## Review Report 到 PR Comment 映射

### 输入来源

- `.claude/workspace/reviews/YYYY-MM-DD-<scope>.md`
- `.claude/workspace/events.jsonl` 中对应 `/review-all` event
- `git diff` 或 PR 文件列表

### PR comment 结构

```markdown
## Review Summary

- conclusion: pass / changes_requested / blocked
- scope: [变更范围]
- related task: [task id / issue link]
- checks: [local/test/review gate 摘要]

## Findings

| severity | file | issue | status |
|----------|------|-------|--------|
| critical/major/minor | path | 摘要 | fixed/open/accepted |

## Auto Fixed

- [自动修复项]

## Remaining Risk

- [剩余风险和需要谁确认]

## Evidence

- review report: [path]
- event: `.claude/workspace/events.jsonl`
```

### PR 状态建议

- 无 critical/major open finding：允许 PR 继续进入 merge 或 release gate。
- 有 critical/major open finding：PR comment 标记 `changes_requested`，`tasks.md` 对应任务回到 `review_gate` 或 `blocked`。
- 风险被接受：PR comment 必须写明 accepted risk，release report 也要引用。

## Release Report 到 Release Notes 映射

### 输入来源

- `.claude/workspace/releases/YYYY-MM-DD-<version-or-scope>.md`
- `.claude/workspace/events.jsonl` 中对应 `/ship` event
- merged PR 列表或 git log

### Release notes 结构

```markdown
## Release Summary

- conclusion: shipped / blocked / dry-run pass
- scope: [发布范围]
- version: [版本或 scope]
- date: YYYY-MM-DD

## User-visible Changes

- [用户可见价值或功能变化]

## Checks

- validate: pass/fail
- test: pass/fail
- pack dry-run: pass/fail
- release gate: pass/fail

## Risks

- [剩余风险、影响和处理方式]

## Rollback

- [回滚步骤]

## Post-release Verification

- [发布后验证项]
```

### 发布边界

- `shipped` 只能来自 release gate 或人工发布确认，不从 PR merge 自动推断。
- dry-run 通过只能说明“可发布”，不能自动创建正式 release。
- 如果 release report 标记 blocked，GitHub release notes 只能生成草稿或建议内容，不能标记为 published。

## GitHub 集成边界

### 第一版只规划

- 不调用 GitHub API。
- 不创建 Issue、PR comment 或 Release。
- 不新增 token、OAuth scope 或 GitHub App。
- 不实现 webhook、轮询或后台同步。
- 不把 GitHub Projects/Jira/Linear 作为必需依赖。

### 后续可实现能力

- `$team-command-standup` 输出 Issue/PR/Release 链接摘要。
- `$team-command-review-all` 生成 PR comment 草稿。
- `$team-command-ship` 生成 release notes 草稿。
- Workbench 展示 task 和 Issue/PR 的关联状态。
- 在明确授权后，通过 GitHub MCP 或 GitHub CLI 执行写入。

## 冲突处理

| 冲突 | 处理方式 |
|------|----------|
| Issue label 与 `tasks.md` 状态不同 | 以 `tasks.md` 为准，standup 标记 warning |
| PR comment 结论与 review report 不同 | 以 review report 为准，并要求重新生成 comment |
| Release notes 与 release report 不同 | 以 release report 为准，release notes 重新生成 |
| Issue 已关闭但 task 未完成 | 标记为数据不一致，Next Best Action 指向人工确认 |
| GitHub 链接失效或权限不足 | 保留本地 artifact，不阻塞本地汇报 |

## 事件记录建议

后续真正执行 GitHub 写入时，相关命令应在 `.claude/workspace/events.jsonl` 中记录：

- `artifacts`：本地 report 路径和 GitHub URL。
- `checks.github`：`pass` / `fail` / `skipped`。
- `next`：PR review、release、或需要人工确认的动作。
- `failureRecovery`：GitHub API、权限或网络失败时写入 `release_failure` 或后续新增类型。

T6 不新增 event 字段，只定义如何复用现有字段。

## 验收标准

- 能说明 Issue 如何映射到 `tasks.md` task。
- 能说明 review report 如何转换为 PR comment。
- 能说明 release report 如何转换为 release notes。
- 明确 GitHub 只是协作出口，本地 artifact 仍是事实源。
- 明确 T6 不实现 API 调用、不新增授权、不自动写 GitHub。
