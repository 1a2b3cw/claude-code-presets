# N8.4 Ecosystem Boundary Spec

> 状态：completed
> Spec ID：N8-SPEC-004
> Roadmap Module：N8
> Product Brief：product-brief.md
> Product Model：product-model.md
> Capability ID：C8
> Journey ID：J1,J2
> Architecture：architecture.md
> Architecture Component ID：A2,A4,A5,A7
> Affected Components：A1,A2,A4,A5,A6,A7
> Dependency Direction：A1 -> A2/A3 -> A4 -> A5 -> A6 -> A7(read-only)
> Security Impact：只读取公开生态资料和本仓已存在的规则/代码；不安装第三方插件、不执行远程脚本、不读取秘密。
> Operational Impact：新增边界报告和 N8 编号映射；不改变运行时、不删除历史 artifact、不发布。
> Owner Decision Required：no
> 执行包：.claude/workspace/features/n8-ecosystem-boundary/
> 更新于：2026-07-12

## 开工说明

N8.1-N8.3 已提供 project-preset、Owner Decision 和真实项目 Dogfood 证据，但历史生命周期包曾把内部任务编号写成 `N8.1` 至 `N8.4`，与 roadmap 的 N8 阶段重号。与此同时，Superpowers 等成熟生态已提供通用 brainstorming、TDD、debug、worktree、subagent 和 code review 方法；N8 必须明确复用而非重造的边界，才不会把治理层伪装成通用执行框架。

## 本次包含

- 将最初 Project Preset Lifecycle 的四项内部任务映射为 `N8.1.1` 至 `N8.1.4`，不改变其已完成事实或原始证据路径。
- 审计 N8.1-N8.3 的 spec/tasks/review/events 状态，修正 `draft`、`review_gate` 与已完成证据冲突。
- 以公开的 `obra/superpowers` README、许可证和近期活动为外部对照，分类通用执行能力与 MY2 的项目治理能力。
- 产出“复用 / 保留 / 不做”边界，形成 N8.5 的唯一输入；不安装、不复制 Superpowers。

## 本次不包含

- 不把第三方技能整体复制进本仓，不新增通用 TDD、debug、worktree、subagent 或 review 执行层。
- 不删除、移动或归档 legacy artifact；该不可逆影响由 N8.5 Owner Decision 决定。
- 不宣称 Claude 已实机通过：CLI 超时或未返回必须保留为未验证证据。

## 验收场景

### E1：编号和状态可由人及 CLI 正确理解

输入：最初 Lifecycle 包与 roadmap N8 阶段同时存在。

期望：Lifecycle 内部任务使用 `N8.1.1` 至 `N8.1.4`；N8.2、N8.3 不再被误读成初代 Lifecycle 子任务；所有已完成 package 的 spec/tasks 状态一致。

### E2：生态边界不是主观印象

输入：Superpowers 的公开 README、LICENSE、仓库元数据及 MY2 已有产品/架构/决策证据。

期望：每项能力有来源、分类、保留或复用结论；只保留 project facts、project-preset、Owner Decision、planning/change/operations evidence 这些可观察治理价值。

### E3：未验证证据不会被消音

输入：Claude CLI 已认证但无工具的 print 调用在限定时间内超时。

期望：报告明确该项为未验证/环境阻塞；不得以 Codex 或静态同步替代 Claude 实机通过。

## 验收标准

- `planning validate` 通过；N8 生命周期编号不再与 roadmap 阶段冲突。
- 生态报告有来源、许可证、安全评估、能力映射和明确“不做”列表。
- N8.5 的切换/收敛 Brief 只引用本报告、Dogfood 和现有 Owner Direction；没有提前执行高影响迁移或归档。

## Spec/Task Quality Gate

- Product Lead：pass。该任务直接回答项目和成熟执行层的差异，防止继续重复建设。
- Architect-Planner：pass。只修复事实可读性并产出边界，不改变业务运行时或上游架构。
- Delivery Steward：pass。编号映射与报告不制造第二份 roadmap 状态；历史证据保留原路径。
- Builder readiness：pass。
