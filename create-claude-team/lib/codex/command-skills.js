import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { toCodexText } from './text.js';

const COMMAND_SKILL_PREFIX = 'team-command';

export async function generateCommandSkills(claudeDir, agentsDir) {
  const commandsDir = join(claudeDir, 'commands');
  if (!existsSync(commandsDir)) return;

  const skillRoot = join(agentsDir, 'skills');
  await mkdir(skillRoot, { recursive: true });

  const commands = (await readdir(commandsDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name.replace(/\.md$/, ''));

  for (const commandName of commands) {
    const source = await readFile(join(commandsDir, `${commandName}.md`), 'utf8');
    const skillName = `${COMMAND_SKILL_PREFIX}-${commandName}`;
    const skillDir = join(skillRoot, skillName);
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), buildCommandSkill(skillName, commandName, toCodexText(source)));
  }
}

export function buildCommandSkill(skillName, commandName, body) {
  return `---
name: ${skillName}
description: Execute the ${commandName} workflow from this AI development team preset. Use when the user writes /${commandName}, asks for ${commandName}, or wants the corresponding team process in Codex.
---

# ${skillName}

This skill ports the Claude Code \`/${commandName}\` command workflow to Codex.

In Codex, invoke this as \`$${skillName}\`. Do not rely on \`/${commandName}\` unless Codex itself defines that slash command with the same meaning.

${body.trimEnd()}
`;
}
