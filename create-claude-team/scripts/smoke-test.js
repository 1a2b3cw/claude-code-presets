/**
 * 冒烟测试 — 验证 init / update 的核心契约。
 *
 * 重点守护 P0.1：update 不能删掉底座的公共 skills/rules。
 * 用法：npm test（在 create-claude-team/ 目录）
 *
 * 不依赖任何测试框架，纯 node 断言 + 退出码。
 */

import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { init } from '../lib/init.js';
import { update } from '../lib/update.js';

const PUBLIC_SKILLS = ['architecture', 'code-review', 'debugging', 'performance', 'project-planning', 'testing'];
const PUBLIC_RULES = ['git.md', 'design.md'];

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗ ${msg}\x1b[0m`);
  }
}

function countDirs(p) {
  if (!existsSync(p)) return 0;
  return readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
}

function dirNames(p) {
  if (!existsSync(p)) return [];
  return readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
}

function fileNames(p) {
  if (!existsSync(p)) return [];
  return readdirSync(p, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
}

// 静默 init/update 的日志，保持测试输出干净
async function silent(fn) {
  const orig = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = orig;
  }
}

async function runScenario(preset, { mcpServer, presetSkillCount, lang = null, expectRule = null, absentRule = null }) {
  const title = lang ? `${preset} (${lang})` : preset;
  console.log(`\n[${title}]`);
  const tmp = mkdtempSync(join(tmpdir(), 'cct-'));
  const claudeDir = join(tmp, '.claude');
  const skillsDir = join(claudeDir, 'skills');
  const rulesDir = join(claudeDir, 'rules');
  const prevCwd = process.cwd();

  try {
    process.chdir(tmp);

    // --- init ---
    await silent(() => init({ preset, lang }));

    assert(existsSync(join(claudeDir, 'CLAUDE.md')), 'init: CLAUDE.md 存在');
    assert(existsSync(join(claudeDir, '.preset')), 'init: .preset 标记存在');
    const marker = readFileSync(join(claudeDir, '.preset'), 'utf8').split('\n').map((l) => l.trim());
    assert(marker[0] === preset, `init: .preset 预设为 ${preset}`);
    if (lang) assert(marker[1] === lang, `init: .preset 语言为 ${lang}`);

    const expectedSkills = PUBLIC_SKILLS.length + presetSkillCount;
    const initSkills = countDirs(skillsDir);
    assert(initSkills === expectedSkills, `init: 技能数 = ${initSkills}（期望 ${expectedSkills}）`);

    const initSkillNames = dirNames(skillsDir);
    assert(PUBLIC_SKILLS.every((s) => initSkillNames.includes(s)), 'init: 6 个公共技能齐全');

    const initRules = fileNames(rulesDir);
    assert(PUBLIC_RULES.every((r) => initRules.includes(r)), 'init: 公共规则（git/design）齐全');

    // 语言隔离断言
    if (expectRule) assert(initRules.includes(expectRule), `init: 含本语言规则 ${expectRule}`);
    if (absentRule) assert(!initRules.includes(absentRule), `init: 不含他语言规则 ${absentRule}`);
    if (lang) {
      const specs = fileNames(join(claudeDir, 'specs'));
      assert(specs.length > 0, `init: specs/ 非空（${specs.length} 个）`);
    }

    const mcp = JSON.parse(readFileSync(join(claudeDir, '.mcp.json'), 'utf8'));
    assert(mcp.mcpServers && mcp.mcpServers[mcpServer], `init: MCP 已合并 ${mcpServer}`);

    // hooks 是 Node（.mjs），不是旧的 .sh
    const hooks = fileNames(join(claudeDir, 'hooks'));
    assert(hooks.includes('security-check.mjs') && hooks.includes('bash-check.mjs'), 'init: Node hooks (.mjs) 存在');
    assert(!hooks.some((h) => h.endsWith('.sh')), 'init: 无遗留 .sh hooks');

    const commands = fileNames(join(claudeDir, 'commands'));
    assert(commands.includes('plan.md') && commands.length === 7, `init: 7 个命令含 plan.md (${commands.length})`);

    // 记录 update 前的"应保留"内容
    const settingsBefore = readFileSync(join(claudeDir, 'settings.json'), 'utf8');
    const workspaceExists = existsSync(join(claudeDir, 'workspace'));

    // --- update ---（关键：P0.1 守护点 + 语言保持）
    await silent(() => update({}));

    const updSkills = countDirs(skillsDir);
    assert(updSkills === expectedSkills, `update: 技能数仍 = ${updSkills}（P0.1 守护，期望 ${expectedSkills}）`);

    const updSkillNames = dirNames(skillsDir);
    assert(PUBLIC_SKILLS.every((s) => updSkillNames.includes(s)), 'update: 公共技能未被预设叠加删除');

    const updRules = fileNames(rulesDir);
    assert(PUBLIC_RULES.every((r) => updRules.includes(r)), 'update: 公共规则未被删除');
    if (expectRule) assert(updRules.includes(expectRule), `update: 本语言规则 ${expectRule} 保留`);
    if (absentRule) assert(!updRules.includes(absentRule), `update: 未混入他语言规则 ${absentRule}`);

    const settingsAfter = readFileSync(join(claudeDir, 'settings.json'), 'utf8');
    assert(settingsAfter === settingsBefore, 'update: settings.json 保持不变');
    assert(workspaceExists && existsSync(join(claudeDir, 'workspace')), 'update: workspace/ 保持不变');
  } finally {
    process.chdir(prevCwd);
    rmSync(tmp, { recursive: true, force: true });
  }
}

console.log('create-claude-team 冒烟测试');

await runScenario('ai-app', {
  mcpServer: 'pgvector', presetSkillCount: 8,
  lang: 'python', expectRule: 'python.md', absentRule: 'typescript-ai.md',
});
await runScenario('ai-app', {
  mcpServer: 'pgvector', presetSkillCount: 8,
  lang: 'typescript', expectRule: 'typescript-ai.md', absentRule: 'python.md',
});
await runScenario('web-fullstack', { mcpServer: 'postgres', presetSkillCount: 8 });

// 旧预设名 ai-knowledge-base 应通过别名解析到 ai-app（向后兼容）
console.log('\n[别名兼容]');
{
  const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
  const tmp = mkdtempSync(join(tmpdir(), 'cct-'));
  const res = spawnSync('node', [cli, 'init', '--preset', 'ai-knowledge-base', '--dry-run'], {
    cwd: tmp, encoding: 'utf8',
  });
  const ok = res.status === 0 && /ai-app/.test(res.stdout);
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ai-knowledge-base → 解析到 ai-app (exit ${res.status})`);
  ok ? passed++ : failed++;
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
