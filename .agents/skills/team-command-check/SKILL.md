---
name: team-command-check
description: Execute the check workflow from this AI development team preset. Use when the user writes /check, asks for check, or wants the corresponding team process in Codex.
---

# team-command-check

This skill ports the Claude Code `/check` command workflow to Codex.

In Codex, invoke this as `$team-command-check`. Do not rely on `/check` unless Codex itself defines that slash command with the same meaning.

# /check - 功能级快检

写完一个功能后立即执行的轻量检查。1 分钟内出结果。

## 和 /review-all 的区别

| 维度 | /check | /review-all |
|------|--------|-------------|
| **目的** | 写完一个功能后快速查错 | 合并前/上线前全面审查 |
| **范围** | 当前变更的文件 | 整个模块或分支 |
| **维度** | 3 个（逻辑 + 类型 + 边界） | 4 个跨文件维度（变更完整性+一致性+历史回归+依赖关系），逐文件 6 维度由 code-review skill 负责 |
| **耗时** | < 1 分钟 | 3-5 分钟 |
| **后续** | 有问题自动修 | 输出报告等你决定 |

## 检查内容（3 个维度）

### 1. 逻辑正确性
- 函数返回值是否符合预期类型
- 条件分支是否覆盖所有情况（if/else、switch/default）
- 异步操作是否有 await / .catch
- 错误处理是否完善（try-catch、错误边界）
- 循环是否有终止条件
- 空值/undefined/null 是否处理

### 2. 类型安全
- TypeScript 类型是否正确（any → unknown）
- 函数参数和返回值是否有类型标注
- 接口/类型定义是否完整
- 类型断言是否合理（as 类型 → 优先用类型守卫）

### 3. 边界条件
- 空数组/空对象/空字符串
- 零值/负值/最大值
- 数组越界
- 并发竞态
- 特殊字符（SQL 注入、XSS）

## 检查流程

```
1. 确定检查范围
   - 如果指定了文件：只检查指定文件
   - 如果没指定：检查当前 git diff 中变更的文件

2. 逐文件检查（3 个维度）

3. 输出结果
   - 没问题 → "✅ 快检通过，可以继续"
   - 有问题 → 列出问题 + 自动修复 → 重新检查

4. 自动修复规则
   - 能自动修的（类型错误、空值处理、缺少 await）→ 直接修
   - 需要判断的（逻辑错误、边界遗漏）→ 列出问题 + 修复建议，你确认后修
   - 修完后自动重新检查，最多 2 轮
   - 2 轮后仍有问题 → 列出剩余问题等你决定
```

## 事件记录

`/check` 收尾时必须向 `.claude/workspace/events.jsonl` 追加 1 行 JSONL 事件。该文件是 `/standup` 和后续 metrics 的机器可读事实来源。

### events.jsonl 契约

每行是一个独立 JSON 对象，不允许跨行，不回写旧事件。

| 字段 | 必填 | 说明 |
|------|------|------|
| `time` | 是 | UTC ISO 8601 时间，如 `2026-07-09T10:00:00Z` |
| `command` | 是 | 固定为 `/check` |
| `task` | 否 | 关联任务或模块 ID；没有则为 `null` |
| `status` | 是 | `completed` / `failed` / `blocked` / `skipped` |
| `summary` | 是 | 一句话快检结果摘要 |
| `checks` | 否 | 快检结果对象，如 `{"logic":"pass","types":"pass","boundary":"fail"}` |
| `artifacts` | 否 | 本次自动修复或检查涉及的关键文件路径数组 |
| `next` | 否 | 下一步建议，或 `null` |

写入规则：
- 只在快检收尾时追加 1 条最终事件，不记录中间步骤。
- 如果 `.claude/workspace/` 或 `events.jsonl` 不存在，创建它们。
- 路径使用仓库相对路径，不记录绝对路径、密钥、token 或敏感数据。
- 写入失败时在最终输出中说明，但不改变快检结论。

示例：

```json
{"time":"2026-07-09T10:05:00Z","command":"/check","task":"T0.1","status":"completed","summary":"快检通过，未发现逻辑、类型、边界问题","checks":{"logic":"pass","types":"pass","boundary":"pass"},"artifacts":["src/auth/login.ts"],"next":"继续 /review-all"}
```

## 输出格式

```markdown
# 快检报告

## 结论：✅ 通过 / ❌ 有问题

| 文件 | 逻辑 | 类型 | 边界 | 问题数 |
|------|------|------|------|--------|
| login.ts | ✅ | ✅ | ❌ | 1 |
| auth-service.ts | ✅ | ✅ | ✅ | 0 |

## 问题详情

### ❌ login.ts:45
**类型**：边界条件
**问题**：`password` 参数未检查空字符串
**修复**：添加 `if (!password.trim()) throw new ValidationError('密码不能为空')`
**状态**：已自动修复 / 等待确认

## 修复记录
- [x] login.ts:45 - 添加空字符串检查
```

## 使用方式

```
/check                              # 快检当前 git diff 中的变更
/check src/auth/login.ts            # 快检指定文件
/check src/features/auth/           # 快检指定目录
```
