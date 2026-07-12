# N8.1 Project Preset Lifecycle Spec

> 状态：in_progress
> Spec ID：N8-SPEC-001
> Roadmap Module：N8
> Product Brief：`product-brief.md`
> Product Model：`product-model.md`
> Capability ID：C8
> Journey ID：J1,J2
> Architecture：`architecture.md`
> Architecture Component ID：A2,A4,A5,A7
> Affected Components：A1,A2,A4,A5,A7
> Dependency Direction：A2 -> A4 -> A5 -> A7(read-only)，A1 只负责入口适配
> Security Impact：project-preset 只能保存已确认的项目事实和脱敏规则；validator 不读取秘密，不允许把项目内容复制到会被 update 覆盖的配置目录
> Operational Impact：已新增本地只读 validator/context CLI；N8.1.5 只允许在 Owner 确认后按最小 diff 更新 project-preset，不执行部署、不从 metrics/events 自动写入规则
> 执行包：`.claude/workspace/features/n8-project-preset-lifecycle/`
> 更新于：2026-07-12

## 开工说明

`base` 已要求项目通过 `/project-preset` 生成 `project-profile/` 与 `project-preset/`，但这条链目前只停留在命令文档：没有确定性校验、没有统一的加载结果、下游入口也没有可测试的一致读取约束。N8.1 将项目 preset 变为可验证、可发现、可被核心流程加载的项目治理输入；它不把项目内容叠加或复制进 `.claude/`、`.agents/`、`.codex/`。

2026-07-12 复盘发现：N8.1.1-N8.1.4 已完成 generate/review/validate/activate 的结构与加载契约，但 feedback 仍只是“何时应更新”的文档约定，没有可验证的行为闭环。因此本 spec 重开 N8.1.5，不重做已通过的四个子任务。

## 本次包含

- 定义 Project Preset Contract：目录边界、manifest 字段、规则/spec/skill 引用、curation 结论、项目事实与未确认推断的边界。
- 实现 `project-preset validate`，校验合法 JSON、必要文件、manifest 引用、规则目录、禁止目录、curation 结论和项目专属 skills 的最小合同。
- 实现只读 `project-preset context [--json]`，输出存在状态、加载优先级与应读取的 PRESET/rules/specs 文件；它不宣称 agent 已理解内容。
- 让 `/plan`、`/dev`、`/fix`、`/check`、`/review-all`、`/ship`、`/standup` 在 project-preset 存在且通过校验时遵守相同加载顺序；缺失或未通过时明确降级，不阻塞尚未生成 preset 的既有项目。
- 为有效、缺失、非法 manifest、越界目录、丢失引用和未确认 curation 结论添加 CLI/smoke 回归测试，并验证 Claude/Codex 同步产物不漂移。
- 建立最小 feedback 闭环：从 review/standup/events 或 Owner 明确反馈中引用可复核证据，生成 preset 候选修改；只有 Owner 确认且 skill-curator 审查通过后，才能最小化更新并重新 validate/context。

## 本次不包含

- 自动生成或修改任何项目的 `project-profile/`、`project-preset/` 内容。
- 把 project-preset 复制、合并或写入 `.claude/`、`.agents/`、`.codex/`，也不改变 `update` 的覆盖边界。
- 新增通用技术栈 preset、外部 skill 市场或新的通用 TDD/调试/审查执行框架。
- N8.2 的 Owner Decision Gate、N8.3 的三个真实项目 dogfood、N8.5 的迁移或删除。
- 不根据一次偶发失败自动学习规则；不让 `/standup`、metrics 或 events 直接改写 project-preset；不在未确认时修改项目事实。

## 验收场景

### D13：完整项目 preset 能被验证和发现

输入：包含合法 manifest、PRESET、curation、规则、spec 和可选 skills 的项目 preset。

期望：`project-preset validate` 返回 pass；`project-preset context --json` 返回稳定的加载顺序和实际文件列表，且不会改写任何文件。

### D14：无效或越界 preset 被拒绝

输入：manifest 非法、声明文件不存在、`project-preset/.claude/` 或 `.agents/` 出现、curation 缺少结论，或 skill 不符合最小 SKILL 合同的 fixture。

期望：validator 返回具体问题和修复动作；不把无效 preset 当作可加载上下文。

### D15：核心入口一致加载

输入：base 初始化后的项目存在有效 project-preset。

期望：Claude 源命令与生成的 Codex command skills 都声明同一读取顺序：先 `PRESET.md`，再相关 rules，再按需读 specs；不存在 preset 时明确继续使用 base/技术栈配置，不阻塞已有项目。

### D25：真实反馈受控更新 project-preset

输入：一个已激活 project-preset 的真实项目，以及一条可追溯到 Owner 反馈或重复失败证据的改进信号。

期望：AI 先展示证据、建议修改、不改的文件和风险；Owner 未确认时文件不变。确认后只修改相关 profile/preset 文件，更新 `manifest.json.updatedAt`，经 skill-curator 审查后 `validate` 与 `context` 通过，并能证明后续入口读到新规则。

## 验收标准

- `project-preset validate` 与 `context` 均为只读命令，且可在不含 project-preset 的项目中给出可操作降级结果。
- 有效 preset 的 manifest、目录和引用均可自动验证；非法结构能定位到路径和字段。
- 七个核心流程入口以及生成后的 Codex skills 使用同一读取顺序，且不把项目规则复制到可被 update 覆盖的位置。
- 至少一个已激活的真实 project-preset 完成 feedback -> proposal -> Owner confirmation -> curation -> validate/context -> reload 闭环；拒绝或未确认时不产生规则更改。
- `npm run validate`、`npm test`、`npm run gate`、`npm run test:tarball` 和 planning validate 通过。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| validator 变成第二份项目状态 | 只校验结构与引用，不保存运行状态、不生成或回写 preset |
| context 输出被误认为 agent 已遵守规则 | 输出明确区分“可加载文件”和“执行证据”；实际遵守由命令契约及后续 dogfood 验证 |
| 对旧项目形成硬阻塞 | 仅当 project-preset 存在时要求通过校验；不存在时明确降级 |
| 项目内容被 update 覆盖或污染生成入口 | validator 拒绝 `.claude/`、`.agents/`、`.codex/` 嵌套目录；测试覆盖 update/tarball |
| curation 结论难以机器解析 | v1 只校验固定“审查结论”字段和值；复杂语义仍由 skill-curator 审查 |
| 把偶发失败固化成项目规则 | 候选修改必须引用 Owner 反馈或可复核的重复证据，且经 Owner 确认与 curator 审查 |
| feedback 机制演变为自动学习系统 | 仅做最小修改建议和受控更新，不引入数据库、规则排名或自动写入 |

## Spec/Task Quality Gate

- Product Lead：pass。N8.1 直接验证 Owner 已确认的 base/project-preset 路线，不扩展通用执行层或 preset 目录。
- Architect-Planner：pass。采用只读 contract + validator/context + 入口读取约束，不引入数据库、覆盖式 overlay 或新的状态源。
- Delivery Steward：pass。project-profile、project-preset、planning artifact 与 events 的 owner 边界保持不变；无效 preset 不能静默成为事实源。
- Builder readiness：pass。N8.1.5 的产品价值是让长期项目规则能从真实使用中安全演进；本轮只建立候选修改、明确确认和重新校验链路，不自动更新任何项目规则。用户已确认实现该机制；只有真实项目的具体规则内容需在最后独立确认。
