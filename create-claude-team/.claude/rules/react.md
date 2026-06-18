# React 规则（必须遵守）

## 必须做
- 函数组件 + Hooks
- Props 用 `interface` 定义，可选用 `?` 标记
- 交互元素必须有 `aria-label` 或可见文本
- 图片必须有 `alt` 属性
- 列表用稳定的 `key`（不用 index）

## 禁止做
- 在条件/循环中调用 Hook
- JSX 中使用 if-else（用三元或 &&）
- `innerHTML` / `dangerouslySetInnerHTML`（除非经过 sanitize）
- 无反馈的可点击元素（必须有 hover/press 状态）

## Hooks 规则
- 自定义 Hook 以 `use` 开头
- useEffect 依赖数组要完整
- 状态选择：局部 `useState` → 跨组件 `useContext` → 复杂状态 `Zustand` → 服务端 `TanStack Query`

## 性能优化
- 纯展示组件用 `React.memo`
- 昂贵计算用 `useMemo`
- 传递给子组件的回调用 `useCallback`
- 大列表用虚拟滚动

## 条件渲染
```tsx
// 早返回（最清晰）
if (!user) return <LoginPrompt />;
// 三元（简单二选一）
{isEditing ? <EditForm /> : <ReadOnlyView />}
// &&（条件显示）
{hasPermission && <AdminPanel />}
```

## 无障碍
- 语义化 HTML：`<button>`、`<nav>`、`<main>`、`<h1-h6>`
- 表单关联 `<label>`
- 颜色对比度 >= 4.5:1（WCAG AA）
- 所有功能可通过键盘操作（Tab、Enter、Escape）
