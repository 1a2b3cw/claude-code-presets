---
name: embedding
description: 嵌入模型选型与优化——API vs 本地模型、批量嵌入、Redis 缓存、中文优化
---

# 嵌入模型选型与优化

选择合适的嵌入模型，优化嵌入成本和质量。

## 使用时机

- 选择嵌入模型（API vs 本地）
- 批量嵌入大量文档
- 嵌入成本过高需要优化
- 需要支持中文或多语言

## 模型选型

| 模型 | 维度 | 上下文 | 场景 | 成本 |
|------|------|--------|------|------|
| text-embedding-3-small | 1536 | 8191 tokens | 通用，推荐首选 | 低 |
| text-embedding-3-large | 3072 | 8191 tokens | 高精度场景 | 高 |
| BGE-M3（本地）| 1024 | 8192 tokens | 中英文，无成本 | 0（本地算力） |
| nomic-embed-text（Ollama）| 768 | 8192 tokens | 离线场景 | 0 |

**默认选择**：`text-embedding-3-small`（性价比最高）

中文内容较多时：优先考虑 BGE-M3（BAAI 出品，专门优化中文）

## 批量嵌入（降低成本）

```python
import asyncio
from openai import AsyncOpenAI

class OpenAIEmbedder:
    def __init__(self, model: str = "text-embedding-3-small") -> None:
        self._client = AsyncOpenAI()
        self.model = model
        self.BATCH_SIZE = 100  # OpenAI 限制单次最多 2048 个文本

    async def embed(self, texts: list[str]) -> list[list[float]]:
        # 过滤空文本
        texts = [t[:8000] for t in texts if t.strip()]

        # 并行批次请求
        batches = [texts[i:i+self.BATCH_SIZE] for i in range(0, len(texts), self.BATCH_SIZE)]
        results = await asyncio.gather(*[self._embed_batch(b) for b in batches])
        return [emb for batch in results for emb in batch]

    async def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        response = await self._client.embeddings.create(
            input=texts,
            model=self.model,
        )
        return [e.embedding for e in response.data]

    async def embed_one(self, text: str) -> list[float]:
        result = await self.embed([text])
        return result[0]
```

## 成本优化

```python
import hashlib
import json

class CachedEmbedder:
    """Redis 缓存嵌入，相同文本不重复请求"""

    async def embed(self, texts: list[str]) -> list[list[float]]:
        results = []
        to_embed = []
        cache_keys = []

        for text in texts:
            key = f"emb:{hashlib.md5(text.encode()).hexdigest()}"
            cached = await self.redis.get(key)
            if cached:
                results.append((len(results), json.loads(cached)))
            else:
                to_embed.append(text)
                cache_keys.append((len(results) + len(to_embed) - 1, key))
                results.append(None)

        if to_embed:
            new_embeddings = await self.embedder.embed(to_embed)
            for (idx, key), emb in zip(cache_keys, new_embeddings):
                results[idx] = emb
                await self.redis.setex(key, 86400 * 7, json.dumps(emb))  # 7天缓存

        return results
```

## 本地嵌入（BGE-M3 via Ollama）

```python
import httpx

class OllamaEmbedder:
    def __init__(self, model: str = "bge-m3", base_url: str = "http://localhost:11434") -> None:
        self.model = model
        self.base_url = base_url

    async def embed(self, texts: list[str]) -> list[list[float]]:
        async with httpx.AsyncClient(timeout=30) as client:
            tasks = [
                client.post(f"{self.base_url}/api/embeddings",
                           json={"model": self.model, "prompt": t})
                for t in texts
            ]
            responses = await asyncio.gather(*tasks)
        return [r.json()["embedding"] for r in responses]
```
