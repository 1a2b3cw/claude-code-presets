---
name: architecture
description: Web全栈架构设计，包括技术选型、模块划分、数据流设计
---

# 架构设计技能

## 触发条件
- 新项目启动
- 重大功能需要架构设计
- 技术选型决策
- 重构现有架构

## Web 全栈架构模式

### 分层架构
```
┌─────────────────────────────────┐
│         表现层 (Presentation)    │
│    React / Next.js / API Routes │
├─────────────────────────────────┤
│         业务层 (Business)        │
│    Services / Use Cases         │
├─────────────────────────────────┤
│         数据层 (Data)            │
│    Repository / ORM / Cache     │
├─────────────────────────────────┤
│       基础设施层 (Infra)         │
│    DB / Queue / Storage / Auth  │
└─────────────────────────────────┘
```

### 模块化组织（Feature-based）
```
src/
├── features/
│   ├── auth/           # 认证模块
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts    # 公共 API
│   ├── user/           # 用户模块
│   └── order/          # 订单模块
├── shared/             # 共享代码
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types/
└── app/                # 应用入口
```

## 技术选型决策树

### 前端
- **SSR/SSG 需求**？→ Next.js 14+（App Router）
- **内容站点**？→ Astro（零 JS 默认）
- **纯 SPA**？→ Vite + React
- **轻量级**？→ Preact / Solid

### 后端
- **全栈框架**？→ Next.js API Routes / Remix
- **独立 API**？→ **Hono（优先）** / Fastify / Express
- **Edge 部署**？→ Hono（原生 Edge Runtime 支持）
- **微服务**？→ 各服务独立选型

### 数据库
- **关系型为主**？→ PostgreSQL
- **嵌入式/轻量**？→ SQLite
- **文档型**？→ MongoDB
- **缓存**？→ Redis

### ORM / 查询构建器
- **类型安全 + 迁移**？→ Prisma
- **轻量 + SQL-like**？→ Drizzle
- **类型安全 + 灵活**？→ Kysely
- **原生 SQL**？→ pg / better-sqlite3

## 设计模式

### 常用模式
- **Repository Pattern**：隔离数据访问层
- **Service Pattern**：封装业务逻辑
- **Middleware Pattern**：请求处理管道
- **Observer Pattern**：事件驱动
- **Factory Pattern**：对象创建

### 避免的模式
- 过度抽象：不需要模式时别硬套
- 单例滥用：优先依赖注入
- God Object：一个类/模块做太多事

## 输出要求
架构文档必须包含：
1. 系统概述
2. 架构图（文字或 Mermaid）
3. 技术栈及选型理由
4. 模块划分及职责
5. 数据流描述
6. 关键决策及理由
7. 风险和缓解方案
