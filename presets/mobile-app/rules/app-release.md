# App 发布规则（必须遵守）

## 发布前检查
- app name、bundle identifier/package name、version、build number/version code 已确认。
- app icon、adaptive icon、splash screen、scheme 已配置。
- 权限声明与实际功能一致，没有多余权限。
- 隐私政策、数据收集说明和第三方 SDK 使用说明已准备。
- 生产环境 API、日志级别、错误追踪和 feature flags 已确认。
- 崩溃上报、性能监控、analytics consent 和隐私开关已确认。

## EAS
- 使用 `eas.json` 区分 development、preview、production。
- 生产构建前运行测试、类型检查、lint 和关键 E2E。
- iOS/Android 证书和 profile 不写入仓库。
- 构建失败时先看 EAS 日志，不盲目修改原生工程。

## 版本管理
- iOS `buildNumber` 与 Android `versionCode` 必须递增。
- 用户可见版本与内部构建号分开管理。
- 每次发布记录变更摘要、测试结果和回滚方案。
- 移动端 API 需要兼容至少一个旧版本 App，不能只按最新版客户端设计。

## 商店提交
- iOS 注意 App Privacy、tracking、sign in、订阅/内购规则。
- Android 注意 Data safety、target SDK、权限、签名和 closed testing 要求。
- 审核截图必须来自真实功能状态，不使用误导性图片。
