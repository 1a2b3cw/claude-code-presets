import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { toCodexText } from './text.js';

export async function writeCodexAgents(claudeDir, codexDir) {
  const sourceDir = join(claudeDir, 'agents');
  if (!existsSync(sourceDir)) return;

  const targetDir = join(codexDir, 'agents');
  if (existsSync(targetDir)) {
    await rm(targetDir, { recursive: true, force: true });
  }
  await mkdir(targetDir, { recursive: true });

  const agents = (await readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'));

  for (const agent of agents) {
    const name = agent.name.replace(/\.md$/, '');
    const body = toCodexText(await readFile(join(sourceDir, agent.name), 'utf8'));
    await writeFile(join(targetDir, `${name}.toml`), buildCodexAgentToml(name, body));
  }
}

export function buildCodexAgentToml(name, body) {
  const firstLine = body.split('\n').find((line) => line.trim()) ?? name;
  return [
    `name = ${tomlString(name)}`,
    `description = ${tomlString(firstLine.replace(/^#+\s*/, '').trim())}`,
    `developer_instructions = ${tomlMultilineString(body.trimEnd())}`,
    '',
  ].join('\n');
}

function tomlString(value) {
  return JSON.stringify(String(value));
}

function tomlMultilineString(value) {
  return `"""\n${String(value).replaceAll('"""', '\\"\\"\\"')}\n"""`;
}
