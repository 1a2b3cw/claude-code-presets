# N8.1.5 Project Preset Feedback Lifecycle Review

> 结论：blocked
> 关联任务：N8.1.5
> 模块：N8
> 范围：当前 worktree 中的 feedback proposal validator、CLI 入口、回归测试、Claude/Codex 同步命令与 N8 规划产物。
> 审查日期：2026-07-12

## 一句话结论

代码和跨文件契约通过审查：未确认的 proposal 会被确定性拦截，且测试证明校验不写入 Target Files。但 D25 的真实项目闭环必须等 Owner 确认 `PPFB-20260712-001` 的具体规则文本，因此任务不能标记 done。

## 变更完整性

- 新增 `project-preset feedback validate <proposal>`，只校验 `project-profile/feedback/` 下的候选修改。
- 只有 proposal 为 `confirmed`、包含 Owner 确认字段、目标文件在项目内且 preset 可加载时才返回 `pass`。
- `draft`/`awaiting_owner` 返回 `needs_confirmation`，CLI 以非零退出；`rejected`/`superseded` 不得放行。
- proposal 及 Target Files 都拒绝符号链接、外部路径、`.env` 等越界路径，减少读写项目外内容的风险。
- `/project-preset` 命令与生成的 Codex skill 同步为“proposal -> Owner -> curate -> validate/context”流程；`/standup` 改为仅建议 proposal，不直接更新 preset。

## 单文件审查

| 文件 | 正确性 | 安全性 | 可维护性/测试 | 结果 |
|---|---|---|---|---|
| `create-claude-team/lib/project-preset-feedback.js` | 状态机、必填字段、路径与确认分支完整 | 不自动写入，拒绝越界/符号链接 | 小函数分责，有 valid/pending/invalid CLI 回归 | pass |
| `create-claude-team/cli.js` | `feedback validate` 参数路径与退出码一致 | 仅调用只读校验 | help 与 JSON 输出可发现 | pass |
| `create-claude-team/scripts/smoke-test.js` | 覆盖 awaiting、confirmed、越界 target 和 CLI 退出码 | 校验未确认前规则文件不变 | 同步检查 Claude/Codex 命令契约 | pass |

无 UI 变更，无障碍维度不适用。

## 跨文件与系统健康

- 反馈历史位于 `project-profile/feedback/`，而不在 `project-preset/rules/`；符合“观察不等于规则”的 source-of-truth 边界。
- `project-preset` 只在 confirmed 后按最小 diff 更新，`skill-curator` 仍是规则分类与审查者。
- CLI、命令源文件、`.agents/commands/` 与 Codex command skills 已同步；测试覆盖 init/update 同步结果。
- N8 状态仍以 `roadmap.md` 与活跃 tasks 为准；本报告不覆盖规划状态。

## 验证证据

- `npm run gate`：pass，738 smoke tests、配置校验与 pack dry-run 通过。
- `npm run test:tarball`：pass，安装包可初始化并保留 project-preset fallback 契约。
- `node create-claude-team/cli.js planning validate`：pass。
- `node create-claude-team/cli.js events validate`：pass。
- PetCare Hub：`project-preset validate` / `context --json` 均为 pass；`PPFB-20260712-001` 为 `needs_confirmation`，没有修改 Target Files。

## Acceptance 风险与阻塞

- critical：0
- major：0
- minor：0
- 阻塞：Owner 需要确认 PetCare 是否要把 proposal 中的“验证报告分类”写入 `project-preset/rules/testing.md`。
- 确认后仍需依次运行 feedback validate、最小修改、skill-curator audit、project-preset validate/context 和真实项目 diff 核验。

## Gate 结果

- local：pass
- review：pass（代码与同步契约）
- release：not_required（但任务尚未完成）
- 任务状态：blocked（等待 Owner 对具体规则确认）

## 下一步

Owner 已拒绝 `PPFB-20260712-001`。PetCare 的 Target Files 保持不变，proposal 已留在 `project-profile/feedback/` 作为反馈证据。不自动用另一条规则替代；N8.1.5 继续 blocked，等待新的、实质不同的反馈或重复证据。

2026-07-12 补充修复：拒绝后 CLI 原本显示“尚未确认”，已改为明确输出“Owner 已拒绝，不得写入”，并增加回归测试。
