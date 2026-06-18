/**
 * postpack script
 * Removes the vendored .claude/ and presets/ copies that prepack generated.
 * They are build artifacts only — the repo root is the single source of truth.
 * Cleaning them keeps the dev working tree tidy and prevents findSourceDir
 * from ever picking up a stale copy.
 */

import { join, dirname } from 'node:path';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const name of ['.claude', 'presets']) {
  await rm(join(packageDir, name), { recursive: true, force: true });
  console.log(`✓ 清理 ${name}/`);
}

console.log('打包后清理完成。');
