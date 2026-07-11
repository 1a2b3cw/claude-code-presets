# AI 开发交付自动化与提效路线图

> 状态：superseded/reference。当前成熟化事实源是 `docs/maturity-roadmap.md` 和 `docs/maturity-tasks.md`；本文保留为历史思路参考，文中的旧 `workspace/` 路径不代表当前规范。
>
> 本文档聚焦“如何把做产品、做项目、写代码、审查、发布、复盘变得更自动化、更可追踪、更省心”。
> 它不是 preset 扩展路线。preset 只是底座，真正目标是形成一套 AI 驱动的软件交付系统。

## 一句话定位

把一个产品/项目从想法到上线的过程，串成一条可追踪、可审查、可复盘、能持续提效的 AI 交付流水线。

```text
idea
  -> product brief / PRD
  -> roadmap
  -> spec
  -> tasks
  -> dev
  -> check / review
  -> ship
  -> metrics / standup
  -> 下一轮改进
```

## 核心原则

1. **先做轻量飞轮，不先做大平台**
   - 第一版只解决状态、记忆、下一步和复盘。
   - 不让用户为了“自动化”维护更多东西。

2. **文件优先，结构化增强**
   - Markdown 继续作为可读、可提交、可 diff 的事实来源。
   - 需要机器分析的部分用 JSONL / frontmatter / 固定表格轻量增强。

3. **命令是入口，artifact 是契约**
   - `/plan`、`/dev`、`/check`、`/review-all`、`/ship`、`/standup` 不只是输出文字。
   - 每个阶段都要读上游 artifact，并写回状态或报告。

4. **小事保持轻流程**
   - S 级修复不要被拖进完整流程。
   - `/fix` 和 `/check` 仍然要快。

5. **数据只在能减少决策成本时才记录**
   - 不为了漂亮指标记录。
   - 只记录能帮助回答“下一步做什么、哪里卡住、哪里反复出问题”的数据。

## 产品对象

### 目标用户

| 用户 | 主要痛点 | 产品价值 |
|------|----------|----------|
| 独立开发者 / 独立黑客 | 想法多，但容易卡在先做什么、怎么收敛 MVP | 把想法拆成 roadmap，再逐模块交付 |
| 2-5 人小团队技术负责人 | 既要写代码，又要管质量、发布、进度 | 用轻量流程统一交付节奏和质量门禁 |
| 接手老项目的开发者 | AI 每次都要重新理解项目 | 通过项目画像、规则、journal、metrics 延续上下文 |
| 产品型开发者 | 不只要代码，还要 PRD、验收、上线、复盘 | 把产品决策和代码交付连起来 |

### 不做什么

- 第一阶段不做复杂 Web 工作台。
- 不做 Jira 替代品。
- 不把每个命令都强行产品化成重流程。
- 不让用户手填大量 metrics。
- 不把 preset 数量当成核心成果。

## 总体系统蓝图

```text
用户意图
  ↓
Intent Router（当前先人工选择命令，后续自然语言路由）
  ↓
Command Layer
  /project-preset /plan /taste /dev /fix /check /review-all /ship /standup
  ↓
Orchestration Layer
  阶段推进 / 复杂度判断 / 状态更新 / 下一步建议
  ↓
Agent Layer
  Architect / Builder / Designer / Reviewer / Researcher / DevOps
  ↓
Artifact Layer
  product brief / PRD / roadmap / spec / tasks / review report / release report / metrics
  ↓
Feedback Loop
  events + metrics + journal + review/ship 结果 -> standup -> 流程和项目规则改进
```

## Artifact 体系

### 产品与项目层

| Artifact | 路径建议 | 作用 |
|----------|----------|------|
| Product Brief | `product-brief.md` 或 `project-profile/product.md` | 一句话产品定义、用户、核心价值、范围边界 |
| Project Profile | `project-profile/` | 项目事实：技术栈、架构、质量、验收、UI 方向 |
| Project Preset | `project-preset/` | 后续 AI 必须遵守的项目级规则 |
| Roadmap | `roadmap.md` | 产品模块、MVP、优先级、依赖、进度 |

### 功能与执行层

| Artifact | 路径建议 | 作用 |
|----------|----------|------|
| Spec | `spec.md` 或 `workspace/specs/<feature>.md` | 单功能契约：目标、范围、验收 |
| Tasks | `tasks.md` | 当前迭代任务、状态、阻塞、验收命令 |
| Review Report | `workspace/reviews/<date>-<feature>.md` | 审查问题、严重度、修复状态 |
| Release Report | `workspace/releases/<version-or-date>.md` | 发布结论、风险、回滚方案 |

### 记忆与指标层

| Artifact | 路径建议 | 作用 |
|----------|----------|------|
| Journal | `.claude/workspace/journal.md` | 会话记忆，帮助新会话续上上下文 |
| Metrics | `.claude/workspace/metrics.md` | 人类可读的效能指标摘要 |
| Events | `.claude/workspace/events.jsonl` | 机器可读事件流，后续 standup/insights 的数据源 |

## 阶段 0：轻量飞轮（最小值得做）

目标：不做大平台，先让 AI 开发具备“记忆、状态、下一步、复盘”。

### 要做

1. **强化 `roadmap.md`**
   - 每个模块有稳定 ID：`M1`、`M2`。
   - 增加状态：`planned / active / blocked / done`。
   - 保留 MVP、依赖、风险、建议顺序。

2. **强化 `tasks.md`**
   - 每个任务有状态：`todo / doing / blocked / done`。
   - 每个任务写清验收命令或验收方式。
   - 阻塞时写清阻塞原因和需要谁决策。

3. **新增轻量 `events.jsonl`**
   - 每次 `/dev`、`/check`、`/review-all`、`/ship`、`/standup` 追加一条事件。
   - 只记录最少字段：

```json
{"time":"2026-07-09T10:00:00Z","command":"/dev","task":"M1","status":"completed","checks":{"test":"pass","review":"pass"},"next":"M2"}
```

4. **让 `/standup` 读取真实状态**
   - 从 roadmap/tasks/events/journal/git 中生成：
     - 最近完成
     - 当前进行中
     - 阻塞项
     - 下一步建议
     - 重复出现的问题

### 不做

- 不做 UI。
- 不做数据库。
- 不做复杂状态机。
- 不做多项目。
- 不做自然语言路由。

### 验收标准

- 新会话运行 `/standup`，能准确说出最近任务、阻塞项和下一步。
- `/dev` 完成后能更新任务状态，并追加一条事件。
- 用户不用手动维护 metrics，也能看到基本趋势。

## 阶段 1：交付链路标准化

目标：把现有命令集合变成稳定交付流程。

### 要做

1. **定义 Product Brief / PRD 契约**
   - `/plan` 不只生成 roadmap，也可以先生成轻量 product brief。
   - 内容包括：
     - 目标用户
     - 核心价值
     - 本期范围
     - 明确不做
     - 验收标准

2. **让 `/dev` 明确读取上游 artifact**
   - 优先读：
     - `project-preset/PRESET.md`
     - `project-preset/rules/`
     - `roadmap.md`
     - `tasks.md`
     - 当前功能 `spec.md`

3. **标准化 review report**
   - `/review-all` 输出可沉淀报告，而不是只在聊天里说。
   - 字段：
     - 结论
     - 问题列表
     - 严重度
     - 自动修复项
     - 剩余风险
     - 关联任务

4. **标准化 release report**
   - `/ship` 输出发布报告。
   - 字段：
     - 发布结论
     - 测试/类型/lint/安全结果
     - 风险
     - 回滚步骤
     - 发布后验证

5. **统一任务状态**
   - 建议状态：

```text
ready
needs_clarification
planned
in_progress
local_gate
review_gate
release_gate
blocked
shipped
done
```

### 验收标准

- 任意 M 级以上任务，从 `/dev` 到 `/ship` 至少产出：
  - spec/tasks
  - check/review 结果
  - release report 或明确跳过理由
  - events 记录
- `/standup` 能从这些 artifact 生成可信汇报。

## 阶段 2：数据驱动的质量飞轮

目标：不只是记录结果，而是根据结果自动调整后续流程。

### 要做

1. **扩展 `events.jsonl` 字段**

```json
{
  "time": "2026-07-09T10:00:00Z",
  "taskId": "M3-T2",
  "command": "/check",
  "level": "M",
  "status": "completed",
  "checkIssueCount": 2,
  "checkFixRounds": 1,
  "reviewRejectCount": 0,
  "testFailureCount": 0,
  "estimateHours": 4,
  "actualHours": 3.5
}
```

2. **让 `/standup` 输出流程建议**
   - spec 否决多：下次先输出更短需求摘要和未决问题。
   - check 问题多：下次强制先写测试或最小复现。
   - review 打回多：同模块任务每个子任务后强制 `/check`。
   - 测试失败多：要求补回归测试或记录为什么不补。
   - 估算偏差大：调整同类任务估算。

3. **引入失败恢复记录**
   - 测试失败
   - CI 失败
   - pack 失败
   - hook 误拦
   - 发布失败

4. **结构化 metrics + Markdown 摘要双轨**
   - `events.jsonl` 是机器事实。
   - `metrics.md` 是人类摘要。
   - `standup` 可以从 events 生成 metrics 摘要。

### 验收标准

- 最近 5/10 次任务的平均 check 问题数、review 打回、测试失败可以复现。
- `/standup` 能指出至少一个“下次流程调整”建议，并说明数据来源。
- 同类问题重复出现时，系统会建议更新 project-preset 或流程规则。

## 阶段 3：自然语言路由与下一步推荐

目标：降低命令心智负担，让用户表达目标，系统选择流程。

### 要做

1. **自然语言路由**
   - 用户说：
     - “我想做一个登录”
     - “这个 bug 帮我修”
     - “准备上线”
     - “今天做到哪了”
   - 系统判断走：
     - `/plan`
     - `/dev`
     - `/fix`
     - `/check`
     - `/review-all`
     - `/ship`
     - `/standup`

2. **下一步推荐**
   - roadmap 有依赖未完成：建议先做依赖。
   - 当前任务 blocked：提示需要什么决策。
   - review 未通过：建议先修 review。
   - ship 风险未解决：阻止发布。
   - metrics 异常：建议调整流程。

3. **轻量 `today` 视图**
   - 可以先是命令输出，不一定 UI：

```text
Today
- Focus: M2 文档上传
- Blocked: M3 等待 M2 完成
- Last run: /check passed
- Next: /dev 做 M2-T3
- Risk: review 打回率最近升高，建议补测试
```

### 验收标准

- 用户不记命令，也能通过自然语言进入正确流程。
- `/standup` 或未来 `today` 能稳定给出下一步。
- 小修复仍然被路由到轻流程，而不是完整 `/dev`。

## 阶段 4：本地/CI/发布自动化

目标：把“流程文档”升级成真正可执行的门禁。

### 要做

1. **本地总门禁**

```bash
npm run validate
npm test
npm pack --dry-run --json
```

2. **hook 行为测试**
   - 不只检查文件存在。
   - 直接测试：
     - `eval(`
     - `new Function(`
     - `innerHTML =`
     - `git reset --hard`
     - `git clean -f`
     - `npm publish`

3. **tarball 安装冒烟**
   - 打包后装到临时目录。
   - 执行：
     - `create-claude-team init --preset base --dry-run`
     - `create-claude-team validate`

4. **GitHub Actions**
   - PR 跑 validate/test/pack dry-run。
   - 至少 Linux + Windows。
   - 后续再扩 macOS、Node 18/20/22 matrix。

5. **发布/回滚报告**
   - 每次 release 有：
     - tag
     - pack 清单
     - 验证结果
     - 回滚步骤

### 验收标准

- PR 不过门禁不能合并。
- 发布前可以机器确认包内容和基础行为。
- 发布失败有明确恢复步骤。

## 阶段 5：轻量工作台 MVP

目标：把 Markdown/CLI 状态变成每天可看的项目工作台，但仍保持克制。

### 工作台定位

不是复杂 agent 控制台，而是开发者每天打开的交付驾驶舱：

> 现在发生了什么？哪里需要我？下一步做什么？

### MVP 页面

1. **Today**
   - 今日焦点
   - 当前阻塞
   - 最近 run
   - 下一步建议
   - 今日 standup 草稿

2. **Project**
   - 项目目标
   - 当前阶段
   - 健康度
   - roadmap 进度
   - 风险和阻塞

3. **Task Focus Mode**
   - 当前任务目标
   - 验收标准
   - AI 当前阶段
   - 最近动作
   - 需要用户确认的点
   - 一键继续 / 修复 / 审查 / 发布检查

4. **Run Detail**
   - Summary
   - Changes
   - Checks
   - Decisions
   - Logs

5. **Insights**
   - 只展示有用趋势：
     - review 打回率
     - 测试失败率
     - 自动化成功率
     - 阻塞时间
     - 估算偏差

### 设计方向

- 专业开发工具风格。
- 高密度但清晰。
- 克制状态色。
- 默认隐藏日志噪音。
- 更像 Linear + GitHub + Vercel Dashboard，不像聊天机器人页面。

### 验收标准

- 打开首页 10 秒内知道：
  - 当前项目在哪
  - 哪里卡住
  - 下一步做什么
- 任意 run 都能追溯：
  - 用户意图
  - AI 做了什么
  - 检查是否通过
  - 需要人做什么决策

## 阶段 6：多项目与团队协作

目标：从个人单仓库工作流，扩展到小团队和多项目。

### 要做

1. **多项目总览**
   - 项目列表
   - 健康度
   - 最近活动
   - 阻塞项
   - 需要人决策的事项

2. **团队 standup**
   - 开发者版
   - 团队版
   - 产品版

3. **GitHub 集成**
   - Issue / PR / Project
   - 自动 PR 描述
   - release notes
   - 风险摘要

4. **跨项目学习**
   - 哪类任务最容易失败
   - 哪些门禁最常拦截问题
   - 哪些规则降低了返工
   - 哪些流程太重需要放宽

### 验收标准

- 小团队能用它替代一部分手工 standup、状态同步和发布检查。
- 多项目状态不需要逐仓库打开才能知道风险。

## 阶段 7：平台化与生态

目标：当交付飞轮稳定后，再扩展生态能力。

### 要做

- 插件化交付能力：
  - 需求导入
  - PRD 模板
  - 测试策略
  - 发布策略
  - 行业/业务流程 skill
- 外部 agent/skill 采纳机制：
  - watching
  - candidate
  - adopted
  - rejected
- 指标驱动的规则推荐：
  - 自动建议新增 rule
  - 自动建议废弃低价值 rule
  - 自动建议调整流程阈值

### 验收标准

- 新能力来自真实重复需求，而不是为了丰富生态而堆功能。
- 每个新增 skill/rule/flow 都能说明改善了哪个指标。

## 推荐执行顺序

```text
Phase 0  Development Memory Loop
  ↓
Phase 1  Artifact + Status Standardization
  ↓
Phase 2  Metrics + Feedback Loop
  ↓
Phase 3  Intent Routing + Next Best Action
  ↓
Phase 4  Executable Gates + CI
  ↓
Phase 5  Workbench MVP
  ↓
Phase 6  Multi-project / Team
  ↓
Phase 7  Platform / Ecosystem
```

## 第一批最适合开工的任务

1. 给 `roadmap.md` 定义增强格式。
2. 给 `tasks.md` 定义状态字段。
3. 新增 `events.jsonl` 契约。
4. 修改 `/dev`：完成任务后更新 tasks/roadmap 并追加 event。
5. 修改 `/check`、`/review-all`、`/ship`：追加 event 和报告路径。
6. 修改 `/standup`：读取 events/tasks/roadmap，输出下一步建议。
7. 补本地门禁脚本和 CI。

## 判断是否物超所值

值得做的信号：

- 新会话不用重新解释项目背景。
- 每次开发后都知道下一步。
- 任务状态不靠聊天记录回忆。
- 质量问题能被提前拦住。
- 重复失败会变成流程改进建议。
- 发布前知道风险和回滚方案。

不值得做的信号：

- 用户开始为了工具维护大量文档。
- 小修复也被流程拖慢。
- metrics 需要手动填。
- 报告很多，但下一步不清楚。
- UI 很漂亮，但状态仍然不可信。

## 结论

短期目标不是“大而全的平台”，而是一个轻量的开发记忆飞轮：

> 每次做事都留下结构化痕迹；下一次 AI 自动读懂状态；standup 自动给出下一步和改进建议。

等这个飞轮真实省时间，再逐步扩展到自然语言路由、工作台、多项目和生态能力。
