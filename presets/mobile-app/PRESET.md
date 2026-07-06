# Preset: mobile-app

> React Native + Expo + TypeScript 移动 App 开发

## 适用场景

- **跨平台 App**：iOS 与 Android 共用一套 React Native 代码。
- **Expo App**：优先使用 Expo SDK、Expo Router、EAS Build/EAS Submit。
- **移动端产品原型**：快速做可安装、可真机验证的 App。
- **移动端 AI 应用**：把 AI 聊天、拍照识别、语音、知识库等能力包装成 App。

## 技术栈

### 核心
- **语言**：TypeScript
- **框架**：React Native + Expo
- **路由**：Expo Router
- **状态管理**：Zustand（客户端状态）+ TanStack Query（服务端状态）
- **表单**：React Hook Form + Zod
- **本地存储**：SecureStore / AsyncStorage / SQLite
- **网络**：fetch / ky / axios，按项目既有栈选择

### UI 与交互
- **布局**：React Native StyleSheet / NativeWind，按项目既有栈选择
- **安全区**：react-native-safe-area-context
- **手势**：react-native-gesture-handler
- **动画**：react-native-reanimated，只有交互确实需要时使用
- **列表**：FlatList / SectionList，长列表优先 FlashList

### 测试与发布
- **单元测试**：Jest / Vitest，跟随项目已有工具
- **组件测试**：React Native Testing Library
- **E2E**：Maestro（默认推荐）/ Detox（需要更强原生控制时）
- **构建发布**：EAS Build / EAS Submit

## 文件组织

```text
app/
├── _layout.tsx
├── index.tsx
├── (auth)/
├── (tabs)/
└── modal.tsx
src/
├── features/
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── stores/
│       └── types.ts
├── shared/
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── storage/
│   └── utils/
└── test/
```

## 规则文件

- `rules/react-native.md` - React Native 组件、性能、平台差异
- `rules/expo.md` - Expo Router、配置、prebuild 边界
- `rules/mobile-ui.md` - 移动端 UI、安全区、触控、无障碍
- `rules/mobile-testing.md` - 单测、组件测试、E2E
- `rules/app-release.md` - EAS、版本、权限、商店发布

## 包含的 Skills

- `mobile-ui` - 移动端界面实现和设计自检
- `app-navigation` - Expo Router、认证流、deep link
- `native-capabilities` - 相机、位置、通知、文件、权限
- `offline-first` - 本地缓存、同步、弱网体验
- `app-testing` - React Native 测试与 E2E
- `app-release` - EAS 构建、提交与发布门禁

## Specs

- `react-native.md` - React Native 详细参考
- `expo.md` - Expo 详细参考
- `navigation.md` - 路由、认证流、deep link
- `state-management.md` - Zustand、TanStack Query、本地存储
- `app-store-release.md` - iOS/Android 发布检查

## MCP 服务器

第一版不新增移动端专用 MCP。沿用底座：

- **github**：管理仓库、PR、Issue
- **playwright**：Web/E2E 辅助验证，移动端真机/模拟器验证仍以项目脚本为准
- **context7**：查询 Expo、React Native、EAS、测试库的最新文档
