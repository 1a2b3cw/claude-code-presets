# N2 产品模型 Spec

> 状态：active
> Spec ID：N2-SPEC-001
> Roadmap Module：N2 产品模型
> Product Brief：`product-brief.md`
> Product Model：`product-model.md`
> Capability ID：C2
> Journey ID：J1
> 执行包：`.claude/workspace/features/n2-product-model/`
> 更新于：2026-07-11

## 开工说明

N1 已让 AI 能与 Owner 共同探索，但后续仍可能只留下 Product Brief 和模块表，无法回答某个模块服务哪个用户结果、某项反馈属于哪里。N2 增加一个轻量、可读、带稳定 ID 的 Product Model，作为 Product Brief 与架构/roadmap 之间的产品层事实源。

## 目标与范围

### 本次包含

- 定义 Product Model 的唯一职责、读取顺序和与 Product Brief/roadmap/spec 的边界。
- 建立当前项目的目标用户、用户任务、能力、边界、核心旅程和成功标准。
- 让 Product Lead、Architect-Planner、Delivery Steward 与 `/plan` 在存在模型时读取并使用它。
- 用静态契约和 Codex dogfood 验证 AI 能映射能力、维护范围边界并保持两端一致。

### 本次不包含

- N3 的技术架构、模块图、接口、数据流或 ADR。
- N4 的 structured Project Model、引用自动检查或状态读取器迁移。
- 修改 Workbench、metrics 或引入新的可视化界面。
- 将未决问题升级为 Owner 已确认事实。

## 事实源与依赖

```text
Product Brief (positioning, scope, constraints)
  -> Product Model (user results, capabilities, journeys, success)
    -> Architecture (N3)
      -> Roadmap / feature spec / tasks (N4)
```

- `product-brief.md` 是产品定位、范围和高层约束的事实源。
- `product-model.md` 是产品能力、用户旅程、边界与成功标准的事实源。
- `roadmap.md` 只维护模块优先级、依赖和状态；本次只为 N2 增加对 Capability ID 的可追溯说明，不把执行状态复制进模型。
- feature package 只维护当前模块 spec/tasks/review。

## 产品模型契约

Product Model 必须包含：

1. 产品模型用途与 artifact 边界。
2. 目标用户及其待完成任务。
3. 带稳定 `Capability ID` 的能力地图，并映射到 roadmap 模块。
4. 带稳定 `Journey ID` 的核心用户旅程、成功结果与能力引用。
5. 产品边界、明确非目标和可观察成功标准。
6. 只保留真正影响后续方向的未决问题，并明确 N3/N4/N8 的处理归属。

## 命令与角色行为

- `/plan`：在已存在 Product Brief 后读取 Product Model；新想法必须先判断是现有能力、边界外请求还是新的候选能力，不能直接把功能塞入 roadmap。
- Product Lead：根据目标用户、Capability ID、Journey ID 和非目标判断价值与范围；不将未确认推断写回模型。
- Architect-Planner：N3 及后续 feature 规划前读取模型，技术方案必须说明支撑的 Capability ID/Journey ID。
- Delivery Steward：检查 Brief、Model、roadmap、spec 是否各自拥有不同事实，不制造重复状态。

## 验收场景

### B1：能力映射

输入：“我想让 AI 在用户提出体验问题时告诉我该改哪、还要同步哪些东西。”

期望：AI 识别为 C6 变更影响与完整性，说明它属于 J3，不把它误写成 C2 或独立无归属任务。

### B2：边界保护

输入：“先给 Workbench 加更多指标看板和自动化面板。”

期望：AI 指出该请求落在当前明确不做范围，解释原因并推荐先完成主线能力；不得静默放进 MVP roadmap。

### B3：跨入口一致性

在 Claude 源命令和 Codex generated skill 中都能找到 Product Model 的读取、能力映射、范围检查和不把推断写成事实的契约。

## 验收标准

- `product-model.md` 能让 Owner 不阅读 tasks 也能理解用户、能力、旅程、边界和成功标准。
- Product Brief、Product Model、roadmap 和 N2 spec 各自职责清楚，没有重复维护模块状态。
- Claude/Codex 入口和三类角色都具备相同 Product Model 读取约束。
- Codex B1/B2 dogfood 通过；每次发现的行为缺口都有修订和复验。
- `npm run validate`、`npm test`、`npm run test:tarball`、events 校验和 `/review-all N2` 通过。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 模型复制 Product Brief 或 roadmap | 写明 artifact 责任表，Review 专查重复状态 |
| 能力地图变成抽象口号 | 每项能力必须映射用户结果、journey 和 roadmap 模块 |
| 过早锁定结构化存储 | 本轮仅定义稳定信息模型和 Markdown 视图，N4 决定存储 |
| AI 把新功能自动加入 MVP | 命令要求先映射能力或标记为边界外，再给推荐 |

## Spec/Task Quality Gate

- Product Lead：pass。N2 直接解决用户无法定位体验问题归属、规划关系不清的问题。
- Architect-Planner：pass。改动集中在产品模型、规划角色契约、同步生成和静态测试；不进入 N3 技术方案。
- Delivery Steward：pass。模型放在根目录作为稳定产品事实，执行过程留在 feature package，且不新增 root tasks。
- Builder readiness：pass。
