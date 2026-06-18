# RAG 高级技术参考

> AI 按需读取。需要了解进阶 RAG 技术（查询改写、HyDE、重排序、评估）时阅读。

## 为什么基础 RAG 经常失败

| 失败原因 | 现象 | 解决方案 |
|----------|------|----------|
| 用户问题措辞与文档不匹配 | 召回率低，明明有答案找不到 | 查询扩展、HyDE |
| 分块切断了语义完整性 | 答案在两个相邻分块之间 | 句子窗口检索、父文档检索 |
| 向量检索无法处理精确匹配 | 数字、代码、专有名词检索差 | 混合检索（向量 + 全文）|
| Top-K 排名不准 | 相关文档排在后面被截断 | 重排序（Cross-Encoder）|
| 上下文太长导致 LLM 遗忘 | 答案在上下文中但 LLM 没用上 | Map-Reduce，分段摘要 |

## 进阶检索技术

### 查询扩展（Query Expansion）

```python
async def expand_query(question: str) -> list[str]:
    """生成同一问题的多个等价表达，提升召回率"""
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{
            "role": "user",
            "content": f"""为以下问题生成3个不同的表达方式（用于搜索）。
仅输出问题列表，每行一个，不要解释。

原始问题：{question}""",
        }],
    )
    variants = response.content[0].text.strip().split("\n")
    return [question] + [v.strip() for v in variants if v.strip()]

async def retrieve_with_expansion(question: str, top_k: int = 5) -> list[Chunk]:
    queries = await expand_query(question)
    
    # 并行检索所有变体
    results_per_query = await asyncio.gather(
        *[vector_store.similarity_search(await embed(q), top_k=top_k) for q in queries]
    )
    
    # 合并去重
    seen_ids = set()
    merged = []
    for results in results_per_query:
        for chunk in results:
            if chunk.id not in seen_ids:
                seen_ids.add(chunk.id)
                merged.append(chunk)
    
    return merged[:top_k * 2]  # 返回更多候选，供重排序使用
```

### HyDE（Hypothetical Document Embedding）

```python
async def hyde_retrieve(question: str, top_k: int = 5) -> list[Chunk]:
    """
    生成一个假设性答案文档，用其 embedding 做检索。
    原理：假设答案与真实答案的语义空间比问题更接近。
    适用：文档风格与用户问法差异大的场景。
    """
    # 生成假设答案
    hypothesis = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{
            "role": "user",
            "content": f"请写一段简短的文档片段来回答以下问题（不需要准确，只需要风格类似知识库文档）：\n\n{question}",
        }],
    )
    hypothesis_text = hypothesis.content[0].text

    # 用假设答案的 embedding 做检索
    hypothesis_embedding = await embedder.embed_one(hypothesis_text)
    return await vector_store.similarity_search(hypothesis_embedding, top_k=top_k)
```

### 句子窗口检索（Sentence Window）

```python
# 摄入时：分块到句子级别，但存储句子前后的上下文窗口
@dataclass
class SentenceChunk:
    sentence: str           # 用于向量化
    window_content: str     # 句子 ± N 个句子的上下文，用于喂给 LLM
    metadata: dict

def create_sentence_chunks(text: str, window_size: int = 3) -> list[SentenceChunk]:
    sentences = split_into_sentences(text)
    chunks = []
    for i, sentence in enumerate(sentences):
        start = max(0, i - window_size)
        end = min(len(sentences), i + window_size + 1)
        window = " ".join(sentences[start:end])
        chunks.append(SentenceChunk(
            sentence=sentence,
            window_content=window,
            metadata={"sentence_index": i},
        ))
    return chunks

# 检索时：用 sentence embedding 匹配，但返回 window_content 给 LLM
async def retrieve_with_window(question: str) -> list[str]:
    q_embedding = await embedder.embed_one(question)
    sentence_matches = await vector_store.similarity_search(q_embedding, top_k=10)
    return [chunk.window_content for chunk in sentence_matches]
```

### 重排序（Cross-Encoder Reranking）

```python
# 方案1：本地 Cross-Encoder（速度快，无 API 成本）
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank_local(question: str, chunks: list[Chunk], top_n: int = 5) -> list[Chunk]:
    pairs = [(question, chunk.content) for chunk in chunks]
    scores = reranker.predict(pairs)
    ranked = sorted(zip(scores, chunks), key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in ranked[:top_n]]

# 方案2：Cohere Rerank API（效果更好，但有成本）
import cohere
co = cohere.AsyncClient()

async def rerank_cohere(question: str, chunks: list[Chunk], top_n: int = 5) -> list[Chunk]:
    results = await co.rerank(
        query=question,
        documents=[c.content for c in chunks],
        top_n=top_n,
        model="rerank-multilingual-v3.0",
    )
    return [chunks[r.index] for r in results.results]
```

## 评估数据集构建

### 自动生成（LLM 合成）

```python
async def generate_eval_dataset(
    chunks: list[Chunk],
    n_questions: int = 100,
) -> list[EvalCase]:
    """从文档分块自动生成问答对，用于 RAG 评估"""
    sampled = random.sample(chunks, min(n_questions, len(chunks)))
    
    async def gen_qa(chunk: Chunk) -> EvalCase | None:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            messages=[{
                "role": "user",
                "content": f"""基于以下文档内容，生成一个需要精确理解才能回答的问题和答案。
格式：问题：[问题]\n答案：[答案]

文档内容：
{chunk.content}""",
            }],
        )
        text = response.content[0].text
        if "问题：" in text and "答案：" in text:
            q = text.split("问题：")[1].split("答案：")[0].strip()
            a = text.split("答案：")[1].strip()
            return EvalCase(question=q, expected_answer=a, source_chunk_id=chunk.id)
        return None
    
    results = await asyncio.gather(*[gen_qa(c) for c in sampled])
    return [r for r in results if r is not None]
```

### 评估执行与报告

```python
class RAGEvaluator:
    async def run(self, cases: list[EvalCase]) -> EvalReport:
        results = await asyncio.gather(
            *[self._eval_one(case) for case in cases],
            return_exceptions=True,
        )
        valid = [r for r in results if isinstance(r, EvalResult)]
        
        return EvalReport(
            total=len(cases),
            valid=len(valid),
            precision=mean(r.retrieval_precision for r in valid),
            faithfulness=mean(r.faithfulness for r in valid),
            relevance=mean(r.answer_relevance for r in valid),
            latency_p95=sorted(r.latency for r in valid)[int(len(valid) * 0.95)],
        )

    async def _eval_one(self, case: EvalCase) -> EvalResult:
        start = time.perf_counter()
        chunks = await retrieve(case.question)
        answer = await generate_answer(case.question, chunks)
        latency = time.perf_counter() - start

        # 用结构化输出做自动评估
        judge = await extract(
            f"问题：{case.question}\n\n参考答案：{case.expected_answer}\n\n系统答案：{answer}",
            JudgeResult,
        )
        return EvalResult(
            question=case.question,
            retrieved_chunk_ids=[c.id for c in chunks],
            answer=answer,
            latency=latency,
            retrieval_precision=int(case.source_chunk_id in [c.id for c in chunks]),
            faithfulness=judge.faithfulness,
            answer_relevance=judge.relevance,
        )
```

## 生产监控

```python
# 每次查询记录关键指标
async def monitored_query(question: str) -> QueryResult:
    start = time.perf_counter()
    
    try:
        chunks = await retrieve(question)
        answer = await generate_answer(question, chunks)
        latency = time.perf_counter() - start
        
        # 记录到监控系统（LangSmith / Phoenix / 自建）
        await metrics.record({
            "event": "rag_query",
            "latency_ms": int(latency * 1000),
            "chunks_retrieved": len(chunks),
            "input_tokens": ...,
            "output_tokens": ...,
        })
        
        return QueryResult(answer=answer, sources=[c.source for c in chunks])
    
    except Exception as e:
        await metrics.record({"event": "rag_query_failed", "error": type(e).__name__})
        raise
```

## 常见优化路径

```
召回率差（找不到相关内容）
  → 检查分块策略（是否切断语义？）
  → 尝试查询扩展或 HyDE
  → 加全文检索融合

精度差（检索到不相关内容）
  → 提高相似度阈值（> 0.75）
  → 加重排序步骤
  → 检查嵌入模型是否适合当前语言

幻觉多（答案内容不在上下文中）
  → 加强 system prompt 限制
  → 检查 context 是否太长（LLM 遗忘）
  → 用 faithfulness 指标量化

延迟高（P95 > 3s）
  → 检查嵌入生成时间（缓存？批量？）
  → 检查向量索引是否建立（IVFFlat/HNSW）
  → 考虑流式输出改善用户体验
```
