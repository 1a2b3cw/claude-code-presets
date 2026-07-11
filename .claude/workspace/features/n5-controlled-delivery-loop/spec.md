# N5 受控开发循环 Spec

> 状态：active
> Spec ID：N5-SPEC-001
> Roadmap Module：N5
> Product Brief：`product-brief.md`
> Product Model：`product-model.md`
> Capability ID：C5
> Journey ID：J2,J3
> Architecture：`architecture.md`
> Architecture Component ID：A5
> Affected Components：A1,A4,A5,A6
> Dependency Direction：A2/A3/A4 -> A5 -> A6
> Security Impact：preflight 不读取或记录秘密；安全敏感任务必须声明风险等级和威胁模型
> Security Risk Level：standard
> Threat Model：N5 只处理开发流程自身的 artifact 完整性；不新增认证、授权、支付或个人数据处理面
> Operational Impact：仅新增本地只读 CLI 门禁；不替代 N7 的部署、监控、备份、恢复或发布验证
> 执行包：`.claude/workspace/features/n5-controlled-delivery-loop/`
> 更新于：2026-07-11

## 开工说明

N4 已让规划 artifact 可以追溯和校验，但 Builder 仍可在 spec/tasks 不完整、依赖未完成或安全信息缺失时直接开始。N5 将已有状态机变成一个只读、可执行的开工和迁移判定，不复制状态，也不把每次开发扩展成沉重流程。

## 本次包含

- 定义 A5 Controlled Delivery Contract、三种 preflight 结论和最小状态迁移规则。
- 增加 `delivery preflight` 与 `delivery transition` CLI；复用 N4 parser 读取主线。
- 将 `/dev`、Builder、`/check`、`/review-all` 和 `/ship` 接到同一判定方式，并同步 Claude/Codex 入口。
- 用 valid、缺 package/上游/依赖、安全敏感缺分析和错误迁移场景做回归验证。

## 本次不包含

- 自动修改 `tasks.md`、roadmap 或 events；状态所有权仍由 N4 合同定义。
- 自动影响图、跨功能变更同步或体验问题定位（N6）。
- 威胁建模模板、依赖审计策略、部署、监控、备份、恢复、回滚或上线门禁（N7）。

## 验收场景

### D4：准备充分的任务开工

输入：`delivery preflight N5 --task N5.2`，上游 N4 已完成，N5 spec/tasks 完整。

期望：返回 `pass`，说明该任务可从 `planned` 进入 `in_progress`，不读取 events 或 Workbench 作为状态源。

### D5：缺口或依赖阻止闷头开发

输入：任务缺少验收命令、目标 feature package 不存在、roadmap 依赖未完成，或安全敏感 spec 缺少威胁模型。

期望：返回具体 `needs_revision` 或 `blocked`，指出应修的 artifact/字段或应完成的依赖；Builder 不得开工。

### D6：小迭代不能跳过关键检查

输入：尝试从 `local_gate` 直接进入 `review_gate`，但 Gate 结果没有 `local pass`。

期望：`delivery transition` 拒绝迁移；补齐 local 证据后才通过。正常 N5.2 可在 preflight pass 后进入 `in_progress`。

## 验收标准

- N5 CLI 以 N4 事实链作为唯一输入，并用 `pass` / `needs_revision` / `blocked` 给出机器和人可读结果。
- 缺少上游产品、架构、依赖或安全风险信息时，开发前能停止并给出最小下一步。
- 状态迁移不写入第二份状态，且能阻止跳过 local/review/release 证据。
- Claude/Codex 的核心命令和 Builder 说明同一入口与状态责任。
- `npm run validate`、`npm test`、`npm run test:tarball`、planning/events/Workbench 检查和系统审查通过。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 门禁变成每步阻塞 | 仅对 M/L/XL 开工和明确状态迁移判定；S 级修复跳过，CLI 只读且输出最小动作 |
| 与 N4 状态所有权冲突 | 不提供写入命令，不保存副本，只解析 roadmap/spec/tasks |
| 把风险字段写成形式主义 | 高风险没有 `Threat Model` 明确返回 needs_revision；N7 再验证真实安全与运行证据 |
| Claude/Codex 行为漂移 | 修改 Claude 源命令/角色后运行 `update` 同步，并用生成入口 smoke 覆盖 |

## Spec/Task Quality Gate

- Product Lead：pass。C5 让用户不必监督 AI 是否在错误上下文中闷头开发。
- Architect-Planner：pass。N4 已提供单向可验证输入；本次只增加 A5 的只读判定和状态迁移契约。
- Delivery Steward：pass。合同不新增状态源，输出只说明当前缺口与下一步。
- Builder readiness：pass。
