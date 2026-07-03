import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { copyDir } from './copy.js';

const CODEX_AGENT_DIRS = ['agents', 'commands', 'rules', 'skills', 'specs'];

export async function syncCodexConfig({
  cwd = process.cwd(),
  claudeDir = join(cwd, '.claude'),
  availableDirs = null,
  dryRun = false,
} = {}) {
  const agentsDir = join(cwd, '.agents');
  const codexDir = join(cwd, '.codex');

  if (dryRun) {
    console.log(`  [codex] AGENTS.md`);
    const dirs = availableDirs ?? CODEX_AGENT_DIRS.filter((dirName) => existsSync(join(claudeDir, dirName)));
    for (const dirName of dirs) {
      console.log(`  [codex] .agents/${dirName}/`);
    }
    if (existsSync(join(claudeDir, 'hooks'))) {
      console.log(`  [codex] .codex/hooks/`);
      console.log(`  [codex] .codex/hooks.json`);
    }
    return;
  }

  if (!existsSync(claudeDir)) {
    throw new Error('找不到 .claude/，无法生成 Codex 配置。');
  }

  await writeFile(join(cwd, 'AGENTS.md'), await buildAgentsMarkdown(claudeDir));

  if (existsSync(agentsDir)) {
    await rm(agentsDir, { recursive: true, force: true });
  }
  await mkdir(agentsDir, { recursive: true });
  for (const dirName of CODEX_AGENT_DIRS) {
    const src = join(claudeDir, dirName);
    const dest = join(agentsDir, dirName);
    if (!existsSync(src)) continue;
    await copyDir(src, dest);
  }

  const hookSrc = join(claudeDir, 'hooks');
  if (existsSync(hookSrc)) {
    await mkdir(codexDir, { recursive: true });
    const hookDest = join(codexDir, 'hooks');
    if (existsSync(hookDest)) {
      await rm(hookDest, { recursive: true, force: true });
    }
    await copyDir(hookSrc, hookDest);
    await writeFile(join(codexDir, 'hooks.json'), JSON.stringify(buildCodexHooks(cwd), null, 2) + '\n');
  }
}

async function buildAgentsMarkdown(claudeDir) {
  const source = await readFile(join(claudeDir, 'CLAUDE.md'), 'utf8');
  const body = source
    .replaceAll('.claude/rules/design.md', '.agents/rules/design.md')
    .replaceAll('commands/taste.md', '.agents/commands/taste.md')
    .replaceAll('rules/testing.md', '.agents/rules/testing.md')
    .replaceAll('叠加到 `.claude/`', '叠加到 `.agents/` 与 `.claude/`')
    .replaceAll('TaskCreate/TaskUpdate', 'update_plan（或当前环境可用的任务追踪工具）');

  return `${body.trimEnd()}

## Codex 兼容说明

- Codex 入口文件是根目录 \`AGENTS.md\`，本文件由 \`.claude/CLAUDE.md\` 同步生成。
- Codex skills 位于 \`.agents/skills/\`；规则、技术参考、命令说明分别位于 \`.agents/rules/\`、\`.agents/specs/\`、\`.agents/commands/\`。
- Claude Code 仍使用 \`.claude/\`；两套入口共享同一份源配置，运行 \`npx create-claude-team update\` 会同步刷新。
- 斜杠命令在 Codex 中作为工作流约定参考；如果当前 Codex 环境没有对应命令工具，按命令文档描述的流程执行。
`;
}

function buildCodexHooks(cwd) {
  return {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: `node ${JSON.stringify(join(cwd, '.codex', 'hooks', 'security-check.mjs'))}`,
            },
          ],
        },
        {
          matcher: 'Bash',
          hooks: [
            {
              type: 'command',
              command: `node ${JSON.stringify(join(cwd, '.codex', 'hooks', 'bash-check.mjs'))}`,
            },
          ],
        },
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: "echo '请确认所有任务已完成，使用任务列表检查进度'",
            },
          ],
        },
      ],
    },
  };
}
