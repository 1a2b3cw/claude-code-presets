# Expo 详细参考

## 项目入口

Expo Router 项目通常使用：

```text
app/
├── _layout.tsx
├── index.tsx
├── (auth)/
│   ├── _layout.tsx
│   └── sign-in.tsx
└── (tabs)/
    ├── _layout.tsx
    ├── index.tsx
    └── settings.tsx
```

`app/` 是路由层，不是业务层。复杂逻辑放到 `src/features/`。

## 配置文件
- `app.json`：静态配置。
- `app.config.ts`：需要环境分支或计算配置时使用。
- `eas.json`：构建 profile。
- `.env`：本地环境变量，客户端变量必须使用 `EXPO_PUBLIC_` 前缀。

## Expo SDK 选择
- 优先选择 Expo 官方模块。
- 第三方原生库必须确认是否支持 Expo managed workflow。
- 需要原生配置时优先找 config plugin。
- prebuild 前记录原因，并确认团队接受原生工程进入仓库。

## EAS profile

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

## 环境和密钥
- Secret 不进入客户端 bundle。
- 客户端只保存可以公开的配置。
- API key 如果必须在客户端出现，应当被视为 public key，并在服务端做权限限制。
- 私密服务调用放到后端，不从 App 直连。

## 发布流程
1. 更新版本号和构建号。
2. 跑测试、lint、类型检查和关键 E2E。
3. `eas build --profile production --platform all`。
4. 验证构建产物。
5. `eas submit` 或手动上传商店。
