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
   ├── 有警告 → 按 known risk 处理规则确认 accept/mitigate/defer
   └── 有严重问题 → 打回修复

8. 部署（DevOps Agent）
   ├── 创建发布 tag
   ├── 执行部署脚本
   ├── 验证部署成功
   └── 记录发布日志
```

## Known Risk 处理规则

`/ship` 不允许只写“有风险但可接受”。每个 known risk 必须有明确处置：

- `accept`：Owner 明确接受该风险后才可继续；报告必须写清影响范围、监控信号、回滚触发条件和确认人。
- `mitigate`：发布前必须完成缓解动作；缓解未完成时 release gate 不能 pass。
- `defer`：风险转为后续任务；必须写入任务 ID、负责人/确认人和不阻塞本次发布的理由。

高风险发布必须触发 Owner Decision Brief。高风险包括：安全或隐私风险、支付/权限/数据迁移、不可逆操作、回滚不完整、SLO/性能明显不达标、合规影响、用户承诺或 MVP 验收标准改变。

```markdown
## Owner Decision Brief
- Decision: [whether to release with this high risk]
- Context: [release scope, risk, impact, rollback readiness]
- Recommendation: [ship / delay / mitigate first, with reason]
- Options:
  - A: [recommended option] - [trade-off]
  - B: [alternative] - [trade-off]
  - C: [optional] - [trade-off]
- If no reply: [pause release / safe default]
```

## tasks.md 状态更新

## Controlled Delivery Contract

存在 `.claude/workspace/planning/delivery-contract.md` 时，`/ship` 只在发布检查和上线验证通过、`Gate 结果` 已包含 `release pass` 后运行：

```text
node create-claude-team/cli.js delivery transition <module> <task-id> shipped
```

该迁移不证明部署、安全或恢复已经充分完成；它只阻止跳过已经声明的 release evidence。N7 负责进一步定义真正的运行保障门禁。

如果仓库存在 `tasks.md`，或用户指定了任务/模块 ID，`/ship` 必须把它作为执行状态源同步更新：

- 开始发布检查时，将对应任务状态更新为 `release_gate`，并刷新最近更新日期。
- 发布检查通过但等待人工确认部署时，记录 `Gate 结果.release = pass`，状态保持 `release_gate`，并在阻塞原因或 next action 中说明等待谁确认。
- 更新时不要删除任务条目的验收标准、验收命令、阻塞原因、Gate 结果和产物字段。
- 发布或上线验证完成后，将状态更新为 `shipped`；无需真实发布的文档/配置任务可在发布检查通过后更新为 `done`。
- 发布检查失败且可自动修复时，记录失败项和修复轮次，修复后重新检查。
- 2 轮后仍失败、存在严重风险、known risk 未处置或等待用户接受风险时，将状态更新为 `blocked`，写明阻塞原因、风险处置状态和下一步确认人。

`tasks.md` 状态必须使用：`ready` / `needs_clarification` / `planned` / `in_progress` / `local_gate` / `review_gate` / `release_gate` / `blocked` / `shipped` / `done`。

## roadmap.md 状态更新

如果发布范围关联 `roadmap.md` 中的模块，`/ship` 也必须把 roadmap 作为产品模块状态源同步更新：

- 发布检查通过但等待人工确认部署时，保持模块状态为 `done`，刷新最近更新日期，并在风险或未决区记录等待确认。
- 发布或上线验证完成后，将对应模块状态从 `done` 更新为 `shipped`，刷新最近更新日期，并保持进度区已打勾。
- 发布检查失败、存在严重风险或等待用户接受风险时，将对应模块状态更新为 `blocked`，在风险或未决区记录阻塞原因。
- 更新 roadmap 时不要删除模块 ID、依赖、验收标准、风险和最近更新字段。

## Release Report 契约

`/ship` 必须产出可沉淀的发布报告，路径为：

```text
.claude/workspace/releases/YYYY-MM-DD-<version-or-scope>.md
```

命名规则：

- `<version-or-scope>` 优先使用版本号或 tag，如 `v1.2.3`；没有版本时使用任务 ID、模块 ID、目录名或分支名的短横线形式。
- 如果 `.claude/workspace/releases/` 不存在，先创建目录。
- 报告路径必须写入 Summary 的 `affected files/modules`，并写入 `events.jsonl.artifacts`。

报告必须包含以下字段：

- **发布结论**：`ready` / `needs_confirmation` / `blocked` / `shipped`，并给一句话原因。
- **关联任务**：任务 ID、模块 ID、版本号或发布范围；没有则写 `无`。
- **发布范围**：分支、tag、变更模块、关键配置和报告关联的 review report。
- **检查结果**：review、test、typecheck、lint、security、performance、accessibility、config、git、rollback 的 pass/fail/warn。
- **风险**：已知风险、影响范围、风险处置（accept / mitigate / defer）、确认人和是否需要 Owner Decision Brief。
- **回滚步骤**：具体命令、旧版本/tag、数据回滚方式、触发条件。
- **发布后验证**：上线后要检查的页面、接口、日志、监控指标或人工验收项。
- **Gate 结果**：release gate 的 pass/fail、警告数、阻塞项和确认人。
- **Owner Decision Brief**：高风险发布时必须记录决策摘要；无高风险时写“无”。
- **下一步**：执行部署、等待确认、继续修复、回滚或进入 hotfix。

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
- `events.jsonl.artifacts` 使用 `affected files/modules` 中的文件路径、tag 或发布报告，必须包含 `.claude/workspace/releases/YYYY-MM-DD-<version-or-scope>.md`。
- `events.jsonl.checks` 使用 `checks` 的结构化结果。
- `events.jsonl.next` 使用 `next action`。

### Next Best Action 契约

`/ship` 完成、阻塞或等待确认时必须输出固定的 Next Best Action，告诉用户下一步应该做什么、为什么、是否需要人工确认。

```markdown
## Next Best Action
- action: [建议执行的命令或人工动作，如执行部署、等待用户确认、修复发布门禁、回滚]
- reason: [为什么现在应该做这一步，引用 release gate、风险、回滚准备或 release report]
- requires human confirmation: yes / no
- source: [依据来源，如 release report、review report、checks、tasks.md、events.jsonl]
```

写入规则：
- `Summary.next action` 必须与 `Next Best Action.action` 保持一致或可直接追溯。
- 如果 `requires human confirmation: yes`，必须说明谁需要确认什么。
- 如果发布门禁失败或回滚方案缺失，Next Best Action 不得建议继续部署。
- 如果存在未处置 known risk 或高风险发布尚未完成 Owner Decision Brief，Next Best Action 必须指向风险确认或缓解动作。

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

#### Metrics 扩展字段

`events.jsonl` 同时是结构化 metrics 的机器事实来源。`/ship` 收尾事件应尽量写入这些可选字段；未知时用 `null`，计数无发生时用 `0`：

| 字段 | 说明 |
|------|------|
| `taskId` | 标准任务、模块、版本或发布范围 ID；优先等于 `task` |
| `level` | 任务级别：`S` / `M` / `L` / `XL`；未知为 `null` |
| `specRejectCount` | 继承任务的 spec 否决次数；未知为 `null`，无发生为 `0` |
| `checkIssueCount` | 发布检查发现的问题数；没有则 `0` |
| `checkFixRounds` | 发布检查自动修复轮数 |
| `reviewRejectCount` | 发布前 `/review-all` 打回次数 |
| `testFailureCount` | 发布门禁测试失败次数 |
| `estimateHours` | 继承任务或发布估算；没有则为 `null` |
| `actualHours` | 发布检查或部署实际耗时；没有记录则为 `null` |

#### 失败恢复记录契约

当 `/ship` 遇到测试失败、CI 失败、pack 失败、hook 误拦或发布失败，并且本次流程进行了自动修复、重试、回滚或最终阻塞时，收尾事件必须写入可选对象 `failureRecovery`。无失败发生时省略该对象。

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
- 只在发布流程收尾时追加 1 条最终事件，不记录中间步骤。
- 如果 `.claude/workspace/` 或 `events.jsonl` 不存在，创建它们。
- 路径使用仓库相对路径，不记录绝对路径、密钥、token 或敏感数据。
- 写入失败时在最终输出中说明，但不改变发布检查结论。

示例：

```json
{"time":"2026-07-09T10:20:00Z","command":"/ship","task":"T0.2","taskId":"T0.2","level":"M","status":"completed","summary":"completed: 发布检查通过，等待用户确认发布","checks":{"review":"pass","test":"pass","security":"pass","rollback":"pass"},"specRejectCount":0,"checkIssueCount":0,"checkFixRounds":0,"reviewRejectCount":0,"testFailureCount":0,"estimateHours":null,"actualHours":null,"artifacts":[".claude/workspace/releases/2026-07-09-t0.2.md"],"next":"用户确认后执行部署"}
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

## 发布后验证

发布后验证必须覆盖：
- 用户主流程或本次发布关联的 acceptance 场景。
- 错误率、延迟、关键业务指标或日志查询。
- 风险处置项中的监控信号和回滚触发条件。
- 需要人工确认时，写明确认人和确认窗口。

## 输出格式

```markdown
# 发布检查报告

> 路径：.claude/workspace/releases/2026-07-09-v1.2.3.md

## 结论：✅ 可以发布 / ⚠️ 需要确认 / ❌ 需要修复

## 关联任务
- 任务：T1.5
- 版本：v1.2.3

## 发布范围
- 分支：feature/user-auth
- tag：v1.2.3
- Review report：.claude/workspace/reviews/2026-07-09-auth.md

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
- 数据回滚：[迁移 down 命令或无需数据回滚的说明]

## Known Risks
| 风险 | 影响 | 处置 | 确认人 | 证据/后续 |
|------|------|------|--------|-----------|
| 1 个中等漏洞 | 仅影响开发依赖，不进入生产包 | accept | Owner | npm audit 结果 + 生产包清单 |
| 首屏监控缺少告警 | 发布后发现性能回退较慢 | mitigate | DevOps | 发布前补 dashboard alert |
| 次要浏览器兼容性 | 不影响 MVP 主用户 | defer | Product Lead | 后续任务 T-browser |

## Owner Decision Brief
- Decision: 是否在中等漏洞已确认不影响生产包的前提下发布
- Context: 发布门禁其他项通过，回滚方案完整，该风险已标记为 accept
- Recommendation: 发布；发布后观察安全扫描和错误率
- Options:
  - A: 发布 - 更快交付，接受已界定风险
  - B: 延迟发布先升级依赖 - 风险更低，但延迟交付
- If no reply: 暂停发布

## 发布步骤
1. 合并 PR 到 main
2. 创建 tag: v1.2.3
3. 执行部署脚本
4. 验证部署

## 发布后验证
- 页面/接口：[需要验证的入口]
- 日志：[需要观察的错误日志]
- 监控：[错误率、延迟、关键业务指标]
- 人工验收：[用户或负责人确认项]

## Gate 结果
- release: pass
- warnings: 0
- blockers: 0
- approver: [用户/负责人]

## Summary
- status: completed
- affected files/modules: .claude/workspace/releases/2026-07-09-release.md, v1.2.3
- checks: review pass / test pass / typecheck pass / lint pass / security pass / rollback pass
- next action: 用户确认后执行部署
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
| 安全漏洞无法立即修复 | 按 known risk 规则标记 accept/mitigate/defer；高风险必须 Owner Decision Brief |
| 测试偶发失败 | 重试 2 次 → 仍失败则标记 flaky test，用户决定 |
| 部署失败 | 自动回滚 → 记录失败原因 → 通知用户 |
| 发布后发现问题 | 触发回滚 → 记录问题 → 进入 hotfix 流程 |
