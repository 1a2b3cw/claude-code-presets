import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { copyDir } from './copy.js';
import { generateCommandSkills } from './codex/command-skills.js';
import { writeCodexAgents } from './codex/agents.js';
import { buildCodexHooks } from './codex/hooks.js';
import { rewriteCodexTextFiles, buildAgentsMarkdown } from './codex/text.js';
import { writeCodexConfig } from './codex/mcp-config.js';

const CODEX_AGENT_DIRS = ['agents', 'commands', 'rules', 'skills', 'specs'];
const COMMAND_SKILL_PREFIX = 'team-command';

export async function syncCodexConfig({
  cwd = process.cwd(),
  claudeDir = join(cwd, '.claude'),
  availableDirs = null,
  dryRun = false,
} = {}) {
  const agentsDir = join(cwd, '.agents');
  const codexDir = join(cwd, '.codex');

  if (dryRun) {
    previewCodexConfig({ claudeDir, availableDirs });
    return;
  }

  if (!existsSync(claudeDir)) {
    throw new Error('找不到 .claude/，无法生成 Codex 配置。');
  }

  await writeFile(join(cwd, 'AGENTS.md'), await buildAgentsMarkdown(claudeDir));
  await syncAgentsMirror(claudeDir, agentsDir);
  await syncCodexHooks(claudeDir, codexDir, cwd);
  await writeCodexConfig(claudeDir, codexDir);
  await writeCodexAgents(claudeDir, codexDir);
}

function previewCodexConfig({ claudeDir, availableDirs }) {
  console.log(`  [codex] AGENTS.md`);
  const dirs = availableDirs ?? CODEX_AGENT_DIRS.filter((dirName) => existsSync(join(claudeDir, dirName)));
  for (const dirName of dirs) {
    console.log(`  [codex] .agents/${dirName}/`);
  }
  if (existsSync(join(claudeDir, 'hooks'))) {
    console.log(`  [codex] .codex/hooks/`);
    console.log(`  [codex] .codex/hooks.json`);
  }
  if (existsSync(join(claudeDir, '.mcp.json'))) {
    console.log(`  [codex] .codex/config.toml`);
  }
  if (existsSync(join(claudeDir, 'agents'))) {
    console.log(`  [codex] .codex/agents/*.toml`);
  }
  if (existsSync(join(claudeDir, 'commands'))) {
    console.log(`  [codex] .agents/skills/${COMMAND_SKILL_PREFIX}-*/`);
  }
}

async function syncAgentsMirror(claudeDir, agentsDir) {
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
  await rewriteCodexTextFiles(agentsDir);
  await generateCommandSkills(claudeDir, agentsDir);
}

async function syncCodexHooks(claudeDir, codexDir, cwd) {
  const hookSrc = join(claudeDir, 'hooks');
  if (!existsSync(hookSrc)) return;

  await mkdir(codexDir, { recursive: true });
  const hookDest = join(codexDir, 'hooks');
  if (existsSync(hookDest)) {
    await rm(hookDest, { recursive: true, force: true });
  }
  await copyDir(hookSrc, hookDest);
  await writeFile(join(codexDir, 'hooks.json'), JSON.stringify(buildCodexHooks(cwd), null, 2) + '\n');
}
