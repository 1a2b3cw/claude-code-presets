import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { rm, copyFile } from 'node:fs/promises';
import { copyDir, countFiles, findSourceDir } from './copy.js';

// These directories are safe to overwrite during update
const UPDATABLE_DIRS = [
  'agents',
  'skills',
  'commands',
  'rules',
  'specs',
  'hooks',
];

// These files are safe to overwrite during update
const UPDATABLE_FILES = [
  'CLAUDE.md',
];

// These are user-specific and should NOT be overwritten
const PRESERVED = [
  'settings.json',
  'settings.local.json',
  '.mcp.json',
  'workspace',
];

export async function update({ dryRun = false }) {
  const cwd = process.cwd();
  const sourceDir = join(findSourceDir(), '.claude');
  const targetDir = join(cwd, '.claude');

  // Check target exists
  if (!existsSync(targetDir)) {
    throw new Error(
      `.claude/ 目录不存在。请先运行 init 命令。\n  npx create-claude-team init`
    );
  }

  // Check source exists
  if (!existsSync(sourceDir)) {
    throw new Error(
      '找不到源配置目录。如果是开发模式，请确保在仓库根目录运行。'
    );
  }

  console.log(`\n  claude-team update\n`);
  console.log(`  源: ${sourceDir}`);
  console.log(`  目标: ${targetDir}`);
  console.log(`  更新范围: ${UPDATABLE_DIRS.join(', ')}, ${UPDATABLE_FILES.join(', ')}`);
  console.log(`  保留不变: ${PRESERVED.join(', ')}`);

  if (dryRun) {
    console.log(`\n  [dry-run] 预览模式，不会修改文件:\n`);
    for (const dirName of UPDATABLE_DIRS) {
      const src = join(sourceDir, dirName);
      const dest = join(targetDir, dirName);
      if (existsSync(src)) {
        console.log(`  目录: ${dirName}/`);
        await copyDir(src, dest, { dryRun: true });
      }
    }
    for (const fileName of UPDATABLE_FILES) {
      const src = join(sourceDir, fileName);
      if (existsSync(src)) {
        console.log(`  [dry-run] ${fileName}`);
      }
    }
    console.log(`\n  完成（预览）。去掉 --dry-run 执行实际操作。`);
    return;
  }

  let totalFiles = 0;

  // Update directories
  for (const dirName of UPDATABLE_DIRS) {
    const src = join(sourceDir, dirName);
    const dest = join(targetDir, dirName);

    if (!existsSync(src)) continue;

    // Remove old version
    if (existsSync(dest)) {
      await rm(dest, { recursive: true, force: true });
    }

    // Copy new version
    const count = await countFiles(src);
    totalFiles += count;
    console.log(`  更新 ${dirName}/ (${count} 个文件)`);
    await copyDir(src, dest);
  }

  // Update files — backup before overwrite
  for (const fileName of UPDATABLE_FILES) {
    const src = join(sourceDir, fileName);
    const dest = join(targetDir, fileName);

    if (!existsSync(src)) continue;

    // Backup existing file so user doesn't lose customizations
    if (existsSync(dest)) {
      const backupPath = `${dest}.bak`;
      await copyFile(dest, backupPath);
      console.log(`  备份 ${fileName} → ${fileName}.bak`);
    }

    await copyFile(src, dest);
    totalFiles++;
    console.log(`  更新 ${fileName}`);
  }

  console.log(`\n  \x1b[32m✓ 更新完成\x1b[0m — ${totalFiles} 个文件已更新`);
  console.log(`  保留不变: ${PRESERVED.join(', ')}`);
  console.log(`  如有自定义修改被覆盖，可从 .bak 文件恢复\n`);
}
