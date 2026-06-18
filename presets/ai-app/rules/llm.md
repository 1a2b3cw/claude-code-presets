# LLM 集成规则（语言无关）

> 具体客户端代码见语言规则：Python 看 `rules/python.md`，TypeScript 看 `rules/typescript-ai.md`。

## 默认裸 SDK —— 反框架立场

**默认直接用厂商 SDK，不引入 LangChain / LlamaIndex 等重框架。**

- Python：`anthropic` SDK
- TypeScript：Vercel AI SDK（`ai` 包，与部署平台无关，可跑在任何 Node 环境）

理由（参考 Anthropic《Building Effective Agents》）：AI 应用真正需要的能力——重试、结构化输出、工具调用循环、流式——几十行就能写清楚。重框架的抽象层会让调试、成本控制、行为预测都变难。少抽象、可控、可调试优先。

**仅在以下场景才考虑重框架**（且需在 spec 里说明理由）：
- 需要大量现成的数据源连接器（几十种文件/SaaS 接入）
- 团队已有 LangChain/LlamaIndex 资产要复用
- 一次性快速原型，用完即弃

## 必须做
- 所有 LLM 调用走统一客户端封装（便于切换模型、注入 tracing）
- 设置合理超时（建议 60s）和最大重试（3 次，指数退避）
- 记录每次调用的 token 用量（input/output）
- 生产环境接入 LLM tracing（LangSmith / Phoenix）
- Prompt 模板版本化管理，不硬编码在业务逻辑里
- 模型 ID 从配置读取，不散落在代码各处

## 禁止做
- 将用户输入直接拼进 Prompt（Prompt Injection 风险，必须先 sanitize）
- 在循环里串行调用 LLM（用并发：Python `asyncio.gather` / TS `Promise.all`）
- 忽略 rate limit 错误（必须退避重试）
- 不设 `max_tokens`（可能产生超长、高成本输出）
- 为了"将来可能用别的框架"提前引入抽象层（YAGNI）

## 模型选型

| 场景 | 推荐模型 | 原因 |
|------|----------|------|
| 结构化提取、分类、摘要 | `claude-haiku-4-5-20251001` | 最快最省钱 |
| RAG 问答、Agent 工具调用 | `claude-sonnet-4-6` | 能力与成本平衡，**首选** |
| 复杂推理、长文档分析 | `claude-opus-4-8` | 最强能力 |
| 嵌入生成 | `text-embedding-3-small` | 成本低，效果好 |
| 中文内容嵌入 | `BGE-M3`（本地 Ollama）| 专门优化中文，零 API 成本 |

## Prompt 模板规范

```
[System] 角色定义 + 行为约束（不做什么）+ 输出格式
[User]   上下文（检索内容）+ 用户问题 + 输出指令
```

RAG 场景的 system prompt 必须包含："只基于参考资料回答，资料不足时明说无法回答，不要编造"。

## 防止 Prompt Injection（原则）

清洗一切进入 prompt 的用户输入：移除角色覆盖类指令（`ignore previous instructions`、`you are now`、special tokens 等），并限制长度。各语言的实现见对应语言规则。

## Agent 相关

见 `rules/agents.md`（同样默认裸 SDK：Python 用 anthropic tool use，TS 用 Vercel AI SDK 的 `tool()` + `generateText`）。
