# React 详细规范

> 详细技术参考。rules/react.md 包含必须遵守的规则和关键模式，本文件提供完整示例。

## 组件模式

### 容器/展示分离
```typescript
// 展示组件：纯 UI，不关心数据来源
interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <button onClick={() => onEdit(user.id)}>Edit</button>
      <button onClick={() => onDelete(user.id)}>Delete</button>
    </div>
  );
}

// 容器组件：处理数据逻辑
function UserListContainer() {
  const { data: users, isLoading } = useUsers();
  const { mutate: deleteUser } = useDeleteUser();

  if (isLoading) return <Skeleton />;
  if (!users?.length) return <EmptyState />;

  return (
    <UserList
      users={users}
      onEdit={(id) => navigate(`/users/${id}/edit`)}
      onDelete={(id) => deleteUser(id)}
    />
  );
}
```

### 复合组件
```typescript
// 通过 Context 共享状态
const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (id: string) => void;
} | null>(null);

function Tabs({ children, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

Tabs.Panel = function TabPanel({ id, children }: TabPanelProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab.Panel must be used within Tabs');
  return ctx.activeTab === id ? <div>{children}</div> : null;
};

// 使用
<Tabs defaultTab="profile">
  <Tabs.Trigger id="profile">Profile</Tabs.Trigger>
  <Tabs.Trigger id="settings">Settings</Tabs.Trigger>
  <Tabs.Panel id="profile"><ProfileForm /></Tabs.Panel>
  <Tabs.Panel id="settings"><SettingsForm /></Tabs.Panel>
</Tabs>
```

## Hooks 模式

### 自定义 Hook
```typescript
// 数据获取 Hook
function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.findById(userId),
    staleTime: 5 * 60 * 1000, // 5 分钟
  });
}

// 表单 Hook
function useForm<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const setValue = <K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
    // 清除该字段的错误
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
  };

  return { values, errors, setValue, setErrors, reset };
}

// 副作用 Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### Hook 规则
```typescript
// ❌ 不能在条件语句中调用 Hook
function BadComponent({ condition }: { condition: boolean }) {
  if (condition) {
    const [state, setState] = useState(0); // 错误！
  }
}

// ❌ 不能在循环中调用 Hook
function BadComponent({ items }: { items: string[] }) {
  items.forEach(item => {
    const [state, setState] = useState(item); // 错误！
  });
}

// ✅ 正确用法
function GoodComponent({ condition }: { condition: boolean }) {
  const [state, setState] = useState(0); // 始终调用
  // ...
}
```

## 性能优化

### memo + useMemo + useCallback
```typescript
// 纯展示组件用 memo
const UserCard = memo(function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div>
      <h3>{user.name}</h3>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  );
});

// 昂贵计算用 useMemo
function UserStats({ users }: { users: User[] }) {
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.isActive).length,
    avgAge: users.reduce((sum, u) => sum + u.age, 0) / users.length,
  }), [users]);

  return <div>{stats.total} users, {stats.active} active</div>;
}

// 传递给子组件的回调用 useCallback
function UserList({ users }: { users: User[] }) {
  const handleEdit = useCallback((id: string) => {
    navigate(`/users/${id}/edit`);
  }, []);

  return users.map(user => (
    <UserCard key={user.id} user={user} onEdit={handleEdit} />
  ));
}
```

### 虚拟滚动
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.key} style={{
            position: 'absolute',
            top: `${virtualRow.start}px`,
            height: `${virtualRow.size}px`,
          }}>
            {items[virtualRow.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 状态管理选型

| 场景 | 方案 | 示例 |
|------|------|------|
| 表单状态 | `useState` | 登录表单、搜索框 |
| 跨组件共享 | `useContext` + `useReducer` | 主题、语言 |
| 复杂全局状态 | Zustand | 用户认证、购物车 |
| 服务端状态 | TanStack Query | API 数据、缓存 |
| URL 状态 | `useSearchParams` | 筛选、分页、排序 |

## 条件渲染模式

```tsx
// 早返回（最清晰）
function UserProfile({ user }: { user?: User }) {
  if (!user) return <LoginPrompt />;
  if (user.isBanned) return <BannedNotice />;
  return <ProfileContent user={user} />;
}

// 三元运算符（简单二选一）
{isEditing ? <EditForm /> : <ReadOnlyView />}

// && 运算符（条件显示）
{hasPermission && <AdminPanel />}

// 复杂条件用变量
const content = (() => {
  switch (status) {
    case 'loading': return <Skeleton />;
    case 'error': return <ErrorMessage error={error} />;
    case 'empty': return <EmptyState />;
    default: return <DataView data={data} />;
  }
})();
```
