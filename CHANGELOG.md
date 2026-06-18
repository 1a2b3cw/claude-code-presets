# 更新日志

## v3.3.0（2026-06-18）

**新增 `/plan` 项目开局规划命令**

填补"产品级规划"入口：之前的 `/dev` 是单功能粒度，没有"输入产品想法 → 输出功能模块清单"的开局入口。

### 新增

- **`/plan` 命令**：输入一句产品想法 → Architect-Planner 做产品级分析（目标用户/核心价值/范围）→ 拆成功能模块 → 输出 `roadmap.md`（每模块含优先级、复杂度、依赖、建议顺序，并标出 MVP 最小集）。**只规划不写代码**。
- **与 `/dev` 衔接**：`/dev 做模块 M3` 时先读 roadmap.md 复用该模块分析、检查依赖、完成后自动打勾。
- Architect-Planner agent 增加"产品级规划"职责说明。

### 变更

- 命令数 6 → 7。README/USAGE/BEST-PRACTICES/CLAUDE.md 粒度速查全部更新。
- BEST-PRACTICES 主线骨架插入 `/plan` 作为"③ 开局"步骤（新项目可选）。
- 冒烟测试新增命令数 + plan.md 断言。版本 → 3.3.0。

### 优化（规划职责分层）

理清 Architect-Planner（角色）与规划类 skill（方法）的边界，消除重叠：

- **`architecture` skill**：原为"Web全栈架构设计"，含 Next.js/Prisma 决策树却放在**公共** skill 里，对 AI/Python 项目误导。改为**语言无关**的架构方法（分层、模块边界、依赖方向、模式），技术栈选型交回各预设 PRESET.md。
- **`project-planning` skill**：原自带一套与标准流程冲突的 5 问需求清单 + 完整流程，和 Architect-Planner 抢活。改为**纯拆解方法**，服务两个粒度（产品级→roadmap.md、功能级→tasks.md），需求确认交回 /plan、/dev 的统一 Phase 0。
- **Architect-Planner agent**：明确"角色定义职责/流程/产出契约，方法调用 skill"，引用 `project-planning`/`architecture`，不再重述方法论；讲清同时服务 `/plan`（产品级）与 `/dev`（功能级）。
- 已知同类待办：`performance` skill 也是"Web 专属内容放在公共层"，留待后续处理。

## v3.2.0（2026-06-18）

**AI 预设更名 `ai-knowledge-base` → `ai-app`**

预设已从单纯的"知识库"成长为覆盖 RAG / AI Agent / 结构化提取 / LLM 服务的通用 AI 应用预设，更名以匹配实际范围。趁 3.1.x 刚发布、尚无用户依赖时完成。

### 变更

- 预设目录 `presets/ai-knowledge-base/` → `presets/ai-app/`。
- CLI：`--preset ai-app`；旧名 `ai-knowledge-base` 作为**向后兼容别名**保留，自动解析为 `ai-app` 并提示。
- 文档（README/USAGE/BEST-PRACTICES/PRESET）全部更新为新名。
- 冒烟测试新增别名解析断言（旧名经 CLI 仍可正确安装）。
- README 修正配置结构里残留的 `.sh` hooks（实为 `.mjs`）。

## v3.1.1（2026-06-18）

**安全 hooks 改用 Node（修复 Windows 失效）+ 文档收尾（P2）**

### 修复

- **P2.1 — 安全 hooks 在无 jq 环境静默失效**：旧 `.sh` hooks 依赖 `jq` 解析 stdin JSON，而 Git for Windows 默认不带 jq，导致 hook 读不到内容、直接 `exit 0` **放行所有代码**——含 `eval()` 的代码不会被拦。安全检查形同虚设。
  - 重写为 `security-check.mjs` / `bash-check.mjs`（Node 实现，零外部依赖，跨平台），检测逻辑完全对齐旧版。
  - `settings.json` hook 命令 `bash *.sh` → `node *.mjs`。
  - 实测确认：含 `eval()` 的写入、含 `rm -rf /` 的命令均被正确拦截（exit 2），干净输入放行。
- **修复 hook 误报**（hook 真正生效后才暴露的潜伏问题）：
  - `bash-check`：`(dd|mkfs|fdisk)\s+` 会误拦 `git add`（"add" 含 "dd"）；关机命令组缺边界。改为命令边界锚定。
  - `security-check`：`eval\s*\(` 会误拦 `retrieval(`、`medieval(` 等标识符。改为 `\beval` 词边界。

### 变更

- **文档收尾**（P2.3）：
  - 重写 `USAGE.md` 为 v3.1 准确的组件参考（旧版停在 v2.0.2，描述的是 v3.0 之前的单体结构、已移除的 SQLite/Puppeteer、错误的 MCP/技能计数）。
  - 删除 `MODIFICATION-REPORT.md`（v2.0 一次性产物，已被本 CHANGELOG 覆盖）。
  - 修正残留的 `claude-team-config` URL。
- 冒烟测试增加 hooks 迁移断言（`.mjs` 存在、无遗留 `.sh`）。

## v3.1.0（2026-06-18）

**ai-knowledge-base 双语言路线 + 反框架立场（P1）**

### 新增

- **TypeScript 路线**：AI 预设现支持 `--lang typescript`，基于 Vercel AI SDK（`ai` 包，与 Vercel 部署无关）+ Hono + pgvector。
  - `lang/typescript/rules/typescript-ai.md` — TS AI 规则（Zod、ai SDK、命名）
  - `lang/typescript/specs/typescript.md` — TS 后端完整参考（Hono + ai SDK + postgres.js + 测试 + Docker）
  - `lang/typescript/specs/rag.md` — 进阶 RAG 的 TS 实现
  - `ai-agents` / `structured-output` 技能补完整 TS 代码；`rag-pipeline`/`embedding`/`vector-db` 补 TS 指引
- **语言选择机制**：`init --lang python|typescript`（默认 python）。语言相关 rules/specs 放 `lang/<语言>/`，安装时只叠加所选语言；`.preset` 标记记录语言，`update` 据此刷新。

### 变更

- **反框架立场**（P1.2）：`rules/llm.md` 重写为语言无关，顶部明确"默认裸 SDK，不引入 LangChain/LlamaIndex"，并列出仅有的例外场景（依据 Anthropic《Building Effective Agents》）。`rules/agents.md` 同步加入。
- **预设结构重构**：Python 专属的 `rules/python.md` 和 `specs/*` 移入 `lang/python/`；顶层 `rules/` 仅保留语言无关规则（llm/agents/rag/vector-db）。
- `lib/copy.js` `findSourceDir`：开发时优先仓库根目录（单一真源），不再被 `npm pack` 生成的临时副本干扰。
- `package.json`：新增 `postpack` 在打包后清理生成的副本；版本 → 3.1.0。
- 冒烟测试扩展到 48 断言，覆盖两条语言路线的隔离（本语言规则存在、他语言规则不混入）。

### 修复

- `lang/python/rules/python.md`：过时模型 ID `claude-opus-4-5` → `claude-sonnet-4-6`。

## v3.0.2（2026-06-18）

**修复分发管线的两个致命问题（P0）+ 增加 CLI 冒烟测试**

### 修复

- **P0.1 — `update` 命令会删除公共 skills/rules**：预设叠加阶段在复制前多了一次 `rm`，把刚复制的 6 个公共技能和公共规则删掉，导致用户每次 update 都丢内容。改为合并式叠加（与 init 一致）。
- **P0.2 — 配置双源漂移**：`create-claude-team/.claude/` 是仓库根目录的过期副本（停在 v3.0 之前的旧结构）却被 git 跟踪，且 `findSourceDir` 优先使用它，导致开发时 CLI 读到的是旧配置、发布出去的可能是错的。现在副本从 git 移除并加入 `.gitignore`，仅在 `prepack` 时由 `scripts/sync-config.js` 从根目录（唯一真源）重新生成。

### 新增

- **CLI 冒烟测试**（`scripts/smoke-test.js`，`npm test`）：验证 init/update × 两个预设，断言技能数量、公共内容保留、MCP 合并、`.preset` 标记、settings/workspace 不被覆盖。专门守护 P0.1 不再回归。

### 变更

- `package.json`：发布钩子 `prepublishOnly` → `prepack`（`npm pack` 也会重新生成副本，便于发布前验证）；修正 `homepage`/`bugs` URL（`claude-team-config` → `claude-code-presets`）；版本 → 3.0.2。

## v3.0.1（2026-06-18）

**ai-knowledge-base 预设大幅扩展：覆盖完整 AI 应用开发**

### 新增

- **`ai-agents` Skill**：Claude 工具调用、智能体循环（Agent Loop）、Orchestrator-Worker 多智能体、人机回路（HITL）、工具设计原则
- **`structured-output` Skill**：工具调用强制结构化、Pydantic schema、批量提取、LLM-as-Judge 评估模式
- **`rules/agents.md`**：AI Agent 开发规则（循环上限、工具设计规范、安全要求）
- **`specs/claude-api.md`**：Claude API 完整参考（模型选型、工具调用、流式、Prompt 缓存、Batch API）
- **`specs/python.md`**：Python AI 项目技术参考（目录结构、uv 工作流、asyncpg、structlog、FastAPI 模式、测试、Docker）
- **`specs/rag.md`**：RAG 高级技术参考（查询扩展、HyDE、句子窗口检索、重排序、评估数据集构建）

### 改进

- **所有 ai-knowledge-base 技能**：补全 YAML frontmatter（name + description），Claude Code 现在可以正确识别和使用
- **`rules/llm.md`**：更新模型 ID（Haiku/Sonnet/Opus 最新版本）、新增流式输出示例、补充 agents.md 引用
- **`PRESET.md`**：从单纯"RAG 知识库"扩展为完整"AI 应用开发"定位，覆盖 Agent、结构化提取、LLM 服务场景
- **`create-claude-team/.claude/CLAUDE.md`**：同步到 v3.0.0（之前停留在 v2.0.2）

### 修复

- `create-claude-team/lib/init.js`：写入 `.preset` 标记文件，`update` 命令现在能正确识别已安装的预设
- `create-claude-team/lib/update.js`：读取 `.preset` 标记，update 时同步刷新预设专用的 rules/specs/skills
- `presets/web-fullstack/preset.mcp.json`：修复 PostgreSQL MCP 包名（`@modelcontextprotocol/server-postgres`）

---

## v2.0.2（2026-06-17）

**审查体系重构 + CLI 分发工具**

### 新增
- **`create-claude-team` CLI 工具**：`npx create-claude-team init` 一行命令初始化，`npx create-claude-team update` 更新配置
- **code-review skill 增强**：每个维度加具体检查方法（怎么查）和代码示例（常见问题），聚焦单文件审查

### 重构
- **`/review-all` 命令**：从"6 维度逐文件审查"改为"跨文件审查"（变更完整性 + 跨文件一致性 + 历史回归 + 依赖关系），不再重复 code-review skill 的工作
- **Reviewer agent**：明确两层审查职责——单文件用 code-review skill（6 维度），跨文件用 /review-all（4 维度）

### 修复
- **specs/ 定位修正**：specs/ 无自动注入机制，核心内容已合并回 rules/，specs/ 改为"AI 按需读取的详细技术参考"
- **所有 agent 升级**：builder/reviewer/researcher/designer/architect-planner 加入 journal.md 引用、异常路径表、metrics 追踪
- **bash-check.sh 增强**：新增 git checkout --.、npm publish、dd/mkfs/fdisk、shutdown 等危险命令检查
- **ship.md 重写**：集成 /review-all、DevOps 参与、回滚检查、异常路径
- **删除虚构的 /review 命令引用**：dev.md、fix.md 中引用了不存在的 /review，已修正

## v2.0.1（2026-06-17）

**核心工作流重构：解决 3 个用户痛点**

痛点：需求不明确写出来不是想要的 / 写完功能不知道质量如何 / 出了问题不知道怎么修

### 新增
- **`/check` 命令**：功能级快检，3 维度（逻辑 + 类型 + 边界），1 分钟出结果，有问题自动修
- **`/fix` 命令**：定点修复，指定文件或描述问题，AI 直接修不走流程
- **`specs/` 目录**：详细技术参考（typescript.md、react.md、node.md、testing.md），按文件类型自动注入
- **`workspace/` 目录**：会话记忆（journal.md），AI 自动追加记录，新会话保持上下文连续性
- **CLAUDE.md 异常路径**：7 种场景的处理方式（Spike 不可行、用户不确认、测试失败、审查打回等）
- **CLAUDE.md 粒度速查**：/dev → /check → /fix → /review-all → /standup 五级颗粒度对齐

### 重写
- **`/dev` 命令**：新增 Phase 0 需求确认（3 个问题、最多 3 轮）、S/M/L/XL 分级流程、异常路径、自动重试逻辑（最多 2 轮）
- **`/review-all` 命令**：定义默认审查范围（当前分支 diff）、6 维度评分表、后续动作（通过→可合并；不通过→自动修→重审；2 轮后仍不通过→列出问题等用户决定）
- **`rules/` 目录**：精简为必须遵守的规则（每文件 < 20 行），详细内容移至 `specs/`
- **`devops.md` Agent**：补充完整工作流程（Phase 2/Phase 3 介入时机）、输出格式（部署报告模板）、职责清单
- **`security-check.sh`**：严重问题返回 exit 2（阻止操作），中等问题返回 exit 0（仅警告）；新增 INSERT/UPDATE/DELETE SQL 检测；不再跳过 .sh 文件；硬编码密钥检测阈值从 8+ 降至 4+ 字符

### 文档
- README.md 更新：版本号、命令数量（4→7）、目录结构（新增 specs/、workspace/）、工作流图、粒度速查表
- USAGE.md 更新：新增 /check 和 /fix 使用说明、/dev 和 /review-all 流程更新、安全 Hook 行为变更说明
- MODIFICATION-REPORT.md：完整的修改报告（痛点分析、完美流程设计、配置审计、修改清单）

## v2.0.1-docs（2026-06-12）

**文档和规范改进**

- 修复 README/USAGE 中 Agent 数量（5→6）和 Skill 数量（13→14）不一致
- 给 `ui-prototype/SKILL.md` 添加 frontmatter（name + description）
- 统一所有 Skill 描述语言为中文
- 修复 `database` Skill 的 name 字段不匹配（database-optimization → database）
- 明确 Builder Agent 中 Designer/Reviewer 在 UI 任务中的审查协作顺序
- design.md 增加优先级层级说明（preview/ > spec.md > styles/*.md > design.md）
- 统一配色规范为 60-30-10 法则，移除与具体风格冲突的硬性限制
- CLAUDE.md 任务分级增加安全敏感度升级规则
- bash-check.sh：区分 `--force` 和 `--force-with-lease`，增强 `rm -rf` 变体检测
- security-check.sh：跳过 .sh 脚本文件避免误报
- 移除 README 中不存在的 install 脚本引用
- CHANGELOG 从 USAGE.md 独立为 CHANGELOG.md
- 消除审查定义三重重复（reviewer.md、review-all.md 引用 code-review SKILL.md）
- 精简 USAGE.md：移除与 CHANGELOG 重复的 v2.0 对比表、与 BEST-PRACTICES 重复的 MCP 示例和工作流场景
- database Skill 的 Python 示例改为 TypeScript（匹配项目技术栈）
- DevOps Agent 模板代码移至 ci-cd-pipelines Skill，Agent 文件精简为角色定义
- design.md "绝对禁止" 改为 "默认禁止"，与优先级层级说明一致

## v2.0.0（2026-06-07）

**架构级重构：从线性瀑布流到并行迭代模型**

| 变化 | v1.x | v2.0 |
|------|------|------|
| 工作流 | 串行瀑布流 | 并行迭代模型 |
| 任务分级 | 一刀切全流程 | S/M/L/XL 四级按需 |
| Agent 数量 | 7 个（职责分散） | 6 个（合并精简） |
| Skill 数量 | 18 个（重叠多） | 14 个（合并精简） |
| 安全检查 | 仅 Write/Edit | + Bash 命令检查 |
| MCP 服务器 | 6 个 | 5 个（去重 Puppeteer） |
| 无障碍 | 无 | 审查维度 + 规则 |

**详细变更**：
- **工作流**：线性瀑布流 → 并行迭代模型，Review 在 Build 过程中持续进行
- **任务分级**：新增 S/M/L/XL 四级，小任务跳过文档直接写代码
- **Agent**：Planner + Architect 合并为 Architect-Planner；Security Auditor 合并入 Reviewer
- **Skill**：frontend 合并 react-patterns + nextjs-mastery；code-review 合并 security-review；testing 合并 tdd + testing-strategies；api-design 合并 authentication-patterns
- **技术栈**：新增 Hono（优先框架）、Astro、Kysely、Turborepo、Changesets、Edge Runtime
- **安全 Hook**：新增 bash-check.sh（拦截危险命令）；security-check.sh 增加注释剥离、原型链污染检测
- **无障碍**：react.md 规则增加 WCAG AA 要求；Reviewer 增加第 6 维度；/ship 增加无障碍检查
- **Docker**：修复 Dockerfile（`npm prune --omit=dev`）；docker-compose 移除 version 字段
- **CI/CD**：GitHub Actions 增加 matrix 测试、codecov、Docker layer cache
- **非功能需求**：CLAUDE.md 新增性能阈值表（LCP < 2.5s, CLS < 0.1）

## v1.1.0（2026-06-02）
- 新增 8 个 Skill：ui-design、testing-strategies、react-patterns、nextjs-mastery、authentication-patterns、typescript-advanced、ci-cd-pipelines、microservices-design
- 移除 PostToolUse 格式化提示 Hook（功能过弱，无实际价值）
- 修复安全检查 Hook 逻辑 bug（`&&` → `||`）
- 修复 PostgreSQL 连接字符串硬编码问题（改为 `${DATABASE_URL}`）
- 新增 PostgreSQL 到 CLAUDE.md MCP 工具说明
- 安装脚本和文档同步更新

## v1.0.0（2026-06-02）
- 初始版本
- 7 个 Agent
- 10 个 Skill
- 6 个 MCP 服务器
- 4 个 Slash Command
- 5 个 Rules
- 2 个 Hook
