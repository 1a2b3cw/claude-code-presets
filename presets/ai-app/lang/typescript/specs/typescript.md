# TypeScript AI 后端技术参考

> AI 按需读取。用 TypeScript 写 AI 后端（RAG / Agent / LLM 服务）时的完整参考。
> LLM 层用 Vercel AI SDK（`ai`），与 Vercel 部署无关，可部署到任何 Node 环境。

## 技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| 运行时 | Node.js 20+ / Bun | |
| Web 框架 | **Hono** | 轻量、跨运行时、类型友好 |
| LLM | **Vercel AI SDK（`ai`）** | `generateText`/`streamText`/`generateObject`/`tool` |
| LLM Provider | `@ai-sdk/anthropic` | Claude 接入 |
| 向量库 | pgvector + **postgres.js** | 直接写 SQL，不套 ORM 抽象 |
| 校验 | Zod | 运行时校验 + 类型推导 |
| 测试 | Vitest | |

## 依赖安装

```bash
pnpm add ai @ai-sdk/anthropic hono zod postgres pino
pnpm add -D vitest @types/node tsx
```

## 项目结构

```
src/
├── api/
│   ├── app.ts            # Hono 应用
│   └── routes/
│       ├── chat.ts
│       └── documents.ts
├── core/
│   ├── env.ts            # Zod 环境变量校验
│   ├── db.ts             # postgres.js 连接
│   └── logger.ts         # pino
├── ingestion/            # 解析 + 分块 + 嵌入
├── retrieval/            # 向量检索 + 混合检索
├── generation/           # LLM 调用 + prompt
└── agents/               # Agent（如果有）
```

## Hono + 流式问答端点

```typescript
import { Hono } from 'hono';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { stream } from 'hono/streaming';

const app = new Hono();

app.post('/api/chat', async (c) => {
  const { question } = await c.req.json<{ question: string }>();

  const chunks = await retrieve(question);          // 向量检索
  const context = chunks.map((ch) => ch.content).join('\n\n---\n\n');

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: '你是知识库助手，只基于参考资料回答，资料不足时明说无法回答。',
    prompt: `参考资料：\n${context}\n\n问题：${question}`,
    maxTokens: 2048,
  });

  // SSE 流式返回
  return stream(c, async (s) => {
    for await (const chunk of result.textStream) {
      await s.write(chunk);
    }
  });
});

export default app;
```

## pgvector 操作（postgres.js，不套 ORM）

```typescript
import postgres from 'postgres';
import { env } from '../core/env';

const sql = postgres(env.DATABASE_URL);

export interface Chunk {
  id: string;
  content: string;
  source: string;
  score: number;
}

// 向量检索（pgvector 余弦距离 <=>）
export async function similaritySearch(
  embedding: number[],
  topK = 20,
  minScore = 0.75,
): Promise<Chunk[]> {
  const vec = `[${embedding.join(',')}]`;
  return sql<Chunk[]>`
    SELECT c.id, c.content, d.source,
           1 - (c.embedding <=> ${vec}::vector) AS score
    FROM chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE 1 - (c.embedding <=> ${vec}::vector) > ${minScore}
    ORDER BY c.embedding <=> ${vec}::vector
    LIMIT ${topK}
  `;
}

// 批量插入分块
export async function insertChunks(
  rows: { documentId: string; index: number; content: string; embedding: number[] }[],
): Promise<void> {
  await sql.begin(async (tx) => {
    for (const r of rows) {
      await tx`
        INSERT INTO chunks (document_id, chunk_index, content, embedding)
        VALUES (${r.documentId}, ${r.index}, ${r.content}, ${`[${r.embedding.join(',')}]`}::vector)
        ON CONFLICT DO NOTHING
      `;
    }
  });
}
```

## 嵌入生成（OpenAI embeddings via ai SDK）

```typescript
import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';

export async function embed(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: texts.filter((t) => t.trim()),
  });
  return embeddings;
}
```

## Agent（工具调用循环）

Vercel AI SDK 自带 agent loop：传 `tools` 和 `maxSteps`，SDK 自动执行多轮工具调用。

```typescript
import { generateText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const tools = {
  searchKnowledgeBase: tool({
    description: '搜索知识库，返回相关文档片段。需要查内部资料时用。',
    parameters: z.object({
      query: z.string().describe('搜索关键词'),
      topK: z.number().default(5),
    }),
    execute: async ({ query, topK }) => {
      const results = await retrieve(query, topK);
      return results.map((r) => `[${r.source}] ${r.content}`).join('\n\n');
    },
  }),
};

export async function runAgent(userMessage: string): Promise<string> {
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    tools,
    maxSteps: 10, // agent loop 上限（等价 max_iterations）
    system: '你是研究助手，用工具查资料后回答。',
    prompt: userMessage,
  });
  return text;
}
```

## 环境变量（Zod）

```typescript
import { z } from 'zod';

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
});

export const env = schema.parse(process.env);
```

## 测试（Vitest）

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('chunker', () => {
  it('应该按大小切分并保留 hash', () => {
    const chunks = recursiveChunk('a'.repeat(250), { chunkSize: 100, overlap: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.contentHash)).toBe(true);
  });
});

// Mock LLM 调用
describe('summarize', () => {
  it('返回结构化结果', async () => {
    vi.mock('ai', () => ({
      generateObject: vi.fn().mockResolvedValue({
        object: { title: 't', keyPoints: ['a'], sentiment: 'neutral' },
      }),
    }));
    const result = await summarize('test');
    expect(result.sentiment).toBe('neutral');
  });
});
```

## Docker 部署

```dockerfile
FROM node:20-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY . .
RUN pnpm build
USER node
CMD ["node", "dist/index.js"]
```

部署到任何支持 Node 的平台即可（Railway / Fly.io / 自建 VPS / Cloudflare Containers），**不绑定 Vercel**。
