# Planning Artifact Contract

> 状态：active
> Contract ID：PAC-VNEXT-001
> Product Brief ID：PB-VNEXT-001
> Product Model ID：PM-VNEXT-001
> Architecture ID：ARCH-VNEXT-001
> Roadmap ID：RM-VNEXT-001
> Owner：A4 Planning Context
> 更新于：2026-07-11

## 目的

让每个开发任务能从执行状态回溯到 spec、roadmap、架构组件、产品能力和用户旅程；让 AI、CLI status 与 Workbench 从同一主线读取，而不是各自维护状态副本。

## 事实源与读取顺序

| 事实 | 唯一事实源 | 读取者 | 禁止替代 |
|---|---|---|---|
| 产品定位、范围、约束 | `product-brief.md` | A1-A6 | roadmap、spec、tasks |
| 用户结果、能力、旅程、成功标准 | `product-model.md` | A1-A6 | architecture、roadmap |
| 组件边界、依赖、安全、兼容 | `architecture.md` 与 ADR | A1、A3-A6 | roadmap、tasks、Workbench |
| 产品模块、优先级、依赖、模块状态 | `roadmap.md` | A1、A4-A7 | feature tasks、events、legacy roadmap |
| 当前 feature 执行状态 | `.claude/workspace/features/<feature>/tasks.md` | A4-A7 | roadmap 进度区、events |
| 审查、发布与运行证据 | `.claude/workspace/{reviews,releases,events.jsonl}` | A5-A7 | roadmap、tasks |

读取顺序固定为：Product Brief -> Product Model -> Architecture -> Roadmap -> feature spec -> feature tasks -> evidence。A7 只能投影，不可回写或改变前六类事实。

## 标识与引用

| Artifact | 必须稳定 ID | 必须引用 |
|---|---|---|
| Product Brief | `Product Brief ID` | 无上游 artifact |
| Product Model | `Model ID` | `Product Brief ID` |
| Architecture | `Architecture ID` | `Product Brief ID`、`Product Model ID` |
| Roadmap | `Roadmap ID` | `Product Brief ID`、`Product Model ID`、`Architecture ID` |
| Roadmap module | `Module ID` | `Capability ID`、`Architecture Component ID`、模块依赖 |
| Feature spec | `Spec ID` | Module、Capability、Journey、Architecture Component、影响组件、依赖方向、安全与运行影响 |
| Feature tasks | `Task Set` | Spec、Roadmap Module、执行包 |

`Capability ID`、`Journey ID` 与 `Architecture Component ID` 必须指向上游定义，模块、spec 与 task 不能复制这些上游定义。

## Feature Spec 最小头部

```markdown
> Spec ID：N4-SPEC-001
> Roadmap Module：N4
> Product Brief：`product-brief.md`
> Product Model：`product-model.md`
> Capability ID：C4
> Journey ID：J1,J2
> Architecture：`architecture.md`
> Architecture Component ID：A4
> Affected Components：A4,A5,A7
> Dependency Direction：A3 -> A4 -> A5/A7(read-only)
> Security Impact：planning artifact must not contain secrets
> Operational Impact：status and Workbench projection only
> 执行包：`.claude/workspace/features/<feature>/`
```

`Security Impact` 与 `Operational Impact` 可以为 `none`，但不能缺失。高影响变更仍按 Architecture 的 ADR/Owner Decision Brief 规则处理。

## 状态与迁移

- roadmap 模块状态只能是 `planned` / `in_progress` / `blocked` / `done` / `shipped`。
- feature task 状态只能使用团队的 tasks 状态机；任务完成不自动覆盖 roadmap 模块状态。
- 根目录 `spec.md`、`docs/*roadmap.md`、`docs/*tasks.md` 是 `reference`/legacy 输入，不可成为当前主线；N8 决定归档或删除。
- `.claude/workspace/` 是执行与证据根；根目录 `workspace/` 只作 legacy 兼容。

## 校验与投影

- `node create-claude-team/cli.js planning validate` 校验 ID、引用、模块依赖、feature package 与状态所有权。
- `create-claude-team status` 优先读取根 `roadmap.md` 与对应 feature package；缺少 vNext artifact 时才回退 legacy M6 读取。
- Workbench 使用与 CLI 相同的规划读取结果；它不能直接解析旧 roadmap 来定义当前主线。
