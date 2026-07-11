# N7 Operational Readiness Decision

> 状态：active
> Decision ID：OD-N7-001
> 模块：N7
> 决策日期：2026-07-11

## Owner Decision Brief

- Decision: N7 以平台无关的运行准备度合同作为发布门槛，不在团队配置生成器中绑定真实云平台或自动执行生产操作。
- Context: C7 必须降低 Owner 的上线安全和运维风险，但当前仓库是 CLI/配置生成器，没有单一生产环境可安全代表所有下游项目。
- Recommendation: 采用合同 + 只读 CLI + `/ship`/DevOps 入口；由各项目 preset、CI/CD 和 DevOps 补充真实部署、监控、备份、恢复和回滚执行。
- Options:
  - A: 平台无关合同 - 保持跨项目适用性，并强制证据完整。
  - B: 内置单一云模板 - 上手更快，但会把不适用的供应商假设带入所有项目。
- If no reply: 执行 A；任何真实生产发布仍由 `/ship` 和 Owner 确认。

## 安全边界

- Readiness Brief 只保存脱敏证据、命令、负责人和 artifact 路径，不保存秘密或用户数据。
- high risk 必须将 Threat Model、架构/安全边界和 Owner Decision 一并带入发布审查。
- 真实环境的权限、密钥、告警目标和备份位置保持在项目的 secret manager、CI/CD 或运行手册中。
