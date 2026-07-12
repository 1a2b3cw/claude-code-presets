---
name: team-command-fix
description: Execute the fix workflow from this AI development team preset. Use when the user writes /fix, asks for fix, or wants the corresponding team process in Codex.
---

# team-command-fix

This skill ports the Claude Code `/fix` command workflow to Codex.

In Codex, invoke this as `$team-command-fix`. Do not rely on `/fix` unless Codex itself defines that slash command with the same meaning.

# /fix - 定点修复

指定文件或描述问题，AI 直接修，不走规划流程。

## Project Preset Lifecycle

开始前运行 `node create-claude-team/cli.js project-preset context --json`。当结果为 `pass` 时，按 `PRESET.md -> rules -> specs -> base/技术栈 preset` 顺序读取；只读取与当前修复相关的 .agents/rules/specs。结果为 `needs_revision` 时，不得静默把 project-preset 当作项目事实，先说明 `project-preset validate` 的修复项。不存在 project-preset 时，继续使用 base 和已安装技术栈 preset，不阻塞既有项目，并按需建议 `/project-preset`。

## 和 /dev 的区别

| 场景 | 用什么 |
|------|--------|
| 做一个新功能 | `/dev` |
| 修一个已知的具体问题 | `/fix` |
| 不知道问题在哪 | `/check` 快检找到问题后再 `/fix`，或 `/review-all` 全面审查 |

## 使用方式

```
/fix src/auth/login.ts 里的密码验证逻辑不对
/fix 首页的标题字号太小了，改成 24px
/fix 用户列表的分页在最后一页会报错
/fix src/api/users.ts:42 行的类型错误
```

## 修复流程

```
1. 理解问题
   - 如果指定了文件 → 读取文件，定位问题
   - 如果只描述了问题 → 搜索相关代码，定位问题

2. 分析根因
   - 不是只修表面症状，要理解为什么出错
   - 如果发现更深层的问题，告诉你

3. 修复
   - 写修复代码
   - 确保不引入新问题（检查相关代码）

4. 验证
   - 如果有相关测试 → 运行测试确认通过
   - 如果没有测试 → 写一个防止回归的测试
   - 类型检查 tsc --noEmit

5. 输出
   - 告诉你改了什么、为什么这么改
   - 如果发现同类问题，一并指出
```

## Change Impact Contract

存在 `.claude/workspace/planning/change-impact-contract.md` 时，先判断这是否只是 S 级局部修复：明确 typo、单文件格式或不改变用户结果/接口/边界的改动可直接修。其余体验反馈、行为变化、跨文件修改、架构/安全/运行影响必须先：

```text
node create-claude-team/cli.js change analyze <module> --kind <experience|behavior|architecture|security|operational>
node create-claude-team/cli.js change validate .claude/workspace/changes/<brief>.md
```

- Brief 必须说明归属判断、影响范围、同步项和验证计划；`needs_revision` 或 `blocked` 时不得开始修复。
- 通过后，按 Brief 的 Target Module 进入 N5 受控循环；需要时使用 `delivery preflight <module> --task <id> --change <brief>`。
- 架构、安全、兼容、迁移、隐私或产品范围变化仍须按 ADR/Owner Decision Brief/N7 规则升级，不能借 `/fix` 绕过。

## 修复原则

- **一次只修一个问题**，不要顺手"优化"其他代码
- **先定位再修改**：非 S 级反馈先创建 Change Impact Brief，修改范围以 Brief 的同步项为边界
- **修完不引入新问题**，检查相关代码
- **能写测试就写测试**，防止回归
- **如果问题比你描述的更复杂**，告诉你实际情况，让你决定要不要扩大修复范围

## 输出格式

```markdown
# 修复报告

## 问题
[你描述的问题]

## 根因
[为什么会出这个问题]

## 修复
- 文件：`src/auth/login.ts:42`
- 修改：[具体改了什么]
- 原因：[为什么这么改]

## 验证
- [x] 相关测试通过
- [x] 类型检查通过
- [x] 无新增问题

## 同类问题
- `src/auth/register.ts:38` 有类似问题，需要一起修吗？
```

## 边界

- `/fix` 修的是**已知的具体问题**
- 如果你说"帮我修一下这个文件"但没说具体问题，AI 会先用 `/check` 检查，找到问题后再修
- 如果问题是架构层面的（比如"这个模块设计不合理"），AI 会建议用 `/dev` 走完整流程
