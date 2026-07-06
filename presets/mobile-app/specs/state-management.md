# 移动端状态管理参考

## 状态分类

| 状态 | 推荐方案 | 示例 |
|------|----------|------|
| 局部 UI 状态 | `useState` | 弹窗、展开、临时输入 |
| 表单状态 | React Hook Form | 登录、资料编辑 |
| 服务端状态 | TanStack Query | 用户资料、列表、详情 |
| 客户端全局状态 | Zustand | 主题、会话摘要、草稿 |
| 敏感持久化 | SecureStore | refresh token、设备级凭据 |
| 非敏感持久化 | AsyncStorage | onboarding 标记、偏好 |
| 结构化离线数据 | SQLite | 离线列表、同步队列 |

## TanStack Query
- query key 使用数组并集中管理。
- mutation 成功后失效相关 query。
- 弱网环境配置合理 retry/backoff。
- 错误在边界层转换成用户可读文案。
- 不把服务端数据复制到 Zustand，除非有离线编辑需求。

## Zustand
- store 保持小而清晰。
- action 写在 store 内部。
- 组件选择具体字段，避免订阅整个 store。
- 需要持久化时明确版本和迁移策略。

## 本地存储
- SecureStore 用于敏感数据，但不要保存短期 access token 以外的业务大对象。
- AsyncStorage 只存非敏感、小体量数据。
- SQLite 用于离线结构化数据和同步队列。
- 所有存储访问都通过封装层，便于 mock 和迁移。

## 离线同步
- 用户操作先写本地队列，再尝试同步。
- 同步失败要有重试、冲突处理和用户反馈。
- 每条离线操作带 id、createdAt、status、retryCount。
- 冲突策略写进 spec，不在实现时临时决定。
