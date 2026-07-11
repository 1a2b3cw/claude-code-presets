# N1 Spec/Tasks 规划质量审查

> 状态：completed
> 范围：`N1-SPEC-001`、`N1-TASKS-001` 及其上层 Product Brief/roadmap
> 执行包：`.claude/workspace/features/n1-co-discovery/`
> 日期：2026-07-11

## 结论

修订后 `pass`。spec 和 tasks 已足够指导 Builder 开始 N1.1，但目前只能证明规划可执行，不能证明最终 AI 体验已经达标。N1 必须通过 Codex 真实场景验证后才能完成；Claude 实机体验由 Owner 延后到 N8 前验证。

## 纸面演练

| 场景 | 现有流程风险 | 新 spec 覆盖 | 结果 |
|---|---|---|---|
| A1 模糊新产品 | 直接要求用户回答目标用户和范围 | 先提出三类产品路线并推荐 MVP | pass |
| A2 现有项目不满 | 容易在旧结构中局部修补 | 明确要求判断问题层级并允许重新奠基 | pass |
| A3 高影响冲突 | 可能只继续收集信息 | 指出冲突、给推荐并触发 Decision Brief | pass |
| A4 简单明确需求 | 固定问卷造成过度规划 | 允许直接推荐，问题预算为 0-2 | pass |

## 发现与修订

### P1：上层缺少简洁表达约束

- 问题：N1 spec 要求默认简洁，但 Product Brief 没有把它定义为产品体验。
- 修订：Product Brief 增加“先重点和推荐、按需展开”，并纳入验收与产品约束。

### P1：roadmap 的 N1 验收不可验证

- 问题：原验收只写“形成产品方向和决策依据”，无法判断是否仍是问卷或长篇报告。
- 修订：改为 A1-A4 双端通过，并明确推荐、简洁和问题预算。

### P1：静态测试不能代表实际效果

- 问题：prompt 文本存在不等于模型行为符合预期。
- 修订：tasks 增加 N1.5 Codex dogfood，未通过不得把 N1 标为 done；Claude 实机验证按 Owner 决定延后，不阻塞当前模块。

### P2：N1 容易侵入 N2-N4

- 问题：共同探索可能顺手设计完整产品模型、架构和 artifact 系统。
- 修订：spec 明确 N1 只交付方向确认和 Product Brief 草案，后续结构由 N2-N4 负责。

### P1：当前状态读取器仍被旧主线带偏

- 问题：新增根 `roadmap.md` 和 N1 feature package 后，`create-claude-team status` 与 Workbench 仍显示“成熟化 M6”，没有识别 N1 已进入 `in_progress`。
- 影响：不阻塞 N1 的 command/agent 实现，但会让状态展示和后续 AI 判断继续引用旧项目背景。
- 修订：Product Brief 增加统一事实源验收；roadmap 的 N4 负责读取优先级与契约，N8 负责切换工具并退出旧主线。

## Gate

- Product Lead：pass
- Architect-Planner：pass
- Delivery Steward：pass
- Builder readiness：pass，从 N1.1 开始
- Codex actual experience：pending，等待 N1.5
- Claude actual experience：deferred by Owner，N8 前完成
- Known upstream issue：status/Workbench source drift，已进入 N4/N8

## 下一步

按 feature package 中的 `tasks.md` 执行 N1.1。实现阶段任何场景失败，优先判断是实现偏差、spec 缺口还是 Product Brief/roadmap 上层定义错误，再在正确层级修订。
