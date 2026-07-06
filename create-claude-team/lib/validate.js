import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findSourceDir } from './copy.js';
import { readPresetCatalog, validatePresetManifest } from './presets.js';

function skillDirs(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .filter((dir) => existsSync(join(dir, 'SKILL.md')));
}

function validateSkillDir(skillDir) {
  const skillName = skillDir.split(/[\\/]/).at(-1);
  const content = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return [`${skillName}: 缺少 YAML frontmatter`];

  const name = match[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  const issues = [];
  if (!name) issues.push(`${skillName}: 缺少 name`);
  if (!description) issues.push(`${skillName}: 缺少 description`);
  if (name && name !== skillName) issues.push(`${skillName}: name 应为 ${skillName}，实际为 ${name}`);
  if (description && description.length < 20) issues.push(`${skillName}: description 过短`);
  return issues;
}

function validateSkills(root) {
  return skillDirs(root).flatMap(validateSkillDir);
}

function validateJsonFile(path, label) {
  try {
    JSON.parse(readFileSync(path, 'utf8'));
    return [];
  } catch (err) {
    return [`${label}: JSON 无效 (${err.message})`];
  }
}

function validatePreset(sourceDir, manifest) {
  const presetDir = join(sourceDir, 'presets', manifest.dirName ?? manifest.name);
  const issues = validatePresetManifest(manifest);

  if (!existsSync(join(presetDir, 'PRESET.md'))) issues.push(`${manifest.name}: 缺少 PRESET.md`);
  if (!existsSync(join(presetDir, 'preset.mcp.json'))) issues.push(`${manifest.name}: 缺少 preset.mcp.json`);
  if (existsSync(join(presetDir, 'preset.mcp.json'))) {
    issues.push(...validateJsonFile(join(presetDir, 'preset.mcp.json'), `${manifest.name}/preset.mcp.json`));
  }

  for (const rule of manifest.rules ?? []) {
    if (!existsSync(join(presetDir, 'rules', rule))) {
      issues.push(`${manifest.name}: manifest 声明的 rule 不存在: ${rule}`);
    }
  }

  if (manifest.expectSpecs && !existsSync(join(presetDir, 'specs'))) {
    issues.push(`${manifest.name}: expectSpecs=true 但 specs/ 不存在`);
  }

  const skillCount = skillDirs(join(presetDir, 'skills')).length;
  if (skillCount !== manifest.skillCount) {
    issues.push(`${manifest.name}: skillCount=${manifest.skillCount}，实际 skills=${skillCount}`);
  }
  issues.push(...validateSkills(join(presetDir, 'skills')).map((issue) => `${manifest.name}/${issue}`));

  for (const [lang, config] of Object.entries(manifest.languages ?? {})) {
    const langDir = join(presetDir, 'lang', lang);
    if (!existsSync(langDir)) issues.push(`${manifest.name}: 语言目录不存在: ${lang}`);
    if (config.expectRule && !existsSync(join(langDir, 'rules', config.expectRule))) {
      issues.push(`${manifest.name}/${lang}: expectRule 不存在: ${config.expectRule}`);
    }
  }

  return issues;
}

export async function validateProject({ sourceDir = findSourceDir() } = {}) {
  const issues = [];
  const catalog = readPresetCatalog(sourceDir);

  if (catalog.length === 0) issues.push('没有发现任何 preset manifest');
  for (const manifest of catalog) {
    issues.push(...validatePreset(sourceDir, manifest));
  }

  issues.push(...validateSkills(join(sourceDir, '.claude', 'skills')).map((issue) => `.claude/${issue}`));

  if (issues.length > 0) {
    console.error('\n配置校验失败:\n');
    for (const issue of issues) console.error(`  - ${issue}`);
    throw new Error(`发现 ${issues.length} 个配置问题`);
  }

  console.log('\n配置校验通过');
  console.log(`  预设: ${catalog.map((preset) => preset.name).join(', ')}`);
  console.log(`  公共 skills: ${skillDirs(join(sourceDir, '.claude', 'skills')).length}`);
}
