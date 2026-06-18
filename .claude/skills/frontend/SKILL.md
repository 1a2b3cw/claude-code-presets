---
name: frontend
description: 前端全栈技能，合并了 React 模式、Next.js 专项、性能优化、组件设计
---

# Frontend

## Server Components（默认）

```tsx
// Server Component — 直接访问数据库，零 JS 发送到客户端
async function ProductsPage() {
  const products = await db.product.findMany({ where: { active: true } });
  return (
    <main>
      <h1>Products</h1>
      <ProductList products={products} />
      <AddToCartButton />  {/* Client Component */}
    </main>
  );
}
```

规则：
- `'use client'` 只放在交互组件文件顶部，推到树的最深层
- Server → Client 传递可序列化 props（无函数、无类）
- 数据获取优先在 Server Component 完成

## React 19 新特性

### use() Hook
```tsx
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);  // 可在条件/循环中调用
  return <h1>{user.name}</h1>;
}
```

### Server Actions
```tsx
'use server';
export async function createPost(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  await db.post.create({ data: parsed.data });
  revalidatePath('/posts');
}
```

### useActionState + useOptimistic
```tsx
const [state, formAction, isPending] = useActionState(createUser, { errors: {} });
const [optimisticCount, addOptimistic] = useOptimistic(count);
```

## Next.js App Router

```
app/
  layout.tsx              # 根布局
  page.tsx                # 首页
  loading.tsx             # Suspense fallback
  error.tsx               # Error Boundary
  (marketing)/            # 路由组（不影响 URL）
    about/page.tsx
  dashboard/
    @analytics/page.tsx   # 并行路由
    @activity/page.tsx
  api/webhooks/route.ts   # Route Handler
```

### ISR + 缓存
```tsx
export const revalidate = 3600;
const posts = await fetch("https://api.example.com/posts", {
  next: { revalidate: 3600, tags: ["posts"] },
});
// 变更后：revalidateTag("posts") / revalidatePath("/blog")
```

### Middleware
```typescript
export function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  if (request.nextUrl.pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
// 保持轻量：只做 auth/redirect/header，不放重逻辑
```

## Streaming SSR + Suspense

```tsx
<Suspense fallback={<ChartSkeleton />}>
  <AnalyticsChart />  {/* 独立流式传输 */}
</Suspense>
```

每个 Suspense 边界独立流式。围绕数据获取组件放置边界。

## 性能优化

### Core Web Vitals
| 指标 | Good | Poor |
|------|------|------|
| LCP | <2.5s | >4.0s |
| INP | <200ms | >500ms |
| CLS | <0.1 | >0.25 |

### 图片优化
```tsx
<Image src="/hero.jpg" alt="描述" width={1200} height={630}
  priority sizes="(max-width: 768px) 100vw, 50vw" placeholder="blur" blurDataURL={base64} />
```

### 代码分割
- 路由边界（Next.js 自动）
- 条件渲染组件（modal、admin panel）
- 重型库（chart、editor、map）
- `dynamic(() => import(...), { ssr: false })`

### Bundle 优化
- `optimizePackageImports: ['lucide-react', 'lodash-es']`
- 替换 moment → date-fns/dayjs（省 ~200KB）
- 按需导入：`import { debounce } from 'lodash-es/debounce'`
- CSS 动画优先于 JS 动画

### 字体加载
```tsx
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
```
最多 2 个字体族，用 `next/font` 自托管。

## 组件模式

### Hooks
```tsx
// 自定义 Hook：以 use 开头，单一关注点
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

### 复合组件
```tsx
<Tabs>
  <Tabs.Tab index={0}>Profile</Tabs.Tab>
  <Tabs.Panel index={0}><ProfileForm /></Tabs.Panel>
</Tabs>
```

### 性能规则
- JSX props 中避免创建对象/数组
- `React.memo` 仅在 profiling 确认后使用
- `useMemo`/`useCallback` 用于昂贵计算或传给 memo 子组件的引用
- 状态就近使用，避免超过 2 层的 prop drilling

## 反模式
- 顶层 layout/page 加 `'use client'`
- 能在 Server Component 做的数据获取放到客户端
- 用 `useEffect` 获取数据代替 Server Component
- 不用 `<Suspense>` 包裹慢组件
- middleware 放重逻辑
- 忽略 `loading.tsx` / `error.tsx` 约定
