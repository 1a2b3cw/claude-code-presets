# 移动端导航参考

## 路由组织

```text
app/
├── _layout.tsx
├── (auth)/
│   ├── _layout.tsx
│   └── sign-in.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── home.tsx
│   └── settings.tsx
└── item/[id].tsx
```

使用路由组表达用户状态和导航结构，而不是在单个页面中手写复杂条件树。

## 认证流
- 未登录用户只进入 `(auth)`。
- 已登录用户进入主 app 路由组。
- 启动时显示 splash/loading，不在认证状态未知时闪现错误页面。
- token 刷新失败要清理本地会话并回到登录。

## 参数
- 路由参数是外部输入，必须校验。
- ID 参数传字符串，进入 service 层前转换和校验。
- 不把大对象塞进路由参数；大对象放 store/cache，通过 ID 读取。

## Deep Link
- 配置 scheme 和 universal/app links。
- 每个 deep link 都要处理未登录、资源不存在和权限不足。
- deep link 解析和导航执行分开，便于测试。

## 导航状态
- 不把 navigation object 存进全局状态。
- tab 间共享状态使用 query cache 或 store。
- 页面局部临时状态留在 screen 内。
