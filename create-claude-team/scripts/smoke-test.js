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
import { readPresetCatalog } from '../lib/presets.js';
import { validateProject } from '../lib/validate.js';

const PUBLIC_SKILLS = ['architecture', 'code-review', 'debugging', 'performance', 'project-planning', 'skill-curator', 'testing', 'ui-prototype'];
const PUBLIC_RULES = ['git.md', 'design.md'];
const COMMAND_SKILL_COUNT = 9;
const AGENT_COUNT = 6;

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

function skillDirs(p) {
  if (!existsSync(p)) return [];
  return readdirSync(p, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(p, e.name, 'SKILL.md')))
    .map((e) => join(p, e.name));
}

function validateSkillDir(skillDir) {
  const skillName = skillDir.split(/[\\/]/).at(-1);
  const skillPath = join(skillDir, 'SKILL.md');
  const content = readFileSync(skillPath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return `${skillName}: 缺少 YAML frontmatter`;

  const name = match[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (!name) return `${skillName}: 缺少 name`;
  if (!description) return `${skillName}: 缺少 description`;
  if (name !== skillName) return `${skillName}: name 应为 ${skillName}，实际为 ${name}`;
  if (description.length < 20) return `${skillName}: description 过短`;
  return null;
}

function validateSkills(root) {
  return skillDirs(root).flatMap((skillDir) => {
    const issue = validateSkillDir(skillDir);
    return issue ? [issue] : [];
  });
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

async function runScenario(manifest, {
  lang = null,
} = {}) {
  const preset = manifest.name;
  const langConfig = lang ? manifest.languages?.[lang] ?? {} : {};
  const requiredRules = manifest.rules ?? [];
  const absentRules = langConfig.absentRules ?? [];
  const expectRule = langConfig.expectRule ?? null;
  const expectSpecs = manifest.expectSpecs || Boolean(lang);
  const title = lang ? `${preset} (${lang})` : preset;
  console.log(`\n[${title}]`);
  const tmp = mkdtempSync(join(tmpdir(), 'cct-'));
  const claudeDir = join(tmp, '.claude');
  const agentsDir = join(tmp, '.agents');
  const codexDir = join(tmp, '.codex');
  const skillsDir = join(claudeDir, 'skills');
  const rulesDir = join(claudeDir, 'rules');
  const prevCwd = process.cwd();

  try {
    process.chdir(tmp);

    // --- init ---
    await silent(() => init({ preset, lang }));

    assert(existsSync(join(claudeDir, 'CLAUDE.md')), 'init: CLAUDE.md 存在');
    assert(existsSync(join(tmp, 'AGENTS.md')), 'init: Codex AGENTS.md 存在');
    assert(existsSync(join(claudeDir, '.preset')), 'init: .preset 标记存在');
    const marker = readFileSync(join(claudeDir, '.preset'), 'utf8').split('\n').map((l) => l.trim());
    assert(marker[0] === preset, `init: .preset 预设为 ${preset}`);
    if (lang) assert(marker[1] === lang, `init: .preset 语言为 ${lang}`);

    const expectedSkills = PUBLIC_SKILLS.length + manifest.skillCount + COMMAND_SKILL_COUNT;
    const initSkills = countDirs(skillsDir);
    assert(initSkills === expectedSkills - COMMAND_SKILL_COUNT, `init: Claude 技能数 = ${initSkills}（期望 ${expectedSkills - COMMAND_SKILL_COUNT}）`);
    assert(countDirs(join(agentsDir, 'skills')) === expectedSkills, `init: Codex 技能数 = ${expectedSkills}`);
    assert(existsSync(join(agentsDir, 'skills', 'team-command-dev', 'SKILL.md')), 'init: Codex 命令 skill 已生成');

    const initSkillNames = dirNames(skillsDir);
    assert(PUBLIC_SKILLS.every((s) => initSkillNames.includes(s)), `init: ${PUBLIC_SKILLS.length} 个公共技能齐全`);
    assert(validateSkills(skillsDir).length === 0, 'init: Claude skills frontmatter 有效');
    assert(validateSkills(join(agentsDir, 'skills')).length === 0, 'init: Codex skills frontmatter 有效');

    const initRules = fileNames(rulesDir);
    assert(PUBLIC_RULES.every((r) => initRules.includes(r)), 'init: 公共规则（git/design）齐全');

    // 语言隔离断言
    if (expectRule) assert(initRules.includes(expectRule), `init: 含本语言规则 ${expectRule}`);
    for (const absentRule of absentRules) {
      assert(!initRules.includes(absentRule), `init: 不含他语言规则 ${absentRule}`);
    }
    for (const rule of requiredRules) {
      assert(initRules.includes(rule), `init: 含规则 ${rule}`);
    }
    if (expectSpecs) {
      const specs = fileNames(join(claudeDir, 'specs'));
      assert(specs.length > 0, `init: specs/ 非空（${specs.length} 个）`);
    }

    const mcp = JSON.parse(readFileSync(join(claudeDir, '.mcp.json'), 'utf8'));
    assert(mcp.mcpServers && mcp.mcpServers[manifest.mcpSmokeServer], `init: MCP 已合并 ${manifest.mcpSmokeServer}`);

    // hooks 是 Node（.mjs），不是旧的 .sh
    const hooks = fileNames(join(claudeDir, 'hooks'));
    assert(hooks.includes('security-check.mjs') && hooks.includes('bash-check.mjs'), 'init: Node hooks (.mjs) 存在');
    assert(!hooks.some((h) => h.endsWith('.sh')), 'init: 无遗留 .sh hooks');
    assert(existsSync(join(codexDir, 'hooks.json')), 'init: Codex hooks.json 存在');
    assert(fileNames(join(codexDir, 'hooks')).includes('security-check.mjs'), 'init: Codex hooks 已同步');
    assert(existsSync(join(codexDir, 'config.toml')), 'init: Codex config.toml 存在');
    assert(fileNames(join(codexDir, 'agents')).filter((name) => name.endsWith('.toml')).length === AGENT_COUNT, `init: Codex custom agents = ${AGENT_COUNT}`);
    const codexConfig = readFileSync(join(codexDir, 'config.toml'), 'utf8');
    assert(codexConfig.includes(`[mcp_servers.${manifest.mcpSmokeServer}]`), `init: Codex MCP 已生成 ${manifest.mcpSmokeServer}`);
    if (manifest.codexConfigIncludes) {
      assert(codexConfig.includes(manifest.codexConfigIncludes), 'init: Codex MCP 参数环境变量通过 wrapper 展开');
    }
    const codexBuilder = readFileSync(join(agentsDir, 'agents', 'builder.md'), 'utf8');
    assert(!codexBuilder.includes('.claude/rules'), 'init: Codex agent 文档不再指向 .claude/rules');
    const projectPresetSkill = readFileSync(join(agentsDir, 'skills', 'team-command-project-preset', 'SKILL.md'), 'utf8');
    assert(!projectPresetSkill.includes('project-preset/.agents/'), 'init: project-preset 子目录不被 Codex 路径重写误伤');
    assert(projectPresetSkill.includes('`/project-preset` 是生成器'), 'init: project-preset skill 明确生成器职责');
    const skillCurator = readFileSync(join(agentsDir, 'skills', 'skill-curator', 'SKILL.md'), 'utf8');
    assert(
      skillCurator.includes('Project Preset Audit') && skillCurator.includes('Project Skill Adoption Score'),
      'init: skill-curator 包含 project-preset 审查能力'
    );

    const commands = fileNames(join(claudeDir, 'commands'));
    assert(
      commands.includes('plan.md') &&
        commands.includes('taste.md') &&
        commands.includes('project-preset.md') &&
        commands.length === 9,
      `init: 9 个命令含 plan.md + taste.md + project-preset.md (${commands.length})`
    );

    // 记录 update 前的"应保留"内容
    const settingsBefore = readFileSync(join(claudeDir, 'settings.json'), 'utf8');
    const workspaceExists = existsSync(join(claudeDir, 'workspace'));

    // --- update ---（关键：P0.1 守护点 + 语言保持）
    await silent(() => update({}));

    const updSkills = countDirs(skillsDir);
    assert(updSkills === expectedSkills - COMMAND_SKILL_COUNT, `update: Claude 技能数仍 = ${updSkills}（P0.1 守护，期望 ${expectedSkills - COMMAND_SKILL_COUNT}）`);
    assert(countDirs(join(agentsDir, 'skills')) === expectedSkills, `update: Codex 技能数仍 = ${expectedSkills}`);

    const updSkillNames = dirNames(skillsDir);
    assert(PUBLIC_SKILLS.every((s) => updSkillNames.includes(s)), 'update: 公共技能未被预设叠加删除');
    assert(validateSkills(skillsDir).length === 0, 'update: Claude skills frontmatter 有效');
    assert(validateSkills(join(agentsDir, 'skills')).length === 0, 'update: Codex skills frontmatter 有效');

    const updRules = fileNames(rulesDir);
    assert(PUBLIC_RULES.every((r) => updRules.includes(r)), 'update: 公共规则未被删除');
    if (expectRule) assert(updRules.includes(expectRule), `update: 本语言规则 ${expectRule} 保留`);
    for (const absentRule of absentRules) {
      assert(!updRules.includes(absentRule), `update: 未混入他语言规则 ${absentRule}`);
    }
    for (const rule of requiredRules) {
      assert(updRules.includes(rule), `update: 规则 ${rule} 保留`);
    }

    const settingsAfter = readFileSync(join(claudeDir, 'settings.json'), 'utf8');
    assert(settingsAfter === settingsBefore, 'update: settings.json 保持不变');
    assert(workspaceExists && existsSync(join(claudeDir, 'workspace')), 'update: workspace/ 保持不变');
    assert(existsSync(join(tmp, 'AGENTS.md')) && existsSync(join(codexDir, 'hooks.json')) && existsSync(join(codexDir, 'config.toml')), 'update: Codex 入口保持同步');
  } finally {
    process.chdir(prevCwd);
    rmSync(tmp, { recursive: true, force: true });
  }
}

console.log('create-claude-team 冒烟测试');

console.log('\n[配置校验]');
await silent(() => validateProject());
assert(true, 'validate: manifest / skill 结构通过');

for (const manifest of readPresetCatalog()) {
  const languages = Object.keys(manifest.languages ?? {});
  if (languages.length > 0) {
    for (const lang of languages) {
      await runScenario(manifest, { lang });
    }
  } else {
    await runScenario(manifest);
  }
}

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

console.log('\n[源目录保护]');
{
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const prevCwd = process.cwd();
  try {
    process.chdir(repoRoot);
    let blocked = false;
    try {
      await silent(() => init({ preset: 'web-fullstack', force: true }));
    } catch (err) {
      blocked = /配置源/.test(err.message);
    }
    assert(blocked, 'init --force: 拒绝覆盖 create-claude-team 配置源');
    assert(existsSync(join(repoRoot, '.claude', 'CLAUDE.md')), 'init --force: 源 .claude/ 未被删除');
  } finally {
    process.chdir(prevCwd);
  }
}

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
