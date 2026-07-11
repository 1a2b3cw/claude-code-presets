# N7 安全、发布与运行保障 Spec

> 状态：active
> Spec ID：N7-SPEC-001
> Roadmap Module：N7
> Product Brief：`product-brief.md`
> Product Model：`product-model.md`
> Capability ID：C7
> Journey ID：J2
> Architecture：`architecture.md`
> Architecture Component ID：A6
> Affected Components：A1,A3,A5,A6
> Dependency Direction：A1/A3/A5 -> A6 -> A2(feedback)
> Security Impact：Readiness Brief 不得存储秘密；high risk 必须关联 Threat Model 与 Owner Decision，缺失时发布被阻止
> Security Risk Level：standard
> Threat Model：输入是本地 Markdown artifact；攻击面是伪造、遗漏或包含秘密的运行证据；控制措施为固定字段/章节校验、high risk 强制决策和秘密模式拒绝
> Operational Impact：新增运行保障合同和只读 `operations validate` CLI；真实部署、监控、备份、恢复和回滚仍由项目的 CI/CD 与 DevOps 执行
> 执行包：`.claude/workspace/features/n7-operational-readiness/`
> 更新于：2026-07-11

## 开工说明

C7 要让 Owner 不必独自承担上线后的安全与运维风险。N5 已能控制开发开工，N6 已能定位变更影响，但 `/ship` 仍主要依靠人工检查表。N7 以平台无关的运行准备度合同和验证器，把安全、回滚、观测、恢复与事故响应变成发布前可检查的证据。

## 本次包含

- 定义 A6 Operational Readiness Contract 与 Readiness Brief 的字段、风险等级、证据边界和生命周期。
- 增加 `operations validate <brief>`，校验模块引用、完整章节、高风险 Threat Model/Owner Decision、完成状态 checkbox 和秘密泄露模式。
- 让 `/ship`、DevOps、Claude/Codex 生成入口在发布前使用同一合同。
- 以真实 N7 Brief、有效/无效高风险 Brief 和生成入口 smoke 验证闭环。

## 本次不包含

- 绑定特定云、容器、监控、告警、备份或事件管理供应商。
- 自动执行生产部署、备份、恢复、回滚、密钥轮换或事故通知。
- 将 Readiness Brief 变成 roadmap/tasks/events 的第二状态源，或在 N8 前删除 legacy 工具。

## 验收场景

### D10：高风险发布缺安全决策会被阻止

输入：一份 Risk Level 为 `high`，但缺 Threat Model 或 Owner Decision 的 Readiness Brief。

期望：`operations validate` 返回 `needs_revision`，指出缺口；不得将普通 known risk 文字当作放行依据。

### D11：完整运行准备度可验证

输入：一份关联 N7、章节和 checkbox 完整的 standard Readiness Brief。

期望：CLI 返回 `pass`；用户能从一处看到部署/回滚、观测/告警、备份/恢复、事故响应及验证证据，且 `/ship` 要求引用该结果。

### D12：运行证据不接收秘密

输入：含有明显 API token、密码、私钥或连接串的 Readiness Brief。

期望：CLI 返回 `blocked`，提示改用 secret manager/env 引用和已脱敏证据。

## 验收标准

- 高风险功能有 Threat Model、Owner Decision、回滚和运行保障证据，缺失时无法被声明为 complete。
- 所有准备发布的模块能记录部署、观测、备份恢复和事故响应，而不泄露秘密或绑定平台。
- `/ship`、DevOps、Claude/Codex 入口一致地要求运行准备度通过；代码生成和 tarball 安装后不漂移。
- N7 不宣称真实环境已部署或已恢复，只验证证据和明确下一步责任。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 运行模板变成冗长表单 | 只规定跨平台最低证据，preset 提供具体技术步骤 |
| 文档写完整但运行事实不真 | 证据项要求命令、负责人和检查窗口；真实部署验证留给 `/ship`/CI/CD |
| Brief 写入秘密 | 校验器拒绝常见明文秘密模式，合同要求只引用 secret manager/env |
| 高风险被已知风险表绕过 | high risk 强制 Threat Model 和 Owner Decision；缺失直接 needs_revision |

## Spec/Task Quality Gate

- Product Lead：pass。C7 将“代码能跑”扩展为 Owner 可理解的上线与恢复保障，但不要求 Owner 决定具体云平台。
- Architect-Planner：pass。N7 只扩展 A6 证据层，读取 A2-A5 已确认事实，不改变 A2-A5 的状态所有权。
- Delivery Steward：pass。Readiness Brief 与 release report 分别拥有准备度和发布结论，不创建额外状态数据库。
- Builder readiness：pass。
