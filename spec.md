# Project Preset Workflow Spec

> 生命周期：reference。此文件记录早期 Project Preset 工作流设计；当前 N8 主线由根 `roadmap.md`、`.claude/workspace/planning/artifact-contract.md` 与对应 feature package 拥有。不得用本文定义当前模块状态。

## 目标

为 `create-claude-team` 增加项目级自适应预设工作流，并提供无技术栈偏见的 `base` preset。用户可以先安装基础团队配置，再通过和 Claude/Codex 讨论、扫描已有代码或导入已有方案，生成当前项目专属的 `project-profile/` 与 `project-preset/`。

## 需求摘要

你要做的是：新增 `/project-preset` 工作流入口，并同步为 Codex 的 `$team-command-project-preset` skill。它不写业务代码，而是把项目想法、技术栈、架构、测试、UI、发布约束沉淀成项目自己的 AI 开发约定。

验收标准是：`init --preset base --dry-run` 能正常预览；`init`/`update` 后 Claude 侧有 9 个命令，Codex 侧生成 `team-command-project-preset`；`/project-preset` 生成草稿后必须交由 `skill-curator` 执行 Project Preset Audit；文档能说明“base 底座 → 项目画像 → 项目 preset → 后续开发”的主线；`npm test` 与 `npm run validate` 通过。

技术约束是：不引入新的 CLI 子命令；不改现有 preset 叠加算法；不把项目专属内容写进会被 `update` 覆盖的 `.claude/` 源目录；第一版只定义生成工作流和产物契约。

## 用户故事

- 作为新项目开发者，我想先安装通用团队底座，再让 AI 根据我的项目想法生成项目专属规则，以便不同技术栈也能被正确支持。
- 作为已有项目维护者，我想让 AI 扫描代码结构、依赖、脚本和测试方式，反推出项目画像，以便后续开发不再套错通用 preset。
- 作为团队配置维护者，我想让项目级约定落在稳定目录中，以便 `create-claude-team update` 更新底座时不会覆盖项目经验。

## 范围

### 本次包含

- 新增 `presets/base/`，不叠加技术栈 rules/specs/skills。
- 新增 `/project-preset` 命令文档。
- 通过现有 Codex 同步机制自动生成 `$team-command-project-preset`。
- 定义 `project-profile/` 与 `project-preset/` 的目录结构、生成流程、更新策略和验收清单。
- 增强 `skill-curator`，让它审查 `project-preset/` 并维护 `curation.md`。
- 更新 smoke test 的命令数量和 Codex command skill 数量。
- 更新 README、USAGE、BEST-PRACTICES、CHANGELOG。

### 本次不包含

- 不新增 `create-claude-team project-preset` CLI 子命令。
- 不自动把 `project-preset/` 复制进 `.claude/` 或 `.agents/`。
- 不生成真实业务项目模板。
- 不实现交互式问卷 UI。
- 不承诺一次生成“永久完美”，而是定义可迭代更新的项目级 preset。
- 不把 `base` 设为默认 preset，避免破坏 `init` 既有 Web 默认行为。

## 产物结构

```text
project-profile/
├── product.md          # 产品定义、目标用户、范围边界
├── tech-stack.md       # 语言、框架、数据库、部署、脚本
├── architecture.md     # 模块边界、数据流、依赖方向
├── quality.md          # 测试、性能、安全、可观测性要求
├── ui-direction.md     # UI 风格、设计来源、可访问性要求（有 UI 时）
└── acceptance.md       # 项目级验收标准和发布门禁

project-preset/
├── PRESET.md           # 项目专属预设总览
├── manifest.json       # 名称、版本、来源、生成时间、更新策略
├── curation.md         # skill-curator 风格的分类、评分、拒绝项和风险审查
├── rules/
│   ├── project.md      # 必须遵守的项目硬规则
│   ├── tech-stack.md   # 栈相关约束
│   └── testing.md      # 项目测试规则
├── specs/
│   ├── architecture.md # 深入架构参考
│   └── domain.md       # 业务领域参考
└── skills/
    └── README.md       # 项目技能规划；仅在有稳定重复流程时再新增 SKILL.md
```

## 工作流

### 推荐入口

非内置技术栈或已有项目优先使用：

```bash
npx create-claude-team init --preset base
```

然后执行：

```text
/project-preset
```

`base` 只提供公共团队能力，项目真实技术栈由 `project-preset/` 承载。

### Phase 0: 输入来源识别

三种入口：

| 模式 | 触发 | 处理方式 |
|------|------|----------|
| 新项目讨论 | 用户描述想法 | 追问产品、技术、验收、UI、部署 |
| 已有项目扫描 | 仓库已有代码 | 读取依赖、脚本、目录、测试、配置、关键文档 |
| 已有方案导入 | 用户已有 spec/PRD/架构文档 | 提取约束并标注未决问题 |

### Phase 1: 项目画像

生成 `project-profile/`，先描述事实和用户确认过的决策，不把猜测写成规则。所有推断必须标为“推断”或放入未决问题。

### Phase 2: 项目预设草稿

从画像中提炼 `project-preset/`：

- `rules/` 只放硬约束，短而明确。
- `specs/` 放深入背景，供 AI 按需读取。
- `skills/` 只在项目有稳定重复流程时新增，例如“账单对账”“报告生成”“模型评估”。
- `manifest.json` 记录来源、版本和更新时间，便于后续迭代。

### Phase 3: skill-curator 审查

生成草稿后，使用 `skill-curator` 的 Project Preset Audit 审查：

- 事实和推断是否分清。
- rules/specs/skills 分类是否正确。
- rules 是否具体、短、可审查。
- 项目专属 skill 是否通过 Project Skill Adoption Score。
- 是否需要把候选项降级为 Future Candidate 或 Rejected Candidate。

审查结果写入 `project-preset/curation.md`。若审查结果是 `Revise`，先修订再交付；若是 `Blocked`，暂停等用户确认。

### Phase 4: 激活说明

第一版不自动覆盖 `.claude/` 或 `.agents/`。生成后输出下一步：

- 后续 `/dev`、`/check`、`/review-all` 必须优先读取 `project-preset/PRESET.md` 和 `project-preset/rules/`。
- 若项目需要更强约束，可以把 `project-preset/PRESET.md` 的摘要复制进项目根 `AGENTS.md` 的项目专属段落，但更新底座前要保留备份。
- 每次 `/standup` 或重大 review 后，可要求 AI 更新 `project-profile/` 与 `project-preset/`。

## 验收命令

```bash
node create-claude-team\cli.js init --preset base --dry-run
node create-claude-team\cli.js init --preset web-fullstack --dry-run
cd create-claude-team
npm run validate
npm test
```

## 决策记录

- ADR-001: 第一版做成工作流命令，而不是 CLI 子命令。
  - 背景：项目 preset 的质量依赖讨论、扫描和判断，纯 CLI 生成容易变成模板填空。
  - 决策：先新增 `/project-preset` 和 Codex skill，让 AI 按契约生成文件。
  - 后果：用户仍通过 Claude/Codex 执行生成，不增加安装器复杂度。

- ADR-002: 项目专属内容落在 `project-profile/` 与 `project-preset/`。
  - 背景：`.claude/`、`.agents/`、`.codex/` 会被 `update` 刷新。
  - 决策：项目经验放在稳定目录，避免被底座升级覆盖。
  - 后果：后续命令需要明确优先读取 project preset。

- ADR-003: 新增 `base` preset 但不改默认 preset。
  - 背景：`init` 长期表示 Web 默认入口，直接切换默认值会影响旧用户。
  - 决策：新增显式 `--preset base`，文档推荐非内置技术栈优先使用。
  - 后果：新用户需要多写一个参数来获得无技术栈底座，但兼容性更稳。

- ADR-004: `project-preset` 生成，`skill-curator` 审查。
  - 背景：项目 preset 很容易膨胀成一堆空泛 rules 和低价值 skills。
  - 决策：`/project-preset` 只负责生成草稿，`skill-curator` 负责 Project Preset Audit、Project Skill Adoption Score 和 `curation.md`。
  - 后果：职责边界更清楚，审查标准集中维护在一个 skill 中。
