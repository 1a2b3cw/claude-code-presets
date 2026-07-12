# N8.2 Owner Decision Gate Spec

> 状态：completed
> Spec ID：N8-SPEC-002
> Roadmap Module：N8
> Product Brief：`product-brief.md`
> Product Model：`product-model.md`
> Capability ID：C8
> Journey ID：J1,J2
> Architecture：`architecture.md`
> Architecture Component ID：A2,A4,A5,A7
> Affected Components：A1,A2,A4,A5,A6
> Dependency Direction：A1 -> A2/A3 -> A4 -> A5 -> A6
> Security Impact：Decision Brief 只记录已确认的选择和去标识化理由；不得包含凭据、可识别用户信息或运行秘密。安全/隐私类决策只作为开工证据，不代替 N7 Threat Model、Readiness Brief 或真实发布检查。
> Security Risk Level：standard
> Threat Model：本模块不处理认证、授权或秘密；主要风险是把 AI 推断或工具权限误写成 Owner 确认。通过固定状态、目标匹配、只读 preflight 和命令/角色约束降低该风险。
> Operational Impact：新增本地只读 Decision Brief 校验与 delivery preflight 关联；不读取工具权限、不发起部署、不执行不可逆操作，也不替代 N7 发布门禁。
> Owner Decision Required：no
> 执行包：`.claude/workspace/features/n8-owner-decision-gate/`
> 更新于：2026-07-12

## 开工说明

现在的 Owner Decision Brief 主要写在命令说明里：AI 理论上应当在产品范围、长期架构、安全隐私、不可逆操作和正式发布前停下来问 Owner，但 `delivery preflight` 不会检查它。于是完全访问权限只要让 AI 继续执行，就可能把“应该询问”当成普通建议而直接开工。

N8.2 将这件事变成一个明确的开工条件：feature spec 声明需要 Owner 决策时，任务必须关联一份状态为 `confirmed`、目标一致的 Decision Brief，`delivery preflight` 才能返回 `pass`。工具权限、自动批准模式和文件系统访问能力不参与任何放行判断。

路线 A 已由 `OD-N8-001` 确认；Owner 于 2026-07-12 明确启动本轮实现，因此 N8.2 自身不需要再用尚未存在的 gate 阻塞自己。

## 本次包含

- 定义 Owner Decision Contract：Brief 的路径、稳定字段、状态、决策类型、目标模块、选项/推荐、Owner Confirmation 和生命周期。
- 实现只读 `decision validate <brief>` CLI，校验 Brief 的结构、状态、目标模块与本地引用边界。
- 在 feature spec 增加 `Owner Decision Required：yes/no`，并让 `delivery preflight <module> --task <id> --decision <brief>` 在 `yes` 时校验确认状态、目标模块和相关决策类型。
- 缺 Brief、`draft`/`awaiting_owner`、`rejected`、`superseded`、模块不一致或类型不匹配时，preflight 返回 `blocked`；普通 `no` 的低风险任务继续可开工。
- 更新 `/plan`、`/dev`、`/ship` 与相关角色文档：AI 可以准备 Brief 和推荐，但不得把未收到的 Owner 回复写成 `confirmed`；完全访问权限不构成确认。
- 添加行为 fixture，覆盖未确认阻止、已确认放行、低风险不误阻、发布入口与 Claude/Codex 同步契约。

## 本次不包含

- 不把所有技术选择都升级为 Owner 决策，不让普通代码风格、局部重构或低风险实现被频繁打断。
- 不读取或限制 Codex/Claude 的文件、网络、shell 或自动批准权限；那些权限与 Owner 是否同意改变范围是两件事。
- 不执行真实发布、部署、数据迁移、风险接受或不可逆操作；N7 `/ship` 和项目 CI/CD 仍负责这些动作。
- 不声称 Markdown 文件本身能证明“确认者一定是人”。仓库内校验只能验证确认记录是否存在且匹配；AI 不得伪造确认由命令/角色契约约束，真实交互是否漏问或误判由 N8.3 dogfood 验证。若未来需要抗伪造证明，必须接入仓库外的可信确认机制，另走 Owner Decision。

## Owner Decision Contract（拟实现）

Decision Brief 位于 `.claude/workspace/decisions/YYYY-MM-DD-<module>-<topic>.md`，最小头部为：

```markdown
> Decision ID：OD-20260712-N8-002
> Status：awaiting_owner
> Decision Type：architecture
> Target Module：N8
> Requested By：Architect-Planner
> Related Spec：`.claude/workspace/features/n8-owner-decision-gate/spec.md`
```

支持状态：`draft`、`awaiting_owner`、`confirmed`、`rejected`、`superseded`。

支持类型：`product_scope`、`architecture`、`security_privacy`、`irreversible_operation`、`release_risk`。一个 Brief 可声明多个逗号分隔的类型；任务开工只接受本轮 spec 声明所需的类型。

必须包含 `## Owner Decision Brief`（Decision、Context、Recommendation、Options、If no reply）与 `## Owner Confirmation`。只有 Owner 已明确确认选项后，才允许将 Status 改为 `confirmed`，并记录 Confirmed option、Confirmed by、Confirmation date。`rejected` 与 `superseded` 永远不是开工证据。

## 验收场景

### D16：高影响任务没有确认时真正停下

输入：feature spec 声明 `Owner Decision Required：yes` 且需要 `architecture`；任务状态为 `planned`，但没有 `--decision` 或 Brief 仍为 `awaiting_owner`。

期望：`delivery preflight` 返回 `blocked`，指出需要哪个 Brief、缺什么状态；任务不能迁移到 `in_progress`。结果不因完全访问权限、自动批准或 CLI 参数不同而改变。

### D17：已确认且匹配的决策允许开工

输入：同一任务提供通过 `decision validate` 的 `confirmed` Brief，Target Module 与 N8 一致，含 `architecture` 类型和完整 Owner Confirmation。

期望：在其余 planning/task 条件通过时，`delivery preflight` 返回 `pass`；返回结果列出所使用的 Decision ID，确保审查和追溯能看见开工依据。

### D18：错误或过期确认不能借用

输入：Brief 指向其他模块、类型不匹配、状态为 `rejected`/`superseded`，或缺少 Owner Confirmation。

期望：`decision validate` 或 `delivery preflight` 返回 `blocked`/`needs_revision` 并给出最小修复动作；不把旧的确认当通用授权。

### D19：普通低风险开发不被过度拦截

输入：feature spec 声明 `Owner Decision Required：no` 的局部实现任务。

期望：不传 `--decision` 仍按现有 planning、依赖、Spec/Task Quality Gate 与安全规则正常 preflight；不会因为本模块新增 Gate 造成无意义等待。

### D20：两个入口一致表达边界

输入：Claude 源命令、生成的 Codex skills 与角色文档。

期望：都明确“AI 只准备推荐和 Brief、Owner 明确回复后才能确认；权限模式不能绕过”；同步/打包后无漂移。

## 验收标准

- `decision validate` 和 `delivery preflight` 都为只读检查，不写入 Brief、tasks、roadmap 或权限配置。
- 高影响、明确标记为需要 Owner 决策的任务，没有匹配的 `confirmed` Brief 时不能开始；任务迁移也复用同一判断。
- 低风险 `no` 任务不需要伪造 Brief，保持现有开工体验。
- Decision Contract、CLI、delivery、`/plan`/`/dev`/`/ship`、角色文档以及 Claude/Codex 生成产物使用同一状态和术语。
- `npm test`、`npm run gate`、`npm run test:tarball`、planning/events 验证和跨文件审查通过。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 任务没有被标记为高影响，因而未进入 gate | 命令/角色契约要求先分类；N8.3 用真实项目统计漏问率并调整触发规则。 |
| AI 在本地文件中伪造 confirmed | 明确该 CLI 只验证记录，不能验证人类身份；命令禁止伪造，未来需要强保证时接入外部可信确认。 |
| Gate 变成每个细节都要 Owner 选择 | 只覆盖五类高影响类型；Spec 默认 `no`，fixture 验证低风险任务不受阻。 |
| 发布规则与开发规则重复或冲突 | N8.2 只控制开工依据；N7 仍控制 Threat Model、运行准备度和正式发布。 |
| 用工具权限作为放行理由 | 校验器不读取权限；所有入口明确权限不等于 Owner 确认。 |

## Spec/Task Quality Gate

- Product Lead：pass。N8.2 直接解决“AI 会直接做、Owner 没有决定机会”的产品风险，且不会把普通实现细节推回给 Owner。
- Architect-Planner：pass。复用 A4/A5 的 feature spec、delivery preflight 和任务迁移，不新建第二套状态源；Decision Brief 是 A2 决策证据，A5 仅只读验证。
- Delivery Steward：pass。Brief 只保存一次决策的状态与依据；roadmap、spec、tasks、release report 的事实归属不变。
- Builder readiness：pass。Owner 于 2026-07-12 明确启动 N8.2；实现先升级任务编号为 `N8.2.1` 格式，再建立决策门禁。
