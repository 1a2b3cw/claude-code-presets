# N7 安全、发布与运行保障审查报告

> 结论：pass
> 关联模块：N7
> 审查日期：2026-07-11
> 范围：N7 Operational Readiness Contract、CLI、发布/DevOps 入口与真实 Brief

## 变更范围

- A6 Operational Readiness Contract、N7 feature package、high-risk Owner Decision 与真实 Readiness Brief。
- `operations validate` CLI、local gate、smoke 和 tarball 安装验证。
- Claude/Codex `/ship`、DevOps 与生成后的 command skill 入口。

## 审查结果

- critical：0
- major：0
- minor：0
- 自动修复：1

审查期间发现 high-risk Brief 只要填写任意非空 Threat Model/Owner Decision 名称即可通过，无法证明引用存在。已改为必须指向仓库内实际文件，并为缺失和有效路径分别添加回归测试。

## 安全与运行保障

- D10：high risk 缺 Threat Model 或 Owner Decision 时返回 `needs_revision`；伪造的证据路径同样被拒绝。
- D11：完整 Readiness Brief 通过，可集中查看安全、部署回滚、观测告警、备份恢复、事故响应与验证证据；`/ship` 和 DevOps 要求先运行同一 CLI。
- D12：常见明文私钥、连接串和凭据赋值模式会返回 `blocked`；Brief 只能记录脱敏引用。
- Claude/Codex 生成入口与仓库内 wrapper 一致；tarball 安装后的 CLI help 同样包含 `operations validate`。

## Acceptance 与系统健康

- 本地门禁通过：682 项 smoke、pack 清单与 N7 CLI 回归场景。
- tarball 安装 smoke、planning/events/Workbench 和真实 high-risk Brief 均通过。
- 系统健康：healthy。Readiness Brief 只拥有运行准备度，不替代 roadmap/tasks/release report，也不提前把环境特定实现塞进通用生成器。

## 剩余边界

- 当前秘密检测是面向运行文档的常见模式保护，不替代项目的 secret scanner、依赖审计或安全测试。
- N7 验证证据契约，不执行生产部署、备份、恢复、告警或事故通知；各项目必须在 `/ship` 前完成真实环境演练。
- N8 负责在真实项目中验证新体系，并处理 legacy 迁移与替换。

## Gate 结果

- review：pass
- fix rounds：1
- release：not_required

## 下一步

进入 N8 验证、迁移与替换；对具体项目的生产发布继续使用 `/ship` 与本合同。
