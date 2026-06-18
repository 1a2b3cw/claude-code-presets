# RAG Pipeline 设计

设计和实现完整的 RAG（Retrieval-Augmented Generation）管道。

## 使用时机

当你需要：
- 从零设计一个知识库问答系统
- 诊断 RAG 检索质量差（答案不准、幻觉多）
- 评估和选择嵌入模型或向量数据库
- 优化分块策略

## 管道架构

```
[数据摄入]
原始文档（PDF/MD/HTML/Code）
  → 解析器（提取纯文本 + 结构）
  → 分块器（语义边界分割）
  → 清洗器（去噪、去重）
  → 嵌入器（生成向量）
  → pgvector（存储向量 + 元数据）

[查询]
用户问题
  → 问题嵌入
  → 向量检索（pgvector top-K）
  → [可选] 全文检索融合（RRF）
  → [可选] 重排序（Cross-Encoder）
  → 上下文组装
  → LLM 生成答案
```

## 实现步骤

### 1. 数据摄入

```python
from pathlib import Path
from ingestion.parsers import DocumentParser
from ingestion.chunkers import RecursiveChunker
from ingestion.embedders import OpenAIEmbedder
from retrieval.vector_store import PgVectorStore

async def ingest_document(file_path: Path, store: PgVectorStore) -> int:
    # Parse
    parser = DocumentParser.for_file(file_path)
    text, metadata = await parser.parse(file_path)

    # Chunk
    chunker = RecursiveChunker(chunk_size=512, overlap=50)
    chunks = chunker.split(text, metadata)

    # Dedup
    chunks = [c for c in chunks if not await store.exists(c.content_hash)]

    # Embed + Store
    embedder = OpenAIEmbedder()
    embeddings = await embedder.embed([c.content for c in chunks])
    await store.insert_chunks(chunks, embeddings)

    return len(chunks)
```

### 2. 查询检索

```python
async def retrieve(question: str, top_k: int = 20) -> list[Chunk]:
    # Embed question
    q_embedding = await embedder.embed_one(question)

    # Vector search
    candidates = await store.similarity_search(q_embedding, top_k=top_k)

    # Rerank (optional but recommended)
    if len(candidates) > 5:
        candidates = await reranker.rerank(question, candidates, top_n=5)

    return candidates
```

### 3. 答案生成

```python
async def answer(question: str) -> str:
    chunks = await retrieve(question)

    if not chunks:
        return "抱歉，知识库中没有找到相关内容。"

    context = "\n\n---\n\n".join(c.content for c in chunks)
    prompt = RAG_ANSWER_TEMPLATE.format(context=context, question=question)

    return await llm.generate(prompt, system=RAG_ANSWER_SYSTEM)
```

## 常见问题诊断

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 答案不相关 | 分块太大或太小 | 调整 chunk_size，试 256/512/1024 |
| 幻觉多 | Prompt 没有严格限制 | 加强 system prompt 中的约束 |
| 检索慢 | 没建向量索引 | `CREATE INDEX ... USING ivfflat` |
| 召回差 | 只用向量检索 | 加全文检索融合（混合检索）|
| 成本高 | 逐条嵌入 | 批量嵌入，batch_size=100 |

## 评估

每次改动后运行评估套件（见 llm-evaluation skill）。
不要只凭主观感觉判断效果，必须有指标。
