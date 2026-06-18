/**
 * prepublishOnly script
 * Syncs .claude/ (base) and presets/ from repo root into the package directory.
 */

import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { rm, mkdir } from 'node:fs/promises';
import { copyDir } from '../lib/copy.js';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = join(__dirname, '..');
const repoRoot = join(packageDir, '..');

async function syncDir(srcName, excludes = []) {
  const src = join(repoRoot, srcName);
  const dest = join(packageDir, srcName);

  if (!existsSync(src)) {
    console.error(`错误: 找不到 ${srcName}/ 目录`);
    process.exit(1);
  }

  if (existsSync(dest)) {
    await rm(dest, { recursive: true, force: true });
  }

  await copyDir(src, dest, { exclude: excludes });
  console.log(`✓ 同步 ${srcName}/`);
}

await syncDir('.claude', ['workspace', 'settings.local.json']);
await syncDir('presets');

console.log('\n发布前同步完成。');
