# Change Impact Contract

> 状态：active
> Contract ID：CIC-VNEXT-001
> Planning Contract：PAC-VNEXT-001
> Delivery Contract：CDC-VNEXT-001
> Architecture ID：ARCH-VNEXT-001
> Owner：A4 Planning Context + A5 Delivery Control
> 更新于：2026-07-11

## 目的

当 Owner 说“这里不好用”“想改这一处”时，先把问题定位到产品、架构、规划、交付或运行层，再列出受影响的 artifact、必须同步项和验证方式。它让局部修改可解释、可检查，但不取代 N7 的安全、发布和运行保障。

## 事实与边界

- 用户反馈和已验证运行事实可以触发分析，不能自动改写 Product Brief、Product Model 或 Architecture。
- Product Model 拥有用户结果、Journey 和成功标准；Architecture 拥有组件边界、接口、兼容和安全边界；roadmap/spec/tasks 分别拥有模块、范围和执行状态。
- Change Impact Brief 是一次变更分析，不是第二份 roadmap、spec、tasks 或状态数据库。
- `change analyze` 只读取 N4 主链；`change validate` 只校验 Brief 的引用、同步项和验证计划，不修改任何 artifact。

## Change Impact Brief

路径：`.claude/workspace/changes/YYYY-MM-DD-<change-id>.md`。

最小头部：

```markdown
> Change ID：CI-20260711-001
> Status：draft
> Source Feedback：用户看不清当前任务为什么被阻止
> Change Kind：experience
> Owner Layer：A2,A4,A5
> Target Module：N6
> Capability ID：C6
> Journey ID：J3
> Architecture Component ID：A4,A5
> Affected Components：A2,A4,A5
> Dependency Direction：A6(feedback) -> A2/A3 -> A4 -> A5 -> A6
> Change Scope：product,planning,delivery
> Analysis Command：`node create-claude-team/cli.js change analyze N6 --kind experience`
```

必须包含以下章节：

1. `## 归属判断`：用户问题属于哪一层、为什么不是其他层。
2. `## 影响范围`：上游事实、目标模块、依赖/使用方、实现和证据边界。
3. `## 同步项`：每一项以 `- [ ]` 或 `- [x]` 写明 artifact/代码/测试和动作。
4. `## 验证计划`：至少说明 planning、受控交付、相关测试和用户可观察结果如何验证。

## Change Kind 与同步项

| Kind | 主归属 | 最低同步项 |
|---|---|---|
| `experience` | A2 -> A4 -> A5 | Product Model/Journey 复核、feature spec acceptance、实现入口和用户流程测试 |
| `behavior` | A4 -> A5 | feature spec、tasks、实现、回归测试和 review |
| `architecture` | A3 -> A4 -> A5 | `architecture.md`、ADR、受影响 spec/tasks、兼容/迁移验证 |
| `security` | A3 -> A5 -> A6 | Security Impact、Threat Model、N7 安全与恢复证据引用 |
| `operational` | A5 -> A6 | Operational Impact、发布/监控/恢复证据引用，交由 N7 完整验证 |

高影响架构、安全、兼容、迁移、隐私或范围变化仍按 Architecture 和 Owner Decision Brief 规则处理。N6 只让影响和缺口可见，不越权替 Owner 决策。

## 工作流

```text
反馈或变更请求
  -> AI 运行 change analyze <module> --kind <kind>
  -> 创建 Change Impact Brief
  -> change validate <brief> = pass
  -> /fix 或 /dev 通过 N5 受控循环实现
  -> 更新 Brief 同步项和验证证据
  -> review 检查 Brief 与实际变更一致
```

`needs_revision` 表示 Brief 缺字段、影响或验证项；`blocked` 表示上游链无效、目标不存在或需要先解除依赖。两者都不得作为“先改了再说”的理由。
