# Controlled Delivery Contract

> 状态：active
> Contract ID：CDC-VNEXT-001
> Planning Contract：PAC-VNEXT-001
> Architecture ID：ARCH-VNEXT-001
> Owner：A5 Delivery Control
> 更新于：2026-07-11

## 目的

让 Builder 在开始 M/L/XL 任务前先验证上游事实、执行范围与安全信息；让每次任务状态迁移有可检查的依据。它不创建新的状态文件，也不替代 N7 的发布和运行保障门禁。

## 输入与输出

输入固定读取：Product Brief -> Product Model -> Architecture -> roadmap -> feature spec -> feature tasks。`delivery preflight` 只读这些 artifact，并输出：

- `pass`：可以开始指定任务；命令会列出可执行的下一状态。
- `needs_revision`：spec、tasks 或风险说明不足；先补齐当前 feature package，不得开始实现。
- `blocked`：上游链无效、依赖模块未完成、目标已阻塞或模块不可执行；输出最小解除动作。

`events`、review/release report、status 和 Workbench 都只是证据或投影，不能作为 preflight 的替代输入。

## 开工条件

M/L/XL 模块开工前必须满足：

1. `node create-claude-team/cli.js planning validate` 通过。
2. 目标 roadmap 模块状态为 `planned` 或 `in_progress`，所有模块依赖为 `done` 或 `shipped`。
3. feature package 存在，且 spec 有验收场景与 `Spec/Task Quality Gate`，tasks 有 `Spec/Task Quality Gate`。
4. 指定 task 包含描述、验收标准、验收命令、阻塞原因、Gate 结果、产物和最近更新；状态允许进入 `in_progress`。
5. spec 必须声明 `Security Impact` 与 `Operational Impact`。安全敏感变更还必须声明 `Security Risk Level：high` 和非空 `Threat Model`；N7 再定义完整威胁模型、发布和恢复证据。

## 小迭代状态门禁

CLI 只判定迁移是否合法；命令/Builder 在验证真实检查结果后写回 `tasks.md`。允许的正常路径为：

```text
ready -> planned -> in_progress -> local_gate -> review_gate -> release_gate -> shipped
                                                -> done (release not required)
```

- `planned -> in_progress` 与 `blocked -> in_progress` 必须先有 `delivery preflight ... --task <id>` 的 `pass`。
- `local_gate -> review_gate` 需要 `Gate 结果` 包含 `local pass`。
- `review_gate -> release_gate` 或 `done` 需要 `Gate 结果` 包含 `review pass`；到 `done` 还必须明确 `release not_required`。
- `release_gate -> shipped` 需要 `Gate 结果` 包含 `release pass`。
- 任意状态可转为 `needs_clarification` 或 `blocked`，但必须同步填写阻塞原因。

使用方式：

```text
node create-claude-team/cli.js delivery preflight N5 --task N5.2
node create-claude-team/cli.js delivery transition N5 N5.2 in_progress
```

## 安全边界

- preflight 不执行代码、不读取密钥、不把敏感内容写入报告。
- 高风险识别覆盖认证、授权、密码、token、加密、支付、个人数据和数据迁移等常见变更；不确定时按高风险处理。
- 本合同的安全检查仅阻止“没有风险说明就开始开发”；它不宣称功能已经安全上线。
