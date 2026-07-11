# /dev - 开发流程

一句话需求进，可运行代码出。你只管确认，AI 管流程。

> **若项目根目录有 `roadmap.md`**（由 `/plan` 生成）且你指定了某模块（如"做模块 M3"或"做向量检索模块"）：
> 先读 roadmap.md，复用该模块的描述、依赖、复杂度，跳过产品级提问（仍可问实现细节）。
> 依赖模块未完成时先提醒；模块开始时更新为 `in_progress`；模块完成后把 roadmap.md 中的模块状态更新为 `done`、刷新最近更新日期，并在进度区打勾。

## roadmap.md 模块状态联动

当用户说 `/dev 做模块 M3`、`/dev 做向量检索模块` 或类似表达时，AI 必须把 `roadmap.md` 作为产品模块状态源：

1. 读取 `roadmap.md` 的功能模块表，定位模块 ID、状态、描述、复杂度、依赖、验收标准、风险、最近更新。
2. 检查依赖模块是否为 `done` 或 `shipped`；依赖未满足时先提醒用户，不直接开工。
3. 存在 Controlled Delivery Contract 时，先运行 `delivery preflight`；只有 `pass` 后才能把目标模块状态更新为 `in_progress`，刷新最近更新日期为当天。
4. 开发中复用 roadmap 的模块描述、复杂度和验收标准，不重新询问产品级问题。
5. 模块完成后把状态更新为 `done`，刷新最近更新日期，并在 `## 进度` 区把对应模块打勾。
6. 如果模块被发布流程确认上线，可由 `/ship` 或后续维护把状态从 `done` 更新为 `shipped`。
7. 如果遇到阻塞，把状态更新为 `blocked`，在风险或未决区记录阻塞原因，并在 Summary 的 `next action` 中说明需要谁确认什么。

`roadmap.md` 的模块状态使用：`planned` / `in_progress` / `blocked` / `done` / `shipped`。

## Architecture Context

对 L/XL 模块，存在根目录 `architecture.md` 时，必须在 Product Brief、Product Model 和 roadmap 后读取它，再生成 spec/tasks 或开始实现：

- 从 roadmap 取得 Architecture Component ID，并确认本次变更支撑的 Capability ID、Journey ID 和用户结果。
- 检查依赖方向、跨组件接口、安全边界、迁移和兼容影响；不得通过 status、Workbench 或 legacy 视图绕过上游事实。
- 如果变更会改变组件职责、跨组件接口、安全边界、兼容策略或迁移路径，必须在架构预分析后按固定格式输出 Owner Decision Brief，并给出推荐；不得只用普通建议或“需要 Owner 决策”一句话代替。普通局部实现无需阻塞。
- feature spec 必须记录 Architecture Component ID、受影响组件、依赖方向和验证方式；N4 再统一引用格式和自动校验。

没有 `architecture.md` 的旧项目可以按现有流程继续；不要为了补文档而阻塞低风险修复。

## Planning Artifact Context

对存在 `.claude/workspace/planning/artifact-contract.md` 的项目，M/L/XL 开工前必须在 Architecture 后读取它：

- roadmap 是模块状态源，feature `tasks.md` 是当前执行状态源，events/review/release 是证据；不得用其中一个覆盖另一个。
- feature spec 必须使用合同的最小头部：Module、Capability、Journey、Architecture Component、Affected Components、Dependency Direction、Security Impact 和 Operational Impact。
- 创建或变更 roadmap/spec/tasks 后运行 `node create-claude-team/cli.js planning validate`；失败时修复具体 artifact 引用，不以跳过校验或写入备用状态文件绕过。
- `create-claude-team status` 与 Workbench 只投影该读取链；legacy docs 仅在 vNext artifact 缺失时回退读取。

## Controlled Delivery Contract

存在 `.claude/workspace/planning/delivery-contract.md` 时，M/L/XL 开工前必须运行：

```text
node create-claude-team/cli.js delivery preflight <module> --task <task-id>
```

- 只有 `pass` 才能将 task 写为 `in_progress`；使用 `delivery transition <module> <task-id> in_progress` 确认迁移合法。
- `needs_revision` 时先修复命令列出的 spec/tasks/安全缺口；`blocked` 时先完成依赖或解除上游阻塞。两种结果都不得开始实现。
- 该 CLI 只读 planning artifacts；roadmap 和 tasks 的写入责任不变，events/review/release/status/Workbench 不得作为替代依据。
- S 级热修可跳过；安全敏感变更必须有 `Security Risk Level：high` 和 `Threat Model`，但完整上线安全与运行保障仍由 N7/`/ship` 负责。

## Change Impact Contract

存在 `.claude/workspace/planning/change-impact-contract.md` 时，来自体验反馈、已有功能调整、跨模块行为变化或架构/安全/运行影响的开发请求，必须先运行 `change analyze <module> --kind <kind>`，并创建和验证 Change Impact Brief：

```text
node create-claude-team/cli.js change validate .claude/workspace/changes/<brief>.md
node create-claude-team/cli.js delivery preflight <module> --task <task-id> --change .claude/workspace/changes/<brief>.md
```

- AI 先说明主归属、影响范围、同步项和验证方式；Brief 的引用与同步项必须通过 validate，才可修改代码或规划 artifact。
- S 级局部修复可跳过；不要为普通新功能虚构 Brief。架构、安全、兼容、迁移和产品范围变化仍按 ADR/Owner Decision Brief/N7 升级。
- 实现后更新 Brief 的同步项和验证证据；`/review-all` 检查它与实际 diff 是否一致。

## Owner Decision Brief 契约

`/dev` 默认由团队推进实现，不把每个技术细节都交给 Owner。L/XL 级任务必须检查是否需要 Owner Decision Brief；S/M 级只有命中高影响触发条件时才使用。

必须触发 Owner Decision Brief 的情况：

- 产品方向、MVP 范围或验收标准会被当前实现改变。
- 成本、隐私、安全、合规、发布风险会影响方案选择或上线判断。
- 架构选择会造成长期约束、迁移成本或明显锁定。
- 任务计划看起来能做完，但做完后可能不是 Owner 想要的结果。

不要为普通实现细节、局部代码风格、低风险库内重构打断 Owner。Product Lead 和 Architect-Planner 应先给推荐方案，再让 Owner 决策。

固定输出格式：

```markdown
## Owner Decision Brief
- Decision: [what needs a choice]
- Context: [why this matters now]
- Recommendation: [default option and reason]
- Options:
  - A: [option] - [trade-off]
  - B: [option] - [trade-off]
  - C: [optional] - [trade-off]
- If no reply: [safe default or pause]
```

## Spec/Task Quality Gate

M/L/XL 开工前必须先过 Spec/Task Quality Gate。这个 gate 不是让 Owner 审技术细节，而是防止 Builder 认真执行一份没价值、看不懂或已经偏离 Owner 意图的 tasks。

开工前必须先用人话说明：

```text
这轮我建议先做 [功能/模块]。它有用是因为 [产品价值/风险/roadmap 原因]。本轮只做到 [范围]，暂时不碰 [明确不做]。做完后，你应该能看到 [可感知结果]；我会用 [验收方式] 验证。当前不需要你拍板 / 需要你在 [决策点] 上拍板。
```

Gate 分工：

- Product Lead 判断 product value、Owner fit、MVP/roadmap 对齐。
- Architect-Planner 判断技术方案、依赖顺序、任务粒度和验收命令。
- Delivery Steward 判断 spec/tasks 是否可读、状态化、无重复、不制造文档漂移。

Gate 结果只能是：`pass` / `needs_revision` / `blocked`。

- `pass`：Builder 可以开工。
- `needs_revision`：回到 Product Lead + Architect-Planner 修订，Builder 不得开工。
- `blocked`：说明阻塞原因和下一步确认人，Builder 不得开工。

S 级热修跳过该 gate；M 级使用轻量版本，但仍要让 Owner 能看懂做什么、为什么、怎么验收。

## tasks.md 执行状态源

M/L/XL 级任务必须维护 `tasks.md`，它是执行计划和 gate 状态源。每个任务条目至少包含：

- **任务 ID**：如 `T1.3`、`M3.2`；M 级可使用 `M-1`、`M-2` 这类轻量编号。
- **状态**：见下方状态机。
- **描述**：该任务要完成什么。
- **验收标准**：用户可判断完成的结果。
- **验收命令**：如 `npm run validate`、`npm test`、`/check`、`/review-all`、`/ship --dry-run`。
- **阻塞原因**：无阻塞时写 `无`；阻塞时写清谁需要确认什么。
- **Gate 结果**：记录 local/review/release gate 的最新结果。
- **产物**：关键文件、报告或模块路径。
- **最近更新**：YYYY-MM-DD。

### tasks.md 状态机

状态只能使用：

- `ready`：信息足够，可以进入计划。
- `needs_clarification`：需求或约束不足，等待用户补充。
- `planned`：已拆解并排期，尚未开工。
- `in_progress`：正在实现。
- `local_gate`：实现完成，等待或正在执行本地验证与 `/check`。
- `review_gate`：本地验证通过，等待或正在执行 `/review-all`。
- `release_gate`：审查通过，等待或正在执行 `/ship`。
- `blocked`：被需求、依赖、测试、审查或发布问题阻塞。
- `shipped`：已发布或发布检查确认上线。
- `done`：无需发布的任务已完成并提交。

推荐流转：

```text
ready → planned → in_progress → local_gate → review_gate → release_gate → shipped
                         ↘ done（无需发布）
任意状态 → needs_clarification / blocked
blocked → planned / in_progress（阻塞解除后）
```

### /dev 对 tasks.md 的更新责任

- 创建或更新任务计划时，将可执行任务标为 `planned`；信息不足标为 `needs_clarification`。
- 开始实现任务时，将状态改为 `in_progress`。
- 实现完成并准备本地验证时，将状态改为 `local_gate`，写入验收命令。
- 本地验证和 `/check` 通过后，将 local gate 结果记为 `pass`；需要审查的任务进入 `review_gate`，无需审查/发布的 S/M 小任务可进入 `done`。
- 任一检查失败且 2 轮自动修复仍失败时，将状态改为 `blocked`，写清阻塞原因和下一步确认人。
- 每次状态变化都刷新最近更新日期。

### /dev 写入边界

`/dev` 只负责当前迭代的最小事实写入，避免同时承担所有状态、metrics、git 和 report 维护：

- 只更新当前 task/module 的执行状态、Gate 结果、阻塞原因、产物和最近更新日期。
- 只在收尾时追加 1 条最终 `events.jsonl` 事件，不回写旧事件，不生成额外派生状态。
- 不得默认执行 `git commit`；只有用户明确要求提交、或当前项目的显式 ship/commit 流程要求提交时，才执行 git stage/commit。
- metrics 由 events 聚合工具或 `/standup` 从 `events.jsonl` 生成，`/dev` 不再手写 `.claude/workspace/metrics.md` 摘要。
- review report、release report、cleanup report 分别由 `/review-all`、`/ship` 和 Delivery Steward 负责，`/dev` 只引用这些产物路径。

### 产品验收视角

产品功能完成时，`/dev` 必须说明用户主流程是否真的可用，而不只说明代码是否通过测试：

- L/XL 任务的 spec/tasks 必须包含 acceptance 场景，写清目标用户、入口、主流程、成功结果和可观察证据。
- M 级用户可见功能至少在 Summary 中说明用户能看到或完成什么；纯内部任务可说明“不涉及用户主流程”。
- Reviewer 检查 acceptance 风险，尤其是“代码做了但用户流程不连贯、不可验证或不好用”的问题。
- UI 任务由 Designer 检查体验、视觉和交互；Reviewer 只审代码质量、无障碍和 acceptance 风险，不重复审视觉。

## 流程

### Phase 0: 需求确认（所有级别）

在写任何代码之前，AI 必须先理解你要什么。

**AI 问你 3 个问题**（可以一次性回答，也可以分开答）：

1. **这个功能解决什么问题？** — 理解业务目的，不只是技术实现
2. **有没有技术限制？** — 第三方服务、现有接口、性能要求、兼容性
3. **做到什么程度算完成？** — 验收标准，越具体越好

**确认方式**：
- AI 输出一句话摘要："你要做的是：[摘要]，验收标准是：[标准]，技术约束是：[约束]"
- 你说"确认" → 进入 Phase 1
- 你说"不对" → AI 重新理解，最多 3 轮
- 3 轮还不清楚 → AI 说"我需要更多信息才能开始"，暂停等你补充

**S 级例外**：1-10 行的修复（typo、配置值、样式微调），跳过提问，直接做。

---

### Phase 1: 复杂度判断 + 规划

**判断标准**：

| 级别 | 定义 | 规划动作 |
|------|------|----------|
| **S** | 1-10 行修复，单文件 | 不规划，直接跳 Phase 2 |
| **M** | 单模块，1-2 文件 | 创建或更新轻量 `tasks.md` checklist（1-3 个任务），你确认后开始 |
| **L** | 跨模块，3-10 文件 | 输出 spec.md + tasks.md，你确认后开始 |
| **XL** | 新系统，10+ 文件 | 先 Spike 调研可行性 → 输出 spec.md + tasks.md + architecture.md，你确认后开始 |

**Spike 退出标准**（仅 XL 级）：
- 技术方案可行 → 输出调研结论，进入规划
- 存在重大障碍（第三方 API 不支持、性能无法达标等） → 告诉你"这个做不了，原因是 X，建议替代方案 Y"
- 信息不足 → 列出需要你确认的点，等你回复

**用户不确认时**：
- 如果你说"方案不对" → AI 根据你的反馈调整，重新输出方案
- 如果你说"先不做" → 流程结束，不消耗资源
- 最多调整 3 轮，3 轮后仍不确认 → AI 说"我们对需求的理解还有分歧，建议先讨论清楚"

---

### Phase 2: 迭代开发

#### S 级流程（最简单）

```
1. Builder 直接修复
2. /check 快检（逻辑 + 类型 + 边界）
3. 有问题 → 自动修 → 重新检查
4. 没问题 → 追加最终 event → 完成
```

#### M 级流程

```
1. 生成或更新轻量 tasks.md checklist
   → 每项包含任务 ID、状态、描述、验收标准、验收命令、Gate 结果、阻塞原因、最近更新
2. 你确认 checklist
3. Builder 按 tasks.md 实现（TDD）
   → 开始时把任务状态更新为 in_progress
4. /check 快检
   → 开始本地验证时把任务状态更新为 local_gate
5. 有问题 → 自动修 → 重新检查（最多 2 轮）
6. 2 轮后仍有问题 → 标记 blocked，记录阻塞原因，等你决定
7. 全部通过 → 记录 local gate pass，状态更新为 done，追加最终 event → 完成
```

#### L/XL 级流程（完整迭代）

```
for 每个任务 in tasks.md:
  1. Builder 实现（TDD：先写测试 → 写代码 → 重构）
     → 先执行 `delivery preflight` 和 `delivery transition ... in_progress`，再把任务状态更新为 in_progress
  2. /check 快检（每个任务完成后立即执行）
     → 开始本地验证时把任务状态更新为 local_gate
     → 有问题：自动修 → 重新检查（最多 2 轮）
     → 2 轮不过：标记 blocked，记录阻塞原因，等你决定
     → 没问题：记录 local gate pass，进入 review_gate 或继续
  3. 如用户明确要求提交，或当前项目显式 commit/ship 流程要求提交，再执行 git stage/commit

所有任务完成后:
  4. /review-all 跨文件审查（单文件质量由 code-review skill 逐文件覆盖）
     → 通过：进入 Phase 3
     → 不通过：按 review report 委托 `/fix` 或 `/dev` 修复后重新审查
     → 仍不过或阻塞：列出所有问题和下一步确认项等你决定
```

---

### Phase 3: 验收

```
1. 运行所有测试 → 全部通过？
2. 类型检查 tsc --noEmit → 无错误？
3. Lint 检查 → 无错误？
4. Git 状态检查 → 清楚列出本轮改动和已有无关改动？
5. 产品验收检查 → 用户主流程或“不涉及用户主流程”的说明是否成立？

全部通过 → 输出"开发完成"
有失败 → 自动修 → 重新验收（最多 2 轮）
2 轮后仍有失败 → 列出失败项等你决定
```

### Phase 4: 记录事件与指标字段（自动）

```
1. 收集本次任务的结构化指标字段：
   - spec 否决轮数（Phase 1 中用户否决了几次方案）
   - /check 首次问题数（第一次快检发现多少问题）
   - /check 修复轮数（快检修了几轮才通过）
   - 测试失败次数（Phase 3 中测试不通过的次数）
   - /review-all 打回次数（审查不通过的次数）
   - 预估偏差（实际耗时 vs 预估）

2. 只把这些字段写入最终 `events.jsonl` 事件。

3. metrics 由 events 聚合工具或 `/standup` 从 `events.jsonl` 生成；`metrics.md` 是人类可读摘要，不由 `/dev` 手写维护。

4. 如果指标触发警告值，自动提醒：
   - spec 否决 3 轮 → "需求理解有偏差，建议改进 Phase 0"
   - /check 首次问题 5+ → "代码质量不够，建议加强 TDD"
   - /review-all 打回 1+ 次 → "自检不足，建议每个任务后强制 /check"

5. 输出执行摘要：
   ✅ 开发完成
   📊 指标：spec 0 轮 | check 2 个问题，1 轮修复 | 审查通过 | 测试通过
   ⏱️ 耗时：预估 4h / 实际 3.5h（-12%）

## Summary
- status: completed
- affected files/modules: [本次新增、修改或重点影响的文件/模块]
- checks: test pass / typecheck pass / lint pass / review pass
- next action: [下一步任务、阻塞决策或发布建议]
```

### Phase 4.5: 输出标准结果摘要（自动）

`/dev` 完成后必须输出固定的 `Summary` 块，供用户阅读，并作为 `events.jsonl` 的字段来源。

```markdown
## Summary
- status: completed / failed / blocked / skipped
- affected files/modules: [本次新增、修改或重点影响的文件/模块]
- checks: [测试、类型检查、lint、/check、/review-all 的最终结果]
- next action: [下一步任务、阻塞决策或发布建议]
```

映射规则：
- `events.jsonl.summary` 使用 `status` + 一句话结果，例如 `completed: 完成 T0.2 标准结果摘要契约`。
- `events.jsonl.artifacts` 使用 `affected files/modules` 中的文件路径；模块名只保留在 `summary`。
- `events.jsonl.checks` 使用 `checks` 的结构化结果。
- `events.jsonl.next` 使用 `next action`。

### Next Best Action 契约

`/dev` 完成或阻塞时必须输出固定的 Next Best Action，告诉用户下一步应该做什么、为什么、是否需要人工确认。

```markdown
## Next Best Action
- action: [建议执行的命令或人工动作，如 /check、/review-all、/ship、继续 T3.2、等待用户确认]
- reason: [为什么现在应该做这一步，引用任务状态、gate 结果、风险或 metrics]
- requires human confirmation: yes / no
- source: [依据来源，如 tasks.md、roadmap.md、events.jsonl、review report、release report、git diff]
```

写入规则：
- `Summary.next action` 必须与 `Next Best Action.action` 保持一致或可直接追溯。
- 如果 `requires human confirmation: yes`，必须说明谁需要确认什么。
- 如果任务 `blocked`，Next Best Action 必须指向解除阻塞所需的最小动作。

### Phase 5: 追加事件（自动）

开发流程结束时，必须向 `.claude/workspace/events.jsonl` 追加 1 行 JSONL 事件，作为 `/standup` 和后续 metrics 的机器可读事实来源。

#### events.jsonl 契约

每行是一个独立 JSON 对象，不允许跨行，不回写旧事件。

| 字段 | 必填 | 说明 |
|------|------|------|
| `time` | 是 | UTC ISO 8601 时间，如 `2026-07-09T10:00:00Z` |
| `command` | 是 | 固定为 `/dev` |
| `task` | 否 | 任务或模块 ID，如 `T0.1`、`M1`；没有则为 `null` |
| `status` | 是 | `completed` / `failed` / `blocked` / `skipped` |
| `summary` | 是 | 一句话结果摘要，供人类和 `/standup` 直接引用 |
| `checks` | 否 | 本次执行的检查结果对象，如 `{"test":"pass","review":"pass"}` |
| `artifacts` | 否 | 本次创建或更新的关键文件路径数组 |
| `next` | 否 | 下一步建议、下一个任务 ID，或 `null` |

#### Metrics 扩展字段

`events.jsonl` 同时是结构化 metrics 的机器事实来源。`/dev` 收尾事件应尽量写入这些可选字段；未知时用 `null`，计数无发生时用 `0`：

| 字段 | 说明 |
|------|------|
| `taskId` | 标准任务或模块 ID；优先等于 `task`，如 `T2.1`、`M3` |
| `level` | 任务级别：`S` / `M` / `L` / `XL` |
| `specRejectCount` | Phase 1 中用户否决方案或 spec 的次数 |
| `checkIssueCount` | 首次 `/check` 或本地快检发现的问题数 |
| `checkFixRounds` | `/check` 或本地快检自动修复轮数 |
| `reviewRejectCount` | `/review-all` 打回次数 |
| `testFailureCount` | 测试失败次数 |
| `estimateHours` | 预估工时；没有估算则为 `null` |
| `actualHours` | 实际耗时；没有记录则为 `null` |

#### 失败恢复记录契约

当 `/dev` 遇到测试失败、CI 失败、pack 失败、hook 误拦或发布失败，并且本次流程进行了自动修复、重试、回滚或最终阻塞时，收尾事件必须写入可选对象 `failureRecovery`。无失败发生时省略该对象。

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
- 只在命令收尾时追加 1 条最终事件，不记录中间步骤。
- 如果 `.claude/workspace/` 或 `events.jsonl` 不存在，创建它们。
- 路径使用仓库相对路径，不记录绝对路径、密钥、token 或敏感数据。
- 写入失败时在最终输出中说明，但不因为事件写入失败而改变代码任务结论。

示例：

```json
{"time":"2026-07-09T10:00:00Z","command":"/dev","task":"T0.2","taskId":"T0.2","level":"M","status":"completed","summary":"completed: 完成标准结果摘要契约","checks":{"validate":"pass","test":"pass","review":"pass"},"specRejectCount":0,"checkIssueCount":0,"checkFixRounds":0,"reviewRejectCount":0,"testFailureCount":0,"estimateHours":null,"actualHours":null,"artifacts":[".agents/commands/dev.md",".agents/commands/check.md"],"next":"T0.3"}
```

---

## 异常路径速查

| 场景 | 处理方式 |
|------|----------|
| 测试一直失败 | 自动修 2 轮 → 仍失败 → 列出失败原因等你决定 |
| 类型检查不通过 | 自动修 → 重新检查 |
| 审查打回 | 按 review report 委托修复 → 重新审查 |
| 你否决了方案 | 根据反馈调整 → 重新输出方案（最多 3 轮） |
| 你否决了 3 次 | 暂停，建议先讨论清楚需求 |
| Spike 发现不可行 | 告诉你原因 + 替代方案 |
| 需求中途变了 | 停止当前迭代，重新评估影响范围，调整 tasks.md |
| 发现方向错了 | 停止，告诉你当前状态 + 建议的回退点，你决定是否回退 |

---

## Git 操作规范

- **分支**：`feature/[功能名]` 或 `fix/[问题描述]`
- **提交频率**：每完成一个逻辑单元就提交，不要攒到最后
- **Commit message**：遵循 `.agents/rules/git.md` 的格式
- **合并前**：确保 /review-all 通过

---

## 粒度速查

| 你的情况 | 用什么 |
|----------|--------|
| 想做新功能 | `/dev 做一个用户登录功能` |
| 写完一个文件想快检 | `/check` |
| 发现一个具体问题想修 | `/fix src/auth/login.ts 里的密码验证逻辑不对` |
| 写完了想全面检查 | `/review-all src/features/auth/` |
| 想修但不知道问题在哪 | `/check` 快检找问题，或 `/review-all` 全面审查 |
| 想看进度 | `/standup` |

---

## 使用示例

```
# 完整功能开发
/dev 做一个用户注册登录功能

# 小修复
/dev 修复登录页面输入空密码时没有提示的问题

# 中等功能
/dev 给用户列表加一个搜索框，支持按姓名和邮箱搜索

# 大功能
/dev 重构认证模块，支持 JWT + OAuth2 两种方式

# 需求不清楚时，AI 会先问你
/dev 做一个管理后台
# AI: "这个管理后台包含哪些页面？需要什么角色权限？"
```
