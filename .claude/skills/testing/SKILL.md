---
name: testing
description: 测试全流程，合并了 TDD 工作流和测试策略。覆盖 TDD、单元/集成/E2E、Mock、契约测试、属性测试
---

# Testing

## TDD 核心循环：Red-Green-Refactor

1. **Red** — 写一个定义行为的失败测试
2. **Green** — 写最少代码让测试通过
3. **Refactor** — 保持测试绿色的同时清理代码

每个循环 2-10 分钟。不写没有失败测试的生产代码。

## 测试结构：AAA 模式

```typescript
describe("OrderService", () => {
  it("应该在订单超过阈值时应用折扣", () => {
    // Arrange
    const order = createOrder({ items: [{ price: 150, qty: 1 }] });
    // Act
    const result = applyDiscount(order, { threshold: 100, percent: 10 });
    // Assert
    expect(result.total).toBe(135);
  });
});
```

命名：`describe('功能') > it('应该在[条件]时[行为]')`

## 测试金字塔

| 层级 | 范围 | 速度 | 依赖 | 比例 |
|------|------|------|------|------|
| 单元 | 单函数/类 | <100ms | 无（全部 mock） | 70% |
| 集成 | 模块边界 | <5s | 真实 DB/FS | 20% |
| E2E | 完整用户流 | <30s | 全栈 | 10% |

## Vitest 模式

```typescript
describe("createUser", () => {
  it("应该在邮箱已存在时抛出 DuplicateEmailError", async () => {
    const repo = new InMemoryUserRepo();
    await repo.create({ email: "a@b.com", name: "Alice" });
    const service = new UserService(repo);
    await expect(service.create({ email: "a@b.com", name: "Bob" }))
      .rejects.toThrow(DuplicateEmailError);
  });
});
```

- `vi.fn()` / `vi.mock()` 做 mock
- 优先依赖注入而非模块 mock
- `beforeEach` 共享 setup，不共享可变状态

## 集成测试（Testcontainers）

```typescript
import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container, db;
beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16").start();
  db = await createDatabase(container.getConnectionUri());
  await db.migrate();
}, 60000);
afterAll(async () => { await db.close(); await container.stop(); });

it("创建并查询用户", async () => {
  const user = await db.user.create({ name: "Alice", email: "a@test.com" });
  const found = await db.user.findById(user.id);
  expect(found).toEqual(user);
});
```

## 契约测试（Pact）

```typescript
const provider = new PactV4({ consumer: "OrderService", provider: "UserService" });

it("返回用户信息", async () => {
  await provider.addInteraction()
    .given("user-1 exists")
    .uponReceiving("GET /api/users/user-1")
    .withRequest("GET", "/api/users/user-1")
    .willRespondWith(200, b => b.jsonBody({ id: "user-1", name: "Alice" }))
    .executeTest(async (mock) => {
      const client = new UserClient(mock.url);
      const user = await client.getUser("user-1");
      expect(user.name).toBe("Alice");
    });
});
```

## 属性测试（fast-check）

```typescript
import fc from "fast-check";

it("排序后元素数量不变", () => {
  fc.assert(fc.property(
    fc.array(fc.record({ name: fc.string(), age: fc.nat(120) })),
    (users) => sortUsers(users, "name").length === users.length
  ));
});
```

## Snapshot 测试

```typescript
it("渲染用户卡片", () => {
  const { container } = render(<UserCard user={mockUser} />);
  expect(container).toMatchSnapshot();  // code review 时仔细检查 diff
});
```

## Mock 原则

- 在边界 mock：HTTP 客户端、数据库、文件系统、时钟
- 不 mock 被测单元
- 优先 fakes（内存实现）而非 mocks
- 断言行为，不断言 mock 调用次数
- `afterEach` 重置共享 mock

## 覆盖率

- CI 强制 **80% 行覆盖率**
- 追踪分支覆盖率
- 排除生成代码、类型定义、配置文件
- 不为凑覆盖率写无意义测试

```bash
vitest run --coverage --coverage.thresholds.lines=80 --coverage.thresholds.branches=70 --coverage.thresholds.functions=90
```

## 反模式

- 测试实现细节而非行为
- 测试通过时代码删除了也能过（废话测试）
- 测试间共享可变状态
- 忽略 flaky 测试不修
- 直接测试私有方法
- 巨大的 setup 掩盖测试意图
