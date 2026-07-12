# N8.2 Owner Decision Gate Review

> 状态：active
> 关联模块：N8
> 关联任务：N8.2.1-N8.2.4
> 审查范围：Owner Decision Contract、`decision validate`、delivery preflight/transition、三级任务编号、Claude/Codex 入口与 smoke/tarball 验证
> 审查日期：2026-07-12

## 结论

pass。高影响任务在 spec 明确标记为需要 Owner Decision 时，缺 Brief、`awaiting_owner`、错误模块、缺类型或不在规定目录的 Brief 都不能进入实现；匹配的 `confirmed` Brief 才可放行。低风险 `no` 与既有未声明的 feature 保持原有流程。

## 变更完整性

- `decision validate <brief>` 只读校验 Brief 状态、模块、类型、固定章节与确认字段。
- `delivery preflight` 和进入 `in_progress` 的 transition 都可接收同一 `--decision`，没有第二套放行逻辑。
- `N8.2.1` 三级任务编号已由 planning parser 支持，现有 `N1.1` 格式兼容。
- `/plan`、`/dev`、`/ship`、Product Lead、Architect-Planner、Builder、DevOps 及生成的 Codex command skills 都声明：工具权限不等于 Owner 确认。

## 单文件与跨文件审查

| 维度 | 结果 | 说明 |
|---|---|---|
| 正确性 | pass | pending、confirmed、模块不匹配、低风险和 transition 都有行为测试。 |
| 安全与边界 | pass | Brief 必须位于 `.claude/workspace/decisions/`；不读取权限或秘密，不执行写操作。 |
| 可维护性 | pass | Brief 状态/类型集中在 `owner-decision.js`；delivery 只复用结果。 |
| 测试 | pass | smoke 覆盖 D16-D20；`npm run gate` 722 通过，tarball 安装 smoke 通过。 |
| Claude/Codex 一致性 | pass | 初始化与 update smoke 均检查 dev/ship command 与 skill 的 N8.2 契约。 |
| Acceptance | pass | 对 Owner 可观察的结果是：任务若声明需决策，CLI 会明确阻止开工并指出缺哪个确认；内部治理功能，无前端 UI。 |

## 审查中修复

- 发现初版仅校验 Brief 在仓库内，未强制其位于 `decisions/`。已补 `brief_path_invalid`，并加入回归测试；复审通过。

## 剩余风险

- Markdown 记录可验证结构和匹配关系，但不能独立证明确认消息一定来自人类；N8.3 必须以真实对话统计漏问和误打断。需要抗伪造证明时另行引入仓库外可信确认机制并走 Owner Decision。
- 本次不替代 N7 的 Threat Model、Readiness Brief、真实部署或回滚验证。
- 历史 Decision Brief 不自动获得 `confirmed` 身份；需要成为新 gate 证据时，Owner 必须按新合同重新确认。

## Artifact Cleanup

- 无新增重复事实源：Decision Brief 只拥有一次决策证据，spec/tasks 仍分别拥有范围和执行状态。
- 无删除或归档动作。

## Gate 结果

- local：pass
- review：pass
- critical：0
- major：0
- minor：0
- review fix rounds：1（目录边界校验）
- release：not_required

## 下一步

N8.2 可以标记 done；下一项是 N8.3 Real Project Dogfood，用真实新项目、已有项目与高风险改动验证是否真的会在正确时机询问 Owner。
