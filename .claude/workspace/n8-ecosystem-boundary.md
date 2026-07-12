# N8.4 生态边界报告

> 状态：active
> 日期：2026-07-12
> 输入：OD-N8-001、N8 Evidence Map、N8.1-N8.3 证据、[obra/superpowers](https://github.com/obra/superpowers) 公开 README 与仓库元数据

## 外部对照的可信性与安全性

| 项目 | 观察 | 结论 |
|---|---|---|
| 来源 | `obra/superpowers`；仓库描述为可组合的 agent skills 与软件开发方法 | 可作为成熟执行层的参考，不是 MY2 的产品事实源 |
| 活跃度 | GitHub API 显示默认分支 `main`，最近推送为 2026-07-10 | 足够作为当前对照；不把“活跃”误写成质量担保 |
| 许可证 | MIT | 允许借鉴/改写，但本轮不复制任何 skill 内容 |
| 安全 | README 明确存在可选视觉伴侣遥测；还包含 worktree、subagent 等具副作用工作流 | 不自动安装、不远程执行、不引入遥测；若未来采用，逐项走 skill-curator 审查 |

## 能力边界

| 能力 | Superpowers 已提供的通用方法 | MY2 的决定 | 依据 |
|---|---|---|---|
| 模糊想法探索、设计拆解 | brainstorming、writing-plans | **复用方法，不再扩建通用问答框架**；MY2 仅维护项目事实、Owner Decision 和 Product/Architecture 交接 | N1/N2/N3 与 OD-N8-001 |
| TDD、调试、代码审查 | test-driven-development、systematic-debugging、requesting-code-review | **复用成熟执行层**；不再新造通用 TDD/debug/review 技能 | `testing`、`debugging`、`code-review` 已是方法层，不构成产品差异 |
| worktree、子代理、批量执行 | using-git-worktrees、subagent-driven-development、executing-plans | **按运行环境能力复用**；MY2 不以 agent swarm/worktree 本身作为产品路线 | OD-N8-001 已冻结重复执行工作流扩张 |
| 项目专属上下文 | 通用 skill 体系不拥有某个项目的已确认事实/规则生命周期 | **保留并继续验证** `project-profile -> project-preset -> validate -> context` | N8.1 的确定性 validator/context 与外部项目 fallback 行为 |
| 高影响 Owner 选择 | 通用工作流可要求确认，但不拥有本仓模块/类型/任务匹配事实 | **保留** Owner Decision Brief + `decision validate` + delivery preflight | N8.2 的模块/类型/确认状态拦截证据 |
| 产品到任务的一致性 | 通用计划不拥有此项目的 Product Model、Architecture、roadmap、change/operations 关系 | **保留** Planning/Change/Operations contracts 作为治理核心 | N3-N7 及 N8.3 的追溯证据 |
| 发布与运行保障 | 通用完成流程不替代环境、威胁模型、恢复和回滚的项目证据 | **保留** N7 `/ship` 与 readiness 合同 | N7 明确安全/运行边界 |

## 产品形态结论

MY2 不是第二个 Superpowers，也不应继续试图成为更完整的通用编码执行框架。

它的可观察价值是：在任何成熟执行层之上，保存项目已确认事实，阻止工具权限绕过 Owner 的高影响选择，并让产品、架构、任务、变更与运行证据保持可追溯。通用 TDD、debug、review、worktree、subagent 工作流是“可插拔执行层”，不是 MY2 的后续建设指标。

## 保留 / 复用 / 不做

- 保留：Product Brief / Model / Architecture / roadmap 读取链、project-preset lifecycle、Owner Decision Gate、Change Impact、Operational Readiness、状态投影。
- 复用：通用探索、计划、TDD、调试、代码审查、worktree、子代理执行。现有本仓方法只维持必要的入口契约，不继续增殖同类 framework。
- 不做：自动安装 Superpowers、vendoring/复制其 skills、扩张技术栈 preset 目录、实现新的通用 agent swarm 或第二套状态数据库。

## 未通过项与 N8.5 输入

- Claude Code A1-A4 实机输出仍未获得。`claude auth status` 表示已登录，但 2026-07-12 的无工具 `claude -p` 调用在 34-64 秒内超时且无模型输出；Claude session 日志确认本地推理 gateway `localhost:20128` 返回 502。这只能记为环境/可用性阻塞，不能记为行为通过。
- N8.3 D21 使用已有 PRD 的回放式入口，不是一个全新、无上下文的实时 Owner 输入。
- 因此推荐 N8.5 采取“治理层切换，但明确接受有限 Dogfood 证据”的方案；若 Owner 不接受该风险，则保持 N8 `in_progress`，等待 Claude 可用后补测，不删除或归档任何主线 artifact。
