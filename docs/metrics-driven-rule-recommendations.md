# 指标驱动规则推荐机制

## 目标

指标驱动规则推荐机制把重复失败、review 打回、check 问题和估算偏差转化为可审查的规则建议，让项目规则来自真实交付摩擦，而不是主观堆约束。

它回答四个问题：

1. 哪类问题重复出现。
2. 现有规则是缺失、过重、过轻还是表达不清。
3. 应该新增、调整、删除还是放宽 project rule。
4. 采纳建议后，应该用什么指标验证它真的减少返工。

T7.2 只做文档契约，不实现自动推荐器、不自动修改 `.agents/rules/`、不自动写 `project-preset/`。

## 数据来源

| 数据源 | 字段或内容 | 用途 |
|--------|------------|------|
| `.claude/workspace/events.jsonl` | `checkIssueCount`、`checkFixRounds`、`reviewRejectCount`、`testFailureCount`、`failureRecovery`、`estimateHours`、`actualHours` | 机器事实来源 |
| `.claude/workspace/metrics.md` | 最近 5/10 次趋势摘要 | 人类可读趋势 |
| `workspace/reviews/*.md` | finding、severity、剩余风险 | 审查打回原因 |
| `workspace/releases/*.md` | release gate、风险、回滚 | 发布失败或风险来源 |
| `docs/productivity-tasks.md` / `tasks.md` | blocked、Gate 结果、验收命令 | 当前任务上下文 |
| `.agents/rules/` / `project-preset/rules/` | 已有规则文本 | 判断是否缺规则或规则过重 |

冲突时，以 `events.jsonl` 和最新 review/release report 为事实来源；`metrics.md` 只作为摘要。

## 推荐类型

| 类型 | 含义 | 示例 |
|------|------|------|
| `add_rule` | 新增规则 | 重复遗漏回归测试，新增测试规则 |
| `adjust_rule` | 调整已有规则 | 某规则太泛，改成可执行 checklist |
| `delete_rule` | 删除低价值规则 | 从未触发、持续造成维护噪音的规则 |
| `relax_rule` | 放宽过重规则 | S 级修复不再要求完整 gate |
| `add_template` | 新增模板 | release report 常漏回滚，增加模板字段 |
| `add_check` | 新增自动检查 | 重复 Markdown 表格破损，增加 docs lint |
| `no_action` | 不建议改规则 | 样本不足或属于一次性问题 |

默认先输出建议，不直接修改规则。只有用户确认后，才进入 `/dev` 或 `/fix` 修改具体文件。

## 触发信号

| 信号 | 触发条件 | 推荐方向 |
|------|----------|----------|
| 重复失败 | 最近 10 条非 `/standup` 事件中同一 `failureRecovery.failureType` 出现 >= 2 次 | `add_rule` 或 `add_check` |
| 同根因失败 | 最近 10 条事件中同一 `failureRecovery.rootCause` 出现 >= 2 次 | `adjust_rule` 或补测试 |
| review 打回 | 同模块 `reviewRejectCount >= 1` 且 finding 可归类 | `add_rule` 或 `adjust_rule` |
| check 问题多 | 最近 5 次同类任务平均 `checkIssueCount >= 5` | `add_rule` 或 `add_check` |
| 修复轮数高 | 最近 5 次同类任务平均 `checkFixRounds >= 2` | `adjust_rule`，把检查前移 |
| 测试失败 | 最近 5 次任务 `testFailureCount >= 1` | `add_rule`，要求回归测试或记录例外 |
| 估算偏差大 | 有效样本中偏差绝对值 >= 50% | `adjust_rule`，要求拆小或更新估算 |
| 规则噪音 | 规则触发但用户反复接受风险或跳过 | `relax_rule` 或 `delete_rule` |
| 规则无效 | 采纳后指标没有改善 | `adjust_rule` 或 `delete_rule` |

样本量不足时，输出 `no_action` 或保持观察，不新增规则。

## 问题归类

| 类别 | 典型证据 | 可能规则 |
|------|----------|----------|
| 测试覆盖不足 | test failure、review 要求补回归 | 测试策略、回归测试要求 |
| 契约不同步 | smoke test fail、command/skill 不一致 | 同步源和生成物规则 |
| 文档可读性 | Markdown 表格、路径、状态字段错误 | docs lint 或文档模板规则 |
| 发布风险 | release report blocked、回滚缺失 | release checklist |
| 安全风险 | hook critical、敏感信息、命令注入 | security rule |
| 范围膨胀 | 小任务频繁变大、估算偏差高 | 任务拆分规则 |
| 流程过重 | S/M 任务反复被完整流程拖慢 | 流程放宽规则 |

## 推荐输出契约

规则推荐必须输出固定结构，便于 `/standup`、Workbench 或后续 review 引用：

```markdown
## Rule Recommendation

- id: RR-YYYYMMDD-001
- type: add_rule / adjust_rule / delete_rule / relax_rule / add_template / add_check / no_action
- target: .agents/rules/<name>.md / project-preset/rules/<name>.md / docs/templates/<name>.md
- severity: high / medium / low
- confidence: high / medium / low
- evidence: [events.jsonl lines, review report paths, release report paths, metrics summary]
- problem: [重复问题摘要]
- recommendation: [建议新增、调整、删除或放宽什么]
- expected impact: [预计改善哪个指标]
- validation metric: [采纳后怎么验证]
- requires human confirmation: yes / no
- next action: [继续观察、创建任务、修改规则、拒绝建议]
```

## 规则建议状态

| 状态 | 含义 |
|------|------|
| `proposed` | 已生成建议，等待确认 |
| `accepted` | 用户同意进入实现 |
| `implemented` | 规则或模板已修改 |
| `rejected` | 用户拒绝或证据不足 |
| `watching` | 保留观察，暂不行动 |
| `superseded` | 被更新建议替代 |

建议状态不回写旧事件；如果建议被采纳，后续 `/dev` 或 `/fix` 追加新事件记录实现结果。

## 推荐记录路径

| 路径 | 用途 |
|------|------|
| `workspace/rule-recommendations/YYYY-MM-DD-<scope>.md` | 单次推荐报告 |
| `workspace/rule-recommendations/index.md` | 可选总览 |
| `.claude/workspace/events.jsonl` | 记录推荐生成、实现或拒绝事件 |

T7.2 不要求创建实际推荐报告，只定义路径和格式。

## 推荐决策矩阵

| 证据强度 | 影响范围 | 建议动作 |
|----------|----------|----------|
| 高 | 多模块或发布风险 | 创建 `/dev` 任务实现规则 |
| 高 | 单模块 | 先在 project-preset/rules 中新增局部规则 |
| 中 | 多次轻微问题 | 输出 `watching`，下一次重复再行动 |
| 低 | 单次问题 | `no_action`，只记录观察 |
| 任意 | 用户维护成本明显增加 | 优先 `relax_rule` 或 `delete_rule` |

## 采纳后的验证

每条被采纳的规则建议必须定义至少一个验证指标：

| 推荐类型 | 验证指标 |
|----------|----------|
| `add_rule` | 同类 `reviewRejectCount` 或 `checkIssueCount` 下降 |
| `adjust_rule` | 修复轮数下降，打回原因减少 |
| `delete_rule` | 跳过/接受风险次数下降，质量不退化 |
| `relax_rule` | S/M 任务耗时下降，critical/major 不上升 |
| `add_template` | report 缺字段问题下降 |
| `add_check` | 问题在本地 gate 前被拦截 |

验证窗口默认最近 5/10 次同类任务；样本不足时继续观察。

## 防止规则膨胀

新增规则前必须检查：

- 现有规则是否已经覆盖，只是表达不够清楚。
- 是否可以用模板或 checklist 解决，而不是硬规则。
- 是否只影响一个任务，没必要长期化。
- 是否会让 S/M 小任务变慢。
- 是否有明确删除条件。

每条新增规则都应包含“何时不适用”或“例外条件”，避免把一次事故变成永久负担。

## 和现有流程的关系

- `/standup`：可以展示最近触发的 rule recommendations，并说明证据来源。
- `/review-all`：可以把重复 finding 转成 `proposed` recommendation。
- `/ship`：如果 release 风险重复出现，可以建议 release rule 或 template。
- Workbench Insights：未来展示推荐状态和验证指标。
- `external-skill-agent-registry`：如果建议引入外部 skill/agent，应先进入 ecosystem registry，而不是直接采纳。

## 非目标

- 不自动修改 `.agents/rules/`。
- 不自动创建 project-preset。
- 不把每个失败都升级成规则。
- 不要求用户手工维护 metrics。
- 不替代 review 或 release gate 的人工判断。

## 验收标准

- 能从 repeated failures、review 打回、check 问题和估算偏差生成规则建议。
- 建议明确是新增、调整、删除、放宽、加模板、加检查还是不行动。
- 每条建议必须包含证据、预期影响和验证指标。
- 明确防止规则膨胀和流程过重。
- 不实现自动改规则，只定义文档契约。
