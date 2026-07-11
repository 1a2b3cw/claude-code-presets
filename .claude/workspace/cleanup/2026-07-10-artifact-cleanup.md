# 文档清理报告

- 日期：2026-07-10
- 状态：已完成低风险清理和 legacy `workspace/` 迁移，仍有旧规划文档是否归档的决策事项
- 范围：`docs/`、根目录 `workspace/` legacy 产物迁移、M5/M6 后的 `.claude/workspace/` 状态
- 负责角色：Delivery Steward

## 结论

本次已经清理低风险的文档漂移问题。当前说明文档已经统一指向 `.claude/workspace/`，后续新的执行状态、审查报告、发布报告和清理报告都应该写到这里。

本次收尾已把根目录 `workspace/` 里的 review、release 和 dogfood 产物迁入 `.claude/workspace/`。没有丢弃历史内容；旧路径引用也已同步改到 canonical 路径。

## 已完成的低风险修复

- 更新面向用户的安装和使用文档，明确 `.claude/workspace/` 是保留的 team state/report 根目录。
- 更新当前集成和参考文档，统一使用 `.claude/workspace/reviews/`、`.claude/workspace/releases/` 和 `.claude/workspace/rule-recommendations/`。
- 更新 `docs/maturity-tasks.md`，把当前主线改为 M6 已完成，下一步进入 dogfood 或 M7 规划。
- 给旧的 productivity roadmap/task 文档标注 `superseded/reference`，保留历史上下文，但不再把它们当当前事实源。
- 迁移根目录 `workspace/` 下的 review/release/dogfood 产物到 `.claude/workspace/`，并同步 events/report 中的 artifact 路径。

## 发现的 legacy 或重复产物

| 产物 | 当前状态 | 建议 |
|------|----------|------|
| `.claude/workspace/reviews/2026-07-10-all.md` | 已迁移审查报告 | 保留为历史审查证据 |
| `.claude/workspace/reviews/2026-07-10-t4-t5.md` | 已迁移审查报告 | 保留为历史审查证据 |
| `.claude/workspace/reviews/2026-07-10-t6.md` | 已迁移审查报告 | 保留为历史审查证据 |
| `.claude/workspace/reviews/2026-07-10-t7.md` | 已迁移审查报告 | 保留为历史审查证据 |
| `.claude/workspace/releases/2026-07-10-v3.4.1.md` | 已迁移发布报告 | 保留为历史发布证据 |
| `.claude/workspace/dogfood.md` | 已迁移 dogfood 笔记 | 继续作为 dogfood 记录入口 |
| `docs/productivity-roadmap.md` | 已被取代的参考规划文档 | 先作为参考保留，等 M7 规划时决定是否归档 |
| `docs/productivity-tasks.md` | 已被取代的参考任务文档 | 先作为参考保留，等 M7 规划时决定是否归档 |

## 需要 Owner 决策

**要决定什么：** 旧的 productivity roadmap/task 文档，是继续留在 `docs/` 作为参考，还是在 M7 前迁到 `docs/archive/`？

**背景：** 当前成熟化事实源已经切到 `docs/maturity-roadmap.md` 和 `docs/maturity-tasks.md`。旧 productivity 文档仍有历史价值，但继续放在 `docs/` 顶层会增加新读者误读的概率。

**建议：** 暂时保留在 `docs/`，因为 M7 dogfood/open source 规划可能还会引用其中的提效思路。M7 定稿后，如果不再需要，迁入 `docs/archive/`。

**可选方案：**

1. M7 前继续保留在 `docs/`，依靠顶部 `superseded/reference` 提示防误读。
2. 现在迁到 `docs/archive/`，让 `docs/` 顶层更干净。
3. 合并其中仍有价值的内容到 maturity/M7 文档后再归档。

**如果暂时不确认：** 先保留两份旧文档，不再把它们当事实源。后续所有新报告和状态继续写入 `.claude/workspace/`。

## 下一步

用 Workbench 的 Artifact Cleanup 视图 dogfood 这份报告，然后决定 M7 是否需要整理旧 productivity 文档并迁入 `docs/archive/`。
