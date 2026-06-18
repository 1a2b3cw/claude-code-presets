# LLM 集成规则

## 必须做
- 所有 LLM 调用走统一客户端封装（便于切换模型、注入 tracing）
- 设置合理的超时（建议 60s）和最大重试次数（3 次，指数退避）
- 记录每次调用的 token 用量（input/output tokens）
- 生产环境接入 LLM tracing（LangSmith 或 Phoenix Arize）
- Prompt 模板版本化管理（不要硬编码在业务逻辑里）

## 禁止做
- 将用户输入直接插入 Prompt（Prompt Injection 风险，必须先 sanitize）
- 在循环中串行调用 LLM（用 `asyncio.gather` 并行）
- 忽略 rate limit 错误（必须实现退避重试，用 `tenacity`）
- 不设 `max_tokens`（可能产生超长、高成本输出）
- 硬编码模型 ID 在业务代码中（统一从配置读取）

## 模型选型

| 场景 | 推荐模型 | 原因 |
|------|----------|------|
| 结构化提取、分类、摘要 | `claude-haiku-4-5-20251001` | 最快最省钱 |
| RAG 问答、Agent 工具调用 | `claude-sonnet-4-6` | 能力与成本平衡，**首选** |
| 复杂推理、长文档分析 | `claude-opus-4-8` | 最强能力 |
| 嵌入生成 | `text-embedding-3-small` | 成本低，效果好 |
| 中文内容嵌入 | `BGE-M3`（本地 Ollama）| 专门优化中文，零 API 成本 |

## 统一客户端

```python
import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential

class LLMClient:
    def __init__(self) -> None:
        self._client = anthropic.AsyncAnthropic()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def generate(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 2048,
        model: str = "claude-sonnet-4-6",
    ) -> str:
        message = await self._client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    async def stream(self, prompt: str, system: str = ""):
        """流式生成，用于实时展示给用户"""
        async with self._client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
```

## Prompt 模板规范

```python
# prompts/rag_answer.py
RAG_ANSWER_SYSTEM = """你是一个知识库助手。请严格基于以下检索到的内容回答问题。
如果检索内容不足以回答问题，请明确说明"根据现有资料无法回答"，不要编造。"""

RAG_ANSWER_TEMPLATE = """检索到的相关内容：
{context}

用户问题：{question}

请基于以上内容给出准确回答："""
```

## 防止 Prompt Injection

```python
import re

INJECTION_PATTERNS = [
    r'ignore (all |previous |above )?instructions?',
    r'you are now',
    r'new (system |role |persona)',
    r'<\|.*?\|>',
    r'\[INST\]',
    r'###\s*(System|Human|Assistant)',
]

def sanitize_user_input(text: str, max_length: int = 2000) -> str:
    for pattern in INJECTION_PATTERNS:
        text = re.sub(pattern, '[REMOVED]', text, flags=re.IGNORECASE)
    return text[:max_length].strip()
```

## Agent 相关规则

见 `rules/agents.md`。Agent 开发必须遵循其中的循环限制、工具设计和安全要求。
