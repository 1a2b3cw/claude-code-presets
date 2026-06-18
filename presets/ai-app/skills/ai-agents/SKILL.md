---
name: ai-agents
description: 构建 AI Agent——Claude 工具调用、智能体循环、多智能体协调（Orchestrator-Worker）、人机回路、安全边界
---

# AI Agent 开发

> 本技能默认给 Python 实现。**TypeScript 用户**：Vercel AI SDK 自带 agent loop，比手写简单很多——见下方"TypeScript 版"，完整后端参考 `lang/typescript/specs/typescript.md`。

## 使用时机

- 实现多步推理任务（规划 → 执行 → 验证循环）
- 接入外部工具（搜索、代码执行、数据库查询、API 调用）
- 构建 Orchestrator-Worker 多智能体系统
- 高风险操作需要"人机回路"（用户确认后才执行）

## Claude 工具调用

```python
import anthropic
import asyncio
from typing import Any

client = anthropic.AsyncAnthropic()

TOOLS = [
    {
        "name": "search_knowledge_base",
        "description": "搜索内部知识库，返回相关文档片段。当需要查找特定领域信息时使用，不要用于通用知识问题。",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜索关键词或问题"},
                "top_k": {"type": "integer", "description": "返回结果数量，默认 5", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "execute_code",
        "description": "在隔离沙箱中执行 Python 代码，返回 stdout 和 stderr。仅用于数据分析和计算，不能访问外部网络。",
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "要执行的 Python 代码"},
            },
            "required": ["code"],
        },
    },
]

async def execute_tool(name: str, inputs: dict[str, Any]) -> str:
    match name:
        case "search_knowledge_base":
            results = await kb.search(inputs["query"], top_k=inputs.get("top_k", 5))
            return "\n\n---\n\n".join(
                f"[来源: {r.source}]\n{r.content}" for r in results
            )
        case "execute_code":
            return await sandbox.run(inputs["code"], timeout=30)
        case _:
            return f"错误：未知工具 {name}"
```

## 智能体循环（核心模式）

```python
async def run_agent(
    user_message: str,
    system: str = "",
    max_iterations: int = 10,
) -> str:
    messages = [{"role": "user", "content": user_message}]

    for iteration in range(max_iterations):
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

        logger.info(
            "agent_step",
            iteration=iteration,
            stop_reason=response.stop_reason,
            input_tokens=response.usage.input_tokens,
        )

        # 任务完成
        if response.stop_reason == "end_turn":
            return next(
                (b.text for b in response.content if hasattr(b, "text")), ""
            )

        # 工具调用：并行执行所有工具
        if response.stop_reason == "tool_use":
            tool_calls = [b for b in response.content if b.type == "tool_use"]
            tool_results = await asyncio.gather(
                *[execute_tool(tc.name, tc.input) for tc in tool_calls]
            )

            messages.append({"role": "assistant", "content": response.content})
            messages.append({
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tc.id,
                        "content": str(result),
                    }
                    for tc, result in zip(tool_calls, tool_results)
                ],
            })
        else:
            break

    raise RuntimeError(f"Agent 超过最大迭代次数 ({max_iterations})，请检查工具是否陷入循环")
```

## 人机回路（Human-in-the-Loop）

```python
from collections.abc import Awaitable, Callable

DANGEROUS_TOOLS = {"delete_documents", "send_email", "write_to_database"}

async def run_agent_with_hitl(
    user_message: str,
    confirm: Callable[[str, dict], Awaitable[bool]],
) -> str:
    """高风险工具调用前请求用户确认"""

    async def safe_execute(name: str, inputs: dict) -> str:
        if name in DANGEROUS_TOOLS:
            approved = await confirm(name, inputs)
            if not approved:
                return f"用户取消了 {name} 操作。请告知用户并询问是否需要调整方案。"
        return await execute_tool(name, inputs)

    # 将 safe_execute 替换上面循环中的 execute_tool 即可
    ...
```

## Orchestrator-Worker 多智能体

```python
class ResearchAgent:
    """专职 Worker：负责搜索和信息汇总"""
    async def run(self, query: str) -> str:
        return await run_agent(
            f"搜索并汇总关于以下问题的信息：{query}",
            system="你是一个研究助手，专注于信息搜索和汇总。",
        )

class WriterAgent:
    """专职 Worker：负责生成最终报告"""
    async def run(self, outline: str, research: str) -> str:
        return await run_agent(
            f"基于以下研究内容，按照大纲撰写报告：\n\n大纲：{outline}\n\n研究内容：{research}",
            system="你是一个专业写作助手，负责将研究内容整理为清晰的报告。",
        )

class OrchestratorAgent:
    """协调多个 Worker 完成复杂任务"""
    def __init__(self) -> None:
        self.researcher = ResearchAgent()
        self.writer = WriterAgent()

    async def run(self, task: str) -> str:
        # 1. 并行研究多个子问题
        sub_queries = await self._decompose(task)
        research_results = await asyncio.gather(
            *[self.researcher.run(q) for q in sub_queries]
        )
        combined_research = "\n\n".join(research_results)

        # 2. 生成大纲
        outline = await self._create_outline(task, combined_research)

        # 3. Writer 生成最终报告
        return await self.writer.run(outline, combined_research)
```

## 工具设计原则

| 原则 | 说明 |
|------|------|
| 描述要精确 | 包含"何时用"和"何时不用"，LLM 靠 description 决策 |
| 输入要验证 | 工具内部用 Pydantic 验证 inputs，不信任 LLM 生成的参数 |
| 返回要简洁 | 返回值进 context，越长越贵；截断或摘要大输出 |
| 错误要有意义 | 错误消息让 LLM 知道如何修正，而不是通用 500 错误 |
| 副作用要标注 | 写操作工具在 description 中明确说明会修改什么数据 |

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 无限循环 | 工具总返回相同结果，LLM 不断重试 | 加 max_iterations，检测重复调用 |
| 上下文超长 | 工具返回大量文本 | 截断/摘要工具返回值，控制在 2000 字内 |
| 幻觉工具参数 | 工具 schema 字段描述不清晰 | 给每个字段加详细 description |
| 并发写冲突 | 并行工具同时写同一资源 | 标记互斥工具，改为串行执行 |

## TypeScript 版（Vercel AI SDK）

SDK 内置 agent loop——传 `tools` 和 `maxSteps`，自动执行多轮工具调用，不用手写循环。

```typescript
import { generateText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const tools = {
  searchKnowledgeBase: tool({
    description: '搜索知识库返回相关片段。需要查内部资料时用，不要用于通用知识。',
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
  const { text, steps } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    tools,
    maxSteps: 10,            // agent loop 上限（等价 Python 的 max_iterations）
    system: '你是研究助手，用工具查资料后回答。',
    prompt: userMessage,
  });
  // steps 里有每轮的工具调用记录，用于日志/调试
  return text;
}
```

人机回路（HITL）：在 `execute` 里对高风险操作先请求用户确认，未批准则返回提示文本让模型告知用户。多智能体：把不同职责封装成各自的 `runAgent`，用一个 orchestrator 函数串/并联调用（同 Python 思路）。
