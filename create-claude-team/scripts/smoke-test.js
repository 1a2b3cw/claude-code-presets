/**
 * 冒烟测试 — 验证 init / update 的核心契约。
 *
 * 重点守护 P0.1：update 不能删掉底座的公共 skills/rules。
 * 用法：npm test（在 create-claude-team/ 目录）
 *
 * 不依赖任何测试框架，纯 node 断言 + 退出码。
 */

import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { init } from '../lib/init.js';
import { missingPresetMcpServers, update } from '../lib/update.js';
import { readPresetCatalog } from '../lib/presets.js';
import { validateProject } from '../lib/validate.js';
import { validateSkills } from '../lib/skill-contracts.js';
import { toCodexText } from '../lib/codex/text.js';

const PUBLIC_SKILLS = ['architecture', 'code-review', 'debugging', 'performance', 'project-planning', 'skill-curator', 'testing', 'ui-prototype'];
const PUBLIC_RULES = ['git.md', 'design.md'];
const COMMAND_SKILL_COUNT = 9;
const AGENT_COUNT = 6;
const EVENT_COMMANDS = ['dev', 'check', 'review-all', 'ship', 'standup'];
const SUMMARY_COMMANDS = ['dev', 'check', 'review-all', 'ship'];
const STANDUP_REQUIRED_TEXT = ['roadmap.md', 'tasks.md', 'events.jsonl', 'journal.md', 'git log', '下一步建议', '重复问题/流程改进建议'];
const PRODUCT_BRIEF_REQUIRED_TEXT = ['product-brief.md', 'prd.md', '目标用户', '核心价值', '本期范围', '明确不做', '验收标准'];
const ROADMAP_REQUIRED_TEXT = ['模块 ID', '状态', '依赖', '验收标准', '风险', '最近更新', 'planned', 'in_progress', 'blocked', 'done', 'shipped'];
const TASKS_REQUIRED_TEXT = ['tasks.md', 'ready', 'needs_clarification', 'planned', 'in_progress', 'local_gate', 'review_gate', 'release_gate', 'blocked', 'shipped', 'done', '阻塞原因', 'Gate 结果', '验收命令'];
const REVIEW_REPORT_REQUIRED_TEXT = ['workspace/reviews/YYYY-MM-DD-<scope>.md', '结论', '关联任务', '变更范围', '问题列表', '严重度', '自动修复项', '剩余风险', 'events.jsonl.artifacts'];

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

function codexCommandSkillText(agentsDir, commandName) {
  return readFileSync(join(agentsDir, 'skills', `team-command-${commandName}`, 'SKILL.md'), 'utf8');
}

function codexCommandText(agentsDir, commandName) {
  return readFileSync(join(agentsDir, 'commands', `${commandName}.md`), 'utf8');
}

function hasSummaryContract(text) {
  return text.includes('## Summary') &&
    text.includes('affected files/modules') &&
    text.includes('checks') &&
    text.includes('next action') &&
    text.includes('events.jsonl.summary');
}

function hasProductBriefContract(text) {
  return PRODUCT_BRIEF_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasRoadmapContract(text) {
  return ROADMAP_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasTasksContract(text) {
  return TASKS_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasReviewReportContract(text) {
  return REVIEW_REPORT_REQUIRED_TEXT.every((part) => text.includes(part));
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
    assert(
      EVENT_COMMANDS.every((commandName) => codexCommandSkillText(agentsDir, commandName).includes('.claude/workspace/events.jsonl')),
      'init: Codex command skills 包含 events.jsonl 契约'
    );
    assert(
      EVENT_COMMANDS.every((commandName) => {
        const text = codexCommandSkillText(agentsDir, commandName);
        return text.includes('`time`') && text.includes('`command`') && text.includes('`status`') && text.includes('`summary`');
      }),
      'init: events.jsonl 契约包含核心字段'
    );
    assert(
      SUMMARY_COMMANDS.every((commandName) => {
        return hasSummaryContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasSummaryContract(codexCommandText(agentsDir, commandName));
      }),
      'init: dev/check/review-all/ship command 与 skill 包含标准结果摘要契约'
    );
    {
      const standupSkill = codexCommandSkillText(agentsDir, 'standup');
      const standupCommand = codexCommandText(agentsDir, 'standup');
      assert(
        STANDUP_REQUIRED_TEXT.every((text) => standupSkill.includes(text) && standupCommand.includes(text)) &&
          standupSkill.includes('非 `/standup` 事件') &&
          standupCommand.includes('非 `/standup` 事件'),
        'init: standup command 与 skill 包含真实状态读取契约'
      );
    }
    {
      const planSkill = codexCommandSkillText(agentsDir, 'plan');
      const planCommand = codexCommandText(agentsDir, 'plan');
      const projectPresetSkillText = codexCommandSkillText(agentsDir, 'project-preset');
      const projectPresetCommand = codexCommandText(agentsDir, 'project-preset');
      assert(
        hasProductBriefContract(planSkill) &&
          hasProductBriefContract(planCommand) &&
          hasProductBriefContract(projectPresetSkillText) &&
          hasProductBriefContract(projectPresetCommand),
        'init: plan/project-preset command 与 skill 包含 Product Brief 契约'
      );
    }
    assert(
      hasRoadmapContract(codexCommandSkillText(agentsDir, 'plan')) &&
        hasRoadmapContract(codexCommandText(agentsDir, 'plan')) &&
        hasRoadmapContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasRoadmapContract(codexCommandText(agentsDir, 'dev')),
      'init: plan/dev command 与 skill 包含 roadmap 状态源契约'
    );
    assert(
      SUMMARY_COMMANDS.every((commandName) => {
        return hasTasksContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasTasksContract(codexCommandText(agentsDir, commandName));
      }),
      'init: dev/check/review-all/ship command 与 skill 包含 tasks.md 状态机契约'
    );
    assert(
      hasReviewReportContract(codexCommandSkillText(agentsDir, 'review-all')) &&
        hasReviewReportContract(codexCommandText(agentsDir, 'review-all')),
      'init: review-all command 与 skill 包含 review report 契约'
    );

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
    assert(
      EVENT_COMMANDS.every((commandName) => codexCommandSkillText(agentsDir, commandName).includes('.claude/workspace/events.jsonl')),
      'update: Codex command skills 保留 events.jsonl 契约'
    );
    assert(
      SUMMARY_COMMANDS.every((commandName) => codexCommandSkillText(agentsDir, commandName).includes('affected files/modules')),
      'update: Codex command skills 保留标准结果摘要契约'
    );
    assert(
      SUMMARY_COMMANDS.every((commandName) => codexCommandText(agentsDir, commandName).includes('affected files/modules')),
      'update: Codex command docs 保留标准结果摘要契约'
    );
    {
      const standupSkill = codexCommandSkillText(agentsDir, 'standup');
      const standupCommand = codexCommandText(agentsDir, 'standup');
      assert(
        STANDUP_REQUIRED_TEXT.every((text) => standupSkill.includes(text) && standupCommand.includes(text)),
        'update: standup command 与 skill 保留真实状态读取契约'
      );
    }
    assert(
      hasProductBriefContract(codexCommandSkillText(agentsDir, 'plan')) &&
        hasProductBriefContract(codexCommandText(agentsDir, 'plan')) &&
        hasProductBriefContract(codexCommandSkillText(agentsDir, 'project-preset')) &&
        hasProductBriefContract(codexCommandText(agentsDir, 'project-preset')),
      'update: plan/project-preset command 与 skill 保留 Product Brief 契约'
    );
    assert(
      hasRoadmapContract(codexCommandSkillText(agentsDir, 'plan')) &&
        hasRoadmapContract(codexCommandText(agentsDir, 'plan')) &&
        hasRoadmapContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasRoadmapContract(codexCommandText(agentsDir, 'dev')),
      'update: plan/dev command 与 skill 保留 roadmap 状态源契约'
    );
    assert(
      SUMMARY_COMMANDS.every((commandName) => {
        return hasTasksContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasTasksContract(codexCommandText(agentsDir, commandName));
      }),
      'update: dev/check/review-all/ship command 与 skill 保留 tasks.md 状态机契约'
    );
    assert(
      hasReviewReportContract(codexCommandSkillText(agentsDir, 'review-all')) &&
        hasReviewReportContract(codexCommandText(agentsDir, 'review-all')),
      'update: review-all command 与 skill 保留 review report 契约'
    );

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

console.log('\n[Codex 文本重写]');
{
  const rewritten = toCodexText([
    '见 `rules/design.md` 和 `commands/taste.md`。',
    '保留 `project-preset/rules/project.md`。',
    '保留 `lang/python/rules/python.md`。',
    '显式 `.claude/specs/node.md` 应改写。',
  ].join('\n'));
  assert(rewritten.includes('`.agents/rules/design.md`'), 'toCodexText: 相对 rules/ 路径改写');
  assert(rewritten.includes('`.agents/commands/taste.md`'), 'toCodexText: 相对 commands/ 路径改写');
  assert(rewritten.includes('`project-preset/rules/project.md`'), 'toCodexText: 不误伤 project-preset/rules/');
  assert(rewritten.includes('`lang/python/rules/python.md`'), 'toCodexText: 不误伤 lang/*/rules/');
  assert(rewritten.includes('`.agents/specs/node.md`'), 'toCodexText: 显式 .claude/specs/ 路径改写');
}

console.log('\n[MCP 漂移检测]');
{
  const tmp = mkdtempSync(join(tmpdir(), 'cct-mcp-'));
  try {
    const targetPath = join(tmp, '.mcp.json');
    const presetPath = join(tmp, 'preset.mcp.json');
    writeFileSync(targetPath, JSON.stringify({ mcpServers: { github: {} } }));
    writeFileSync(presetPath, JSON.stringify({ mcpServers: { github: {}, postgres: {} } }));
    assert(
      missingPresetMcpServers(targetPath, presetPath).join(',') === 'postgres',
      'update: 能检测预设 MCP server 漂移'
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

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
