---
name: architecture
description: 架构设计方法（语言无关）——分层、模块边界、依赖方向、设计模式、何时不要抽象。具体技术栈选型见所用预设的 PRESET.md/rules。
---

# 架构设计方法

> 这是**通用方法**，不绑定语言/框架。具体技术栈的选型（如 web 用 Next.js/Hono/Prisma，AI 用 FastAPI/pgvector）见所用预设的 `PRESET.md` 和 `rules/`。
> 本技能是 Architect-Planner 在做架构决策时使用的方法库。

## 何时用
- 新系统/新模块需要结构设计
- 重大功能的架构决策
- 重构现有架构
- 需要划分模块边界、定义模块间接口时

## 分层原则

```
表现层 (Presentation)   ← 入口：UI / API 路由 / CLI
   ↓ 只能向下依赖
业务层 (Business)       ← 用例、领域逻辑（不依赖框架）
   ↓
数据层 (Data)           ← 仓储、ORM、缓存
   ↓
基础设施 (Infra)        ← DB / 队列 / 存储 / 外部服务
```

- **依赖方向单向向下**，上层依赖下层，禁止循环依赖
- 业务层不应耦合具体框架（便于测试和替换）
- 跨层调用通过接口，不直接摸下层实现

## 模块化组织（按功能，不按文件类型）

```
src/
├── features/             # 按业务功能切分
│   └── [feature]/
│       ├── ...           # 该功能的组件/逻辑/数据访问/类型
│       └── index.ts      # 模块的公共 API（对外只暴露这里）
├── shared/               # 跨功能复用的通用代码
└── app/ (或 main)        # 应用入口、装配
```

- 每个模块有**明确的对外接口**（index 暴露），内部实现可自由重构
- 模块间通过公共 API 通信，不深入彼此内部
- 共享代码下沉到 shared，但警惕"什么都往 shared 塞"

## 技术选型原则（具体选型见预设）

- **选经过验证的**，不追新；团队熟悉度也是选型因素
- **按场景选**，不一刀切：先问清约束（规模、性能、部署目标、团队技能）
- **避免过度设计**：没有当前需求就不引入抽象层 / 框架 / 中间件
- 选型要能说出**理由**和**放弃的代价**（记入 ADR）

> 各预设已给出推荐栈：web-fullstack 见其 PRESET.md（React/Next.js/Hono/Prisma 等）；ai-app 见其 PRESET.md（Claude SDK/pgvector/FastAPI 或 Vercel AI SDK）。

## 设计模式（按需，不硬套）

| 模式 | 用途 |
|------|------|
| Repository | 隔离数据访问，业务层不碰具体存储 |
| Service / Use Case | 封装业务逻辑 |
| Middleware / Pipeline | 请求处理链（认证、日志、校验） |
| Factory | 复杂对象创建 |
| Observer / 事件 | 解耦的事件驱动 |

**反模式（避免）**：过度抽象、单例滥用（优先依赖注入）、God Object（一个模块做太多事）、为"将来可能"提前抽象（YAGNI）。

## 输出要求

架构决策产出 `architecture.md`（格式见 Architect-Planner agent），必须包含：
1. 系统概述 + 架构图（文字或 Mermaid）
2. 模块划分及职责、模块间接口
3. 数据流
4. 技术选型及理由（关键决策记 ADR）
5. 风险与缓解
