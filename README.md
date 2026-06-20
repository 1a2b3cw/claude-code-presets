# AI 开发团队

基于 Claude Code 的 AI 协作开发团队配置，支持 **Web 全栈**和 **AI 应用**两种技术栈。

> v3.3.0 | 2026-06-18

## 一句话

> 你负责想清楚"要什么"，AI 团队负责"怎么做"。

## 包含什么

| 组件 | 数量 | 说明 |
|------|------|------|
| **Agent** | 6 个 | Architect-Planner、Builder、Designer、Reviewer、Researcher、DevOps |
| **Skill（公共）** | 7 个 | 架构、代码审查、调试、性能、项目规划、测试、UI 原型 |
| **Skill（web-fullstack）** | 7 个 | 前端、API 设计、数据库、UI 设计、TypeScript 进阶等 |
| **Skill（ai-app）** | 8 个 | RAG 管道、AI Agent、结构化输出、向量数据库、Prompt 工程等 |
| **MCP 服务器** | 3 个（公共）+ 预设专用 | GitHub、Playwright、Context7；AI 预设加 pgvector |
| **Slash Command** | 8 个 | `/plan`、`/taste`、`/dev`、`/check`、`/fix`、`/review-all`、`/ship`、`/standup` |
| **Rules** | 2 个公共 + 预设专用 | Git、设计规范；各预设含 4-5 个技术栈规则 |
| **Specs** | 预设专用 | 详细技术参考（AI 按需读取） |
| **Hook** | 2 个 | 代码安全检查（Write/Edit）、Bash 命令拦截 |
| **CLI 工具** | 1 个 | `npx create-claude-team init` 一行命令初始化 |

## 快速开始

### 环境要求

- **Node.js** 18+
- **Git** 2.30+
- **Claude Code** 最新版

### 安装

```bash
# 进入你的项目目录
cd your-project

# Web 全栈（React + Node.js + TypeScript）
npx create-claude-team init

# AI 应用 — Python 路线（RAG + Agent + Claude API + FastAPI）
npx create-claude-team init --preset ai-app

# AI 应用 — TypeScript 路线（Vercel AI SDK + Hono + pgvector）
npx create-claude-team init --preset ai-app --lang typescript
```

### 更新配置

```bash
# 更新到最新版（保留 settings.json 和 workspace）
npx create-claude-team update
```

### 验证

在 Claude Code 中输入 `/mcp`，确认 MCP 服务器已加载。

## 两种预设

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

## 怎么用

### 8 个核心命令

| 命令 | 什么时候用 | 例子 |
|------|-----------|------|
| `/plan` | 项目开局，分析产品出功能模块清单 | `/plan 做一个 AI 知识库` |
| `/taste` | 写 UI 前定设计方向（出 `preview/`） | `/taste 面向年轻人的服饰电商` |
| `/dev` | 要写代码（完整流程） | `/dev 做一个 RAG 问答接口` |
| `/check` | 写完一个功能想快检 | `/check` 或 `/check src/retrieval/` |
| `/fix` | 修一个已知的具体问题 | `/fix src/agents/loop.py 可能无限循环` |
| `/review-all` | 合并前全面审查 | `/review-all src/` |
| `/ship` | 准备上线 | `/ship` |
| `/standup` | 看进度 | `/standup` |

### 工作流

```
（可选）项目开局：/plan 做一个 AI 知识库
    ↓ AI 输出功能模块清单 roadmap.md，你挑着做
输入：/dev 做一个文档检索问答功能
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
├── commands/              # 8 个斜杠命令
├── rules/                 # 公共规则（git、design）+ 预设规则
├── specs/                 # 详细技术参考（预设专用，AI 按需读取）
├── workspace/             # 会话记忆
│   ├── journal.md         # AI 自动追加会话日志
│   └── metrics.md         # 效能指标
└── hooks/                 # 安全钩子（Node，跨平台）
    ├── security-check.mjs
    └── bash-check.mjs
```

## 可选配置

### GitHub MCP

```bash
# 在 .claude/settings.json 的 env 中添加
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_你的token
```

Token 权限需要 `repo`、`read:org`。

### PostgreSQL / pgvector

编辑 `.claude/.mcp.json`，设置 `DATABASE_URL` 环境变量：

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
```

## 文档

- [USAGE.md](USAGE.md) - 完整使用文档
- [BEST-PRACTICES.md](BEST-PRACTICES.md) - 最佳实践指南
- [CHANGELOG.md](CHANGELOG.md) - 版本更新日志

## License

MIT
