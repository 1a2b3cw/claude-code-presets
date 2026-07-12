# N8.3 Real Project Dogfood Decision

> Decision ID：OD-N8-003
> Status：confirmed
> Decision Type：product_scope,security_privacy
> Target Module：N8
> Requested By：Product Lead / Architect-Planner
> Related Spec：.claude/workspace/features/n8-real-project-dogfood/spec.md

## Owner Decision Brief

- Decision: 选择 N8.3 的三个 Dogfood 项目、每个项目允许的写入范围，以及高风险场景只验证到哪一步。
- Context: 真实 Dogfood 必须使用 Owner 的项目才有价值，但向外部项目写入 preset、planning artifact 或代码会改变其状态；高风险场景若没有明确边界，容易把验证变成真实风险操作。
- Recommendation: 选择 B：Owner 明确提供一个新项目目录、一个已有项目目录（可优先考虑 D:\CD\ai-kefu）和一个仅用于安全门禁验证的非生产范围；每个场景先只读，任何写入另行逐项确认。
- Options:
  - A: 使用 D:\CD\ai-kefu 加两个新建 sandbox；启动快，但新建 sandbox 的真实度较低。
  - B: Owner 指定三个项目/范围；证据最可信，需先明确写入边界。
  - C: 只完成 Ledger 模板和只读预检；风险最低，但不能完成 N8.3 的真实价值验证。
- If no reply: 停在只读预检和试验设计，不进入任何外部项目。

## Owner Confirmation

- Confirmed option: B
- Confirmed by: Owner
- Confirmation date: 2026-07-12
- Confirmation evidence: Owner 明确回复“随便你怎么搞，权限都给你。三个项目 D:\\CD\\ai-kefu，D:\\code\\PetCare_Hub，D:\\AI\\tounao\\sub-manager。”
- Approved mapping and boundary:
  - D21 使用 `D:\\code\\PetCare_Hub\\petcare_hub`；只读探索其已有 PRD 与工程约束，不写入项目。
  - D22 使用 `D:\\CD\\ai-kefu`；只读验证既有规则和当前 roadmap，不触碰其已有 dirty worktree。
  - D23 使用 `D:\\AI\\tounao\\sub-manager`；只验证高风险请求的“先决策、未确认拦截”行为，不执行数据库、认证、密钥、推送、发布或任何不可逆动作。
  - 允许写入仅限本仓库 `D:\\CD\\MY2\\.claude\\workspace\\dogfood\\` 及 N8.3 执行包，用于脱敏证据和结论。
