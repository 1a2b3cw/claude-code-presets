# TypeScript 规则（必须遵守）

## 必须做
- 使用 `interface` 定义对象形状，`type` 定义联合/交叉类型
- 不使用 `any`，必要时用 `unknown`
- 使用自定义错误类继承 `Error`
- 使用 `import type` 导入纯类型
- 使用命名导出，不用默认导出
- 布尔变量用 `is/has/can` 前缀

## 禁止做
- `any` 类型（除非有充分理由并注释说明）
- `as` 类型断言（优先用类型守卫）
- `require()` / `module.exports`（使用 ES Modules）

## 命名规范
| 类型 | 规范 | 示例 |
|------|------|------|
| 接口/类型 | PascalCase | `User`, `CreateUserInput` |
| 变量/函数 | camelCase | `getUserById`, `isValid` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 枚举 | PascalCase + PascalCase 成员 | `UserRole.Admin` |

## 错误处理模式
```typescript
// 自定义错误类
class AppError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
  }
}

// 类型守卫代替类型断言
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value && 'email' in value;
}
```

## 常用工具类型
`Partial<T>` / `Required<T>` / `Pick<T, K>` / `Omit<T, K>` / `Record<K, V>` / `Readonly<T>` / `ReturnType<F>`

## 导入顺序
1. 外部库（`import { z } from 'zod'`）
2. 内部模块（`import { UserService } from '@/services/user'`）
3. 相对路径（`import { formatUser } from './utils'`）
4. 类型导入（`import type { User } from './types'`）
