#!/usr/bin/env node
// 安全检查 Hook - PreToolUse (Write|Edit)
// 在写代码前检查安全性。严重问题 → exit 2（阻止操作）；中等问题 → exit 0 + 警告。
//
// 用 Node 实现（不依赖 bash / jq），跨平台。Claude Code 通过 stdin 传入 JSON。

import { readFileSync } from 'node:fs';

function readStdin() {
  try {
    return readFileSync(0, 'utf8'); // fd 0 = stdin
  } catch {
    return '';
  }
}

let input;
try {
  input = JSON.parse(readStdin() || '{}');
} catch {
  // 解析失败时放行（不阻断正常操作），但这是异常情况
  process.exit(0);
}

const ti = input.tool_input ?? {};
const filePath = ti.file_path ?? '';
const content = ti.content ?? ti.new_string ?? '';

if (!content) process.exit(0);

// 跳过非代码文件
if (/\.(md|txt|json|yaml|yml|toml|env|gitignore|dockerignore)$/i.test(filePath)) {
  process.exit(0);
}

// 预处理：去除整行注释，减少误报（不动行内 # 以免误伤字符串）
const cleaned = content
  .split('\n')
  .map((line) => {
    if (/^\s*\/\//.test(line)) return '';     // // 行注释
    if (/^\s*#/.test(line)) return '';         // # 行注释
    return line.replace(/\/\*[^*]*\*\//g, ''); // 单行 /* */
  })
  .join('\n');

const critical = [
  // \b 词边界：避免误伤 retrieval / medieval 等含 eval 的标识符
  [/\beval\s*\(/, 'eval 调用 - 可能导致代码注入'],
  [/\bnew\s+Function\s*\(/, 'new Function 调用 - 可能导致代码注入'],
  [/innerHTML\s*=/, 'innerHTML 赋值 - 可能导致 XSS'],
  [/dangerouslySetInnerHTML/, 'dangerouslySetInnerHTML - 可能导致 XSS（除非已 sanitize）'],
  [/os\.system\s*\(/, 'os.system() - 可能导致命令注入'],
  [/child_process\.exec\s*\(/, 'child_process.exec() - 可能命令注入（请用 spawn + 参数数组）'],
  [/__proto__\s*=/, '原型链污染风险'],
  [/constructor\s*\[/, '原型链污染风险'],
];

const warnings = [
  [/(password|secret|api_key|apikey)\s*=\s*['"][^'"]{4,}['"]/i, '可能的硬编码密钥/密码（请用环境变量）'],
  [/(SELECT|INSERT|UPDATE|DELETE)\s+.*\s+(FROM|INTO|SET|WHERE)\s+.*\+\s*/i, '可能的 SQL 字符串拼接（请用参数化查询）'],
  [/(SELECT|INSERT|UPDATE|DELETE)\s+.*`/i, '模板字符串中的 SQL（请用参数化查询）'],
  [/\.exec\s*\(\s*`/, '模板字符串中的 exec() - 可能命令注入'],
];

let criticalCount = 0;
let warningCount = 0;

for (const [re, desc] of critical) {
  if (re.test(cleaned)) {
    console.error(`🔴 [严重] 检测到 ${desc}`);
    criticalCount++;
  }
}

for (const [re, desc] of warnings) {
  if (re.test(cleaned)) {
    console.error(`🟡 [中等] 检测到 ${desc}`);
    warningCount++;
  }
}

// JSON.parse 不在 try 块内时警告
if (/JSON\.parse\s*\(/.test(cleaned) && !/try\s*\{/.test(content)) {
  console.error('🟡 [中等] JSON.parse 接受外部输入时需 try-catch 包裹');
  warningCount++;
}

if (criticalCount > 0) {
  console.error(`\n安全检查发现 ${criticalCount} 个严重问题，操作已被阻止。请修复后重试。`);
  process.exit(2);
}

if (warningCount > 0) {
  console.error(`\n安全检查发现 ${warningCount} 个中等问题，请审查。`);
}

process.exit(0);
