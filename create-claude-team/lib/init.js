import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { copyDir, dirHasContent, countFiles, findSourceDir } from './copy.js';

// Resolve the language variant for a preset that has a lang/ folder.
// Returns null if the preset has no language variants.
async function resolveLang(presetDir, requested) {
  const langRoot = join(presetDir, 'lang');
  if (!existsSync(langRoot)) return null;

  const available = (await readdir(langRoot, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (available.length === 0) return null;

  if (requested) {
    if (!available.includes(requested)) {
      throw new Error(`预设不支持语言: ${requested}。可选: ${available.join(', ')}`);
    }
    return requested;
  }
  // Default: prefer python, else first available
  return available.includes('python') ? 'python' : available[0];
}

export async function init({ preset = 'web-fullstack', lang = null, force = false, dryRun = false }) {
  const cwd = process.cwd();
  const pkgRoot = findSourceDir();
  const baseDir = join(pkgRoot, '.claude');
  const presetDir = join(pkgRoot, 'presets', preset);
  const targetDir = join(cwd, '.claude');

  // Validate source
  if (!existsSync(baseDir)) {
    throw new Error('找不到源配置目录。如果是开发模式，请确保在仓库根目录运行。');
  }
  if (!existsSync(presetDir)) {
    throw new Error(`找不到预设目录: presets/${preset}`);
  }

  const resolvedLang = await resolveLang(presetDir, lang);

  // Check target
  const targetExists = existsSync(targetDir);
  if (targetExists && !force) {
    const hasContent = await dirHasContent(targetDir);
    if (hasContent) {
      throw new Error(
        `.claude/ 目录已存在。使用 --force 强制覆盖，或手动删除后重试。\n  路径: ${targetDir}`
      );
    }
  }

  const baseCount = await countFiles(baseDir);
  const presetCount = await countFiles(presetDir);

  console.log(`\n  create-claude-team init\n`);
  console.log(`  预设:   ${preset}`);
  if (resolvedLang) console.log(`  语言:   ${resolvedLang}`);
  console.log(`  目标:   ${targetDir}`);
  console.log(`  文件:   底座 ${baseCount} 个 + 预设 ${presetCount} 个`);

  if (dryRun) {
    console.log(`\n  [dry-run] 预览模式，不会修改文件:\n`);
    console.log(`  [1/3] 底座文件:`);
    await copyDir(baseDir, targetDir, { dryRun: true });
    console.log(`\n  [2/3] 预设文件（叠加，排除 lang/）:`);
    await copyDir(presetDir, targetDir, { dryRun: true, exclude: ['PRESET.md', 'preset.mcp.json', 'lang'] });
    if (resolvedLang) {
      console.log(`\n  [2b] 语言文件（${resolvedLang}）:`);
      await copyDir(join(presetDir, 'lang', resolvedLang), targetDir, { dryRun: true });
    }
    console.log(`\n  完成（预览）。去掉 --dry-run 执行实际操作。`);
    return;
  }

  // Clean target if force
  if (targetExists && force) {
    console.log(`\n  清理已有 .claude/ ...`);
    await rm(targetDir, { recursive: true, force: true });
  }

  // Step 1: Copy base
  console.log(`\n  [1/3] 复制底座配置...`);
  await copyDir(baseDir, targetDir, {
    exclude: ['workspace', 'settings.local.json'],
  });

  // Step 2: Overlay preset files (rules/, specs/, skills/) — EXCLUDE lang/
  console.log(`  [2/3] 叠加预设 [${preset}]...`);
  await copyDir(presetDir, targetDir, {
    exclude: ['PRESET.md', 'preset.mcp.json', 'lang'],
  });

  // Step 2b: Overlay language-specific files (rules/specs for the chosen language)
  if (resolvedLang) {
    console.log(`  [2b]  叠加语言 [${resolvedLang}]...`);
    await copyDir(join(presetDir, 'lang', resolvedLang), targetDir);
  }

  // Step 3: Merge preset.mcp.json into .mcp.json
  console.log(`  [3/3] 合并 MCP 配置...`);
  await mergeMcpConfig(
    join(targetDir, '.mcp.json'),
    join(presetDir, 'preset.mcp.json')
  );

  // Write preset marker so update knows which preset + language to refresh.
  // Line 1: preset name. Line 2: language (empty if preset has no variants).
  await writeFile(join(targetDir, '.preset'), preset + '\n' + (resolvedLang ?? '') + '\n');

  // Create workspace
  const workspaceDir = join(targetDir, 'workspace');
  if (!existsSync(workspaceDir)) {
    await mkdir(workspaceDir, { recursive: true });
    await writeFile(
      join(workspaceDir, 'journal.md'),
      `# 会话日志\n\n> AI 自动追加，每次会话结束时记录。\n> 新会话开始时 AI 会读取最近的记录，保持上下文连续性。\n\n---\n\n（AI 会在这里自动追加记录）\n`
    );
    await writeFile(
      join(workspaceDir, 'metrics.md'),
      `# 效能指标\n\n> /dev 完成后自动追加，/standup 时读取分析。\n\n---\n\n（AI 会在这里自动追加指标记录）\n`
    );
  }

  console.log(`\n  \x1b[32m✓ 初始化完成\x1b[0m`);
  console.log(`\n  下一步:`);

  if (preset === 'web-fullstack') {
    console.log(`    1. 配置 .claude/.mcp.json 中的 GITHUB_PERSONAL_ACCESS_TOKEN`);
    console.log(`    2. 可选：设置 DATABASE_URL 启用 PostgreSQL MCP`);
    console.log(`    3. 输入 /dev 开始开发\n`);
  } else if (preset === 'ai-app') {
    console.log(`    1. 启动 pgvector：docker compose up -d postgres`);
    console.log(`    2. 配置 DATABASE_URL 与 ANTHROPIC_API_KEY`);
    if (resolvedLang === 'typescript') {
      console.log(`    3. 安装依赖：pnpm add ai @ai-sdk/anthropic hono zod postgres`);
    } else {
      console.log(`    3. 安装依赖：uv add anthropic fastapi asyncpg pydantic-settings`);
    }
    console.log(`    4. 输入 /dev 开始构建 AI 应用\n`);
  }
}

async function mergeMcpConfig(basePath, presetPath) {
  if (!existsSync(presetPath)) return;

  let base = {};
  if (existsSync(basePath)) {
    try {
      base = JSON.parse(await readFile(basePath, 'utf8'));
    } catch {
      base = {};
    }
  }

  const preset = JSON.parse(await readFile(presetPath, 'utf8'));

  const merged = {
    ...base,
    mcpServers: {
      ...(base.mcpServers ?? {}),
      ...(preset.mcpServers ?? {}),
    },
  };

  await writeFile(basePath, JSON.stringify(merged, null, 2) + '\n');
}
