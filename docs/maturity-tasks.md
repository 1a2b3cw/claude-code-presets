# AI 开发团队框架成熟化任务清单

> 本任务清单对应 `docs/maturity-roadmap.md`。
> 当前主线：先修正团队角色、决策边界和文档治理，再升级规划与开发流程。

## 当前主线

Phase M1：Team Operating Model。

优先级：

1. 不把所有职责塞进一个角色。
2. 增加明确的文档治理和旧文档清理能力。
3. 增加 spec/tasks 合理性门禁，防止无用计划被执行。
4. 增加 artifact 目录分层，避免所有文档混在一个主文件夹。
5. 把 Workbench 降级为后续视图层。
6. 统一状态源、路径和文档生命周期。

---

## Phase M1：Team Operating Model

### M1.1 新增 AI Team Operating Model

- **状态**：done
- **优先级**：P0
- **目标**：定义角色分层、Owner 决策边界、文档治理和 Workbench 后置原则。
- **范围**：
  - `docs/ai-team-operating-model.md`
  - `docs/artifact-architecture.md`
  - `docs/maturity-roadmap.md`
  - `docs/maturity-tasks.md`
- **不做**：
  - 不改 Workbench 代码
  - 不同步所有 `.agents/agents/*`
  - 不删除旧文档
- **验收标准**：
  - 明确 Product Lead、Architect-Planner、Delivery Steward 的职责边界。
  - 明确哪些决策需要 Owner，哪些由 AI 默认推进。
  - 明确谁判断 spec/tasks 是否有用、是否符合 Owner 意图、是否可读。
  - 明确不同 artifact 应该放在哪一层目录。
  - 明确旧文档如何合并、归档、删除。
  - 明确 Workbench 是后续视图层。

### M1.2 拆分角色职责并同步 agent 文档

- **状态**：done
- **优先级**：P0
- **目标**：把当前 Architect-Planner 的产品判断、技术架构、交付治理职责拆清楚。
- **范围**：
  - `.agents/agents/architect-planner.md`
  - `.claude/agents/architect-planner.md`
  - 新增 `.agents/agents/product-lead.md`
  - 新增 `.agents/agents/delivery-steward.md`
  - 新增或同步 `.claude/agents/product-lead.md`
  - 新增或同步 `.claude/agents/delivery-steward.md`
  - 新增或同步 `.codex/agents/product-lead.toml`
  - 新增或同步 `.codex/agents/delivery-steward.toml`
  - `create-claude-team/scripts/smoke-test.js`
- **不做**：
  - 不一次性改所有命令
  - 不增加常驻全员流程
- **验收标准**：
  - Product Lead 负责 Product Brief、MVP、roadmap priority、Owner Decision Brief。
  - Architect-Planner 负责架构、spec、tasks、技术取舍。
  - Delivery Steward 负责 artifact 生命周期、状态一致、旧文档合并/归档/删除建议。
  - 角色触发矩阵与 `docs/ai-team-operating-model.md` 一致。
  - smoke test 的 Codex custom agent 数量从 6 更新为 8，并守护两个新 agent 存在。
- **Prompt**：

```text
/dev 按 docs/ai-team-operating-model.md 执行 M1.2：拆分角色职责并同步 agent 文档。

重点：
- Architect-Planner 不再承担所有产品/交付治理职责。
- 新增或同步 Product Lead 与 Delivery Steward 角色。
- 明确触发条件、输入、输出和不做什么。
- 如果新增 Codex custom agents，把 smoke test 的 AGENT_COUNT 和存在性断言同步更新到 8。

边界：
- 不改 Workbench。
- 不改业务代码。
- 不把所有命令一次性重写。

完成后运行文档检查、相关 smoke test 和 git diff --check。
```

### M1.3 定义 Owner Decision Brief 契约

- **状态**：done
- **优先级**：P0
- **目标**：让 AI 在关键决策点给 Owner 方案，而不是让 Owner 管具体事务。
- **范围**：
  - `.agents/commands/plan.md`
  - `.agents/commands/dev.md`
  - `.agents/skills/team-command-plan/SKILL.md`
  - `.agents/skills/team-command-dev/SKILL.md`
  - `.claude/commands/plan.md`
  - `.claude/commands/dev.md`
- **不做**：
  - 不把所有小问题都变成 Owner 决策
- **验收标准**：
  - 决策触发条件清楚：产品方向、MVP、成本、隐私、安全、架构、发布风险。
  - 输出固定格式：Decision、Context、Recommendation、Options、If no reply。
  - `/plan` 和 L/XL `/dev` 都能使用该契约。

### M1.4 建立 Spec/Task Quality Gate

- **状态**：done
- **优先级**：P0
- **目标**：防止 Builder 按 tasks 做完后，Owner 才发现任务没用、看不懂、不是自己想要的。
- **范围**：
  - `.agents/commands/dev.md`
  - `.agents/agents/architect-planner.md`
  - Product Lead 角色文档
  - Delivery Steward 角色文档
  - `.agents/skills/team-command-dev/SKILL.md`
  - `.claude/commands/dev.md`
  - `.claude/agents/architect-planner.md`
- **不做**：
  - 不让 Owner 审每个技术细节
  - 不把 S 级修复拖进计划门禁
- **验收标准**：
  - M/L/XL 开工前必须输出人话版开工说明，不默认使用僵硬表格。
  - Product Lead 判断 product value、Owner fit、MVP/roadmap 对齐。
  - Architect-Planner 判断技术方案、依赖顺序、任务粒度和验收命令。
  - Delivery Steward 判断 spec/tasks 是否可读、状态化、无重复、不制造文档漂移。
  - Gate 结果只能是 `pass / needs_revision / blocked`。
  - `needs_revision` 或 `blocked` 时 Builder 不得开工。
- **Prompt**：

```text
/dev 按 docs/ai-team-operating-model.md 执行 M1.4：建立 Spec/Task Quality Gate。

重点：
- M/L/XL 任务开工前必须输出 Owner 能看懂的人话版开工说明。
- 默认用短段落说明“做什么、为什么、做到哪、不做什么、怎么验收”，不要僵硬表格。
- Product Lead 管“有没有用、是不是 Owner 想要的”。
- Architect-Planner 管“技术上是否合理、任务是否可执行”。
- Delivery Steward 管“是否看得懂、可追踪、不会制造文档垃圾”。
- Gate 不通过时 Builder 不开工。

边界：
- 不让 S 级小修复变重。
- 不要求 Owner 审技术细节。

完成后同步 .claude、.agents 和 team-command-dev skill，更新 smoke test，运行 npm test 和 git diff --check。
```

### M1.5 建立 Artifact Directory Layers

- **状态**：done
- **优先级**：P0
- **目标**：定义文档和执行产物的目录分层，避免所有内容混在 `docs/` 或一个 workspace 文件夹。
- **范围**：
  - `docs/artifact-architecture.md`
  - `docs/ai-team-operating-model.md`
  - `docs/maturity-roadmap.md`
  - `docs/maturity-tasks.md`
- **不做**：
  - 不立即移动现有文件
  - 不删除旧文档
  - 不改命令路径引用
- **验收标准**：
  - 明确 root、`docs/`、`project-profile/`、`project-preset/`、`preview/`、`.claude/workspace/` 的职责。
  - 明确 `docs/strategy/`、`docs/operating-model/`、`docs/workflows/`、`docs/integrations/`、`docs/workbench/`、`docs/archive/` 的目标结构。
  - 明确 review/release/spec/decision/cleanup 等执行产物进入 `.claude/workspace/` 分层目录。
  - 明确当前 `docs/` 顶层文件只是 cleanup candidates，不能随意移动。

### M1.6 建立 Artifact Stewardship 规则

- **状态**：done
- **优先级**：P0
- **目标**：让项目具备管理、删除、整合旧文档的能力。
- **范围**：
  - `AGENTS.md`
  - `.agents/commands/standup.md`
  - `.agents/commands/review-all.md`
  - `.agents/commands/project-preset.md`
  - `docs/ai-team-operating-model.md` 如需补充
- **不做**：
  - 不在本任务实际删除旧文档，除非用户明确确认
  - 不把 cleanup 变成每次任务必经
- **验收标准**：
  - 文档状态包含 active/reference/draft/superseded/archived/delete-candidate。
  - 明确什么时候合并、什么时候归档、什么时候删除。
  - Delivery Steward 可以输出 Artifact Cleanup 报告。
  - 高影响删除必须走 Owner Decision Brief。

### M1.7 统一 workspace 路径和状态词

- **状态**：done
- **优先级**：P0
- **目标**：解决 `.claude/workspace/` 与 `workspace/`、中文/英文状态词、roadmap 双写进度的漂移问题。
- **范围**：
  - `.agents/commands/dev.md`
  - `.agents/commands/standup.md`
  - `.agents/commands/review-all.md`
  - `.agents/commands/plan.md`
  - `.agents/agents/architect-planner.md`
  - 对应 `.claude/` 和 `team-command-*` skill
- **不做**：
  - 不移动已有文件，除非先给迁移清单
- **验收标准**：
  - `.claude/workspace/` 是 team state/report 默认根目录。
  - `tasks.md` 状态词统一为英文状态机。
  - `roadmap.md` 模块表是唯一模块状态源，进度区只做派生展示或删除。
  - `/standup` 默认 read-first，不制造噪音派生状态。

### M1.8 把 Workbench 降级为后续视图层

- **状态**：done
- **优先级**：P1
- **目标**：避免继续把成熟化主线带向 UI/自动化。
- **范围**：
  - `docs/workbench-mvp.md`
  - `docs/workbench-alpha.md`
  - `docs/maturity-roadmap.md`
  - `docs/maturity-tasks.md`
- **不做**：
  - 不改 Workbench 代码
  - 不删除已有 Workbench PoC
- **验收标准**：
  - Workbench 文档明确“只读可信 artifact 的视图层”。
  - 当前 roadmap 不再把 Workbench Alpha 作为 M1 主线。
  - Workbench 进入 M6 或 backlog。

---

## Phase M2：Planning Upgrade

### M2.1 升级 `/plan` 为 Product Lead 主导

- **状态**：done
- **优先级**：P0
- **目标**：让 `/plan` 从产品想法生成 Product Brief、MVP、非目标、roadmap 和 Owner 决策点。
- **产物**：`docs/m2-planning-upgrade-spec.md`、`.claude/commands/plan.md`、对应 Codex command/skill、smoke test。
- **验收命令**：`npm run validate`、`npm test`、`git diff --check`。
- **阻塞原因**：无。
- **Gate 结果**：local pass；review pass（`.claude/workspace/reviews/2026-07-10-m2.md`）。
- **验收标准**：
  - Roadmap 模块包含用户价值、MVP 归属、依赖、风险、复杂度。
  - Product Lead 给推荐顺序，不把所有选择丢给 Owner。
  - 高影响取舍使用 Owner Decision Brief。

### M2.2 强化 Product Brief 和 Project Preset 边界

- **状态**：done
- **优先级**：P1
- **目标**：避免 `project-preset/` 复制通用规则或写入未经确认的推断。
- **产物**：`.claude/commands/project-preset.md`、对应 Codex command/skill、smoke test。
- **验收命令**：`npm run validate`、`npm test`、`git diff --check`。
- **阻塞原因**：无。
- **Gate 结果**：local pass；review pass（`.claude/workspace/reviews/2026-07-10-m2.md`）。
- **验收标准**：
  - Project preset 只记录项目差异。
  - 未确认推断留在 profile/未决问题，不变成硬规则。
  - `project-preset/rules/` 是唯一规则目录，且与读取路径一致。

---

## Phase M3：Development Loop Upgrade

### M3.1 收敛 `/dev` 写入面

- **状态**：planned
- **优先级**：P0
- **目标**：让 `/dev` 专注当前任务执行，不同时承担所有状态、metrics、git、report 写入。
- **验收标准**：
  - `/dev` 更新当前 task/module 和最终 event。
  - git commit 不再默认强制自动执行，改为显式触发或交给 ship/commit 流程。
  - metrics 由 events 聚合工具生成，不靠 `/dev` 手写复杂摘要。

### M3.2 加入产品验收视角

- **状态**：planned
- **优先级**：P1
- **目标**：每个产品功能完成时说明用户主流程是否真的可用。
- **验收标准**：
  - L/XL 任务必须有 acceptance 场景。
  - Reviewer 检查“做了但不好用”的风险。
  - UI 任务由 Designer 检查体验，不让 Reviewer 重复审视觉。

---

## Phase M4：Review, Acceptance, Ship

### M4.1 重定位 `/review-all`

- **状态**：planned
- **优先级**：P1
- **目标**：让 `/review-all` 偏审查和报告，修复委托 `/fix` 或 `/dev`。
- **验收标准**：
  - Review report 明确 pass/needs_fix/blocked。
  - 自动修复只允许 tiny obvious fixes，其他交给修复流程。
  - 报告路径统一到 `.claude/workspace/reviews/`。

### M4.2 增加 System Health Review

- **状态**：done
- **优先级**：P0
- **目标**：解决 diff review 只能检查当前变更、无法防止长期项目变形的问题。
- **范围**：
  - `.agents/commands/review-all.md`
  - `.claude/commands/review-all.md`
  - `.agents/skills/team-command-review-all/SKILL.md`
  - `create-claude-team/scripts/smoke-test.js`
- **不做**：
  - 不让每次小改都做全局审查
  - 不让 system health review 默认直接改代码
- **验收标准**：
  - `/review-all --system` 明确存在。
  - 触发条件包含 XL 完成、MVP 完成、发布前跨 3+ 模块、同模块连续 3 次改动、状态/文档冲突、用户担心项目变形。
  - 审查维度包含架构形状、产品验收、一致性、文档熵、技术债。
  - 报告能输出 healthy / needs_refactor / blocked 和下一步。
  - smoke test 守护 review-all command 与 skill 包含 system health 契约。

### M4.3 强化 `/ship`

- **状态**：planned
- **优先级**：P1
- **目标**：发布前有 gate、风险、回滚、发布后验证。
- **验收标准**：
  - Release report 路径统一到 `.claude/workspace/releases/`。
  - known risk 必须有 accept/mitigate/defer。
  - 高风险发布需要 Owner Decision Brief。

---

## Phase M5：Trustworthy State Tools

### M5.1 `create-claude-team status`

- **状态**：planned
- **优先级**：P1
- **目标**：从本地 artifact 输出项目状态 JSON 和人类摘要。

### M5.2 `create-claude-team events validate`

- **状态**：planned
- **优先级**：P1
- **目标**：校验 events JSONL、必填字段、状态枚举、artifact 引用。

### M5.3 `create-claude-team metrics update`

- **状态**：planned
- **优先级**：P2
- **目标**：从 events 聚合 metrics，不再依赖手工维护。

---

## Phase M6：Workbench As View

### M6.1 Workbench 读取可信状态

- **状态**：planned
- **优先级**：P2
- **目标**：Workbench 只读 status/reports，不做主流程事实源。

### M6.2 Artifact Cleanup 视图

- **状态**：planned
- **优先级**：P2
- **目标**：展示 Delivery Steward 建议合并、归档、删除的文档。

---

## 推荐开工顺序

1. M1.2 拆分角色职责并同步 agent 文档
2. M1.3 定义 Owner Decision Brief 契约
3. M1.4 建立 Spec/Task Quality Gate
4. M1.6 建立 Artifact Stewardship 规则
5. M1.7 统一 workspace 路径和状态词
6. M1.8 把 Workbench 降级为后续视图层
7. M2.1 升级 `/plan` 为 Product Lead 主导
8. M3.1 收敛 `/dev` 写入面

## 通用开工模板

```text
/dev 按 docs/maturity-tasks.md 执行 [任务编号]：[任务名称]。

边界：
- 只做该任务范围内的内容。
- 不做任务中明确排除的事项。
- 保持现有文档和代码风格。
- 如影响 Claude/Codex 命令契约，必须同步 .claude、.agents 和 team-command-* skill。
- 如影响生成结果或 CLI，必须更新 smoke test。
- 完成后运行对应验收命令和 git diff --check。
```
