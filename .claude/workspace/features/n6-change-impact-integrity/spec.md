# N6 变更影响与完整性 Spec

> 状态：active
> Spec ID：N6-SPEC-001
> Roadmap Module：N6
> Product Brief：`product-brief.md`
> Product Model：`product-model.md`
> Capability ID：C6
> Journey ID：J3
> Architecture：`architecture.md`
> Architecture Component ID：A4,A5
> Affected Components：A1,A2,A3,A4,A5,A6
> Dependency Direction：A6(feedback) -> A2/A3 -> A4 -> A5 -> A6
> Security Impact：Change Impact Brief 不得记录秘密或未脱敏用户数据；security 变更必须指向 Threat Model 和 N7 证据
> Security Risk Level：standard
> Threat Model：N6 不引入新的安全功能；只确保安全类变更不会绕过 Architecture/N7 的分析入口
> Operational Impact：operational 变更会列出运行证据缺口，但部署、监控、恢复和回滚门禁由 N7 定义
> 执行包：`.claude/workspace/features/n6-change-impact-integrity/`
> 更新于：2026-07-11

## 开工说明

N5 能阻止信息不完整时开工，但用户提出体验问题后，AI 仍缺少一个可验证的方式回答“它归谁、会影响什么、要同步哪些文档/测试、改完如何证明没有破坏主线”。N6 为该判断建立 Change Impact Brief 和只读校验器。

## 本次包含

- 定义 Change Impact Contract、Brief 位置、字段、Change Kind、同步项和完整性规则。
- 增加 `change analyze`：从 N4 主链定位模块、能力、Journey、组件、依赖/使用方和建议同步项。
- 增加 `change validate`：验证 Brief 的引用、章节、Kind 对应同步项和验证计划。
- 将 `/fix`、`/dev`、Builder 与 `/review-all` 接到 Brief 工作流，并同步 Claude/Codex。
- 在 delivery preflight 中可选验证 `--change <brief>`，让实际修改可以携带已通过的影响分析。

## 本次不包含

- 解析任意语言的调用图、自动修改源代码、自动更新所有文档或自动接受 Owner 决策。
- N7 的威胁模型深度、依赖审计、发布、监控、备份、恢复和回滚实现。
- 删除 legacy artifacts 或替换 A7 视图（N8）。

## 验收场景

### D7：体验反馈可定位

输入：“N1 的探索结果让我看不清建议依据”，目标模块 N1，Kind `experience`。

期望：`change analyze N1 --kind experience` 返回 C1、J1、A2/A4/A5 的归属，指向 Product Model、feature spec/tasks、实现/测试和依赖模块；不把 status 或 events 当作主事实。

### D8：架构变更不漏同步

输入：一份 `architecture` Change Impact Brief，但同步项中没有 `architecture.md` 或 ADR。

期望：`change validate` 返回 `needs_revision`，指出缺少的 artifact；补齐后通过。

### D9：已批准的影响分析进入受控开发

输入：结构正确的 experience Brief 和 `delivery preflight N6 --task N6.2 --change <brief>`。

期望：preflight 通过；Brief 的 Target Module、Capability、Journey、组件和验证计划可追溯。上游无效或 Brief 不完整时停止开发。

## 验收标准

- 用户反馈能定位到一个主归属层，并给出从产品、架构、规划到实现/证据的影响范围和建议同步项。
- Brief 无法伪造或遗漏上游引用、架构类 ADR 同步、安全/运行类 N7 入口或验证计划。
- N5 可以可选地要求通过 Brief 验证后才开始对应修改；不会创建新状态源。
- Claude/Codex 的定点修复、开发、Builder 和 review 文档使用同一合同。
- `npm run gate`、`npm run test:tarball`、planning/events/Workbench 与系统审查通过。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| Brief 变成冗长表单 | Kind 只要求最低同步项，CLI 输出最小动作，普通局部修复可保持短 Brief |
| AI 仍漏掉真正代码依赖 | Brief 显式声明自动调用图不在本次范围，review 继续检查实际 diff；真实项目验证后再决定是否工具化 |
| 影响分析取代上游事实 | Brief 只引用原始 artifact，不能自动改写 A2/A3/A4 |
| 安全/运行责任被提前宣称完成 | security/operational Kind 强制指向 N7，不以 Brief 代替运行证据 |

## Spec/Task Quality Gate

- Product Lead：pass。C6 让 Owner 能理解一处体验修改的归属、代价和完整性，而不是被代码细节淹没。
- Architect-Planner：pass。复用 N3/N4/N5 的 ID、依赖和 gate，不引入调用图数据库或新的状态源。
- Delivery Steward：pass。Brief 是一次性分析证据，路径和生命周期明确，不与 roadmap/spec/tasks 重复拥有事实。
- Builder readiness：pass。
