import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { copyDir, dirHasContent, countFiles, findSourceDir } from './copy.js';

export async function init({ force = false, dryRun = false }) {
  const cwd = process.cwd();
  const sourceDir = join(findSourceDir(), '.claude');
  const targetDir = join(cwd, '.claude');

  // Check source exists
  if (!existsSync(sourceDir)) {
    throw new Error(
      '找不到源配置目录。如果是开发模式，请确保在仓库根目录运行。'
    );
  }

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

  // Count source files
  const fileCount = await countFiles(sourceDir);

  console.log(`\n  claude-team init\n`);
  console.log(`  源: ${sourceDir}`);
  console.log(`  目标: ${targetDir}`);
  console.log(`  文件: ${fileCount} 个`);

  if (dryRun) {
    console.log(`\n  [dry-run] 预览模式，不会修改文件:\n`);
    await copyDir(sourceDir, targetDir, { dryRun: true });
    console.log(`\n  完成（预览）。去掉 --dry-run 执行实际操作。`);
    return;
  }

  // Clean target if force
  if (targetExists && force) {
    console.log(`\n  清理已有 .claude/ ...`);
    await rm(targetDir, { recursive: true, force: true });
  }

  // Copy
  console.log(`\n  复制配置文件...`);
  await copyDir(sourceDir, targetDir, {
    exclude: ['workspace', 'settings.local.json'],
  });

  // Create workspace if not exists
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
  console.log(`    1. 在 Claude Code 中输入 /mcp 查看 MCP 服务器`);
  console.log(`    2. 按需配置 .claude/.mcp.json 中的 GitHub/PostgreSQL token`);
  console.log(`    3. 输入 /dev 开始开发\n`);
}
