# /standup - 项目状态汇报

生成项目当前状态的简要汇报 + 团队效能分析。

## 数据来源
- `roadmap.md`（产品模块、优先级、依赖、进度；不存在时跳过）
- `tasks.md`（当前迭代任务状态、阻塞、验收命令；不存在时跳过）
- `.claude/workspace/events.jsonl`（命令事件流；优先读取最近 20 条）
- `.claude/workspace/journal.md`（会话日志、历史决策和上下文）
- `.claude/workspace/metrics.md`（效能指标和趋势）
- Git log（最近提交，建议 `git log --oneline -10`）
- TaskList（当前会话内任务进度，作为运行时补充）

## 状态读取流程

1. **读取 roadmap.md**
   - 提取模块 ID、标题、状态、依赖、风险和建议顺序。
   - `done` / 已勾选模块进入“已完成”。
   - `active` / `in_progress` / 当前指定模块进入“进行中”。
   - `blocked` 或依赖未完成的模块进入“阻塞项”。

2. **读取 tasks.md**
   - 提取任务 ID、状态、阻塞原因、验收命令和 gate 结果。
   - `done` 进入“已完成”，`doing` / `in_progress` 进入“进行中”，`blocked` 进入“阻塞项”。
   - `todo` 且依赖已满足的最靠前任务作为“下一步建议”的候选。

3. **读取 events.jsonl**
   - 只读取最近 20 条有效 JSONL；坏行跳过并在数据源状态中标记 warning。
   - 使用 `command`、`task`、`status`、`summary`、`checks`、`artifacts`、`next` 推断最近完成、失败、阻塞和下一步。
   - 使用 metrics 扩展字段 `taskId`、`level`、`specRejectCount`、`checkIssueCount`、`checkFixRounds`、`reviewRejectCount`、`testFailureCount`、`estimateHours`、`actualHours` 聚合最近 5/10 次任务趋势。
   - 使用 `failureRecovery` 识别测试失败、CI 失败、pack 失败、hook 误拦和发布失败，生成“最近失败 Top N”和“重复失败建议”。
   - 重复问题检测只统计非 `/standup` 事件，且优先统计 `failed` / `blocked` 状态；连续出现相同失败 `checks`、相同 `blocked` 状态或相同 `next` 卡住时，输出到“重复问题/流程改进建议”。
   - `/standup` 自己追加的事件只用于证明状态汇报发生过，不参与重复问题判断。

4. **读取 journal / metrics / git**
   - journal 用于补充历史决策、用户偏好和长期上下文。
   - metrics 用于补充 check 问题数、review 打回、测试失败和估算偏差趋势；如果 metrics.md 与 events.jsonl 冲突，以 events.jsonl 为机器事实，并在数据源状态中提示不一致。
   - git log 用于校验最近实际提交，避免只根据聊天状态汇报。

5. **合成规则**
   - 优先级：`tasks.md` 当前状态 > `roadmap.md` 模块状态 > `events.jsonl` 最近事件 > journal/metrics/git。
   - 同一任务多处状态冲突时，输出“数据不一致”并说明来源，不强行猜测。
   - 没有任何结构化文件时，也要基于 git log 和 journal 给出最小汇报。

## 事件读取与写入

`/standup` 必须读取 `.claude/workspace/events.jsonl`，用最近事件补充当前状态、阻塞项、下一步建议和重复问题。读取失败或文件不存在时，继续使用 TaskList、Git log、metrics、journal 生成汇报，并在输出中说明事件流缺失。

汇报生成后，`/standup` 也必须向 `.claude/workspace/events.jsonl` 追加 1 行 JSONL 事件，记录本次状态汇报已经生成。

### Metrics 聚合规则

`events.jsonl` 是 metrics 的机器事实来源，`metrics.md` 是人类可读摘要。`/standup` 必须优先从非 `/standup` 事件中聚合：

- 最近 5/10 次任务的平均 `checkIssueCount`。
- 最近 5/10 次任务的平均 `checkFixRounds`。
- 最近 5/10 次任务的 `specRejectCount` 总数。
- 最近 5/10 次任务的 `reviewRejectCount` 总数。
- 最近 5/10 次任务的 `testFailureCount` 总数。
- 最近 5/10 次任务的估算偏差：`(actualHours - estimateHours) / estimateHours`，只统计两个字段都有值且 `estimateHours > 0` 的事件。
- 按 `level` 分组展示 S/M/L/XL 的趋势；缺失 `level` 时归入 `unknown`。

聚合结果可以写入或更新 `.claude/workspace/metrics.md` 的摘要区，但不得回写旧 `events.jsonl` 事件。

### 流程改进建议规则

`/standup` 必须基于 metrics 聚合结果输出“重复问题/流程改进建议”，每条建议都要追溯到具体数据来源。建议格式为：

```text
[触发条件] → [数据来源：events.jsonl 最近 N 条 / metrics.md 摘要 / journal.md 决策] → [下次流程调整]
```

触发规则：

- `specRejectCount >= 3`：下次 `/dev` Phase 0 必须先输出更短的需求摘要、明确未决问题，并等待用户确认后再规划。数据必须可追溯到 `events.jsonl` 中最近 5/10 条任务事件。
- 平均 `checkIssueCount >= 5`：同类任务下次强制先写测试或最小复现，再进入实现。
- 平均 `checkFixRounds >= 2`：下次把 `/check` 前移到每个子任务完成后执行，避免最后集中修复。
- `reviewRejectCount >= 1`：同模块后续每个子任务后强制执行 `/check`，并在 `/review-all` 前列出自检结果。
- `testFailureCount >= 1`：要求补回归测试；如果不补，必须在 `tasks.md` 或 review/release report 中记录原因。
- 估算偏差绝对值 `>= 50%`：下次同级别任务需要拆小或更新 `estimateHours`，并说明偏差来自最近 5/10 次任务。

没有触发阈值时，输出“暂无明显重复问题”，但仍可给出一个低优先级观察项，例如最近样本量不足或数据缺失。

### 失败恢复聚合规则

`/standup` 必须从最近非 `/standup` 事件中读取可选对象 `failureRecovery`，并输出最近失败 Top N（默认 N=5）。每条失败记录至少展示：

#### 失败恢复记录契约（读取字段）

- `failureType`：`test_failure` / `ci_failure` / `pack_failure` / `hook_false_positive` / `release_failure`。
- `taskId` 或 `task`。
- `stage`、`symptom`、`rootCause`、`recoveryAction`、`attempts`、`finalStatus`。
- `evidence` 中的报告、日志或命令路径。
- `followUp` 中的后续动作。

重复失败建议规则：

- 同一 `failureType` 在最近 10 条非 `/standup` 事件中出现 `>= 2` 次：建议更新 project-preset 或对应流程规则。
- 同一 `rootCause` 出现 `>= 2` 次：建议补回归测试、hook 行为测试或 CI 检查。
- `finalStatus = blocked` 或 `needs_followup`：必须进入“阻塞项”和“下一步建议”。
- `hook_false_positive` 出现：建议记录误拦输入、调整 hook 规则，并补一个不会误拦的行为测试。
- `release_failure` 出现：建议关联 release report，确认回滚步骤和发布后验证是否需要更新。

### Next Best Action 契约

`/standup` 必须输出固定的 Next Best Action，告诉用户下一步应该做什么、为什么、是否需要人工确认。

```markdown
## Next Best Action
- action: [建议执行的命令或人工动作，如 /dev T3.2、/check、/review-all、/ship、解除阻塞]
- reason: [为什么现在应该做这一步，引用当前任务、阻塞项、最近事件、metrics 或 git 状态]
- requires human confirmation: yes / no
- source: [依据来源，如 tasks.md、roadmap.md、events.jsonl、metrics.md、git log]
```

写入规则：
- `下一步建议` 区块必须与 `Next Best Action.action` 保持一致或可直接追溯。
- 如果 `requires human confirmation: yes`，必须说明谁需要确认什么。
- 如果存在阻塞项，Next Best Action 优先指向解除阻塞；没有阻塞时指向最靠前的 ready/planned 任务。

### Today 轻量视图

`/standup` 输出必须包含 Today 轻量视图，放在详细状态前面，让用户 10 秒内知道现在该做什么。Today 视图只使用已有 artifact，不做 UI、不引入数据库。

字段规则：

- **今日焦点**：优先取 `tasks.md` 中最靠前的 `in_progress` / `ready` / `planned` 任务；没有任务时从 `roadmap.md` 或最近 `events.jsonl.next` 推断。
- **当前阻塞**：列出 `tasks.md`、`roadmap.md`、`failureRecovery.finalStatus` 或最近 failed/blocked 事件中的最高优先级阻塞；没有则写“无”。
- **最近 run**：引用最近一条非 `/standup` 事件，展示 `command`、`taskId`、`status`、关键 `checks` 和 `summary`。
- **下一步建议**：必须与 `Next Best Action.action` 一致或可直接追溯。
- **风险提示**：引用 metrics、失败恢复记录、release/report 风险或数据源 warning；没有则写“暂无明显风险”。

如果数据源缺失，Today 仍必须输出，并在对应字段标注“数据不足”，不要空着。

### Standup 输出版本

`/standup` 必须支持三种输出版本：开发者版、团队版、产品版。所有版本必须从同一组事实生成：`roadmap.md`、`tasks.md`、`.claude/workspace/events.jsonl`、review/release reports、metrics、journal 和 git。版本之间事实必须一致，只允许调整措辞、细节密度和排序。

选择规则：

- 默认输出开发者版。
- 用户说“团队版”“team”“给团队看”时，输出团队版。
- 用户说“产品版”“product”“给产品看”时，输出产品版。
- 用户明确要求多个版本时，可以在同一次回复中按“开发者版 / 团队版 / 产品版”分段输出。
- 如果版本意图不清，仍默认开发者版，并在数据源状态或输出标题中标注当前版本。

版本字段：

- **开发者版**：Today、当前任务、阻塞项、最近 run、checks/gates、下一条命令、数据源 warning。适合个人继续执行。
- **团队版**：团队摘要、项目健康度、已完成/进行中/阻塞、需要 owner 或人工确认的事项、风险、下一组团队动作。适合站会同步。
- **产品版**：产品进展、已交付/已完成的用户可见价值、范围变化与风险、发布就绪度、需要产品决策的问题、下一里程碑。适合面向产品或业务方。

版本约束：

- 同一任务的状态、阻塞原因、gate 结果和 Next Best Action 在不同版本中不得互相矛盾。
- 团队版和产品版可以省略底层命令细节，但不能隐藏 blocker、failed gate 或需要人工确认的事项。
- 产品版必须把技术任务翻译成用户价值或发布影响；无法判断用户价值时标注“数据不足”。
- 团队版必须突出 owner/确认人；无法从 artifact 判断 owner 时写“待确认”。

### events.jsonl 契约

每行是一个独立 JSON 对象，不允许跨行，不回写旧事件。

| 字段 | 必填 | 说明 |
|------|------|------|
| `time` | 是 | UTC ISO 8601 时间，如 `2026-07-09T10:00:00Z` |
| `command` | 是 | 固定为 `/standup` |
| `task` | 否 | 汇报聚焦的任务或模块；全局汇报为 `null` |
| `status` | 是 | `completed` / `failed` / `blocked` / `skipped` |
| `summary` | 是 | 一句话状态汇报摘要 |
| `checks` | 否 | 汇报读取的数据源状态，如 `{"events":"pass","git":"pass"}` |
| `artifacts` | 否 | 本次汇报引用或生成的关键文件路径数组 |
| `next` | 否 | 推荐下一步，或 `null` |

#### Metrics 扩展字段

`/standup` 自己的事件也可以写入 metrics 字段；通常 `specRejectCount`、`checkIssueCount`、`checkFixRounds`、`reviewRejectCount`、`testFailureCount` 为 `0`，`estimateHours` / `actualHours` 为 `null`。读取其他命令事件时必须识别：

- `taskId`
- `level`
- `specRejectCount`
- `checkIssueCount`
- `checkFixRounds`
- `reviewRejectCount`
- `testFailureCount`
- `estimateHours`
- `actualHours`

写入规则：
- 只在汇报收尾时追加 1 条最终事件，不记录中间步骤。
- 如果 `.claude/workspace/` 或 `events.jsonl` 不存在，创建它们。
- 路径使用仓库相对路径，不记录绝对路径、密钥、token 或敏感数据。
- 写入失败时在最终输出中说明，但不阻止状态汇报输出。

示例：

```json
{"time":"2026-07-09T10:30:00Z","command":"/standup","task":null,"taskId":null,"level":null,"status":"completed","summary":"已生成项目状态汇报，下一步建议执行 T0.2","checks":{"events":"pass","git":"pass","metrics":"pass","journal":"pass"},"specRejectCount":0,"checkIssueCount":0,"checkFixRounds":0,"reviewRejectCount":0,"testFailureCount":0,"estimateHours":null,"actualHours":null,"artifacts":[".claude/workspace/events.jsonl",".claude/workspace/metrics.md"],"next":"T0.2"}
```

## 输出格式

```markdown
# 项目状态汇报
日期：YYYY-MM-DD
输出版本：开发者版 / 团队版 / 产品版

## Today
- 今日焦点：[任务/模块/目标]
- 当前阻塞：[阻塞项或无]
- 最近 run：[command] [taskId] [status] - [summary/checks]
- 下一步建议：[必须匹配 Next Best Action.action]
- 风险提示：[风险、数据源 warning 或暂无明显风险]

## 数据源状态
| 数据源 | 状态 | 说明 |
|--------|------|------|
| roadmap.md | found/missing/warning | [摘要] |
| tasks.md | found/missing/warning | [摘要] |
| events.jsonl | found/missing/warning | [摘要] |
| journal.md | found/missing/warning | [摘要] |
| metrics.md | found/missing/warning | [摘要] |
| git log | found/missing/warning | [摘要] |

## 已完成 ✅
- [任务] - [简要描述]

## 进行中 🔄
- [任务] - [当前状态]

## 阻塞项 🚫
- [问题] - [需要什么来解决]

## 下一步建议 📋
- [建议动作] - [为什么现在做它] - [需要人工确认？是/否]

## 整体进度
- 总任务：X | 完成：X（X%）| 进行中：X | 阻塞：X

## 重复问题/流程改进建议
- [触发条件] → [数据来源：events.jsonl 最近 N 条 / metrics.md 摘要 / journal.md 决策] → [流程改进建议]
- 无明显重复问题时输出：暂无明显重复问题。

## 最近失败 Top N
| 时间 | 任务 | 类型 | 阶段 | 现象 | 恢复动作 | 最终状态 | 证据 |
|------|------|------|------|------|----------|----------|------|
| [time] | [taskId] | [failureType] | [stage] | [symptom] | [recoveryAction] | [finalStatus] | [evidence] |

## 重复失败建议
- [failureType/rootCause] → [数据来源：failureRecovery 最近 N 条] → [建议更新的测试、hook、CI、release 或 project-preset 规则]
- 无重复失败时输出：暂无重复失败。

---

## 团队效能分析

### 最近 5 次任务

| 日期 | 功能 | 级别 | spec 否决 | check 问题 | check 轮数 | review 打回 | 测试失败 | 预估偏差 |
|------|------|------|-----------|------------|------------|-------------|----------|----------|
| 06-17 | 用户登录 | L | 0 | 2 | 1 | 0 | 0 | -12% |
| 06-16 | 文件上传 | M | 1 | 5 | 2 | 1 | 1 | +80% |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

### 指标趋势

| 指标 | 最近平均 | 健康值 | 状态 | 趋势 |
|------|----------|--------|------|------|
| spec 否决轮数 | X 轮 | 0-1 轮 | ✅/⚠️ | ↑/↓/→ |
| /check 首次问题数 | X 个 | 0-2 个 | ✅/⚠️ | ↑/↓/→ |
| /check 修复轮数 | X 轮 | 1 轮 | ✅/⚠️ | ↑/↓/→ |
| /review-all 打回次数 | X 次 | 0 次 | ✅/⚠️ | ↑/↓/→ |
| 测试失败次数 | X 次 | 0 次 | ✅/⚠️ | ↑/↓/→ |
| 预估偏差 | X% | < 50% | ✅/⚠️ | ↑/↓/→ |

### 瓶颈诊断

（基于数据自动判断，只在有明显趋势时输出）

- ⚠️ **[瓶颈描述]** → [改进建议]
- 例：spec 否决轮数持续偏高 → Architect-Planner 需求理解能力不足 → 建议改进 Phase 0 需求确认流程
```

## 使用方式
```
/standup
```
