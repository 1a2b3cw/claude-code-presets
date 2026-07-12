# N8 Cutover Artifact Cleanup

> 状态：active
> 日期：2026-07-12
> Owner Decision：OD-N8-005（A，confirmed）
> 策略：只做可逆生命周期标记，不删除或移动历史 artifact。

## 当前主线

| 事实 | 唯一来源 | 生命周期 |
|---|---|---|
| 产品定义 | `product-brief.md`、`product-model.md` | active |
| 架构与迁移边界 | `architecture.md`、ADR | active |
| 模块状态 | `roadmap.md` | active |
| 当前执行状态 | `.claude/workspace/features/<feature>/tasks.md` | active |
| 证据 | `.claude/workspace/{reviews,releases,events.jsonl}` | active |

## Legacy / Reference 分类

| Artifact | 生命周期 | 原因 | 处理 |
|---|---|---|---|
| 根 `spec.md` | reference | 早期 Project Preset workflow 设计，已被 N8.1 contract/feature 包替代 | 已加 reference 标记，保留内容 |
| `docs/evolution-roadmap.md` | reference | 早期平台演进建议，不拥有当前模块状态 | 保留为策略背景 |
| `docs/maturity-roadmap.md`、`docs/maturity-tasks.md` | reference | 旧成熟化路线，不能替代 vNext roadmap | 保留历史演进理由 |
| `docs/productivity-roadmap.md`、`docs/productivity-tasks.md` | superseded/reference | 文件已声明 superseded，旧 workspace 路径不可作为规范 | 保留，不回写状态 |
| `docs/workbench-*.md` | reference | A7 视图设计，不拥有产品/执行状态 | 保留，不扩大 Workbench |
| 根 `workspace/` | absent | 当前仓库不存在该 legacy 目录 | 无迁移动作 |

## 不执行的动作

- 不删除、移动或改写历史决策、release、review 与 docs。
- 不将 reference 文档从 Git 历史或文件系统隐藏。
- 不让 status/Workbench 读取上述 reference 文档作为当前主线。

## 验证

- `planning validate` 验证 vNext 引用链。
- `status --json` 验证当前活跃 feature 选择。
- N8 cutover review 仅作已完成切换决策的历史证据；当前模块状态以 `roadmap.md` 和活跃 feature tasks 为准。

## 2026-07-12 复盘补充

| 发现 | 生命周期处理 | 动作 |
|---|---|---|
| `roadmap.md` 和 `product-brief.md` 仍标记 draft，与已启用的 vNext 主线不一致 | active | 已改为 active |
| roadmap 的“风险与未决”仍把 N2-N8 已解决问题写成待办 | superseded content | 已替换为当前真实剩余风险 |
| N8 标记 done，但 project-preset feedback 只有更新原则，无可验证行为闭环 | active follow-up | 已重开 N8 与 N8.1，只新增 N8.1.5 |
| `n8-final-report.md` 的“Final”和 completed 会压过当前状态 | reference | 改为 Cutover Report，保留切换证据，明确引用 roadmap 当前状态 |

本次不删除任何 review、dogfood、decision 或 event；它们仍是“当时做了什么”的历史证据，但不拥有当前模块状态。
