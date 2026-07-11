# N2 产品模型 Tasks

> 状态：done
> Task Set：N2-TASKS-001
> Spec：`spec.md`
> Roadmap Module：N2
> 执行包：`.claude/workspace/features/n2-product-model/`
> 更新于：2026-07-11

## Spec/Task Quality Gate

- 当前结果：pass
- 本轮范围：产品模型、规划角色读取契约、静态测试、Codex dogfood 与审查。
- 不做：技术架构、结构化存储、自动状态读取器、Workbench 扩展。
- Builder 状态：可以按 N2.1 开工。

### N2.1 建立 Product Model 事实源

- **任务 ID**：N2.1
- **状态**：done
- **描述**：建立带 Capability/Journey/Success ID 的 `product-model.md`，明确它与 Product Brief、roadmap、feature package 的职责边界。
- **验收标准**：Owner 可从单一文档理解用户、能力、旅程、边界和成功标准；不包含 roadmap 模块状态或实现任务。
- **验收命令**：`rg -n "Capability ID|Journey ID|Success ID" product-model.md`、`git diff --check`
- **阻塞原因**：无
- **Gate 结果**：local pass / review covered_by_N2.4 / release not_required
- **产物**：`product-model.md`、`docs/artifact-architecture.md`
- **最近更新**：2026-07-11

### N2.2 注入规划与角色读取契约

- **任务 ID**：N2.2
- **状态**：done
- **描述**：让 `/plan`、Product Lead、Architect-Planner 和 Delivery Steward 使用 Product Model 判断能力归属、旅程、边界和后续引用。
- **验收标准**：四个入口均要求读取模型；新请求被映射到现有能力、标记为边界外或作为候选能力，不会静默扩张 roadmap。
- **验收命令**：`npm test`、`node create-claude-team/cli.js update`
- **阻塞原因**：无
- **Gate 结果**：local pass / review covered_by_N2.4 / release not_required
- **产物**：`.claude/commands/plan.md`、`.claude/agents/product-lead.md`、`.claude/agents/architect-planner.md`、`.claude/agents/delivery-steward.md`
- **最近更新**：2026-07-11

### N2.3 添加同步回归测试并验证发布包

- **任务 ID**：N2.3
- **状态**：done
- **描述**：在 smoke test 固化 Product Model 契约，重新生成 Claude/Codex 入口并验证 tarball。
- **验收标准**：init/update 产物均保留同一契约；生成目录不手工维护；发布包通过安装 smoke。
- **验收命令**：`npm run validate`、`npm test`、`npm run test:tarball`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`create-claude-team/scripts/smoke-test.js`、`AGENTS.md`、`.agents/`、`.codex/`
- **最近更新**：2026-07-11

### N2.4 执行 Codex dogfood 与跨文件审查

- **任务 ID**：N2.4
- **状态**：done
- **描述**：执行 B1/B2，审查能力映射、边界保护、简洁表达和跨端一致性；发现问题先在正确上游修订再复验。
- **验收标准**：B1/B2 均通过；N2 review 报告覆盖事实源边界、acceptance 风险、Claude 后续验证和剩余风险。
- **验收命令**：`node create-claude-team/cli.js events validate`、`/review-all N2`、`git diff --check`
- **阻塞原因**：无；Claude 实机体验由 Owner 后续在 N8 前验证。
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/reviews/2026-07-11-n2-product-model.md`
- **最近更新**：2026-07-11

## 完成标准

- N2.1-N2.4 均为 `done` 后，roadmap 的 N2 才能改为 `done`。
- N2 只交付产品模型和读取契约，不提前取代 N3/N4 的架构或 artifact 机制。
