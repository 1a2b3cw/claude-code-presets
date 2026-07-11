# N7 Operational Readiness

> Readiness ID：OR-20260711-N7-001
> Status：complete
> Target Module：N7
> Risk Level：high
> Release Scope：运行准备度合同、CLI、Claude/Codex 发布入口
> Deployment Target：本地 npm tarball 验证与项目特定 CI/CD
> Threat Model：`.claude/workspace/features/n7-operational-readiness/spec.md`
> Owner Decision：`.claude/workspace/decisions/2026-07-11-n7-operational-readiness.md`
> Evidence Owner：DevOps

## Security Evidence

- [x] `npm test` 覆盖 high risk 缺 Threat Model/Owner Decision 与明文秘密拒绝场景。
- [x] 本 Brief 只引用 artifact 和命令，不记录密钥、token、密码、连接串或用户数据。
- [x] Threat Model、A3/A6 安全边界和 Owner Decision 均可追溯。

## Deployment & Rollback

- [x] 发布前运行 `npm run gate` 与 `npm run test:tarball`；包由 CI/CD 或 Owner 明确批准后发布。
- [x] 回滚使用前一个已验证 tag/包或 revert 当前提交；触发条件是 CLI 校验、tarball 安装或发布后核心命令失败。
- [x] 本模块没有数据库迁移或持久化数据，无数据回滚步骤。

## Observability & Alerting

- [x] 发布前观察 `npm run gate`、tarball smoke、planning/events/Workbench 检查的退出码。
- [x] 发布后在 CI/CD 日志和包安装 smoke 中观察 CLI `operations validate`、`status` 与核心命令生成结果。
- [x] DevOps/发布执行人负责在发布窗口内处理失败信号；生产项目另由 preset 定义阈值和告警渠道。

## Backup & Restore

- [x] 源代码和文档由 Git 提交保存；恢复使用已验证提交、tag 或发布包。
- [x] 本仓库不管理用户业务数据；业务数据的备份频率、保留、RPO/RTO 和恢复演练由下游项目 Readiness Brief 声明。
- [x] 在发布前通过 tarball 安装 smoke 验证包可从干净目录重新构建和恢复使用。

## Incident Response

- [x] 发布执行人负责停止继续发布、保留 CI/CLI 证据并触发回滚。
- [x] 若问题影响用户工作流，使用 N6 Change Impact Brief 定位产品/架构影响，再由 `/fix` 或 `/dev` 修复。
- [x] 用户沟通、确认人与后续复盘记录在 release report 和 events 中，不写入运行秘密。

## Verification Evidence

- [x] `node create-claude-team/cli.js operations validate .claude/workspace/operations/2026-07-11-n7-operational-readiness.md` 通过。
- [x] `npm run gate`、`npm run test:tarball`、planning/events/Workbench 检查通过。
- [x] Claude/Codex 生成入口 smoke 证明 `/ship` 在 N7 合同存在时要求同一校验。

## Known Risks

- [x] 平台特定部署、监控、告警、备份和恢复无法由配置生成器替代；处置：defer；确认人：Owner/项目 DevOps；证据：项目 preset 与真实 release report。
- [x] 该模块只校验准备度文档，不能证明真实环境可恢复；处置：mitigate；确认人：DevOps；证据：每个实际项目在发布前执行环境恢复演练。
