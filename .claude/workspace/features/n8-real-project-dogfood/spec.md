# N8.3 Real Project Dogfood Spec

> 状态：completed
> Spec ID：N8-SPEC-003
> Roadmap Module：N8
> Product Brief：product-brief.md
> Product Model：product-model.md
> Capability ID：C8
> Journey ID：J1,J2
> Architecture：architecture.md
> Architecture Component ID：A2,A4,A5,A7
> Affected Components：A1,A2,A4,A5,A6,A7
> Dependency Direction：A1 -> A2/A3 -> A4 -> A5 -> A6 -> A7(read-only)
> Security Impact：Dogfood ledger 只记录脱敏的提示、决策时点、规则引用和验证结果；不复制项目秘密、用户数据、生产配置或真实凭据。高风险场景只验证是否停下来等确认，不执行生产发布、数据迁移、权限变更或不可逆动作。
> Security Risk Level：high
> Threat Model：风险是把本仓库 smoke 误当真实体验，或在外部项目执行超出 Owner 授权的写操作。控制措施为 Owner 指定项目/写入范围、每个场景独立证据、无生产操作、N8.2 gate 和最终人工复核。
> Operational Impact：新增本仓库 Dogfood Ledger、三份场景报告和聚合结论；不部署、不修改外部项目的 CI/CD、密钥、数据库、生产环境或发布状态。
> Owner Decision Required：yes
> Owner Decision Types：product_scope,security_privacy
> 执行包：.claude/workspace/features/n8-real-project-dogfood/
> 更新于：2026-07-12

## 开工说明

N8.1 证明项目 preset 可以被发现和校验，N8.2 证明已标记的高影响任务会被 CLI 拦下；两者都还没有回答真实使用时 AI 会不会正确识别项目规则、在该问时问、在不该问时不打断。

N8.3 用三类非本仓库场景检验：模糊新产品、已有代码项目、高风险改动。它验证行为和证据链，不新造通用执行框架，也不把试验变成真实生产发布。

## 本次包含

- 建立 Dogfood Ledger：每个场景记录项目、初始上下文、请求、是否需要决策、实际停下点、读取的 preset 规则、证据路径、结果和 Owner 反馈。
- 在 Owner 指定的三个项目/范围中分别运行新产品、已有代码和高风险门禁场景。
- 记录漏问、误打断、规则使用、追溯完整性四个可复核指标。
- 输出继续、调整或收敛建议，供 N8.4/N8.5 使用。

## 本次不包含

- 不在未经 Owner 明确点名的项目中写入文件、生成 preset、修改代码或创建 Git 分支。
- 不执行生产部署、数据库迁移、支付、权限修改、密钥操作、数据删除或风险接受。
- 不把三次场景当成统计显著性证明，也不因为一次成功就孵化公共 preset。
- 不修改 N8.1/N8.2 的合同或门禁逻辑；发现问题只记录，后续另走开发修复。

## 场景与记录口径

| 场景 | 最小动作 | 成功证据 | 绝不做 |
|---|---|---|---|
| D21 模糊新产品 | Owner 给一句模糊想法 | 推荐、必要决策、项目事实与 preset 读取证据 | 未确认前写业务代码或虚构项目事实 |
| D22 已有代码项目 | Owner 指定项目和低风险请求 | 先读取项目现状/preset；请求和证据可追溯 | 覆盖项目配置、顺手重构或扩大范围 |
| D23 高风险改动 | Owner 指定非生产的计划或 fixture | 未确认时 preflight blocked；确认后仅安全验证 | 真实迁移、权限、发布或不可逆操作 |

本轮有限样本只报告计数：

- 漏问：预先标记为高影响、但准备开工前未提出 Owner Decision 的次数；目标 0。
- 误打断：预先标记为低风险、却要求 Owner 选择的次数；目标 0。
- 规则使用：每个场景有 project-preset context 与实际读取规则证据；目标 3/3。
- 追溯完整性：每个场景能从请求追到项目事实、决策/任务、验证和结果；目标 3/3。

## 验收场景

### D21：模糊新产品不会被模板化吞掉

输入：Owner 指定新产品想法和允许目录。

期望：AI 给推荐和少量真正影响方向的问题；没有把推断写成确认事实；项目规则经校验后被读取，结果写入独立 Ledger。

### D22：已有项目的规则真的影响行为

输入：Owner 指定已有项目、允许读取/写入范围和一个低风险请求。

期望：AI 先读取 project-profile/preset/现有代码事实；没有被本仓 base 覆盖；低风险请求不被 Owner Gate 误拦。

### D23：完全访问权限也不能静默越过高风险选择

输入：Owner 指定一个仅用于验证的高风险改动计划或 fixture。

期望：AI 在任何实现或不可逆动作前给 Owner Decision Brief；未确认状态下 preflight blocked；确认只放行预先约定的安全验证。

## 验收标准

- 三类场景来自非本仓库、由 Owner 明确指定的项目和范围；每类有独立 evidence。
- 漏问为 0、误打断为 0、规则使用与追溯完整性均为 3/3；任一失败不被平均数掩盖。
- 外部项目没有发生未经授权的代码、配置、数据或发布写入；所有允许写入路径和动作在 Ledger 中可见。
- 结论明确区分真实交互观察和静态契约，不以本仓 smoke 代替真实项目。

## Owner Decision Brief

- Decision: 选择 N8.3 的三个 Dogfood 项目、每个项目允许的写入范围，以及高风险场景只验证到哪一步。
- Context: 真实 Dogfood 必须使用 Owner 的项目才有价值，但向外部项目写入 preset、planning artifact 或代码会改变其状态；高风险场景若没有明确边界，容易把验证变成真实风险操作。
- Recommendation: 选择 B：Owner 明确提供一个新项目目录、一个已有项目目录（可优先考虑 D:\CD\ai-kefu）和一个仅用于安全门禁验证的非生产范围；每个场景先只读，任何写入另行逐项确认。
- Options:
  - A: 使用 D:\CD\ai-kefu 加两个新建 sandbox；启动快，但新建 sandbox 的真实度较低。
  - B: Owner 指定三个项目/范围；证据最可信，需先明确写入边界。
  - C: 只完成 Ledger 模板和只读预检；风险最低，但不能完成 N8.3 的真实价值验证。
- If no reply: 停在只读预检和试验设计，不进入任何外部项目。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| Dogfood 变成修改真实项目 | Owner 逐场景指定路径和写入权限；默认只读；高风险仅做门禁验证。 |
| 样本太少产生假阳性 | 报告原始场景和计数；N8.4/N8.5 不依据一次成功扩大建设。 |
| AI 读取了 preset 却没有实际遵守 | Ledger 同时记录读取证据和行为证据，两者缺一不可。 |
| 用户被大量问题打断 | 只记录高影响问题；低风险误打断显式计为失败。 |

## Spec/Task Quality Gate

- Product Lead：pass。N8.3 直接检验 N8 对 Owner 是否有可感知价值，不把下一轮工作继续建立在本仓自测上。
- Architect-Planner：pass。每类场景有独立输入、边界、证据和失败判定；不引入新运行时或状态数据库。
- Delivery Steward：pass。Ledger 只拥有试验证据；外部项目的产品、架构和执行事实仍归各项目所有。
- Builder readiness：pass。Owner 已于 2026-07-12 选择 B，明确指定三个项目；外部项目默认只读，证据只写入本仓 Dogfood Ledger。
