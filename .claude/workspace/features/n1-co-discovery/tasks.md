# N1 共同探索与决策 Tasks

> 状态：done
> Task Set：N1-TASKS-001
> Spec：`spec.md`
> Roadmap Module：N1
> 执行包：`.claude/workspace/features/n1-co-discovery/`
> 更新于：2026-07-11

## 本轮目标

把 N1 的共同探索契约落实到 `/plan` 和 Product Lead，并用静态测试与四个真实场景验证 Claude/Codex 两端行为。本轮不实现 N2 产品模型、N3 架构或其他命令重构。

## Spec/Task Quality Gate

- 当前结果：`pass`
- 结论：产品价值、范围边界、任务依赖、验收场景和生成文件边界已明确。
- 剩余风险：静态测试只能验证契约存在，N1.5 Codex dogfood 是模块完成的强制门槛；Claude 实机验证由 Owner 后续完成。
- Builder 状态：可以按 N1.1 开工。

## 迭代 1：固定行为契约

### N1.1 添加探索契约测试

- **任务 ID**：N1.1
- **状态**：done
- **描述**：先在 smoke test 中定义 N1 必须保留的文本契约，覆盖主动推荐、事实/推断区分、问题预算、简洁输出、现有项目纠偏和安全运维约束。
- **依赖**：无
- **验收标准**：旧 `/plan` 契约无法满足新增断言；实现 N1 后 Claude command、Codex command 和 Codex skill 均满足断言。
- **验收命令**：`npm test`
- **阻塞原因**：无
- **Gate 结果**：local pass / review covered_by_N1.5 / release not_required
- **产物**：`create-claude-team/scripts/smoke-test.js`
- **最近更新**：2026-07-11

### N1.2 重写 `/plan` 探索阶段

- **任务 ID**：N1.2
- **状态**：done
- **描述**：将固定 3-4 问开场改为“先综合、再发散、明确推荐、必要时提问”的 Exploration Brief 流程，并保留 Product Brief 和 roadmap 交接边界。
- **依赖**：N1.1
- **验收标准**：命令文档完整覆盖 spec 的默认行为、输出契约、决策策略、异常路径和 A1-A4 场景要求。
- **验收命令**：`npm test`、`npm run validate`
- **阻塞原因**：无
- **Gate 结果**：local pass / review covered_by_N1.5 / release not_required
- **产物**：`.claude/commands/plan.md`
- **最近更新**：2026-07-11

### N1.3 升级 Product Lead 行为

- **任务 ID**：N1.3
- **状态**：done
- **描述**：让 Product Lead 先贡献产品判断和灵感，区分事实、推断和未知项；限制问题数量和输出长度；明确何时使用 Owner Decision Brief。
- **依赖**：N1.2
- **验收标准**：Product Lead 不再依赖固定问卷，能够处理新产品、旧项目纠偏、目标冲突和简单明确需求四类输入。
- **验收命令**：`npm test`、`npm run validate`
- **阻塞原因**：无
- **Gate 结果**：local pass / review covered_by_N1.5 / release not_required
- **产物**：`.claude/agents/product-lead.md`
- **最近更新**：2026-07-11

## 迭代 2：双端同步与 Codex 体验验证

### N1.4 同步 Claude/Codex 入口并验证发布包

- **任务 ID**：N1.4
- **状态**：done
- **描述**：从根 `.claude/` 重新生成 `AGENTS.md`、`.agents/` 和 `.codex/`，确认 npm 发布模板与新契约一致，不手工维护生成文件。
- **依赖**：N1.2,N1.3
- **验收标准**：Claude command、Codex command skill 和 tarball 初始化项目包含一致的 N1 契约，现有兼容能力无回归。
- **验收命令**：`node create-claude-team/cli.js update`、`npm run validate`、`npm test`、`npm run test:tarball`
- **阻塞原因**：无
- **Gate 结果**：local pass / review covered_by_N1.5 / release not_required
- **产物**：`AGENTS.md`、`.agents/`、`.codex/`
- **最近更新**：2026-07-11

### N1.5 执行 Codex 四场景 dogfood 与质量审查

- **任务 ID**：N1.5
- **状态**：done
- **描述**：在 Codex 中执行 A1-A4，检查推荐质量、提问数量、表达长度、事实/推断边界和 Product Brief 交接；发现问题时先修 spec 或上层定义，再修实现。Claude 实机体验由 Owner 后续单独验证。
- **依赖**：N1.4
- **验收标准**：Codex A1-A4 全部通过；每个失败都有根因、修订位置和复验结果；输出审查报告并通过 `/review-all`；报告中保留 Claude 后续验证清单。
- **验收命令**：`npm test`、`node create-claude-team/cli.js events validate`、`/review-all N1`
- **阻塞原因**：无；Claude 实机体验不属于本任务阻塞条件。
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/reviews/2026-07-11-n1-dogfood.md`
- **最近更新**：2026-07-11

## 建议顺序

```text
N1.1 -> N1.2 -> N1.3 -> N1.4 -> N1.5
```

N1.2 与 N1.3 逻辑相关但职责不同，不并行修改；先确定命令契约，再让 Product Lead 承担对应行为。N1.5 必须在双端生成和发布包验证后进行，但本轮只执行 Codex 实机体验。

## 完成标准

- 所有任务达到 `done`，N1 模块才能从 `in_progress` 更新为 `done`。
- 静态测试通过只能证明契约被同步，不能替代 Codex A1-A4 的真实体验验证。
- N1 完成后只向 N2 交付已确认的产品方向和 Product Brief，不提前固化产品能力模型。

## Owner 后续验证

- 在 N8 替换旧体系前，由 Owner 在 Claude Code 中执行 A1-A4。
- Claude 结果不阻塞当前 N1 开发；如发现平台体验差异，再回到 N1 spec 或适配层修订。
