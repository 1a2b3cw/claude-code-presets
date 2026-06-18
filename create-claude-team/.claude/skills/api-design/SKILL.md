---
name: api-design
description: API 设计全栈技能，合并了认证授权模式。覆盖 REST 设计、认证、授权、分页、版本控制
---

# API Design（含认证授权）

## RESTful 设计

### 资源命名
- 复数名词：`/users`、`/orders`
- 关系嵌套：`/users/{id}/orders`，最多 2 层
- kebab-case：`/user-profiles`
- URL 不放动词：`POST /users/{id}/activation`（非 `/activate`）

### HTTP 方法
| 方法 | 用途 | 幂等 | 成功码 |
|------|------|------|--------|
| GET | 读取 | 是 | 200 |
| POST | 创建 | 否 | 201 |
| PUT | 全量替换 | 是 | 200 |
| PATCH | 部分更新 | 否 | 200 |
| DELETE | 删除 | 是 | 204 |

### 状态码
```
200/201/204 — 成功
400 — 验证错误（含字段级错误）
401 — 未认证
403 — 已认证无权限
404 — 资源不存在
409 — 状态冲突
422 — 语义无效
429 — 限流（含 Retry-After）
500 — 服务器错误（不暴露堆栈）
```

### 错误格式
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field": "email", "message": "..." }] } }
```

## 分页

### Cursor（推荐）
```
GET /users?limit=20&cursor=eyJpZCI6MTAwfQ
→ { "data": [...], "pagination": { "next_cursor": "...", "has_more": true } }
```
大数据集用 cursor，编码为不透明 base64。

### Offset（简单场景）
```
GET /users?page=3&per_page=20
→ { "data": [...], "pagination": { "page": 3, "total": 245 } }
```

## 过滤和排序
```
GET /orders?status=pending&sort=-created_at,+total
GET /users?search=john&fields=id,name,email
```

## 版本控制
- URL 路径版本：`/api/v1/users`
- 已发布版本不破坏性变更（只加不删）
- 新必填字段 = 新版本
- `Sunset` header + 6 个月通知废弃
- 最多同时维护 2 个活跃版本

## 认证（AuthN）

### JWT 模式
```typescript
// 生成：短 access token (15m) + 长 refresh token (7d)
const accessToken = jwt.sign({ sub: user.id, roles: user.roles }, secret, { expiresIn: "15m" });
const refreshToken = jwt.sign({ sub: user.id, tokenVersion: user.tokenVersion }, refreshSecret, { expiresIn: "7d" });

// 验证：检查 iss、aud、exp
const payload = jwt.verify(token, publicKey, { algorithms: ["RS256"], issuer: "auth.example.com" });
```

- Refresh token 存 HTTP-only + Secure + SameSite cookie
- 密码用 bcrypt/argon2（不用 MD5/SHA）
- 支持 token 撤销（版本计数器或黑名单）

### OAuth2 + PKCE（公开客户端）
```typescript
const verifier = crypto.randomBytes(32).toString("base64url");
const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
// redirect → callback → exchange code + verifier → session
```

## 授权（AuthZ）

### RBAC
```typescript
const ROLE_PERMISSIONS = {
  viewer: [{ resource: "posts", action: "read" }],
  editor: [{ resource: "posts", action: "create" }, { resource: "posts", action: "read" }, ...],
  admin: [{ resource: "*", action: "*" }],
};

function hasPermission(roles, resource, action) {
  return roles.some(r => ROLE_PERMISSIONS[r]?.some(p =>
    (p.resource === resource || p.resource === "*") && (p.action === action || p.action === "*")
  ));
}
```

### 中间件
```typescript
app.get("/admin/users", authenticate, authorize("admin"), listUsers);
```

## 输入验证
```typescript
const schema = z.object({ email: z.string().email().max(255), age: z.number().int().min(13) });
const result = schema.safeParse(req.body);
if (!result.success) return res.status(400).json({ error: { details: result.error.flatten() } });
```

## Rate Limiting
- 按用户+端点限流
- 滑动窗口算法
- 认证端点更严格：5次/15分钟
- 健康检查豁免

## OpenAPI
- 先写 spec 再实现
- `$ref` 复用 schema
- 每个端点写 examples
- 从 spec 生成 SDK

## Headers
```
Authorization: Bearer <token>
X-Request-Id: <uuid>
X-RateLimit-Limit/Remaining/Reset
Content-Type: application/json
```
