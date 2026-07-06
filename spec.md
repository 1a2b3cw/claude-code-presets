# Mobile App Preset Spec

## 目标
为 `create-claude-team` 增加 `mobile-app` preset，让用户可以初始化一套面向 React Native + Expo + TypeScript 的 Claude Code 与 Codex 团队配置。

## 需求摘要
你要做的是：在现有生成器中新增移动 App 开发预设，默认支持 Expo 优先的 React Native 应用开发。

验收标准是：`init --preset mobile-app --dry-run` 能正常预览，`npm test` 覆盖并通过 mobile preset 场景，生成的 Claude/Codex 入口包含移动端 rules、skills、specs。

技术约束是：不重构生成器核心同步架构；沿用现有 `presets/<name>/rules|specs|skills` 叠加机制；第一版只覆盖 Expo + React Native + TypeScript，不扩展 Flutter 或 bare-native 专项。

## 用户故事
- 作为使用 Codex 的开发者，我想通过 `--preset mobile-app` 初始化团队配置，以便直接开发移动 App。
- 作为 React Native/Expo 项目开发者，我想让 AI 遵守移动端 UI、性能、权限和发布规则，以便减少平台差异和发布风险。
- 作为 preset 维护者，我想让 smoke test 覆盖 mobile preset，以便后续更新不会破坏 Codex 同步。

## 范围

### 本次包含
- 新增 `presets/mobile-app/`。
- 新增移动端 rules、specs、skills。
- CLI 支持 `mobile-app` preset。
- `init` 完成提示增加移动端下一步。
- smoke test 增加 mobile preset 场景。
- README/USAGE/BEST-PRACTICES/CHANGELOG 更新。

### 本次不包含
- 不生成真实 React Native 项目模板。
- 不新增 Flutter preset。
- 不支持 Swift/Kotlin 原生模块专项规范。
- 不改 Codex 同步核心逻辑。
- 不接入新的移动端专用 MCP 服务。

## 技术方案

### Preset 结构
```text
presets/mobile-app/
├── PRESET.md
├── preset.mcp.json
├── rules/
│   ├── react-native.md
│   ├── expo.md
│   ├── mobile-ui.md
│   ├── mobile-testing.md
│   └── app-release.md
├── specs/
│   ├── react-native.md
│   ├── expo.md
│   ├── navigation.md
│   ├── state-management.md
│   └── app-store-release.md
└── skills/
    ├── mobile-ui/
    ├── app-navigation/
    ├── native-capabilities/
    ├── offline-first/
    ├── app-testing/
    └── app-release/
```

### 默认技术栈
| 层面 | 默认选择 | 理由 |
|------|----------|------|
| App 框架 | Expo + React Native | 开发反馈快，原生工程复杂度低 |
| 语言 | TypeScript | 与现有 Web preset 心智一致，便于类型约束 |
| 路由 | Expo Router | Expo 生态默认路径，文件路由清晰 |
| 数据请求 | TanStack Query | 缓存、重试、失效管理成熟 |
| 本地状态 | Zustand | API 简洁，移动端小中型应用足够 |
| 表单校验 | React Hook Form + Zod | 性能好，类型与校验一致 |
| 本地存储 | SecureStore / AsyncStorage / SQLite | 按敏感度和数据结构选择 |
| E2E | Maestro | 第一版轻量、跨平台、配置成本低 |
| 发布 | EAS Build / EAS Submit | Expo 官方发布链路 |

## 核心功能

### 功能 1: CLI 识别 mobile-app preset
**描述**：`create-claude-team init --preset mobile-app` 合法，并在 help 中展示。

**输入**：
```bash
node create-claude-team/cli.js init --preset mobile-app --dry-run
```

**输出**：
- preset 校验通过。
- dry-run 展示 mobile preset 文件叠加。
- Codex 入口 dry-run 正常展示。

### 功能 2: 生成移动端团队规则
**描述**：安装 mobile preset 后，`.claude/rules/` 和 `.agents/rules/` 包含移动端规则。

**规则重点**：
- React Native 平台差异。
- Expo/prebuild 边界。
- 移动端安全区、触控目标、键盘避让、深色模式。
- 列表性能和图片性能。
- 权限申请、隐私、发布检查。

### 功能 3: 生成移动端 skills
**描述**：安装 mobile preset 后，Claude 与 Codex 可读取移动端专用 skills。

**Skills**：
- `mobile-ui`
- `app-navigation`
- `native-capabilities`
- `offline-first`
- `app-testing`
- `app-release`

### 功能 4: 生成移动端 specs
**描述**：安装 mobile preset 后，`.claude/specs/` 和 `.agents/specs/` 提供深入参考。

**Specs**：
- `react-native.md`
- `expo.md`
- `navigation.md`
- `state-management.md`
- `app-store-release.md`

### 功能 5: 测试覆盖
**描述**：smoke test 增加 mobile preset，守护 init/update/Codex 同步契约。

## 边界条件
- `--preset mobile-app --lang typescript`：当前 mobile preset 不使用 `lang/` 变体，CLI 不应因此失败，但文档不推荐传 `--lang`。
- update 场景：已有 `.claude/.preset` 为 `mobile-app` 时，`update` 应保留公共 skills/rules，并叠加 mobile preset。
- Codex 同步：mobile skills 应生成到 `.agents/skills/`，并与 `team-command-*` skills 共存。
- MCP 配置：第一版使用通用 GitHub/Playwright/Context7，不新增移动专用依赖。

## 非功能需求
| 维度 | 指标 | 阈值 |
|------|------|------|
| 可维护性 | 不修改核心复制/同步算法 | 只登记 preset 并添加内容 |
| 测试 | smoke test 覆盖 mobile preset | `npm test` 通过 |
| 文档 | README/USAGE/CHANGELOG 更新 | 用户能找到 mobile 用法 |
| 安全 | 不引入密钥或硬编码 token | 依赖现有 hooks 检查 |

## 设计方向
- 风格：移动端默认白底简约、内容优先、遵守平台惯例。
- 色调：不绑定品牌色，强调可访问性、明暗模式和系统语义色。
- 目标用户：使用 Codex/Claude Code 搭建 React Native 或 Expo App 的独立开发者、小团队和 AI 应用开发者。
- UI 规则重点：安全区、触控尺寸、键盘避让、列表性能、平台差异和真实设备验证。

## 验收命令
```bash
node create-claude-team\cli.js init --preset mobile-app --dry-run
cd create-claude-team
npm test
```

## 决策记录
- ADR-001: 第一版选择 Expo 优先，而不是 bare React Native。
  - 背景：AI 辅助开发需要稳定、快速的反馈链路。
  - 决策：mobile preset 默认 Expo + TypeScript。
  - 后果：原生工程复杂能力先作为 escape hatch，不在第一版展开。

- ADR-002: 第一版不新增 `lang/` 变体。
  - 背景：React Native 主路径就是 TypeScript，语言变体收益低。
  - 决策：将 TypeScript 作为 preset 默认规则写入。
  - 后果：CLI 的 `--lang` 保持现状，不为 mobile 新增语言选项。
