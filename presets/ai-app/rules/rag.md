# RAG 管道规则

## 分块策略

### 必须做
- 根据文档类型选择分块策略：
  - 代码文件：按语法树分块（AST-based）
  - Markdown/文档：按标题层级分块
  - 普通文本：递归字符分块（chunk_size=512, overlap=50）
- 保留分块元数据：`source`, `page`, `chunk_index`, `total_chunks`
- 对重复内容做 content hash 去重（节省 30-50% 嵌入成本）
- 分块后验证：不存储空分块或纯空白分块

### 禁止做
- 固定字符数分块（忽略语义边界）
- chunk_size 超过嵌入模型最大 token 限制（text-embedding-3-small: 8191 tokens）
- 忘记保存 chunk 与源文档的映射关系

## 嵌入生成

```python
# 批量生成嵌入，降低 API 成本
async def embed_chunks(chunks: list[str], batch_size: int = 100) -> list[list[float]]:
    embeddings = []
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        result = await client.embeddings.create(input=batch, model=settings.embedding_model)
        embeddings.extend([e.embedding for e in result.data])
    return embeddings
```

## 检索策略

### 混合检索（推荐生产环境）
```sql
-- pgvector 向量检索 + 全文检索混合
SELECT id, content, metadata,
       (0.7 * (1 - (embedding <=> $1::vector)) + 0.3 * ts_rank(tsv, query)) AS score
FROM documents, plainto_tsquery('chinese', $2) AS query
ORDER BY score DESC
LIMIT $3;
```

### 检索参数
- `top_k`：初步召回 20-50 条，重排序后取 top 5
- 相似度阈值：余弦相似度 > 0.75 才纳入上下文
- 最大上下文长度：不超过 LLM 的 context window 的 60%

## 评估指标（必须持续监控）
| 指标 | 含义 | 目标 |
|------|------|------|
| Retrieval Precision | 检索到的相关文档比例 | > 0.8 |
| Answer Faithfulness | 答案是否基于检索内容 | > 0.9 |
| Answer Relevance | 答案是否回答了问题 | > 0.85 |
| Latency P95 | 端到端响应时间 | < 3s |
