#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { init } from './lib/init.js';
import { update } from './lib/update.js';

const PRESETS = ['web-fullstack', 'ai-app'];
const LANGS = ['python', 'typescript'];

// 向后兼容：旧预设名 → 新名（3.1.x 用的是 ai-knowledge-base）
const PRESET_ALIASES = { 'ai-knowledge-base': 'ai-app' };

const HELP = `
  create-claude-team — AI 开发团队配置（可插拔预设）

  用法:
    npx create-claude-team init                          初始化（默认 web-fullstack 预设）
    npx create-claude-team init --preset web-fullstack   Web 全栈预设
    npx create-claude-team init --preset ai-app                   AI 应用（默认 Python）
    npx create-claude-team init --preset ai-app --lang typescript AI 应用（TypeScript）
    npx create-claude-team update                        更新到最新版
    npx create-claude-team --help                        显示帮助

  选项:
    --preset   技术栈预设（${PRESETS.join(' | ')}）
    --lang     主语言，仅 ai-app 支持（${LANGS.join(' | ')}，默认 python）
    --force    强制覆盖已存在的 .claude/ 目录
    --dry-run  预览操作，不实际修改文件

  示例:
    cd my-web-app && npx create-claude-team init
    cd my-rag-app && npx create-claude-team init --preset ai-app
    cd my-ts-ai  && npx create-claude-team init --preset ai-app --lang typescript
    npx create-claude-team update
`;

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    preset: { type: 'string', default: 'web-fullstack' },
    lang: { type: 'string' },
    force: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
});

const command = positionals[0];

if (values.help || !command) {
  console.log(HELP);
  process.exit(0);
}

// 解析别名（旧名 → 新名），再校验
const resolvedPreset = PRESET_ALIASES[values.preset] ?? values.preset;
if (resolvedPreset !== values.preset) {
  console.log(`\x1b[33m提示: 预设 "${values.preset}" 已更名为 "${resolvedPreset}"，将使用新名。\x1b[0m`);
}

if (resolvedPreset && !PRESETS.includes(resolvedPreset)) {
  console.error(`\x1b[31m未知预设: ${values.preset}\x1b[0m`);
  console.error(`可用预设: ${PRESETS.join(', ')}`);
  process.exit(1);
}

if (values.lang && !LANGS.includes(values.lang)) {
  console.error(`\x1b[31m未知语言: ${values.lang}\x1b[0m`);
  console.error(`可用语言: ${LANGS.join(', ')}`);
  process.exit(1);
}

try {
  switch (command) {
    case 'init':
      await init({
        preset: resolvedPreset,
        lang: values.lang ?? null,
        force: values.force,
        dryRun: values['dry-run'],
      });
      break;
    case 'update':
      await update({ dryRun: values['dry-run'] });
      break;
    default:
      console.error(`未知命令: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
} catch (err) {
  console.error(`\x1b[31m错误: ${err.message}\x1b[0m`);
  process.exit(1);
}
