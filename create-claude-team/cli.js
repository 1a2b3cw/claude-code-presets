#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { init } from './lib/init.js';
import { update } from './lib/update.js';
import { validateProject } from './lib/validate.js';
import {
  getAvailableLanguages,
  getDefaultPreset,
  readPresetCatalog,
  resolvePresetName,
} from './lib/presets.js';

const PRESETS = readPresetCatalog();
const PRESET_NAMES = PRESETS.map((preset) => preset.name);
const DEFAULT_PRESET = getDefaultPreset(PRESETS);
const LANGS = getAvailableLanguages(PRESETS);
const presetUsage = PRESETS.map((preset) => (
  `    npx create-claude-team init --preset ${preset.name.padEnd(14)} ${preset.help}`
)).join('\n');
const presetExamples = PRESETS.flatMap((preset) => preset.examples ?? []).map((example) => (
  `    ${example}`
)).join('\n');

const HELP = `
  create-claude-team — AI 开发团队配置（Claude Code + Codex，可插拔预设）

  用法:
    npx create-claude-team init                          初始化（默认 ${DEFAULT_PRESET} 预设）
${presetUsage}
    npx create-claude-team update                        更新到最新版
    npx create-claude-team validate                      校验配置完整性
    npx create-claude-team --help                        显示帮助

  选项:
    --preset   技术栈预设（${PRESET_NAMES.join(' | ')}）
    --lang     语言变体（${LANGS.join(' | ') || '无'}）
    --force    强制覆盖已存在的 .claude/ 目录，并重新同步 Codex 入口
    --dry-run  预览操作，不实际修改文件

  示例:
${presetExamples}
    npx create-claude-team update
    npx create-claude-team validate
`;

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    preset: { type: 'string', default: DEFAULT_PRESET },
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
const resolvedPreset = resolvePresetName(values.preset);
if (resolvedPreset !== values.preset) {
  console.log(`\x1b[33m提示: 预设 "${values.preset}" 已更名为 "${resolvedPreset}"，将使用新名。\x1b[0m`);
}

if (resolvedPreset && !PRESET_NAMES.includes(resolvedPreset)) {
  console.error(`\x1b[31m未知预设: ${values.preset}\x1b[0m`);
  console.error(`可用预设: ${PRESET_NAMES.join(', ')}`);
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
    case 'validate':
      await validateProject();
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
