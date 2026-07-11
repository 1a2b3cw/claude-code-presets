# Operational Readiness Contract

> 状态：active
> Contract ID：ORC-VNEXT-001
> Planning Contract：PAC-VNEXT-001
> Delivery Contract：CDC-VNEXT-001
> Architecture ID：ARCH-VNEXT-001
> Owner：A6 Evidence & Operations
> 更新于：2026-07-11

## 目的

将“能发布”从一份主观检查表变成可审计的运行保障证据。它不绑定云平台、监控供应商或部署方式；每个准备发布的高影响模块必须明确安全风险、部署与回滚、观测与告警、备份与恢复、事故响应及验证证据。

## 事实与边界

- roadmap、spec/tasks 仍拥有产品范围和执行状态；release report 仍拥有一次发布的结论；Readiness Brief 只拥有运行保障准备度。
- 本合同不会执行部署、创建备份、发送告警或保存秘密。它验证声明、证据和责任是否完整，真实环境验证由项目 preset、CI/CD 和 DevOps 完成。
- 任何密钥、token、密码、真实连接串或未脱敏用户数据不得进入 Brief、release report 或 events。
- 高风险不由 Brief 自行接受。安全、隐私、权限、支付、不可逆数据迁移、不可恢复回滚或明确 SLO 违约必须附 Owner Decision Brief，并保留 N3 的 ADR/安全边界引用。

## Operational Readiness Brief

路径：`.claude/workspace/operations/YYYY-MM-DD-<module>-readiness.md`。

最小头部：

```markdown
> Readiness ID：OR-20260711-N7-001
> Status：draft
> Target Module：N7
> Risk Level：high
> Release Scope：CLI and generated workflow entrypoints
> Deployment Target：project-specific CI/CD or manual runbook
> Threat Model：`.claude/workspace/features/n7-operational-readiness/spec.md`
> Owner Decision：not_required
> Evidence Owner：DevOps
```

必须包含以下章节：

1. `## Security Evidence`：依赖/秘密扫描、风险、Threat Model、ADR 或 Owner Decision 的证据路径。
2. `## Deployment & Rollback`：部署入口、版本/配置前提、回滚步骤和触发条件。
3. `## Observability & Alerting`：健康信号、告警阈值、负责人和检查窗口。
4. `## Backup & Restore`：需要保护的数据、备份频率/保留、RPO/RTO、最近恢复演练或不适用理由。
5. `## Incident Response`：值守/确认人、升级路径、运行手册和用户沟通方式。
6. `## Verification Evidence`：发布前、发布后和恢复验证命令/证据。
7. `## Known Risks`：每项风险的 `accept` / `mitigate` / `defer` 处置、确认人和证据。

每个实际动作使用 checkbox。`Status：complete` 时所有 checkbox 必须已完成；`ready` 可以保留待执行项，但不得作为已发布证据。

## 风险规则

| Risk Level | 最低要求 | 发布规则 |
|---|---|---|
| `standard` | 所有章节、回滚、观测、恢复和事故响应完整 | `/ship` 可在 `operations validate` 通过后进入常规发布判断 |
| `high` | standard 要求 + 指向仓库内现有 artifact 的 Threat Model 和 Owner Decision Brief + A3/N7 安全证据 | 未通过时 release gate 必须 blocked；不得用 known risk 文字替代 |

## 工作流

```text
已完成 review 的模块
  -> DevOps 创建 Readiness Brief
  -> node create-claude-team/cli.js operations validate <brief>
  -> /ship 对照 release report 和 Brief
  -> 部署、发布后观测与恢复演练留下真实证据
  -> 发生事故时 A6 记录证据，N6/N2 决定后续变更归属
```

`operations validate` 是只读检查，不写 release 状态，也不替代部署平台的真实权限、备份、监控或告警检查。
