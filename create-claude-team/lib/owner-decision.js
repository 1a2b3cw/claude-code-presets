import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseArtifactMetadata, validatePlanningArtifacts } from './planning-artifacts.js';

const DECISION_STATUSES = new Set(['draft', 'awaiting_owner', 'confirmed', 'rejected', 'superseded']);
const DECISION_TYPES = new Set(['product_scope', 'architecture', 'security_privacy', 'irreversible_operation', 'release_risk']);
const REQUIRED_METADATA = ['Decision ID', 'Status', 'Decision Type', 'Target Module', 'Requested By', 'Related Spec'];
const REQUIRED_BRIEF_FIELDS = ['Decision', 'Context', 'Recommendation', 'Options', 'If no reply'];
const REQUIRED_CONFIRMATION_FIELDS = ['Confirmed option', 'Confirmed by', 'Confirmation date'];

function normalize(value) {
  return String(value ?? '').trim().replace(/^`|`$/g, '');
}

function splitValues(value) {
  return normalize(value).split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
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

function isInsideWorkspace(cwd, path) {
  const localPath = relative(cwd, path);
  return !localPath.startsWith('..') && localPath !== '';
}

function isDecisionBriefPath(cwd, path) {
  return relative(cwd, path).replaceAll('\\', '/').startsWith('.claude/workspace/decisions/');
}

function statusFor(issues) {
  const blockingCodes = new Set(['planning_invalid', 'brief_missing', 'brief_outside_workspace', 'brief_path_invalid', 'target_missing', 'status_not_confirmed']);
  return issues.some((issue) => blockingCodes.has(issue.code)) ? 'blocked' : (issues.length > 0 ? 'needs_revision' : 'pass');
}

export function validateOwnerDecision({ cwd = process.cwd(), path } = {}) {
  const planning = validatePlanningArtifacts({ cwd });
  const issues = [];
  if (!planning.valid) {
    for (const issue of planning.issues) addIssue(issues, 'planning_invalid', issue, '先修复 planning artifact，再校验 Owner Decision Brief。');
    return { status: 'blocked', planning, issues, path: null, metadata: {}, module: null, decisionTypes: [] };
  }

  const briefPath = path ? resolve(cwd, path) : null;
  if (!briefPath || !existsSync(briefPath)) {
    addIssue(issues, 'brief_missing', `找不到 Owner Decision Brief：${path ?? 'missing'}`, '创建 .claude/workspace/decisions/YYYY-MM-DD-<module>-<topic>.md。');
    return { status: 'blocked', planning, issues, path: null, metadata: {}, module: null, decisionTypes: [] };
  }
  if (!isInsideWorkspace(cwd, briefPath)) {
    addIssue(issues, 'brief_outside_workspace', 'Owner Decision Brief 必须位于当前仓库内', '将 Brief 放入 .claude/workspace/decisions/ 并使用仓库内路径。');
    return { status: 'blocked', planning, issues, path: null, metadata: {}, module: null, decisionTypes: [] };
  }
  if (!isDecisionBriefPath(cwd, briefPath)) {
    addIssue(issues, 'brief_path_invalid', 'Owner Decision Brief 必须位于 .claude/workspace/decisions/', '将 Brief 移到 .claude/workspace/decisions/YYYY-MM-DD-<module>-<topic>.md。');
    return { status: 'blocked', planning, issues, path: null, metadata: {}, module: null, decisionTypes: [] };
  }

  const markdown = readFileSync(briefPath, 'utf8');
  const metadata = parseArtifactMetadata(markdown);
  for (const key of REQUIRED_METADATA) {
    if (!normalize(metadata[key])) addIssue(issues, 'metadata_missing', `${relative(cwd, briefPath)}: 缺少 ${key}`, `补齐 Owner Decision Brief 的 ${key}。`);
  }

  const status = normalize(metadata.Status).toLowerCase();
  if (status && !DECISION_STATUSES.has(status)) {
    addIssue(issues, 'status_invalid', `不支持 Decision Status：${metadata.Status}`, `使用 ${[...DECISION_STATUSES].join(' / ')}。`);
  } else if (status && status !== 'confirmed') {
    addIssue(issues, 'status_not_confirmed', `Decision Status 为 ${metadata.Status}，尚不能作为开工确认`, status === 'rejected' || status === 'superseded' ? '创建新的待确认 Brief；不得借用已拒绝或已替代的决定。' : '等待 Owner 明确确认选项后，将 Status 更新为 confirmed。');
  }

  const decisionTypes = splitValues(metadata['Decision Type']);
  if (decisionTypes.length === 0) {
    addIssue(issues, 'decision_type_missing', 'Decision Type 不能为空', `使用 ${[...DECISION_TYPES].join(' / ')}。`);
  }
  for (const type of decisionTypes) {
    if (!DECISION_TYPES.has(type)) addIssue(issues, 'decision_type_invalid', `不支持 Decision Type：${type}`, `使用 ${[...DECISION_TYPES].join(' / ')}。`);
  }

  const target = normalize(metadata['Target Module']);
  const module = planning.modules.find((item) => item['模块 ID'] === target) ?? null;
  if (!module) addIssue(issues, 'target_missing', `Target Module 不存在：${metadata['Target Module'] ?? 'missing'}`, '引用 roadmap 中存在的模块 ID。');

  const brief = sectionText(markdown, 'Owner Decision Brief');
  if (!brief.trim()) {
    addIssue(issues, 'brief_section_missing', '缺少 ## Owner Decision Brief', '补充 Decision、Context、Recommendation、Options 和 If no reply。');
  } else {
    for (const field of REQUIRED_BRIEF_FIELDS) {
      if (!hasField(brief, field)) addIssue(issues, 'brief_field_missing', `Owner Decision Brief 缺少 ${field}`, `补充 - ${field}: ...。`);
    }
  }

  const confirmation = sectionText(markdown, 'Owner Confirmation');
  if (!confirmation.trim()) {
    addIssue(issues, 'confirmation_missing', '缺少 ## Owner Confirmation', '保留确认章节；只有 Owner 明确回复后才填写 confirmed 字段。');
  } else if (status === 'confirmed') {
    for (const field of REQUIRED_CONFIRMATION_FIELDS) {
      if (!hasField(confirmation, field)) addIssue(issues, 'confirmation_field_missing', `confirmed Brief 缺少 ${field}`, `补充 - ${field}: ...。`);
    }
  }

  return {
    status: statusFor(issues),
    planning,
    issues,
    path: relative(cwd, briefPath).replaceAll('\\', '/'),
    metadata,
    module,
    decisionTypes,
  };
}

export function formatOwnerDecision(result, { json = false } = {}) {
  if (json) return JSON.stringify({
    status: result.status,
    decisionId: result.metadata?.['Decision ID'] ?? null,
    target: result.module?.['模块 ID'] ?? null,
    decisionTypes: result.decisionTypes ?? [],
    path: result.path ?? null,
    issues: result.issues,
  }, null, 2);

  const details = result.issues.length === 0
    ? '  - 无；确认记录完整，可作为匹配任务的开工依据。'
    : result.issues.map((issue) => `  - [${issue.code}] ${issue.message}\n    下一步：${issue.action}`).join('\n');
  return `\ndecision validate: ${result.status}\n  Decision: ${result.metadata?.['Decision ID'] ?? 'unknown'}\n  Target: ${result.module?.['模块 ID'] ?? 'unknown'}\n  结果:\n${details}`;
}
