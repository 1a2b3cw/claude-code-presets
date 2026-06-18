# LLM 评估框架

评估 RAG 系统的检索质量和答案质量。

## 使用时机

- 修改分块策略/嵌入模型后验证效果
- 生产前做全面质量评估
- 定期监控线上系统质量退化

## 评估维度

| 维度 | 含义 | 评估方式 |
|------|------|----------|
| **Retrieval Precision** | 检索到的文档有多少是相关的 | 人工标注 or LLM 打分 |
| **Retrieval Recall** | 相关文档有多少被检索到 | 需要 ground truth |
| **Answer Faithfulness** | 答案是否完全基于检索内容 | LLM 打分 |
| **Answer Relevance** | 答案是否回答了问题 | LLM 打分 |
| **Latency P95** | 端到端响应时间 | 性能测试 |

## 评估数据集构建

```python
# evaluation/dataset.py
from dataclasses import dataclass

@dataclass
class EvalCase:
    question: str
    expected_answer: str           # 参考答案
    relevant_doc_ids: list[str]    # 应该检索到的文档 ID

# 构建方式（二选一）：
# 1. 人工编写（最准确，但费时）
# 2. 用 LLM 从文档自动生成问题（快速，但有偏差）

async def generate_eval_dataset(chunks: list[Chunk], n: int = 50) -> list[EvalCase]:
    cases = []
    for chunk in random.sample(chunks, n):
        prompt = f"基于以下内容生成一个问题和答案：\n\n{chunk.content}"
        result = await llm.generate(prompt)
        # parse result into EvalCase
        cases.append(parse_qa(result, chunk))
    return cases
```

## 评估执行

```python
# evaluation/runner.py
import time
from statistics import mean

class RAGEvaluator:
    async def evaluate(self, cases: list[EvalCase]) -> EvalReport:
        results = []
        latencies = []

        for case in cases:
            start = time.perf_counter()
            retrieved = await retrieve(case.question)
            answer = await generate_answer(case.question, retrieved)
            latency = time.perf_counter() - start

            result = EvalResult(
                question=case.question,
                answer=answer,
                retrieved_ids=[c.id for c in retrieved],
                latency=latency,
                precision=self._calc_precision(retrieved, case.relevant_doc_ids),
                faithfulness=await self._eval_faithfulness(answer, retrieved),
                relevance=await self._eval_relevance(case.question, answer),
            )
            results.append(result)
            latencies.append(latency)

        return EvalReport(
            precision=mean(r.precision for r in results),
            faithfulness=mean(r.faithfulness for r in results),
            relevance=mean(r.relevance for r in results),
            latency_p95=sorted(latencies)[int(len(latencies) * 0.95)],
            total_cases=len(cases),
        )

    async def _eval_faithfulness(self, answer: str, chunks: list[Chunk]) -> float:
        context = "\n".join(c.content for c in chunks)
        prompt = f"""判断以下答案是否完全基于给定的上下文（不包含上下文之外的信息）。
上下文：{context}
答案：{answer}
输出 0.0-1.0 的分数（1.0=完全基于上下文）："""
        score_str = await llm.generate(prompt, max_tokens=10)
        return float(score_str.strip())
```

## CI 集成（PR 触发评估）

```yaml
# .github/workflows/eval.yml
- name: Run RAG evaluation
  run: python -m evaluation.runner --threshold-precision 0.8 --threshold-faithfulness 0.9
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## 目标阈值

```python
EVAL_THRESHOLDS = {
    "precision": 0.80,      # 检索精度
    "faithfulness": 0.90,   # 忠实度（关键，防幻觉）
    "relevance": 0.85,      # 相关性
    "latency_p95": 3.0,     # 秒
}
```
