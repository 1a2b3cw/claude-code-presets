/**
 * prepublishOnly script
 * Copies .claude/ from repo root into the package directory
 * so it gets included in the published npm package.
 */

import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { rm, mkdir } from 'node:fs/promises';
import { copyDir } from '../lib/copy.js';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = join(__dirname, '..');
const repoRoot = join(packageDir, '..');
const sourceClaude = join(repoRoot, '.claude');
const targetClaude = join(packageDir, '.claude');

if (!existsSync(sourceClaude)) {
  console.error('错误: 找不到 .claude/ 目录');
  process.exit(1);
}

// Clean old copy
if (existsSync(targetClaude)) {
  await rm(targetClaude, { recursive: true, force: true });
}

// Copy fresh
await copyDir(sourceClaude, targetClaude, {
  exclude: ['workspace', 'settings.local.json'],
});

console.log('已同步 .claude/ 到包目录');
