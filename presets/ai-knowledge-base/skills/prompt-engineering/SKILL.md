# Prompt Engineering

设计、优化和版本化 LLM Prompt 模板。

## 使用时机

- 设计新的 Prompt 模板
- 答案质量差需要优化 Prompt
- 防止 Prompt Injection 攻击
- 需要结构化输出（JSON）

## Prompt 结构原则

```
[System Prompt]
1. 角色定义（你是什么，你做什么）
2. 行为约束（你不做什么，边界在哪）
3. 输出格式要求（结构、长度、语言）

[User Prompt]
1. 上下文（检索到的内容）
2. 用户问题
3. 输出指令
```

## RAG 场景模板

```python
# prompts/rag.py

RAG_SYSTEM = """\
你是一个精确的知识库问答助手。

规则：
1. 只基于"参考资料"部分的内容回答
2. 如果资料不足以回答，说"根据现有资料无法回答此问题"
3. 不要编造、推断或补充资料中没有的信息
4. 引用具体来源（如：根据[来源]...）
5. 使用中文回答，保持简洁
"""

RAG_USER = """\
参考资料：
{context}

---

问题：{question}
"""

# 结构化输出模板
RAG_JSON_SYSTEM = """\
你是一个知识库问答助手。请以 JSON 格式回答。

输出格式：
{{
  "answer": "回答内容",
  "confidence": 0.0-1.0,
  "sources": ["来源1", "来源2"],
  "can_answer": true/false
}}
"""
```

## 提高输出质量的技巧

```python
# 1. Few-shot 示例（稳定输出格式）
FEW_SHOT_EXAMPLES = """
示例1：
问题：Python 中如何读取文件？
资料：Python 使用 open() 函数读取文件，with 语句确保文件自动关闭。
回答：使用 `with open('file.txt', 'r') as f: content = f.read()`

示例2：
问题：什么是量子计算？
资料：本知识库包含 Python 和 Web 开发相关内容。
回答：根据现有资料无法回答此问题。
"""

# 2. Chain-of-Thought（复杂推理）
COT_SUFFIX = """
请先分析相关资料，再给出答案。
思考过程：
答案：
"""

# 3. 限制输出长度
LENGTH_CONSTRAINT = "回答控制在 200 字以内，重点突出。"
```

## 防止 Prompt Injection

```python
import re

INJECTION_PATTERNS = [
    r'ignore (all |previous |above )?instructions?',
    r'you are now',
    r'new (system |role |persona)',
    r'<\|.*?\|>',       # special tokens
    r'\[INST\]',        # llama tokens
    r'###\s*(System|Human|Assistant)',
]

def sanitize_input(text: str, max_length: int = 2000) -> str:
    for pattern in INJECTION_PATTERNS:
        text = re.sub(pattern, '[REMOVED]', text, flags=re.IGNORECASE)
    return text[:max_length].strip()
```

## Prompt 版本管理

```python
# prompts/__init__.py
from dataclasses import dataclass

@dataclass
class PromptVersion:
    version: str
    system: str
    user_template: str
    notes: str = ""

PROMPTS: dict[str, PromptVersion] = {
    "rag_v1": PromptVersion(
        version="1.0",
        system=RAG_SYSTEM,
        user_template=RAG_USER,
        notes="基础 RAG 模板",
    ),
    "rag_v2": PromptVersion(
        version="2.0",
        system=RAG_SYSTEM_V2,
        user_template=RAG_USER_V2,
        notes="加入引用来源，改善幻觉问题",
    ),
}

def get_prompt(name: str) -> PromptVersion:
    if name not in PROMPTS:
        raise ValueError(f"Unknown prompt: {name}")
    return PROMPTS[name]
```
