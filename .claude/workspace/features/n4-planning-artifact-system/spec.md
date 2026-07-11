# N4 规划产物体系 Spec

> 状态：active
> Spec ID：N4-SPEC-001
> Roadmap Module：N4
> Product Brief：`product-brief.md`
> Product Model：`product-model.md`
> Capability ID：C4
> Journey ID：J1,J2,J3
> Architecture：`architecture.md`
> Architecture Component ID：A4
> Affected Components：A1,A4,A5,A7
> Dependency Direction：A3 -> A4 -> A5/A7(read-only)
> Security Impact：planning artifact 不得保存密钥、token 或未脱敏输入
> Operational Impact：CLI status 与 Workbench 仅投影 canonical planning artifacts
> 执行包：`.claude/workspace/features/n4-planning-artifact-system/`
> 更新于：2026-07-11

## 开工说明

N1-N3 已分别定义产品、产品模型和架构，但 `roadmap.md`、feature spec/tasks、CLI status 与 Workbench 还没有共同的可机器验证合同。N4 将现有 Markdown 固化为单向、可追溯的 A4 Planning Context，不引入第二份状态数据库。

## 本次包含

- 定义 Planning Artifact Contract、稳定 ID、引用字段、状态所有权和读取优先级。
- 迁移 N1-N4 feature package 的 spec/tasks 头部到统一合同。
- 实现规划 artifact 校验器和 CLI 入口，并添加回归测试。
- 让 status 与 Workbench 优先读取 vNext roadmap/feature package；legacy M6 仅为回退视图。
- 用真实 planning 场景 dogfood 与系统审查验证可追溯性和视图一致性。

## 本次不包含

- 新建数据库、JSON 状态副本或自动写回模型。
- N5 的受控开发门禁、N6 的完整影响图、N7 的运行保障实现。
- 删除旧 docs 或 Workbench；N8 根据真实迁移结果再清理。

## 验收场景

### D1：从任务追溯上游

输入：“N4.2 需要改什么，为什么现在做它？”

期望：AI 能从 task -> spec -> N4 -> C4/J1,J2 -> A4 映射，说明依赖 N2/N3，不把 events 或 Workbench 当事实源。

### D2：状态所有权冲突

输入：“把 N4 在 tasks 写成 done，同时 roadmap 仍保持 planned，反正 events 会说明真实结果。”

期望：AI 拒绝，指出 tasks 是执行状态、roadmap 是模块状态、events 是证据；要求按合同更新对应事实而非让事件裁决。

### D3：同一当前主线

输入/检查：根 roadmap 的当前模块为 N4，feature tasks 为 in_progress。

期望：CLI status 与 Workbench 都显示 N4，而不是旧 M6。

## 验收标准

- 每个 active feature package 都能验证 Module、Capability、Journey、Architecture Component 和 tasks 的引用链。
- 无论 Claude/Codex 命令、CLI status 还是 Workbench，当前主线都以 root roadmap/feature package 为准。
- 校验器能拒绝缺失 ID、未知 Capability/Journey/Component、状态词非法、module/spec 不一致及越权状态源。
- `npm run validate`、`npm test`、`npm run test:tarball`、planning validate、events、Workbench 与 `/review-all --system N4` 通过。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| Markdown 解析脆弱 | 只解析稳定头部与表格，保持人可读，测试覆盖非法输入 |
| 再造第二状态源 | Contract 只定义字段和读取顺序，不存状态副本 |
| legacy 视图继续带偏 | CLI/Workbench 明确 vNext-first，缺失时才回退 |
| 历史 package 不符合新头部 | 一次性迁移 N1-N3，校验器把缺口定位到文件和字段 |

## Spec/Task Quality Gate

- Product Lead：pass。C4 让用户无需在多份文档间猜测当前事实。
- Architect-Planner：pass。只实现 A4 合同、校验与只读投影，依赖 N2/N3 已满足。
- Delivery Steward：pass。每类事实只有一个 owner，legacy 保留 reference 状态。
- Builder readiness：pass。
