# Workbench Alpha 设计契约

> Alpha 目标：把 Workbench 从静态/PoC 展示升级为每天能用的本地项目驾驶舱。它仍然只读本地 artifact，不做数据库、不接云服务、不写回状态。
> 当前定位：Workbench 进入 M6 / backlog。M1-M3 先完成团队角色、决策边界、Spec/Task Quality Gate、Artifact Stewardship 和可信状态源；Workbench 只能作为这些 artifact 的只读视图。

## 设计原则

- **artifact-first**：所有状态来自 roadmap、tasks、events、review/release reports 和 git，而不是聊天记忆。
- **10 秒决策**：Today 第一屏必须回答“现在在哪、哪里卡住、下一步做什么、有什么风险”。
- **证据可追溯**：每个结论都要能回到 event、task、review report 或 release report。
- **空状态不装懂**：缺少数据时明确展示 `missing` / `data insufficient`，不推断成 healthy。
- **all-done 有出口**：任务全部完成时，建议发布确认、复盘、dogfood 或规划下一轮，而不是继续找不存在的任务。

## 数据源

| 数据源 | 路径 | Alpha 用途 | 缺失时 |
|--------|------|------------|--------|
| Roadmap | `docs/maturity-roadmap.md`、`docs/productivity-roadmap.md`、`roadmap.md` | 当前阶段、长期目标、阶段风险 | Today 标记 roadmap missing |
| Tasks | `docs/maturity-tasks.md`、`docs/productivity-tasks.md`、`tasks.md` | 当前焦点、任务队列、完成率、阻塞 | Today 标记 task data insufficient |
| Events | `.claude/workspace/events.jsonl` | 最近 run、checks、next action、failureRecovery | Recent runs 显示空状态 |
| Review reports | `.claude/workspace/reviews/*.md` | 最新审查结论、open findings、剩余风险 | Review 状态显示 no report |
| Release reports | `.claude/workspace/releases/*.md` | 发布结论、blockers、warnings、回滚状态 | Release 状态显示 no report |
| Dogfood | `.claude/workspace/dogfood.md` | 真实使用天数、决策成功率、改进反馈 | Dogfood 状态显示 not started |

## Today

### 字段

| 字段 | 规则 | 来源 |
|------|------|------|
| Focus | 最靠前的 `in_progress` / `ready` / `planned` 任务；没有则进入 all-done 判断 | tasks |
| Blocked | blocked 任务数、failed/blocked event、未恢复 failureRecovery | tasks/events |
| Progress | 当前任务集完成数 / 总数 | tasks |
| Latest run | 最新非空 event 的 command、taskId、status、summary、checks | events |
| Review | 最新 review report 的结论和 unresolved 风险 | review reports |
| Release | 最新 release report 的结论、blockers、warnings | release reports |
| Next Best Action | 根据 focus、blocked、review、release、all-done 规则生成 | tasks/events/reports |
| Risk | release warnings、review findings、数据源缺失、metrics 警告 | reports/events |

### Next Best Action 优先级

1. 存在 blocked task 或 unrecovered failure → 指向解除阻塞。
2. 最新 review 有 critical/major open finding → 指向修 review。
3. 最新 release 有 blockers → 指向修 release gate。
4. 存在 ready/planned/in_progress task → 指向继续该 task。
5. 所有任务 done 且 release report 需要确认 → 指向发布确认。
6. 所有任务 done 且 release 已通过 → 指向复盘、dogfood 或规划下一轮。
7. 数据不足 → 指向补齐 tasks/events 或运行 standup。

### all-done 状态

当当前任务集全部为 `done` / `completed` / `shipped` 时：

- Focus 显示 `all done`，不选择已完成任务作为焦点。
- Next Best Action 按顺序推荐：
  1. 用户确认是否合并、tag 或发布 npm。
  2. 生成或更新 release report。
  3. 追加 dogfood 记录。
  4. 规划下一轮 roadmap。
- Risk 显示最新 release warnings、未处理 review risk 或“暂无明显风险”。

## Task Focus

### 字段

- 任务 ID、标题、状态、优先级。
- 目标和范围边界。
- 验收标准或验收命令。
- Gate 结果：local/review/release。
- 最近 run：与该任务 ID 匹配的 event。
- 阻塞原因：来自 task、event 或 failureRecovery。
- 可复制下一步命令。

### 空状态

- 没有任务：显示需要创建 `tasks.md` 或 `docs/maturity-tasks.md`。
- 所有任务完成：显示 all-done 总结和下一轮建议。
- 任务缺少验收标准：显示 `acceptance missing`，风险提示为 watch。

## Run Detail

### 字段

| 字段 | 说明 |
|------|------|
| time | event 时间 |
| command | `/dev`、`/check`、`/review-all`、`/ship`、`/standup` |
| taskId | 标准任务或模块 ID |
| status | completed / failed / blocked / skipped |
| summary | 人类可读的一句话结果 |
| checks | 结构化 checks 列表 |
| artifacts | 关键文件、报告或模块路径 |
| next | 下一步建议 |
| metrics | specRejectCount、checkIssueCount、reviewRejectCount、testFailureCount 等 |
| failureRecovery | failureType、stage、symptom、rootCause、recoveryAction、attempts、finalStatus、evidence、followUp |

### 展示规则

- 不内嵌完整命令日志。
- artifacts 只展示路径和证据类型。
- checks 按 pass / warning / fail 分组。
- failureRecovery 只有存在时展示。
- 缺少 summary 或 checks 时显示 `not recorded`，不隐藏字段。

## Review / Release 摘要

### Review 摘要

读取最新 `.claude/workspace/reviews/*.md`，提取：

- 结论：优先匹配 `结论：` 或 `review: pass/needs_fix/blocked`。
- 问题数：critical、major、minor、suggestion。
- 剩余风险。
- 报告路径。

### Release 摘要

读取最新 `.claude/workspace/releases/*.md`，提取：

- 发布结论。
- blockers / warnings。
- release gate 状态。
- rollback 状态。
- 需要人工确认的发布动作。
- 报告路径。

## Alpha 不做

- 不做登录、权限、云同步。
- 不做数据库。
- 不写回 artifact。
- 不直接调用 GitHub API。
- 不做多项目总览。
- 不展示完整长日志。
- 不替代 `/plan`、`/dev`、`/review-all`、`/standup` 的事实判断。
- 不在 M1 主线继续扩 UI；只在可信 artifact 稳定后作为 M6 视图层推进。

## Alpha 验收标准

- `node workbench/poc/server.mjs --check` 通过。
- Today 显示 focus、blocked、progress、latest run、review、release、next action、risk。
- 当前任务全 done 时，focus 为 all-done 出口，而不是已完成任务。
- Run Detail 能展示最近 event 的 summary、checks、artifacts、failureRecovery 和 next。
- 缺少 review/release/report 目录时页面仍能渲染。
