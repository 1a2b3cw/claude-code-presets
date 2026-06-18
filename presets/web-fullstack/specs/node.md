# Node.js 详细规范

> 详细技术参考。rules/node.md 包含必须遵守的规则和关键模式，本文件提供完整示例。

## 项目结构

```
src/
├── routes/           # 路由定义（Hono/Express 路由）
│   ├── users.ts
│   ├── auth.ts
│   └── index.ts
├── middleware/        # 中间件
│   ├── auth.ts       # 认证中间件
│   ├── validate.ts   # 请求验证
│   ├── error.ts      # 统一错误处理
│   └── rate-limit.ts # 限流
├── services/         # 业务逻辑
│   ├── user.ts
│   └── auth.ts
├── repositories/     # 数据访问层
│   ├── user.ts
│   └── base.ts       # 通用 CRUD
├── types/            # 类型定义
│   ├── models.ts     # 数据模型
│   ├── api.ts        # API 请求/响应类型
│   └── errors.ts     # 错误类型
├── utils/            # 工具函数
│   ├── crypto.ts
│   ├── logger.ts
│   └── validation.ts
├── config/           # 配置
│   ├── env.ts        # 环境变量验证
│   └── database.ts   # 数据库配置
└── index.ts          # 入口文件
```

## Hono 框架模式

### 路由定义
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const users = new Hono();

// GET /users
users.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? '1');
  const limit = Number(c.req.query('limit') ?? '20');
  const result = await userService.findAll({ page, limit });
  return c.json(result);
});

// GET /users/:id
users.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await userService.findById(id);
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

// POST /users
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

users.post('/', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json');
  const user = await userService.create(data);
  return c.json(user, 201);
});
```

### 中间件
```typescript
// 认证中间件
const authMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyJWT(token);
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// 限流中间件
import { rateLimiter } from 'hono-rate-limiter';

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分钟
  limit: 100, // 每个 IP 最多 100 次
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'unknown',
});
```

### 统一错误处理
```typescript
import { AppError } from '@/types/errors';

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { error: err.code, message: err.message },
      err.statusCode as any
    );
  }

  // 未知错误
  console.error('Unhandled error:', err);
  return c.json(
    { error: 'INTERNAL_ERROR', message: 'Something went wrong' },
    500
  );
});
```

## Prisma ORM 模式

### Schema 定义
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(MEMBER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

enum Role {
  ADMIN
  MEMBER
  GUEST
}
```

### Repository 模式
```typescript
class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async findAll(options: { page: number; limit: number }) {
    const { page, limit } = options;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

### 事务处理
```typescript
// 交互式事务
async function transferBalance(fromId: string, toId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const from = await tx.user.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } },
    });

    if (from.balance < 0) {
      throw new ValidationError('Insufficient balance');
    }

    const to = await tx.user.update({
      where: { id: toId },
      data: { balance: { increment: amount } },
    });

    return { from, to };
  });
}
```

## 环境变量验证

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);
```

## 日志

```typescript
import { pino } from 'pino';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

// 使用
logger.info({ userId: '123', action: 'login' }, 'User logged in');
logger.error({ err, requestId }, 'Failed to process request');
```

## API 响应格式

```typescript
// 统一响应格式
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 成功响应
function success<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return { success: true, data, meta };
}

// 错误响应
function error(code: string, message: string, details?: Record<string, string>): ApiResponse<never> {
  return { success: false, error: { code, message, details } };
}
```

## HTTP 状态码速查

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 成功（GET、PUT、PATCH） |
| 201 | Created | 创建成功（POST） |
| 204 | No Content | 删除成功（DELETE） |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 冲突（如重复创建） |
| 422 | Unprocessable Entity | 业务逻辑错误 |
| 429 | Too Many Requests | 限流 |
| 500 | Internal Server Error | 服务器内部错误 |
