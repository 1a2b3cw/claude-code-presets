# Python AI 项目技术参考

> AI 按需读取。需要了解 Python AI 项目结构、测试模式、部署配置时阅读。

## 推荐项目结构

```
src/
├── api/                    # FastAPI 路由层
│   ├── routes/
│   │   ├── chat.py        # 问答接口
│   │   ├── documents.py   # 文档管理
│   │   └── health.py      # 健康检查
│   ├── middleware.py       # 认证、日志、限流
│   └── deps.py            # 依赖注入
├── core/
│   ├── config.py          # pydantic-settings 配置
│   ├── database.py        # asyncpg 连接池
│   └── logging.py         # structlog 配置
├── ingestion/             # 数据摄入
│   ├── parsers.py
│   ├── chunkers.py
│   └── embedders.py
├── retrieval/             # 检索层
│   ├── vector_store.py
│   ├── hybrid_search.py
│   └── reranker.py
├── generation/            # 生成层
│   ├── llm_client.py
│   ├── prompts.py
│   └── chains.py
├── agents/                # Agent 实现（如果有）
│   ├── orchestrator.py
│   └── tools.py
└── evaluation/            # 评估框架
    ├── dataset.py
    └── runner.py

tests/
├── unit/                  # 纯逻辑，无 IO
├── integration/           # 需要数据库/外部服务
└── evaluation/            # RAG 质量评估

scripts/
├── ingest.py             # 批量摄入脚本
└── evaluate.py           # 评估执行脚本
```

## 依赖管理（uv）

```bash
# 初始化项目
uv init my-ai-app
cd my-ai-app

# 添加依赖
uv add anthropic fastapi "uvicorn[standard]" asyncpg pydantic-settings structlog tenacity

# 添加开发依赖
uv add --dev pytest pytest-asyncio pytest-mock httpx

# 同步虚拟环境
uv sync

# 运行
uv run python scripts/ingest.py
uv run pytest
```

## 配置（pydantic-settings）

```python
# core/config.py
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # LLM
    anthropic_api_key: str
    llm_model: str = "claude-sonnet-4-6"
    embedding_model: str = "text-embedding-3-small"
    openai_api_key: str = ""

    # Database
    database_url: str  # postgresql://user:pass@host:5432/db

    # App
    app_env: str = "development"
    log_level: str = "INFO"
    max_concurrent_requests: int = 10

    @field_validator("database_url")
    @classmethod
    def validate_db_url(cls, v: str) -> str:
        if not v.startswith("postgresql"):
            raise ValueError("DATABASE_URL 必须是 PostgreSQL 连接字符串")
        return v

settings = Settings()  # 模块级单例
```

## 数据库连接池（asyncpg）

```python
# core/database.py
import asyncpg
from contextlib import asynccontextmanager

_pool: asyncpg.Pool | None = None

async def init_pool(database_url: str, min_size: int = 5, max_size: int = 20) -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        database_url,
        min_size=min_size,
        max_size=max_size,
        command_timeout=60,
        statement_cache_size=0,  # pgvector 兼容性
    )

async def close_pool() -> None:
    if _pool:
        await _pool.close()

@asynccontextmanager
async def get_conn():
    async with _pool.acquire() as conn:
        yield conn

# FastAPI lifespan
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool(settings.database_url)
    yield
    await close_pool()

app = FastAPI(lifespan=lifespan)
```

## 结构化日志（structlog）

```python
# core/logging.py
import structlog

def setup_logging(level: str = "INFO") -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),  # 生产环境 JSON
        ],
        logger_factory=structlog.PrintLoggerFactory(),
    )

logger = structlog.get_logger()

# 使用
logger.info("document_ingested", doc_id=doc.id, chunks=len(chunks), source=doc.source)
logger.error("embedding_failed", error=str(e), text_length=len(text))

# 请求级别上下文（自动注入到所有日志）
structlog.contextvars.bind_contextvars(request_id=request_id, user_id=user_id)
```

## FastAPI 路由模式

```python
# api/routes/chat.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None
    top_k: int = 5

class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    latency_ms: int

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    import time
    start = time.perf_counter()

    try:
        chunks = await retrieval.search(request.question, top_k=request.top_k)
        answer = await generation.answer(request.question, chunks)
        latency = int((time.perf_counter() - start) * 1000)

        logger.info("chat_completed", latency_ms=latency, chunks_used=len(chunks))
        return ChatResponse(
            answer=answer,
            sources=list({c.source for c in chunks}),
            latency_ms=latency,
        )
    except Exception as e:
        logger.error("chat_failed", error=str(e))
        raise HTTPException(status_code=500, detail="内部错误，请稍后重试")
```

## 测试 AI 代码

```python
# tests/unit/test_chunkers.py — 纯逻辑测试，无需 Mock LLM
def test_recursive_chunker_basic():
    chunker = RecursiveChunker(chunk_size=100, overlap=10)
    chunks = chunker.split("a" * 250, metadata={"source": "test"})
    assert len(chunks) > 1
    assert all(len(c.content) <= 100 for c in chunks)
    assert all(c.content_hash for c in chunks)

def test_chunker_deduplication():
    chunker = RecursiveChunker(chunk_size=200)
    text = "重复内容 " * 10
    chunks = chunker.split(text, metadata={})
    hashes = [c.content_hash for c in chunks]
    assert len(hashes) == len(set(hashes)), "分块内不应有重复内容"


# tests/unit/test_llm_client.py — Mock LLM 调用
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_generate_retries_on_rate_limit():
    with patch("anthropic.AsyncAnthropic") as mock_client:
        mock_client.return_value.messages.create = AsyncMock(
            side_effect=[RateLimitError("429"), mock_success_response()]
        )
        result = await llm_client.generate("test")
        assert result == "mock answer"
        assert mock_client.return_value.messages.create.call_count == 2


# tests/integration/test_vector_store.py — 需要真实 PostgreSQL
@pytest.mark.asyncio
@pytest.mark.integration  # 用 marker 区分，CI 中单独运行
async def test_similarity_search(db_pool):
    store = PgVectorStore(db_pool)
    embedding = [0.1] * 1536  # fake embedding
    results = await store.similarity_search(embedding, top_k=5)
    assert isinstance(results, list)
```

## Docker 部署

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装 uv
RUN pip install uv

# 先复制依赖文件（利用 Docker 层缓存）
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# 复制源码
COPY src/ src/

# 非 root 用户运行
RUN useradd -m appuser && chown -R appuser /app
USER appuser

CMD ["uv", "run", "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/knowledge_base
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: knowledge_base
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d  # 自动执行初始化 SQL

volumes:
  pgdata:
```
