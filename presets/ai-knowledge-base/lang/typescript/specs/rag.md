# RAG 高级技术参考（TypeScript）

> AI 按需读取。进阶 RAG 技术的 TS 实现。概念解释见 `rag-pipeline` 技能，本文件只给 TS 代码。
> 失败原因对照表与 Python 版（`lang/python/specs/rag.md`）相同，此处不重复。

## 查询扩展（Query Expansion）

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

async function expandQuery(question: string): Promise<string[]> {
  const { text } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    prompt: `为以下问题生成 3 个不同的搜索表达，每行一个，不要解释：\n${question}`,
    maxTokens: 256,
  });
  const variants = text.trim().split('\n').map((v) => v.trim()).filter(Boolean);
  return [question, ...variants];
}

export async function retrieveWithExpansion(question: string, topK = 5): Promise<Chunk[]> {
  const queries = await expandQuery(question);
  const perQuery = await Promise.all(
    queries.map(async (q) => similaritySearch(await embedOne(q), topK)),
  );

  // 合并去重
  const seen = new Set<string>();
  const merged: Chunk[] = [];
  for (const results of perQuery) {
    for (const c of results) {
      if (!seen.has(c.id)) { seen.add(c.id); merged.push(c); }
    }
  }
  return merged.slice(0, topK * 2);
}
```

## HyDE（假设文档嵌入）

```typescript
export async function hydeRetrieve(question: string, topK = 5): Promise<Chunk[]> {
  const { text: hypothesis } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    prompt: `写一段简短文档片段来回答（不需准确，风格类似知识库即可）：\n${question}`,
    maxTokens: 256,
  });
  const embedding = await embedOne(hypothesis);
  return similaritySearch(embedding, topK);
}
```

## 混合检索（RRF，在 SQL 层做）

向量 + 全文检索融合，与语言无关，直接在 pgvector 里用 SQL：

```typescript
export async function hybridSearch(embedding: number[], query: string, topK = 10) {
  const vec = `[${embedding.join(',')}]`;
  return sql`
    WITH vec AS (
      SELECT id, content, ROW_NUMBER() OVER (ORDER BY embedding <=> ${vec}::vector) AS rank
      FROM chunks ORDER BY embedding <=> ${vec}::vector LIMIT 50
    ),
    txt AS (
      SELECT id, content, ROW_NUMBER() OVER (ORDER BY ts_rank(tsv, q) DESC) AS rank
      FROM chunks, plainto_tsquery('simple', ${query}) q
      WHERE tsv @@ q LIMIT 50
    )
    SELECT COALESCE(v.id, t.id) AS id, COALESCE(v.content, t.content) AS content,
           COALESCE(1.0/(60+v.rank),0) + COALESCE(1.0/(60+t.rank),0) AS rrf_score
    FROM vec v FULL OUTER JOIN txt t ON v.id = t.id
    ORDER BY rrf_score DESC LIMIT ${topK}
  `;
}
```

## 重排序（Cohere Rerank API）

TS 侧没有成熟的本地 Cross-Encoder，推荐用 Cohere Rerank API：

```typescript
import { CohereClient } from 'cohere-ai';
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });

export async function rerank(question: string, chunks: Chunk[], topN = 5): Promise<Chunk[]> {
  const res = await cohere.rerank({
    query: question,
    documents: chunks.map((c) => c.content),
    topN,
    model: 'rerank-multilingual-v3.0',
  });
  return res.results.map((r) => chunks[r.index]);
}
```

## 评估（LLM-as-Judge，结构化输出）

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const JudgeSchema = z.object({
  faithfulness: z.number().min(0).max(1).describe('答案是否完全基于上下文'),
  relevance: z.number().min(0).max(1).describe('答案是否回答了问题'),
  reasoning: z.string(),
});

export async function judge(question: string, context: string, answer: string) {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: JudgeSchema,
    prompt: `评估 RAG 输出质量：\n问题：${question}\n上下文：${context}\n答案：${answer}`,
  });
  return object;
}
```

## 优化路径

与 Python 版相同（召回差→分块/HyDE/混合检索；精度差→提阈值/重排序；幻觉多→强化 system prompt/缩短上下文；延迟高→缓存嵌入/建索引/流式）。详见 `lang/python/specs/rag.md` 的"常见优化路径"。
