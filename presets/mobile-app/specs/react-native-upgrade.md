# React Native / Expo 升级参考

## 升级原则
- Expo 项目优先按 Expo SDK 版本升级。
- bare/prebuild 项目升级前先确认原生改动是否可重建。
- 升级跨度越大，越要分阶段：依赖检查、编译、运行、原生能力、发布构建。

## 流程
1. 记录当前 Expo SDK、React Native、React、Node、package manager、EAS CLI 版本。
2. 查目标 Expo SDK / React Native 的 breaking changes。
3. 运行官方升级命令或项目既有升级脚本。
4. 清理并重装依赖。
5. 修复 TypeScript、lint、测试。
6. 验证 iOS/Android simulator。
7. 验证 development build。
8. 跑 preview/production EAS build。

## 检查点
- `app.json` / `app.config.ts` 是否需要迁移字段。
- config plugins 是否兼容目标 SDK。
- Reanimated、Gesture Handler、Screens、Safe Area 等基础库版本是否匹配。
- Android target SDK、iOS deployment target 是否变化。
- Metro/Babel/TypeScript 配置是否需要更新。

## 回滚
- 升级应单独提交。
- 原生工程和 lockfile 变化必须可审查。
- 如果 development build 阶段失败，先回滚依赖版本，不继续堆补丁。
