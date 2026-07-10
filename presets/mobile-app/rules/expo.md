# Expo 规则（必须遵守）

## 默认路线
- 默认使用 Expo managed workflow。
- 路由优先使用 Expo Router。
- 构建发布优先使用 EAS Build 和 EAS Submit。
- 只有 Expo SDK 或 config plugin 无法满足需求时，才进入 prebuild/bare 路线。

## Expo Router
- 页面放在 `app/`，业务逻辑放在 `src/features/`。
- `_layout.tsx` 只做导航结构、Provider 和全局配置，不塞业务逻辑。
- 认证流使用路由组隔离，例如 `(auth)`、`(tabs)`。
- 路由参数要校验，不直接信任 URL 参数。

## 配置
- App 配置优先集中在 `app.json` 或 `app.config.ts`。
- 环境变量分清 public 与 secret；客户端只读取 `EXPO_PUBLIC_` 前缀变量。
- 权限文案必须写清楚用途，尤其是相机、相册、定位、通知、麦克风。
- app icon、adaptive icon、splash screen、scheme、bundle id/package name 必须在发布前确认。

## Prebuild 边界
- 引入需要原生配置的库前，先查是否支持 config plugin。
- 进入 prebuild 后，记录原因、原生改动点和回退成本。
- 不手改原生工程来绕过配置问题，除非 tasks/spec 明确要求。
