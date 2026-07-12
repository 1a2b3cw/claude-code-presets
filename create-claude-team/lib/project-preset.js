import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { validateSkills } from './skill-contracts.js';

const PRESET_DIR = 'project-preset';
const REQUIRED_MANIFEST_FIELDS = [
  'name', 'version', 'source', 'generatedAt', 'updatedAt', 'priority', 'profileDir', 'curation', 'rules', 'specs',
];
const FORBIDDEN_DIRECTORIES = new Set(['.claude', '.agents', '.codex']);
const APPROVED_CURATION_RESULTS = new Set(['通过', 'pass']);

function normalize(value) {
  return String(value ?? '').trim();
}

function addIssue(issues, code, message, action) {
  issues.push({ code, message, action });
}

function relativePath(cwd, path) {
  return relative(cwd, path).replaceAll('\\', '/');
}

function isSafeEntry(value) {
  return typeof value === 'string' && value.trim() !== '' && !/[\\/]/.test(value) && value !== '.' && value !== '..';
}

function isMissingManifestValue(value) {
  return value === undefined || value === null || (typeof value === 'string' && normalize(value) === '');
}

function readJson(path, issues) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    addIssue(issues, 'manifest_invalid', `${path}: manifest.json 不是合法 JSON`, '修复 project-preset/manifest.json 的 JSON 语法。');
    return null;
  }
}

function getCurationResult(markdown) {
  const line = String(markdown ?? '').match(/^\s*-\s*审查结论[：:]\s*(.+?)\s*$/m)?.[1];
  return normalize(line).toLowerCase();
}

function validateManifestReferences({ cwd, presetDir, manifest, issues }) {
  const entryGroups = [
    { field: 'rules', directory: 'rules' },
    { field: 'specs', directory: 'specs' },
  ];

  for (const { field, directory } of entryGroups) {
    const entries = manifest[field];
    if (!Array.isArray(entries)) {
      addIssue(issues, 'manifest_field_invalid', `project-preset/manifest.json: ${field} 必须是数组`, `将 ${field} 改为文件名数组。`);
      continue;
    }
    const directoryPath = join(presetDir, directory);
    if (!existsSync(directoryPath) || !statSync(directoryPath).isDirectory()) {
      addIssue(issues, 'directory_missing', `缺少 project-preset/${directory}/ 目录`, `创建 project-preset/${directory}/ 目录后重新校验。`);
    }
    if (field === 'rules' && entries.length === 0) {
      addIssue(issues, 'rules_empty', 'project-preset/manifest.json: rules 不能为空', '至少声明一条经过确认的项目级硬规则。');
    }
    for (const entry of entries) {
      if (!isSafeEntry(entry)) {
        addIssue(issues, 'manifest_entry_invalid', `project-preset/manifest.json: ${field} 包含非法文件名 ${String(entry)}`, `只在 ${directory}/ 下声明直接文件名。`);
        continue;
      }
      const path = join(presetDir, directory, entry);
      if (!existsSync(path) || !statSync(path).isFile()) {
        addIssue(issues, 'manifest_reference_missing', `project-preset/manifest.json: ${field} 声明的 ${directory}/${entry} 不存在`, `创建 project-preset/${directory}/${entry}，或从 manifest 移除该引用。`);
      }
    }
  }

  const profileDir = normalize(manifest.profileDir);
  if (profileDir !== 'project-profile') {
    addIssue(issues, 'profile_dir_invalid', 'project-preset/manifest.json: profileDir 必须为 project-profile', '使用项目根目录下的 project-profile，避免相对路径漂移。');
  } else if (!existsSync(join(cwd, profileDir)) || !statSync(join(cwd, profileDir)).isDirectory()) {
    addIssue(issues, 'profile_missing', 'project-preset/manifest.json: project-profile 目录不存在', '先运行 /project-preset 生成 project-profile，或补齐现有项目画像。');
  }
}

export function validateProjectPreset({ cwd = process.cwd() } = {}) {
  const presetDir = join(cwd, PRESET_DIR);
  const issues = [];
  if (!existsSync(presetDir)) {
    return {
      status: 'absent',
      issues,
      presetDir: PRESET_DIR,
      manifest: null,
      files: [],
      curationResult: null,
    };
  }

  if (!statSync(presetDir).isDirectory()) {
    addIssue(issues, 'preset_not_directory', 'project-preset 必须是目录', '移除同名普通文件后重新生成项目 preset。');
    return { status: 'needs_revision', issues, presetDir: PRESET_DIR, manifest: null, files: [], curationResult: null };
  }

  for (const directory of FORBIDDEN_DIRECTORIES) {
    if (existsSync(join(presetDir, directory))) {
      addIssue(issues, 'forbidden_directory', `project-preset/${directory} 不允许存在`, '删除该嵌套目录；项目规则必须保留在 project-preset/rules、specs 或 skills。');
    }
  }

  const presetPath = join(presetDir, 'PRESET.md');
  const manifestPath = join(presetDir, 'manifest.json');
  if (!existsSync(presetPath)) addIssue(issues, 'preset_entry_missing', '缺少 project-preset/PRESET.md', '创建项目 preset 入口文档。');
  if (!existsSync(manifestPath)) {
    addIssue(issues, 'manifest_missing', '缺少 project-preset/manifest.json', '创建 manifest 并声明 rules/specs/curation。');
    return { status: 'needs_revision', issues, presetDir: PRESET_DIR, manifest: null, files: [], curationResult: null };
  }

  const manifest = readJson(manifestPath, issues);
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { status: 'needs_revision', issues, presetDir: PRESET_DIR, manifest: null, files: [], curationResult: null };
  }

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (isMissingManifestValue(manifest[field])) {
      addIssue(issues, 'manifest_field_missing', `project-preset/manifest.json: 缺少 ${field}`, `补齐 manifest.${field}。`);
    }
  }
  if (manifest.name && manifest.name !== 'project-preset') {
    addIssue(issues, 'manifest_name_invalid', 'project-preset/manifest.json: name 必须为 project-preset', '使用固定 name，避免被当作可发布的技术栈 preset。');
  }
  if (manifest.priority && manifest.priority !== 'project-over-technical-preset') {
    addIssue(issues, 'manifest_priority_invalid', 'project-preset/manifest.json: priority 必须为 project-over-technical-preset', '使用固定优先级，保持加载顺序一致。');
  }
  if (manifest.curation && manifest.curation !== 'curation.md') {
    addIssue(issues, 'curation_path_invalid', 'project-preset/manifest.json: curation 必须为 curation.md', '将 curator 审查结果保留在 project-preset/curation.md。');
  }

  validateManifestReferences({ cwd, presetDir, manifest, issues });

  const curationPath = join(presetDir, 'curation.md');
  let curationResult = null;
  if (!existsSync(curationPath)) {
    addIssue(issues, 'curation_missing', '缺少 project-preset/curation.md', '使用 skill-curator 审查 project-preset 并写入结论。');
  } else {
    curationResult = getCurationResult(readFileSync(curationPath, 'utf8'));
    if (!curationResult) {
      addIssue(issues, 'curation_result_missing', 'project-preset/curation.md 缺少“审查结论”字段', '写入“- 审查结论：通过 / 需修订 / 暂停等待用户确认”。');
    } else if (!APPROVED_CURATION_RESULTS.has(curationResult)) {
      addIssue(issues, 'curation_not_approved', `project-preset/curation.md 当前结论为“${curationResult}”`, '先修订或确认项目 preset；只有审查结论为“通过”才会加载。');
    }
  }

  const skillsDir = join(presetDir, 'skills');
  if (!existsSync(skillsDir) || !statSync(skillsDir).isDirectory()) {
    addIssue(issues, 'skills_directory_missing', '缺少 project-preset/skills/ 目录', '创建 skills/；没有项目专属 skill 时保留 README.md。');
  } else {
    for (const issue of validateSkills(skillsDir)) {
      addIssue(issues, 'skill_invalid', `project-preset/skills/${issue}`, '修复 SKILL.md frontmatter，或将候选项降级为 skills/README.md。');
    }
  }

  const files = issues.length === 0
    ? [
      'project-preset/PRESET.md',
      ...(manifest.rules ?? []).map((entry) => `project-preset/rules/${entry}`),
      ...(manifest.specs ?? []).map((entry) => `project-preset/specs/${entry}`),
    ]
    : [];
  return {
    status: issues.length === 0 ? 'pass' : 'needs_revision',
    issues,
    presetDir: relativePath(cwd, presetDir),
    manifest,
    files,
    curationResult,
  };
}

export function getProjectPresetContext({ cwd = process.cwd() } = {}) {
  const result = validateProjectPreset({ cwd });
  const fallback = ['.claude/rules/', 'installed technical preset'];
  return {
    status: result.status,
    loadable: result.status === 'pass',
    files: result.files,
    fallback,
    issues: result.issues,
    next: result.status === 'pass'
      ? '先读取 PRESET.md，再读取相关 rules，技术细节不足时按需读取 specs。'
      : (result.status === 'absent'
        ? '未发现 project-preset；继续使用 base 和已安装技术栈 preset，按需运行 /project-preset。'
        : 'project-preset 未通过校验；修复后再加载，不能静默把它当作项目规则。'),
  };
}

export function formatProjectPresetResult(result, { mode = 'validate', json = false } = {}) {
  const payload = result;
  if (json) return JSON.stringify(payload, null, 2);

  const details = payload.status === 'absent'
    ? '  - 未发现 project-preset；当前项目将使用 fallback 配置。'
    : (payload.issues.length === 0
      ? '  - 无；可以按 project-preset 读取顺序继续。'
      : payload.issues.map((issue) => `  - [${issue.code}] ${issue.message}\n    下一步：${issue.action}`).join('\n'));
  const files = payload.files.length > 0 ? `\n  加载文件: ${payload.files.join(', ')}` : '';
  return `\nproject-preset ${mode}: ${payload.status}${files}\n  结果:\n${details}\n  下一步: ${payload.next ?? '修复项目 preset 后重新校验。'}`;
}
