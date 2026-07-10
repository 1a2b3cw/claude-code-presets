import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export function skillDirs(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .filter((dir) => existsSync(join(dir, 'SKILL.md')));
}

export function validateSkillDir(skillDir) {
  const skillName = basename(skillDir);
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

export function validateSkills(root) {
  return skillDirs(root).flatMap(validateSkillDir);
}
