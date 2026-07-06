# 设备验证参考

## 构建类型

| 类型 | 适用 | 限制 |
|------|------|------|
| Expo Go | UI、普通 JS 逻辑、基础导航 | 不覆盖自定义原生模块和部分 config plugin |
| Development build | 原生能力、config plugin、真实包环境 | 需要构建和安装 |
| Preview build | 内测、QA、接近生产的验证 | 调试能力较少 |
| Production build | 发布前最终确认 | 不应用来探索问题 |

## 最小验证矩阵

| 变更 | iOS 模拟器 | Android 模拟器 | 真机 | Development build |
|------|------------|-----------------|------|-------------------|
| 文案/静态 UI | 是 | 是 | 可选 | 否 |
| 表单/键盘 | 是 | 是 | 建议 | 否 |
| 导航/Deep link | 是 | 是 | 建议 | 视情况 |
| 相机/相册/定位/通知 | 是 | 是 | 必须 | 必须 |
| EAS/config plugin | 是 | 是 | 必须 | 必须 |
| 发布 | 是 | 是 | 必须 | preview/production |

## 验证记录模板

```markdown
## 设备验证
- 构建类型：
- iOS：
- Android：
- 真机：
- 核心流程：
- 未覆盖风险：
```
