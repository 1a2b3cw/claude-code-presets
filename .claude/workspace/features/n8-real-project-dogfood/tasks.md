# N8.3 Real Project Dogfood Tasks

> 状态：completed
> Task Set：N8.3-TASKS-001
> Spec：spec.md
> Roadmap Module：N8
> 执行包：.claude/workspace/features/n8-real-project-dogfood/
> 更新于：2026-07-12

## Spec/Task Quality Gate

- 当前结果：pass。
- 本轮范围：三类非本仓库场景、Dogfood Ledger、四项指标、证据报告和真实行为结论。
- 不做：未授权的外部项目写入、生产操作、真实高风险动作、公共 preset 孵化、N8.4/N8.5 收敛。
- Builder 状态：OD-N8-003 已确认；外部项目只读，证据写入本仓 Dogfood Ledger。

### N8.3.1 建立 Dogfood Ledger 与只读预检

- **任务 ID**：N8.3.1
- **状态**：done
- **描述**：创建脱敏 Ledger 模板，记录项目路径、Owner 授权、初始状态、请求、预期决策、preset 读取、追溯证据和结果；对三个候选项目只读预检。
- **验收标准**：每个场景都有可复核的输入/边界；未指定项目或写入范围时停在只读，不开始外部修改。
- **验收命令**：在各指定项目运行 project-preset context 和 git status。
- **阻塞原因**：无。
- **Gate 结果**：spec/task pass；decision confirmed；delivery preflight pass；transition pass；local pass（planning、decision、路径与格式核验）；review pass；release not_required
- **产物**：.claude/workspace/dogfood/2026-07-12-n8-ledger.md
- **最近更新**：2026-07-12

### N8.3.2 运行模糊新产品场景

- **任务 ID**：N8.3.2
- **状态**：done
- **描述**：在 Owner 指定的新项目中，从一句模糊想法走到清晰推荐、必要决策、项目事实和 preset 读取证据。
- **验收标准**：D21 通过；Owner 能复述推荐、边界和下一步；没有把 AI 推断伪装成确认事实。
- **验收命令**：D21 Ledger checklist、该项目的 project-preset validate/context 与 Owner 复核。
- **阻塞原因**：依赖 N8.3.1。
- **Gate 结果**：spec/task pass；decision confirmed；delivery preflight pass；transition pass；local pass（场景证据与边界核验）；review pass；release not_required
- **产物**：经批准的外部项目 artifact；.claude/workspace/dogfood/2026-07-12-n8-d21.md
- **最近更新**：2026-07-12

### N8.3.3 运行已有代码项目场景

- **任务 ID**：N8.3.3
- **状态**：done
- **描述**：在 Owner 指定的已有项目中处理一个低风险、范围有限的请求，验证项目 preset 与已有事实会改变实际判断。
- **验收标准**：D22 通过；先读取项目上下文；低风险请求没有被 Owner Gate 误拦；没有超出授权范围的修改。
- **验收命令**：D22 Ledger checklist、项目 git diff --check、相关项目测试或只读验证。
- **阻塞原因**：依赖 N8.3.1。
- **Gate 结果**：spec/task pass；decision confirmed；delivery preflight pass；transition pass；local pass（场景证据与边界核验）；review pass；release not_required
- **产物**：经批准的外部项目 artifact；.claude/workspace/dogfood/2026-07-12-n8-d22.md
- **最近更新**：2026-07-12

### N8.3.4 运行高风险门禁场景

- **任务 ID**：N8.3.4
- **状态**：done
- **描述**：在 Owner 指定的非生产范围验证高风险请求会创建 Decision Brief、未确认被拦截、确认后只放行安全验证。
- **验收标准**：D23 通过；漏问为 0；不执行真实迁移、权限、发布或不可逆动作。
- **验收命令**：decision validate、delivery preflight/transition --decision、D23 Ledger checklist。
- **阻塞原因**：依赖 N8.3.1。
- **Gate 结果**：spec/task pass；decision confirmed；delivery preflight pass；transition pass；local pass（场景证据与边界核验）；review pass；release not_required
- **产物**：经批准的外部 fixture/Brief；.claude/workspace/dogfood/2026-07-12-n8-d23.md
- **最近更新**：2026-07-12

### N8.3.5 汇总指标、审查与决策输入

- **任务 ID**：N8.3.5
- **状态**：done
- **描述**：汇总三场景的漏问、误打断、规则使用和追溯完整性，产出审查报告与 N8.4/N8.5 可使用的结论。
- **验收标准**：四项指标与每个原始证据可追溯；任何失败不被平均数掩盖；报告区分已观察行为和未验证边界。
- **验收命令**：planning validate、events validate、review-all --system N8。
- **阻塞原因**：依赖 N8.3.1-N8.3.4。
- **Gate 结果**：spec/task pass；decision confirmed；delivery preflight pass；transition pass；local pass（指标、summary、review 报告）；review pass；release not_required
- **产物**：.claude/workspace/dogfood/2026-07-12-n8-summary.md、.claude/workspace/reviews/2026-07-12-n8-real-project-dogfood.md
- **最近更新**：2026-07-12

## 建议顺序

N8.3.1 -> N8.3.2 / N8.3.3 / N8.3.4 -> N8.3.5

三个场景可在独立项目中执行，但必须共享同一 Ledger 字段和 Owner 授权边界。任何场景若发现门禁漏问、误拦或规则未生效，立即记录失败并暂停扩大验证。
