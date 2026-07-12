# /plan - 项目开局规划

一句产品想法进，一份功能模块清单出。**只规划，不写代码。** 规划完你挑着做。

## 和 /dev 的区别

| | /plan | /dev |
|---|-------|------|
| **粒度** | 整个产品 | 单个功能/模块 |
| **产出** | `roadmap.md`（功能模块清单） | 可运行代码 |
| **何时用** | 项目开局、不知道该先做什么 | 已经知道做哪个模块 |
| **写代码吗** | ❌ 只分析规划 | ✅ |

典型流程：`/plan 我想做个 X` → 生成/读取 Product Brief → 看 roadmap → `/dev 做模块 3`。

## Project Preset Lifecycle

开始前运行 `node create-claude-team/cli.js project-preset context --json`。当结果为 `pass` 时，按 `PRESET.md -> rules -> specs -> base/技术栈 preset` 顺序读取；只读取与当前规划相关的 .agents/rules/specs。结果为 `needs_revision` 时，不得静默把 project-preset 当作项目事实，先说明 `project-preset validate` 的修复项。不存在 project-preset 时，继续使用 base 和已安装技术栈 preset，不阻塞既有项目，并按需建议 `/project-preset`。

## 角色交接

- **Product Lead**：确认目标用户、核心价值、MVP、非目标和推荐顺序；存在 Product Model 时，先映射用户请求到能力和旅程；只把高影响取舍交给 Owner。
- **Architect-Planner**：把已确认的产品路线转成模块、依赖、复杂度、技术风险和验收标准。
- **Delivery Steward**：保证 Product Brief、Product Model、roadmap、project-profile 与 project-preset 各自只有一个事实用途，不制造重复状态。

## Owner Decision Brief 契约

`/plan` 由 Product Lead 负责判断产品方向，不把所有细节丢给 Owner。只有遇到会明显影响产品成败、投入或风险的选择时，才输出 Owner Decision Brief，让 Owner 做该做的决定。

必须触发 Owner Decision Brief 的情况：

- 产品方向不清或存在两条明显不同路线。
- MVP 最小集需要取舍，或 P0/P1/P2 优先级会改变交付节奏。
- 成本、隐私、安全、合规、发布风险会影响能不能做、怎么做或何时做。
- 架构选择会限制后续产品能力，且无法由团队按现有约束自行安全决定。

不要为日常模块命名、普通排序、低风险实现细节打断 Owner。团队应先给默认建议，只把真正需要 Owner 拍板的点拿出来。

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

存在 `.claude/workspace/planning/owner-decision-contract.md` 时，Owner Decision Brief 必须按该合同写入 `.claude/workspace/decisions/`：AI 只能准备 `draft`/`awaiting_owner` 和推荐，只有收到 Owner 明确选择后才能填写 Owner Confirmation 并标为 `confirmed`。完全访问权限、自动批准和工具可执行性都不代表产品确认；需要实现的 feature 要在 spec 声明 `Owner Decision Required：yes` 和类型，由 `/dev` 的 delivery gate 验证。

## 流程

### Phase 0: 共同探索 -> Product Brief（产品契约）

在拆解 roadmap 之前，Product Lead 必须先完成共同探索，再沉淀轻量 Product Brief。Product Brief 来源优先级是：

1. 已确认的 `product-brief.md`
2. 已确认的 `prd.md`
3. `project-profile/product.md` 中明确标为事实或已确认决策的内容

如果只有 `project-profile/product.md` 的推断或未决问题，必须向 Owner 确认后才写入 Product Brief；不得把推断当作产品事实。三个来源都不足时，先输出 Exploration Brief，再通过对话生成 `product-brief.md`，最后进入模块拆解。

#### Product Model 读取规则

存在根目录 `product-model.md` 时，在 Product Brief 后、roadmap 前读取它。Product Model 负责用户结果、`Capability ID`、`Journey ID`、产品边界和成功标准；它不替代 Product Brief 的定位，也不维护 roadmap 状态或 tasks。

- 新请求先映射到已有 Capability ID 和 Journey ID，并解释它改善的用户结果。
- 命中明确非目标或边界外请求时，先说明冲突、影响和推荐路线；不得静默塞进 MVP roadmap。
- 只有 Owner 确认产品范围变化后，才把新能力写入 Product Model；AI 推断仍保留为待验证，不当作产品事实。

#### Planning Artifact Contract 读取规则

存在 `.claude/workspace/planning/artifact-contract.md` 时，在 Product Model 与 Architecture 后读取它。它定义 roadmap、feature spec/tasks、状态和证据的唯一 owner 与读取顺序：

- roadmap 只维护产品模块、优先级、依赖和模块状态；feature tasks 只维护执行状态；events 只记录证据，三者不能互相取代。
- 新 roadmap 或 feature package 必须使用合同规定的稳定 ID 与引用字段，不能复制 Capability、Journey、Architecture 或产品范围的正文。
- 生成或变更规划 artifact 后运行 `node create-claude-team/cli.js planning validate`；校验失败时先修引用或 owner，再交给 Builder。
- 没有 `product-model.md` 的项目沿 Product Brief 流程继续；不要在普通 `/plan` 调用中凭空生成复杂模型。

#### Exploration Brief

不以固定问卷开场。AI 先根据 Owner 已经表达的想法、困惑、约束或不满意体验进行综合判断，然后给出一份短而有判断力的 Exploration Brief：

- **一句话理解**：AI 认为当前真正要解决的问题。
- **已确认信号**：Owner 已经明确表达的事实、偏好和约束。
- **AI 推断**：AI 基于信号提出、但允许 Owner 纠正的判断。
- **需要验证**：会改变产品方向的重要未知项；不列日常实现细节。
- **候选方向**：复杂问题给 2-4 条有实质差异的路线；简单问题可以只给推荐路线。
- **推荐方案**：明确说明推荐什么、为什么，以及主要代价。
- **下一步**：继续形成 Product Brief，或只请 Owner 决定一个高影响问题。

默认先给结论和推荐，再按需展开依据。首轮不重复 Owner 原话，不输出长表格，也不把“你想怎么做”丢回给 Owner。

#### 提问与决策规则

- 每轮默认只问 0-2 个高价值问题，只有答案会明显改变产品方向、成本、安全、隐私或长期架构时才问。
- 信息不足但存在安全默认时，标记为 AI 推断 后沿推荐路线继续，不立即暂停。
- 命中 Owner Decision Brief 触发条件时，必须在 Exploration Brief 后按固定格式输出 Owner Decision Brief，并先给默认推荐；不得只用普通“下一步”问题或散文选项代替。
- 目标冲突时，先指出冲突并提出可行的取舍，不把冲突隐藏在后续 tasks 中。
- 当前请求其实是局部功能或修复 时，说明原因并建议 `/dev` 或 `/fix`，不强行启动产品规划。
- 用户说“继续”时，沿已给出的推荐推进，不重新询问已经确认的信息。

#### Product Brief 字段

`product-brief.md` 必须包含：

- **目标用户**：给谁用，典型用户画像或团队规模。
- **核心价值**：这个产品最不能少的一件事。
- **本期范围**：当前版本要交付什么。
- **明确不做**：本期不做什么，防止范围膨胀。
- **验收标准**：做到什么程度算本期产品规划完成。

可选补充：

- 一句话产品定义
- 核心用户流程
- 关键约束（技术栈、合规、上线时间、预算）
- 未决问题

#### 生成规则

- 如果已有 `product-brief.md` / `prd.md`，先给出已确认信号、AI 推断 和真正缺失的高影响信息；不要重跑固定问题清单。
- 如果没有产品契约，先给 Exploration Brief。只有 Owner 接受推荐或确认其中的安全默认后，才把内容写入 Product Brief。
- Product Brief 只写已确认事实；AI 推断 和需要验证 保留在未决问题或 Decision Brief 中，不能伪装成 Owner 决策。
- 简单明确的想法可以直接给一句产品定义、核心流程和 MVP 建议；复杂想法先确认高影响取舍，再补齐 Product Brief 字段。
- Owner 否决推荐时，先解释新的理解与之前不同在哪里，再调整路线；最多 3 轮。

### Phase 0.5: Product Lead 推荐路线

Product Lead 先给出默认推荐，而不是把所有排序选择丢给 Owner：

- 哪些能力属于 MVP，为什么它们先于其他模块。
- 哪些能力明确不做，避免范围膨胀。
- 每个候选模块的用户价值和推荐顺序。
- 哪些高影响取舍需要 Owner Decision Brief。

没有命中高影响触发条件时，按推荐路线继续，不为普通模块命名或低风险排序打断 Owner。

### Phase 1: 功能模块拆解

Product Lead 给出 MVP 与推荐顺序后，Architect-Planner 必须从 Product Brief 和已有 Product Model 生成**功能模块**（不是细任务），输出 `roadmap.md`：

- 每个模块：模块 ID、状态、名称、用户价值、MVP 归属、一句话描述、优先级、复杂度、依赖、验收标准、风险、最近更新
- 按"先做地基、再做主干、最后做枝叶"排序
- 标出 MVP 最小集（哪些模块凑齐就能跑通核心流程）
- roadmap 顶部必须引用 Product Brief 的目标用户、核心价值、本期范围、明确不做和验收标准
- 存在 Product Model 时，每个模块必须引用支撑的 Capability ID；feature spec 再引用 Capability ID 和 Journey ID
- roadmap 是产品模块状态源，`/dev` 完成模块后必须更新对应模块状态和进度区

输出后你确认。方案不对 → 调整，最多 3 轮。

## product-brief.md 输出格式

```markdown
# Product Brief

> 更新于：YYYY-MM-DD

## 一句话产品定义
[一句话说明产品是什么、给谁解决什么问题]

## 目标用户
- [用户类型 / 场景 / 规模]

## 核心价值
- [本产品最核心的价值]

## 本期范围
- [本期明确要做的能力]

## 明确不做
- [本期明确不做的能力]

## 验收标准
- [规划或本期产品完成的判断标准]

## 核心用户流程
1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

## 关键约束
- 技术：
- 合规：
- 时间：
- 预算：

## 未决问题
- [需要用户后续确认的问题]
```

### Phase 2: 交棒

规划完成，AI 告诉你：
> "roadmap 已生成。MVP 需要模块 1/2/4。说 `/dev 做模块 1` 开始，或 `/dev 做模块 1 和 2` 一起做。"

**到此结束，不自动开工。** 由你指挥做哪个。

## roadmap.md 输出格式

```markdown
# [产品名] 路线图

> 产品定义：[一句话]
> Product Brief：product-brief.md
> 核心用户：[X] ｜ 核心价值：[Y]
> 本期范围：[A] ｜ 明确不做：[B]
> 验收标准：[C]
> 更新于：YYYY-MM-DD

## MVP 最小集
凑齐 M1 + M2 + M4 即可跑通核心流程：[一句话描述核心流程]

## 功能模块

| 模块 ID | 状态 | 模块 | Capability ID | 用户价值 | MVP 归属 | 描述 | 优先级 | 复杂度 | 依赖 | 验收标准 | 风险 | 最近更新 |
|---------|------|------|---------------|----------|----------|------|--------|--------|------|----------|------|----------|
| M1 | planned | 用户认证 | C1 | 让用户安全进入自己的空间 | MVP | 邮箱注册登录 + JWT | P0 | L | 无 | 用户能注册、登录并获得有效会话 | 密码策略和会话过期边界需确认 | YYYY-MM-DD |
| M2 | planned | 知识库管理 | C2 | 让用户管理可问答的资料 | MVP | 文档上传、列表、删除 | P0 | M | M1 | 登录用户能管理自己的文档 | 大文件上传限制需确认 | YYYY-MM-DD |
| M3 | planned | 向量检索 | C2 | 让提问能找到相关资料 | MVP | 文档分块嵌入 + 语义搜索 | P0 | L | M2 | 能对已上传文档返回相关片段 | 嵌入模型成本和中文效果不确定 | YYYY-MM-DD |
| M4 | planned | 问答界面 | C2 | 让用户获得带来源的答案 | MVP | 提问 + 流式回答 + 引用来源 | P0 | M | M3 | 用户能基于文档提问并看到引用 | 流式输出兼容性需验证 | YYYY-MM-DD |
| M5 | planned | 多人协作 | C3 | 让团队共享资料和权限 | 非 MVP | 团队空间、权限 | P2 | XL | M1,M2 | 团队成员能按权限协作 | 权限模型容易扩大范围 | YYYY-MM-DD |

> 状态：planned / in_progress / blocked / done / shipped
> 优先级：P0 必须 ｜ P1 重要 ｜ P2 锦上添花
> 复杂度：S/M/L/XL（对应 /dev 的任务分级）
> 最近更新：使用 YYYY-MM-DD，记录最近一次状态或范围变化

## 建议顺序
M1 → M2 → M3 → M4（MVP 跑通）→ M5（增强）

## 风险与未决
| 项 | 说明 | 何时需要决策 |
|----|------|-------------|
| 嵌入模型选型 | API vs 本地，影响成本和中文效果 | 做 M3 前 |
| 文档解析范围 | 是否支持扫描件/复杂 PDF | 做 M2 前 |

## 进度（AI 在 /dev 完成后自动更新）
- [ ] M1 用户认证 — planned — 最近更新：YYYY-MM-DD
- [ ] M2 知识库管理 — planned — 最近更新：YYYY-MM-DD
- [ ] M3 向量检索 — planned — 最近更新：YYYY-MM-DD
- [ ] M4 问答界面 — planned — 最近更新：YYYY-MM-DD
- [ ] M5 多人协作 — planned — 最近更新：YYYY-MM-DD
```

## 与 /dev 的衔接

- `/dev 做模块 M3` 时，AI **先读 roadmap.md**，复用该模块的描述、依赖、复杂度，不用重新问产品级问题（但仍可能问该模块的细节）
- `/dev` 开始模块时，把该模块状态从 `planned` 更新为 `in_progress`，并刷新最近更新日期
- `/dev` 完成模块后，把该模块状态更新为 `done`，刷新最近更新日期，并在进度区打勾
- `/dev` 遇到无法继续的阻塞时，把该模块状态更新为 `blocked`，在风险或未决区记录阻塞原因
- 模块依赖未满足时（如想做 M3 但 M2 没做），AI 会提醒先做依赖

## 异常路径

| 场景 | 处理方式 |
|------|----------|
| 产品想法太模糊 | 多问几轮把核心价值问出来；3 轮仍不清 → 暂停，建议先想清楚核心用户和价值 |
| 模块拆得太大/太碎 | 按"1 个模块 ≈ 1 个 /dev 能交付的完整功能"为粒度，太大的拆开、太碎的合并 |
| 范围明显过大 | 主动标出 MVP 最小集，建议砍掉 P2 先跑通 |
| 中途想加模块 | 直接说，AI 把新模块插入 roadmap 并重排依赖 |

## 使用示例

```
/plan 我想做一个面向中小团队的 AI 知识库，能上传文档、问答
/plan 做一个个人记账 App，手动记账 + 月度统计 + 预算提醒
/plan 重构现有系统，把单体拆成微服务   # 也可用于规划重构
```

## 边界

- `/plan` 是**产品/项目级**规划，产出模块清单
- 单个功能的详细 spec/tasks 由 `/dev` 在建造时产出（Architect-Planner Step 3）
- 不要用 `/plan` 做单个小功能（那是 `/dev` 的活）
