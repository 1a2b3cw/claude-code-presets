# N3 架构主干 Spec

> 状态：active
> Spec ID：N3-SPEC-001
> Roadmap Module：N3 架构主干
> Product Brief：`product-brief.md`
> Product Model：`product-model.md`
> Capability ID：C3
> Journey ID：J1,J2,J3
> Architecture：`architecture.md`
> ADR：`.claude/workspace/decisions/2026-07-11-vnext-architecture.md`
> 执行包：`.claude/workspace/features/n3-architecture-backbone/`
> 更新于：2026-07-11

## 开工说明

N2 已定义产品能力，但仍没有说明命令、产品事实、架构决策、规划、开发与运行证据如何分层协作。N3 建立可演进的架构主干，让后续功能不再各自形成孤立设计，并让变更能定位到责任组件、依赖和安全边界。

## 本次包含

- 建立稳定的 `architecture.md` 与 ADR，覆盖组件、接口、数据/控制流、依赖方向、安全边界、迁移和兼容规则。
- 让 roadmap 映射 Architecture Component ID，并更新主链表达。
- 让 `/dev`、Architect-Planner、Delivery Steward 和 system review 在存在架构时读取并遵守它。
- 用静态契约、Codex dogfood 和 system health review 验证架构能指导实际判断。

## 本次不包含

- N4 的 artifact schema、引用自动验证、状态读取器改造。
- N5 的受控开发循环具体实现。
- N7 的具体监控、部署或恢复机制。
- 重写 Workbench、legacy 状态工具或当前所有命令。

## 架构契约

- Architecture 必须从 Product Model 的 Capability/Journey 出发，不能按现有代码目录倒推并固化旧结构。
- Architecture Component 必须有稳定 ID、职责、可读取事实和禁止拥有的事实。
- 任何下游规划或变更都必须能指出其 Component ID、依赖方向、安全边界和兼容影响。
- 只有影响跨组件接口、边界、安全、迁移或长期约束的决定需要 ADR；局部实现不需要。
- A7（Workbench/status/legacy）是只读投影和迁移层，不能成为主线事实源。

## 验收场景

### C1：体验影响能力的归属

输入：“我想在 `/dev` 前让 AI 自动分析用户体验问题会影响哪些产品、架构、规划和测试内容。”

期望：AI 映射到 C6/J3，说明当前应通过 A2/A3/A4/A5 的链路设计，推荐放入 N6 而不是直接向 A1 或 A7 堆功能。

### C2：旧视图不能反客为主

输入：“既然 Workbench 已经有状态卡片，就让它直接决定现在该做哪个模块。”

期望：AI 指出 A7 是只读视图，当前旧读取链存在迁移风险，推荐以 roadmap/feature package 为准并安排 N4/N8 处理。

### C3：跨组件变更

输入：“为了支持新平台，我想让 Codex 和 Claude 各自维护一份独立 roadmap。”

期望：AI 指出违反 A1 adapter 不拥有第二份产品状态的边界，推荐共享事实源；因涉及长期架构取舍，必须输出固定 Owner Decision Brief。

## 验收标准

- `architecture.md` 明确 A1-A7 组件、接口、依赖方向、数据流、安全边界、迁移与兼容规则。
- roadmap 具备 Capability ID 和 Architecture Component ID 映射，且不复制组件状态。
- L/XL `/dev`、架构角色、治理角色和 system review 都能读取架构并检查边界。
- Codex C1-C3 dogfood 通过；发现的行为缺口有修订和复验。
- `npm run validate`、`npm test`、`npm run test:tarball`、events 校验、`/review-all --system N3` 和 `git diff --check` 通过。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 架构过于抽象 | 使用 Component ID 映射当前 roadmap 与真实请求 dogfood |
| 层级取代产品判断 | A2 明确拥有产品事实，A3 只翻译为边界与依赖 |
| 兼容层扩散 | 只允许 A1/A7 使用，并记录退出条件 |
| 过早设计存储或自动校验 | 保留给 N4，N3 只定义关系与责任 |

## Spec/Task Quality Gate

- Product Lead：pass。C3 直接服务“局部修改不带偏全局”的用户价值。
- Architect-Planner：pass。采用平台无关的分层 artifact 架构，依赖 N2 已满足，不预设技术栈。
- Delivery Steward：pass。根架构文件承载稳定事实，ADR 保存高影响决策，执行信息留在 feature package。
- Builder readiness：pass。
