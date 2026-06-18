# Python 规则（AI 项目）

## 必须做
- Python 3.11+，使用 `uv` 管理依赖和虚拟环境
- 类型注解：所有函数参数和返回值必须有类型
- 数据模型用 Pydantic v2（`BaseModel`），不用 dataclass
- 异步优先：IO 密集型操作用 `async/await`（httpx、asyncpg）
- 环境变量用 `pydantic-settings` 验证，不直接读 `os.environ`
- 结构化日志：用 `structlog` 输出 JSON

## 禁止做
- `subprocess.run(shell=True)`（命令注入风险，用参数列表）
- 裸 `except:` 或 `except Exception: pass`（必须处理或重新抛出）
- 同步 HTTP 请求在异步函数内（用 `httpx.AsyncClient`）
- 硬编码 API Key、密钥或 URL

## 环境变量验证
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    openai_api_key: str
    anthropic_api_key: str
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "claude-opus-4-5"

    class Config:
        env_file = ".env"

settings = Settings()
```

## 错误处理
```python
class KnowledgeBaseError(Exception):
    def __init__(self, message: str, code: str) -> None:
        super().__init__(message)
        self.code = code

class EmbeddingError(KnowledgeBaseError): ...
class RetrievalError(KnowledgeBaseError): ...
```

## 命名规范
| 类型 | 规范 | 示例 |
|------|------|------|
| 模块/变量/函数 | snake_case | `get_embedding`, `chunk_size` |
| 类 | PascalCase | `VectorStore`, `RAGPipeline` |
| 常量 | UPPER_SNAKE_CASE | `MAX_TOKENS`, `DEFAULT_CHUNK_SIZE` |
| 私有方法 | `_` 前缀 | `_preprocess_text` |
