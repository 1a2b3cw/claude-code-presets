# N8.1 Project Preset Lifecycle Review

> 结论：pass
> 关联任务：N8.1.1-N8.1.4 / roadmap N8.1
> 审查日期：2026-07-12
> 审查范围：Project Preset Contract、validator/context CLI、七个核心命令的加载契约、Claude/Codex 同步与打包产物

## 变更范围

- 新增 `create-claude-team/lib/project-preset.js`，提供只读 validator 与 context。
- 新增 `project-preset validate`、`project-preset context [--json]` CLI 子命令。
- 在 plan/dev/fix/check/review-all/ship/standup 中统一 Project Preset Lifecycle 读取与降级契约，并同步 Codex 入口。
- 新增 Project Preset Contract、fixture、smoke 与 tarball 安装测试。

## Phase 1：正确性、类型与边界

- pass：有效 preset、缺失 preset、缺 manifest 引用、禁止嵌套目录、未通过 curator 审查和空 specs 数组均有自动化覆盖。
- pass：`absent` 是非阻塞降级；`needs_revision` 为非零退出；只有 `pass` 产生可加载文件列表。
- pass：manifest 只接受直接文件名，拒绝路径分隔符，避免规则/spec 引用逃逸到 project-preset 目录之外。

## Phase 2：跨文件一致性

- pass：Project Preset Contract、CLI、`/project-preset` 生成命令和七个消费者入口使用同一加载顺序。
- pass：`.claude/` 源命令经同步后，`.agents/commands/` 与 `team-command-*` skills 保持一致；smoke 覆盖 init 和 update。
- pass：project-preset 不复制进 `.claude/`、`.agents/`、`.codex/`，与 update 的覆盖边界一致。

## 安全与可维护性

- pass：实现只读本地文件系统操作，不执行外部命令，不读取或写入秘密，不生成项目规则。
- pass：contract、validator 和 formatter 分层；空数组与 formatter 重读边界已在单文件审查中修复并加入回归测试。
- 无障碍：不适用，本轮无前端 UI。

## 验证证据

- `npm run validate`：通过。
- `npm run gate`：通过，包含 701 项 smoke test 和 `npm pack --dry-run`。
- `npm run test:tarball`：通过，验证已安装包的 help、base init、validate、project-preset validate/context fallback。
- `node create-claude-team/cli.js planning validate`：通过，8 个模块、8 个 feature package。

## Acceptance 风险

- 已验证：Owner/项目维护者可以确定 preset 是否可加载、具体要读哪些文件，以及无 preset 时会如何降级。
- 未宣称：context 仅证明“应读取什么”，不证明 agent 已经理解或遵守内容；该行为由 N8.3 的真实项目 dogfood 验证。

## 问题列表

无 critical / major / minor finding。

## Gate 结果

- review：pass
- critical：0
- major：0
- minor：0
- 修复轮次：1（单文件审查发现的空 specs 与 formatter 边界已修复）

## Artifact Cleanup

无。N8.1 新增的 Contract、Spec、Tasks 与 Review 各自拥有独立事实用途；未删除或替换既有 source-of-truth。

## 下一步

将 Lifecycle 内部任务 N8.1.1-N8.1.4 标记为已完成，并进入 roadmap N8.2 Owner Decision Gate；该后续阶段需要单独的 Owner Decision 行为测试，不应由本次 context CLI 代替。
