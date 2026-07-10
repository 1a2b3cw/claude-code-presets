# AI 开发交付自动化任务清单

> 用法：每次只挑一个任务，把该任务下的 `/dev` prompt 复制到新对话里执行。
> 原则：小步推进、每步可验证、完成后测试、提交、推送。

## 当前主线

把项目从“AI 团队配置包”逐步升级为“AI 开发交付系统”。

优先顺序：

1. 先做轻量记忆飞轮。
2. 再做交付 artifact 标准化。
3. 再做 metrics 数据闭环。
4. 再做自然语言路由。
5. 再做 CI/发布门禁。
6. 最后做工作台和多项目能力。

---

## Phase 0：Development Memory Loop

目标：让每次开发、检查、审查、发布都留下结构化痕迹，并让 `/standup` 能读懂状态和下一步。

### T0.1 定义 events.jsonl 契约

- **状态**：done
- **目标**：定义 `.claude/workspace/events.jsonl` 的事件格式和写入规则。
- **范围**：
  - `.claude/commands/dev.md`
  - `.claude/commands/check.md`
  - `.claude/commands/review-all.md`
  - `.claude/commands/ship.md`
  - `.claude/commands/standup.md`
  - 同步后的 `.agents/commands/*`
  - 同步后的 `team-command-*` skills
  - `create-claude-team/scripts/smoke-test.js`
- **不做**：
  - 不做 UI
  - 不做数据库
  - 不实现真实事件写入代码
  - 不做复杂状态机
- **验收标准**：
  - 文档明确 event 字段。
  - dev/check/review-all/ship/standup 都声明何时追加 event。
  - smoke test 断言 Codex command skill 包含 `events.jsonl` 契约。
  - `npm run validate` 通过。
  - `npm test` 通过。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 0，实现 Development Memory Loop 的第一步：定义 .claude/workspace/events.jsonl 契约，并更新 dev/check/review-all/ship/standup 命令文档及 Codex 同步后的 command skills。

范围：
1. 更新 .claude/commands/dev.md、check.md、review-all.md、ship.md、standup.md。
2. 运行同步机制或手动保持 .agents/commands 与 team-command-* skill 一致。
3. 更新 smoke test，断言 Codex skill 包含 events.jsonl 契约。
4. 运行 npm run validate 和 npm test。
5. 提交并推送。

不做 UI、不做数据库、不实现真实事件写入代码，只做文档契约和测试守护。
```

### T0.2 让 dev/check/review-all/ship 产出标准结果摘要

- **状态**：done
- **目标**：每个命令完成后都必须输出可被 event 引用的结果摘要。
- **范围**：
  - `/dev` 输出开发摘要
  - `/check` 输出快检摘要
  - `/review-all` 输出审查摘要
  - `/ship` 输出发布检查摘要
- **验收标准**：
  - 每个命令文档都有固定的 summary 字段。
  - event 示例能引用 summary。
  - smoke test 覆盖关键文本。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 0，为 dev/check/review-all/ship 增加标准结果摘要契约。每个命令完成后都要输出可被 events.jsonl 引用的 summary，包括 status、affected files/modules、checks、next action。

同步 .agents 和 team-command-* skills，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。不做 UI、不做真实执行器。
```

### T0.3 强化 standup 的真实状态读取

- **状态**：done
- **目标**：`/standup` 从 roadmap、tasks、events、journal、git 中生成状态和下一步。
- **范围**：
  - `.claude/commands/standup.md`
  - `.agents/commands/standup.md`
  - `team-command-standup`
  - smoke test
- **验收标准**：
  - standup 数据源包含 `events.jsonl`、`roadmap.md`、`tasks.md`。
  - 输出包含“下一步建议”。
  - 输出包含“重复问题/流程改进建议”。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 0，强化 /standup：让它读取 events.jsonl、roadmap.md、tasks.md、journal.md、git log，输出当前状态、阻塞项、下一步建议和重复问题/流程改进建议。

同步 .agents 和 team-command-standup，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。不做 UI。
```

---

## Phase 1：Artifact + Status Standardization

目标：让产品、roadmap、spec、tasks、review、release 都有稳定格式和状态。

### T1.1 定义 product brief / PRD 契约

- **状态**：done
- **目标**：把产品想法沉淀为轻量 `product-brief.md` 或 `prd.md`。
- **范围**：
  - `/plan`
  - `/project-preset`
  - README / USAGE 可选小幅补充
- **验收标准**：
  - 明确 Product Brief 字段：目标用户、核心价值、本期范围、明确不做、验收标准。
  - `/plan` 能从 Product Brief 生成 roadmap。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 1，定义 product-brief.md / prd.md 契约，并更新 /plan 与 /project-preset 文档，让产品想法先沉淀为轻量 Product Brief，再生成 roadmap。

同步 Codex 入口和 command skills，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。
```

### T1.2 强化 roadmap.md 格式

- **状态**：done
- **目标**：让 roadmap 不只是模块列表，而是产品模块状态源。
- **字段建议**：
  - 模块 ID
  - 状态
  - 优先级
  - 复杂度
  - 依赖
  - 验收标准
  - 风险
  - 最近更新
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 1，强化 roadmap.md 输出格式：增加模块 ID、状态、依赖、验收标准、风险、最近更新，并让 /dev 完成模块后更新 roadmap 进度。

同步 .agents 和 team-command-plan/dev，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。
```

### T1.3 强化 tasks.md 状态机

- **状态**：done
- **目标**：让 tasks 成为执行计划和状态源。
- **状态建议**：
  - ready
  - needs_clarification
  - planned
  - in_progress
  - local_gate
  - review_gate
  - release_gate
  - blocked
  - shipped
  - done
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 1，强化 tasks.md 契约：增加任务状态机、阻塞原因、验收命令、gate 结果，并要求 /dev、/check、/review-all、/ship 更新对应状态。

同步 Codex 入口，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。
```

### T1.4 标准化 review report

- **状态**：done
- **目标**：`/review-all` 产出可沉淀的审查报告。
- **路径建议**：`workspace/reviews/<date>-<scope>.md`
- **字段**：
  - 结论
  - 变更范围
  - 问题列表
  - 严重度
  - 自动修复项
  - 剩余风险
  - 关联任务
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 1，标准化 /review-all 的 review report 契约，要求输出到 workspace/reviews/，并让 events.jsonl 记录 report 路径和审查结果。

同步 .agents 和 team-command-review-all，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。
```

### T1.5 标准化 release report

- **状态**：done
- **目标**：`/ship` 产出发布报告和回滚方案。
- **路径建议**：`workspace/releases/<date-or-version>.md`
- **字段**：
  - 发布结论
  - 检查结果
  - 风险
  - 回滚步骤
  - 发布后验证
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 1，标准化 /ship 的 release report 契约，要求输出到 workspace/releases/，包含发布结论、检查结果、风险、回滚步骤和发布后验证，并让 events.jsonl 记录 report 路径。

同步 .agents 和 team-command-ship，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。
```

---

## Phase 2：Metrics + Feedback Loop

目标：让 metrics 不只是记录，而能驱动流程改进。

### T2.1 扩展 events.jsonl 为结构化 metrics 来源

- **状态**：done
- **目标**：把 `events.jsonl` 设计为 metrics 的机器事实来源。
- **字段建议**：
  - taskId
  - command
  - level
  - status
  - checkIssueCount
  - checkFixRounds
  - reviewRejectCount
  - testFailureCount
  - estimateHours
  - actualHours
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 2，扩展 events.jsonl 契约为结构化 metrics 来源，并更新 /dev、/check、/review-all、/ship、/standup 文档说明如何写入和读取这些字段。

同步 Codex 入口，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。
```

### T2.2 让 standup 输出流程改进建议

- **状态**：done
- **目标**：`/standup` 根据 metrics 阈值给出下次流程调整建议。
- **规则示例**：
  - spec 否决 >= 3：强化需求摘要。
  - check 问题 >= 5：强制先写测试。
  - review 打回 >= 1：同模块每个子任务后强制 `/check`。
  - 测试失败 >= 1：要求补回归测试或记录原因。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 2，增强 /standup：基于 events/metrics 输出流程改进建议，并把建议追溯到具体数据来源。

同步 .agents 和 team-command-standup，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。
```

### T2.3 失败恢复记录标准化

- **状态**：done
- **目标**：记录测试失败、CI 失败、pack 失败、hook 误拦、发布失败。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 2，定义失败恢复记录契约：测试失败、CI 失败、pack 失败、hook 误拦、发布失败都要有固定字段，并让 /standup 能列出最近失败 Top N 和重复失败建议。

同步 Codex 入口，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。
```

---

## Phase 3：Intent Routing + Next Best Action

目标：用户不必记命令，表达目标后系统建议最合适的流程。

### T3.1 设计自然语言路由契约

- **状态**：done
- **目标**：定义用户意图到命令的路由规则。
- **路由示例**：
  - 做新产品：`/plan`
  - 做功能：`/dev`
  - 修 bug：`/fix`
  - 写完查错：`/check`
  - 合并前审查：`/review-all`
  - 发布：`/ship`
  - 看状态：`/standup`
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 3，设计自然语言 intent routing 契约：用户表达目标后，AI 应建议使用 /plan、/dev、/fix、/check、/review-all、/ship 或 /standup。先只做文档契约和 smoke test，不实现真实解析器。

同步 Codex 入口，运行 npm run validate 和 npm test，提交并推送。
```

### T3.2 定义 Next Best Action 输出格式

- **状态**：done
- **目标**：让 `/standup`、`/dev`、`/check`、`/review-all`、`/ship` 都能输出下一步建议。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 3，为核心命令定义 Next Best Action 输出格式。命令结束时必须告诉用户下一步应该做什么、为什么、是否需要人工确认。

同步 .agents 和 team-command-* skills，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。
```

### T3.3 定义 today 轻量视图

- **状态**：done
- **目标**：先用 `/standup` 输出 today 视图，不做 UI。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 3，为 /standup 增加 Today 轻量视图：今日焦点、当前阻塞、最近 run、下一步建议、风险提示。先只做命令输出契约，不做 UI。

同步 Codex 入口，更新 smoke test，运行 npm run validate 和 npm test，提交并推送。
```

---

## Phase 4：Executable Gates + CI

目标：让交付门禁可执行，而不只是写在文档里。

### T4.1 增加本地总门禁脚本

- **状态**：done
- **目标**：一条命令跑完 validate、test、pack dry-run。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 4，为 create-claude-team 增加本地总门禁脚本，运行 npm run validate、npm test、npm pack --dry-run --json，并检查 pack 清单。

更新 package.json scripts 和相关测试，运行新门禁、npm run validate、npm test，提交并推送。
```

### T4.2 增加 hook 行为测试

- **状态**：done
- **目标**：直接测试 hooks 是否拦截危险操作。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 4，为 security-check.mjs 和 bash-check.mjs 增加行为测试。测试 eval/new Function/innerHTML/child_process.exec/git reset --hard/git clean -f/npm publish 等危险输入。

要求 critical case exit code 为 2，普通输入不误拦。运行 npm run validate 和 npm test，提交并推送。
```

### T4.3 增加 tarball 安装冒烟

- **状态**：done
- **目标**：验证发布包场景可用。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 4，增加 npm pack 产物安装冒烟测试：从 tarball 安装到临时目录，执行 create-claude-team init --preset base --dry-run 和 validate。

运行 npm run validate 和 npm test，提交并推送。
```

### T4.4 增加 GitHub Actions CI

- **状态**：todo
- **目标**：PR 自动跑 validate/test/pack dry-run。
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 4，新增 GitHub Actions CI。PR 上运行 validate、test、npm pack --dry-run --json，至少覆盖 Linux 和 Windows。上传 pack dry-run JSON 为 artifact。

本地运行 npm run validate 和 npm test，提交并推送。
```

---

## Phase 5：Workbench MVP

目标：把状态、任务、run、standup、metrics 变成可看的工作台。

> 注意：这一阶段之后再做，不要过早开工。

### T5.1 设计 Workbench MVP 信息架构

- **状态**：todo
- **目标**：先做设计文档，不写代码。
- **页面**：
  - Today
  - Project
  - Task Focus
  - Run Detail
  - Insights
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 5，产出 Workbench MVP 信息架构文档。只写 docs/workbench-mvp.md，不写 UI 代码。内容包括 Today、Project、Task Focus、Run Detail、Insights 的目标、数据来源、关键字段和交互。

提交并推送。
```

### T5.2 做静态 HTML 原型

- **状态**：todo
- **目标**：生成可查看的静态原型。
- **Prompt**：

```text
/dev 按 docs/workbench-mvp.md 做 Workbench 静态 HTML 原型，包含 Today、Project、Task Focus、Run Detail、Insights 五个视图。只做静态原型，不接真实数据，不改 CLI。

完成后给出本地文件路径，提交并推送。
```

### T5.3 读取本地 artifact 的工作台 PoC

- **状态**：todo
- **目标**：从 roadmap/tasks/events 读取真实状态。
- **Prompt**：

```text
/dev 做 Workbench PoC：读取 roadmap.md、tasks.md、.claude/workspace/events.jsonl，展示 Today 和 Task Focus 两个视图。保持本地运行，不做登录、不做云服务。

完成后运行可用验证，提交并推送。
```

---

## Phase 6：Multi-project / Team

目标：支持多个项目和小团队协作。

### T6.1 多项目总览设计

- **状态**：todo
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 6，设计多项目总览方案。只写文档，不写代码。说明如何发现项目、读取状态、展示健康度、阻塞项、最近活动和下一步建议。

提交并推送。
```

### T6.2 团队 standup 格式

- **状态**：todo
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 6，扩展 /standup 输出三种版本：开发者版、团队版、产品版。先只做命令文档契约和 smoke test，不做 UI。

运行 npm run validate 和 npm test，提交并推送。
```

### T6.3 GitHub Issue / PR 集成规划

- **状态**：todo
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 6，规划 GitHub Issue/PR 集成。只写 docs/github-integration.md，不实现。说明 issue 到 task、review report 到 PR comment、release report 到 release notes 的映射。

提交并推送。
```

---

## Phase 7：Platform / Ecosystem

目标：当交付飞轮稳定后，再做生态能力。

### T7.1 外部 skill/agent 采纳 registry

- **状态**：todo
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 7，设计外部 skill/agent 采纳 registry。状态包括 watching、candidate、adopted、rejected。只写文档和模板，不实现自动安装。

提交并推送。
```

### T7.2 指标驱动规则推荐

- **状态**：todo
- **Prompt**：

```text
/dev 按 docs/productivity-roadmap.md 的 Phase 7，设计指标驱动的规则推荐机制：根据 repeated failures、review 打回、check 问题、估算偏差，建议新增、调整或删除 project rules。先只做文档契约。

提交并推送。
```

---

## 推荐开工顺序

1. T0.1 定义 events.jsonl 契约
2. T0.2 标准结果摘要
3. T0.3 强化 standup
4. T1.2 强化 roadmap
5. T1.3 强化 tasks
6. T1.4 review report
7. T1.5 release report
8. T2.1 metrics 结构化
9. T2.2 standup 流程建议
10. T4.1 本地总门禁
11. T4.2 hook 行为测试
12. T4.4 CI
13. T3.1 自然语言路由
14. T5.1 Workbench 信息架构

## 每次开新对话的通用模板

```text
/dev 按 docs/productivity-tasks.md 执行 [任务编号]：[任务名称]。

边界：
- 只做该任务范围内的内容。
- 不做任务中明确排除的事项。
- 保持现有风格。
- 同步 Claude/Codex 入口。
- 更新 smoke test 守护关键契约。
- 运行 npm run validate 和 npm test。
- 完成后提交并推送。
```
