# N5 受控开发循环系统健康审查

> 结论：pass
> 关联任务：N5
> 审查类型：`/review-all --system N5`
> 日期：2026-07-11

## 结论

通过。A5 现在以 N4 的 canonical planning chain 为唯一输入，在实际写入实现前给出 `pass`、`needs_revision` 或 `blocked`。它只判定，不保存或回写状态；任务状态仍在 feature `tasks.md`，证据仍在 review/events/release。

## 审查范围

- 合同与执行包：`.claude/workspace/planning/delivery-contract.md`、N5 spec/tasks、roadmap。
- 实现：`create-claude-team/lib/delivery-control.js`、`planning-artifacts.js`、`cli.js`、local gate 与 smoke test。
- 入口：Claude 的 `/dev`、`/check`、`/review-all`、`/ship`、Builder，以及同步生成的 Codex commands/skills/agent。
- 发布完整性：npm pack dry-run 与 tarball install smoke。

## Dogfood

| 场景 | 结果 | 证据 |
|---|---|---|
| D4 准备充分的任务开工 | pass | `delivery preflight N5 --task N5.2` 与 `planned -> in_progress` 返回 pass。 |
| D5 缺口或依赖阻止开发 | pass | smoke 覆盖缺 feature package、依赖未完成、高风险缺 Threat Model，分别返回 blocked 或 needs_revision。 |
| D6 状态不能跳过检查 | pass | smoke 覆盖 `local_gate -> review_gate` 缺 local pass 被拒，补齐证据后通过。 |
| Claude/Codex 同步 | pass | `update` 后四个 Codex command docs 和对应 skills 都包含 Controlled Delivery Contract。 |

## 系统健康

- 架构形状：healthy。A5 只读取 A2/A3/A4，向 A6 提供验证事实；没有新增状态副本或跨层写入。
- 产品与验收：healthy。用户能在开工前得到明确结论、缺口和最小动作，而不是让 AI 在局部需求上继续实现。
- 一致性：healthy。命令和 Builder 统一调用同一 CLI；review/ship 只检查迁移，不复制 preflight 逻辑。
- 文档熵：可控。N5 新增的合同、spec、tasks 和 report 各自对应 A5 合同、范围/验收、执行状态和证据。

## 发现与修复

- minor，已修复：Gate 判定只接受全角 `：`，ASCII `:` 的等价 Markdown 会误拒；现已同时接受两种写法并覆盖回归。
- minor，已修复：新 `delivery-control.js` 未在本地发布包必检清单中显式声明；已加入并由 `npm run gate` 与 tarball smoke 通过。

## 剩余风险

- 高风险识别根据 spec 的 `Security Impact` 与风险等级字段工作，不能替代 N7 的威胁建模、依赖审计、发布、监控和恢复证据。
- Markdown 仍只解析稳定头部、任务字段和状态；自动影响图与跨功能同步留给 N6。
- Claude 实机 dogfood 按 Owner 策略留到 N8；当前由源命令、生成 Codex 入口和 init/update smoke 覆盖。

## Gate 结果

- review：pass
- critical：0
- major：0
- minor：2，均已修复
- fix rounds：1
- release：not_required

## 验证

- `node create-claude-team/cli.js update`：pass
- `node create-claude-team/cli.js planning validate`：pass
- `node create-claude-team/cli.js delivery preflight N5 --task N5.4`：pass
- `node create-claude-team/cli.js events validate`：pass
- `node workbench/poc/server.mjs --check`：pass
- `npm run gate`：pass（validate、649 smoke assertions、pack dry-run）
- `npm run test:tarball`：pass
- `git diff --check`：pass

## 下一步

N5 可以标记 done。下一主线为 N6：把体验反馈定位到产品、架构、规划和实现的归属，并基于 N5 的受控循环执行同步修改。
