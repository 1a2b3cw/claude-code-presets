---
name: team-command-project-preset
description: Execute the project-preset workflow from this AI development team preset. Use when the user writes /project-preset, asks for project-preset, or wants the corresponding team process in Codex.
---

# team-command-project-preset

This skill ports the Claude Code `/project-preset` command workflow to Codex.

In Codex, invoke this as `$team-command-project-preset`. Do not rely on `/project-preset` unless Codex itself defines that slash command with the same meaning.

# /project-preset - 生成项目专属预设

把一个项目从“安装了通用 AI 团队底座”推进到“拥有自己的项目画像和项目级 preset”。**只生成项目配置与约定，不写业务代码。**

适用场景：

- 新项目：用户只有想法，需要先把 Product Brief / PRD、技术栈、架构和验收标准沉淀下来。
- 已有项目：仓库里已经有代码，需要扫描后反推出真实技术栈、脚本、测试方式和模块边界。
- 已有方案：用户已有 PRD、spec、架构图或技术方案，需要转成 AI 后续开发能长期遵守的规则。

## 和现有 preset 的关系

| | 技术栈 preset | project preset |
|---|---|---|
| **来源** | `presets/<name>/`，随工具发布 | 当前项目讨论、代码扫描和用户确认 |
| **粒度** | 通用技术栈 | 具体项目 |
| **更新方式** | `create-claude-team update` | `/project-preset` 按需迭代 |
| **优先级** | 默认规则 | 项目规则优先 |
| **写入位置** | `.claude/`、`.agents/` | `project-profile/`、`project-preset/` |

> 原则：基础配置提供团队操作系统，技术栈 preset 提供默认知识，project preset 记录“这个项目真正怎么做”。

## 和 skill-curator 的关系

`/project-preset` 是生成器，负责产出项目画像和项目 preset 草稿。

`skill-curator` 是审查器，负责审查草稿是否值得保留、是否该拆成 rules、specs、skills，项目专属 skill 是否达标。

因此本命令只保留生成流程和交付契约；具体分类、准入评分和审查标准以 `skill-curator` 为准。生成 `project-preset/` 后，必须使用 `skill-curator` 做一次 Project Preset Audit，并把审查结果写入 `project-preset/curation.md`。

## 流程

### Phase 0: 识别输入来源

先判断用户属于哪种入口，不要一上来套模板。

| 模式 | 判断依据 | 动作 |
|------|----------|------|
| 新项目讨论 | 代码很少或用户描述产品想法 | 追问产品、技术、验收、UI、部署 |
| 已有项目扫描 | 仓库有源码、依赖、脚本、测试 | 读取 README、package/pyproject/go.mod 等依赖文件、目录结构、测试脚本、CI 配置 |
| 已有方案导入 | 用户给了 spec/PRD/架构文档 | 提取已确认约束，列出未决问题 |

无论哪种入口，都必须先形成或读取 Product Brief：

- 优先读取 `product-brief.md`
- 如果存在，也读取 `product-model.md`，但只把已确认的用户结果、能力、旅程和边界写入项目画像；不复制 roadmap 状态或 tasks。
- 其次读取 `prd.md`
- `project-profile/product.md` 只作为补充来源：已确认事实和决策可补充 Product Brief，推断和未决问题必须保留原标签
- 新项目没有上述文件时，在生成 `project-profile/` 前先创建并由 Owner 确认 `product-brief.md`
- 已有项目若只有 README/代码事实，则写入 `project-profile/product.md` 的“事实 / 推断 / 未决问题”区；不得把未确认推断升级为 Product Brief 或 preset 规则

如果信息不足，只问最多 5 个高价值问题：

1. **项目解决什么问题，给谁用？**
2. **当前或期望技术栈是什么？**
3. **核心业务流程是什么？**
4. **质量门槛是什么？**（测试、性能、安全、发布）
5. **有 UI 时，设计方向或参考是什么？**

### Phase 1: 扫描与归纳

已有项目必须先扫描事实，再写结论。优先读取：

- 项目文档：`README*`、`docs/`、`spec.md`、`roadmap.md`
- 依赖与脚本：`package.json`、`pyproject.toml`、`requirements.txt`、`go.mod`、`Cargo.toml`、`pom.xml`、`build.gradle`
- 工程配置：`Dockerfile`、`docker-compose*`、`.github/workflows/`、`turbo.json`、`vite.config.*`
- 代码结构：入口文件、`src/`、`app/`、`server/`、`features/`、测试目录
- UI 方向：`preview/`、设计稿说明、现有组件库和样式系统

归纳时分清：

- **事实**：代码或用户明确说过的内容
- **决策**：用户确认采用的做法
- **推断**：从代码结构推出来但还没确认的内容
- **未决**：必须后续确认的问题

### Artifact Stewardship 检查

扫描项目文档时，Delivery Steward 必须同步判断文档生命周期和清理建议，但不要在本命令中实际删除旧文档。

文档状态只能使用：`active` / `reference` / `draft` / `superseded` / `archived` / `delete-candidate`。

如果发现旧 PRD、旧 roadmap、重复 project-profile、过期 preset 草稿或混用 `.claude/workspace/` 与 `workspace/`，必须在 `project-preset/curation.md` 或 `.claude/workspace/cleanup/YYYY-MM-DD-artifact-cleanup.md` 中记录 Artifact Cleanup 建议。

高影响删除、source-of-truth 删除或可能丢失决策的删除，必须走 Owner Decision Brief；未确认前只建议合并或归档。

### Phase 2: 生成 project-profile/

创建或更新：

```text
project-profile/
├── product.md
├── tech-stack.md
├── architecture.md
├── quality.md
├── ui-direction.md
└── acceptance.md
```

#### `product.md`

必须和 `product-brief.md` / `prd.md` 对齐，包含：

- 一句话产品定义
- 目标用户
- 核心价值
- 本期范围
- 明确不做
- 验收标准
- 核心用户流程
- 未决问题

同时必须分区记录：**事实**（代码或 Owner 明示）、**已确认决策**、**推断**、**未决问题**。只有事实和已确认决策可以进入 `product-brief.md`；推断和未决问题只能保留在 profile，等待 Owner 确认。

#### Product Brief 契约

`product-brief.md` 或 `prd.md` 至少提供这些字段：

- **目标用户**
- **核心价值**
- **本期范围**
- **明确不做**
- **验收标准**

`project-profile/product.md` 可以补充更详细的事实、推断和决策，但不得把未确认推断写成确定规则。后续 `/plan` 应能从这些字段生成 `roadmap.md`。

#### `tech-stack.md`

包含：

- 语言、框架、运行时
- 数据库、缓存、队列、外部服务
- 包管理器和常用命令
- 测试、lint、类型检查、构建命令
- 部署目标
- 禁止或避免使用的技术

#### `architecture.md`

包含：

- 模块边界
- 依赖方向
- 数据流
- 关键接口
- 风险和扩展点

#### `quality.md`

包含：

- 单元/集成/E2E 测试策略
- 性能阈值
- 安全要求
- 可观测性要求
- 发布前检查

#### `ui-direction.md`

仅有 UI 时生成；没有 UI 时写明“无 UI”。包含：

- 目标用户和使用场景
- 视觉风格
- 色彩、字体、密度、组件偏好
- 设计权威来源：`preview/`、Figma、截图或用户描述
- 无障碍要求

#### `acceptance.md`

包含：

- 项目级 Definition of Done
- MVP 完成标准
- 发布门禁
- 回滚或恢复要求

### Phase 3: 生成 project-preset/

从 profile 中提炼 AI 后续必须遵守的项目级 preset。`project-preset/rules/` 是唯一可移植的规则目录；不得在 `project-preset/` 内创建 `.agents/` 或 `.claude/` 子目录：

```text
project-preset/
├── PRESET.md
├── manifest.json
├── curation.md
├── rules/
│   ├── project.md
│   ├── tech-stack.md
│   └── testing.md
├── specs/
│   ├── architecture.md
│   └── domain.md
└── skills/
    └── README.md
```

#### `PRESET.md`

作为入口，必须包含：

- 项目一句话定义
- 当前技术栈
- AI 后续开发的优先读取顺序
- 关键规则索引
- 未决问题

#### `manifest.json`

格式：

```json
{
  "name": "project-preset",
  "version": "0.1.0",
  "source": "generated-from-discussion-and-repo-scan",
  "generatedAt": "YYYY-MM-DD",
  "updatedAt": "YYYY-MM-DD",
  "priority": "project-over-technical-preset",
  "profileDir": "project-profile",
  "curation": "curation.md",
  "rules": ["project.md", "tech-stack.md", "testing.md"],
  "specs": ["architecture.md", "domain.md"]
}
```

#### `project-preset/rules/project.md`

只写已确认的项目差异和硬规则，不复制通用团队规则或技术栈 preset，例如：

- 后续开发必须先读 `project-preset/PRESET.md`
- 业务逻辑放在哪一层
- 禁止改动哪些边界
- 错误处理、日志、配置、密钥规则

#### `project-preset/rules/tech-stack.md`

只写技术栈硬约束，例如：

- 使用哪些框架/库
- 不使用哪些替代方案
- 依赖新增原则
- 文件组织和命名约定

#### `project-preset/rules/testing.md`

只写项目测试硬约束，例如：

- 什么代码必须有测试
- 测试放在哪里
- 必跑命令
- Mock 边界

#### `project-preset/specs/architecture.md`

放详细架构说明、模块图、数据流和关键设计理由。

#### `project-preset/specs/domain.md`

放业务概念、术语表、状态机、核心流程和边界条件。

#### `skills/README.md`

第一版默认只写 README，说明是否需要项目专属 skill。只有 `skill-curator` 审查认为候选项通过 Project Skill Adoption Score 时，才创建真正的 `skills/<name>/SKILL.md`。

未通过的候选项保留在 `skills/README.md` 的 Future Candidates 或 `project-preset/curation.md` 的 Rejected Candidates，不要硬生成低价值 skill。

#### `curation.md`

由 `skill-curator` 生成或修订，记录 Project Preset Audit 结果，必须包含：

- 审查结论：通过 / 需修订 / 暂停等待用户确认
- rules、specs、skills 分类问题
- 项目专属 skill 候选评分
- 被拒绝或降级的候选项
- 与代码事实或通用 preset 的冲突
- 必须向用户确认的高风险问题
- Artifact Cleanup 建议：哪些旧文档应保持 active/reference，哪些应标为 superseded/archived/delete-candidate

### Phase 4: 使用 skill-curator 审查

生成草稿后，必须使用 `skill-curator` 执行 Project Preset Audit：

1. 把 `project-profile/` 和 `project-preset/` 当作被审查对象。
2. 按 `skill-curator` 的 Project Preset Audit 检查 rules、specs、skills、commands、hooks 分类。
3. 对项目专属 skill 候选执行 Project Skill Adoption Score。
4. 根据审查结果修订草稿。
5. 将最终审查结果写入 `project-preset/curation.md`。

如果 `skill-curator` 判定“需修订”，必须先修订再交付；如果判定“暂停等待用户确认”，不要继续生成硬规则。

### Phase 5: 校验与交付

生成后检查：

- [ ] `project-profile/` 文件齐全
- [ ] `project-preset/PRESET.md` 存在
- [ ] `project-preset/manifest.json` 是合法 JSON
- [ ] `project-preset/curation.md` 存在并记录 skill-curator 审查结论
- [ ] `project-preset/rules/` 都是短硬规则，不是长篇教程
- [ ] 没有 `project-preset/.agents/` 或 `project-preset/.claude/` 重复目录
- [ ] `project-preset/specs/` 承载深入说明
- [ ] 任何 `skills/<name>/SKILL.md` 都通过 skill-curator 审查
- [ ] 推断和未决问题没有被写成确定规则
- [ ] 没有写入真实密钥、token 或个人隐私
- [ ] 没有覆盖 `.claude/`、`.agents/`、`.codex/`

输出摘要：

```markdown
项目 preset 已生成：
- 项目画像：project-profile/
- 项目预设：project-preset/
- Curator 审查：project-preset/curation.md
- 后续开发优先读取：project-preset/PRESET.md
- 未决问题：N 个
- 建议下一步：用 /plan 输出 roadmap，或用 /dev 开始模块 1
```

## 后续开发如何使用

后续执行 `/plan`、`/dev`、`/check`、`/review-all` 时，AI 必须：

1. 先读 `project-preset/PRESET.md`
2. 再按需读 `project-preset/rules/`
3. 技术细节不够时读 `project-preset/specs/`
4. 最后才回退到通用技术栈 preset 和公共 rules

## 更新策略

以下情况应更新 project preset：

- 技术栈改变
- 架构边界改变
- 测试策略改变
- UI 方向改变
- review 多次发现同类问题
- `/standup` 发现质量瓶颈

更新时只改相关文件，并在 `manifest.json.updatedAt` 更新日期。

## 边界

- 不把项目专属内容直接写进会被 `update` 覆盖的 `.claude/`、`.agents/`、`.codex/`
- 不生成业务代码
- 不为每个小流程都创建 skill
- 不把猜测写成规则
- 不把技术栈 preset 当作项目事实；项目事实以代码扫描和用户确认为准
