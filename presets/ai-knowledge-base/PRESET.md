# Preset: ai-knowledge-base

> RAG 知识库 + 向量检索 + LLM 集成

## 技术栈

### 核心
- **语言**：Python 3.11+ / TypeScript（API 层）
- **向量数据库**：pgvector（PostgreSQL 扩展，首选）/ Qdrant / Chroma
- **嵌入模型**：text-embedding-3-small（OpenAI）/ BGE-M3（本地）
- **LLM**：Claude API / OpenAI API / 本地 Ollama
- **编排框架**：LangChain / LlamaIndex（按需选择）

### 数据管道
- **解析**：pypdf / unstructured / docling（文档解析）
- **分块**：langchain text splitters / semantic chunking
- **存储**：PostgreSQL + pgvector（向量） + metadata

### 后端 API
- **框架**：FastAPI / Hono（TypeScript）
- **验证**：Pydantic（Python）/ Zod（TypeScript）
- **异步**：asyncio / httpx

### 工具链
- **包管理**：uv / pip（Python）；pnpm（Node）
- **容器**：Docker Compose（含 pgvector 镜像）
- **监控**：LangSmith / Phoenix Arize（LLM tracing）

## RAG 管道架构

```
数据摄入：
  原始文档 → 解析器 → 分块器 → 清洗器 → 嵌入器 → pgvector

查询：
  用户问题 → 嵌入 → 向量检索（pgvector） → 重排序 → LLM 生成 → 答案
```

## 文件组织

```
src/
├── ingestion/          # 数据摄入管道
│   ├── parsers/       # 文档解析
│   ├── chunkers/      # 分块策略
│   └── embedders/     # 嵌入生成
├── retrieval/          # 检索层
│   ├── vector_store/  # pgvector 操作
│   ├── reranker/      # 重排序
│   └── hybrid/        # 混合检索
├── generation/         # 生成层
│   ├── prompts/       # Prompt 模板
│   └── chains/        # LLM 调用链
├── api/                # API 端点
└── evaluation/         # 评估框架
```

## 规则文件
- `rules/python.md` — Python AI 项目规范
- `rules/rag.md` — RAG 管道规则
- `rules/vector-db.md` — pgvector 使用规则
- `rules/llm.md` — LLM 集成规则

## 包含的 Skills
rag-pipeline, embedding, vector-db, prompt-engineering, llm-evaluation, data-pipeline

## MCP 服务器
- **pgvector**：语义搜索和向量存储（需配置 DATABASE_URL）
- **context7**：查询 LangChain/LlamaIndex 等库的最新文档
