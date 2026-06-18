# TypeScript 详细规范

> 详细技术参考。rules/typescript.md 包含必须遵守的规则和关键模式，本文件提供完整示例。

## 类型系统

### interface vs type
```typescript
// interface：定义对象形状，可扩展
interface User {
  id: string;
  name: string;
  email: string;
}

// type：联合类型、交叉类型、工具类型
type UserRole = 'admin' | 'member' | 'guest';
type UserWithRole = User & { role: UserRole };
type PartialUser = Partial<User>;
```

### 泛型
```typescript
// 好：泛型提高复用性
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// 好：约束泛型
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}
```

### 类型守卫
```typescript
// 优先用类型守卫代替类型断言
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value
  );
}

// 使用
function processEntity(entity: unknown) {
  if (isUser(entity)) {
    console.log(entity.name); // TypeScript 知道这是 User
  }
}
```

### 工具类型
```typescript
// 常用工具类型
Partial<T>      // 所有属性可选
Required<T>     // 所有属性必填
Pick<T, K>      // 选取部分属性
Omit<T, K>      // 排除部分属性
Record<K, V>    // 键值对映射
Readonly<T>     // 所有属性只读
ReturnType<F>   // 函数返回类型
Parameters<F>   // 函数参数类型
```

### 模板字面量类型
```typescript
type EventName = `on${Capitalize<string>}`;
type CSSUnit = `${number}${'px' | 'rem' | 'em' | '%'}`;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiEndpoint = `/api/v1/${string}`;
```

## 错误处理

### 自定义错误类
```typescript
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
  }
}
```

### Result 模式
```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return { ok: false, error: 'Division by zero' };
  return { ok: true, value: a / b };
}
```

## 导入导出规范

```typescript
// 1. 外部库
import { z } from 'zod';
import { Hono } from 'hono';

// 2. 内部模块（绝对路径或别名）
import { UserService } from '@/services/user';
import { AppError } from '@/shared/errors';

// 3. 相对路径
import { formatUser } from './utils';
import type { User } from './types';

// 使用 import type 导入纯类型
import type { User, UserRole } from './types';
```

## 常量断言

```typescript
// as const 使字面量类型收窄
const CONFIG = {
  apiUrl: 'https://api.example.com',
  maxRetries: 3,
  timeout: 5000,
} as const;

// CONFIG.apiUrl 的类型是 'https://api.example.com'（不是 string）
// CONFIG.maxRetries 的类型是 3（不是 number）
```

## 命名规范速查

| 类型 | 规范 | 示例 |
|------|------|------|
| 接口/类型 | PascalCase | `User`, `CreateUserInput` |
| 变量/函数 | camelCase | `getUserById`, `isValid` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 枚举 | PascalCase + PascalCase 成员 | `UserRole.Admin` |
| 泛型参数 | 单大写字母或 PascalCase | `T`, `TEntity` |
| 布尔变量 | is/has/can 前缀 | `isLoading`, `hasPermission` |
