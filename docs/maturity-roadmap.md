# AI 开发团队框架成熟化路线图

> 本路线图取代“Workbench 优先”的成熟化方向。
> 当前目标是把项目打磨成一个能从 0 到 1 交付成熟产品的 AI 开发团队框架。

## 一句话定位

一个本地优先、artifact-first 的 AI 产品开发团队框架：Owner 给出产品目标，AI 团队负责产品判断、技术设计、开发实现、审查发布和状态治理，并在关键决策点给 Owner 清晰方案。

## 当前纠偏

之前的路线把 Workbench、events、metrics、status 自动化推得太靠前。它们不是错的，但它们是支撑层，不是主产品。

新的主线是：

```text
Product judgment
  -> Roadmap and MVP
  -> Technical plan
  -> Iterative build
  -> Acceptance and review
  -> Ship
  -> Stewardship and retro
  -> Optional Workbench view
```

## 成熟标准

成熟不是有多少命令、角色或页面，而是满足这些信号：

1. **规划正确性更强**：AI 能判断 MVP、非目标、优先级、风险，而不是只生成任务表。
2. **Owner 决策成本更低**：只有高影响决策才打扰用户，并给推荐方案。
3. **spec/tasks 先过合理性门禁**：任务做完之前先证明它值得做、看得懂、符合 Owner 意图。
4. **交付闭环可靠**：代码、测试、审查、发布和回滚都有证据。
5. **文档不变垃圾堆**：旧文档能合并、归档、删除；状态源不互相冲突。
6. **角色沟通成本受控**：角色按需触发，不是每次全员开会。
7. **Workbench 只是视图**：它读取可信 artifact，而不是替代核心流程。

## 核心角色方向

详细角色模型见 `docs/ai-team-operating-model.md`。

本轮不把所有职责塞进 Architect-Planner。职责拆成三条主线：

| 责任线 | 角色 | 解决的问题 |
|--------|------|------------|
| 产品判断 | Product Lead | 做什么、为谁做、MVP 是什么、哪些不做 |
| 技术设计 | Architect-Planner | 怎么做、模块边界、技术方案、spec/tasks |
| 交付治理 | Delivery Steward | 状态一致、文档清理、旧 artifact 合并/归档/删除 |

Builder、Reviewer、Designer、Researcher、DevOps 保留，但按复杂度和任务类型触发。

## 不做清单

在完成核心团队框架前，先不做：

- 继续扩 Workbench UI。
- 云平台、账号系统、多租户数据库。
- 大型 agent swarm 或自治 daemon。
- 外部 skill 市场。
- 大量新增 preset。
- 手工维护复杂 metrics。
- 把小修复拖进完整流程。

## Phase M1：Team Operating Model

目标：把团队角色、决策边界、文档治理先立住。

重点能力：

- 新增 Product Lead 和 Delivery Steward 的职责定义。
- 缩小 Architect-Planner 的职责，避免万能角色。
- 定义 Owner Decision Brief。
- 定义 Spec/Task Quality Gate，防止无用任务被认真执行。
- 定义 artifact 目录分层，避免所有规划、证据和历史材料混在一个文件夹。
- 定义文档生命周期：active / reference / draft / superseded / archived / delete-candidate。
- 统一 artifact 事实源和 workspace 路径策略。

验收标准：

- 能回答“什么时候 AI 自己决定，什么时候问 Owner”。
- 能回答“旧文档应该保留、合并、归档还是删除”。
- 能回答“谁判断 spec/tasks 是否有用、是否符合 Owner 意图、是否可读”。
- 能回答“不同类型文档应该放在哪一层目录”。
- 能回答“哪个文件是事实源”。
- S/M/L/XL 各级任务知道该调用哪些角色。

## Phase M2：Planning Upgrade

目标：让 `/plan` 真正承担从产品想法到成熟产品路线的判断。

重点能力：

- Product Brief 不只是字段表，还要包含核心用户、核心价值、非目标、验收标准。
- Roadmap 模块要写清用户价值、MVP 归属、依赖、风险和优先级。
- Product Lead 给出推荐路线，不把所有选择丢给 Owner。
- 高影响取舍使用 Owner Decision Brief。

验收标准：

- 用户给一句产品想法，AI 能产出可执行 roadmap，而不是直接开工。
- Roadmap 能清楚说明先做什么、为什么先做、什么暂时不做。
- Owner 只需要确认关键方向，不需要当日常 PM。

## Phase M3：Development Loop Upgrade

目标：让 `/dev` 从“执行命令”升级为“受控迭代交付”。

重点能力：

- L/XL 任务由 Architect-Planner 输出 spec/tasks。
- M/L/XL 开工前必须通过 Spec/Task Quality Gate。
- Product Lead 判断任务是否值得做、是否符合 Owner 意图。
- 开工前说明必须说人话，默认用短段落，不用僵硬表格。
- Builder 只实现当前任务，不顺手扩大范围。
- Delivery Steward 在迭代边界同步状态，不让 `/dev` 写散所有 artifact。
- 任务完成后必须有用户价值层面的验收描述。

验收标准：

- 每轮只推进 1-3 个可验证任务。
- Builder 开工前有 Owner-readable human brief。
- `tasks.md` 状态词统一。
- 模块状态只由 roadmap 模块表维护，不再双写漂移。
- 普通实现细节不问 Owner，高影响决策才问。

## Phase M4：Review, Acceptance, Ship

目标：从“代码看起来能跑”升级为“产品功能可交付”。

重点能力：

- Reviewer 增加 acceptance 风险检查。
- `/review-all` 以审查和报告为主，修复委托 `/fix` 或 `/dev`。
- `/review-all --system` 检查长期演化后的系统健康，防止多轮局部合理变更把项目改变形。
- `/ship` 产出 release report、风险、回滚方案。
- Designer/DevOps 只在 UI 或发布相关任务触发。

验收标准：

- Review report 能说明阻塞问题、剩余风险和下一步。
- System health report 能说明架构形状、产品验收、一致性、文档熵和建议清理项。
- Release report 能说明是否可发布、为什么、怎么回滚。
- 用户主流程有验收证据。

## Phase M5：Trustworthy State Tools

目标：把状态读取和校验做硬，而不是继续依赖 AI 自觉写对。

重点能力：

- `create-claude-team status`
- `create-claude-team events validate`
- `create-claude-team metrics update`
- 统一 `.claude/workspace/` 作为 team state/report 根目录。

验收标准：

- malformed event 会被发现。
- status 能生成 Today 所需字段。
- metrics 能从 events 复现最近 5/10 次趋势。

## Phase M6：Workbench As View

目标：在流程和状态可信后，再把 Workbench 做成可视化入口。

重点能力：

- Today 只读可信 artifact。
- Task Focus 展示当前任务、验收标准、gate、Owner 决策点。
- Run Detail 追溯 event、review report、release report。
- Artifact Cleanup 视图展示建议合并、归档或删除的文档。

验收标准：

- 打开 Workbench 10 秒内知道当前项目在哪、哪里卡住、下一步是什么。
- Workbench 不写核心事实源，只展示和辅助触发命令。

## Phase M7：Dogfood And Open Source

目标：用真实项目验证，再对外传播。

重点能力：

- 30 天 dogfood。
- 3 个真实项目闭环。
- README 第一屏说明它不是 IDE、不是 Jira、不是 agent swarm，而是 AI 产品开发团队框架。
- Demo project 展示 product brief、roadmap、spec/tasks、review、ship、stewardship。

验收标准：

- 陌生用户 10 分钟理解定位。
- 30 分钟跑通 demo。
- 至少 3 条流程或规则改进来自真实失败。

## 推荐执行顺序

```text
M1 Team Operating Model
  -> M2 Planning Upgrade
  -> M3 Development Loop Upgrade
  -> M4 Review / Acceptance / Ship
  -> M5 Trustworthy State Tools
  -> M6 Workbench As View
  -> M7 Dogfood / Open Source
```

## 当前下一步

继续执行 `docs/maturity-tasks.md` 的 M5 任务，把状态读取和事件校验做成可信工具。Workbench 保持 M6 / backlog 视图层，不作为当前主线。
