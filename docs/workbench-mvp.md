# Workbench MVP 信息架构

## 目标

Workbench MVP 是 AI 开发交付系统的轻量工作台。它不替代命令行和 Markdown artifact，而是把已有事实源汇总成每天可看的项目驾驶舱，帮助用户快速回答三个问题：

1. 当前项目在哪一步。
2. 哪里需要人工确认或处理。
3. 下一步最应该做什么。

## 当前定位

Workbench 是 M6 之后的视图层，不是 M1-M3 的成熟化主线。当前优先级是先让 Product Lead、Architect-Planner、Delivery Steward、`/plan`、`/dev`、`/review-all`、`/standup` 这些核心流程产出可信 artifact；Workbench 只读这些 artifact，不负责决定产品方向、任务合理性或项目状态。

在可信状态层完成前，不继续扩 Workbench UI，不把 Workbench 当作事实源，也不让它替代 Owner Decision Brief、Spec/Task Quality Gate 或 Artifact Cleanup。

Alpha 版的执行契约见 `docs/workbench-alpha.md`。后续实现以 Alpha 契约为准，重点补齐 Today、Task Focus、Run Detail、all-done 状态和 review/release report 摘要。

## 设计方向

- 风格：专业开发工具，接近 Linear、GitHub、Vercel Dashboard 的工作密度。
- 色调：白底为主，黑白灰承载层级，少量低饱和状态色用于 pass、blocked、risk。
- 目标用户：独立开发者、小团队技术负责人、接手老项目的开发者。
- 信息密度：高密度但清晰，默认隐藏长日志，只展示结论、证据和下一步。
- 交互原则：所有页面都以 artifact 为事实来源，不让用户手填重复状态。

## 数据源

| 数据源 | 路径 | 用途 |
|--------|------|------|
| Roadmap | `docs/productivity-roadmap.md`、项目根 `roadmap.md` | 当前阶段、长期目标、模块进度和风险 |
| Tasks | `docs/productivity-tasks.md`、项目根 `tasks.md` | 当前任务、状态、验收命令、阻塞原因 |
| Events | `.claude/workspace/events.jsonl` | 最近 run、checks、失败恢复、下一步建议 |
| Metrics | `.claude/workspace/metrics.md` | 趋势摘要、流程改进信号 |
| Journal | `.claude/workspace/journal.md` | 会话记忆、背景事实 |
| Reports | `.claude/workspace/reviews/`、`.claude/workspace/releases/` | 审查结论、发布结论、剩余风险 |
| Git | `git status`、`git log` | 未提交变更、最近提交、远端同步状态 |

## 页面总览

| 页面 | 目标 | 主要用户问题 |
|------|------|--------------|
| Today | 每天打开先看这一页 | 今天该做什么，哪里卡住 |
| Project | 看项目全局健康度 | 项目整体进度和风险如何 |
| Task Focus | 聚焦当前任务推进 | 当前任务验收标准是什么，下一步怎么继续 |
| Run Detail | 追溯一次命令执行 | AI 做了什么，检查是否通过，证据在哪 |
| Insights | 观察流程趋势 | 哪些问题反复出现，流程怎么改进 |

## Today

### 目标

让用户在 10 秒内知道今日焦点、当前阻塞、最近运行结果和下一步建议。

### 数据来源

- `events.jsonl`：最近 5 条 run、最新 Next Best Action、失败恢复记录。
- `tasks.md`：状态为 `in_progress`、`local_gate`、`review_gate`、`blocked` 的任务。
- `roadmap.md`：当前阶段和上游依赖。
- `git status`：未提交或未推送状态。

### 关键字段

- 今日焦点：当前优先级最高且可执行的任务。
- 当前阻塞：阻塞任务、阻塞原因、需要谁确认。
- 最近 run：命令、任务、状态、checks 摘要、时间。
- 下一步建议：action、reason、requires human confirmation、source。
- 今日 standup 草稿：最近完成、当前进行中、风险、下一步。

### 交互

- 点击 run 摘要进入 Run Detail。
- 点击任务进入 Task Focus。
- 点击阻塞项展开证据和需要的人类动作。
- 支持复制 standup 草稿。

## Project

### 目标

展示项目交付全局：当前阶段、roadmap 进度、质量门禁和风险。

### 数据来源

- `product-brief.md` 或 `project-profile/product.md`：目标用户和核心价值。
- `docs/productivity-roadmap.md` 或 `roadmap.md`：阶段、模块、依赖、验收标准。
- `events.jsonl`：最近活动和交付状态。
- review/release reports：风险和发布状态。

### 关键字段

- 项目目标：一句话定位、目标用户、本期范围。
- 当前阶段：Phase / Module / Task。
- 健康度：on track、watch、blocked。
- Roadmap 进度：done、in progress、planned、blocked。
- 风险和阻塞：风险描述、影响、缓解方案、来源。

### 交互

- 阶段筛选：全部、当前、阻塞、已完成。
- Roadmap 条目可展开验收标准和依赖。
- 风险项可跳转到关联 task、review report 或 release report。

## Task Focus

### 目标

把当前任务变成一个可执行的工作面板，减少用户在文档和聊天记录之间切换。

### 数据来源

- `tasks.md`：任务 ID、状态、描述、验收标准、验收命令、Gate 结果。
- `events.jsonl`：该任务最近 run 和恢复记录。
- `roadmap.md`：所属模块、依赖、风险。
- `git diff`：当前任务相关改动摘要。

### 关键字段

- 当前任务：ID、标题、状态、最近更新。
- 任务目标：一句话描述和范围边界。
- 验收标准：可检查结果。
- 验收命令：本地 gate、测试、review、ship。
- AI 当前阶段：planning、building、local gate、review gate、release gate。
- 需要用户确认：未决问题、阻塞原因、风险接受项。
- 最近动作：提交、检查、失败恢复、推送状态。

### 交互

- 一键复制继续命令：`$team-command-dev T*`。
- 一键复制检查命令：`$team-command-check` 或 `$team-command-review-all`。
- 展开 gate 结果查看证据，不默认展示长日志。
- 支持切换“当前任务”和“下一个建议任务”。

## Run Detail

### 目标

让任意一次命令执行都能被追溯：用户意图、AI 行为、变更、检查、决策和后续动作。

### 数据来源

- `events.jsonl`：run 的结构化事实。
- `git show`：关联提交的文件和摘要。
- review/release reports：审查和发布证据。
- `tasks.md`：任务当时的状态和 gate 结果。

### 关键字段

- Summary：status、affected files/modules、checks、next action。
- Changes：关键文件、提交 ID、变更类型。
- Checks：validate、test、gate、review、ship、push。
- Decisions：设计取舍、风险接受、人工确认。
- Recovery：失败类型、根因、恢复动作、最终状态。
- Logs：短证据链接或命令名，不内嵌长日志。

### 交互

- 从 checks 跳转到失败恢复记录。
- 从 artifact 跳转到本地文件。
- 支持按任务、命令、状态筛选 run。

## Insights

### 目标

只展示能改变下一步行为的趋势，不做漂亮但无用的统计图。

### 数据来源

- `events.jsonl`：结构化 metrics 字段。
- `.claude/workspace/metrics.md`：人类可读摘要。
- review/release reports：风险和审查打回原因。

### 关键字段

- Review 打回率：最近 N 次 review 的 reject 次数。
- 测试失败率：最近 N 次 `/dev` 和 gate 的测试失败次数。
- 自动化成功率：validate/test/gate/ship 的通过率。
- 阻塞时间：blocked 状态持续时间和阻塞来源。
- 估算偏差：estimateHours 与 actualHours 的差异。
- 流程建议：触发规则、证据、建议动作。

### 交互

- 趋势卡片只显示结论和证据入口。
- 点击建议查看触发数据和对应任务。
- 支持按时间范围筛选：最近 5 次、最近 10 次、最近 30 天。

## MVP 范围

### 第一版包含

- 静态 HTML 原型，覆盖五个视图。
- 本地 PoC，读取 `docs/productivity-tasks.md`、`docs/productivity-roadmap.md`、`.claude/workspace/events.jsonl`。
- Today 和 Task Focus 使用真实 artifact 数据。
- 其他视图允许先使用同一数据源的摘要或示例内容。

### 第一版不包含

- 不做登录、权限、云同步。
- 不做数据库。
- 不替代现有 `/dev`、`/standup` 等命令。
- 不直接修改 artifact，先只读展示。
- 不展示完整命令日志。
- 不作为 M1 成熟化主线，不决定状态源。

## 验收标准

- 打开原型后，首页 10 秒内能看出当前阶段、阻塞和下一步。
- Today 页面能展示最近 run 和 Next Best Action。
- Task Focus 能展示当前任务目标、状态、验收标准和 gate。
- Run Detail 能追溯一次 run 的 summary、checks、artifacts 和 next。
- Insights 至少展示 review、test、automation、blocked、estimate 五类趋势占位或真实摘要。
- 本地 PoC 能在无服务端、无云依赖的情况下生成可打开页面。
