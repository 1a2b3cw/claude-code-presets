# TypeScript AI 项目规则

> AI 后端用 TypeScript 时的必守规则。LLM 层默认用 **Vercel AI SDK（`ai` 包）**——它跟 Vercel 部署无关，可跑在任何 Node 环境（自建 VPS、Railway、Fly.io、Cloudflare、Docker 等）。

## 必须做
- TypeScript strict 模式，不用 `any`（必要时 `unknown` + 类型守卫）
- 数据校验用 **Zod**（等价于 Python 的 Pydantic），schema 同时用于运行时校验和类型推导
- LLM 调用用 `ai` 包：`generateText` / `streamText` / `generateObject` / `tool`
- 环境变量经 Zod 校验后再用，不直接读 `process.env`
- 异步并发用 `Promise.all`，不在循环里 `await` 串行调 LLM
- 结构化日志（pino），不 `console.log` 敏感信息
- 模型 ID 从配置读取

## 禁止做
- 引入 LangChain.js（默认裸 SDK，见 `rules/llm.md` 反框架立场）
- 用户输入直接拼进 prompt（先 sanitize）
- 吞掉 LLM 错误（rate limit 必须退避重试）
- 不设 `maxTokens`
- 默认导出（用命名导出）

## 环境变量校验（Zod）

```typescript
import { z } from 'zod';

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  LLM_MODEL: z.string().default('claude-sonnet-4-6'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
});

export const env = envSchema.parse(process.env);
```

## 统一 LLM 调用（Vercel AI SDK）

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

// 基础生成（内置重试）
export async function generate(prompt: string, system = ''): Promise<string> {
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    system,
    prompt,
    maxTokens: 2048,
    maxRetries: 3, // 指数退避，SDK 内置
  });
  return text;
}
```

## 结构化输出（Zod，等价 Pydantic）

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const SummarySchema = z.object({
  title: z.string(),
  keyPoints: z.array(z.string()).describe('3-5 个核心要点'),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
});

export async function summarize(text: string) {
  const { object } = await generateObject({
    model: anthropic('claude-haiku-4-5-20251001'), // 结构化任务用 Haiku
    schema: SummarySchema,
    prompt: `总结以下内容：\n\n${text}`,
  });
  return object; // 已通过 Zod 校验，类型安全
}
```

## Prompt Injection 清洗

```typescript
const INJECTION_PATTERNS = [
  /ignore (all |previous |above )?instructions?/gi,
  /you are now/gi,
  /<\|.*?\|>/g,
  /\[INST\]/gi,
];

export function sanitizeInput(text: string, maxLength = 2000): string {
  let out = text;
  for (const p of INJECTION_PATTERNS) out = out.replace(p, '[REMOVED]');
  return out.slice(0, maxLength).trim();
}
```

## 命名规范
| 类型 | 规范 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `getEmbedding`, `chunkSize` |
| 类型/接口/Schema | PascalCase | `Chunk`, `SummarySchema` |
| 常量 | UPPER_SNAKE_CASE | `MAX_TOKENS` |
| 文件 | kebab-case | `vector-store.ts` |
