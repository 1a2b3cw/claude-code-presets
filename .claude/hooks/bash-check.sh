#!/bin/bash
# Bash 命令安全检查 Hook - PreToolUse
# 检查 Bash 工具执行的危险命令

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

if [ -z "$command" ]; then
  exit 0
fi

issues=0

# 🔴 严重：不可逆破坏
if echo "$command" | grep -qE 'rm\s+(-[rRf]+\s+|--recursive\s+.*--force|--force\s+.*--recursive)\s*(/|~|\$HOME|\*|\.\.?/?)(\s|$)'; then
  echo "🔴 [严重] 检测到递归删除根目录/主目录/当前目录 - 拒绝执行"
  exit 2
fi

# 补充：rm -rf 变体（通配符、末尾斜杠、大写 R 等）
if echo "$command" | grep -qE 'rm\s+(-[rR]*f[rR]*|[rR]*-f[rR]*)\s+(/\*|/~/?|\$HOME/?|\.\.?/?|~//?)'; then
  echo "🔴 [严重] 检测到递归删除危险路径 - 拒绝执行"
  exit 2
fi

# force push 检测：先匹配 --force，再排除 --force-with-lease
if echo "$command" | grep -qE 'git\s+push\s+'; then
  if echo "$command" | grep -qE '\-\-force'; then
    if ! echo "$command" | grep -qE '\-\-force-with-lease'; then
      echo "🔴 [严重] 检测到 force push - 请确认目标分支（如需安全 force push，请使用 --force-with-lease）"
      exit 2
    fi
  fi
fi

if echo "$command" | grep -qE 'git\s+reset\s+--hard'; then
  echo "🔴 [严重] 检测到 git reset --hard - 将丢失未提交的更改"
  exit 2
fi

if echo "$command" | grep -qE 'git\s+clean\s+-f'; then
  echo "🔴 [严重] 检测到 git clean -f - 将删除未跟踪文件"
  exit 2
fi

if echo "$command" | grep -qE 'git\s+checkout\s+--\s+\.'; then
  echo "🔴 [严重] 检测到 git checkout -- . - 将丢弃所有未提交更改"
  exit 2
fi

if echo "$command" | grep -qE 'npm\s+publish\b'; then
  echo "🔴 [严重] 检测到 npm publish - 将发布包到 npm registry"
  exit 2
fi

if echo "$command" | grep -qE '(dd|mkfs|fdisk)\s+'; then
  echo "🔴 [严重] 检测到磁盘操作命令 (dd/mkfs/fdisk) - 可能导致数据丢失"
  exit 2
fi

if echo "$command" | grep -qE 'shutdown|reboot|halt|poweroff'; then
  echo "🔴 [严重] 检测到系统关机/重启命令"
  exit 2
fi

# 🟡 中等：需要审查
if echo "$command" | grep -qE 'curl\s+.*\|\s*(bash|sh|zsh)'; then
  echo "🟡 [中等] 检测到 curl | bash 管道 - 可能执行远程脚本"
fi

if echo "$command" | grep -qE 'chmod\s+777'; then
  echo "🟡 [中等] 检测到 chmod 777 - 过于宽松的权限"
fi

if echo "$command" | grep -qE 'docker\s+run\s+.*--privileged'; then
  echo "🟡 [中等] 检测到 Docker 特权模式 - 绕过安全隔离"
fi

if echo "$command" | grep -qE 'wget\s+.*\|\s*(bash|sh|zsh)'; then
  echo "🟡 [中等] 检测到 wget | bash 管道 - 可能执行远程脚本"
fi

if echo "$command" | grep -qE 'sudo\s+'; then
  echo "🟡 [中等] 检测到 sudo 命令 - 请确认是否必要"
fi

if echo "$command" | grep -qE 'rm\s+.*\.env\b'; then
  echo "🟡 [中等] 检测到删除 .env 文件 - 请确认是否误操作"
fi

if echo "$command" | grep -qE 'eval\s+'; then
  echo "🟡 [中等] 检测到 eval 执行命令"
fi

if echo "$command" | grep -qE '(GITHUB_TOKEN|GH_TOKEN|NPM_TOKEN|AWS_SECRET|DATABASE_URL)\s*='; then
  echo "🟡 [中等] 检测到敏感环境变量赋值"
fi

exit 0
