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
   - 重复问题检测只统计非 `/standup` 事件，且优先统计 `failed` / `blocked` 状态；连续出现相同失败 `checks`、相同 `blocked` 状态或相同 `next` 卡住时，输出到“重复问题/流程改进建议”。
   - `/standup` 自己追加的事件只用于证明状态汇报发生过，不参与重复问题判断。

4. **读取 journal / metrics / git**
   - journal 用于补充历史决策、用户偏好和长期上下文。
   - metrics 用于补充 check 问题数、review 打回、测试失败和估算偏差趋势。
   - git log 用于校验最近实际提交，避免只根据聊天状态汇报。

5. **合成规则**
   - 优先级：`tasks.md` 当前状态 > `roadmap.md` 模块状态 > `events.jsonl` 最近事件 > journal/metrics/git。
   - 同一任务多处状态冲突时，输出“数据不一致”并说明来源，不强行猜测。
   - 没有任何结构化文件时，也要基于 git log 和 journal 给出最小汇报。

## 事件读取与写入

`/standup` 必须读取 `.claude/workspace/events.jsonl`，用最近事件补充当前状态、阻塞项、下一步建议和重复问题。读取失败或文件不存在时，继续使用 TaskList、Git log、metrics、journal 生成汇报，并在输出中说明事件流缺失。

汇报生成后，`/standup` 也必须向 `.claude/workspace/events.jsonl` 追加 1 行 JSONL 事件，记录本次状态汇报已经生成。

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

写入规则：
- 只在汇报收尾时追加 1 条最终事件，不记录中间步骤。
- 如果 `.claude/workspace/` 或 `events.jsonl` 不存在，创建它们。
- 路径使用仓库相对路径，不记录绝对路径、密钥、token 或敏感数据。
- 写入失败时在最终输出中说明，但不阻止状态汇报输出。

示例：

```json
{"time":"2026-07-09T10:30:00Z","command":"/standup","task":null,"status":"completed","summary":"已生成项目状态汇报，下一步建议执行 T0.2","checks":{"events":"pass","git":"pass","metrics":"pass","journal":"pass"},"artifacts":[".claude/workspace/events.jsonl"],"next":"T0.2"}
```

## 输出格式

```markdown
# 项目状态汇报
日期：YYYY-MM-DD

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
- [重复问题] → [数据来源：events/metrics/journal/git] → [流程改进建议]
- 无明显重复问题时输出：暂无明显重复问题。

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
