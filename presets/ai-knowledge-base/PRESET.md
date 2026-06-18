# Preset: ai-knowledge-base

> AI 应用开发——RAG 知识库、AI Agent、结构化提取、LLM 集成

## 适用场景

- **RAG 知识库**：从文档中检索并生成答案
- **AI Agent**：工具调用、多步推理、Orchestrator-Worker 协调
- **结构化提取**：从非结构化文本提取实体、关系、摘要
- **LLM 服务**：基于 Claude/OpenAI 的 API 后端服务

## 技术栈

### 核心
- **语言**：Python 3.11+（主力）/ TypeScript（API 层可选）
- **LLM**：Claude API（首选） / OpenAI API / 本地 Ollama
- **向量数据库**：pgvector（PostgreSQL 扩展，首选）/ Qdrant / Chroma
- **嵌入模型**：text-embedding-3-small（OpenAI）/ BGE-M3（本地，中文优先）
- **编排框架**：原生 asyncio（首选）/ LangChain / LlamaIndex（按需）

### 数据管道
- **解析**：pypdf / unstructured / docling
- **分块**：langchain text splitters / semantic chunking / 句子窗口
- **存储**：PostgreSQL + pgvector（向量 + 元数据）

### 后端 API
- **框架**：FastAPI（异步，Pydantic 集成好）/ Hono（TypeScript 层）
- **验证**：Pydantic v2（Python）/ Zod（TypeScript）
- **异步**：asyncio / httpx / asyncpg

### 工具链
- **包管理**：uv（Python）；pnpm（Node）
- **容器**：Docker Compose（含 pgvector 镜像）
- **可观测性**：LangSmith / Phoenix Arize（LLM tracing）
- **测试**：pytest + pytest-asyncio + pytest-mock

## 系统架构

```
[RAG 管道]
数据摄入：文档 → 解析 → 分块 → 嵌入 → pgvector
查  询：问题 → 嵌入 → 向量检索 → 重排序 → LLM 生成 → 答案

[AI Agent]
用户任务 → LLM 规划 → 工具调用循环 → 结果聚合 → 最终答案
                ↑____________工具结果____________|
```

## 文件组织

```
src/
├── ingestion/          # 数据摄入管道
│   ├── parsers/       # 文档解析（PDF/MD/HTML/代码）
│   ├── chunkers/      # 分块策略
│   └── embedders/     # 嵌入生成（API + 本地）
├── retrieval/          # 检索层
│   ├── vector_store/  # pgvector 操作
│   ├── reranker/      # 重排序（Cross-Encoder / Cohere）
│   └── hybrid/        # 混合检索（向量 + 全文）
├── generation/         # 生成层
│   ├── llm_client.py  # 统一 LLM 客户端
│   ├── prompts/       # Prompt 模板（版本化）
│   └── chains/        # 生成链
├── agents/             # AI Agent（如果有）
│   ├── tools/         # 工具定义和执行
│   ├── orchestrator/  # 多智能体协调
│   └── loops/         # 智能体循环
├── api/                # FastAPI 端点
│   ├── routes/
│   └── middleware/
└── evaluation/         # 评估框架
    ├── dataset/
    └── runner/
```

## 规则文件
- `rules/python.md` — Python AI 项目规范（类型、异步、日志）
- `rules/llm.md` — LLM 集成规则（模型选型、Prompt 规范、安全）
- `rules/agents.md` — AI Agent 开发规则（循环限制、工具设计、安全）
- `rules/rag.md` — RAG 管道规则（分块、检索、评估指标）
- `rules/vector-db.md` — pgvector 使用规则（Schema、索引、查询）

## 包含的 Skills
- `rag-pipeline` — RAG 完整管道设计与实现
- `ai-agents` — Claude 工具调用、智能体循环、多智能体协调
- `structured-output` — 可靠结构化 JSON 输出
- `embedding` — 嵌入模型选型与批量优化
- `vector-db` — pgvector 索引与混合检索
- `prompt-engineering` — Prompt 设计、优化、版本化
- `llm-evaluation` — RAG 评估框架与 CI 集成
- `data-pipeline` — 文档解析、分块、批量摄入

## Specs（按需读取）
- `specs/claude-api.md` — Claude API 完整参考（模型、工具、流式、缓存、Batch）
- `specs/python.md` — Python AI 项目结构、测试、部署参考
- `specs/rag.md` — 进阶 RAG 技术（查询扩展、HyDE、重排序、评估）

## MCP 服务器
- **pgvector**：向量数据库操作（需配置 DATABASE_URL）
- **context7**（底座）：查询 LangChain/FastAPI/anthropic-sdk 最新文档
- **github**（底座）：管理仓库、PR、Issue
- **playwright**（底座）：E2E 测试和截图
