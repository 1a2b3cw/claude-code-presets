# AI 开发团队

基于 Claude Code 与 Codex 的 AI 协作开发团队配置，支持无技术栈底座，以及 **Web 全栈**、**AI 应用**和 **移动 App** 三种技术栈。

> v3.4.0 | 2026-06-20

## 一句话

> 你负责想清楚"要什么"，AI 团队负责"怎么做"。

## 包含什么

| 组件 | 数量 | 说明 |
|------|------|------|
| **Agent** | 6 个 | Architect-Planner、Builder、Designer、Reviewer、Researcher、DevOps |
| **Skill（公共）** | 8 个 | 架构、代码审查、调试、性能、项目规划、Skill 策展、测试、UI 原型 |
| **Preset（base）** | 1 个 | 无技术栈偏见，只安装团队底座，配合 `/project-preset` 生成项目专属预设 |
| **Skill（web-fullstack）** | 7 个 | 前端、API 设计、数据库、UI 设计、TypeScript 进阶等 |
| **Skill（ai-app）** | 8 个 | RAG 管道、AI Agent、结构化输出、向量数据库、Prompt 工程等 |
| **Skill（mobile-app）** | 9 个 | 移动 UI、导航、原生能力、离线优先、性能、升级、设备验证、测试、发布 |
| **MCP 服务器** | 3 个（公共）+ 预设专用 | GitHub、Playwright、Context7；AI 预设加 pgvector |
| **工作流命令** | 9 个 | Claude Code 用 `/plan` 等 slash command；Codex 用 `$team-command-plan` 等 skill |
| **Rules** | 2 个公共 + 预设专用 | Git、设计规范；技术栈 preset 按需叠加规则 |
| **Specs** | 预设专用 | 技术栈详细参考（AI 按需读取；base 不叠加） |
| **Hook** | 2 个 | 代码安全检查（Write/Edit）、Bash 命令拦截 |
| **Codex 入口** | 5 类 | `AGENTS.md`、`.agents/skills`、`.codex/config.toml`、`.codex/hooks`、`.codex/agents` |
| **CLI 工具** | 1 个 | `init/update/validate/status/events/metrics/planning/delivery/change/operations` 本地项目工具 |

## 快速开始

### 环境要求

- **Node.js** 18+
- **Git** 2.30+
- **Claude Code** 或 **Codex** 最新版

### 安装

```bash
# 进入你的项目目录
cd your-project

# 基础底座（不预设技术栈，推荐给非内置技术栈项目）
npx create-claude-team init --preset base

# Web 全栈（React + Node.js + TypeScript）
npx create-claude-team init

# AI 应用 — Python 路线（RAG + Agent + Claude API + FastAPI）
npx create-claude-team init --preset ai-app

# AI 应用 — TypeScript 路线（Vercel AI SDK + Hono + pgvector）
npx create-claude-team init --preset ai-app --lang typescript

# 移动 App — Expo + React Native + TypeScript
npx create-claude-team init --preset mobile-app
```

### 更新配置

```bash
# 更新到最新版（保留 settings.json 和 .claude/workspace）
npx create-claude-team update

# 校验 preset / skill / manifest 完整性
npx create-claude-team validate

# 读取本地 artifact，输出项目状态
npx create-claude-team status

# 校验 events JSONL 和 artifact 引用
npx create-claude-team events validate

# 从 events 聚合 metrics.md
npx create-claude-team metrics update

# 校验 vNext planning artifact 的 ID、引用和状态所有权
npx create-claude-team planning validate

# 校验发布前的运行准备度证据
npx create-claude-team operations validate .claude/workspace/operations/<brief>.md
```

### 验证

在 Claude Code 中输入 `/mcp`，确认 MCP 服务器已加载。

在 Codex 中打开项目，确认根目录存在 `AGENTS.md`，且 `.agents/skills/`、`.codex/config.toml` 已生成。

## 四种预设

### `base`

**定位**：无技术栈偏见的团队底座，适合 Go、Rust、Django、Spring、Flutter、Unity、已有老项目等非内置技术栈场景。

**包含**：
- 公共 Agent、公共 Skill、9 个工作流命令、Git/设计规则、安全 hooks、Codex 同步入口
- 不叠加任何技术栈 rules/specs/skills
- 推荐后续立即运行 `/project-preset`（Codex 用 `$team-command-project-preset`）生成项目自己的专项预设

### `web-fullstack`（默认）

**技术栈**：TypeScript + React 18+ / Next.js 14+ + Node.js 20+ + Hono + Prisma / Drizzle + PostgreSQL

**包含**：
- 7 个 Skill：frontend、api-design、database、typescript-advanced、ui-design、ci-cd-pipelines、microservices-design
- 4 个 Rule：typescript、react、node、testing
- 4 个 Spec：typescript、react、node、testing（详细技术参考）
- MCP：GitHub + Playwright + Context7 + PostgreSQL（可选）

### `ai-app`

> 曾用名 `ai-knowledge-base`，仍作为别名可用（`--preset ai-knowledge-base` 会自动解析为 `ai-app`）。

**适用场景**：RAG 知识库、AI Agent、结构化提取、LLM 服务

**两条语言路线**（安装时 `--lang` 选择，默认 python）：

| 路线 | 技术栈 | 何时选 |
|------|--------|--------|
| **Python**（默认） | Claude API + pgvector + FastAPI + asyncio | 数据/检索后端，强文档解析 |
| **TypeScript** | Vercel AI SDK + Hono + pgvector | 已有 web 栈，做 AI 产品 |

> 两条路线都**默认裸 SDK，不上 LangChain**（反框架，见 `rules/llm.md`）。
> Vercel AI SDK 只是个 TS 库，与 Vercel 部署无关，可部署到任何 Node 环境。

**包含**：
- 8 个 Skill：rag-pipeline、ai-agents、structured-output、embedding、vector-db、prompt-engineering、llm-evaluation、data-pipeline（概念类技能含 Python + TS 两套示例）
- 语言无关 Rule：llm、agents、rag、vector-db
- 语言相关 Rule：python（Python）/ typescript-ai（TS）
- Spec：Python 路线 claude-api/python/rag；TS 路线 typescript/rag
- MCP：GitHub + Playwright + Context7 + pgvector

### `mobile-app`

**适用场景**：Expo App、React Native 跨平台应用、移动端 AI 产品、需要真机验证的 App 原型

**技术栈**：TypeScript + React Native + Expo + Expo Router + EAS Build/EAS Submit

**包含**：
- 9 个 Skill：mobile-ui、app-navigation、native-capabilities、offline-first、app-performance、rn-upgrade、device-verification、app-testing、app-release
- 8 个 Rule：react-native、expo、mobile-ui、mobile-testing、mobile-performance、mobile-security、device-verification、app-release
- 8 个 Spec：react-native、expo、navigation、state-management、mobile-performance、react-native-upgrade、device-verification、app-store-release
- MCP：GitHub + Playwright + Context7（第一版不新增移动端专用 MCP）

## 怎么用

### 9 个核心工作流

| Claude Code | Codex | 什么时候用 |
|------|-----------|------|
| `/plan` | `$team-command-plan` | 项目开局，分析产品出功能模块清单 |
| `/project-preset` | `$team-command-project-preset` | 讨论/扫描项目，生成项目专属 `project-profile/` 与 `project-preset/` |
| `/taste` | `$team-command-taste` | 写 UI 前定设计方向（出 `preview/`） |
| `/dev` | `$team-command-dev` | 要写代码（完整流程） |
| `/check` | `$team-command-check` | 写完一个功能想快检 |
| `/fix` | `$team-command-fix` | 修一个已知的具体问题 |
| `/review-all` | `$team-command-review-all` | 合并前全面审查 |
| `/ship` | `$team-command-ship` | 准备上线 |
| `/standup` | `$team-command-standup` | 看进度 |

### 工作流

```
（可选）项目开局：/plan 做一个 AI 知识库（Codex 用 $team-command-plan）
    ↓ AI 输出功能模块清单 roadmap.md，你挑着做
（推荐）生成项目预设：/project-preset（Codex 用 $team-command-project-preset）
    ↓ AI 输出 project-profile/ + project-preset/
输入：/dev 做一个文档检索问答功能（Codex 用 $team-command-dev）
    ↓
AI 先问你 3 个问题（需求确认，最多 3 轮）
    ↓
AI 自动判断任务复杂度（S/M/L/XL）
    ↓
L/XL 级：出方案给你确认 → 确认后迭代开发 → 自动 /check → 完成
M 级：输出 checklist 确认 → 写代码 → 自动 /check → 完成
S 级：直接写代码 → 完成
```

## 配置文件结构

```
.claude/
├── CLAUDE.md              # 核心指令（工作流、规范、异常路径）
├── settings.json          # 权限配置、Hook 配置
├── .mcp.json              # MCP 服务器配置
├── .preset                # 已安装的预设标记（update 时使用）
├── agents/                # 6 个 Agent 角色定义
├── skills/                # 公共技能
├── commands/              # 9 个斜杠命令
├── rules/                 # 公共规则（git、design）+ 预设规则
├── specs/                 # 详细技术参考（预设专用，AI 按需读取）
├── workspace/             # canonical team state / reports
│   ├── journal.md         # AI 自动追加会话日志
│   └── metrics.md         # 效能指标
└── hooks/                 # 安全钩子（Node，跨平台）
    ├── security-check.mjs
    └── bash-check.mjs

AGENTS.md                  # Codex 入口指令（由 CLAUDE.md 同步）
.agents/
├── agents/                # 角色定义镜像
├── skills/                # Codex 可读取的 Skill
├── commands/              # Claude 命令说明镜像
├── rules/                 # 团队规则参考
└── specs/                 # Codex 技术参考镜像
.codex/
├── config.toml            # Codex MCP 配置
├── agents/                # Codex custom agents
├── hooks.json             # Codex hooks 配置
└── hooks/                 # 安全 hooks 镜像

project-profile/           # /project-preset 生成：项目画像（产品、技术栈、架构、质量、验收）
project-preset/            # /project-preset 生成：项目专属规则、specs、技能规划
```

每个 `presets/<name>/` 都有 `preset.json`，用于声明 preset 名称、技能数量、规则清单、语言变体、测试入口和初始化提示。CLI help、validate、smoke test 都从 manifest 读取，减少手写计数漂移。

## 可选配置

### GitHub MCP

```bash
# 在 .claude/settings.json 的 env 中添加
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_你的token
```

Token 权限需要 `repo`、`read:org`。

### PostgreSQL / pgvector

编辑 `.claude/.mcp.json`，再运行 `npx create-claude-team update` 同步到 `.codex/config.toml`。需要数据库时设置 `DATABASE_URL` 环境变量：

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
```

## 文档

- [USAGE.md](USAGE.md) - 完整使用文档
- [BEST-PRACTICES.md](BEST-PRACTICES.md) - 最佳实践指南
- [EXTERNAL-SKILLS.md](EXTERNAL-SKILLS.md) - 外部 skills/agents 生态参考与采纳策略
- [CHANGELOG.md](CHANGELOG.md) - 版本更新日志

## License

MIT
