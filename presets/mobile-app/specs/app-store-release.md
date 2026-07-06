# App Store 和 Google Play 发布参考

## 发布清单

| 项目 | iOS | Android |
|------|-----|---------|
| 应用标识 | bundle identifier | package name |
| 构建号 | buildNumber | versionCode |
| 可见版本 | version | versionName |
| 图标 | app icon | adaptive icon |
| 权限 | Info.plist usage descriptions | AndroidManifest permissions |
| 隐私 | App Privacy | Data safety |
| 签名 | Apple certificates/profiles | upload key/app signing |

## EAS Build
- development profile 用于开发客户端。
- preview profile 用于内测分发。
- production profile 用于商店提交。
- production 构建前确认环境变量来自 EAS secrets 或 CI secrets。

## 审核风险
- 请求权限但没有明显功能入口。
- 登录方式不完整，审核无法进入核心功能。
- 截图展示不存在或误导性功能。
- 使用追踪或广告 SDK 但隐私声明不完整。
- Android target SDK 或数据安全表不符合当前商店要求。

## 回滚和灰度
- 保留上一版构建信息。
- 服务端 API 保持向后兼容至少一个移动端版本。
- 新功能用 feature flag 控制。
- 崩溃率、启动时间、关键转化要在发布后监控。
