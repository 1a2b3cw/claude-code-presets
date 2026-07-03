import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { copyDir } from './copy.js';

const CODEX_AGENT_DIRS = ['agents', 'commands', 'rules', 'skills', 'specs'];
const COMMAND_SKILL_PREFIX = 'team-command';
const MCP_ENV_EXPANDER = "const {spawn}=require('node:child_process');const [cmd,...rawArgs]=process.argv.slice(1);const expand=(s)=>String(s).replace(/\\$\\{([^}]+)\\}/g,(_,name)=>process.env[name]??'');const child=spawn(cmd,rawArgs.map(expand),{stdio:'inherit',shell:process.platform==='win32'});child.on('exit',(code,signal)=>{if(signal)process.kill(process.pid,signal);else process.exit(code??0);});child.on('error',(err)=>{console.error(err.message);process.exit(1);});";

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
    if (existsSync(join(claudeDir, '.mcp.json'))) {
      console.log(`  [codex] .codex/config.toml`);
    }
    if (existsSync(join(claudeDir, 'agents'))) {
      console.log(`  [codex] .codex/agents/*.toml`);
    }
    if (existsSync(join(claudeDir, 'commands'))) {
      console.log(`  [codex] .agents/skills/${COMMAND_SKILL_PREFIX}-*/`);
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
  await rewriteCodexTextFiles(agentsDir);
  await generateCommandSkills(claudeDir, agentsDir);

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

  await writeCodexConfig(claudeDir, codexDir);
  await writeCodexAgents(claudeDir, codexDir);
}

async function buildAgentsMarkdown(claudeDir) {
  const source = await readFile(join(claudeDir, 'CLAUDE.md'), 'utf8');
  const body = toCodexText(source)
    .replaceAll('TaskCreate/TaskUpdate', 'update_plan（或当前环境可用的任务追踪工具）');

  return `${body.trimEnd()}

## Codex 兼容说明

- Codex 入口文件是根目录 \`AGENTS.md\`，本文件由 \`.claude/CLAUDE.md\` 同步生成。
- Codex skills 位于 \`.agents/skills/\`；团队规则、技术参考、命令说明分别位于 \`.agents/rules/\`、\`.agents/specs/\`、\`.agents/commands/\`。
- Claude 命令文档会额外包装为 \`.agents/skills/${COMMAND_SKILL_PREFIX}-*/\`，在 Codex 中用 \`$${COMMAND_SKILL_PREFIX}-dev\`、\`$${COMMAND_SKILL_PREFIX}-review-all\` 等方式调用。
- Codex MCP、hooks、custom agents 位于 \`.codex/config.toml\`、\`.codex/hooks.json\`、\`.codex/agents/*.toml\`。
- Claude Code 仍使用 \`.claude/\`；两套入口共享同一份源配置，运行 \`npx create-claude-team update\` 会同步刷新。
- \`/plan\` 是 Codex 内置命令，含义不同；要执行本项目的产品规划流程，请用 \`$${COMMAND_SKILL_PREFIX}-plan\`。
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
              command: 'node "$(git rev-parse --show-toplevel)/.codex/hooks/security-check.mjs"',
              statusMessage: 'Checking code security',
            },
          ],
        },
        {
          matcher: 'Bash',
          hooks: [
            {
              type: 'command',
              command: 'node "$(git rev-parse --show-toplevel)/.codex/hooks/bash-check.mjs"',
              statusMessage: 'Checking shell command',
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

async function rewriteCodexTextFiles(dir) {
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

function toCodexText(source) {
  const rewritten = source
    .replaceAll('.claude/rules/', '.agents/rules/')
    .replaceAll('.claude/skills/', '.agents/skills/')
    .replaceAll('.claude/commands/', '.agents/commands/')
    .replaceAll('commands/', '.agents/commands/')
    .replaceAll('rules/', '.agents/rules/')
    .replaceAll('specs/', '.agents/specs/')
    .replaceAll('~/.claude/', '~/.codex/')
    .replaceAll('叠加到 `.claude/`', '叠加到 `.agents/` 与 `.claude/`');

  return rewritten
    .replaceAll('.agents/.agents/commands/', '.agents/commands/')
    .replaceAll('.agents/.agents/rules/', '.agents/rules/')
    .replaceAll('.agents/.agents/skills/', '.agents/skills/')
    .replaceAll('.agents/.agents/specs/', '.agents/specs/')
    .replace(/lang\/[^/\s]+\/\.agents\/specs\//g, '.agents/specs/')
    .replace(/lang\\[^\\\s]+\\\.agents\\specs\\/g, '.agents\\specs\\');
}

async function generateCommandSkills(claudeDir, agentsDir) {
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

function buildCommandSkill(skillName, commandName, body) {
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

async function writeCodexConfig(claudeDir, codexDir) {
  const mcpPath = join(claudeDir, '.mcp.json');
  if (!existsSync(mcpPath)) return;

  let config;
  try {
    config = JSON.parse(await readFile(mcpPath, 'utf8'));
  } catch {
    return;
  }

  const servers = config.mcpServers ?? {};
  await mkdir(codexDir, { recursive: true });
  await writeFile(join(codexDir, 'config.toml'), buildCodexConfigToml(servers));
}

function buildCodexConfigToml(servers) {
  const lines = [
    '# Generated by create-claude-team. Edit .claude/.mcp.json, then run `npx create-claude-team update` to refresh.',
    '',
  ];

  for (const [name, server] of Object.entries(servers)) {
    lines.push(`[mcp_servers.${tomlKey(name)}]`);
    if (server.type === 'http' && server.url) {
      lines.push(`url = ${tomlString(server.url)}`);
      appendHttpHeaders(lines, server.headers ?? {});
    } else {
      const args = Array.isArray(server.args) ? server.args : [];
      if (server.command && args.some((arg) => envReferenceName(arg))) {
        lines.push(`command = "node"`);
        lines.push(`args = ${tomlArray(['-e', MCP_ENV_EXPANDER, server.command, ...args])}`);
      } else {
        if (server.command) lines.push(`command = ${tomlString(server.command)}`);
        if (args.length > 0) lines.push(`args = ${tomlArray(args)}`);
      }
      const envVars = collectEnvVars(server);
      if (envVars.length > 0) lines.push(`env_vars = ${tomlArray(envVars)}`);
      if (server.cwd) lines.push(`cwd = ${tomlString(server.cwd)}`);
    }
    lines.push('');

    if (server.env && Object.keys(server.env).some((key) => !isEnvReference(server.env[key]))) {
      lines.push(`[mcp_servers.${tomlKey(name)}.env]`);
      for (const [key, value] of Object.entries(server.env)) {
        if (!isEnvReference(value)) lines.push(`${tomlKey(key)} = ${tomlString(String(value))}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function appendHttpHeaders(lines, headers) {
  const staticHeaders = {};
  const envHeaders = {};

  for (const [key, value] of Object.entries(headers)) {
    const bearer = /^Bearer\s+\$\{([^}]+)\}$/.exec(String(value));
    if (key.toLowerCase() === 'authorization' && bearer) {
      lines.push(`bearer_token_env_var = ${tomlString(bearer[1])}`);
      continue;
    }
    const env = envReferenceName(value);
    if (env) envHeaders[key] = env;
    else staticHeaders[key] = String(value);
  }

  if (Object.keys(staticHeaders).length > 0) lines.push(`http_headers = ${tomlInlineMap(staticHeaders)}`);
  if (Object.keys(envHeaders).length > 0) lines.push(`env_http_headers = ${tomlInlineMap(envHeaders)}`);
}

function collectEnvVars(server) {
  const vars = new Set();
  for (const arg of server.args ?? []) {
    const env = envReferenceName(arg);
    if (env) vars.add(env);
  }
  for (const value of Object.values(server.env ?? {})) {
    const env = envReferenceName(value);
    if (env) vars.add(env);
  }
  return [...vars].sort();
}

function envReferenceName(value) {
  const match = /^\$\{([^}]+)\}$/.exec(String(value));
  return match?.[1] ?? null;
}

function isEnvReference(value) {
  return Boolean(envReferenceName(value));
}

async function writeCodexAgents(claudeDir, codexDir) {
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

function buildCodexAgentToml(name, body) {
  const firstLine = body.split('\n').find((line) => line.trim()) ?? name;
  return [
    `name = ${tomlString(name)}`,
    `description = ${tomlString(firstLine.replace(/^#+\s*/, '').trim())}`,
    `developer_instructions = ${tomlMultilineString(body.trimEnd())}`,
    '',
  ].join('\n');
}

function tomlKey(key) {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : tomlString(key);
}

function tomlArray(values) {
  return `[${values.map((value) => tomlString(String(value))).join(', ')}]`;
}

function tomlInlineMap(values) {
  return `{ ${Object.entries(values).map(([key, value]) => `${tomlKey(key)} = ${tomlString(value)}`).join(', ')} }`;
}

function tomlString(value) {
  return JSON.stringify(String(value));
}

function tomlMultilineString(value) {
  return `"""\n${String(value).replaceAll('"""', '\\"\\"\\"')}\n"""`;
}
