# 任务列表

## 本次迭代

### T1: 定义 Project Preset 规格
- **描述**：写清楚项目画像、项目预设的产物结构、流程和边界。
- **验收标准**：
  - [x] `spec.md` 说明 `project-profile/` 与 `project-preset/`。
  - [x] 明确第一版不新增 CLI 子命令、不覆盖 `.claude/`。
  - [x] 写明新项目、已有项目、已有方案三种入口。
- **涉及文件**：
  - `spec.md`
- **状态**：已完成

### T2: 新增 `/project-preset` 工作流命令
- **描述**：在 Claude 命令源中新增项目级自生成 preset 工作流。
- **验收标准**：
  - [x] `.claude/commands/project-preset.md` 存在。
  - [x] 命令包含输入识别、代码扫描、画像生成、preset 生成、更新策略。
  - [x] 产物格式可直接指导 AI 创建 `project-profile/` 和 `project-preset/`。
- **涉及文件**：
  - `.claude/commands/project-preset.md`
- **状态**：已完成

### T3: 同步 Codex 入口与测试契约
- **描述**：让现有同步机制生成 `$team-command-project-preset`，并更新 smoke test。
- **验收标准**：
  - [x] `.agents/commands/project-preset.md` 同步生成。
  - [x] `.agents/skills/team-command-project-preset/SKILL.md` 同步生成。
  - [x] `COMMAND_SKILL_COUNT` 更新为 9。
  - [x] 命令数量断言更新为 9。
- **涉及文件**：
  - `create-claude-team/scripts/smoke-test.js`
  - `.agents/commands/project-preset.md`
  - `.agents/skills/team-command-project-preset/SKILL.md`
- **状态**：已完成

### T4: 更新用户文档
- **描述**：把“基础配置 → 项目画像 → 项目 preset → 开发”的新主线写入文档。
- **验收标准**：
  - [x] README 命令数量和工作流表包含 `/project-preset`。
  - [x] USAGE 包含命令说明和产物目录。
  - [x] BEST-PRACTICES 包含非预设技术栈路径。
  - [x] CHANGELOG 记录新增工作流。
- **涉及文件**：
  - `README.md`
  - `USAGE.md`
  - `BEST-PRACTICES.md`
  - `CHANGELOG.md`
- **状态**：已完成

### T5: 最终验证
- **描述**：运行校验和冒烟测试，确认同步与文档契约成立。
- **验收标准**：
  - [x] `node create-claude-team\cli.js init --preset web-fullstack --dry-run` 成功。
  - [x] `npm run validate` 通过。
  - [x] `npm test` 通过。
  - [x] `git diff` 只包含本功能相关改动。
- **状态**：已完成

### T6: 新增 base preset
- **描述**：提供不叠加任何技术栈的基础团队底座，用于非内置技术栈项目先安装再生成项目专属 preset。
- **验收标准**：
  - [x] `presets/base/PRESET.md` 存在，并说明无技术栈偏见定位。
  - [x] `presets/base/preset.json` 存在，`skillCount` 为 0。
  - [x] `presets/base/preset.mcp.json` 存在，不新增技术栈 MCP。
  - [x] CLI dry-run 能识别 `--preset base`。
  - [x] `npm run validate` 和 `npm test` 覆盖 base preset。
- **涉及文件**：
  - `presets/base/PRESET.md`
  - `presets/base/preset.json`
  - `presets/base/preset.mcp.json`
  - `README.md`
  - `USAGE.md`
  - `BEST-PRACTICES.md`
- **状态**：已完成

## 后续迭代

- [ ] 增加 `create-claude-team project-preset --check`，只校验 `project-preset/manifest.json` 与目录完整性。
- [ ] 让 `/dev` 明确在开工前读取 `project-preset/PRESET.md`。
- [ ] 让 `/standup` 根据 metrics/review 结果提出 project preset 更新建议。
- [ ] 为项目专属 skill 增加校验器，避免无效 `SKILL.md` 被长期保留。

## 风险

| 风险 | 影响 | 缓解方案 |
|------|------|----------|
| 生成内容太泛 | 项目 preset 变成另一份 README | 命令要求区分事实、规则、推断和未决问题 |
| 与技术栈 preset 冲突 | AI 后续开发不知道听谁的 | 明确 project preset 优先于通用 preset |
| 覆盖用户配置 | 用户升级底座时丢项目经验 | 第一版只写 `project-profile/` 和 `project-preset/` |
| 技能泛滥 | 每个项目生成过多低价值 skill | 只在有稳定重复流程时生成项目 skill |
