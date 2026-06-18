#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { init } from './lib/init.js';
import { update } from './lib/update.js';

const PRESETS = ['web-fullstack', 'ai-knowledge-base'];
const LANGS = ['python', 'typescript'];

const HELP = `
  create-claude-team — AI 开发团队配置（可插拔预设）

  用法:
    npx create-claude-team init                          初始化（默认 web-fullstack 预设）
    npx create-claude-team init --preset web-fullstack   Web 全栈预设
    npx create-claude-team init --preset ai-knowledge-base                   AI 应用（默认 Python）
    npx create-claude-team init --preset ai-knowledge-base --lang typescript AI 应用（TypeScript）
    npx create-claude-team update                        更新到最新版
    npx create-claude-team --help                        显示帮助

  选项:
    --preset   技术栈预设（${PRESETS.join(' | ')}）
    --lang     主语言，仅 ai-knowledge-base 支持（${LANGS.join(' | ')}，默认 python）
    --force    强制覆盖已存在的 .claude/ 目录
    --dry-run  预览操作，不实际修改文件

  示例:
    cd my-web-app && npx create-claude-team init
    cd my-rag-app && npx create-claude-team init --preset ai-knowledge-base
    cd my-ts-ai  && npx create-claude-team init --preset ai-knowledge-base --lang typescript
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

if (values.preset && !PRESETS.includes(values.preset)) {
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
        preset: values.preset,
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
