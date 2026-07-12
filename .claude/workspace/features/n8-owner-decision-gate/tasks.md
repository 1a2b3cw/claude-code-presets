# N8.2 Owner Decision Gate Tasks

> 状态：done
> Task Set：N8.2-TASKS-001
> Spec：`spec.md`
> Roadmap Module：N8
> 执行包：`.claude/workspace/features/n8-owner-decision-gate/`
> 更新于：2026-07-12

## Spec/Task Quality Gate

- 当前结果：pass。
- 本轮范围：Owner Decision Contract、只读 CLI、delivery 开工门禁、Claude/Codex 入口契约与行为回归测试。
- 不做：权限控制、真实部署/发布、自动确认 Owner、外部身份签名、全部技术细节的人工审批、N8.3 dogfood。
- Builder 状态：N8.2.1-N8.2.4 已完成；本地门禁、tarball 验证和跨文件审查通过。

### N8.2.1 升级三级任务编号并定义 Owner Decision Contract

- **任务 ID**：N8.2.1
- **状态**：done
- **描述**：升级规划解析器以支持 `N8.2.1` 三级任务编号；新增决策 Brief 的字段、状态机、类型、目录边界和“AI 不能自称 Owner confirmed”的行为规则；复用既有决策文件，不创建第二份产品/任务状态。
- **验收标准**：Owner 能从一张 Brief 看懂要决定什么、推荐什么、拒绝/过期后为何不能开工；不含秘密，且可由固定输入校验。
- **验收命令**：`node create-claude-team/cli.js planning validate`、`npm test`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/planning/owner-decision-contract.md`、`create-claude-team/lib/owner-decision.js`、smoke fixtures
- **最近更新**：2026-07-12

### N8.2.2 实现 decision validate 与 delivery 开工门禁

- **任务 ID**：N8.2.2
- **状态**：done
- **描述**：增加 `decision validate`，扩展 `delivery preflight/transition` 的 `--decision` 检查；仅在 Spec 标记 yes 时强制已确认、模块/类型匹配的 Brief。
- **验收标准**：D16-D19 通过：未确认、过期、错模块或错类型均不能开始；已确认可放行；低风险 no 不受影响。
- **验收命令**：`npm test`、`node create-claude-team/cli.js delivery preflight N8 --task N8.2.2 --decision <brief>`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`create-claude-team/lib/owner-decision.js`、`create-claude-team/lib/delivery-control.js`、`create-claude-team/cli.js`、`create-claude-team/scripts/smoke-test.js`
- **最近更新**：2026-07-12

### N8.2.3 统一 Claude/Codex 与角色行为契约

- **任务 ID**：N8.2.3
- **状态**：done
- **描述**：让 plan/dev/ship、Product Lead、Architect-Planner、Builder、DevOps 与生成后的 Codex skills 使用同一个 Brief 状态和权限边界。
- **验收标准**：D20 通过；所有入口明确只有 Owner 明确回复后才能记录 confirmed，完全访问权限不能绕过 gate。
- **验收命令**：`node create-claude-team/cli.js update`、`npm test`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/commands/`、`.claude/agents/`、`.agents/commands/`、`.agents/skills/`、`.codex/agents/`
- **最近更新**：2026-07-12

### N8.2.4 行为回归、打包验证与审查证据

- **任务 ID**：N8.2.4
- **状态**：done
- **描述**：验证 CLI、迁移、Claude/Codex 同步和 tarball 场景，并记录能力边界：该 gate 阻止缺失确认，但人类确认来源需在 N8.3 真实交互中验证。
- **验收标准**：D16-D20 与所有本地门禁通过；报告明确未把静态 Markdown 校验误称为身份认证或真实 dogfood。
- **验收命令**：`npm run gate`、`npm run test:tarball`、`node create-claude-team/cli.js planning validate`、`node create-claude-team/cli.js events validate`、`/review-all --system N8`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/reviews/2026-07-12-n8-owner-decision-gate.md`、`.claude/workspace/events.jsonl`
- **最近更新**：2026-07-12

## 建议顺序

```text
N8.2.1 -> N8.2.2 -> N8.2.3 -> N8.2.4
```

N8.2.1 只定义事实与校验边界并完成编号升级；N8.2.2 只在已有 delivery preflight 中复用该结果；N8.2.3 不能自行解释一套不同的确认规则；N8.2.4 验证行为但不把本仓库验证伪装成真实项目 dogfood。
