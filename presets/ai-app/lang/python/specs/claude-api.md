# Claude API 技术参考

> AI 按需读取的详细参考。需要深入了解 API 用法、模型选型、性能优化时阅读。

## 模型选型

| 模型 | ID | 适用场景 | 特点 |
|------|----|----------|------|
| **Claude Opus 4.8** | `claude-opus-4-8` | 复杂推理、长文档分析、Agent 复杂任务 | 最强能力，成本最高 |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | Agent 循环、代码生成、RAG 问答 | 能力与成本平衡，**首选** |
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | 结构化提取、分类、摘要、批量任务 | 最快、最便宜 |

**选型原则**：
- 结构化输出、分类 → Haiku（又快又省钱）
- Agent 工具调用、RAG 问答 → Sonnet（默认选择）
- 复杂多步推理、高要求分析 → Opus

## Messages API 基本用法

```python
import anthropic

client = anthropic.AsyncAnthropic()  # 生产环境用异步客户端

# 基础问答
response = await client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=2048,
    system="你是一个精确的知识库助手，只基于提供的上下文回答。",
    messages=[
        {"role": "user", "content": "什么是 RAG？"},
    ],
)
text = response.content[0].text

# 多轮对话
messages = [
    {"role": "user", "content": "介绍一下 pgvector"},
    {"role": "assistant", "content": "pgvector 是 PostgreSQL 的向量扩展..."},
    {"role": "user", "content": "它和 Qdrant 相比怎么样？"},
]
response = await client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=messages,
)
```

## 工具调用（Tool Use）

```python
# 定义工具
tools = [
    {
        "name": "get_weather",
        "description": "获取指定城市的当前天气",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "城市名称"},
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "温度单位",
                },
            },
            "required": ["city"],
        },
    }
]

# 调用（Claude 会决定是否使用工具）
response = await client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "北京今天多少度？"}],
)

# stop_reason == "tool_use" 时处理工具调用
if response.stop_reason == "tool_use":
    for block in response.content:
        if block.type == "tool_use":
            print(f"调用工具: {block.name}")
            print(f"参数: {block.input}")
            print(f"调用 ID: {block.id}")  # 返回结果时需要带上

# tool_choice 控制工具使用行为
tool_choice = {"type": "auto"}     # 默认：Claude 自己决定
tool_choice = {"type": "any"}      # 必须使用至少一个工具
tool_choice = {"type": "tool", "name": "get_weather"}  # 必须使用指定工具
```

## 流式输出（Streaming）

```python
# 流式生成，适合实时显示给用户
async def stream_response(prompt: str):
    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            print(text, end="", flush=True)
        
        # 获取完整响应（流结束后）
        final_message = await stream.get_final_message()
        return final_message

# FastAPI SSE 端点
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    async def generate():
        async with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=request.messages,
        ) as stream:
            async for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

## Prompt Caching（降低成本）

```python
# 对长系统提示或上下文启用缓存，重复调用省 90% token 成本
response = await client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": long_system_prompt,  # 长系统提示，加缓存标记
            "cache_control": {"type": "ephemeral"},  # TTL: 5 分钟
        }
    ],
    messages=[{"role": "user", "content": user_question}],
)

# 检查缓存命中
usage = response.usage
print(f"缓存读取: {usage.cache_read_input_tokens} tokens")
print(f"缓存写入: {usage.cache_creation_input_tokens} tokens")
```

**适合缓存的内容**：长系统提示、大量 few-shot 示例、静态知识库内容注入

## 错误处理

```python
from anthropic import (
    APIError, RateLimitError, APITimeoutError,
    AuthenticationError, BadRequestError
)
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=1, max=60),
    retry=retry_if_exception_type((RateLimitError, APITimeoutError)),
)
async def call_claude(messages: list) -> str:
    try:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=messages,
        )
        return response.content[0].text
    except RateLimitError:
        logger.warning("rate_limit_hit", retry=True)
        raise  # tenacity 捕获并重试
    except APITimeoutError:
        logger.warning("api_timeout", retry=True)
        raise
    except AuthenticationError:
        logger.error("invalid_api_key")
        raise  # 认证错误不应重试
    except BadRequestError as e:
        logger.error("bad_request", error=str(e))
        raise
    except APIError as e:
        logger.error("api_error", status=e.status_code, error=str(e))
        raise
```

## Token 计算与成本控制

```python
# 计算消息的 token 数（不发起实际请求）
token_count = await client.messages.count_tokens(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": long_text}],
)
print(f"预计 {token_count.input_tokens} 个输入 token")

# 控制上下文长度（防止超限）
MAX_CONTEXT_TOKENS = 150_000  # claude-sonnet-4-6 支持 200K

def trim_messages_to_fit(messages: list, max_tokens: int = MAX_CONTEXT_TOKENS) -> list:
    """从最早的消息开始裁剪，保留最新上下文"""
    while len(messages) > 1:
        count = await client.messages.count_tokens(model="claude-sonnet-4-6", messages=messages)
        if count.input_tokens <= max_tokens:
            break
        messages = messages[2:]  # 移除最早的一轮对话（user + assistant）
    return messages
```

## Batch API（大批量离线任务）

```python
# 适合：评估数据集、批量摘要、非实时任务
# 优势：成本减半，但异步处理（不保证即时返回）

batch = await client.messages.batches.create(
    requests=[
        {
            "custom_id": f"doc_{i}",
            "params": {
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": doc}],
            },
        }
        for i, doc in enumerate(documents)
    ]
)

# 轮询结果（通常几分钟到几小时）
while batch.processing_status == "in_progress":
    await asyncio.sleep(60)
    batch = await client.messages.batches.retrieve(batch.id)

# 处理结果
async for result in await client.messages.batches.results(batch.id):
    print(f"{result.custom_id}: {result.result.message.content[0].text}")
```
