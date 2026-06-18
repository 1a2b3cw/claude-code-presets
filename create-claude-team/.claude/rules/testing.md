# 测试规则（必须遵守）

## 必须做
- AAA 模式（Arrange → Act → Assert）
- 测试命名：`describe('功能') > it('应该在[条件]时[行为]')`
- Mock 外部依赖，不 Mock 被测代码
- 测试文件与源文件同目录，命名为 `*.test.ts`

## 覆盖率目标
- 语句 > 80%，分支 > 70%，函数 > 90%
- 核心业务逻辑：100%

## 必测边界
- 空值 / null / undefined
- 空数组 / 空对象
- 零值 / 负值 / 最大值
- 权限不足

## Mock 模式
```typescript
// Mock 函数
const mockFn = vi.fn();
mockFn.mockResolvedValue({ id: '1' });
mockFn.mockRejectedValue(new Error('fail'));

// Mock 模块
vi.mock('../src/db', () => ({
  db: { user: { findUnique: vi.fn(), create: vi.fn() } },
}));

// 验证调用
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(3);
```

## 测试结构
```typescript
describe('OrderService', () => {
  describe('calculateTotal', () => {
    it('应该计算订单总价', () => {
      // Arrange
      const items = [{ price: 10, quantity: 2 }];
      // Act
      const total = calculateTotal(items);
      // Assert
      expect(total).toBe(20);
    });

    it('应该处理空订单', () => {
      expect(calculateTotal([])).toBe(0);
    });
  });
});
```

## 测试类型
| 类型 | 覆盖 | 工具 |
|------|------|------|
| 单元测试 | 工具函数、业务逻辑 | Vitest |
| 集成测试 | API 端点、数据库操作 | Vitest + supertest |
| E2E 测试 | 核心用户流程 | Playwright |
