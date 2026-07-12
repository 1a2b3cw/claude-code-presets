# N8 Cutover Or Converge Decision

> Decision ID：OD-N8-005
> Status：confirmed
> Decision Type：architecture,irreversible_operation,product_scope
> Target Module：N8
> Requested By：Product Lead / Architect-Planner
> Related Spec：.claude/workspace/features/n8-cutover-or-converge/spec.md

## Owner Decision Brief

- Decision: N8 是否按“项目治理层 + 成熟执行层复用”正式切换，还是继续保持验证状态，或收敛为轻量模板。
- Context: N8.1 已验证 project-preset 生命周期，N8.2 已验证 Owner Decision gate，N8.3 已在三个真实项目留下只读 Dogfood 证据，N8.4 已明确与 Superpowers 的边界。但 Claude Code 的 A1-A4 实机行为仍未取得模型输出：CLI 已登录，两个无工具 print 调用却在 34-64 秒内超时；D21 也是已有 PRD 的回放式验证。切换会改变状态读取与 legacy artifact 生命周期，不能把这些缺口静默抹平。
- Recommendation: 选择 A：正式切换为“治理层 + 执行层复用”，修复状态读取的多 feature 歧义，并只做可逆的 legacy `reference` 标记；同时把 Claude 未验证和 D21 回放局限作为接受风险写进最终报告。理由是核心差异已由确定性 gate 和三个外部项目证据支持，且 A 不删除历史信息、不安装或复制第三方执行层。
- Options:
  - A: 治理层切换（推荐）——保留 project facts/preset、Owner Decision、planning/change/operations evidence；通用执行层优先复用；修复状态读取，legacy 仅标 reference；接受 Claude/D21 两项有限证据风险。
  - B: 延后切换——N8 保持 in_progress，等待 Claude 实机 A1-A4 和实时无 PRD D21 成功后再决定；最严谨，但当前主线长期处于双重编号/迁移状态。
  - C: 轻量收敛——不再维护治理运行时，只保留文档模板/清单；维护成本最低，但会放弃已实现的 validator、Decision Gate 与可追溯状态读取价值。
- If no reply: 保持 N8.5 blocked；不改状态读取、不更新 roadmap、不归档或删除任何 artifact。

## Owner Confirmation

- Confirmed option: A
- Confirmed by: Owner
- Confirmation date: 2026-07-12
- Confirmation evidence: Owner 在 N8.5 选项中明确回复“A”。
- Accepted boundary: 切换为“MY2 项目治理层 + 成熟执行层复用”；只做状态读取修复与可逆 `reference` 生命周期标记，不删除历史 artifact；Claude gateway 502 导致的实机未验证和 D21 回放局限作为已接受、可追溯风险保留。
