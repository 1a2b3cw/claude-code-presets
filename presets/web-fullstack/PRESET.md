# Preset: web-fullstack

> TypeScript + React + Node.js 全栈 Web 开发

## 技术栈

### 前端
- **语言**：TypeScript（严格模式）
- **框架**：React 18+ / Next.js 14+ / Astro（内容站点）
- **状态管理**：Zustand / React Context
- **样式**：Tailwind CSS / CSS Modules
- **测试**：Vitest + React Testing Library + Playwright

### 后端
- **运行时**：Node.js 20+ / Bun
- **框架**：Hono（优先）/ Fastify / Express
- **ORM**：Prisma / Drizzle / Kysely
- **数据库**：SQLite（开发）/ PostgreSQL（生产）
- **验证**：Zod / TypeBox

### 工具链
- **包管理**：pnpm（优先）/ bun
- **格式化**：Prettier
- **检查**：ESLint（含 security plugin）
- **构建**：Vite / tsup
- **容器**：Docker / Docker Compose
- **Monorepo**：Turborepo / Nx
- **发布**：Changesets / semantic-release

## 文件组织

```
src/
├── features/
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── index.ts
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types/
├── app/
└── server/
    ├── routes/
    ├── services/
    ├── middleware/
    └── db/
```

## 规则文件
- `rules/typescript.md` — TypeScript 规则
- `rules/react.md` — React 规则
- `rules/node.md` — Node.js 规则
- `rules/testing.md` — 测试规则

## 包含的 Skills
frontend, api-design, typescript-advanced, database, ci-cd-pipelines, microservices-design, ui-design

## MCP 服务器
- **SQLite**：本地开发数据库
- **PostgreSQL**：生产数据库（需配置 DATABASE_URL）
