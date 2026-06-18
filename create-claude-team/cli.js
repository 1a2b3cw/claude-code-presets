#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { init } from './lib/init.js';
import { update } from './lib/update.js';

const HELP = `
  claude-team — AI 全栈开发团队配置

  用法:
    npx create-claude-team init      初始化 .claude/ 配置到当前项目
    npx create-claude-team update    更新 .claude/ 配置到最新版
    npx create-claude-team --help    显示帮助

  选项:
    --force    init 时强制覆盖已存在的 .claude/ 目录
    --dry-run  预览操作，不实际修改文件

  示例:
    cd my-project
    npx create-claude-team init
    npx create-claude-team init --force
    npx create-claude-team update
`;

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
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

try {
  switch (command) {
    case 'init':
      await init({ force: values.force, dryRun: values['dry-run'] });
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
