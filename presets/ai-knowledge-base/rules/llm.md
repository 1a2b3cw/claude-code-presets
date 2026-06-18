# LLM 集成规则

## 必须做
- 所有 LLM 调用走统一客户端封装（便于切换模型、注入 tracing）
- 设置合理的超时（建议 60s）和最大重试次数（3次，指数退避）
- 记录每次调用的 token 用量（input/output tokens）
- 生产环境接入 LLM tracing（LangSmith 或 Phoenix Arize）
- Prompt 模板版本化管理（不要硬编码在业务逻辑里）

## 禁止做
- 将用户输入直接插入 Prompt（Prompt Injection 风险）
- 在循环中串行调用 LLM（用 `asyncio.gather` 并行）
- 忽略 LLM 的 rate limit 错误（必须实现退避重试）
- 不设 `max_tokens`（可能产生超长、高成本输出）

## 统一客户端

```python
import anthropic
import asyncio
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
        model: str = "claude-opus-4-5",
    ) -> str:
        message = await self._client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
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
def sanitize_user_input(text: str) -> str:
    # 移除可能的角色覆盖指令
    dangerous_patterns = [
        r'ignore previous instructions',
        r'you are now',
        r'system prompt',
        r'<\|.*?\|>',  # special tokens
    ]
    for pattern in dangerous_patterns:
        text = re.sub(pattern, '[FILTERED]', text, flags=re.IGNORECASE)
    return text[:4000]  # 限制输入长度
```

## 模型选型参考
| 场景 | 推荐模型 | 原因 |
|------|----------|------|
| 问答生成 | claude-opus-4-5 | 高质量长文本 |
| 快速摘要 | claude-haiku-4-5 | 低延迟低成本 |
| 代码生成 | claude-sonnet-4-6 | 代码能力强 |
| 嵌入生成 | text-embedding-3-small | 成本低，效果好 |
