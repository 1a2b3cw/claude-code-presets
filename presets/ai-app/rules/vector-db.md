# pgvector 规则

## Schema 设计

```sql
-- 启用扩展
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- 全文检索

-- 文档表
CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source      TEXT NOT NULL,           -- 文件路径或 URL
    title       TEXT,
    content     TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',
    content_hash TEXT GENERATED ALWAYS AS (md5(content)) STORED,  -- 去重
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 分块表（向量存储在这里）
CREATE TABLE chunks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content     TEXT NOT NULL,
    embedding   vector(1536),            -- text-embedding-3-small 维度
    metadata    JSONB DEFAULT '{}',
    tsv         TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED
);

-- 索引（必须建，否则向量检索很慢）
CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON chunks USING GIN (tsv);
CREATE INDEX ON chunks (document_id);
CREATE UNIQUE INDEX ON documents (content_hash);  -- 防重复摄入
```

## 必须做
- **建 IVFFlat 或 HNSW 索引**后才能上生产（否则全表扫描）
  - 数据量 < 100万：IVFFlat，`lists = sqrt(row_count)`
  - 数据量 > 100万：HNSW，`m=16, ef_construction=64`
- 向量维度与嵌入模型保持一致（text-embedding-3-small=1536，large=3072）
- 用 `<=>` 余弦距离（不是 `<->` 欧氏距离）做语义检索
- 批量插入用 `COPY` 或 `executemany`，不要逐条 INSERT

## 禁止做
- 在未建索引的表上做向量查询（冷启动前先建索引）
- 存储 NULL embedding（未嵌入的分块不应入库）
- 直接暴露 embedding 列到 API 响应（体积大，无意义）

## 常用查询

```sql
-- Top-K 向量检索
SELECT c.id, c.content, c.metadata, d.source,
       1 - (c.embedding <=> $1::vector) AS similarity
FROM chunks c
JOIN documents d ON c.document_id = d.id
WHERE 1 - (c.embedding <=> $1::vector) > 0.75
ORDER BY c.embedding <=> $1::vector
LIMIT 20;

-- 检查索引使用情况
EXPLAIN ANALYZE SELECT ... FROM chunks ORDER BY embedding <=> $1 LIMIT 20;
```

## Docker 开发环境

```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: knowledge_base
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
```
