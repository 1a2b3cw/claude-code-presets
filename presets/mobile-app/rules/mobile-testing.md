# 移动端测试规则（必须遵守）

## 测试分层
- 纯函数、格式化、校验和状态 reducer 写单元测试。
- 关键组件使用 React Native Testing Library。
- 核心用户流程使用 Maestro E2E。
- 原生权限、通知、定位、相机等能力至少做手动真机验证记录。

## 单元测试
- 测试文件与源文件同目录。
- 网络请求、存储、时间和权限 API 必须 mock。
- 测试名称遵循 `describe('功能') > it('应该做什么')`。

## 组件测试
- 优先通过可见文本、accessibility label、role 查询元素。
- 使用 React Native Testing Library v13+ 时遵循用户视角查询优先级；不要用实现细节定位组件。
- 覆盖 loading、error、empty、success、disabled 状态。
- 表单测试要覆盖键盘输入、校验错误和提交。
- 导航、权限、存储、通知、相机等原生边界必须 mock 或用 E2E 覆盖。

## E2E
- Maestro flow 放在 `maestro/` 或项目既有 E2E 目录。
- 覆盖启动、登录/游客流、核心 tab/页面、关键提交动作。
- E2E 不依赖真实外部服务，必要时使用测试环境或 mock server。
- 真机相关能力的 E2E 结果要记录设备和系统版本。
