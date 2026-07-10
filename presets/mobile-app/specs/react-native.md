# React Native 详细参考

## 架构分层

```text
app/                 # Expo Router 页面和布局
src/features/        # 业务功能模块
src/shared/          # 跨功能复用组件、hooks、工具
src/shared/storage/  # SecureStore/AsyncStorage/SQLite 封装
src/shared/api/      # API client、query keys、错误转换
```

页面只负责路由参数、屏幕布局和调用 feature 组件。业务逻辑放进 feature hooks/services，避免 `_layout.tsx` 和 screen 文件膨胀。

## 组件模式
- Screen 组件：接收路由参数，组合 feature 组件。
- Feature 组件：承载业务交互。
- Shared 组件：不依赖业务领域。
- Service：封装网络、存储、权限、原生模块调用。

## 列表性能
- 少量静态内容可用 `ScrollView`。
- 动态列表使用 `FlatList` 或 `SectionList`。
- 大列表、复杂 item 或聊天流优先 `FlashList`。
- 保持 `keyExtractor` 稳定。
- 不在 item render 中做格式化大计算。

## 图片和媒体
- 图片必须有稳定尺寸、占位或骨架。
- 上传前按需求压缩，避免直接传原图。
- 列表中的图片使用缩略图。
- 相机、相册、麦克风都要先处理权限拒绝。

## 平台差异
| 场景 | 处理 |
|------|------|
| 返回行为 | Android 硬件返回键需要验证 |
| 键盘 | iOS/Android 键盘避让策略不同 |
| 权限 | 权限文案、拒绝后设置入口不同 |
| 字体 | 系统字体渲染和缩放不同 |
| 状态栏 | 每个屏幕确认明暗背景和图标颜色 |

## 常见反模式
- 把所有业务状态放进全局 store。
- 使用 `ScrollView` 渲染无限列表。
- 在组件里直接拼接 API URL 和处理 token。
- 用 AsyncStorage 保存 access token。
- 只在模拟器验证，不做真机检查。
