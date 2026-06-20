# 使用文档 — 完整组件参考

> 这套配置里有什么、怎么装、各组件干什么的**参考手册**。
>
> 想知道**怎么用它开发**看 [BEST-PRACTICES.md](BEST-PRACTICES.md)；想要**总览**看 [README.md](README.md)。

> v3.3.0 | 2026-06-18

---

## 1. 环境要求

| 必需 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | CLI、安全 hooks、MCP 服务器 |
| Git | 2.30+ | 版本控制 |
| Claude Code | 最新 | 运行环境 |

按需安装：
- **Docker**（AI 预设用 pgvector，Web 预设可选 PostgreSQL）
- **uv / Python 3.11+**（AI 预设 Python 路线）
- **pnpm**（推荐的 Node 包管理器）

> 安全 hooks 用 Node 实现，无需 bash/jq，Windows/Mac/Linux 通用。

---

## 2. 安装与更新

### CLI（推荐）

```bash
cd 你的项目

npx create-claude-team init                                       # Web 全栈
npx create-claude-team init --preset ai-app            # AI / Python
npx create-claude-team init --preset ai-app --lang typescript  # AI / TS

npx create-claude-team update                                     # 升级（保留 settings/workspace）
npx create-claude-team init --dry-run                             # 预览不写入
npx create-claude-team init --force                               # 覆盖已存在的 .claude/
```

### 安装时发生了什么

```
底座 .claude/          → 复制（公共 agents/skills/commands/rules + CLAUDE.md + hooks）
  + 预设叠加            → presets/<preset>/ 的 rules/specs/skills 合并进来
  + 语言叠加（仅 AI）   → lang/<python|typescript>/ 的 rules/specs 合并进来
  + MCP 合并            → preset.mcp.json 合并进 .mcp.json
  + 写 .preset 标记     → 记录预设名 + 语言（update 据此刷新）
  + 建 workspace/       → journal.md + metrics.md
```

`update` 只刷新 agents/skills/commands/rules/specs/hooks 和 CLAUDE.md；**保留** settings.json、.mcp.json、workspace/（CLAUDE.md 覆盖前自动备份 .bak）。

---

## 3. 配置结构

```
.claude/
├── CLAUDE.md          # 工作流、规范、异常路径（核心指令）
├── settings.json      # 权限 + hooks 配置
├── .mcp.json          # MCP 服务器（底座 + 预设合并结果）
├── .preset            # 已装预设 + 语言标记
├── agents/            # 6 个角色
├── skills/            # 公共 7 + 预设 7/8（按需触发）
├── commands/          # 8 个斜杠命令
├── rules/             # 始终加载的必守规则
├── specs/             # 详细技术参考（AI 按需读取）
├── workspace/         # journal.md（会话记忆）+ metrics.md（效能）
└── hooks/             # security-check.mjs + bash-check.mjs（Node）
```

---

## 4. MCP 服务器

**底座（所有预设）**：
| 服务器 | 类型 | 用途 | 配置 |
|--------|------|------|------|
| github | http | 仓库/PR/Issue | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| playwright | stdio | 浏览器自动化、截图、E2E | 无 |
| context7 | stdio | 查最新库文档 | 无 |

**web-fullstack 额外**：`sqlite`（本地 `./data/dev.db`）、`postgres`（`DATABASE_URL`）
**ai-app 额外**：`pgvector`（`DATABASE_URL`）

装完用 `/mcp` 验证。配 token：在 `.claude/settings.json` 的 `env` 加 `GITHUB_PERSONAL_ACCESS_TOKEN`。

---

## 5. Agent 团队（6）

| Agent | 职责 | 何时参与 |
|-------|------|----------|
| **Architect-Planner** | 需求分析、任务拆解、架构、技术选型 | L/XL 级 |
| **Builder** | 编码、单测、重构 | 所有任务 |
| **Designer** | UI 设计方向、视觉审查 | 涉及 UI 的 L/XL 级 |
| **Reviewer** | 单文件 6 维 + 跨文件 4 维审查 | M 级以上 |
| **Researcher** | 技术调研、方案对比 | 按需 |
| **DevOps** | CI/CD、部署、容器化 | L/XL 级、发布阶段 |

---

## 6. Skill 技能

**公共（7，所有预设）**：architecture、code-review、debugging、performance、project-planning、testing、ui-prototype

**web-fullstack（7）**：frontend、api-design、database、typescript-advanced、ui-design、ci-cd-pipelines、microservices-design

**ai-app（8）**：rag-pipeline、ai-agents、structured-output、embedding、vector-db、prompt-engineering、llm-evaluation、data-pipeline
> 概念类技能含 Python + TypeScript 两套示例，AI 按你的语言路线取用。

技能由 AI 根据 frontmatter 的 description 自动触发，不用手动调用。

---

## 7. Slash 命令（8）

| 命令 | 用途 |
|------|------|
| `/plan <产品想法>` | 项目开局规划：分析产品 → 输出功能模块清单 `roadmap.md`，不写代码 |
| `/taste [项目背景]` | 设计方向探索：情绪板 / 快问快答 / 逛参考找到审美 → 输出 `preview/design-direction.md`，不写代码 |
| `/dev <需求>` | 完整开发流程（Phase 0 需求确认 → 判级 → 迭代 → 验收 → 记录指标）；指定 roadmap 模块时复用其分析 |
| `/check [路径]` | 写完快检（逻辑/类型/边界），自动修 |
| `/fix <文件/问题>` | 定点修复，不走流程 |
| `/review-all [路径]` | 合并前跨文件审查（一致性/完整性/回归/依赖） |
| `/ship [--dry-run]` | 发布门禁（8 道关卡 + 回滚检查） |
| `/standup` | 进度 + 效能趋势分析 |

> 完整工作流和使用时机见 [BEST-PRACTICES.md](BEST-PRACTICES.md)。

---

## 8. Rules 与 Specs（规范注入机制）

- **rules/**：始终加载的必守规则。公共：git、design；预设按技术栈叠加（TS/React/Node/测试 或 llm/agents/rag/vector-db + 语言规则）。
- **specs/**：详细技术参考，AI 在需要深入时主动读取（不常驻上下文）。
- **优先级**（设计相关）：`preview/` 目录 > spec.md 设计方向 > 风格定义 > design.md 默认规范。

---

## 9. 安全 Hooks

PreToolUse 自动执行，Node 实现（跨平台，无外部依赖）：

| Hook | 触发 | 行为 |
|------|------|------|
| `security-check.mjs` | Write/Edit | 扫代码注入/XSS/命令注入/硬编码密钥/原型链污染。严重 → 阻止（exit 2）；中等 → 警告 |
| `bash-check.mjs` | Bash | 拦 `rm -rf /`、force push、`reset --hard`、`npm publish`、磁盘/关机命令等；警告 `curl\|bash`、`chmod 777`、sudo 等 |

> 关键设计：检测到严重问题**阻止操作**，绝不"失败放行"。

---

## 10. 会话记忆（workspace/）

| 文件 | 写入 | 读取 |
|------|------|------|
| `journal.md` | 会话结束自动追加 | 新会话开始读取，续上下文 |
| `metrics.md` | `/dev` 完成后追加效能指标 | `/standup` 读取分析趋势 |

这是让 AI 越用越懂你项目的反馈闭环。

---

## 11. 自定义

| 想做 | 怎么做 |
|------|--------|
| 加 Agent | `.claude/agents/` 下加 `.md` |
| 加 Skill | `.claude/skills/<name>/SKILL.md`（带 name + description frontmatter） |
| 加命令 | `.claude/commands/<name>.md`，文件名即命令名 |
| 改规则 | 编辑 `.claude/rules/`，或项目约定写进 CLAUDE.md |
| 禁用 MCP | 编辑 `.claude/.mcp.json` 删对应项 |

> 自定义写进 CLAUDE.md / spec / 项目内文件，别直接改会被 `update` 刷新的目录（agents/skills/commands/rules/specs/hooks）。

---

## 12. 故障排查

| 现象 | 排查 |
|------|------|
| `/mcp` 看不到服务器 | 检查 `.mcp.json` 语法、token 是否配置、`npx` 能否联网 |
| GitHub MCP 401 | `GITHUB_PERSONAL_ACCESS_TOKEN` 权限需 `repo` + `read:org` |
| pgvector 连不上 | `docker compose up -d postgres`，确认 `DATABASE_URL` |
| hooks 没反应 | 确认 `node` 在 PATH；hooks 是 `.mjs`，settings.json 用 `node` 调用 |
| update 后自定义丢了 | 从 `CLAUDE.md.bak` 恢复；自定义应写进不被刷新的位置 |

---

> [README.md](README.md) 总览 · [BEST-PRACTICES.md](BEST-PRACTICES.md) 实战 · [CHANGELOG.md](CHANGELOG.md) 版本历史
