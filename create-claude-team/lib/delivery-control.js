import { parseFeatureTasks, validatePlanningArtifacts } from './planning-artifacts.js';

const STARTABLE_STATUSES = new Set(['ready', 'planned', 'in_progress']);
const REQUIRED_TASK_FIELDS = ['描述', '验收标准', '验收命令', '阻塞原因', 'Gate 结果', '产物', '最近更新'];
const TRANSITIONS = new Map([
  ['ready', new Set(['planned', 'needs_clarification', 'blocked'])],
  ['planned', new Set(['in_progress', 'needs_clarification', 'blocked'])],
  ['in_progress', new Set(['local_gate', 'needs_clarification', 'blocked'])],
  ['local_gate', new Set(['review_gate', 'needs_clarification', 'blocked'])],
  ['review_gate', new Set(['release_gate', 'done', 'needs_clarification', 'blocked'])],
  ['release_gate', new Set(['shipped', 'needs_clarification', 'blocked'])],
  ['blocked', new Set(['planned', 'in_progress', 'needs_clarification'])],
  ['needs_clarification', new Set(['planned', 'blocked'])],
]);
const HIGH_RISK_TERMS = [
  '认证', '授权', '密码', 'token', '密钥', '加密', '支付', '个人数据', '个人信息', 'pii', '数据迁移',
  'authentication', 'authorization', 'password', 'encryption', 'payment', 'personal data', 'data migration',
];

function normalize(value) {
  return String(value ?? '').trim().replace(/^`|`$/g, '');
}

function splitDependencies(value) {
  return normalize(value).split(',').flatMap((item) => {
    const trimmed = item.trim();
    const range = trimmed.match(/^N(\d+)-N(\d+)$/);
    if (!range) return trimmed ? [trimmed] : [];
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (end < start) return [trimmed];
    return Array.from({ length: end - start + 1 }, (_, index) => `N${start + index}`);
  }).filter((item) => item !== '无');
}

function addIssue(issues, code, message, action) {
  issues.push({ code, message, action });
}

function hasSection(markdown, title) {
  return new RegExp(`^##\\s+${title}\\s*$`, 'm').test(markdown);
}

function isHighRisk(feature) {
  const content = [
    feature.spec['Security Impact'],
    feature.spec['Security Risk Level'],
  ].join('\n').toLowerCase();
  return HIGH_RISK_TERMS.some((term) => content.includes(term.toLowerCase()));
}

function findTarget(result, target) {
  const value = normalize(target);
  const module = result.modules.find((item) => item['模块 ID'] === value);
  if (module) {
    return {
      module,
      feature: result.features.find((item) => normalize(item.spec['Roadmap Module']).match(/^N\d+/)?.[0] === value) ?? null,
    };
  }
  const feature = result.features.find((item) => item.name === value);
  if (!feature) return { module: null, feature: null };
  const moduleId = normalize(feature.spec['Roadmap Module']).match(/^N\d+/)?.[0];
  return { module: result.modules.find((item) => item['模块 ID'] === moduleId) ?? null, feature };
}

function taskIssues(task, issues) {
  for (const field of REQUIRED_TASK_FIELDS) {
    if (!normalize(task.fields?.[field])) {
      addIssue(issues, 'task_field_missing', `${task.id}: 缺少 ${field}`, `补齐 tasks.md 的 ${task.id} ${field} 字段。`);
    }
  }
}

function basePreflight({ cwd, target }) {
  const planning = validatePlanningArtifacts({ cwd });
  const issues = [];
  if (!planning.valid) {
    for (const issue of planning.issues) {
      addIssue(issues, 'planning_invalid', issue, '修复该 planning artifact 后重新运行 planning validate。');
    }
    return { status: 'blocked', planning, issues, module: null, feature: null, task: null };
  }

  const { module, feature } = findTarget(planning, target);
  if (!module) {
    addIssue(issues, 'target_missing', `找不到 roadmap 模块或 feature package：${target}`, '传入有效的模块 ID，例如 N5。');
    return { status: 'blocked', planning, issues, module: null, feature: null, task: null };
  }
  if (module.状态 === 'blocked') {
    addIssue(issues, 'module_blocked', `${module['模块 ID']} 当前为 blocked`, '先按 roadmap 记录的阻塞原因解除模块阻塞。');
  }
  if (['done', 'shipped'].includes(module.状态)) {
    addIssue(issues, 'module_closed', `${module['模块 ID']} 当前为 ${module.状态}，不可重新开工`, '创建新的 roadmap 模块或按变更流程进入 N6。');
  }
  for (const dependency of splitDependencies(module.依赖)) {
    const dependencyModule = planning.modules.find((item) => item['模块 ID'] === dependency);
    if (!dependencyModule || !['done', 'shipped'].includes(dependencyModule.状态)) {
      addIssue(issues, 'dependency_incomplete', `${module['模块 ID']} 依赖 ${dependency} 尚未完成`, `先完成或正式调整 ${dependency} 的 roadmap 状态。`);
    }
  }
  if (!feature) {
    addIssue(issues, 'feature_missing', `${module['模块 ID']} 缺少 feature package`, `创建 .claude/workspace/features/${module['模块 ID'].toLowerCase()}-<feature>/ 及 spec.md、tasks.md。`);
    return { status: 'blocked', planning, issues, module, feature: null, task: null };
  }

  if (!hasSection(feature.specText, '验收场景')) {
    addIssue(issues, 'acceptance_missing', `${feature.name}/spec.md 缺少验收场景`, '补充目标用户、入口、主流程、成功结果和可观察证据。');
  }
  if (!hasSection(feature.specText, 'Spec/Task Quality Gate')) {
    addIssue(issues, 'spec_gate_missing', `${feature.name}/spec.md 缺少 Spec/Task Quality Gate`, '补充 Product Lead、Architect-Planner、Delivery Steward 和 Builder readiness 结论。');
  }
  if (!/Builder readiness[：:]\s*pass/.test(feature.specText)) {
    addIssue(issues, 'builder_not_ready', `${feature.name}/spec.md 尚未声明 Builder readiness：pass`, '完成 spec/task quality gate 后再开始实现。');
  }
  if (!hasSection(feature.tasksText, 'Spec/Task Quality Gate') || !/当前结果[：:]\s*pass/.test(feature.tasksText)) {
    addIssue(issues, 'tasks_gate_missing', `${feature.name}/tasks.md 缺少通过的 Spec/Task Quality Gate`, '补充 tasks 的当前结果：pass 和本轮范围。');
  }
  if (isHighRisk(feature)) {
    if (normalize(feature.spec['Security Risk Level']).toLowerCase() !== 'high') {
      addIssue(issues, 'risk_level_missing', `${feature.name}/spec.md 是安全敏感变更但未声明 Security Risk Level：high`, '声明高风险等级，或修正不准确的安全影响描述。');
    }
    const threatModel = normalize(feature.spec['Threat Model']);
    if (!threatModel || threatModel.toLowerCase() === 'none') {
      addIssue(issues, 'threat_model_missing', `${feature.name}/spec.md 是安全敏感变更但缺少 Threat Model`, '写明资产、攻击面、缓解和待 N7 验证的安全证据。');
    }
  }

  const status = issues.length > 0
    ? (issues.some((issue) => ['module_blocked', 'module_closed', 'dependency_incomplete'].includes(issue.code)) ? 'blocked' : 'needs_revision')
    : 'pass';
  return { status, planning, issues, module, feature, task: null };
}

export function validateDeliveryPreflight({ cwd = process.cwd(), target, taskId = null } = {}) {
  const result = basePreflight({ cwd, target });
  if (!result.feature || result.status === 'blocked') return result;

  const tasks = parseFeatureTasks(result.feature.tasksText);
  if (tasks.length === 0) {
    addIssue(result.issues, 'task_missing', `${result.feature.name}/tasks.md 未找到可执行任务`, '按 tasks 状态机创建至少一个任务。');
  }
  const task = taskId ? tasks.find((item) => item.id === taskId) : null;
  if (taskId && !task) {
    addIssue(result.issues, 'task_not_found', `未找到任务：${taskId}`, '传入 feature tasks.md 中存在的任务 ID。');
  }
  if (task) {
    taskIssues(task, result.issues);
    if (!STARTABLE_STATUSES.has(task.status)) {
      addIssue(result.issues, 'task_not_startable', `${task.id} 当前为 ${task.status}，不能进入实现`, '选择 ready/planned 任务，或先完成当前 gate/解除阻塞。');
    }
  }
  result.task = task;
  if (result.issues.length > 0) result.status = 'needs_revision';
  return result;
}

function gateIncludes(task, value) {
  return normalize(task.fields?.['Gate 结果']).toLowerCase().includes(value);
}

export function validateDeliveryTransition({ cwd = process.cwd(), target, taskId, toStatus } = {}) {
  const result = basePreflight({ cwd, target });
  if (!result.feature || result.status !== 'pass') return result;
  const task = parseFeatureTasks(result.feature.tasksText).find((item) => item.id === taskId);
  result.task = task ?? null;
  if (!task) {
    addIssue(result.issues, 'task_not_found', `未找到任务：${taskId}`, '传入 feature tasks.md 中存在的任务 ID。');
    result.status = 'needs_revision';
    return result;
  }
  taskIssues(task, result.issues);
  const destination = normalize(toStatus);
  if (!TRANSITIONS.has(task.status) || !TRANSITIONS.get(task.status).has(destination)) {
    addIssue(result.issues, 'transition_not_allowed', `${task.id} 不能从 ${task.status} 迁移到 ${destination}`, '遵循 Controlled Delivery Contract 的小迭代状态路径。');
  }
  if (destination === 'in_progress') {
    const preflight = validateDeliveryPreflight({ cwd, target, taskId });
    if (preflight.status !== 'pass') result.issues.push(...preflight.issues);
  }
  if (task.status === 'local_gate' && destination === 'review_gate' && !gateIncludes(task, 'local pass')) {
    addIssue(result.issues, 'local_evidence_missing', `${task.id} 未记录 local pass`, '先完成本地检查并在 Gate 结果中写入 local pass。');
  }
  if (task.status === 'review_gate' && ['release_gate', 'done'].includes(destination) && !gateIncludes(task, 'review pass')) {
    addIssue(result.issues, 'review_evidence_missing', `${task.id} 未记录 review pass`, '先完成 review 并在 Gate 结果中写入 review pass。');
  }
  if (task.status === 'review_gate' && destination === 'done' && !gateIncludes(task, 'release not_required')) {
    addIssue(result.issues, 'release_decision_missing', `${task.id} 进入 done 前必须声明 release not_required`, '记录为何该任务无需发布流程。');
  }
  if (task.status === 'release_gate' && destination === 'shipped' && !gateIncludes(task, 'release pass')) {
    addIssue(result.issues, 'release_evidence_missing', `${task.id} 未记录 release pass`, '完成发布检查并在 Gate 结果中写入 release pass。');
  }
  result.status = result.issues.length === 0 ? 'pass' : 'needs_revision';
  result.transition = { from: task.status, to: destination };
  return result;
}

export function formatDeliveryResult(result, { json = false } = {}) {
  if (json) return JSON.stringify({
    status: result.status,
    module: result.module?.['模块 ID'] ?? null,
    task: result.task?.id ?? null,
    transition: result.transition ?? null,
    issues: result.issues,
  }, null, 2);

  const title = result.transition ? 'delivery transition' : 'delivery preflight';
  const target = [result.module?.['模块 ID'], result.task?.id].filter(Boolean).join(' / ') || 'unknown target';
  const issueText = result.issues.length === 0
    ? '  - 无；可以继续当前受控开发步骤。'
    : result.issues.map((issue) => `  - [${issue.code}] ${issue.message}\n    下一步：${issue.action}`).join('\n');
  return `\n${title}: ${result.status}\n  目标: ${target}\n${result.transition ? `  迁移: ${result.transition.from} -> ${result.transition.to}\n` : ''}  结果:\n${issueText}`;
}
