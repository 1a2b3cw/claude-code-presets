# pgvector 向量数据库

pgvector 的 schema 设计、索引优化、查询调优。

## 使用时机

- 设计向量存储 schema
- 检索性能慢需要优化
- 实现混合检索（向量 + 全文）
- 数据量增长后需要调整索引策略

## 索引选择

```sql
-- 数据量 < 100万行：IVFFlat（内存占用小，查询快）
CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- lists ≈ sqrt(行数)，最少 100

-- 数据量 > 100万行：HNSW（更高召回率，内存大）
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 查询时调整精度（HNSW）
SET hnsw.ef_search = 100;  -- 默认 40，越大越准但越慢
```

## 混合检索实现

```sql
-- Reciprocal Rank Fusion（RRF）融合向量检索和全文检索
WITH vector_results AS (
    SELECT id, content, metadata,
           ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
    FROM chunks
    ORDER BY embedding <=> $1::vector
    LIMIT 50
),
text_results AS (
    SELECT id, content, metadata,
           ROW_NUMBER() OVER (ORDER BY ts_rank(tsv, query) DESC) AS rank
    FROM chunks, plainto_tsquery('simple', $2) AS query
    WHERE tsv @@ query
    LIMIT 50
)
SELECT
    COALESCE(v.id, t.id) AS id,
    COALESCE(v.content, t.content) AS content,
    (COALESCE(1.0 / (60 + v.rank), 0) + COALESCE(1.0 / (60 + t.rank), 0)) AS rrf_score
FROM vector_results v
FULL OUTER JOIN text_results t ON v.id = t.id
ORDER BY rrf_score DESC
LIMIT $3;
```

## 性能调优

```sql
-- 检查是否使用了索引
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM chunks ORDER BY embedding <=> '[...]'::vector LIMIT 10;

-- 查看索引大小
SELECT pg_size_pretty(pg_relation_size('chunks_embedding_idx'));

-- 定期 VACUUM 保持性能（插入大量数据后）
VACUUM ANALYZE chunks;

-- 调整 IVFFlat 的探针数（提高召回率）
SET ivfflat.probes = 10;  -- 默认 1，建议 = lists * 0.1
```

## Python 操作封装

```python
import asyncpg
import numpy as np

class PgVectorStore:
    async def similarity_search(
        self,
        embedding: list[float],
        top_k: int = 20,
        min_score: float = 0.75,
    ) -> list[dict]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, content, metadata,
                       1 - (embedding <=> $1::vector) AS score
                FROM chunks
                WHERE 1 - (embedding <=> $1::vector) > $2
                ORDER BY embedding <=> $1::vector
                LIMIT $3
                """,
                embedding, min_score, top_k,
            )
        return [dict(r) for r in rows]

    async def insert_chunks(
        self,
        chunks: list[Chunk],
        embeddings: list[list[float]],
    ) -> None:
        async with self.pool.acquire() as conn:
            await conn.executemany(
                """
                INSERT INTO chunks (document_id, chunk_index, content, embedding, metadata)
                VALUES ($1, $2, $3, $4::vector, $5)
                ON CONFLICT DO NOTHING
                """,
                [(c.document_id, c.index, c.content, e, c.metadata)
                 for c, e in zip(chunks, embeddings)],
            )
```
