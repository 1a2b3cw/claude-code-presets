import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';

export async function buildAgentsMarkdown(claudeDir) {
  const source = await readFile(join(claudeDir, 'CLAUDE.md'), 'utf8');
  const body = toCodexText(source)
    .replaceAll('TaskCreate/TaskUpdate', 'update_plan（或当前环境可用的任务追踪工具）');

  return `${body.trimEnd()}

## Codex 兼容说明

- Codex 入口文件是根目录 \`AGENTS.md\`，本文件由 \`.claude/CLAUDE.md\` 同步生成。
- Codex skills 位于 \`.agents/skills/\`；团队规则、技术参考、命令说明分别位于 \`.agents/rules/\`、\`.agents/specs/\`、\`.agents/commands/\`。
- Claude 命令文档会额外包装为 \`.agents/skills/team-command-*/\`，在 Codex 中用 \`$team-command-dev\`、\`$team-command-review-all\` 等方式调用。
- Codex MCP、hooks、custom agents 位于 \`.codex/config.toml\`、\`.codex/hooks.json\`、\`.codex/agents/*.toml\`。
- Claude Code 仍使用 \`.claude/\`；两套入口共享同一份源配置，运行 \`npx create-claude-team update\` 会同步刷新。
- \`/plan\` 是 Codex 内置命令，含义不同；要执行本项目的产品规划流程，请用 \`$team-command-plan\`。
`;
}

export async function rewriteCodexTextFiles(dir) {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await rewriteCodexTextFiles(path);
      continue;
    }
    if (!/\.(md|txt)$/i.test(entry.name)) continue;
    const original = await readFile(path, 'utf8');
    const next = toCodexText(original);
    if (next !== original) {
      await writeFile(path, next);
    }
  }
}

export function toCodexText(source) {
  return rewriteRelativeCodexPaths(
    source
      .replaceAll('.claude/rules/', '.agents/rules/')
      .replaceAll('.claude/skills/', '.agents/skills/')
      .replaceAll('.claude/commands/', '.agents/commands/')
      .replaceAll('.claude/specs/', '.agents/specs/')
      .replaceAll('~/.claude/', '~/.codex/')
      .replaceAll('叠加到 `.claude/`', '叠加到 `.agents/` 与 `.claude/`')
  );
}

function rewriteRelativeCodexPaths(source) {
  return source
    .replace(/(^|[^A-Za-z0-9_.\/\\-])(commands|rules|specs)\//g, (match, prefix, directory, offset) => {
      const lineStart = source.lastIndexOf('\n', offset) + 1;
      const treePrefix = source.slice(lineStart, offset);
      const nearby = source.slice(Math.max(0, lineStart - 600), offset);
      const isProjectPresetTreeEntry = /^[\s│├└─]*$/.test(treePrefix) && nearby.includes('project-preset/');

      return isProjectPresetTreeEntry ? match : `${prefix}.agents/${directory}/`;
    })
    .replace(/(^|[^A-Za-z0-9_.\/\\-])(commands|rules|specs)\\/g, '$1.agents\\$2\\');
}
