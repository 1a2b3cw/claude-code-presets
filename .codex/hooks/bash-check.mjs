#!/usr/bin/env node
// Bash 命令安全检查 Hook - PreToolUse (Bash)
// 拦截危险命令。严重 → exit 2（拒绝）；中等 → exit 0 + 警告。
//
// 用 Node 实现（不依赖 bash / jq），跨平台。

import { readFileSync } from 'node:fs';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let input;
try {
  input = JSON.parse(readStdin() || '{}');
} catch {
  process.exit(0);
}

const command = input.tool_input?.command ?? '';
if (!command) process.exit(0);

// 🔴 严重：命中即拒绝
const blockers = [
  [/rm\s+(-[rRf]+\s+|--recursive\s+.*--force|--force\s+.*--recursive)\s*(\/|~|\$HOME|\*|\.\.?\/?)(\s|$)/, '递归删除根目录/主目录/当前目录'],
  [/rm\s+(-[rR]*f[rR]*|[rR]*-f[rR]*)\s+(\/\*|\/~\/?|\$HOME\/?|\.\.?\/?|~\/\/?)/, '递归删除危险路径'],
  [/git\s+reset\s+--hard/, 'git reset --hard - 将丢失未提交更改'],
  [/git\s+clean\s+-f/, 'git clean -f - 将删除未跟踪文件'],
  [/git\s+checkout\s+--\s+\./, 'git checkout -- . - 将丢弃所有未提交更改'],
  [/npm\s+publish\b/, 'npm publish - 将发布包到 npm registry'],
  // 命令边界（行首或分隔符后）：避免 "git add" 里的 "dd"、"reboot" 子串等误报
  [/(?:^|[\s;&|])(?:dd|mkfs|fdisk)\s/, '磁盘操作命令 (dd/mkfs/fdisk) - 可能数据丢失'],
  [/(?:^|[\s;&|])(?:shutdown|reboot|halt|poweroff)\b/, '系统关机/重启命令'],
];

for (const [re, desc] of blockers) {
  if (re.test(command)) {
    console.error(`🔴 [严重] 检测到 ${desc} - 拒绝执行`);
    process.exit(2);
  }
}

// force push：匹配 --force 但排除 --force-with-lease
if (/git\s+push\s+/.test(command) && /--force/.test(command) && !/--force-with-lease/.test(command)) {
  console.error('🔴 [严重] 检测到 force push - 请确认目标分支（安全做法用 --force-with-lease）');
  process.exit(2);
}

// 🟡 中等：仅警告
const warnings = [
  [/curl\s+.*\|\s*(bash|sh|zsh)/, 'curl | bash 管道 - 可能执行远程脚本'],
  [/wget\s+.*\|\s*(bash|sh|zsh)/, 'wget | bash 管道 - 可能执行远程脚本'],
  [/chmod\s+777/, 'chmod 777 - 过于宽松的权限'],
  [/docker\s+run\s+.*--privileged/, 'Docker 特权模式 - 绕过安全隔离'],
  [/sudo\s+/, 'sudo 命令 - 请确认是否必要'],
  [/rm\s+.*\.env\b/, '删除 .env 文件 - 请确认是否误操作'],
  [/(?:^|[\s;&|])eval\s/, 'eval 执行命令'],
  [/(GITHUB_TOKEN|GH_TOKEN|NPM_TOKEN|AWS_SECRET|DATABASE_URL)\s*=/, '敏感环境变量赋值'],
];

for (const [re, desc] of warnings) {
  if (re.test(command)) {
    console.error(`🟡 [中等] 检测到 ${desc}`);
  }
}

process.exit(0);
