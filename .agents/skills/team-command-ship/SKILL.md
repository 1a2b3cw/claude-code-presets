---
name: team-command-ship
description: Execute the ship workflow from this AI development team preset. Use when the user writes /ship, asks for ship, or wants the corresponding team process in Codex.
---

# team-command-ship

This skill ports the Claude Code `/ship` command workflow to Codex.

In Codex, invoke this as `$team-command-ship`. Do not rely on `/ship` unless Codex itself defines that slash command with the same meaning.

# /ship - 发布前检查

代码发布前的全面检查和部署流程。M 及以上任务必须通过 /ship 才能发布。

## 执行流程

```
1. 集成验证
   ├── 运行 /review-all（当前分支 diff vs main）
   ├── 所有测试通过？
   ├── 类型检查通过？（tsc --noEmit）
   └── Lint 无错误？

2. 安全审计
   ├── npm audit（无 high/critical）
   ├── 无硬编码密钥/密码
   ├── 输入已验证（Zod schema）
   └── 敏感操作已授权检查

3. 性能验证
   ├── Core Web Vitals 达标（LCP < 2.5s, CLS < 0.1）
   ├── 无 N+1 查询
   ├── 大列表已分页
   └── 图片/资源已优化

4. 无障碍检查
   ├── 关键交互元素有 aria 标签
   ├── 颜色对比度达标（WCAG AA）
   └── 键盘可操作

5. 配置检查
   ├── 环境变量已配置（.env.example 完整）
   ├── 数据库迁移已准备（含 rollback 脚本）
   └── CI/CD 配置已更新

6. Git 检查
   ├── 分支命名规范（feature/xxx, fix/xxx）
   ├── commit message 清晰（符合 Conventional Commits）
   └── 无敏感文件（.env, credentials, secrets）

7. 发布决策
   ├── 所有检查通过 → 可以发布
   ├── 有警告 → 用户确认后发布
   └── 有严重问题 → 打回修复

8. 部署（DevOps Agent）
   ├── 创建发布 tag
   ├── 执行部署脚本
   ├── 验证部署成功
   └── 记录发布日志
```

## 标准结果摘要

`/ship` 完成后必须输出固定的 `Summary` 块，供用户阅读，并作为 `events.jsonl` 的字段来源。

```markdown
## Summary
- status: completed / shipped / failed / blocked / skipped
- affected files/modules: [发布范围、报告路径、tag、关键配置或模块]
- checks: [review、test、typecheck、lint、security、performance、rollback 的最终结果]
- next action: [执行部署、发布后验证、继续修复或等待用户确认]
```

映射规则：
- `events.jsonl.summary` 使用 `status` + 一句话发布结论，例如 `completed: 发布检查通过，等待用户确认发布`。
- `events.jsonl.artifacts` 使用 `affected files/modules` 中的文件路径、tag 或发布报告。
- `events.jsonl.checks` 使用 `checks` 的结构化结果。
- `events.jsonl.next` 使用 `next action`。

## 事件记录

`/ship` 收尾时必须向 `.claude/workspace/events.jsonl` 追加 1 行 JSONL 事件。该文件是 `/standup` 和后续 metrics 的机器可读事实来源。

### events.jsonl 契约

每行是一个独立 JSON 对象，不允许跨行，不回写旧事件。

| 字段 | 必填 | 说明 |
|------|------|------|
| `time` | 是 | UTC ISO 8601 时间，如 `2026-07-09T10:00:00Z` |
| `command` | 是 | 固定为 `/ship` |
| `task` | 否 | 发布关联任务、版本或模块；没有则为 `null` |
| `status` | 是 | `completed` / `shipped` / `failed` / `blocked` / `skipped` |
| `summary` | 是 | 一句话发布检查或发布结果摘要 |
| `checks` | 否 | 发布门禁结果对象，如 `{"test":"pass","security":"pass","rollback":"pass"}` |
| `artifacts` | 否 | 发布报告、tag、关键配置或变更文件路径数组 |
| `next` | 否 | 发布后验证或下一步建议，或 `null` |

写入规则：
- 只在发布流程收尾时追加 1 条最终事件，不记录中间步骤。
- 如果 `.claude/workspace/` 或 `events.jsonl` 不存在，创建它们。
- 路径使用仓库相对路径，不记录绝对路径、密钥、token 或敏感数据。
- 写入失败时在最终输出中说明，但不改变发布检查结论。

示例：

```json
{"time":"2026-07-09T10:20:00Z","command":"/ship","task":"T0.2","status":"completed","summary":"completed: 发布检查通过，等待用户确认发布","checks":{"review":"pass","test":"pass","security":"pass","rollback":"pass"},"artifacts":["workspace/releases/2026-07-09-t0.2.md"],"next":"用户确认后执行部署"}
```

## 自动修复机制

- 安全问题 → 自动修复 → 重新检查
- 性能问题 → 列出优化建议，用户决定
- 测试失败 → 自动修 → 重试（最多 2 轮）
- 2 轮后仍有问题 → 列出剩余问题等用户决定

## 回滚检查

发布前必须确认回滚方案：
- [ ] 数据库迁移可逆（有 down 迁移）
- [ ] 旧版本镜像/包可用
- [ ] 回滚步骤已文档化
- [ ] 回滚触发条件已定义

## 输出格式

```markdown
# 发布检查报告

## 结论：✅ 可以发布 / ⚠️ 需要确认 / ❌ 需要修复

| 检查维度 | 结果 | 详情 |
|----------|------|------|
| 代码审查 | ✅ | /review-all 通过 |
| 测试 | ✅ | 所有测试通过 |
| 类型 | ✅ | tsc 无错误 |
| 安全 | ⚠️ | 1 个中等漏洞（已确认不影响） |
| 性能 | ✅ | LCP 1.8s |
| 无障碍 | ✅ | WCAG AA 达标 |
| 配置 | ✅ | .env.example 完整 |
| Git | ✅ | 分支和 commit 规范 |

## 回滚方案
- 回滚步骤：[具体命令]
- 回滚触发条件：[如错误率 > 1%]
- 旧版本：[tag/commit]

## 发布步骤
1. 合并 PR 到 main
2. 创建 tag: v1.2.3
3. 执行部署脚本
4. 验证部署
```

## 使用方式

```
/ship                    # 检查当前分支，准备发布
/ship --dry-run          # 只检查，不执行部署
```

## 参与角色

| 阶段 | 角色 | 职责 |
|------|------|------|
| 集成验证 | Reviewer | 运行 /review-all（含 code-review skill 逐文件审查），确保代码质量 |
| 安全审计 | Reviewer | code-review skill 安全维度 + /review-all 跨文件安全检查 |
| 性能验证 | Reviewer | code-review skill 性能维度覆盖 |
| 无障碍检查 | Reviewer | code-review skill 无障碍维度覆盖 |
| 配置检查 | DevOps | 环境变量、迁移、CI/CD |
| 部署 | DevOps | 执行部署、验证、回滚准备 |
| 最终决策 | 用户 | 确认是否发布 |

## 异常路径

| 场景 | 处理方式 |
|------|----------|
| /review-all 未通过 | 根据审查结果修复 → 重新 /ship |
| 安全漏洞无法立即修复 | 记录风险，用户决定是否接受 |
| 测试偶发失败 | 重试 2 次 → 仍失败则标记 flaky test，用户决定 |
| 部署失败 | 自动回滚 → 记录失败原因 → 通知用户 |
| 发布后发现问题 | 触发回滚 → 记录问题 → 进入 hotfix 流程 |
