# /check - 功能级快检

写完一个功能后立即执行的轻量检查。1 分钟内出结果。

## Project Preset Lifecycle

开始前运行 `node create-claude-team/cli.js project-preset context --json`。当结果为 `pass` 时，按 `PRESET.md -> rules -> specs -> base/技术栈 preset` 顺序读取；只读取与当前检查相关的 rules/specs。结果为 `needs_revision` 时，不得静默把 project-preset 当作项目事实，先说明 `project-preset validate` 的修复项。不存在 project-preset 时，继续使用 base 和已安装技术栈 preset，不阻塞既有项目，并按需建议 `/project-preset`。

## 和 /review-all 的区别

| 维度 | /check | /review-all |
|------|--------|-------------|
| **目的** | 写完一个功能后快速查错 | 合并前/上线前全面审查 |
| **范围** | 当前变更的文件 | 整个模块或分支 |
| **维度** | 3 个（逻辑 + 类型 + 边界） | 4 个跨文件维度（变更完整性+一致性+历史回归+依赖关系），逐文件 6 维度由 code-review skill 负责 |
| **耗时** | < 1 分钟 | 3-5 分钟 |
| **后续** | 有问题自动修 | 输出报告等你决定 |

## 检查内容（3 个维度）

### 1. 逻辑正确性
- 函数返回值是否符合预期类型
- 条件分支是否覆盖所有情况（if/else、switch/default）
- 异步操作是否有 await / .catch
- 错误处理是否完善（try-catch、错误边界）
- 循环是否有终止条件
- 空值/undefined/null 是否处理

### 2. 类型安全
- TypeScript 类型是否正确（any → unknown）
- 函数参数和返回值是否有类型标注
- 接口/类型定义是否完整
- 类型断言是否合理（as 类型 → 优先用类型守卫）

### 3. 边界条件
- 空数组/空对象/空字符串
- 零值/负值/最大值
- 数组越界
- 并发竞态
- 特殊字符（SQL 注入、XSS）

## 检查流程

```
1. 确定检查范围
   - 如果指定了文件：只检查指定文件
   - 如果没指定：检查当前 git diff 中变更的文件

2. 逐文件检查（3 个维度）

3. 输出结果
   - 没问题 → "✅ 快检通过，可以继续"
   - 有问题 → 列出问题 + 自动修复 → 重新检查

4. 自动修复规则
   - 能自动修的（类型错误、空值处理、缺少 await）→ 直接修
   - 需要判断的（逻辑错误、边界遗漏）→ 列出问题 + 修复建议，你确认后修
   - 修完后自动重新检查，最多 2 轮
   - 2 轮后仍有问题 → 列出剩余问题等你决定
```

## tasks.md 状态更新

## Controlled Delivery Contract

存在 `.claude/workspace/planning/delivery-contract.md` 时，`/check` 在改写任务状态前运行：

```text
node create-claude-team/cli.js delivery transition <module> <task-id> local_gate
```

本地检查通过并写入 `Gate 结果` 的 `local pass` 后，再运行 `delivery transition <module> <task-id> review_gate`。CLI 只判断迁移条件，不代替 `/check` 执行测试，也不写入 `tasks.md`。

如果仓库存在 `tasks.md`，或用户指定了任务/模块 ID，`/check` 必须把它作为执行状态源同步更新：

- 开始快检时，将对应任务状态更新为 `local_gate`，并刷新最近更新日期。
- 快检通过时，记录 `Gate 结果.local = pass`，写入实际验收命令和涉及文件。
- 更新时不要删除任务条目的验收标准、验收命令、阻塞原因、Gate 结果和产物字段。
- 快检通过且该任务需要跨文件审查时，将状态推进到 `review_gate`；无需审查的轻量任务可推进到 `done`。
- 快检失败但已自动修复通过时，仍记录 local gate 为 `pass`，并在 Gate 结果中写修复轮次。
- 2 轮后仍失败或需要用户判断时，将状态更新为 `blocked`，写明阻塞原因和下一步确认人。

`tasks.md` 状态必须使用：`ready` / `needs_clarification` / `planned` / `in_progress` / `local_gate` / `review_gate` / `release_gate` / `blocked` / `shipped` / `done`。

## 标准结果摘要

`/check` 完成后必须输出固定的 `Summary` 块，供用户阅读，并作为 `events.jsonl` 的字段来源。

```markdown
## Summary
- status: completed / failed / blocked / skipped
- affected files/modules: [本次检查或自动修复的文件/模块]
- checks: [logic、types、boundary 的最终结果和问题数]
- next action: [继续开发、进入 /review-all、等待用户确认或阻塞原因]
```

映射规则：
- `events.jsonl.summary` 使用 `status` + 一句话快检结论，例如 `completed: 快检通过，无剩余问题`。
- `events.jsonl.artifacts` 使用 `affected files/modules` 中的文件路径。
- `events.jsonl.checks` 使用 `checks` 的结构化结果。
- `events.jsonl.next` 使用 `next action`。

### Next Best Action 契约

`/check` 完成或阻塞时必须输出固定的 Next Best Action，告诉用户下一步应该做什么、为什么、是否需要人工确认。

```markdown
## Next Best Action
- action: [建议执行的命令或人工动作，如继续开发、/review-all、/fix、等待用户确认]
- reason: [为什么现在应该做这一步，引用快检结果、问题数、修复轮次或任务状态]
- requires human confirmation: yes / no
- source: [依据来源，如 checks、tasks.md、events.jsonl、git diff]
```

写入规则：
- `Summary.next action` 必须与 `Next Best Action.action` 保持一致或可直接追溯。
- 如果 `requires human confirmation: yes`，必须说明谁需要确认什么。
- 如果快检失败且不能自动修复，Next Best Action 必须指向最小确认或修复动作。

## 事件记录

`/check` 收尾时必须向 `.claude/workspace/events.jsonl` 追加 1 行 JSONL 事件。该文件是 `/standup` 和后续 metrics 的机器可读事实来源。

### events.jsonl 契约

每行是一个独立 JSON 对象，不允许跨行，不回写旧事件。

| 字段 | 必填 | 说明 |
|------|------|------|
| `time` | 是 | UTC ISO 8601 时间，如 `2026-07-09T10:00:00Z` |
| `command` | 是 | 固定为 `/check` |
| `task` | 否 | 关联任务或模块 ID；没有则为 `null` |
| `status` | 是 | `completed` / `failed` / `blocked` / `skipped` |
| `summary` | 是 | 一句话快检结果摘要 |
| `checks` | 否 | 快检结果对象，如 `{"logic":"pass","types":"pass","boundary":"fail"}` |
| `artifacts` | 否 | 本次自动修复或检查涉及的关键文件路径数组 |
| `next` | 否 | 下一步建议，或 `null` |

#### Metrics 扩展字段

`events.jsonl` 同时是结构化 metrics 的机器事实来源。`/check` 收尾事件应尽量写入这些可选字段；未知时用 `null`，计数无发生时用 `0`：

| 字段 | 说明 |
|------|------|
| `taskId` | 标准任务或模块 ID；优先等于 `task` |
| `level` | 任务级别：`S` / `M` / `L` / `XL`；未知为 `null` |
| `specRejectCount` | 本命令不产生 spec 否决，默认 `0` |
| `checkIssueCount` | 首次快检发现的问题数 |
| `checkFixRounds` | 自动修复并重新检查的轮数 |
| `reviewRejectCount` | 本命令不产生 review 打回，默认 `0` |
| `testFailureCount` | 若快检包含测试，记录测试失败次数；否则 `0` |
| `estimateHours` | 继承任务估算；没有则为 `null` |
| `actualHours` | 本次快检实际耗时；没有记录则为 `null` |

#### 失败恢复记录契约

当 `/check` 遇到测试失败、CI 失败、pack 失败、hook 误拦或发布失败，并且本次流程进行了自动修复、重试、回滚或最终阻塞时，收尾事件必须写入可选对象 `failureRecovery`。无失败发生时省略该对象。

`failureRecovery` 固定字段：

| 字段 | 说明 |
|------|------|
| `failureType` | `test_failure` / `ci_failure` / `pack_failure` / `hook_false_positive` / `release_failure` |
| `stage` | 发生阶段，如 `local_gate`、`review_gate`、`release_gate`、`hook`、`ci` |
| `symptom` | 用户可读的失败现象，避免粘贴长日志 |
| `rootCause` | 已确认根因；未知时为 `unknown` |
| `recoveryAction` | 已执行的恢复动作，如 fix、retry、rollback、mark_flaky、accept_risk |
| `attempts` | 修复或重试次数 |
| `finalStatus` | `recovered` / `blocked` / `accepted_risk` / `needs_followup` |
| `evidence` | 相关命令、报告或日志路径数组，必须使用仓库相对路径 |
| `followUp` | 后续任务、补测试、修 CI 或人工确认事项；没有则为 `null` |

写入规则：
- 只在快检收尾时追加 1 条最终事件，不记录中间步骤。
- 如果 `.claude/workspace/` 或 `events.jsonl` 不存在，创建它们。
- 路径使用仓库相对路径，不记录绝对路径、密钥、token 或敏感数据。
- 写入失败时在最终输出中说明，但不改变快检结论。

示例：

```json
{"time":"2026-07-09T10:05:00Z","command":"/check","task":"T0.2","taskId":"T0.2","level":"M","status":"completed","summary":"completed: 快检通过，无剩余问题","checks":{"logic":"pass","types":"pass","boundary":"pass","issues":0},"specRejectCount":0,"checkIssueCount":0,"checkFixRounds":0,"reviewRejectCount":0,"testFailureCount":0,"estimateHours":null,"actualHours":null,"artifacts":["src/auth/login.ts"],"next":"继续 /review-all"}
```

## 输出格式

```markdown
# 快检报告

## 结论：✅ 通过 / ❌ 有问题

| 文件 | 逻辑 | 类型 | 边界 | 问题数 |
|------|------|------|------|--------|
| login.ts | ✅ | ✅ | ❌ | 1 |
| auth-service.ts | ✅ | ✅ | ✅ | 0 |

## 问题详情

### ❌ login.ts:45
**类型**：边界条件
**问题**：`password` 参数未检查空字符串
**修复**：添加 `if (!password.trim()) throw new ValidationError('密码不能为空')`
**状态**：已自动修复 / 等待确认

## 修复记录
- [x] login.ts:45 - 添加空字符串检查

## Summary
- status: completed
- affected files/modules: login.ts, auth-service.ts
- checks: logic pass / types pass / boundary pass / issues 0
- next action: 继续 /review-all
```

## 使用方式

```
/check                              # 快检当前 git diff 中的变更
/check src/auth/login.ts            # 快检指定文件
/check src/features/auth/           # 快检指定目录
```
