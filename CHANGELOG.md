# 更新日志

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
