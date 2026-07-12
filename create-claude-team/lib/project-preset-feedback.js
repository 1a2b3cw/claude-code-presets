import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseArtifactMetadata } from './planning-artifacts.js';
import { validateProjectPreset } from './project-preset.js';

const PROPOSAL_STATUSES = new Set(['draft', 'awaiting_owner', 'confirmed', 'rejected', 'superseded']);
const EVIDENCE_TYPES = new Set(['owner_feedback', 'repeated_evidence']);
const REQUIRED_METADATA = ['Proposal ID', 'Status', 'Evidence Type', 'Target Files', 'Requested By'];
const REQUIRED_SECTIONS = ['Source Feedback', 'Evidence', 'Proposed Change', 'Safety Boundaries', 'Owner Confirmation'];
const REQUIRED_CONFIRMATION_FIELDS = ['Confirmed option', 'Confirmed by', 'Confirmation date'];

function normalize(value) {
  return String(value ?? '').trim().replace(/^`|`$/g, '');
}

function splitValues(value) {
  return normalize(value).split(',').map((item) => item.trim().replace(/^`|`$/g, '')).filter(Boolean);
}

function addIssue(issues, code, message, action) {
  issues.push({ code, message, action });
}

function sectionText(markdown, title) {
  const pattern = new RegExp(`^##\\s+${title}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'm');
  return markdown.match(pattern)?.[1] ?? '';
}

function hasField(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^-\\s+${escaped}[：:]\\s*\\S+`, 'm').test(markdown);
}

function isInside(cwd, path) {
  const local = relative(cwd, path);
  return !local.startsWith('..') && local !== '';
}

function isProposalPath(cwd, path) {
  return relative(cwd, path).replaceAll('\\', '/').startsWith('project-profile/feedback/');
}

function isAllowedTarget(path) {
  const normalized = path.replaceAll('\\', '/');
  if (!normalized || normalized.includes('..') || normalized.startsWith('/') || normalized.includes('/.')) return false;
  return normalized.startsWith('project-profile/') || normalized.startsWith('project-preset/');
}

function isRegularLocalFile(path) {
  const stats = lstatSync(path);
  return stats.isFile() && !stats.isSymbolicLink();
}

function resultStatus(issues, status) {
  if (issues.some((issue) => ['preset_unavailable', 'proposal_missing', 'proposal_outside_project', 'proposal_path_invalid', 'proposal_not_regular_file'].includes(issue.code))) {
    return 'blocked';
  }
  if (issues.length > 0) return 'needs_revision';
  if (status === 'confirmed') return 'pass';
  if (status === 'rejected' || status === 'superseded') return 'blocked';
  return 'needs_confirmation';
}

export function validateProjectPresetFeedback({ cwd = process.cwd(), path } = {}) {
  const preset = validateProjectPreset({ cwd });
  const issues = [];
  if (preset.status !== 'pass') {
    addIssue(
      issues,
      'preset_unavailable',
      `project-preset 当前状态为 ${preset.status}，不能基于未激活 preset 提交反馈修改。`,
      '先修复并运行 project-preset validate；只有可加载 preset 才能接收受控更新。'
    );
    return { status: 'blocked', preset, issues, path: null, metadata: {}, targetFiles: [] };
  }

  const proposalPath = path ? resolve(cwd, path) : null;
  if (!proposalPath || !existsSync(proposalPath)) {
    addIssue(issues, 'proposal_missing', `找不到 feedback proposal：${path ?? 'missing'}`, '创建 project-profile/feedback/YYYY-MM-DD-<topic>.md 后重新校验。');
    return { status: 'blocked', preset, issues, path: null, metadata: {}, targetFiles: [] };
  }
  if (!isInside(cwd, proposalPath)) {
    addIssue(issues, 'proposal_outside_project', 'feedback proposal 必须位于当前项目内', '将 proposal 放入 project-profile/feedback/，不要引用外部路径。');
    return { status: 'blocked', preset, issues, path: null, metadata: {}, targetFiles: [] };
  }
  if (!isProposalPath(cwd, proposalPath)) {
    addIssue(issues, 'proposal_path_invalid', 'feedback proposal 必须位于 project-profile/feedback/', '使用 project-profile/feedback/YYYY-MM-DD-<topic>.md 作为候选修改记录。');
    return { status: 'blocked', preset, issues, path: null, metadata: {}, targetFiles: [] };
  }
  if (!isRegularLocalFile(proposalPath)) {
    addIssue(issues, 'proposal_not_regular_file', 'feedback proposal 不能是符号链接或目录', '在 project-profile/feedback/ 创建普通 Markdown 文件，避免读取项目外内容。');
    return { status: 'blocked', preset, issues, path: null, metadata: {}, targetFiles: [] };
  }

  const markdown = readFileSync(proposalPath, 'utf8');
  const metadata = parseArtifactMetadata(markdown);
  for (const key of REQUIRED_METADATA) {
    if (!normalize(metadata[key])) addIssue(issues, 'metadata_missing', `${relative(cwd, proposalPath)}: 缺少 ${key}`, `补齐 proposal 头部的 ${key}。`);
  }

  const status = normalize(metadata.Status).toLowerCase();
  if (status && !PROPOSAL_STATUSES.has(status)) {
    addIssue(issues, 'status_invalid', `不支持 Proposal Status：${metadata.Status}`, `使用 ${[...PROPOSAL_STATUSES].join(' / ')}。`);
  }

  const evidenceType = normalize(metadata['Evidence Type']).toLowerCase();
  if (evidenceType && !EVIDENCE_TYPES.has(evidenceType)) {
    addIssue(issues, 'evidence_type_invalid', `不支持 Evidence Type：${metadata['Evidence Type']}`, `使用 ${[...EVIDENCE_TYPES].join(' / ')}。`);
  }

  const targetFiles = splitValues(metadata['Target Files']);
  if (targetFiles.length === 0) {
    addIssue(issues, 'target_files_missing', 'Target Files 不能为空', '列出将被最小化更新的 project-profile/ 或 project-preset/ 文件。');
  }
  for (const target of targetFiles) {
    if (!isAllowedTarget(target)) {
      addIssue(issues, 'target_file_invalid', `Target Files 包含越界路径：${target}`, '只允许现有 project-profile/ 或 project-preset/ 下的相对文件。');
    } else if (!existsSync(resolve(cwd, target))) {
      addIssue(issues, 'target_file_missing', `Target Files 指向的文件不存在：${target}`, '候选修改只能更新当前存在的 project-profile/ 或 project-preset/ 文件。');
    } else if (!isRegularLocalFile(resolve(cwd, target))) {
      addIssue(issues, 'target_file_not_regular', `Target Files 不能是符号链接或目录：${target}`, '只允许更新项目内现有的普通文件，避免越过项目边界。');
    }
  }

  for (const title of REQUIRED_SECTIONS) {
    const content = sectionText(markdown, title);
    if (!content.trim()) addIssue(issues, 'section_missing', `${relative(cwd, proposalPath)}: 缺少 ## ${title}`, `补齐 ## ${title}。`);
  }
  for (const title of ['Source Feedback', 'Evidence', 'Proposed Change', 'Safety Boundaries']) {
    if (!sectionText(markdown, title).match(/\S/)) {
      addIssue(issues, 'section_empty', `## ${title} 不能为空`, '写明可复核的输入、拟修改内容和明确不做的边界。');
    }
  }

  const confirmation = sectionText(markdown, 'Owner Confirmation');
  if (status === 'confirmed') {
    for (const field of REQUIRED_CONFIRMATION_FIELDS) {
      if (!hasField(confirmation, field)) addIssue(issues, 'confirmation_missing', `confirmed proposal 缺少 ${field}`, `只有 Owner 明确确认后，才填写 - ${field}: ...。`);
    }
  }

  return {
    status: resultStatus(issues, status),
    preset,
    issues,
    path: relative(cwd, proposalPath).replaceAll('\\', '/'),
    metadata,
    targetFiles,
  };
}

export function formatProjectPresetFeedback(result, { json = false } = {}) {
  if (json) return JSON.stringify({
    status: result.status,
    proposalId: result.metadata?.['Proposal ID'] ?? null,
    proposalPath: result.path ?? null,
    targetFiles: result.targetFiles ?? [],
    issues: result.issues,
  }, null, 2);

  const details = result.issues.length > 0
    ? result.issues.map((issue) => `  - [${issue.code}] ${issue.message}\n    下一步：${issue.action}`).join('\n')
    : (result.status === 'pass'
      ? '  - 无；Owner 已确认，允许按 proposal 中的最小 diff 更新目标文件，然后重新运行 project-preset validate/context。'
      : '  - proposal 结构完整，但尚未获得 Owner 对具体规则内容的确认；不得修改 Target Files。');
  return `\nproject-preset feedback validate: ${result.status}\n  Proposal: ${result.metadata?.['Proposal ID'] ?? 'unknown'}\n  Targets: ${(result.targetFiles ?? []).join(', ') || 'none'}\n  结果:\n${details}`;
}
