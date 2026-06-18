# Node.js 规则（必须遵守）

## 必须做
- ES Modules（import/export）
- async/await，不用回调
- 验证所有用户输入（Zod）
- 参数化查询，禁止 SQL 拼接
- 环境变量用 `.env`，不提交到 Git
- 结构化日志（JSON），不记录敏感信息

## 禁止做
- `os.system()` / `child_process.exec()`（用 spawn + 参数数组）
- 硬编码密钥/密码
- 吞掉错误（catch 块必须处理或重新抛出）
- `JSON.parse()` 不加 try-catch（处理不可信输入时）

## 环境变量验证
```typescript
import { z } from 'zod';
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});
export const env = envSchema.parse(process.env);
```

## API 响应格式
```typescript
// 统一格式
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, string> };
  meta?: { page: number; limit: number; total: number; totalPages: number };
}
```

## HTTP 状态码
| 码 | 含义 | 场景 |
|----|------|------|
| 200 | OK | 成功（GET/PUT/PATCH） |
| 201 | Created | 创建成功（POST） |
| 204 | No Content | 删除成功（DELETE） |
| 400 | Bad Request | 参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 不存在 |
| 409 | Conflict | 冲突（重复创建） |
| 429 | Too Many Requests | 限流 |

## 错误处理
```typescript
class AppError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
  }
}
// 中间件统一捕获，AppError 返回对应状态码，未知错误返回 500
```
