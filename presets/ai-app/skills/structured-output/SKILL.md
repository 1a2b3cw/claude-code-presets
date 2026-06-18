---
name: structured-output
description: 从 LLM 可靠获取结构化 JSON——工具调用强制结构化、Pydantic 验证、失败重试、批量提取
---

# 结构化输出

> 本技能默认给 Python 实现。**TypeScript 用户**：用 Vercel AI SDK 的 `generateObject` + Zod，见下方"TypeScript 版"。

## 使用时机

- LLM 输出需要解析为 Python 对象（分类、提取、评分等）
- 从非结构化文档中提取实体、关系、摘要
- 需要避免 JSON 解析失败导致系统故障

## 核心方案：工具调用强制结构化

工具调用比"请输出 JSON"更可靠，因为 Claude 经过专门训练来正确填写工具 schema。

```python
import anthropic
from pydantic import BaseModel, Field
from typing import TypeVar

client = anthropic.AsyncAnthropic()
T = TypeVar("T", bound=BaseModel)

async def extract(text: str, schema: type[T], instruction: str = "") -> T:
    """通用结构化提取：传入 Pydantic 模型，返回实例"""
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",  # 结构化任务用 Haiku，又快又省钱
        max_tokens=1024,
        tools=[{
            "name": "submit_result",
            "description": f"提交提取结果（必须调用）。{instruction}",
            "input_schema": schema.model_json_schema(),
        }],
        tool_choice={"type": "any"},  # 强制必须调用工具，不允许纯文本回复
        messages=[{
            "role": "user",
            "content": f"从以下内容中提取信息并提交：\n\n{text}",
        }],
    )
    tool_use = next(b for b in response.content if b.type == "tool_use")
    return schema.model_validate(tool_use.input)
```

## 常用 Schema 定义

```python
class DocumentSummary(BaseModel):
    title: str = Field(description="文档标题，10字以内")
    key_points: list[str] = Field(description="3-5个核心要点，每条不超过50字")
    sentiment: str = Field(description="情感倾向：positive / negative / neutral")
    confidence: float = Field(ge=0.0, le=1.0, description="置信度，0.0-1.0")

class EntityExtraction(BaseModel):
    people: list[str] = Field(default_factory=list, description="文中提到的人名")
    organizations: list[str] = Field(default_factory=list, description="机构/公司名称")
    locations: list[str] = Field(default_factory=list, description="地名")
    dates: list[str] = Field(default_factory=list, description="日期/时间表达")

class ClassificationResult(BaseModel):
    label: str = Field(description="分类标签，必须是预定义类别之一")
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str = Field(description="分类理由，方便调试和审核")

class EvalScore(BaseModel):
    score: float = Field(ge=0.0, le=1.0, description="评分 0.0-1.0")
    passed: bool = Field(description="是否达到及格线")
    explanation: str = Field(description="评分理由")
    issues: list[str] = Field(default_factory=list, description="存在的问题列表")
```

## 带重试的提取

```python
from tenacity import retry, stop_after_attempt, wait_exponential
import logging

logger = logging.getLogger(__name__)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=1, max=10),
    reraise=True,
)
async def extract_with_retry(text: str, schema: type[T]) -> T:
    try:
        return await extract(text, schema)
    except Exception as e:
        logger.warning("structured_extract_failed", error=str(e), schema=schema.__name__)
        raise
```

## 批量提取（控制并发）

```python
async def batch_extract(
    texts: list[str],
    schema: type[T],
    concurrency: int = 10,  # 控制并发，避免超 rate limit
) -> list[T | None]:
    semaphore = asyncio.Semaphore(concurrency)

    async def safe_extract(text: str) -> T | None:
        async with semaphore:
            try:
                return await extract_with_retry(text, schema)
            except Exception as e:
                logger.error("batch_extract_failed", error=str(e))
                return None

    return await asyncio.gather(*[safe_extract(t) for t in texts])
```

## LLM-as-Judge（用 LLM 评估 LLM 输出）

```python
class JudgeResult(BaseModel):
    faithfulness: float = Field(ge=0.0, le=1.0, description="答案是否完全基于上下文")
    relevance: float = Field(ge=0.0, le=1.0, description="答案是否回答了问题")
    reasoning: str = Field(description="评分理由")

async def judge_rag_answer(question: str, context: str, answer: str) -> JudgeResult:
    prompt = f"""请评估以下 RAG 系统的输出质量：

问题：{question}

检索到的上下文：
{context}

系统给出的答案：
{answer}"""

    return await extract(prompt, JudgeResult, instruction="客观评估答案质量，注重忠实度和相关性")
```

## 避坑

- **不要用 `response_format={"type": "json_object"}`**：不如工具调用可靠，且不能约束 schema 结构
- **不要解析 `response.content[0].text`**：容易被 markdown 代码块和换行符干扰
- **schema 层级不超过 3 层**：嵌套过深时 LLM 填写出错率显著上升
- **每个字段加 `description`**：LLM 靠 description 理解该填什么，不要依赖字段名称
- **用 `Field(default_factory=list)` 代替 `= []`**：Pydantic 最佳实践，避免共享默认值

## TypeScript 版（Vercel AI SDK）

`generateObject` 用 Zod schema 强制结构化，等价于 Python 的工具调用强制法，类型自动推导。

```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const ClassificationSchema = z.object({
  label: z.string().describe('分类标签，必须是预定义类别之一'),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().describe('分类理由，便于调试'),
});

export async function classify(text: string) {
  const { object } = await generateObject({
    model: anthropic('claude-haiku-4-5-20251001'), // 结构化任务用 Haiku
    schema: ClassificationSchema,
    prompt: `对以下内容分类：\n\n${text}`,
    maxRetries: 3, // SDK 内置重试
  });
  return object; // 已通过 Zod 校验，完全类型安全
}

// 批量提取（控制并发）
export async function batchExtract<T>(
  texts: string[],
  fn: (t: string) => Promise<T>,
  concurrency = 10,
): Promise<(T | null)[]> {
  const results: (T | null)[] = [];
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map(fn));
    results.push(...settled.map((s) => (s.status === 'fulfilled' ? s.value : null)));
  }
  return results;
}
```

避坑同 Python：schema 层级不超 3 层、每个字段加 `.describe()`、不要让模型输出裸 JSON 字符串再 parse（用 `generateObject` 而非解析 `text`）。
