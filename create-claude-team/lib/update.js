import { join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { rm, copyFile, readFile } from 'node:fs/promises';
import { copyDir, countFiles, findSourceDir } from './copy.js';
import { syncCodexConfig } from './codex.js';
import { resolvePresetName } from './presets.js';

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
  const pkgRoot = findSourceDir();
  const sourceDir = join(pkgRoot, '.claude');
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

  // Read installed preset + language from marker file
  // Line 1: preset name. Line 2: language (may be empty).
  const presetMarker = join(targetDir, '.preset');
  let preset = null;
  let lang = null;
  if (existsSync(presetMarker)) {
    const lines = (await readFile(presetMarker, 'utf8')).split('\n').map((l) => l.trim());
    preset = lines[0] || null;
    lang = lines[1] || null;
  }

  const resolvedPreset = preset ? resolvePresetName(preset) : null;
  if (resolvedPreset !== preset) {
    console.log(`  提示: 已安装预设 "${preset}" 已更名为 "${resolvedPreset}"，将按新预设刷新。`);
    preset = resolvedPreset;
  }

  const presetSourceDir = preset ? join(pkgRoot, 'presets', preset) : null;

  console.log(`\n  claude-team update\n`);
  console.log(`  源: ${sourceDir}`);
  console.log(`  目标: ${targetDir}`);
  console.log(`  预设: ${preset ?? '未检测到（仅更新底座）'}${lang ? ` (${lang})` : ''}`);
  console.log(`  更新范围: ${UPDATABLE_DIRS.join(', ')}, ${UPDATABLE_FILES.join(', ')}`);
  console.log(`  保留不变: ${PRESERVED.join(', ')}`);

  const isSourceProject = resolve(sourceDir) === resolve(targetDir);

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
    console.log(`\n  [dry-run] Codex 入口:`);
    await syncCodexConfig({ cwd, dryRun: true });
    reportMcpDrift(targetDir, presetSourceDir, preset);
    console.log(`\n  完成（预览）。去掉 --dry-run 执行实际操作。`);
    return;
  }

  let totalFiles = 0;

  if (isSourceProject) {
    console.log(`  检测到当前目录就是配置源，跳过 .claude/ 自覆盖。`);
  } else {
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
  }

  // Overlay preset-specific dirs (rules, specs, skills) ON TOP of base.
  // Must MERGE (not rm first) — otherwise this would delete the base files
  // (public skills/rules) that were just copied above.
  if (!isSourceProject && presetSourceDir && existsSync(presetSourceDir)) {
    console.log(`\n  叠加预设 [${preset}]...`);
    for (const dirName of UPDATABLE_DIRS) {
      const src = join(presetSourceDir, dirName);
      const dest = join(targetDir, dirName);
      if (!existsSync(src)) continue;
      const count = await countFiles(src);
      totalFiles += count;
      console.log(`  叠加预设 ${dirName}/ (${count} 个文件)`);
      await copyDir(src, dest);
    }

    // Overlay language-specific files (rules/specs for the installed language)
    if (lang) {
      const langDir = join(presetSourceDir, 'lang', lang);
      if (existsSync(langDir)) {
        console.log(`  叠加语言 [${lang}]...`);
        for (const dirName of UPDATABLE_DIRS) {
          const src = join(langDir, dirName);
          const dest = join(targetDir, dirName);
          if (!existsSync(src)) continue;
          const count = await countFiles(src);
          totalFiles += count;
          console.log(`  叠加语言 ${dirName}/ (${count} 个文件)`);
          await copyDir(src, dest);
        }
      }
    }
  }

  reportMcpDrift(targetDir, presetSourceDir, preset);

  console.log(`\n  同步 Codex 入口...`);
  await syncCodexConfig({ cwd });

  console.log(`\n  \x1b[32m✓ 更新完成\x1b[0m — ${totalFiles} 个文件已更新`);
  console.log(`  保留不变: ${PRESERVED.join(', ')}`);
  console.log(`  Codex 已同步: AGENTS.md, .agents/, .codex/`);
  console.log(`  如有自定义修改被覆盖，可从 .bak 文件恢复\n`);
}

function reportMcpDrift(targetDir, presetSourceDir, preset) {
  const missing = missingPresetMcpServers(
    join(targetDir, '.mcp.json'),
    presetSourceDir ? join(presetSourceDir, 'preset.mcp.json') : null
  );
  if (missing.length === 0) return;

  console.log(`\n  MCP 提示: 当前 .mcp.json 保持不变，但预设包含未安装的 server: ${missing.join(', ')}`);
  console.log(`  如需启用，请参考 ${preset ?? '当前'} 预设的 preset.mcp.json 手动合并，然后再运行 update 同步 Codex。`);
}

export function missingPresetMcpServers(targetMcpPath, presetMcpPath) {
  if (!presetMcpPath || !existsSync(presetMcpPath)) return [];

  const target = readJson(targetMcpPath);
  const preset = readJson(presetMcpPath);
  const targetServers = target?.mcpServers ?? {};
  const presetServers = preset?.mcpServers ?? {};

  return Object.keys(presetServers).filter((name) => !targetServers[name]);
}

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}
