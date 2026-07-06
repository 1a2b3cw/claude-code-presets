# 任务列表

## 本次迭代

### T1: 新增 mobile-app preset 骨架
- **描述**：创建 `presets/mobile-app/`，定义 preset 元信息、MCP 合并文件和目录结构。
- **验收标准**：
  - [x] `presets/mobile-app/PRESET.md` 存在，并说明 Expo + React Native + TypeScript 定位。
  - [x] `presets/mobile-app/preset.mcp.json` 存在，沿用通用 MCP 配置。
  - [x] `rules/`、`specs/`、`skills/` 目录结构完整。
- **涉及文件**：
  - `presets/mobile-app/PRESET.md`（新建）
  - `presets/mobile-app/preset.mcp.json`（新建）
- **测试要求**：后续由 T5 smoke test 覆盖。
- **预估**：1h
- **依赖**：无
- **状态**：已完成

### T2: 编写移动端 rules
- **描述**：补齐 Builder/Reviewer 始终要遵守的移动端规则，覆盖 React Native、Expo、UI、测试和发布。
- **验收标准**：
  - [x] `react-native.md` 覆盖组件结构、平台差异、性能和列表。
  - [x] `expo.md` 覆盖 Expo Router、config plugin、prebuild 边界。
  - [x] `mobile-ui.md` 覆盖安全区、触控尺寸、键盘避让、暗色模式和可访问性。
  - [x] `mobile-testing.md` 覆盖单测、组件测试、Maestro E2E。
  - [x] `app-release.md` 覆盖 EAS、版本号、权限、隐私和商店发布门禁。
- **涉及文件**：
  - `presets/mobile-app/rules/react-native.md`（新建）
  - `presets/mobile-app/rules/expo.md`（新建）
  - `presets/mobile-app/rules/mobile-ui.md`（新建）
  - `presets/mobile-app/rules/mobile-testing.md`（新建）
  - `presets/mobile-app/rules/app-release.md`（新建）
- **测试要求**：smoke test 断言 mobile rules 被复制。
- **预估**：2h
- **依赖**：T1
- **状态**：已完成

### T3: 编写移动端 specs
- **描述**：提供深入技术参考，供 AI 在需要时读取，避免 rules 过长。
- **验收标准**：
  - [x] React Native spec 覆盖性能、平台差异、原生能力边界。
  - [x] Expo spec 覆盖项目结构、配置、EAS 和 prebuild。
  - [x] Navigation spec 覆盖 Expo Router、deep link、认证流。
  - [x] State management spec 覆盖 TanStack Query、Zustand、本地持久化。
  - [x] App Store release spec 覆盖 iOS/Android 发布清单。
- **涉及文件**：
  - `presets/mobile-app/specs/react-native.md`（新建）
  - `presets/mobile-app/specs/expo.md`（新建）
  - `presets/mobile-app/specs/navigation.md`（新建）
  - `presets/mobile-app/specs/state-management.md`（新建）
  - `presets/mobile-app/specs/app-store-release.md`（新建）
- **测试要求**：smoke test 断言 specs 非空。
- **预估**：2h
- **依赖**：T1
- **状态**：已完成

### T4: 编写移动端 skills
- **描述**：新增 Codex/Claude 可调用的移动端专项技能，覆盖 UI、导航、原生能力、离线、测试和发布。
- **验收标准**：
  - [x] 6 个 skill 均包含有效 `SKILL.md` frontmatter。
  - [x] skill 内容指向对应 rules/specs，不重复塞入过长技术细节。
  - [x] Codex 同步后 `.agents/skills/` 包含这些 skill。
- **涉及文件**：
  - `presets/mobile-app/skills/mobile-ui/SKILL.md`（新建）
  - `presets/mobile-app/skills/app-navigation/SKILL.md`（新建）
  - `presets/mobile-app/skills/native-capabilities/SKILL.md`（新建）
  - `presets/mobile-app/skills/offline-first/SKILL.md`（新建）
  - `presets/mobile-app/skills/app-testing/SKILL.md`（新建）
  - `presets/mobile-app/skills/app-release/SKILL.md`（新建）
- **测试要求**：smoke test 断言 skill 数量和 Codex 同步数量正确。
- **预估**：2h
- **依赖**：T1
- **状态**：已完成

### T5: 接入 CLI 与 smoke test
- **描述**：让 `mobile-app` 成为合法 preset，并让测试覆盖 init/update/Codex 同步。
- **验收标准**：
  - [x] `PRESETS` 包含 `mobile-app`。
  - [x] CLI help 展示 mobile preset 用法。
  - [x] `init` 完成提示包含 Expo/EAS/Codex 下一步。
  - [x] smoke test 新增 mobile preset 场景并通过。
- **涉及文件**：
  - `create-claude-team/cli.js`（修改）
  - `create-claude-team/lib/init.js`（修改）
  - `create-claude-team/scripts/smoke-test.js`（修改）
- **测试要求**：
  - `node create-claude-team\cli.js init --preset mobile-app --dry-run`
  - `cd create-claude-team && npm test`
- **预估**：1.5h
- **依赖**：T2、T3、T4
- **状态**：已完成

### T6: 更新用户文档
- **描述**：把 mobile preset 的定位、命令、推荐技术栈和 Codex 使用方式写入项目文档。
- **验收标准**：
  - [x] README 包含 mobile preset 总览和快速开始。
  - [x] USAGE 包含 `--preset mobile-app` 用法。
  - [x] BEST-PRACTICES 补充移动端开发建议。
  - [x] CHANGELOG 记录新增 preset。
- **涉及文件**：
  - `README.md`（修改）
  - `USAGE.md`（修改）
  - `BEST-PRACTICES.md`（修改）
  - `CHANGELOG.md`（修改）
- **测试要求**：文档链接和命令示例与 CLI 一致。
- **预估**：1.5h
- **依赖**：T5
- **状态**：已完成

### T7: 最终验证与快检
- **描述**：执行团队快检和集成验收，确认没有破坏现有 preset。
- **验收标准**：
  - [x] dry-run 成功展示 mobile preset。
  - [x] `npm test` 全部通过。
  - [x] git diff 只包含本功能相关文件。
  - [x] `tasks.md` 状态更新为完成或记录剩余问题。
- **涉及文件**：
  - `tasks.md`（修改）
- **测试要求**：
  - `node create-claude-team\cli.js init --preset mobile-app --dry-run`
  - `npm test`
- **预估**：1h
- **依赖**：T6
- **状态**：已完成

## 后续迭代
- [ ] 支持 `mobile-app` 的项目模板脚手架建议，而不直接生成业务代码。
- [ ] 增加 Flutter preset。
- [ ] 增加 bare React Native 原生模块专项规则。
- [ ] `$team-command-ship` 针对 mobile preset 做更细的商店发布门禁。

## 风险
| 风险 | 影响 | 缓解方案 |
|------|------|----------|
| Expo 与 bare React Native 边界写乱 | AI 实现时可能给出不稳定建议 | 第一版明确 Expo 优先，bare 只作为 escape hatch |
| mobile UI 规则与 web design 规则冲突 | UI 输出可能不符合移动端惯例 | `mobile-ui.md` 明确移动端规则优先级 |
| smoke test 数量断言变动 | 测试容易因 skill 数量变化失败 | 在 mobile 场景独立声明 `presetSkillCount` |
| 文档命令与 CLI help 不一致 | 用户按文档运行失败 | T6 后执行 dry-run 验证示例 |
| rules/specs 内容过长重复 | 后续维护成本上升 | rules 写硬约束，specs 写深入参考，skills 只写触发和流程 |
