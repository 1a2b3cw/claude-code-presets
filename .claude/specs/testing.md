# 测试详细规范

> 详细技术参考。rules/testing.md 包含必须遵守的规则和关键模式，本文件提供完整示例。

## Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // 或 'jsdom' 测试前端
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 90,
      },
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
```

## 单元测试模式

### 工具函数
```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency, parseDate, slugify } from './utils';

describe('formatCurrency', () => {
  it('应该格式化正数', () => {
    expect(formatCurrency(1234.56)).toBe('¥1,234.56');
  });

  it('应该处理零值', () => {
    expect(formatCurrency(0)).toBe('¥0.00');
  });

  it('应该处理负数', () => {
    expect(formatCurrency(-100)).toBe('-¥100.00');
  });

  it('应该处理精度问题', () => {
    expect(formatCurrency(0.1 + 0.2)).toBe('¥0.30');
  });
});

describe('slugify', () => {
  it('应该转换为空格分隔的小写字符串', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('应该移除特殊字符', () => {
    expect(slugify('Hello! @World#')).toBe('hello-world');
  });

  it('应该处理空字符串', () => {
    expect(slugify('')).toBe('');
  });

  it('应该处理中文', () => {
    expect(slugify('你好世界')).toBe('你好世界');
  });
});
```

### 业务逻辑
```typescript
import { describe, it, expect, vi } from 'vitest';
import { OrderService } from './order';
import { ProductRepository } from '../repositories/product';

// Mock 依赖
vi.mock('../repositories/product');

describe('OrderService', () => {
  describe('calculateTotal', () => {
    it('应该计算订单总价', () => {
      const items = [
        { price: 10, quantity: 2 },
        { price: 20, quantity: 1 },
      ];
      expect(OrderService.calculateTotal(items)).toBe(40);
    });

    it('应该处理空订单', () => {
      expect(OrderService.calculateTotal([])).toBe(0);
    });

    it('应该应用折扣', () => {
      const items = [{ price: 100, quantity: 1 }];
      expect(OrderService.calculateTotal(items, 0.1)).toBe(90);
    });
  });

  describe('createOrder', () => {
    it('应该在库存不足时抛出错误', async () => {
      const mockRepo = {
        findById: vi.fn().mockResolvedValue({ id: '1', stock: 0 }),
      };
      const service = new OrderService(mockRepo);

      await expect(
        service.createOrder({ productId: '1', quantity: 1 })
      ).rejects.toThrow('Insufficient stock');
    });
  });
});
```

## 集成测试模式

### API 测试
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app';
import { db } from '../src/db';

describe('Users API', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /api/users', () => {
    it('应该创建用户', async () => {
      const res = await app.request('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data).toMatchObject({
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(body.data.password).toBeUndefined(); // 不返回密码
    });

    it('应该拒绝重复邮箱', async () => {
      const res = await app.request('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Another User',
          email: 'test@example.com', // 已存在
          password: 'password123',
        }),
      });

      expect(res.status).toBe(409);
    });

    it('应该验证输入', async () => {
      const res = await app.request('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '', // 空名字
          email: 'invalid-email',
          password: '123', // 太短
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.details).toBeDefined();
    });
  });
});
```

### 数据库测试
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db';
import { UserRepository } from '../src/repositories/user';

describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(async () => {
    await db('users').truncate();
    repo = new UserRepository(db);
  });

  it('应该创建并查询用户', async () => {
    const user = await repo.create({
      name: 'Test',
      email: 'test@example.com',
    });

    const found = await repo.findById(user.id);
    expect(found).toMatchObject({
      name: 'Test',
      email: 'test@example.com',
    });
  });

  it('应该分页查询', async () => {
    // 创建 25 个用户
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        repo.create({ name: `User ${i}`, email: `user${i}@example.com` })
      )
    );

    const page1 = await repo.findAll({ page: 1, limit: 10 });
    expect(page1.items).toHaveLength(10);
    expect(page1.total).toBe(25);
    expect(page1.totalPages).toBe(3);

    const page3 = await repo.findAll({ page: 3, limit: 10 });
    expect(page3.items).toHaveLength(5);
  });
});
```

## Mock 策略

### Mock 函数
```typescript
// 创建 Mock
const mockFn = vi.fn();

// 配置返回值
mockFn.mockReturnValue('fixed');
mockFn.mockResolvedValue({ id: '1' });
mockFn.mockRejectedValue(new Error('fail'));

// 配置不同调用返回不同值
mockFn
  .mockResolvedValueOnce({ id: '1' })
  .mockResolvedValueOnce({ id: '2' });

// 验证调用
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(3);
```

### Mock 模块
```typescript
// Mock 整个模块
vi.mock('../src/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// 部分 Mock
vi.mock('../src/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    formatDate: vi.fn(() => '2024-01-01'), // 只 mock 这个函数
  };
});
```

### Mock 环境变量
```typescript
// 方式 1：vi.stubEnv
vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('DATABASE_URL', 'sqlite::memory:');

// 方式 2：直接修改
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv, NODE_ENV: 'test' };
});
afterEach(() => {
  process.env = originalEnv;
});
```

## 测试工具

### React Testing Library
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('应该提交表单', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('应该显示错误信息', async () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });
});
```

### Playwright E2E
```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('应该成功登录', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome')).toBeVisible();
  });

  test('应该显示错误提示', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});
```

## 覆盖率目标

| 指标 | 目标 | 核心业务 |
|------|------|----------|
| 语句覆盖率 | > 80% | 100% |
| 分支覆盖率 | > 70% | 100% |
| 函数覆盖率 | > 90% | 100% |
| 行覆盖率 | > 80% | 100% |

## 测试文件组织

```
src/
├── features/
│   └── auth/
│       ├── login.ts
│       ├── login.test.ts        # 与源文件同目录
│       ├── auth-service.ts
│       └── auth-service.test.ts
└── shared/
    └── utils/
        ├── format.ts
        └── format.test.ts

# 或者用 __tests__ 目录
src/
├── features/
│   └── auth/
│       ├── login.ts
│       ├── auth-service.ts
│       └── __tests__/
│           ├── login.test.ts
│           └── auth-service.test.ts
```
