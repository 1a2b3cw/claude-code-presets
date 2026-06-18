# AI Agent 开发规则

## 必须做

- 所有智能体循环必须设置 `max_iterations`（默认 10，不超过 20）
- 每次工具调用必须记录日志：工具名、参数摘要、返回结果摘要
- 工具内部用 Pydantic 验证输入参数，不信任 LLM 生成的参数
- 涉及写操作的工具（删除、发送、修改）必须在描述中明确标注副作用
- 工具返回值超过 2000 字时必须截断或摘要

## 禁止做

- 不设上限的 `while True` 智能体循环
- 在工具内部再次调用 LLM（会导致不可预测的递归，用 Orchestrator-Worker 代替）
- 将原始用户输入直接作为工具参数（必须先验证和清洗）
- 忽略 `stop_reason`（必须处理 `end_turn`、`tool_use`、`max_tokens` 三种情况）

## 工具设计规范

```python
# 工具描述模板
{
    "name": "tool_name",
    "description": "一句话说明功能。何时用，何时不用（重要）。副作用：[写/读]。",
    "input_schema": {
        "type": "object",
        "properties": {
            "param": {
                "type": "string",
                "description": "详细说明，包括格式要求和示例",
            }
        },
        "required": ["param"],
    },
}
```

## 错误处理

```python
async def execute_tool(name: str, inputs: dict) -> str:
    try:
        result = await _execute(name, inputs)
        # 截断过长返回值
        return result[:2000] if len(result) > 2000 else result
    except ValidationError as e:
        return f"参数验证失败：{e.errors()[0]['msg']}。请检查参数格式。"
    except TimeoutError:
        return f"工具 {name} 执行超时（30s）。请简化请求或稍后重试。"
    except Exception as e:
        logger.error("tool_failed", tool=name, error=str(e))
        return f"工具执行失败：{type(e).__name__}。错误已记录。"
```

## 安全要求

- 代码执行工具必须在隔离沙箱中运行（不能访问主机文件系统和网络）
- 文件操作工具必须限制在项目目录内（路径遍历防护）
- Agent 不得自行修改自身的系统提示或工具配置
- 高权限工具（删除、发送消息）默认要求用户确认（HITL）
