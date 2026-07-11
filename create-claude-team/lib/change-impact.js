import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseArtifactMetadata, validatePlanningArtifacts } from './planning-artifacts.js';

const CHANGE_KINDS = new Set(['experience', 'behavior', 'architecture', 'security', 'operational']);
const CHANGE_STATUSES = new Set(['draft', 'ready', 'in_progress', 'complete', 'blocked']);
const REQUIRED_METADATA = [
  'Change ID', 'Status', 'Source Feedback', 'Change Kind', 'Owner Layer', 'Target Module',
  'Capability ID', 'Journey ID', 'Architecture Component ID', 'Affected Components',
  'Dependency Direction', 'Change Scope', 'Analysis Command',
];
const REQUIRED_SECTIONS = ['归属判断', '影响范围', '同步项', '验证计划'];

const KIND_RULES = {
  experience: {
    owner: 'A2 -> A4 -> A5',
    sync: ['product-model.md', 'spec', 'tasks', '用户流程测试'],
  },
  behavior: {
    owner: 'A4 -> A5',
    sync: ['spec', 'tasks', '实现', '回归测试'],
  },
  architecture: {
    owner: 'A3 -> A4 -> A5',
    sync: ['architecture.md', 'ADR', 'spec', '兼容/迁移验证'],
  },
  security: {
    owner: 'A3 -> A5 -> A6',
    sync: ['Security Impact', 'Threat Model', 'N7'],
  },
  operational: {
    owner: 'A5 -> A6',
    sync: ['Operational Impact', 'N7'],
  },
};

function normalize(value) {
  return String(value ?? '').trim().replace(/^`|`$/g, '');
}

function splitValues(value) {
  return normalize(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function expandDependencies(value) {
  return splitValues(value).flatMap((item) => {
    const range = item.match(/^N(\d+)-N(\d+)$/);
    if (!range) return item === '无' ? [] : [item];
    const start = Number(range[1]);
    const end = Number(range[2]);
    return end < start ? [item] : Array.from({ length: end - start + 1 }, (_, index) => `N${start + index}`);
  });
}

function addIssue(issues, code, message, action) {
  issues.push({ code, message, action });
}

function findTarget(planning, target) {
  const value = normalize(target);
  const module = planning.modules.find((item) => item['模块 ID'] === value);
  if (module) {
    return {
      module,
      feature: planning.features.find((item) => normalize(item.spec['Roadmap Module']).match(/^N\d+/)?.[0] === value) ?? null,
    };
  }
  const feature = planning.features.find((item) => item.name === value);
  if (!feature) return { module: null, feature: null };
  const moduleId = normalize(feature.spec['Roadmap Module']).match(/^N\d+/)?.[0];
  return { module: planning.modules.find((item) => item['模块 ID'] === moduleId) ?? null, feature };
}

function hasSection(markdown, title) {
  return new RegExp(`^##\\s+${title}\\s*$`, 'm').test(markdown);
}

function sectionText(markdown, title) {
  const pattern = new RegExp(`^##\\s+${title}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'm');
  return markdown.match(pattern)?.[1] ?? '';
}

function includesRequiredSync(markdown, required) {
  return sectionText(markdown, '同步项').toLowerCase().includes(required.toLowerCase());
}

function resultStatus(issues, blockedCodes = []) {
  return issues.some((issue) => blockedCodes.includes(issue.code)) ? 'blocked' : (issues.length > 0 ? 'needs_revision' : 'pass');
}

export function analyzeChange({ cwd = process.cwd(), target, kind = 'experience' } = {}) {
  const planning = validatePlanningArtifacts({ cwd });
  const issues = [];
  if (!planning.valid) {
    for (const issue of planning.issues) addIssue(issues, 'planning_invalid', issue, '先修复 planning artifact，再进行变更分析。');
    return { status: 'blocked', planning, issues, module: null, feature: null, kind: normalize(kind) };
  }
  const normalizedKind = normalize(kind).toLowerCase();
  if (!CHANGE_KINDS.has(normalizedKind)) {
    addIssue(issues, 'kind_invalid', `未知 Change Kind：${kind}`, `使用 ${[...CHANGE_KINDS].join(' / ')} 之一。`);
  }
  const { module, feature } = findTarget(planning, target);
  if (!module) {
    addIssue(issues, 'target_missing', `找不到 roadmap 模块或 feature package：${target}`, '传入模块 ID，例如 N6。');
    return { status: 'blocked', planning, issues, module: null, feature: null, kind: normalizedKind };
  }

  const components = splitValues(feature?.spec['Affected Components'] ?? module['Architecture Component ID']);
  const dependents = planning.modules
    .filter((item) => item['模块 ID'] !== module['模块 ID'] && expandDependencies(item.依赖).includes(module['模块 ID']))
    .map((item) => item['模块 ID']);
  const relatedFeatures = planning.features
    .filter((item) => item !== feature && splitValues(item.spec['Affected Components']).some((component) => components.includes(component)))
    .map((item) => item.name);
  const rule = KIND_RULES[normalizedKind] ?? { owner: 'unknown', sync: [] };

  return {
    status: issues.length === 0 ? 'pass' : 'needs_revision',
    planning,
    issues,
    kind: normalizedKind,
    module,
    feature,
    ownership: rule.owner,
    components,
    dependents,
    relatedFeatures,
    recommendedSync: rule.sync,
    artifacts: [
      'product-brief.md', 'product-model.md', 'architecture.md', 'roadmap.md',
      ...(feature ? [relative(cwd, feature.specPath).replaceAll('\\', '/'), relative(cwd, feature.tasksPath).replaceAll('\\', '/')] : []),
    ],
  };
}

export function validateChangeBrief({ cwd = process.cwd(), path } = {}) {
  const planning = validatePlanningArtifacts({ cwd });
  const issues = [];
  if (!planning.valid) {
    for (const issue of planning.issues) addIssue(issues, 'planning_invalid', issue, '先修复 planning artifact，再校验 Change Impact Brief。');
    return { status: 'blocked', planning, issues, path: null, metadata: {} };
  }
  const briefPath = path ? resolve(cwd, path) : null;
  if (!briefPath || !existsSync(briefPath)) {
    addIssue(issues, 'brief_missing', `找不到 Change Impact Brief：${path ?? 'missing'}`, '创建 .claude/workspace/changes/YYYY-MM-DD-<change-id>.md。');
    return { status: 'blocked', planning, issues, path: briefPath, metadata: {} };
  }
  const markdown = readFileSync(briefPath, 'utf8');
  const metadata = parseArtifactMetadata(markdown);
  for (const key of REQUIRED_METADATA) {
    if (!normalize(metadata[key])) addIssue(issues, 'metadata_missing', `${relative(cwd, briefPath)}: 缺少 ${key}`, `补齐 Brief 头部的 ${key}。`);
  }
  for (const title of REQUIRED_SECTIONS) {
    if (!hasSection(markdown, title)) addIssue(issues, 'section_missing', `${relative(cwd, briefPath)}: 缺少 ${title}`, `补齐 ## ${title}。`);
  }
  const kind = normalize(metadata['Change Kind']).toLowerCase();
  if (kind && !CHANGE_KINDS.has(kind)) addIssue(issues, 'kind_invalid', `不支持 Change Kind：${metadata['Change Kind']}`, `使用 ${[...CHANGE_KINDS].join(' / ')}。`);
  const status = normalize(metadata.Status).toLowerCase();
  if (status && !CHANGE_STATUSES.has(status)) addIssue(issues, 'brief_status_invalid', `不支持 Brief Status：${metadata.Status}`, `使用 ${[...CHANGE_STATUSES].join(' / ')}。`);

  const { module, feature } = findTarget(planning, metadata['Target Module']);
  if (!module) {
    addIssue(issues, 'target_missing', `Target Module 不存在：${metadata['Target Module'] ?? 'missing'}`, '引用 roadmap 中存在的模块 ID 或 feature package。');
  } else {
    if (metadata['Capability ID'] !== module['Capability ID']) {
      addIssue(issues, 'capability_mismatch', `Capability ID 应为 ${module['Capability ID']}`, '使用 Target Module 对应的 Capability ID。');
    }
    const expectedComponents = splitValues(module['Architecture Component ID']);
    const declaredComponents = splitValues(metadata['Architecture Component ID']);
    if (!expectedComponents.every((component) => declaredComponents.includes(component))) {
      addIssue(issues, 'component_mismatch', `Architecture Component ID 必须包含 ${module['Architecture Component ID']}`, '引用 Target Module 对应的 Architecture Component ID。');
    }
    const affectedComponents = splitValues(metadata['Affected Components']);
    if (!expectedComponents.every((component) => affectedComponents.includes(component))) {
      addIssue(issues, 'affected_component_mismatch', `Affected Components 必须包含 ${module['Architecture Component ID']}`, '至少包含 Target Module 的 Architecture Component ID，再补充其他实际受影响组件。');
    }
  }
  for (const journey of splitValues(metadata['Journey ID'])) {
    if (!planning.ids.journeys.includes(journey)) addIssue(issues, 'journey_unknown', `未知 Journey ID：${journey}`, '引用 product-model.md 已定义的 Journey ID。');
  }
  for (const component of splitValues(metadata['Affected Components'])) {
    if (!planning.ids.components.includes(component)) addIssue(issues, 'component_unknown', `未知 Affected Component：${component}`, '引用 architecture.md 已定义的组件。');
  }

  const rule = KIND_RULES[kind];
  const ownerLayers = splitValues(metadata['Owner Layer']);
  for (const layer of ownerLayers) {
    if (!planning.ids.components.includes(layer)) {
      addIssue(issues, 'owner_layer_unknown', `未知 Owner Layer：${layer}`, '引用 architecture.md 已定义的 Architecture Component ID。');
    }
  }
  if (rule) {
    const expectedOwners = [...rule.owner.matchAll(/A\d+/g)].map((match) => match[0]);
    if (!expectedOwners.every((layer) => ownerLayers.includes(layer))) {
      addIssue(issues, 'owner_layer_mismatch', `${kind} 变更的 Owner Layer 必须包含 ${expectedOwners.join(',')}`, '按 Change Impact Contract 修正主归属层。');
    }
    for (const requiredSync of rule.sync) {
      if (!includesRequiredSync(markdown, requiredSync)) {
        addIssue(issues, 'sync_missing', `${kind} 变更缺少同步项：${requiredSync}`, `在 ## 同步项 中加入 ${requiredSync} 及具体动作。`);
      }
    }
  }
  const verification = sectionText(markdown, '验证计划').toLowerCase();
  if (!verification.includes('planning validate')) {
    addIssue(issues, 'verification_missing', '验证计划缺少 planning validate', '说明如何运行 planning validate。');
  }
  if (!verification.includes('delivery preflight')) {
    addIssue(issues, 'verification_missing', '验证计划缺少 delivery preflight', '说明如何在受控开发前验证该 Brief。');
  }
  const syncItems = [...sectionText(markdown, '同步项').matchAll(/^- \[([ xX])\]\s+.+$/gm)];
  if (syncItems.length === 0) addIssue(issues, 'sync_empty', '同步项必须包含至少一条 checkbox', '用 - [ ] 或 - [x] 记录每个同步动作。');
  if (status === 'complete' && syncItems.some((item) => item[1].toLowerCase() !== 'x')) {
    addIssue(issues, 'sync_incomplete', 'Status 为 complete 但仍有未完成同步项', '完成同步项，或把 Brief 保持为 in_progress。');
  }

  return {
    status: resultStatus(issues, ['planning_invalid', 'brief_missing', 'target_missing']),
    planning,
    issues,
    path: relative(cwd, briefPath).replaceAll('\\', '/'),
    metadata,
    module,
    feature,
    kind,
  };
}

export function formatChangeResult(result, { json = false, mode = 'validate' } = {}) {
  if (json) return JSON.stringify({
    status: result.status,
    mode,
    target: result.module?.['模块 ID'] ?? null,
    kind: result.kind ?? null,
    ownership: result.ownership ?? null,
    dependents: result.dependents ?? [],
    relatedFeatures: result.relatedFeatures ?? [],
    recommendedSync: result.recommendedSync ?? [],
    path: result.path ?? null,
    issues: result.issues,
  }, null, 2);

  const title = mode === 'analyze' ? 'change analyze' : 'change validate';
  const target = result.module?.['模块 ID'] ?? 'unknown target';
  const detail = result.issues.length > 0
    ? result.issues.map((issue) => `  - [${issue.code}] ${issue.message}\n    下一步：${issue.action}`).join('\n')
    : '  - 无；可以创建或带着该 Brief 进入受控开发。';
  const analysis = mode === 'analyze' && result.status === 'pass'
    ? `\n  归属: ${result.ownership}\n  依赖/使用方: ${result.dependents.join(', ') || '无'}\n  建议同步: ${result.recommendedSync.join('、') || '无'}`
    : '';
  return `\n${title}: ${result.status}\n  目标: ${target}\n${analysis}\n  结果:\n${detail}`;
}
