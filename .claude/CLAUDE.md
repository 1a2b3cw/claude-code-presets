# AI 全栈开发团队

> v2.0.2 | 2026-06-17

## 核心原则

1. **先思考再编码**：理解需求，明确假设，有疑问先问
2. **简洁优先**：不做过度设计，不写用不到的功能，不处理不可能的场景
3. **精准修改**：只改该改的，不顺手"优化"无关代码，匹配现有风格
4. **目标驱动**：把任务变成可验证的目标，测试先行
5. **反馈尽早**：安全、性能、可维护性在开发中持续检查，不等到最后

## 工作流程：并行迭代模型

### 任务分级

根据复杂度决定流程，不做一刀切：

| 级别 | 定义 | 参与角色 | 文档产出 | 示例 |
|------|------|----------|----------|------|
| **S（热修）** | 1 行 ~ 10 行修复 | Builder 直接修 | 无 | 修 typo、改配置值 |
| **M（小功能）** | 单模块、1-2 文件 | Builder + Reviewer | tasks.md | 加一个 API 端点、加一个表单字段 |
| **L（中功能）** | 跨模块、3-10 文件 | Architect + Builder + Reviewer | spec.md + tasks.md | 用户认证、文件上传 |
| **XL（大功能）** | 新系统、10+ 文件 | 全员参与 | spec.md + architecture.md | 新建支付系统、重构架构 |

> **安全敏感度升级**：涉及认证、授权、加密、密钥管理、支付、权限控制的改动，即使代码量小，也至少升级为 M 级（需 Reviewer 审查）。安全敏感的 S 级改动不存在。

### 流程图

```
S 级：Build → Test → Ship
M 级：Plan(简) → Build+Review(内联) → Ship
L/XL 级：

  ┌─────────────────────────────────────────────────┐
  │           Phase 0: Spike（探针）                 │
  │   Researcher + Architect 并行调研                  │
  │   产出：可行性结论 + 技术方案（可选）               │
  └──────────┬──────────────────────────────────────┘
             ↓
  ┌─────────────────────────────────────────────────┐
  │           Phase 1: Plan                          │
  │   Architect-Planner 输出 spec.md + tasks.md       │
  │   Designer 确定设计方向（涉及 UI 时）               │
  │   用户确认后进入迭代                               │
  └──────────┬──────────────────────────────────────┘
             ↓
  ┌─────────────────────────────────────────────────┐
  │    Phase 2: Iteration（每个迭代 1-3 个任务）       │
  │                                                  │
  │   ┌───────┐  ┌───────┐  ┌────────────────────┐  │
  │   │ Plan  │→ │ Build │→ │ Continuous Review   │  │
  │   │(选任务)│  │(TDD)  │  │(质量+安全+性能并行) │  │
  │   └───────┘  └───────┘  └────────────────────┘  │
  │        ↑                           │             │
  │        └───────────────────────────┘             │
  │              反馈在迭代内闭环                      │
  └──────────┬──────────────────────────────────────┘
             ↓
  ┌─────────────────────────────────────────────────┐
  │           Phase 3: Ship                          │
  │   集成验证 → 发布检查 → 部署                       │
  └─────────────────────────────────────────────────┘
```

### 关键改变

- **Review 不是独立阶段**，而是在 Build 过程中持续进行
- **安全检查贯穿全程**，不等到最后
- **小任务跳过文档**，直接写代码
- **迭代可中断**：发现方向错了，随时回退调整

### 异常路径

| 场景 | 处理方式 |
|------|----------|
| Spike 发现不可行 | 告诉用户原因 + 替代方案，不继续投入 |
| 用户不确认 spec | 根据反馈调整，最多 3 轮；3 轮后仍不确认，暂停等用户补充 |
| 测试一直失败 | 自动修 → 重试，最多 2 轮；2 轮后仍失败，列出原因等用户决定 |
| 审查打回 | 自动修 → 重审，最多 2 轮；2 轮后仍不通过，列出问题等用户决定 |
| 发现方向错了 | 停止当前迭代，告诉用户当前状态 + 建议的回退点，用户决定是否回退 |
| 需求中途变了 | 停止当前迭代，重新评估影响范围，调整 tasks.md |
| 用户否决方案 | 根据反馈调整 → 重新输出方案，最多 3 轮 |

### 粒度速查

| 你说的话 | 用什么 | AI 行为 |
|----------|--------|---------|
| `/dev 做一个用户登录` | /dev | 走完全流程，你只管确认 |
| `/check` | /check | 快检当前代码，1 分钟出结果 |
| `/fix 这个函数返回值类型不对` | /fix | 直接改这一处，不走流程 |
| `/review-all src/auth/` | /review-all | 跨文件审查（变更完整性+一致性+历史回归+依赖关系），自动修 |
| `/standup` | /standup | 告诉你做到哪了 |

## UI 设计要求

所有涉及前端 UI 的任务，必须遵循 `.claude/rules/design.md` 中的设计规范。

- 项目 spec.md 中必须声明设计方向（风格、色调、目标用户）
- Builder 实现 UI 后自行做设计自检
- L/XL 级任务由 Designer Agent 审查视觉效果
- 没有明确设计方向时，默认使用白底简约风格

### `preview/` 目录 — 设计权威来源

如果项目根目录存在 `preview/` 目录且包含内容，**Builder 在编写任何 UI 代码前必须先阅读其中的文件**。`preview/` 是设计的唯一权威来源，优先级高于 spec.md 中的文字描述。

`preview/` 可以包含：
- 静态 HTML 原型（最推荐，Builder 可直接参考结构和样式）
- Figma 设计稿链接（存为 `preview/FIGMA.md`，记录 URL 和关键页面 node-id）
- 设计截图（PNG/JPG，Builder 需视觉还原）
- 设计系统文档（颜色、间距、组件规范）

Builder 工作流：
1. 检查 `preview/` 是否存在且非空
2. 如果存在：按 `preview/` 中的设计实现，spec.md 中的描述仅作补充
3. 如果不存在：按 spec.md 中的设计方向实现，或询问 Designer

## 技术栈规范

### 前端
- **语言**：TypeScript（严格模式）
- **框架**：React 18+ / Next.js 14+ / Astro（内容站点）
- **状态管理**：Zustand / React Context（按需选择）
- **样式**：Tailwind CSS / CSS Modules
- **测试**：Vitest + React Testing Library + Playwright

### 后端
- **运行时**：Node.js 20+ / Bun
- **框架**：Hono（优先）/ Fastify / Express
- **ORM**：Prisma / Drizzle / Kysely（按需选择）
- **数据库**：SQLite（开发）/ PostgreSQL（生产）
- **验证**：Zod / TypeBox
- **部署**：Edge Runtime / Serverless / Container（按场景选择）

### 工具链
- **包管理**：pnpm（优先）/ bun
- **格式化**：Prettier
- **检查**：ESLint（含 security plugin）
- **构建**：Vite / tsup
- **容器**：Docker / Docker Compose
- **Monorepo**：Turborepo / Nx（多包项目）
- **发布**：Changesets / semantic-release

## 代码规范

### 命名
- 变量/函数：camelCase
- 类/接口/类型：PascalCase
- 常量：UPPER_SNAKE_CASE
- 文件名：kebab-case（组件用 PascalCase）
- 数据库表/列：snake_case

### 函数
- 单一职责，一个函数做一件事
- 参数不超过 3 个，多了用对象
- 优先纯函数，减少副作用
- 错误处理在边界层，内部函数抛异常

### 文件组织
```
src/
├── features/          # 按功能模块组织
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── index.ts
├── shared/            # 共享代码
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types/
├── app/               # 应用入口和路由
└── server/            # 后端代码
    ├── routes/
    ├── services/
    ├── middleware/
    └── db/
```

## 测试要求

- **单元测试**：工具函数、业务逻辑必须有测试
- **集成测试**：API 端点、数据库操作需要测试
- **E2E 测试**：核心用户流程用 Playwright 测试
- **无障碍测试**：关键页面需通过 axe-core 检查
- **测试命名**：`describe('功能') > it('应该做什么')`
- **测试位置**：与源文件同目录，命名为 `*.test.ts`

## 非功能需求清单

在 spec 阶段必须确认以下指标（按项目需要选择）：

| 维度 | 指标 | 默认阈值 |
|------|------|----------|
| **性能** | LCP | < 2.5s |
| **性能** | CLS | < 0.1 |
| **性能** | API 响应时间 | P95 < 200ms |
| **安全** | npm audit | 无 high/critical |
| **无障碍** | WCAG 等级 | AA |
| **可用性** | 错误率 | < 0.1% |

## 安全要求

安全检查由 hooks 自动执行（`security-check.sh` + `bash-check.sh`），覆盖以下类别：
- 代码注入（eval、new Function、os.system、child_process.exec）
- XSS（innerHTML、dangerouslySetInnerHTML）
- 数据安全（SQL 拼接、硬编码密钥、原型链污染）
- 命令注入（危险 Bash 命令、force push、递归删除）

具体规则见 `rules/node.md` 和 `rules/typescript.md`。hooks 检测到严重问题会自动阻止操作。

## 角色分工

| 角色 | 职责 | 何时参与 |
|------|------|----------|
| **Architect-Planner** | 需求分析、任务拆解、架构设计、技术选型 | L/XL 级任务 |
| **Builder** | 编码实现、单元测试、重构 | 所有任务 |
| **Designer** | UI 设计方向、视觉审查、设计系统维护 | 涉及 UI 的 L/XL 级任务 |
| **Reviewer** | 两层审查：code-review skill 单文件审查（6 维度）+ /review-all 跨文件审查（4 维度） | M 及以上任务 |
| **Researcher** | 技术调研、方案对比、代码探索 | 按需调用 |
| **DevOps** | CI/CD、部署、容器化、监控 | L/XL 级任务、发布阶段 |

## 交互规范

- 所有沟通使用中文
- 代码注释使用英文
- Git commit message 使用英文
- 技术术语可保留英文原文

## MCP 工具使用

- **GitHub MCP**：管理仓库、PR、Issue
- **Playwright MCP**：浏览器自动化测试和截图
- **Context7 MCP**：查询最新库文档
- **SQLite MCP**：本地开发数据库
- **PostgreSQL MCP**：生产级数据库操作和查询

## 项目状态追踪

使用 TaskCreate/TaskUpdate 追踪任务进度：
- 每个任务有明确的 subject 和 description
- 任务完成后立即标记 completed
- 阻塞时创建新的阻塞任务
- 使用 TaskList 定期检查整体进度

## 文档策略

| 任务级别 | 必须产出 | 说明 |
|----------|----------|------|
| S | 无 | 代码即文档 |
| M | tasks.md（轻量 checklist） | 内联到 PR 描述 |
| L | spec.md + tasks.md | spec 保持精简 |
| XL | spec.md + architecture.md + ADR | ADR 记录关键决策 |

## 规范注入机制

- **rules/**：始终加载的必须遵守规则（含关键模式和示例）
- **specs/**：详细技术参考，AI 在需要深入参考时主动读取（编辑复杂功能、不确定用法时）
- **workspace/journal.md**：会话记忆，AI 自动追加记录，新会话开始时读取以保持上下文连续性
- **workspace/metrics.md**：效能指标，/dev 完成后自动追加，/standup 时读取分析
