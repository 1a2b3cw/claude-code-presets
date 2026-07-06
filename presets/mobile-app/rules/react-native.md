# React Native 规则（必须遵守）

## 必须做
- 使用函数组件和 Hooks。
- Props 使用 `interface` 定义，复杂参数用对象。
- 组件按 feature 组织，公共组件放 `src/shared/components/`。
- 平台差异使用 `Platform.select` 或平台文件，避免在组件里堆复杂分支。
- 长列表使用 `FlatList` / `SectionList` / `FlashList`，不要用 `ScrollView` 渲染大量项目。
- 图片必须设置稳定尺寸或 aspect ratio，避免加载后布局跳动。
- 网络、存储、权限、通知等副作用放到 service 或 hook 边界。

## 禁止做
- 不在 render 过程中执行异步副作用。
- 不在 JSX 内创建大对象、大数组或复杂函数。
- 不把敏感 token 放入 AsyncStorage。
- 不用数组 index 作为可重排列表 key。
- 不依赖单个平台的视觉效果作为唯一反馈。

## 性能
- 列表项组件保持轻量，必要时使用 `memo`。
- `renderItem`、`keyExtractor`、事件处理函数保持引用稳定。
- 大图使用缩略图、缓存或服务端裁剪。
- 动画优先使用原生驱动能力，不用 JS 定时器模拟高频动画。
- 真机上验证滚动、键盘、图片和启动时间。

## 平台差异
- iOS/Android 的返回、权限、键盘、状态栏行为都要单独考虑。
- 需要平台差异时优先封装到小函数或小组件。
- 使用原生能力前先检查 Expo SDK 是否已覆盖；不够时再考虑 prebuild 或 config plugin。
