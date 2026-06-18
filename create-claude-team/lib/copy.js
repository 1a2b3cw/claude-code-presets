import { readdir, stat, mkdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Recursively copy directory
 */
export async function copyDir(src, dest, { dryRun = false, exclude = [] } = {}) {
  const entries = await readdir(src, { withFileTypes: true });

  if (!dryRun) {
    await mkdir(dest, { recursive: true });
  }

  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;

    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, { dryRun, exclude });
    } else {
      if (dryRun) {
        console.log(`  [dry-run] ${relative(process.cwd(), destPath)}`);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  }
}

/**
 * Check if directory exists and has content
 */
export async function dirHasContent(dirPath) {
  try {
    const entries = await readdir(dirPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}

/**
 * Count files recursively in a directory
 */
export async function countFiles(dirPath) {
  let count = 0;
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += await countFiles(join(dirPath, entry.name));
      } else {
        count++;
      }
    }
  } catch {
    // directory doesn't exist
  }
  return count;
}

/**
 * Find the source .claude/ directory
 * In development: walk up from package dir to find repo root
 * In published package: .claude/ is bundled alongside lib/
 */
export function findSourceDir() {
  const libDir = dirname(fileURLToPath(import.meta.url));
  const packageDir = join(libDir, '..');

  // Published package: .claude/ is inside the package dir
  if (existsSync(join(packageDir, '.claude', 'CLAUDE.md'))) {
    return packageDir;
  }

  // Development: .claude/ is at repo root (parent of package dir)
  const repoRoot = join(packageDir, '..');
  if (existsSync(join(repoRoot, '.claude', 'CLAUDE.md'))) {
    return repoRoot;
  }

  return packageDir;
}
