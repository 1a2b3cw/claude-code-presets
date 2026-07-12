# Owner Decision Contract

> 状态：active
> Contract ID：ODC-VNEXT-001
> Planning Contract：PAC-VNEXT-001
> Delivery Contract：CDC-VNEXT-001
> Architecture ID：ARCH-VNEXT-001
> Owner：A2 Product Context；A5 只读验证
> 更新于：2026-07-12

## 目的

让高影响选择在开工前留下 Owner 能看懂、CLI 能检查的确认依据。它将“工具有权限”与“Owner 同意改变什么”分开：文件、shell、网络和自动批准权限从不构成确认，也不参与放行判断。

## Owner Decision Brief

路径：`.claude/workspace/decisions/YYYY-MM-DD-<module>-<topic>.md`。

最小头部：

```markdown
> Decision ID：OD-20260712-N8-002
> Status：awaiting_owner
> Decision Type：architecture
> Target Module：N8
> Requested By：Architect-Planner
> Related Spec：`.claude/workspace/features/n8-owner-decision-gate/spec.md`
```

`Status` 只能是：`draft` / `awaiting_owner` / `confirmed` / `rejected` / `superseded`。

`Decision Type` 只能是：`product_scope` / `architecture` / `security_privacy` / `irreversible_operation` / `release_risk`。可用逗号声明多个类型。

必须包含：

```markdown
## Owner Decision Brief
- Decision: [需要选择什么]
- Context: [为什么现在重要]
- Recommendation: [推荐及理由]
- Options:
  - A: [选项与取舍]
  - B: [选项与取舍]
- If no reply: [安全默认或暂停]

## Owner Confirmation
- Confirmed option: [仅在 Owner 明确回复后填写]
- Confirmed by: Owner
- Confirmation date: YYYY-MM-DD
```

只有 Owner 明确回复选择后，AI 才能把 Status 写为 `confirmed` 并填写确认字段。`draft`、`awaiting_owner`、`rejected` 与 `superseded` 都不能作为开工依据；AI 的推荐、推断、工具权限或自动批准模式也不能代替 Owner 回复。

## 开工规则

feature spec 用以下字段声明本轮是否需要确认：

```markdown
> Owner Decision Required：yes
> Owner Decision Types：architecture,security_privacy
```

- `yes`：开工前必须运行 `decision validate`，并在 `delivery preflight` 与进入 `in_progress` 的 transition 中传入同一 Brief。
- `no` 或旧 feature 未声明：不要求伪造 Brief，继续使用现有 planning、security 和 delivery 检查。
- Brief 的 `Target Module` 必须匹配当前模块，`Decision Type` 必须覆盖 spec 所列类型；其他模块、被拒绝或过期的确认不得借用。

```text
node create-claude-team/cli.js decision validate .claude/workspace/decisions/<brief>.md
node create-claude-team/cli.js delivery preflight <module> --task <task-id> --decision .claude/workspace/decisions/<brief>.md
node create-claude-team/cli.js delivery transition <module> <task-id> in_progress --decision .claude/workspace/decisions/<brief>.md
```

`decision validate` 和 delivery gate 都是只读检查：不修改 Brief、tasks、roadmap 或权限配置。它们能验证确认记录的结构、状态和匹配关系，但不能仅凭仓库内 Markdown 证明确认者一定是人；N8.3 必须用真实交互验证漏问和误打断，若需要抗伪造证明，另行接入仓库外可信确认机制并取得 Owner Decision。

历史 Decision Brief 不会自动被转换成 `confirmed`：缺少本合同字段的旧文件只能保留为参考或迁移输入；若要作为新的开工/发布证据，必须由 Owner 明确重新确认并补齐本合同字段。

## 与 N7 的边界

N8.2 只控制“能否开始这项高影响工作”。认证、授权、支付、隐私、数据迁移和正式发布仍必须遵循 N3/N7 的 Threat Model、Readiness Brief、回滚和环境验证；Decision Brief 不能替代它们。
