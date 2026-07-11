# N3 架构主干系统健康审查

> 结论：pass
> 关联任务：N3
> 审查类型：`/review-all --system N3`
> 日期：2026-07-11

## 结论

通过。A1-A7 已把产品、架构、规划、交付、证据和只读视图分开；N3 的产物、入口契约与 roadmap 映射相互一致。没有 critical 或 major 问题。

## 审查范围

- 架构与决策：`architecture.md`、`.claude/workspace/decisions/2026-07-11-vnext-architecture.md`
- 上游及规划：`product-model.md`、`roadmap.md`、N3 spec/tasks
- Claude/Codex 契约：`.claude/commands/dev.md`、`.agents/commands/dev.md`、对应 Codex skill、核心角色与 smoke test
- 证据：Codex dogfood、`npm run validate`、`npm test`、`npm run test:tarball`、events、metrics、Workbench check

## Dogfood

| 场景 | 结果 | 证据 |
|---|---|---|
| C1 体验影响归属 | pass | 正确映射 C6/J3，指出应经 A2/A3/A4/A5 分析并进入 N6。 |
| C2 旧视图不能反客为主 | pass | 正确拒绝 Workbench 决策，识别 A7 只读，建议以 roadmap/feature package 为主线。 |
| C3 双 roadmap | pass | 正确拒绝 A1 拥有第二份产品状态，推荐共享 `roadmap.md` 与平台适配视图，并输出 Owner Decision Brief。 |

首次 C3 只给出普通建议，未形成明确的固定决策简报。已将 `/dev` 的架构读取契约强化为：命中高影响架构条件时必须按固定格式输出 Owner Decision Brief，不能以一句“需要 Owner 决策”代替；同步到 Claude/Codex 入口后，C3 复验通过。

## 系统健康

- 架构形状：healthy。A1 仅适配，A2-A6 单向传递事实，A7 是只读投影；roadmap 的 C3/A3 映射有效。
- 产品与验收：healthy。C3 服务“局部修改不偏离整体”的用户价值；验收覆盖实际请求判断和可重复工具检查。
- 一致性：healthy。`node create-claude-team/cli.js update` 无差异；616 个 smoke tests 覆盖源配置与生成入口。
- 文档熵：可控。稳定事实位于根文档，决策位于 ADR，执行状态位于 feature package；未发现重复状态源。

## 风险与清理

- minor，已接受：旧 status/Workbench 仍展示 M6 主线。它已被限定为 A7 兼容视图，不能作为 N1-N3 状态源；N4 定义读取优先级，N8 执行迁移和清理。
- deferred：Claude 实机 dogfood 按 Owner 策略在 N8 前完成；当前已由同步生成和静态契约保证入口一致。
- 无需删除 artifact；没有发现死代码或需要合并的重复架构文档。

## Gate 结果

- review：pass
- critical：0
- major：0
- minor：1（已登记 A7 legacy 风险）
- fix rounds：1（C3 Decision Brief 契约强化后复验）

## 验证

- `node create-claude-team/cli.js update`：pass
- `npm run validate`：pass
- `npm test`：pass，616 passed / 0 failed
- `npm run test:tarball`：pass
- `node create-claude-team/cli.js events validate`：pass
- `node create-claude-team/cli.js metrics update`：pass
- `node workbench/poc/server.mjs --check`：pass，已知 legacy drift 已记录
- `git diff --check`：pass

## 下一步

进入 N4 规划产物体系，落实 artifact ID、引用校验和读取优先级；不在 N3 重写 A7 或提前实现运行保障。
