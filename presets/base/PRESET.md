# Preset: base

> 无技术栈偏见的 AI 开发团队底座

## 定位

`base` 只安装通用团队能力，不假设项目使用 React、Node、Python、RAG、Expo 或任何具体技术栈。

它适合：

- 技术栈不在内置 preset 覆盖范围内的项目。
- 已有项目，需要先扫描代码再生成项目专属规则。
- 用户已有方案，希望让 AI 根据方案生成 `project-preset/`。
- 想把 `create-claude-team` 当作团队流程、安全 hooks、Codex/Claude 同步底座使用。

推荐流程：

```bash
npx create-claude-team init --preset base
```

然后在 Claude Code 中运行：

```text
/project-preset
```

或在 Codex 中运行：

```text
$team-command-project-preset
```

## 包含内容

来自公共底座：

- 6 个 Agent：Architect-Planner、Builder、Designer、Reviewer、Researcher、DevOps。
- 8 个公共 Skill：架构、代码审查、调试、性能、项目规划、Skill 策展、测试、UI 原型。
- 9 个工作流命令：`/project-preset`、`/plan`、`/taste`、`/dev`、`/check`、`/fix`、`/review-all`、`/ship`、`/standup`。
- 公共 rules：Git、设计规范。
- 安全 hooks：代码安全检查、危险命令拦截。
- Codex 同步入口：`AGENTS.md`、`.agents/`、`.codex/`。

## 不包含内容

- 不叠加技术栈规则。
- 不叠加技术栈 specs。
- 不叠加技术栈 skills。
- 不默认推荐任何框架、ORM、数据库、LLM SDK 或部署平台。

## 后续项目预设

`base` 安装完成后，项目真正的技术栈和业务规则应由 `/project-preset` 生成：

```text
project-profile/
project-preset/
```

后续 `/plan`、`/dev`、`/check`、`/review-all` 应优先读取 `project-preset/PRESET.md` 与 `project-preset/rules/`。

## MCP 服务器

沿用公共 MCP：

- **github**：管理仓库、PR、Issue。
- **playwright**：浏览器自动化、截图、E2E。
- **context7**：查询最新库文档。
