# /review-all - 跨文件联合审查

合并前/上线前的全面审查。聚焦**文件之间的关系**，单文件质量由 code-review skill 负责。

## 和 /check、code-review 的关系

| 组件 | 职责 | 范围 | 耗时 |
|------|------|------|------|
| **/check** | 快速查错 | 当前变更的文件，3 个维度 | < 1 分钟 |
| **code-review skill** | 单文件深度审查 | 1 个文件，6 个维度 | 逐文件 |
| **/review-all** | 跨文件分析 + acceptance 风险 | 分支级，文件间关系和用户主流程 | 3-5 分钟 |

/review-all 不重复做 /check 和 code-review 的事，只做它们做不了的。它默认是审查和报告命令，不是修复命令；发现问题后优先输出 review report 和下一步修复任务，修复委托 `/fix` 或 `/dev` 执行。

## Review 定位与修复边界

- `/review-all` 负责判断当前变更是否可以合并、是否需要修复、是否被阻塞，并产出 `.claude/workspace/reviews/` 下的审查报告。
- 结论只能使用 `pass` / `needs_fix` / `blocked`。
- 自动修复只允许 tiny obvious fixes，例如文档中的明显错别字、格式损坏、测试快照中的机械更新；凡是会改变业务逻辑、接口契约、数据迁移、安全策略、产品验收或架构边界的问题，都必须交给 `/fix` 或 `/dev`。
- 当结论为 `needs_fix` 时，报告必须列出建议的 `/fix` 或 `/dev` 命令、修复范围和验收命令。
- 当结论为 `blocked` 时，报告必须说明阻塞原因、需要谁确认什么，以及最小解除阻塞动作。

## 审查范围

**不带参数**：审查当前分支相对于 main 的所有变更
```
/review-all
# 等价于审查 git diff main...HEAD 中的所有文件
```

**指定路径**：审查指定文件或目录
```
/review-all src/features/auth/
```

**系统健康审查**：不只看当前 diff，而是检查项目长期演化是否变形
```
/review-all --system
/review-all --system src/features/auth/
```

`--system` 用于防止多轮小改之后项目变成“能跑但形状怪”的状态。它不替代默认 diff review，而是在里程碑、发布前或架构风险出现时触发。

### 何时必须做 system health review

- XL 任务完成后。
- 一个 roadmap MVP 最小集完成后。
- 发布前如果本轮改动跨 3 个以上模块。
- 同一模块连续 3 次被改动但没有做过全局审查。
- `/standup` 或 Delivery Steward 发现状态源、文档、模块边界或测试策略冲突。
- 用户明确担心“项目变形”“架构怪”“越改越乱”。

## 审查流程

```
1. 确定变更范围
   - git diff main...HEAD → 获取变更文件列表
   - 识别变更类型（新功能/修复/重构）

2. Phase 1: /check 快检（单文件级）
   - 对每个变更文件跑 /check 逻辑（正确性 + 类型 + 边界）
   - 发现问题 → 记录，不在此修复（留给后续修复委托）

3. Phase 2: 跨文件分析（本命令核心）
   - 变更完整性检查
   - 跨文件一致性检查
   - 历史回归检查
   - acceptance 风险检查：是否存在“代码做了但用户流程不连贯、不可验证或不好用”的问题

4. Phase 3: 整体评估
   - 架构层面：变更是否引入新的技术债
   - 产品层面：用户主流程是否可完成，验收证据是否足够
   - 设计层面：仅确认 UI 任务是否已触发 Designer；视觉体验由 Designer 检查，不由 Reviewer 重复审

5. 输出报告
   - 按严重程度分类
   - 每个问题附带修复代码

6. 修复委托（有问题时）
   - tiny obvious fixes → 可当场修复并记录
   - 其他问题 → 不在 /review-all 中修，输出 needs_fix 并委托 /fix 或 /dev
   - P0/P1、安全、架构、产品验收问题 → 不自动修，直接输出 blocked 或 needs_fix
   - 修复完成后由用户或后续流程重新运行 /review-all
```

## System Health Review 流程

`/review-all --system` 由 Reviewer 主导，Architect-Planner 和 Delivery Steward 按需参与。它的目标不是找当前 diff 的小 bug，而是判断项目是否仍然像一个健康产品和健康代码库。

```
1. 确定审查范围
   - 默认全仓库；指定路径时只审该模块及其边界
   - 读取 project-preset、roadmap、spec/tasks、architecture/ADR、review/release reports

2. 架构形状检查
   - `architecture.md` 的 Architecture Component ID、依赖方向、安全边界和兼容规则是否被 roadmap/spec 正确引用
   - 模块边界是否清晰
   - 依赖方向是否稳定
   - 是否出现循环依赖、万能模块、重复抽象、临时兼容层堆积
   - 代码是否仍符合 project-preset 和 architecture 决策

3. 产品与验收检查
   - 已实现功能是否仍服务 Product Brief 和 roadmap
   - MVP 是否被无意识扩大
   - 用户主流程是否完整、连贯、可验证
   - 是否存在“代码完成但产品不可用”的缺口

4. 一致性和熵检查
   - 同类 API、错误处理、状态命名、UI 交互是否一致
   - 测试策略是否随功能增长而同步
   - 文档是否重复、过期或互相矛盾
   - TODO、临时方案、dead code 是否开始积累

5. 输出系统健康报告
   - 结论：healthy / needs_refactor / blocked
   - 必须修复的结构问题
   - 可延后但要进入 tasks/roadmap 的债务
   - 建议合并、归档、删除的文档
   - 下一步：继续开发、先重构、补测试、清文档或请求 Owner 决策
```

system health review 默认不直接修改代码。它可以生成修复任务、清理建议或 Owner Decision Brief。只有 tiny obvious fixes 才允许当场修。

## tasks.md 状态更新

如果仓库存在 `tasks.md`，或用户指定了任务/模块 ID，`/review-all` 必须把它作为执行状态源同步更新：

- 开始审查时，将对应任务状态更新为 `review_gate`，并刷新最近更新日期。
- 审查通过时，记录 `Gate 结果.review = pass`，写入审查范围、问题数、修复轮次和报告路径（如有）。
- 更新时不要删除任务条目的验收标准、验收命令、阻塞原因、Gate 结果和产物字段。
- 审查通过且任务需要发布时，将状态推进到 `release_gate`；无需发布的任务可推进到 `done`。
- 只有 tiny obvious fixes 被当场修复且重审通过时，记录 review gate 为 `pass`，并写明自动修复项。
- 存在必须修复但未阻塞决策的问题时，将状态保持或更新为 `review_gate`，记录 `Gate 结果.review = needs_fix`，并写明委托的 `/fix` 或 `/dev`。
- 存在阻塞问题或需要用户决策时，将状态更新为 `blocked`，写明阻塞原因和下一步确认人。

`tasks.md` 状态必须使用：`ready` / `needs_clarification` / `planned` / `in_progress` / `local_gate` / `review_gate` / `release_gate` / `blocked` / `shipped` / `done`。

## Review Report 契约

`/review-all` 必须产出可沉淀的审查报告，路径为：

```text
.claude/workspace/reviews/YYYY-MM-DD-<scope>.md
```

命名规则：

- `<scope>` 使用任务 ID、模块 ID、目录名或分支名的短横线形式，如 `t1.4`、`auth`、`feature-user-auth`。
- 如果 `.claude/workspace/reviews/` 不存在，先创建目录。
- 报告路径必须写入 Summary 的 `affected files/modules`，并写入 `events.jsonl.artifacts`。

报告必须包含以下字段：

- **结论**：`pass` / `needs_fix` / `blocked`，并给一句话原因。
- **关联任务**：任务 ID、模块 ID 或审查范围；没有则写 `无`。
- **变更范围**：分支、对比基准、文件/目录范围、关键模块。
- **问题列表**：每个问题包含文件、位置、说明、建议修复。
- **严重度**：`critical` / `major` / `minor` / `suggestion`。
- **自动修复项**：仅记录 tiny obvious fixes 的文件、原因和修复轮次。
- **委托修复**：当结论为 `needs_fix` 时，写明建议执行的 `/fix` 或 `/dev` 命令、修复范围和验收命令。
- **剩余风险**：尚未修复或需要人工接受的风险。
- **Gate 结果**：review gate 的 pass/fail、问题计数、修复轮次。
- **系统健康**：当使用 `--system` 时，记录架构形状、产品验收、一致性、文档熵和建议清理项。
- **Acceptance 风险**：记录用户主流程是否完整、验收证据是否可追溯，以及是否存在“做了但不好用”的风险；UI 体验问题引用 Designer 审查结论。
- **Artifact Cleanup**：当发现文档重复、过期、路径漂移或 source-of-truth 冲突时，记录建议合并、归档、删除的文件；高影响删除必须请求 Owner Decision Brief。
- **下一步**：进入 `/ship`、继续修复、等待用户确认或阻塞处理。

## 标准结果摘要

`/review-all` 完成后必须输出固定的 `Summary` 块，供用户阅读，并作为 `events.jsonl` 的字段来源。

```markdown
## Summary
- status: completed / failed / blocked / skipped
- affected files/modules: [本次审查范围、报告路径和 tiny obvious fixes 文件]
- checks: [/check、跨文件审查、严重/中等/轻微问题数、修复轮次]
- next action: [可以合并、进入 /ship、继续修复或等待用户决策]
```

映射规则：
- `events.jsonl.summary` 使用 `status` + 一句话审查结论，例如 `completed: 跨文件审查通过，无阻塞问题`。
- `events.jsonl.artifacts` 使用 `affected files/modules` 中的文件路径，必须包含 `.claude/workspace/reviews/YYYY-MM-DD-<scope>.md`。
- `events.jsonl.checks` 使用 `checks` 的结构化结果。
- `events.jsonl.next` 使用 `next action`。

### Next Best Action 契约

`/review-all` 完成或打回时必须输出固定的 Next Best Action，告诉用户下一步应该做什么、为什么、是否需要人工确认。

```markdown
## Next Best Action
- action: [建议执行的命令或人工动作，如修复 P0/P1、/ship、等待风险确认]
- reason: [为什么现在应该做这一步，引用审查结论、严重度、剩余风险或报告路径]
- requires human confirmation: yes / no
- source: [依据来源，如 review report、issues、tasks.md、events.jsonl]
```

写入规则：
- `Summary.next action` 必须与 `Next Best Action.action` 保持一致或可直接追溯。
- 如果 `requires human confirmation: yes`，必须说明谁需要确认什么。
- 如果存在 P0/P1 或安全问题，Next Best Action 不得建议进入 `/ship`。

## 事件记录

`/review-all` 收尾时必须向 `.claude/workspace/events.jsonl` 追加 1 行 JSONL 事件。该文件是 `/standup` 和后续 metrics 的机器可读事实来源。

### events.jsonl 契约

每行是一个独立 JSON 对象，不允许跨行，不回写旧事件。

| 字段 | 必填 | 说明 |
|------|------|------|
| `time` | 是 | UTC ISO 8601 时间，如 `2026-07-09T10:00:00Z` |
| `command` | 是 | 固定为 `/review-all` |
| `task` | 否 | 关联任务、模块或审查范围；没有则为 `null` |
| `status` | 是 | `completed` / `failed` / `blocked` / `skipped` |
| `summary` | 是 | 一句话审查结论摘要 |
| `checks` | 否 | 审查结果对象，如 `{"review":"pass","critical":0,"major":0}` |
| `artifacts` | 否 | 审查报告、tiny obvious fixes 文件或关键变更路径数组 |
| `next` | 否 | 下一步建议，或 `null` |

#### Metrics 扩展字段

`events.jsonl` 同时是结构化 metrics 的机器事实来源。`/review-all` 收尾事件应尽量写入这些可选字段；未知时用 `null`，计数无发生时用 `0`：

| 字段 | 说明 |
|------|------|
| `taskId` | 标准任务、模块或审查范围 ID；优先等于 `task` |
| `level` | 任务级别：`S` / `M` / `L` / `XL`；未知为 `null` |
| `specRejectCount` | 继承任务的 spec 否决次数；未知为 `null`，无发生为 `0` |
| `checkIssueCount` | Phase 1 `/check` 发现的问题总数 |
| `checkFixRounds` | 快检或自动修复轮数 |
| `reviewRejectCount` | 审查打回次数；首次不通过计 `1` |
| `testFailureCount` | 审查期间触发测试失败次数；没有则 `0` |
| `estimateHours` | 继承任务估算；没有则为 `null` |
| `actualHours` | 本次审查实际耗时；没有记录则为 `null` |

#### 失败恢复记录契约

当 `/review-all` 遇到测试失败、CI 失败、pack 失败、hook 误拦或发布失败，并且本次流程进行了自动修复、重试、回滚或最终阻塞时，收尾事件必须写入可选对象 `failureRecovery`。无失败发生时省略该对象。

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
- 只在审查收尾时追加 1 条最终事件，不记录中间步骤。
- 如果 `.claude/workspace/` 或 `events.jsonl` 不存在，创建它们。
- 路径使用仓库相对路径，不记录绝对路径、密钥、token 或敏感数据。
- 写入失败时在最终输出中说明，但不改变审查结论。

示例：

```json
{"time":"2026-07-09T10:10:00Z","command":"/review-all","task":"T0.2","taskId":"T0.2","level":"M","status":"completed","summary":"completed: 跨文件审查通过，无阻塞问题","checks":{"review":"pass","critical":0,"major":0,"fixRounds":0},"specRejectCount":0,"checkIssueCount":0,"checkFixRounds":0,"reviewRejectCount":0,"testFailureCount":0,"estimateHours":null,"actualHours":null,"artifacts":[".claude/workspace/reviews/2026-07-09-t0.2.md"],"next":"/ship"}
```

## 跨文件分析维度

### 1. 变更完整性

改了接口/类型/配置，所有引用方都同步了吗？

**检查方法**：
- 改了函数签名 → grep 函数名，检查所有调用方是否更新
- 改了类型定义 → grep 类型名，检查所有使用处是否兼容
- 改了 API 契约 → 检查前端/测试是否同步更新
- 改了环境变量 → 检查 .env.example、CI 配置是否同步
- 改了数据库模型 → 检查迁移文件、seed 文件是否同步
- 新增了文件 → 检查是否有对应的 index.ts 导出、测试文件

**常见问题**：
```
❌ 改了 UserService.create() 的参数，但 controller 层还在传旧参数
❌ 新增了 API 端点，但没写集成测试
❌ 改了环境变量名，但 .env.example 还是旧的
❌ 新建了模块，但没在 index.ts 中导出
```

### 2. 跨文件一致性

同类功能在不同文件中是否用了相同的模式？

**检查方法**：
- 错误处理：A 模块用 AppError，B 模块用 throw new Error → 不一致
- 响应格式：A 端点返回 `{ data }`，B 端点返回 `{ result }` → 不一致
- 命名风格：A 用 camelCase，B 用 snake_case（非 DB 层）→ 不一致
- 验证方式：A 用 Zod，B 用手动 if 检查 → 不一致
- 日志格式：A 用 JSON 结构化日志，B 用 console.log → 不一致

**检查范围**：
```
同一模块内的文件 → 必须一致
不同模块但同类功能 → 应该一致
跨语言/跨层（前端/后端）→ 允许差异，但接口层必须一致
```

### 3. 历史回归

这个模块之前被打回过？上次的问题这次修了吗？

**检查方法**：
- 读取 `.claude/workspace/journal.md`，找到该模块的历史审查记录
- 检查之前标记的问题是否已修复
- 检查之前标记的"建议项"是否有改善

**数据来源**：
```
.claude/workspace/journal.md → 历史会话记录
.claude/workspace/metrics.md → 审查打回记录
git log --oneline → 相关提交历史
```

### 4. 依赖关系变更

新增/删除/升级了依赖，相关配置都同步了吗？

**检查方法**：
- 新增依赖 → 检查是否有对应的类型定义（@types/xxx）
- 删除依赖 → 检查是否有残留的 import
- 升级依赖 → 检查是否有 breaking change 需要适配
- 新增 MCP 工具 → 检查相关 agent 是否引用

### 5. Acceptance 风险

功能完成后，用户主流程真的可用吗？

**检查方法**：
- 对照 spec/tasks 的 acceptance 场景，确认目标用户、入口、主流程、成功结果和可观察证据都存在。
- 检查 Summary 是否说明用户能看到或完成什么；内部任务应明确“不涉及用户主流程”。
- 判断是否存在“代码完成但产品不可用”的缺口，例如入口缺失、状态不可见、失败路径无提示、验收命令无法证明主流程。
- UI 任务只检查是否有 Designer 审查结论；视觉层次、配色、留白和交互体验由 Designer 负责，Reviewer 不重复审视觉。

**常见问题**：
```
❌ API 已实现，但没有任何用户入口或调用路径
❌ 表单能提交，但成功/失败状态对用户不可见
❌ 验收只跑单元测试，无法证明核心用户流程可完成
❌ UI 体验明显需要 Designer，但 review-all 用代码审查替代了设计审查
```

### 6. 系统健康和长期演化

多轮变更后，项目整体形状是否仍然健康？

**检查方法**：
- 对照 Product Brief、roadmap、project-preset、architecture/ADR，检查实现是否偏离产品主线。
- 扫描模块边界：是否出现跨层调用、循环依赖、重复 service、万能 helper、散落配置。
- 扫描一致性：同类 API、错误处理、状态命名、UI 模式、测试策略是否分裂。
- 扫描文档熵：roadmap/spec/tasks/review/release/journal 是否互相冲突，旧文档是否应该合并、归档或删除。
- 扫描债务积累：TODO、临时兼容、dead code、跳过测试是否变成常态。

**常见问题**：
```
❌ 每次 diff 都合理，但最终出现 3 套错误处理模式
❌ roadmap 说聚焦 MVP，但多个 P2 功能已混进核心流程
❌ spec/tasks/review report 都在写状态，且彼此不一致
❌ 业务逻辑从 feature 层泄漏到 UI 或 CLI 层
❌ Workbench/自动化文档反过来盖过产品开发主线
```

## 输出格式

```markdown
# 跨文件审查报告

> 路径：.claude/workspace/reviews/2026-07-09-auth.md

## 结论：✅ 通过 / ❌ 需要修改 / 🔴 需要重大修改

## 关联任务
- 任务：T1.4
- 模块：auth

## 变更概况
- 分支：feature/user-auth → main
- 变更文件：12 个（+342 / -89）
- 变更类型：新功能

## Phase 1: /check 快检结果
| 文件 | 结果 | 问题数 |
|------|------|--------|
| src/auth/login.ts | ⚠️ | 1 |
| src/auth/types.ts | ✅ | 0 |
| src/routes/auth.ts | ✅ | 0 |

## Phase 2: 跨文件分析

### 变更完整性 🔴
1. `UserService.create()` 签名变更，但 `auth.controller.ts:23` 未同步
   → 建议：执行 `/fix src/auth.controller.ts 更新 UserService.create 调用参数`
   **状态**：委托修复

### 跨文件一致性 🟡
1. `auth/login.ts` 用 AppError，但 `user/register.ts` 用 throw new Error
   → 建议：统一使用 AppError
   **状态**：建议修改

### 历史回归 🟢
- 无历史问题（首次审查此模块）

### 依赖关系 ✅
- 无依赖变更

## Phase 3: 整体评估
- 架构：无新增技术债
- 设计：符合 spec.md 中的设计方向

## 评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 变更完整性 | 7/10 | 1 处调用方未同步 |
| 跨文件一致性 | 9/10 | 1 处错误处理不一致 |
| 历史回归 | N/A | 首次审查 |
| 依赖关系 | N/A | 无变更 |

## 委托修复
- [ ] `/fix src/auth.controller.ts 更新 UserService.create 调用参数`
- [ ] `/dev 统一 auth/user 注册登录错误处理为 AppError`
- 验收命令：`npm test`、`/review-all src/features/auth/`
- 结论：needs_fix（修复后重新运行 `/review-all`）

## 剩余风险
- 修复前不能进入 `/ship`。

## Gate 结果
- review: needs_fix
- critical: 0
- major: 1
- minor: 1
- fix rounds: 0

## Summary
- status: blocked
- affected files/modules: src/features/auth/, .claude/workspace/reviews/2026-07-09-auth.md
- checks: review needs_fix / critical 0 / major 1 / fix rounds 0
- next action: 执行委托的 /fix 或 /dev 后重新 /review-all
```

## 后续动作

### 审查通过
- 输出："✅ 审查通过，可以合并"

### 审查不通过（需要修复）
- 输出："⚠️ 审查发现 N 个问题，已写入 review report，建议执行 /fix 或 /dev"
- 选项：按报告修复 / 请求 Owner 决策 / 暂缓合并

### 审查阻塞
- 输出："🔴 审查阻塞，原因是 X，需要 Y 确认 Z"
- 选项：解除阻塞后重审 / 调整范围 / 暂停发布

## 审查原则

- **跨文件问题优先**：单文件问题让 code-review skill 和 /check 处理
- **解释 WHY**：不只说"不一致"，说清楚为什么不一致是问题
- **提供修复代码**：不只指出问题
- **区分"必须改"和"建议改"**：接口不同步 = 必须改，命名风格不一致 = 建议改
- **安全问题零容忍**：跨文件发现的安全问题标记为严重

## 使用示例

```
/review-all                        # 审查当前分支所有变更
/review-all src/features/auth/     # 审查指定目录
/review-all --system               # 审查项目整体健康，防止长期变形
/review-all --system src/features/auth/  # 审查指定模块的长期形状和边界
```
