---
name: team-command-plan
description: Execute the plan workflow from this AI development team preset. Use when the user writes /plan, asks for plan, or wants the corresponding team process in Codex.
---

# team-command-plan

This skill ports the Claude Code `/plan` command workflow to Codex.

In Codex, invoke this as `$team-command-plan`. Do not rely on `/plan` unless Codex itself defines that slash command with the same meaning.

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

## 流程

### Phase 0: Product Brief / PRD（产品契约）

在拆解 roadmap 之前，必须先沉淀轻量 Product Brief。优先读取已有的 `product-brief.md`；如果用户给的是更完整的 PRD，则读取 `prd.md`。两者都不存在时，先通过对话生成 `product-brief.md`，再进入模块拆解。

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

- 如果已有 `product-brief.md` / `prd.md`，先复述关键信息并标出缺失字段，再询问是否补齐。
- 如果没有产品契约，AI 问 3-4 个问题：

1. **目标用户是谁？** — 给谁用，决定功能取舍
2. **核心价值是什么？** — 这产品最不能少的那一件事
3. **范围边界？** — 这一期要做什么、明确不做什么（防止范围膨胀）
4. **有无硬约束？** — 技术栈、合规、上线时间、预算

你可以一次性回答。AI 输出一句话摘要让你确认：
> "你要做的是：[一句话产品定义]，核心用户是 [X]，这一期聚焦 [Y]，明确不做 [Z]"

确认后写入或更新 `product-brief.md`，再进入 Phase 1。否决 → 调整，最多 3 轮。

### Phase 1: 功能模块拆解

Architect-Planner 必须从 `product-brief.md` / `prd.md` 生成**功能模块**（不是细任务），输出 `roadmap.md`：

- 每个模块：模块 ID、状态、名称、一句话描述、优先级、复杂度、依赖、验收标准、风险、最近更新
- 按"先做地基、再做主干、最后做枝叶"排序
- 标出 MVP 最小集（哪些模块凑齐就能跑通核心流程）
- roadmap 顶部必须引用 Product Brief 的目标用户、核心价值、本期范围、明确不做和验收标准
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

| 模块 ID | 状态 | 模块 | 描述 | 优先级 | 复杂度 | 依赖 | 验收标准 | 风险 | 最近更新 |
|---------|------|------|------|--------|--------|------|----------|------|----------|
| M1 | planned | 用户认证 | 邮箱注册登录 + JWT | P0 | L | 无 | 用户能注册、登录并获得有效会话 | 密码策略和会话过期边界需确认 | YYYY-MM-DD |
| M2 | planned | 知识库管理 | 文档上传、列表、删除 | P0 | M | M1 | 登录用户能管理自己的文档 | 大文件上传限制需确认 | YYYY-MM-DD |
| M3 | planned | 向量检索 | 文档分块嵌入 + 语义搜索 | P0 | L | M2 | 能对已上传文档返回相关片段 | 嵌入模型成本和中文效果不确定 | YYYY-MM-DD |
| M4 | planned | 问答界面 | 提问 + 流式回答 + 引用来源 | P0 | M | M3 | 用户能基于文档提问并看到引用 | 流式输出兼容性需验证 | YYYY-MM-DD |
| M5 | planned | 多人协作 | 团队空间、权限 | P2 | XL | M1,M2 | 团队成员能按权限协作 | 权限模型容易扩大范围 | YYYY-MM-DD |

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
