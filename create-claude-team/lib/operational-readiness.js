import { existsSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseArtifactMetadata, validatePlanningArtifacts } from './planning-artifacts.js';

const READINESS_STATUSES = new Set(['draft', 'ready', 'complete', 'blocked']);
const RISK_LEVELS = new Set(['standard', 'high']);
const REQUIRED_METADATA = [
  'Readiness ID', 'Status', 'Target Module', 'Risk Level', 'Release Scope',
  'Deployment Target', 'Threat Model', 'Owner Decision', 'Evidence Owner',
];
const REQUIRED_SECTIONS = [
  'Security Evidence', 'Deployment & Rollback', 'Observability & Alerting',
  'Backup & Restore', 'Incident Response', 'Verification Evidence', 'Known Risks',
];
const SECRET_PATTERNS = [
  { label: 'private key', pattern: /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/i },
  { label: 'connection string', pattern: /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^/\s:]+:[^@\s]+@/i },
  { label: 'credential assignment', pattern: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*(?!<[^>]+>|redacted|env:|\$\{)[`'"]?[A-Za-z0-9_\-]{12,}/i },
];

function normalize(value) {
  return String(value ?? '').trim().replace(/^`|`$/g, '');
}

function addIssue(issues, code, message, action) {
  issues.push({ code, message, action });
}

function sectionText(markdown, title) {
  const pattern = new RegExp(`^##\\s+${title}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'm');
  return markdown.match(pattern)?.[1] ?? '';
}

function hasMeaningfulContent(markdown, title) {
  return sectionText(markdown, title).replace(/<!--[^]*?-->/g, '').trim().length > 0;
}

function isNotRequired(value) {
  return ['none', 'not_required', 'not applicable', 'n/a', '无', '不适用'].includes(normalize(value).toLowerCase());
}

function isLocalArtifact(cwd, value) {
  const reference = normalize(value);
  if (!reference || isNotRequired(reference)) return false;
  const resolved = resolve(cwd, reference);
  const localPath = relative(cwd, resolved);
  return Boolean(localPath) && !localPath.startsWith('..') && existsSync(resolved) && statSync(resolved).isFile();
}

function resultStatus(issues) {
  return issues.some((issue) => ['planning_invalid', 'brief_missing', 'target_missing', 'secret_exposed'].includes(issue.code))
    ? 'blocked'
    : (issues.length > 0 ? 'needs_revision' : 'pass');
}

export function validateOperationalReadiness({ cwd = process.cwd(), path } = {}) {
  const planning = validatePlanningArtifacts({ cwd });
  const issues = [];
  if (!planning.valid) {
    for (const issue of planning.issues) addIssue(issues, 'planning_invalid', issue, '先修复 planning artifact，再校验运行准备度。');
    return { status: 'blocked', planning, issues, path: null, metadata: {}, module: null };
  }

  const briefPath = path ? resolve(cwd, path) : null;
  if (!briefPath || !existsSync(briefPath)) {
    addIssue(issues, 'brief_missing', `找不到 Operational Readiness Brief：${path ?? 'missing'}`, '创建 .claude/workspace/operations/YYYY-MM-DD-<module>-readiness.md。');
    return { status: 'blocked', planning, issues, path: briefPath, metadata: {}, module: null };
  }

  const markdown = readFileSync(briefPath, 'utf8');
  const metadata = parseArtifactMetadata(markdown);
  for (const key of REQUIRED_METADATA) {
    if (!normalize(metadata[key])) addIssue(issues, 'metadata_missing', `${relative(cwd, briefPath)}: 缺少 ${key}`, `补齐 Readiness Brief 头部的 ${key}。`);
  }
  for (const title of REQUIRED_SECTIONS) {
    if (!hasMeaningfulContent(markdown, title)) addIssue(issues, 'section_missing', `${relative(cwd, briefPath)}: 缺少或留空 ${title}`, `补齐 ## ${title} 的可执行证据。`);
  }

  const status = normalize(metadata.Status).toLowerCase();
  if (status && !READINESS_STATUSES.has(status)) {
    addIssue(issues, 'status_invalid', `不支持 Readiness Status：${metadata.Status}`, `使用 ${[...READINESS_STATUSES].join(' / ')}。`);
  }
  const riskLevel = normalize(metadata['Risk Level']).toLowerCase();
  if (riskLevel && !RISK_LEVELS.has(riskLevel)) {
    addIssue(issues, 'risk_invalid', `不支持 Risk Level：${metadata['Risk Level']}`, `使用 ${[...RISK_LEVELS].join(' / ')}。`);
  }

  const target = normalize(metadata['Target Module']);
  const module = planning.modules.find((item) => item['模块 ID'] === target) ?? null;
  if (!module) {
    addIssue(issues, 'target_missing', `Target Module 不存在：${metadata['Target Module'] ?? 'missing'}`, '引用 roadmap 中存在的模块 ID。');
  }

  if (riskLevel === 'high') {
    if (isNotRequired(metadata['Threat Model'])) {
      addIssue(issues, 'threat_model_missing', 'high risk Readiness Brief 必须关联 Threat Model', '引用 Threat Model、ADR 或安全分析 artifact。');
    } else if (!isLocalArtifact(cwd, metadata['Threat Model'])) {
      addIssue(issues, 'threat_model_invalid', 'high risk Threat Model 必须指向仓库内存在的证据 artifact', '使用仓库相对路径引用已存在的 Threat Model、ADR 或安全分析文件。');
    }
    if (isNotRequired(metadata['Owner Decision'])) {
      addIssue(issues, 'owner_decision_missing', 'high risk Readiness Brief 必须关联 Owner Decision Brief', '记录 Owner 的风险接受或缓解决策路径。');
    } else if (!isLocalArtifact(cwd, metadata['Owner Decision'])) {
      addIssue(issues, 'owner_decision_invalid', 'high risk Owner Decision 必须指向仓库内存在的 Decision Brief', '使用仓库相对路径引用已存在的 Owner Decision Brief。');
    }
  }

  if (status === 'complete') {
    const checkboxes = [...markdown.matchAll(/^- \[([ xX])\]\s+.+$/gm)];
    if (checkboxes.length === 0) {
      addIssue(issues, 'evidence_empty', 'complete Readiness Brief 必须记录已完成的证据项', '在各章节用 - [x] 记录已验证的动作。');
    } else if (checkboxes.some((item) => item[1].toLowerCase() !== 'x')) {
      addIssue(issues, 'evidence_incomplete', 'Status 为 complete 但仍有未完成运行保障项', '完成 checkbox，或将 Status 保持为 draft/ready。');
    }
  }

  for (const { label, pattern } of SECRET_PATTERNS) {
    if (pattern.test(markdown)) {
      addIssue(issues, 'secret_exposed', `Readiness Brief 疑似包含明文 ${label}`, '移除秘密，改为 secret manager、环境变量名称或已脱敏证据引用。');
    }
  }

  return {
    status: resultStatus(issues),
    planning,
    issues,
    path: relative(cwd, briefPath).replaceAll('\\', '/'),
    metadata,
    module,
    riskLevel,
  };
}

export function formatOperationalReadiness(result, { json = false } = {}) {
  if (json) return JSON.stringify({
    status: result.status,
    target: result.module?.['模块 ID'] ?? null,
    riskLevel: result.riskLevel ?? null,
    path: result.path ?? null,
    issues: result.issues,
  }, null, 2);

  const target = result.module?.['模块 ID'] ?? 'unknown target';
  const details = result.issues.length === 0
    ? '  - 无；运行准备度证据完整，可交由 /ship 继续发布判断。'
    : result.issues.map((issue) => `  - [${issue.code}] ${issue.message}\n    下一步：${issue.action}`).join('\n');
  return `\noperations validate: ${result.status}\n  目标: ${target}\n  风险等级: ${result.riskLevel ?? 'unknown'}\n  结果:\n${details}`;
}
