# 多项目总览方案

## 目标

多项目总览把多个仓库的交付状态汇总到一个轻量视图里，让用户不用逐个打开项目也能知道：

1. 哪些项目健康，哪些项目需要关注。
2. 哪些项目当前被阻塞，阻塞原因是什么。
3. 最近发生了什么交付活动。
4. 每个项目下一步最应该做什么。

第一版只定义文件优先的读取方案和展示契约，不实现 UI、不做云同步、不替代 GitHub Projects 或 Jira。

## 适用场景

| 场景 | 用户问题 | 总览价值 |
|------|----------|----------|
| 独立开发者维护多个 side project | 哪个项目该先继续 | 聚合最新 run、阻塞和 next action |
| 小团队负责人看多个仓库 | 哪个仓库有质量或发布风险 | 汇总 gate、review、release 状态 |
| 接手老项目组合 | 哪些项目上下文缺失 | 标出缺少 roadmap/tasks/events 的项目 |
| 发布窗口前检查 | 哪些项目不能发布 | 汇总 release gate、阻塞项和回滚报告 |

## 项目发现

### 输入来源

| 来源 | 说明 | 第一版优先级 |
|------|------|--------------|
| 手工清单 | `workspace/projects.json` 或 `workspace/projects.md` | 高 |
| 当前工作区子目录 | 扫描指定根目录下包含 `AGENTS.md` 或 `.claude/` 的目录 | 中 |
| Git remotes | 从项目目录读取 `git remote -v` | 中 |
| GitHub organization | 后续通过 GitHub API 发现 repo | 低，T6 不实现 |

### 推荐清单格式

`workspace/projects.json`：

```json
[
  {
    "id": "claude-code-presets",
    "name": "Claude Code Presets",
    "path": "D:/CD/MY2",
    "owner": "1a2b3cw",
    "repo": "claude-code-presets",
    "priority": "high",
    "tags": ["tooling", "ai-delivery"]
  }
]
```

### 项目有效性判断

一个目录满足任一条件即可作为候选项目：

- 存在 `AGENTS.md`。
- 存在 `.claude/commands/` 或 `.agents/skills/`。
- 存在 `.claude/workspace/events.jsonl`。
- 存在 `roadmap.md`、`tasks.md`、`docs/productivity-tasks.md` 中任意一个。

缺少关键 artifact 的项目不直接丢弃，而是在总览中标记为 `needs_setup`。

## 状态读取

### 每个项目读取的 artifact

| Artifact | 路径 | 用途 |
|----------|------|------|
| Project identity | `AGENTS.md`、`README.md`、`project-profile/product.md` | 项目名、定位、目标用户 |
| Roadmap | `roadmap.md`、`docs/productivity-roadmap.md` | 当前阶段、模块进度、风险 |
| Tasks | `tasks.md`、`docs/productivity-tasks.md` | 当前任务、阻塞、验收命令 |
| Events | `.claude/workspace/events.jsonl` | 最近 run、checks、next action、失败恢复 |
| Metrics | `.claude/workspace/metrics.md` | 趋势和流程改进信号 |
| Reports | `workspace/reviews/`、`workspace/releases/` | 审查、发布、回滚证据 |
| Git | `git status`、`git log`、`git remote -v` | 工作区是否干净、远端同步、最近提交 |

### 读取顺序

1. 读取项目清单或发现候选目录。
2. 对每个项目读取 identity 和 git remote。
3. 读取 tasks，定位 `blocked`、`in_progress`、`review_gate`、`release_gate`。
4. 读取 events，取最近 5 条 run 和最新 `next`。
5. 读取 review/release reports，提取未解决风险。
6. 合成项目健康度、阻塞项、最近活动和下一步建议。

## 健康度模型

### 状态枚举

| 状态 | 含义 |
|------|------|
| `healthy` | 最近 gate 通过，无阻塞，有明确下一步 |
| `watch` | 有轻微风险、缺少部分 artifact、或最近 activity 停滞 |
| `blocked` | 存在 blocked 任务、失败恢复未完成、或需要人工确认 |
| `needs_setup` | 缺少基本 artifact，无法可信判断状态 |
| `unknown` | 读取失败或路径不可访问 |

### 判定规则

优先级从高到低：

1. 读取失败或路径不存在 → `unknown`。
2. 缺少 tasks 和 events → `needs_setup`。
3. 存在 blocked task 或最新 event status 为 `blocked` → `blocked`。
4. 最新 review/release 有 critical/major 未解决 → `blocked`。
5. 最近 3 次 run 有失败恢复或 gate fail → `watch`。
6. Git 有未提交变更且最近任务为 done/shipped → `watch`。
7. 最新 gate pass 且有 next action → `healthy`。
8. 其他情况 → `watch`。

## 阻塞项展示

### 阻塞来源

| 来源 | 示例 |
|------|------|
| Task blocked | `docs/productivity-tasks.md` 中状态为 `blocked` |
| Event blocked | 最新 `/dev` 或 `/ship` event 状态为 `blocked` |
| Review blocked | review report 有 critical/major 未解决 |
| Release blocked | release report 标记不允许发布 |
| Human decision | Next Best Action 需要人工确认 |

### 展示字段

- 项目名。
- 阻塞类型。
- 阻塞摘要。
- 需要谁确认什么。
- 证据来源：task、event、review report 或 release report 路径。
- 最小解除动作。

## 最近活动

### 活动类型

- `/dev` 完成或阻塞。
- `/check` 发现问题或通过。
- `/review-all` 审查通过或打回。
- `/ship` 发布检查通过或失败。
- Git commit / push。
- 新增 review/release report。

### 展示字段

- 时间。
- 项目。
- 命令或 git 动作。
- 状态。
- checks 摘要。
- 关联 task。
- artifacts。

## 下一步建议

### 生成规则

| 项目状态 | Next Best Action |
----------|------------------|
| `blocked` | 指向解除阻塞的最小人工动作 |
| `needs_setup` | 运行 `$team-command-project-preset` 或补齐 tasks/events |
| `watch` 且有 review 打回 | 先修 review findings |
| `watch` 且 gate fail | 运行 `/fix` 或补测试 |
| `healthy` 且有 planned task | 继续下一个 task |
| `healthy` 且 release_gate | 运行 `/ship` |
| 无 next | 运行 `/standup` 刷新状态 |

### 建议字段

- `action`：建议执行的命令或人工动作。
- `reason`：为什么现在做这一步。
- `requiresHumanConfirmation`：是否需要人工确认。
- `source`：依据 artifact。

## 总览视图结构

### 顶部汇总

- 项目总数。
- Healthy / Watch / Blocked / Needs Setup 数量。
- 最近 24 小时活动数。
- 需要人工确认数。

### 项目列表

| 字段 | 说明 |
|------|------|
| Project | 项目名、路径、repo |
| Health | 健康度和原因 |
| Current task | 当前任务或阶段 |
| Latest run | 最新命令、状态、checks |
| Blockers | 阻塞数量和摘要 |
| Next | 下一步建议 |

### 风险队列

按严重程度排序：

1. blocked release。
2. critical/major review finding。
3. gate fail。
4. human confirmation needed。
5. stale project。

### 最近活动流

按时间倒序展示跨项目事件，默认 20 条，可按项目和命令过滤。

## 数据缓存与刷新

第一版可以每次打开时即时读取，不做常驻服务。

后续如果项目数量增加，再引入：

- `workspace/project-index.json`：项目清单和最后读取时间。
- `workspace/project-state-cache.json`：派生状态缓存，可随时重建。
- 手动刷新：重新读取所有项目。
- 增量刷新：只刷新最近变更的项目。

## 非目标

- 不做权限系统。
- 不把多个项目的 artifact 合并成一个中央数据库。
- 不自动修改子项目状态。
- 不跨项目自动执行命令。
- 不替代 GitHub Projects、Jira 或 Linear。

## 验收标准

- 给定 `workspace/projects.json` 后，可以定义每个项目应读取哪些 artifact。
- 能说明项目健康度如何从 tasks/events/reports/git 派生。
- 能说明阻塞项、最近活动、下一步建议的字段和来源。
- 缺少 artifact 的项目不会被误判为 healthy，而是进入 `needs_setup`。
- 多项目总览不要求用户手动维护重复状态。
