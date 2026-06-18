# Git 工作流规范

## 分支命名
- `main` - 生产分支
- `develop` - 开发分支
- `feature/[功能名]` - 功能分支
- `fix/[问题描述]` - 修复分支
- `hotfix/[紧急修复]` - 紧急修复分支

## Commit Message 格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat` - 新功能
- `fix` - 修复 bug
- `docs` - 文档更新
- `style` - 代码格式（不影响功能）
- `refactor` - 重构
- `test` - 测试
- `chore` - 构建/工具变更

### 示例
```
feat(auth): 添加用户登录功能

- 实现 JWT 认证
- 添加登录 API 端点
- 添加登录表单组件

Closes #123
```

## PR 规范
- 标题简洁明了
- 描述包含：做了什么、为什么做、如何测试
- 关联相关 Issue
- 请求至少一人审查

## 提交前检查
- [ ] 代码已本地测试
- [ ] 无敏感信息（密钥、密码）
- [ ] .gitignore 已更新
- [ ] 相关文档已更新
- [ ] commit message 清晰

## 常用命令
```bash
# 创建功能分支
git checkout -b feature/user-auth

# 提交更改
git add -A
git commit -m "feat(auth): 添加用户认证"

# 推送分支
git push origin feature/user-auth

# 同步主分支
git fetch origin
git rebase origin/main
```
