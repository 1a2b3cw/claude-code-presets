/**
 * 冒烟测试 — 验证 init / update 的核心契约。
 *
 * 重点守护 P0.1：update 不能删掉底座的公共 skills/rules。
 * 用法：npm test（在 create-claude-team/ 目录）
 *
 * 不依赖任何测试框架，纯 node 断言 + 退出码。
 */

import { mkdtempSync, mkdirSync, rmSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { init } from '../lib/init.js';
import { missingPresetMcpServers, update } from '../lib/update.js';
import { readPresetCatalog } from '../lib/presets.js';
import { buildStatus, updateMetrics, validateEvents } from '../lib/state-tools.js';
import { parseFeatureTasks, validatePlanningArtifacts } from '../lib/planning-artifacts.js';
import { validateDeliveryPreflight, validateDeliveryTransition } from '../lib/delivery-control.js';
import { validateOwnerDecision } from '../lib/owner-decision.js';
import { analyzeChange, validateChangeBrief } from '../lib/change-impact.js';
import { validateOperationalReadiness } from '../lib/operational-readiness.js';
import { validateProjectPresetFeedback } from '../lib/project-preset-feedback.js';
import { getProjectPresetContext, validateProjectPreset } from '../lib/project-preset.js';
import { validateProject } from '../lib/validate.js';
import { validateSkills } from '../lib/skill-contracts.js';
import { toCodexText } from '../lib/codex/text.js';
import { buildCodexAgentToml } from '../lib/codex/agents.js';

const PUBLIC_SKILLS = ['architecture', 'code-review', 'debugging', 'performance', 'project-planning', 'skill-curator', 'testing', 'ui-prototype'];
const PUBLIC_RULES = ['git.md', 'design.md'];
const COMMAND_SKILL_COUNT = 9;
const AGENT_COUNT = 8;
const REQUIRED_CODEX_AGENTS = [
  'architect-planner.toml',
  'builder.toml',
  'delivery-steward.toml',
  'designer.toml',
  'devops.toml',
  'product-lead.toml',
  'researcher.toml',
  'reviewer.toml',
];
const EVENT_COMMANDS = ['dev', 'check', 'review-all', 'ship', 'standup'];
const SUMMARY_COMMANDS = ['dev', 'check', 'review-all', 'ship'];
const STANDUP_REQUIRED_TEXT = ['roadmap.md', 'tasks.md', 'events.jsonl', 'journal.md', 'git log', '下一步建议', '重复问题/流程改进建议'];
const PRODUCT_BRIEF_REQUIRED_TEXT = ['product-brief.md', 'prd.md', '目标用户', '核心价值', '本期范围', '明确不做', '验收标准'];
const PRODUCT_MODEL_PLAN_TEXT = ['product-model.md', 'Capability ID', 'Journey ID', '边界外请求', '不得静默'];
const PRODUCT_MODEL_ROLE_TEXT = ['product-model.md', 'Capability ID', 'Journey ID'];
const ARCHITECTURE_CONTEXT_TEXT = ['architecture.md', 'Architecture Component ID', '依赖方向', '安全边界', '兼容'];
const ARCHITECTURE_DECISION_TEXT = '不得只用普通建议';
const PLANNING_ARTIFACT_CONTEXT_TEXT = ['artifact-contract.md', 'planning validate'];
const CONTROLLED_DELIVERY_TEXT = ['Controlled Delivery Contract', 'delivery transition'];
const CHANGE_IMPACT_CONTEXT_TEXT = ['Change Impact Contract', 'change analyze'];
const OPERATIONAL_READINESS_CONTEXT_TEXT = ['Operational Readiness Contract', 'operations validate'];
const PROJECT_PRESET_LIFECYCLE_CONTEXT_TEXT = ['Project Preset Lifecycle', 'project-preset validate', 'project-preset context', 'PRESET.md', 'rules', 'specs', '不存在 project-preset'];
const PROJECT_PRESET_FEEDBACK_TEXT = ['project-preset feedback validate', 'Owner 确认', '不自动写入', 'project-profile/feedback/'];
const PLANNING_UPGRADE_PLAN_TEXT = ['Product Lead', '用户价值', 'MVP 归属', '推荐顺序', 'Product Brief 来源优先级', 'project-profile/product.md'];
const EXPLORATION_BRIEF_PLAN_TEXT = ['Exploration Brief', '不以固定问卷开场', '已确认信号', 'AI 推断', '需要验证', '每轮默认只问 0-2 个高价值问题', '先给结论和推荐', '当前请求其实是局部功能或修复', '不得只用普通“下一步”问题或散文选项代替'];
const EXPLORATION_BRIEF_PRODUCT_LEAD_TEXT = ['不以固定问卷开场', '已确认信号', 'AI 推断', '需要验证', '每轮默认只问 0-2 个高价值问题', '先给结论和推荐', '不能只用普通“下一步”问题代替'];
const PLANNING_UPGRADE_PRESET_TEXT = ['project-preset/rules/', '不得在 `project-preset/` 内创建 `.agents/` 或 `.claude/` 子目录', '未确认推断', '只写已确认的项目差异'];
const ROADMAP_REQUIRED_TEXT = ['模块 ID', '状态', '依赖', '验收标准', '风险', '最近更新', 'planned', 'in_progress', 'blocked', 'done', 'shipped'];
const TASKS_REQUIRED_TEXT = ['tasks.md', 'ready', 'needs_clarification', 'planned', 'in_progress', 'local_gate', 'review_gate', 'release_gate', 'blocked', 'shipped', 'done', '阻塞原因', 'Gate 结果', '验收命令'];
const M_TASKS_REQUIRED_TEXT = ['M 级', '轻量 `tasks.md` checklist', '1-3 个任务'];
const SHIP_ROADMAP_REQUIRED_TEXT = ['roadmap.md 状态更新', '产品模块状态源', 'done` 更新为 `shipped'];
const INTENT_ROUTING_REQUIRED_TEXT = ['自然语言路由契约', '推荐命令', '路由依据', '最轻流程', '`/plan`', '`/dev`', '`/fix`', '`/check`', '`/review-all`', '`/ship`', '`/standup`'];
const NEXT_BEST_ACTION_REQUIRED_TEXT = ['Next Best Action 契约', '## Next Best Action', 'action:', 'reason:', 'requires human confirmation: yes / no', 'source:'];
const OWNER_DECISION_BRIEF_REQUIRED_TEXT = ['Owner Decision Brief 契约', '## Owner Decision Brief', 'Decision:', 'Context:', 'Recommendation:', 'Options:', 'If no reply:', '产品方向', 'MVP', '成本', '隐私', '安全', '架构', '发布风险'];
const SPEC_TASK_GATE_REQUIRED_TEXT = ['Spec/Task Quality Gate', '人话', 'Product Lead 判断 product value', 'Architect-Planner 判断技术方案', 'Delivery Steward 判断 spec/tasks', '`pass` / `needs_revision` / `blocked`', 'Builder 不得开工'];
const DEV_WRITE_BOUNDARY_REQUIRED_TEXT = ['/dev 写入边界', '只更新当前 task/module', '最终 `events.jsonl` 事件', '不得默认执行 `git commit`', 'metrics 由 events 聚合工具'];
const DEV_ACCEPTANCE_REQUIRED_TEXT = ['产品验收视角', 'acceptance 场景', '用户主流程', 'Reviewer 检查 acceptance 风险', 'Designer 检查体验'];
const REVIEW_REPOSITION_REQUIRED_TEXT = ['Review 定位与修复边界', '审查和报告命令', '修复委托 `/fix` 或 `/dev`', '`pass` / `needs_fix` / `blocked`', 'tiny obvious fixes'];
const REVIEW_ACCEPTANCE_REQUIRED_TEXT = ['acceptance 风险', '代码做了但用户流程不连贯', '用户主流程', '做了但不好用', 'Designer 检查'];
const SHIP_RISK_REQUIRED_TEXT = ['Known Risk 处理规则', 'accept', 'mitigate', 'defer', '高风险发布必须触发 Owner Decision Brief', '发布后验证必须覆盖'];
const ARTIFACT_STEWARDSHIP_REQUIRED_TEXT = ['Artifact Stewardship', 'active', 'reference', 'draft', 'superseded', 'archived', 'delete-candidate', 'Artifact Cleanup', '.claude/workspace/cleanup/YYYY-MM-DD-artifact-cleanup.md', 'Owner Decision Brief'];
const WORKSPACE_ROOT_REQUIRED_TEXT = ['.claude/workspace/', 'team state/report 默认根目录', 'workspace/', 'legacy', '`tasks.md` 状态只能使用', '`roadmap.md` 模块表是唯一模块状态源'];
const METRICS_EVENTS_REQUIRED_TEXT = ['taskId', 'level', 'specRejectCount', 'checkIssueCount', 'checkFixRounds', 'reviewRejectCount', 'testFailureCount', 'estimateHours', 'actualHours'];
const STANDUP_METRICS_REQUIRED_TEXT = ['Metrics 聚合规则', '最近 5/10 次任务', '`events.jsonl` 是 metrics 的机器事实来源', '`metrics.md` 是人类可读摘要'];
const STANDUP_IMPROVEMENT_REQUIRED_TEXT = ['流程改进建议规则', '`specRejectCount >= 3`', '平均 `checkIssueCount >= 5`', '`reviewRejectCount >= 1`', '`testFailureCount >= 1`', '估算偏差绝对值 `>= 50%`', '数据必须可追溯到 `events.jsonl`'];
const FAILURE_RECOVERY_REQUIRED_TEXT = ['失败恢复记录契约', '`failureRecovery`', '`failureType`', '`test_failure`', '`ci_failure`', '`pack_failure`', '`hook_false_positive`', '`release_failure`', '`recoveryAction`', '`finalStatus`'];
const STANDUP_FAILURE_REQUIRED_TEXT = ['失败恢复聚合规则', '最近失败 Top N', '重复失败建议', '`failureRecovery`', '同一 `failureType`', '`hook_false_positive` 出现', '`release_failure` 出现'];
const STANDUP_TODAY_REQUIRED_TEXT = ['Today 轻量视图', '10 秒内知道', '## Today', '今日焦点', '当前阻塞', '最近 run', '下一步建议', '风险提示'];
const STANDUP_ALL_DONE_REQUIRED_TEXT = ['all-done 状态规则', '`all-done` 状态', 'release confirmation', 'retro', 'dogfood', 'next roadmap', '不得继续推荐不存在的下一任务'];
const STANDUP_VARIANTS_REQUIRED_TEXT = ['Standup 输出版本', '开发者版', '团队版', '产品版', '默认输出开发者版', '事实必须一致'];
const REVIEW_REPORT_REQUIRED_TEXT = ['.claude/workspace/reviews/YYYY-MM-DD-<scope>.md', '结论', '关联任务', '变更范围', '问题列表', '严重度', '自动修复项', '剩余风险', 'events.jsonl.artifacts'];
const REVIEW_SYSTEM_HEALTH_REQUIRED_TEXT = ['`/review-all --system`', 'System Health Review 流程', '架构形状检查', '产品与验收检查', '一致性和熵检查', '系统健康和长期演化', 'healthy / needs_refactor / blocked'];
const RELEASE_REPORT_REQUIRED_TEXT = ['.claude/workspace/releases/YYYY-MM-DD-<version-or-scope>.md', '发布结论', '检查结果', '风险', '回滚步骤', '发布后验证', 'Gate 结果', 'events.jsonl.artifacts'];

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

function hasProductModelPlanContract(text) {
  return PRODUCT_MODEL_PLAN_TEXT.every((part) => text.includes(part));
}

function hasProductModelRoleContract(text) {
  return PRODUCT_MODEL_ROLE_TEXT.every((part) => text.includes(part));
}

function hasArchitectureContextContract(text) {
  return ARCHITECTURE_CONTEXT_TEXT.every((part) => text.includes(part));
}

function hasArchitectureDecisionContract(text) {
  return text.includes(ARCHITECTURE_DECISION_TEXT);
}

function hasPlanningArtifactContext(text) {
  return PLANNING_ARTIFACT_CONTEXT_TEXT.every((part) => text.includes(part));
}

function hasControlledDeliveryContract(text) {
  return CONTROLLED_DELIVERY_TEXT.every((part) => text.includes(part));
}

function hasChangeImpactContext(text) {
  return CHANGE_IMPACT_CONTEXT_TEXT.every((part) => text.includes(part));
}

function hasOperationalReadinessContext(text) {
  return OPERATIONAL_READINESS_CONTEXT_TEXT.every((part) => text.includes(part));
}

function hasProjectPresetLifecycleContext(text) {
  return PROJECT_PRESET_LIFECYCLE_CONTEXT_TEXT.every((part) => text.includes(part));
}

function hasPlanningUpgradePlanContract(text) {
  return PLANNING_UPGRADE_PLAN_TEXT.every((part) => text.includes(part));
}

function hasExplorationBriefPlanContract(text) {
  return EXPLORATION_BRIEF_PLAN_TEXT.every((part) => text.includes(part));
}

function hasExplorationBriefProductLeadContract(text) {
  return EXPLORATION_BRIEF_PRODUCT_LEAD_TEXT.every((part) => text.includes(part));
}

function hasPlanningUpgradePresetContract(text) {
  return PLANNING_UPGRADE_PRESET_TEXT.every((part) => text.includes(part));
}

function hasRoadmapContract(text) {
  return ROADMAP_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasTasksContract(text) {
  return TASKS_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasMTasksContract(text) {
  return M_TASKS_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasShipRoadmapContract(text) {
  return SHIP_ROADMAP_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasIntentRoutingContract(text) {
  return INTENT_ROUTING_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasNextBestActionContract(text) {
  return NEXT_BEST_ACTION_REQUIRED_TEXT.every((part) => text.includes(part)) &&
    (text.includes('Summary.next action') || text.includes('下一步建议'));
}

function hasOwnerDecisionBriefContract(text) {
  return OWNER_DECISION_BRIEF_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasOwnerDecisionGateContext(text) {
  return text.includes('owner-decision-contract.md') &&
    text.includes('decision validate') &&
    text.includes('工具权限');
}

function hasSpecTaskGateContract(text) {
  return SPEC_TASK_GATE_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasDevWriteBoundaryContract(text) {
  return DEV_WRITE_BOUNDARY_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasDevAcceptanceContract(text) {
  return DEV_ACCEPTANCE_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasReviewRepositionContract(text) {
  return REVIEW_REPOSITION_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasReviewAcceptanceContract(text) {
  return REVIEW_ACCEPTANCE_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasShipRiskContract(text) {
  return SHIP_RISK_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasArtifactStewardshipContract(text) {
  return ARTIFACT_STEWARDSHIP_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasWorkspaceRootContract(text) {
  return WORKSPACE_ROOT_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasMetricsEventsContract(text) {
  return METRICS_EVENTS_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasStandupMetricsContract(text) {
  return hasMetricsEventsContract(text) && STANDUP_METRICS_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasStandupImprovementContract(text) {
  return hasStandupMetricsContract(text) && STANDUP_IMPROVEMENT_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasFailureRecoveryContract(text) {
  return FAILURE_RECOVERY_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasStandupFailureContract(text) {
  return hasFailureRecoveryContract(text) && STANDUP_FAILURE_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasStandupTodayContract(text) {
  return STANDUP_TODAY_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasStandupAllDoneContract(text) {
  return STANDUP_ALL_DONE_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasStandupVariantsContract(text) {
  return STANDUP_VARIANTS_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasReviewReportContract(text) {
  return REVIEW_REPORT_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasReviewSystemHealthContract(text) {
  return REVIEW_SYSTEM_HEALTH_REQUIRED_TEXT.every((part) => text.includes(part));
}

function hasReleaseReportContract(text) {
  return RELEASE_REPORT_REQUIRED_TEXT.every((part) => text.includes(part));
}

function runHook(scriptPath, payload) {
  return spawnSync(process.execPath, [scriptPath], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
}

function writeFixtureEvents(root) {
  const workspace = join(root, '.claude', 'workspace');
  const artifactDir = join(root, 'docs');
  const reviewDir = join(workspace, 'reviews');
  mkdirSync(workspace, { recursive: true });
  mkdirSync(artifactDir, { recursive: true });
  mkdirSync(reviewDir, { recursive: true });
  writeFileSync(join(artifactDir, 'maturity-tasks.md'), [
    '## 当前主线',
    '',
    'Phase M5：Trustworthy State Tools。',
    '',
    '### M5.1 `create-claude-team status`',
    '',
    '- **状态**：planned',
    '',
  ].join('\n'));
  writeFileSync(join(artifactDir, 'sample.md'), '# sample\n');
  writeFileSync(join(reviewDir, 'sample.md'), '# review\n');
  writeFileSync(join(workspace, 'events.jsonl'), [
    JSON.stringify({
      time: '2026-07-10T10:00:00Z',
      command: '/dev',
      task: 'M5.1',
      taskId: 'M5.1',
      level: 'M',
      status: 'completed',
      summary: 'completed: status fixture',
      checks: { test: 'pass' },
      specRejectCount: 0,
      checkIssueCount: 1,
      checkFixRounds: 0,
      reviewRejectCount: 0,
      testFailureCount: 0,
      artifacts: ['docs/sample.md'],
      next: 'M5.2',
    }),
    JSON.stringify({
      time: '2026-07-10T10:05:00Z',
      command: '/review-all',
      task: 'M5',
      taskId: 'M5',
      level: 'L',
      status: 'completed',
      summary: 'completed: review fixture',
      checks: { review: 'pass' },
      specRejectCount: 0,
      checkIssueCount: 0,
      checkFixRounds: 0,
      reviewRejectCount: 0,
      testFailureCount: 0,
      artifacts: ['.claude/workspace/reviews/sample.md'],
      next: 'metrics update',
    }),
  ].join('\n') + '\n');
}

function writePlanningFixture(root, { invalidCapability = false } = {}) {
  const featureDir = join(root, '.claude', 'workspace', 'features', 'n1-fixture');
  mkdirSync(featureDir, { recursive: true });
  mkdirSync(join(root, '.claude', 'workspace', 'planning'), { recursive: true });
  writeFileSync(join(root, 'product-brief.md'), '> Product Brief ID：PB-TEST-001\n');
  writeFileSync(join(root, 'product-model.md'), [
    '> Model ID：PM-TEST-001',
    '> Product Brief ID：PB-TEST-001',
    '| Capability ID | 能力 |',
    '|---|---|',
    '| C1 | fixture |',
    '',
    '### J1：fixture',
  ].join('\n'));
  writeFileSync(join(root, 'architecture.md'), [
    '> Architecture ID：ARCH-TEST-001',
    '> Product Brief ID：PB-TEST-001',
    '> Product Model ID：PM-TEST-001',
    '| Architecture Component ID | 组件 |',
    '|---|---|',
    '| A2 | product |',
    '| A4 | planning |',
    '| A5 | delivery |',
  ].join('\n'));
  writeFileSync(join(root, 'roadmap.md'), [
    '> Roadmap ID：RM-TEST-001',
    '> Product Brief ID：PB-TEST-001',
    '> Product Model ID：PM-TEST-001',
    '> Architecture ID：ARCH-TEST-001',
    '| 模块 ID | 状态 | 模块 | Capability ID | Architecture Component ID | 依赖 |',
    '|---|---|---|---|---|---|',
    `| N1 | in_progress | Fixture planning | ${invalidCapability ? 'C99' : 'C1'} | A4 | 无 |`,
  ].join('\n'));
  writeFileSync(join(root, '.claude', 'workspace', 'planning', 'artifact-contract.md'), '> Contract ID：PAC-TEST-001\n');
  writeFileSync(join(featureDir, 'spec.md'), [
    '> Spec ID：N1-SPEC-001',
    '> Roadmap Module：N1',
    '> Product Brief：`product-brief.md`',
    '> Product Model：`product-model.md`',
    `> Capability ID：${invalidCapability ? 'C99' : 'C1'}`,
    '> Journey ID：J1',
    '> Architecture：`architecture.md`',
    '> Architecture Component ID：A4',
    '> Affected Components：A4',
    '> Dependency Direction：A3 -> A4',
    '> Security Impact：none',
    '> Operational Impact：none',
    '> 执行包：`.claude/workspace/features/n1-fixture/`',
  ].join('\n'));
  writeFileSync(join(featureDir, 'tasks.md'), [
    '> Task Set：N1-TASKS-001',
    '> Spec：`spec.md`',
    '> Roadmap Module：N1',
    '> 执行包：`.claude/workspace/features/n1-fixture/`',
    '',
    '### N1.1 fixture task',
    '- **状态**：in_progress',
  ].join('\n'));
}

function writeDeliveryFixture(root, {
  taskStatus = 'planned',
  gateResult = 'local pending / review pending / release not_required',
  ownerDecisionRequired = 'no',
  ownerDecisionTypes = 'none',
  taskId = 'N1.1',
} = {}) {
  writePlanningFixture(root);
  const featureDir = join(root, '.claude', 'workspace', 'features', 'n1-fixture');
  writeFileSync(join(featureDir, 'spec.md'), [
    '> Spec ID：N1-SPEC-001',
    '> Roadmap Module：N1',
    '> Product Brief：`product-brief.md`',
    '> Product Model：`product-model.md`',
    '> Capability ID：C1',
    '> Journey ID：J1',
    '> Architecture：`architecture.md`',
    '> Architecture Component ID：A4',
    '> Affected Components：A4',
    '> Dependency Direction：A3 -> A4',
    '> Security Impact：none',
    '> Security Risk Level：standard',
    '> Threat Model：not required for standard fixture',
    '> Operational Impact：none',
    `> Owner Decision Required：${ownerDecisionRequired}`,
    `> Owner Decision Types：${ownerDecisionTypes}`,
    '> 执行包：`.claude/workspace/features/n1-fixture/`',
    '',
    '## 验收场景',
    '',
    'Fixture acceptance scenario.',
    '',
    '## Spec/Task Quality Gate',
    '',
    '- Builder readiness: pass',
  ].join('\n'));
  writeFileSync(join(featureDir, 'tasks.md'), [
    '> Task Set：N1-TASKS-001',
    '> Spec：`spec.md`',
    '> Roadmap Module：N1',
    '> 执行包：`.claude/workspace/features/n1-fixture/`',
    '',
    '## Spec/Task Quality Gate',
    '',
    '- 当前结果: pass',
    '',
    `### ${taskId} fixture task`,
    `- **状态**：${taskStatus}`,
    '- **描述**：Run delivery fixture.',
    '- **验收标准**：The fixture reports a deterministic result.',
    '- **验收命令**：npm test',
    '- **阻塞原因**：无',
    `- **Gate 结果**：${gateResult}`,
    '- **产物**：fixture',
    '- **最近更新**：2026-07-11',
  ].join('\n'));
}

function writeOwnerDecisionBrief(root, {
  name = 'decision.md',
  status = 'confirmed',
  targetModule = 'N1',
  decisionType = 'architecture',
  withConfirmation = true,
} = {}) {
  const decisionsDir = join(root, '.claude', 'workspace', 'decisions');
  mkdirSync(decisionsDir, { recursive: true });
  const path = join(decisionsDir, name);
  writeFileSync(path, [
    '> Decision ID：OD-TEST-001',
    `> Status：${status}`,
    `> Decision Type：${decisionType}`,
    `> Target Module：${targetModule}`,
    '> Requested By：Architect-Planner',
    '> Related Spec：`.claude/workspace/features/n1-fixture/spec.md`',
    '',
    '## Owner Decision Brief',
    '',
    '- Decision: Choose the fixture architecture path.',
    '- Context: This choice changes a long-lived fixture boundary.',
    '- Recommendation: Choose A because it preserves the documented path.',
    '- Options:',
    '  - A: Preserve the documented path.',
    '  - B: Introduce a separate path.',
    '- If no reply: Pause implementation.',
    '',
    '## Owner Confirmation',
    '',
    ...(withConfirmation ? [
      '- Confirmed option: A',
      '- Confirmed by: Owner',
      '- Confirmation date: 2026-07-12',
    ] : ['- Pending: waiting for Owner reply.']),
  ].join('\n'));
  return path;
}

function writeChangeBrief(root, {
  name = 'change.md',
  kind = 'experience',
  status = 'draft',
  syncItems = null,
} = {}) {
  const changesDir = join(root, '.claude', 'workspace', 'changes');
  mkdirSync(changesDir, { recursive: true });
  const defaultSync = kind === 'architecture'
    ? ['architecture.md: update component boundary.', 'ADR: record the architecture decision.', 'spec.md: update affected scope.', '兼容/迁移验证: verify compatibility.']
    : ['product-model.md: review journey outcome.', 'spec.md: update acceptance scenario.', 'tasks.md: update implementation work.', '用户流程测试: cover the observed experience.'];
  const entries = syncItems ?? defaultSync;
  const path = join(changesDir, name);
  writeFileSync(path, [
    '> Change ID：CI-TEST-001',
    `> Status：${status}`,
    '> Source Feedback：The user cannot understand the current result.',
    `> Change Kind：${kind}`,
    '> Owner Layer：A2,A4,A5',
    '> Target Module：N1',
    '> Capability ID：C1',
    '> Journey ID：J1',
    '> Architecture Component ID：A4',
    '> Affected Components：A4',
    '> Dependency Direction：A2 -> A4 -> A5',
    '> Change Scope：planning,delivery',
    '> Analysis Command：`node create-claude-team/cli.js change analyze N1 --kind experience`',
    '',
    '## 归属判断',
    '',
    'The feedback affects the user result and the delivery presentation.',
    '',
    '## 影响范围',
    '',
    'Product Model, planning package, implementation and evidence require review.',
    '',
    '## 同步项',
    '',
    ...entries.map((entry) => `- [ ] ${entry}`),
    '',
    '## 验证计划',
    '',
    '- Run planning validate after artifact updates.',
    '- Run delivery preflight before implementation.',
    '- Verify the user-visible result with the relevant flow test.',
  ].join('\n'));
  return path;
}

function writeOperationalReadinessBrief(root, {
  name = 'readiness.md',
  status = 'complete',
  riskLevel = 'standard',
  threatModel = 'not_required',
  ownerDecision = 'not_required',
  extra = '',
} = {}) {
  const operationsDir = join(root, '.claude', 'workspace', 'operations');
  mkdirSync(operationsDir, { recursive: true });
  const path = join(operationsDir, name);
  writeFileSync(path, [
    '> Readiness ID：OR-TEST-001',
    `> Status：${status}`,
    '> Target Module：N1',
    `> Risk Level：${riskLevel}`,
    '> Release Scope：fixture release',
    '> Deployment Target：fixture CI/CD',
    `> Threat Model：${threatModel}`,
    `> Owner Decision：${ownerDecision}`,
    '> Evidence Owner：DevOps',
    '',
    '## Security Evidence',
    '',
    '- [x] Dependency and secret scan evidence is recorded.',
    '',
    '## Deployment & Rollback',
    '',
    '- [x] Deploy through the fixture pipeline; rollback to the previous tag when error rate exceeds the threshold.',
    '',
    '## Observability & Alerting',
    '',
    '- [x] Observe health and error rate; DevOps owns the alert threshold.',
    '',
    '## Backup & Restore',
    '',
    '- [x] No persistent data; restore is not applicable and the package can be reinstalled from its previous tag.',
    '',
    '## Incident Response',
    '',
    '- [x] DevOps owns escalation and the release report records user communication.',
    '',
    '## Verification Evidence',
    '',
    '- [x] npm test and tarball smoke are the pre-release checks; post-release verifies the CLI help command.',
    '',
    '## Known Risks',
    '',
    '- [x] No unmitigated fixture risks.',
    extra,
  ].filter(Boolean).join('\n'));
  return path;
}

function writeProjectPresetFixture(root, {
  curationResult = '通过',
  forbiddenDir = null,
  specs = ['architecture.md'],
} = {}) {
  const profileDir = join(root, 'project-profile');
  const presetDir = join(root, 'project-preset');
  const rulesDir = join(presetDir, 'rules');
  const specsDir = join(presetDir, 'specs');
  const skillsDir = join(presetDir, 'skills');
  mkdirSync(profileDir, { recursive: true });
  mkdirSync(rulesDir, { recursive: true });
  mkdirSync(specsDir, { recursive: true });
  mkdirSync(skillsDir, { recursive: true });
  writeFileSync(join(profileDir, 'product.md'), '# Fixture profile\n');
  writeFileSync(join(presetDir, 'PRESET.md'), '# Fixture preset\n');
  writeFileSync(join(presetDir, 'manifest.json'), JSON.stringify({
    name: 'project-preset',
    version: '0.1.0',
    source: 'fixture',
    generatedAt: '2026-07-12',
    updatedAt: '2026-07-12',
    priority: 'project-over-technical-preset',
    profileDir: 'project-profile',
    curation: 'curation.md',
    rules: ['project.md', 'testing.md'],
    specs,
  }, null, 2));
  writeFileSync(join(presetDir, 'curation.md'), `# Curation\n\n- 审查结论：${curationResult}\n`);
  writeFileSync(join(rulesDir, 'project.md'), '# Project rules\n');
  writeFileSync(join(rulesDir, 'testing.md'), '# Testing rules\n');
  if (specs.includes('architecture.md')) writeFileSync(join(specsDir, 'architecture.md'), '# Architecture\n');
  writeFileSync(join(skillsDir, 'README.md'), '# No project skills\n');
  if (forbiddenDir) mkdirSync(join(presetDir, forbiddenDir), { recursive: true });
}

function writeProjectPresetFeedbackProposal(root, {
  status = 'awaiting_owner',
  targetFiles = 'project-preset/rules/testing.md',
  confirmed = false,
} = {}) {
  const feedbackDir = join(root, 'project-profile', 'feedback');
  mkdirSync(feedbackDir, { recursive: true });
  const path = join(feedbackDir, '2026-07-12-testing-evidence.md');
  const confirmation = confirmed
    ? ['- Confirmed option: apply the proposed testing evidence rule', '- Confirmed by: Owner', '- Confirmation date: 2026-07-12']
    : ['- Confirmed option: pending Owner reply'];
  writeFileSync(path, [
    '# Project Preset Feedback Proposal',
    '',
    '> Proposal ID：PPFB-TEST-001',
    `> Status：${status}`,
    '> Evidence Type：repeated_evidence',
    `> Target Files：${targetFiles}`,
    '> Requested By：Builder',
    '',
    '## Source Feedback',
    '',
    '- Repeated review evidence shows that validation claims need to distinguish automated checks from manual evidence.',
    '',
    '## Evidence',
    '',
    '- project-profile/quality.md records the current automated check boundary.',
    '',
    '## Proposed Change',
    '',
    '- Add one short rule that requires validation reports to label automated and manual evidence separately.',
    '',
    '## Safety Boundaries',
    '',
    '- Do not modify business code, database data, credentials, or files outside Target Files.',
    '',
    '## Owner Confirmation',
    '',
    ...confirmation,
    '',
  ].join('\n'));
  return path;
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
    assert(
      hasIntentRoutingContract(readFileSync(join(claudeDir, 'CLAUDE.md'), 'utf8')) &&
        hasIntentRoutingContract(readFileSync(join(tmp, 'AGENTS.md'), 'utf8')),
      'init: Claude/Codex 入口包含自然语言路由契约'
    );
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
    assert(
      EVENT_COMMANDS.every((commandName) => {
        return hasNextBestActionContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasNextBestActionContract(codexCommandText(agentsDir, commandName));
      }),
      'init: core command 与 skill 包含 Next Best Action 契约'
    );
    assert(
      ['plan', 'dev'].every((commandName) => {
        return hasOwnerDecisionBriefContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasOwnerDecisionBriefContract(codexCommandText(agentsDir, commandName));
      }),
      'init: plan/dev command 与 skill 包含 Owner Decision Brief 契约'
    );
    assert(
      hasSpecTaskGateContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasSpecTaskGateContract(codexCommandText(agentsDir, 'dev')),
      'init: dev command 与 skill 包含 Spec/Task Quality Gate 契约'
    );
    assert(
      hasArtifactStewardshipContract(readFileSync(join(claudeDir, 'CLAUDE.md'), 'utf8')) &&
        hasArtifactStewardshipContract(readFileSync(join(tmp, 'AGENTS.md'), 'utf8')) &&
        hasArtifactStewardshipContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasArtifactStewardshipContract(codexCommandText(agentsDir, 'standup')) &&
        hasArtifactStewardshipContract(codexCommandSkillText(agentsDir, 'project-preset')) &&
        hasArtifactStewardshipContract(codexCommandText(agentsDir, 'project-preset')),
      'init: 入口/standup/project-preset 包含 Artifact Stewardship 契约'
    );
    assert(
      hasWorkspaceRootContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasWorkspaceRootContract(codexCommandText(agentsDir, 'standup')),
      'init: standup command 与 skill 包含 workspace 根目录和状态词契约'
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
      const productLead = readFileSync(join(claudeDir, 'agents', 'product-lead.md'), 'utf8');
      const codexProductLead = readFileSync(join(agentsDir, 'agents', 'product-lead.md'), 'utf8');
      const projectPresetSkillText = codexCommandSkillText(agentsDir, 'project-preset');
      const projectPresetCommand = codexCommandText(agentsDir, 'project-preset');
      assert(
        hasProductBriefContract(planSkill) &&
          hasProductBriefContract(planCommand) &&
          hasProductBriefContract(projectPresetSkillText) &&
          hasProductBriefContract(projectPresetCommand),
        'init: plan/project-preset command 与 skill 包含 Product Brief 契约'
      );
      const architect = readFileSync(join(claudeDir, 'agents', 'architect-planner.md'), 'utf8');
      const deliverySteward = readFileSync(join(claudeDir, 'agents', 'delivery-steward.md'), 'utf8');
      const codexArchitect = readFileSync(join(agentsDir, 'agents', 'architect-planner.md'), 'utf8');
      const codexDeliverySteward = readFileSync(join(agentsDir, 'agents', 'delivery-steward.md'), 'utf8');
      assert(
        hasProductModelPlanContract(planSkill) &&
          hasProductModelPlanContract(planCommand) &&
          hasProductModelPlanContract(productLead) &&
          hasProductModelPlanContract(codexProductLead) &&
          hasProductModelRoleContract(architect) &&
          hasProductModelRoleContract(codexArchitect) &&
          hasProductModelRoleContract(deliverySteward) &&
          hasProductModelRoleContract(codexDeliverySteward),
        'init: plan 与核心角色包含 N2 Product Model 契约'
      );
      assert(
        hasPlanningUpgradePlanContract(planSkill) &&
          hasPlanningUpgradePlanContract(planCommand) &&
          hasPlanningUpgradePresetContract(projectPresetSkillText) &&
          hasPlanningUpgradePresetContract(projectPresetCommand),
        'init: plan/project-preset command 与 skill 包含 M2 规划与边界契约'
      );
      assert(
        PROJECT_PRESET_FEEDBACK_TEXT.every((text) => projectPresetSkillText.includes(text) && projectPresetCommand.includes(text)),
        'init: project-preset command 与 skill 包含 feedback 受控更新契约'
      );
      assert(
        hasExplorationBriefPlanContract(planSkill) &&
          hasExplorationBriefPlanContract(planCommand) &&
          hasExplorationBriefProductLeadContract(productLead) &&
          hasExplorationBriefProductLeadContract(codexProductLead),
        'init: plan/Product Lead 包含 N1 共同探索契约'
      );
    }
    assert(
      hasRoadmapContract(codexCommandSkillText(agentsDir, 'plan')) &&
        hasRoadmapContract(codexCommandText(agentsDir, 'plan')) &&
        hasRoadmapContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasRoadmapContract(codexCommandText(agentsDir, 'dev')),
      'init: plan/dev command 与 skill 包含 roadmap 状态源契约'
    );
    {
      const architect = readFileSync(join(claudeDir, 'agents', 'architect-planner.md'), 'utf8');
      const deliverySteward = readFileSync(join(claudeDir, 'agents', 'delivery-steward.md'), 'utf8');
      const codexArchitect = readFileSync(join(agentsDir, 'agents', 'architect-planner.md'), 'utf8');
      const codexDeliverySteward = readFileSync(join(agentsDir, 'agents', 'delivery-steward.md'), 'utf8');
    assert(
      hasArchitectureContextContract(codexCommandSkillText(agentsDir, 'dev')) &&
          hasArchitectureDecisionContract(codexCommandSkillText(agentsDir, 'dev')) &&
          hasArchitectureContextContract(codexCommandText(agentsDir, 'dev')) &&
          hasArchitectureDecisionContract(codexCommandText(agentsDir, 'dev')) &&
          hasArchitectureContextContract(codexCommandSkillText(agentsDir, 'review-all')) &&
          hasArchitectureContextContract(codexCommandText(agentsDir, 'review-all')) &&
          hasArchitectureContextContract(architect) &&
          hasArchitectureContextContract(codexArchitect) &&
          hasArchitectureContextContract(deliverySteward) &&
          hasArchitectureContextContract(codexDeliverySteward),
      'init: dev/review 与核心角色包含 N3 Architecture Context 契约'
    );
    assert(
      hasPlanningArtifactContext(codexCommandSkillText(agentsDir, 'plan')) &&
        hasPlanningArtifactContext(codexCommandSkillText(agentsDir, 'dev')) &&
        hasPlanningArtifactContext(codexCommandText(agentsDir, 'plan')) &&
        hasPlanningArtifactContext(codexCommandText(agentsDir, 'dev')) &&
        hasPlanningArtifactContext(architect) &&
        hasPlanningArtifactContext(deliverySteward),
      'init: plan/dev 与核心角色包含 N4 Planning Artifact Contract'
    );
    assert(
      ['dev', 'check', 'review-all', 'ship'].every((commandName) => (
        hasControlledDeliveryContract(codexCommandSkillText(agentsDir, commandName)) &&
        hasControlledDeliveryContract(codexCommandText(agentsDir, commandName))
      )),
      'init: 核心命令与 skill 包含 N5 Controlled Delivery Contract'
    );
    assert(
      ['dev', 'fix', 'review-all'].every((commandName) => (
        hasChangeImpactContext(codexCommandSkillText(agentsDir, commandName)) &&
        hasChangeImpactContext(codexCommandText(agentsDir, commandName))
      )),
      'init: 变更命令与 skill 包含 N6 Change Impact Contract'
    );
    assert(
      hasOperationalReadinessContext(codexCommandSkillText(agentsDir, 'ship')) &&
      hasOperationalReadinessContext(codexCommandText(agentsDir, 'ship')),
      'init: ship command 与 skill 包含 N7 Operational Readiness Contract'
    );
    assert(
      hasOwnerDecisionGateContext(codexCommandSkillText(agentsDir, 'dev')) &&
        hasOwnerDecisionGateContext(codexCommandText(agentsDir, 'dev')) &&
        hasOwnerDecisionGateContext(codexCommandSkillText(agentsDir, 'ship')) &&
        hasOwnerDecisionGateContext(codexCommandText(agentsDir, 'ship')),
      'init: dev/ship command 与 skill 包含 N8.2 Owner Decision Gate'
    );
    assert(
      ['plan', 'dev', 'fix', 'check', 'review-all', 'ship', 'standup'].every((commandName) => (
        hasProjectPresetLifecycleContext(codexCommandSkillText(agentsDir, commandName)) &&
        hasProjectPresetLifecycleContext(codexCommandText(agentsDir, commandName))
      )),
      'init: 核心命令与 skill 包含 N8.1 Project Preset Lifecycle 契约'
    );
    }
    assert(
      SUMMARY_COMMANDS.every((commandName) => {
        return hasTasksContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasTasksContract(codexCommandText(agentsDir, commandName));
      }),
      'init: dev/check/review-all/ship command 与 skill 包含 tasks.md 状态机契约'
    );
    assert(
      hasMTasksContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasMTasksContract(codexCommandText(agentsDir, 'dev')),
      'init: dev command 与 skill 要求 M 级使用轻量 tasks.md checklist'
    );
    assert(
      hasDevWriteBoundaryContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasDevWriteBoundaryContract(codexCommandText(agentsDir, 'dev')),
      'init: dev command 与 skill 包含 M3 写入边界契约'
    );
    assert(
      hasDevAcceptanceContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasDevAcceptanceContract(codexCommandText(agentsDir, 'dev')),
      'init: dev command 与 skill 包含 M3 产品验收视角'
    );
    assert(
      hasShipRoadmapContract(codexCommandSkillText(agentsDir, 'ship')) &&
        hasShipRoadmapContract(codexCommandText(agentsDir, 'ship')),
      'init: ship command 与 skill 包含 roadmap shipped 写回契约'
    );
    assert(
      EVENT_COMMANDS.every((commandName) => {
        return hasMetricsEventsContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasMetricsEventsContract(codexCommandText(agentsDir, commandName));
      }),
      'init: core command 与 skill 包含 events.jsonl metrics 扩展字段'
    );
    assert(
      hasStandupMetricsContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupMetricsContract(codexCommandText(agentsDir, 'standup')),
      'init: standup command 与 skill 包含 metrics 聚合契约'
    );
    assert(
      hasStandupImprovementContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupImprovementContract(codexCommandText(agentsDir, 'standup')),
      'init: standup command 与 skill 包含流程改进建议契约'
    );
    assert(
      EVENT_COMMANDS.every((commandName) => {
        return hasFailureRecoveryContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasFailureRecoveryContract(codexCommandText(agentsDir, commandName));
      }),
      'init: core command 与 skill 包含失败恢复记录契约'
    );
    assert(
      hasStandupFailureContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupFailureContract(codexCommandText(agentsDir, 'standup')),
      'init: standup command 与 skill 包含失败恢复聚合契约'
    );
    assert(
      hasStandupTodayContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupTodayContract(codexCommandText(agentsDir, 'standup')),
      'init: standup command 与 skill 包含 Today 轻量视图契约'
    );
    assert(
      hasStandupAllDoneContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupAllDoneContract(codexCommandText(agentsDir, 'standup')),
      'init: standup command 与 skill 包含 all-done 状态契约'
    );
    assert(
      hasStandupVariantsContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupVariantsContract(codexCommandText(agentsDir, 'standup')),
      'init: standup command 与 skill 包含三种输出版本契约'
    );
    assert(
      hasReviewReportContract(codexCommandSkillText(agentsDir, 'review-all')) &&
        hasReviewReportContract(codexCommandText(agentsDir, 'review-all')),
      'init: review-all command 与 skill 包含 review report 契约'
    );
    assert(
      hasReviewRepositionContract(codexCommandSkillText(agentsDir, 'review-all')) &&
        hasReviewRepositionContract(codexCommandText(agentsDir, 'review-all')),
      'init: review-all command 与 skill 包含 M4 审查报告定位契约'
    );
    assert(
      hasReviewAcceptanceContract(codexCommandSkillText(agentsDir, 'review-all')) &&
        hasReviewAcceptanceContract(codexCommandText(agentsDir, 'review-all')),
      'init: review-all command 与 skill 包含 acceptance 风险审查契约'
    );
    assert(
      hasReviewSystemHealthContract(codexCommandSkillText(agentsDir, 'review-all')) &&
        hasReviewSystemHealthContract(codexCommandText(agentsDir, 'review-all')),
      'init: review-all command 与 skill 包含 system health review 契约'
    );
    assert(
      hasReleaseReportContract(codexCommandSkillText(agentsDir, 'ship')) &&
        hasReleaseReportContract(codexCommandText(agentsDir, 'ship')),
      'init: ship command 与 skill 包含 release report 契约'
    );
    assert(
      hasShipRiskContract(codexCommandSkillText(agentsDir, 'ship')) &&
        hasShipRiskContract(codexCommandText(agentsDir, 'ship')),
      'init: ship command 与 skill 包含 M4 known risk 和高风险决策契约'
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
    const codexHooks = JSON.parse(readFileSync(join(codexDir, 'hooks.json'), 'utf8'));
    assert(!codexHooks.hooks.Stop, 'init: Codex 不配置会输出纯文本的 Stop hook');
    assert(fileNames(join(codexDir, 'hooks')).includes('security-check.mjs'), 'init: Codex hooks 已同步');
    assert(existsSync(join(codexDir, 'config.toml')), 'init: Codex config.toml 存在');
    const initCodexAgents = fileNames(join(codexDir, 'agents')).filter((name) => name.endsWith('.toml'));
    assert(initCodexAgents.length === AGENT_COUNT, `init: Codex custom agents = ${AGENT_COUNT}`);
    assert(REQUIRED_CODEX_AGENTS.every((name) => initCodexAgents.includes(name)), 'init: Codex custom agents 包含 Product Lead 和 Delivery Steward');
    const codexConfig = readFileSync(join(codexDir, 'config.toml'), 'utf8');
    assert(codexConfig.includes(`[mcp_servers.${manifest.mcpSmokeServer}]`), `init: Codex MCP 已生成 ${manifest.mcpSmokeServer}`);
    if (manifest.codexConfigIncludes) {
      assert(codexConfig.includes(manifest.codexConfigIncludes), 'init: Codex MCP 参数环境变量通过 wrapper 展开');
    }
    const codexBuilder = readFileSync(join(agentsDir, 'agents', 'builder.md'), 'utf8');
    assert(!codexBuilder.includes('.claude/rules'), 'init: Codex agent 文档不再指向 .claude/rules');
    const projectPresetSkill = readFileSync(join(agentsDir, 'skills', 'team-command-project-preset', 'SKILL.md'), 'utf8');
    assert(
      !projectPresetSkill.includes('├── .agents/') && !projectPresetSkill.includes('├── .claude/'),
      'init: project-preset 规则目录不被 Codex 路径重写误伤'
    );
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
    assert(
      EVENT_COMMANDS.every((commandName) => {
        return hasNextBestActionContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasNextBestActionContract(codexCommandText(agentsDir, commandName));
      }),
      'update: core command 与 skill 保留 Next Best Action 契约'
    );
    assert(
      ['plan', 'dev'].every((commandName) => {
        return hasOwnerDecisionBriefContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasOwnerDecisionBriefContract(codexCommandText(agentsDir, commandName));
      }),
      'update: plan/dev command 与 skill 保留 Owner Decision Brief 契约'
    );
    assert(
      hasSpecTaskGateContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasSpecTaskGateContract(codexCommandText(agentsDir, 'dev')),
      'update: dev command 与 skill 保留 Spec/Task Quality Gate 契约'
    );
    assert(
      hasArtifactStewardshipContract(readFileSync(join(claudeDir, 'CLAUDE.md'), 'utf8')) &&
        hasArtifactStewardshipContract(readFileSync(join(tmp, 'AGENTS.md'), 'utf8')) &&
        hasArtifactStewardshipContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasArtifactStewardshipContract(codexCommandText(agentsDir, 'standup')) &&
        hasArtifactStewardshipContract(codexCommandSkillText(agentsDir, 'project-preset')) &&
        hasArtifactStewardshipContract(codexCommandText(agentsDir, 'project-preset')),
      'update: 入口/standup/project-preset 保留 Artifact Stewardship 契约'
    );
    assert(
      hasWorkspaceRootContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasWorkspaceRootContract(codexCommandText(agentsDir, 'standup')),
      'update: standup command 与 skill 保留 workspace 根目录和状态词契约'
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
    {
      const productLead = readFileSync(join(claudeDir, 'agents', 'product-lead.md'), 'utf8');
      const architect = readFileSync(join(claudeDir, 'agents', 'architect-planner.md'), 'utf8');
      const deliverySteward = readFileSync(join(claudeDir, 'agents', 'delivery-steward.md'), 'utf8');
      const codexProductLead = readFileSync(join(agentsDir, 'agents', 'product-lead.md'), 'utf8');
      const codexArchitect = readFileSync(join(agentsDir, 'agents', 'architect-planner.md'), 'utf8');
      const codexDeliverySteward = readFileSync(join(agentsDir, 'agents', 'delivery-steward.md'), 'utf8');
      assert(
        hasProductModelPlanContract(codexCommandSkillText(agentsDir, 'plan')) &&
          hasProductModelPlanContract(codexCommandText(agentsDir, 'plan')) &&
          hasProductModelPlanContract(productLead) &&
          hasProductModelPlanContract(codexProductLead) &&
          hasProductModelRoleContract(architect) &&
          hasProductModelRoleContract(codexArchitect) &&
          hasProductModelRoleContract(deliverySteward) &&
          hasProductModelRoleContract(codexDeliverySteward),
        'update: plan 与核心角色保留 N2 Product Model 契约'
      );
    }
    assert(
      hasPlanningUpgradePlanContract(codexCommandSkillText(agentsDir, 'plan')) &&
        hasPlanningUpgradePlanContract(codexCommandText(agentsDir, 'plan')) &&
        hasPlanningUpgradePresetContract(codexCommandSkillText(agentsDir, 'project-preset')) &&
        hasPlanningUpgradePresetContract(codexCommandText(agentsDir, 'project-preset')),
      'update: plan/project-preset command 与 skill 保留 M2 规划与边界契约'
    );
    assert(
      PROJECT_PRESET_FEEDBACK_TEXT.every((text) => (
        codexCommandSkillText(agentsDir, 'project-preset').includes(text) &&
        codexCommandText(agentsDir, 'project-preset').includes(text)
      )),
      'update: project-preset command 与 skill 保留 feedback 受控更新契约'
    );
    {
      const productLead = readFileSync(join(claudeDir, 'agents', 'product-lead.md'), 'utf8');
      const codexProductLead = readFileSync(join(agentsDir, 'agents', 'product-lead.md'), 'utf8');
      assert(
        hasExplorationBriefPlanContract(codexCommandSkillText(agentsDir, 'plan')) &&
          hasExplorationBriefPlanContract(codexCommandText(agentsDir, 'plan')) &&
          hasExplorationBriefProductLeadContract(productLead) &&
          hasExplorationBriefProductLeadContract(codexProductLead),
        'update: plan/Product Lead 保留 N1 共同探索契约'
      );
    }
    assert(
      hasRoadmapContract(codexCommandSkillText(agentsDir, 'plan')) &&
        hasRoadmapContract(codexCommandText(agentsDir, 'plan')) &&
        hasRoadmapContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasRoadmapContract(codexCommandText(agentsDir, 'dev')),
      'update: plan/dev command 与 skill 保留 roadmap 状态源契约'
    );
    {
      const architect = readFileSync(join(claudeDir, 'agents', 'architect-planner.md'), 'utf8');
      const deliverySteward = readFileSync(join(claudeDir, 'agents', 'delivery-steward.md'), 'utf8');
      const codexArchitect = readFileSync(join(agentsDir, 'agents', 'architect-planner.md'), 'utf8');
      const codexDeliverySteward = readFileSync(join(agentsDir, 'agents', 'delivery-steward.md'), 'utf8');
    assert(
      hasArchitectureContextContract(codexCommandSkillText(agentsDir, 'dev')) &&
          hasArchitectureDecisionContract(codexCommandSkillText(agentsDir, 'dev')) &&
          hasArchitectureContextContract(codexCommandText(agentsDir, 'dev')) &&
          hasArchitectureDecisionContract(codexCommandText(agentsDir, 'dev')) &&
          hasArchitectureContextContract(codexCommandSkillText(agentsDir, 'review-all')) &&
          hasArchitectureContextContract(codexCommandText(agentsDir, 'review-all')) &&
          hasArchitectureContextContract(architect) &&
          hasArchitectureContextContract(codexArchitect) &&
          hasArchitectureContextContract(deliverySteward) &&
          hasArchitectureContextContract(codexDeliverySteward),
      'update: dev/review 与核心角色保留 N3 Architecture Context 契约'
    );
    assert(
      hasPlanningArtifactContext(codexCommandSkillText(agentsDir, 'plan')) &&
        hasPlanningArtifactContext(codexCommandSkillText(agentsDir, 'dev')) &&
        hasPlanningArtifactContext(codexCommandText(agentsDir, 'plan')) &&
        hasPlanningArtifactContext(codexCommandText(agentsDir, 'dev')) &&
        hasPlanningArtifactContext(architect) &&
        hasPlanningArtifactContext(deliverySteward),
      'update: plan/dev 与核心角色保留 N4 Planning Artifact Contract'
    );
    assert(
      ['dev', 'check', 'review-all', 'ship'].every((commandName) => (
        hasControlledDeliveryContract(codexCommandSkillText(agentsDir, commandName)) &&
        hasControlledDeliveryContract(codexCommandText(agentsDir, commandName))
      )),
      'update: 核心命令与 skill 保留 N5 Controlled Delivery Contract'
    );
    assert(
      ['dev', 'fix', 'review-all'].every((commandName) => (
        hasChangeImpactContext(codexCommandSkillText(agentsDir, commandName)) &&
        hasChangeImpactContext(codexCommandText(agentsDir, commandName))
      )),
      'update: 变更命令与 skill 保留 N6 Change Impact Contract'
    );
    assert(
      hasOperationalReadinessContext(codexCommandSkillText(agentsDir, 'ship')) &&
      hasOperationalReadinessContext(codexCommandText(agentsDir, 'ship')),
      'update: ship command 与 skill 保留 N7 Operational Readiness Contract'
    );
    assert(
      hasOwnerDecisionGateContext(codexCommandSkillText(agentsDir, 'dev')) &&
        hasOwnerDecisionGateContext(codexCommandText(agentsDir, 'dev')) &&
        hasOwnerDecisionGateContext(codexCommandSkillText(agentsDir, 'ship')) &&
        hasOwnerDecisionGateContext(codexCommandText(agentsDir, 'ship')),
      'update: dev/ship command 与 skill 保留 N8.2 Owner Decision Gate'
    );
    assert(
      ['plan', 'dev', 'fix', 'check', 'review-all', 'ship', 'standup'].every((commandName) => (
        hasProjectPresetLifecycleContext(codexCommandSkillText(agentsDir, commandName)) &&
        hasProjectPresetLifecycleContext(codexCommandText(agentsDir, commandName))
      )),
      'update: 核心命令与 skill 保留 N8.1 Project Preset Lifecycle 契约'
    );
    }
    assert(
      SUMMARY_COMMANDS.every((commandName) => {
        return hasTasksContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasTasksContract(codexCommandText(agentsDir, commandName));
      }),
      'update: dev/check/review-all/ship command 与 skill 保留 tasks.md 状态机契约'
    );
    assert(
      hasMTasksContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasMTasksContract(codexCommandText(agentsDir, 'dev')),
      'update: dev command 与 skill 保留 M 级轻量 tasks.md checklist 契约'
    );
    assert(
      hasDevWriteBoundaryContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasDevWriteBoundaryContract(codexCommandText(agentsDir, 'dev')),
      'update: dev command 与 skill 保留 M3 写入边界契约'
    );
    assert(
      hasDevAcceptanceContract(codexCommandSkillText(agentsDir, 'dev')) &&
        hasDevAcceptanceContract(codexCommandText(agentsDir, 'dev')),
      'update: dev command 与 skill 保留 M3 产品验收视角'
    );
    assert(
      hasShipRoadmapContract(codexCommandSkillText(agentsDir, 'ship')) &&
        hasShipRoadmapContract(codexCommandText(agentsDir, 'ship')),
      'update: ship command 与 skill 保留 roadmap shipped 写回契约'
    );
    assert(
      EVENT_COMMANDS.every((commandName) => {
        return hasMetricsEventsContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasMetricsEventsContract(codexCommandText(agentsDir, commandName));
      }),
      'update: core command 与 skill 保留 events.jsonl metrics 扩展字段'
    );
    assert(
      hasStandupMetricsContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupMetricsContract(codexCommandText(agentsDir, 'standup')),
      'update: standup command 与 skill 保留 metrics 聚合契约'
    );
    assert(
      hasStandupImprovementContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupImprovementContract(codexCommandText(agentsDir, 'standup')),
      'update: standup command 与 skill 保留流程改进建议契约'
    );
    assert(
      EVENT_COMMANDS.every((commandName) => {
        return hasFailureRecoveryContract(codexCommandSkillText(agentsDir, commandName)) &&
          hasFailureRecoveryContract(codexCommandText(agentsDir, commandName));
      }),
      'update: core command 与 skill 保留失败恢复记录契约'
    );
    assert(
      hasStandupFailureContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupFailureContract(codexCommandText(agentsDir, 'standup')),
      'update: standup command 与 skill 保留失败恢复聚合契约'
    );
    assert(
      hasStandupTodayContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupTodayContract(codexCommandText(agentsDir, 'standup')),
      'update: standup command 与 skill 保留 Today 轻量视图契约'
    );
    assert(
      hasStandupAllDoneContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupAllDoneContract(codexCommandText(agentsDir, 'standup')),
      'update: standup command 与 skill 保留 all-done 状态契约'
    );
    assert(
      hasStandupVariantsContract(codexCommandSkillText(agentsDir, 'standup')) &&
        hasStandupVariantsContract(codexCommandText(agentsDir, 'standup')),
      'update: standup command 与 skill 保留三种输出版本契约'
    );
    assert(
      hasReviewReportContract(codexCommandSkillText(agentsDir, 'review-all')) &&
        hasReviewReportContract(codexCommandText(agentsDir, 'review-all')),
      'update: review-all command 与 skill 保留 review report 契约'
    );
    assert(
      hasReviewRepositionContract(codexCommandSkillText(agentsDir, 'review-all')) &&
        hasReviewRepositionContract(codexCommandText(agentsDir, 'review-all')),
      'update: review-all command 与 skill 保留 M4 审查报告定位契约'
    );
    assert(
      hasReviewAcceptanceContract(codexCommandSkillText(agentsDir, 'review-all')) &&
        hasReviewAcceptanceContract(codexCommandText(agentsDir, 'review-all')),
      'update: review-all command 与 skill 保留 acceptance 风险审查契约'
    );
    assert(
      hasReviewSystemHealthContract(codexCommandSkillText(agentsDir, 'review-all')) &&
        hasReviewSystemHealthContract(codexCommandText(agentsDir, 'review-all')),
      'update: review-all command 与 skill 保留 system health review 契约'
    );
    assert(
      hasReleaseReportContract(codexCommandSkillText(agentsDir, 'ship')) &&
        hasReleaseReportContract(codexCommandText(agentsDir, 'ship')),
      'update: ship command 与 skill 保留 release report 契约'
    );
    assert(
      hasShipRiskContract(codexCommandSkillText(agentsDir, 'ship')) &&
        hasShipRiskContract(codexCommandText(agentsDir, 'ship')),
      'update: ship command 与 skill 保留 M4 known risk 和高风险决策契约'
    );
    const updateCodexAgents = fileNames(join(codexDir, 'agents')).filter((name) => name.endsWith('.toml'));
    assert(updateCodexAgents.length === AGENT_COUNT, `update: Codex custom agents 仍 = ${AGENT_COUNT}`);
    assert(REQUIRED_CODEX_AGENTS.every((name) => updateCodexAgents.includes(name)), 'update: Codex custom agents 保留 Product Lead 和 Delivery Steward');

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
    assert(
      hasIntentRoutingContract(readFileSync(join(claudeDir, 'CLAUDE.md'), 'utf8')) &&
        hasIntentRoutingContract(readFileSync(join(tmp, 'AGENTS.md'), 'utf8')),
      'update: Claude/Codex 入口保留自然语言路由契约'
    );
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
const escapedAgentToml = buildCodexAgentToml('reviewer', 'Markdown footnote: \\* applies to UI only.');
assert(escapedAgentToml.includes('Markdown footnote: \\\\* applies to UI only.'), 'Codex agent TOML: 反斜杠被正确转义');
{
  const rewritten = toCodexText([
    '见 `rules/design.md` 和 `commands/taste.md`。',
    '保留 `project-preset/rules/project.md`。',
    'project-preset/\n├── rules/\n└── specs/',
    '保留 `lang/python/rules/python.md`。',
    '显式 `.claude/specs/node.md` 应改写。',
  ].join('\n'));
  assert(rewritten.includes('`.agents/rules/design.md`'), 'toCodexText: 相对 rules/ 路径改写');
  assert(rewritten.includes('`.agents/commands/taste.md`'), 'toCodexText: 相对 commands/ 路径改写');
  assert(rewritten.includes('`project-preset/rules/project.md`'), 'toCodexText: 不误伤 project-preset/rules/');
  assert(rewritten.includes('project-preset/\n├── rules/\n└── specs/'), 'toCodexText: 不误伤 project-preset 目录树');
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

console.log('\n[Hook 行为测试]');
{
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const securityHook = join(repoRoot, '.claude', 'hooks', 'security-check.mjs');
  const bashHook = join(repoRoot, '.claude', 'hooks', 'bash-check.mjs');
  const securityCriticalCases = [
    ['eval', { tool_input: { file_path: 'src/app.js', content: 'eval(userInput);' } }],
    ['new Function', { tool_input: { file_path: 'src/app.js', content: 'const fn = new Function(code);' } }],
    ['innerHTML', { tool_input: { file_path: 'src/app.js', content: 'element.innerHTML = userInput;' } }],
    ['child_process.exec', { tool_input: { file_path: 'src/app.js', content: 'child_process.exec(command);' } }],
  ];
  for (const [name, payload] of securityCriticalCases) {
    assert(runHook(securityHook, payload).status === 2, `security-check: ${name} exit 2`);
  }
  assert(
    runHook(securityHook, { tool_input: { file_path: 'src/app.js', content: 'const value = JSON.stringify(input);' } }).status === 0,
    'security-check: 普通代码不误拦'
  );

  const bashCriticalCases = [
    ['git reset --hard', { tool_input: { command: 'git reset --hard HEAD' } }],
    ['git clean -f', { tool_input: { command: 'git clean -fd' } }],
    ['npm publish', { tool_input: { command: 'npm publish' } }],
  ];
  for (const [name, payload] of bashCriticalCases) {
    assert(runHook(bashHook, payload).status === 2, `bash-check: ${name} exit 2`);
  }
  assert(
    runHook(bashHook, { tool_input: { command: 'npm run validate' } }).status === 0,
    'bash-check: 普通命令不误拦'
  );
}

console.log('\n[M5 状态工具]');
{
  const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
  const tmp = mkdtempSync(join(tmpdir(), 'cct-state-'));
  try {
    writeFixtureEvents(tmp);

    let eventsOk = false;
    try {
      await silent(() => validateEvents({ cwd: tmp }));
      eventsOk = true;
    } catch {
      eventsOk = false;
    }
    assert(eventsOk, 'events validate: JSONL 和 artifact 引用通过');

    const status = await buildStatus({ cwd: tmp });
    assert(
      status.currentMain === 'Phase M5：Trustworthy State Tools。' &&
        status.nextPlannedTask?.id === 'M5.1' &&
        status.workspace.events.validation === 'pass',
      'status: 从本地 artifact 输出当前主线、下一任务和 events 状态'
    );

    await silent(() => updateMetrics({ cwd: tmp }));
    const metricsText = readFileSync(join(tmp, '.claude', 'workspace', 'metrics.md'), 'utf8');
    assert(
      metricsText.includes('create-claude-team metrics update') &&
        metricsText.includes('checkIssueCount') &&
        metricsText.includes('events.jsonl 是机器事实来源'),
      'metrics update: 从 events 聚合 metrics.md'
    );

    const statusCli = spawnSync(process.execPath, [cli, 'status', '--json'], { cwd: tmp, encoding: 'utf8' });
    assert(
      statusCli.status === 0 && JSON.parse(statusCli.stdout).workspace.events.validation === 'pass',
      'cli status --json: 输出可解析 JSON'
    );

    const eventsCli = spawnSync(process.execPath, [cli, 'events', 'validate'], { cwd: tmp, encoding: 'utf8' });
    assert(eventsCli.status === 0 && eventsCli.stdout.includes('events 校验通过'), 'cli events validate: 通过有效事件日志');

    const metricsCli = spawnSync(process.execPath, [cli, 'metrics', 'update', '--dry-run'], { cwd: tmp, encoding: 'utf8' });
    assert(metricsCli.status === 0 && metricsCli.stdout.includes('最近 10 次任务'), 'cli metrics update --dry-run: 输出聚合摘要');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

console.log('\n[N4 规划产物体系]');
{
  const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
  const tmp = mkdtempSync(join(tmpdir(), 'cct-planning-'));
  const invalidTmp = mkdtempSync(join(tmpdir(), 'cct-planning-invalid-'));
  try {
    writePlanningFixture(tmp);
    const valid = validatePlanningArtifacts({ cwd: tmp });
    assert(valid.valid && valid.modules.length === 1 && valid.features.length === 1, 'planning: 有效 artifact 链通过校验');

    const status = await buildStatus({ cwd: tmp });
    assert(
      status.currentMain === 'N1 Fixture planning (in_progress)' &&
        status.nextPlannedTask?.id === 'N1.1' &&
        status.planning.available && status.planning.valid,
      'planning: status 优先读取 root roadmap 与 feature tasks'
    );

    const archivedFeatureDir = join(tmp, '.claude', 'workspace', 'features', 'n1-archived');
    const activeFeatureDir = join(tmp, '.claude', 'workspace', 'features', 'n1-z-active');
    mkdirSync(archivedFeatureDir, { recursive: true });
    mkdirSync(activeFeatureDir, { recursive: true });
    writeFileSync(join(archivedFeatureDir, 'spec.md'), readFileSync(join(tmp, '.claude', 'workspace', 'features', 'n1-fixture', 'spec.md'), 'utf8').replace('N1-SPEC-001', 'N1-SPEC-ARCHIVED').replaceAll('n1-fixture', 'n1-archived'));
    writeFileSync(join(archivedFeatureDir, 'tasks.md'), readFileSync(join(tmp, '.claude', 'workspace', 'features', 'n1-fixture', 'tasks.md'), 'utf8').replace('N1-TASKS-001', 'N1-TASKS-ARCHIVED').replaceAll('n1-fixture', 'n1-archived').replace('in_progress', 'done'));
    writeFileSync(join(activeFeatureDir, 'spec.md'), readFileSync(join(tmp, '.claude', 'workspace', 'features', 'n1-fixture', 'spec.md'), 'utf8').replace('N1-SPEC-001', 'N1-SPEC-ACTIVE').replaceAll('n1-fixture', 'n1-z-active'));
    writeFileSync(join(activeFeatureDir, 'tasks.md'), readFileSync(join(tmp, '.claude', 'workspace', 'features', 'n1-fixture', 'tasks.md'), 'utf8').replace('N1-TASKS-001', 'N1-TASKS-ACTIVE').replaceAll('n1-fixture', 'n1-z-active').replace('N1.1', 'N1.2'));
    writeFileSync(join(tmp, '.claude', 'workspace', 'features', 'n1-fixture', 'tasks.md'), readFileSync(join(tmp, '.claude', 'workspace', 'features', 'n1-fixture', 'tasks.md'), 'utf8').replace('in_progress', 'done'));
    const multiFeatureStatus = await buildStatus({ cwd: tmp });
    assert(
      multiFeatureStatus.planning.feature?.path.endsWith('n1-z-active') && multiFeatureStatus.nextPlannedTask?.id === 'N1.2',
      'planning: 同模块多 feature 时优先读取有活跃任务的 package'
    );

    rmSync(join(tmp, '.claude', 'workspace', 'features', 'n1-fixture'), { recursive: true, force: true });
    rmSync(archivedFeatureDir, { recursive: true, force: true });
    rmSync(activeFeatureDir, { recursive: true, force: true });
    const roadmapOnlyStatus = await buildStatus({ cwd: tmp });
    assert(
      roadmapOnlyStatus.currentMain === 'N1 Fixture planning (in_progress)' &&
        roadmapOnlyStatus.nextPlannedTask?.id === 'N1' &&
        roadmapOnlyStatus.planning.feature === null,
      'planning: 缺少 feature package 时以 roadmap 只读投影下一模块'
    );

    const planningCli = spawnSync(process.execPath, [cli, 'planning', 'validate'], { cwd: tmp, encoding: 'utf8' });
    assert(planningCli.status === 0 && planningCli.stdout.includes('planning artifact 校验通过'), 'planning cli: 验证有效引用链');

    writePlanningFixture(invalidTmp, { invalidCapability: true });
    const invalid = validatePlanningArtifacts({ cwd: invalidTmp });
    assert(!invalid.valid && invalid.issues.some((issue) => issue.includes('C99')), 'planning: 拒绝未知 Capability ID');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(invalidTmp, { recursive: true, force: true });
  }
}

console.log('\n[N5 受控开发循环]');
{
  const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
  const tmp = mkdtempSync(join(tmpdir(), 'cct-delivery-'));
  const missingFeatureTmp = mkdtempSync(join(tmpdir(), 'cct-delivery-feature-'));
  const dependencyTmp = mkdtempSync(join(tmpdir(), 'cct-delivery-dependency-'));
  const securityTmp = mkdtempSync(join(tmpdir(), 'cct-delivery-security-'));
  const transitionTmp = mkdtempSync(join(tmpdir(), 'cct-delivery-transition-'));
  try {
    writeDeliveryFixture(tmp);
    const preflight = validateDeliveryPreflight({ cwd: tmp, target: 'N1', taskId: 'N1.1' });
    assert(preflight.status === 'pass', 'delivery preflight: 完整任务可开工');

    const preflightCli = spawnSync(process.execPath, [cli, 'delivery', 'preflight', 'N1', '--task', 'N1.1'], { cwd: tmp, encoding: 'utf8' });
    assert(preflightCli.status === 0 && preflightCli.stdout.includes('delivery preflight: pass'), 'delivery cli: 输出可开工结论');

    const startTransition = validateDeliveryTransition({ cwd: tmp, target: 'N1', taskId: 'N1.1', toStatus: 'in_progress' });
    assert(startTransition.status === 'pass', 'delivery transition: planned 经 preflight 可进入 in_progress');

    writeDeliveryFixture(missingFeatureTmp);
    rmSync(join(missingFeatureTmp, '.claude', 'workspace', 'features', 'n1-fixture'), { recursive: true, force: true });
    const missingFeature = validateDeliveryPreflight({ cwd: missingFeatureTmp, target: 'N1', taskId: 'N1.1' });
    assert(missingFeature.status === 'blocked' && missingFeature.issues.some((issue) => issue.code === 'feature_missing'), 'delivery preflight: 缺 feature package 时阻止开工');

    writeDeliveryFixture(dependencyTmp);
    writeFileSync(join(dependencyTmp, 'roadmap.md'), [
      '> Roadmap ID：RM-TEST-001',
      '> Product Brief ID：PB-TEST-001',
      '> Product Model ID：PM-TEST-001',
      '> Architecture ID：ARCH-TEST-001',
      '| 模块 ID | 状态 | 模块 | Capability ID | Architecture Component ID | 依赖 |',
      '|---|---|---|---|---|---|',
      '| N1 | planned | Fixture planning | C1 | A4 | N2 |',
      '| N2 | planned | Dependency fixture | C1 | A4 | 无 |',
    ].join('\n'));
    const dependency = validateDeliveryPreflight({ cwd: dependencyTmp, target: 'N1', taskId: 'N1.1' });
    assert(dependency.status === 'blocked' && dependency.issues.some((issue) => issue.code === 'dependency_incomplete'), 'delivery preflight: 未完成依赖时阻止开工');

    writeDeliveryFixture(securityTmp);
    const securitySpecPath = join(securityTmp, '.claude', 'workspace', 'features', 'n1-fixture', 'spec.md');
    const securitySpec = readFileSync(securitySpecPath, 'utf8')
      .replace('> Security Impact：none', '> Security Impact：authentication flow')
      .replace('> Security Risk Level：standard', '> Security Risk Level：standard')
      .replace('> Threat Model：not required for standard fixture', '> Threat Model：none');
    writeFileSync(securitySpecPath, securitySpec);
    const security = validateDeliveryPreflight({ cwd: securityTmp, target: 'N1', taskId: 'N1.1' });
    assert(
      security.status === 'needs_revision' && security.issues.some((issue) => issue.code === 'threat_model_missing'),
      'delivery preflight: 高风险但缺威胁分析时要求修订'
    );

    writeDeliveryFixture(transitionTmp, { taskStatus: 'local_gate' });
    const missingLocalEvidence = validateDeliveryTransition({ cwd: transitionTmp, target: 'N1', taskId: 'N1.1', toStatus: 'review_gate' });
    assert(
      missingLocalEvidence.status === 'needs_revision' && missingLocalEvidence.issues.some((issue) => issue.code === 'local_evidence_missing'),
      'delivery transition: 缺 local pass 时拒绝进入 review_gate'
    );
    writeDeliveryFixture(transitionTmp, { taskStatus: 'local_gate', gateResult: 'local pass / review pending / release not_required' });
    const reviewTransition = validateDeliveryTransition({ cwd: transitionTmp, target: 'N1', taskId: 'N1.1', toStatus: 'review_gate' });
    assert(reviewTransition.status === 'pass', 'delivery transition: local pass 后允许进入 review_gate');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(missingFeatureTmp, { recursive: true, force: true });
    rmSync(dependencyTmp, { recursive: true, force: true });
    rmSync(securityTmp, { recursive: true, force: true });
    rmSync(transitionTmp, { recursive: true, force: true });
  }
}

console.log('\n[N6 变更影响与完整性]');
{
  const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
  const tmp = mkdtempSync(join(tmpdir(), 'cct-change-'));
  const missingAffectedTmp = mkdtempSync(join(tmpdir(), 'cct-change-affected-'));
  const architectureTmp = mkdtempSync(join(tmpdir(), 'cct-change-architecture-'));
  const incompleteTmp = mkdtempSync(join(tmpdir(), 'cct-change-incomplete-'));
  try {
    writeDeliveryFixture(tmp);
    const analysis = analyzeChange({ cwd: tmp, target: 'N1', kind: 'experience' });
    assert(
      analysis.status === 'pass' && analysis.module['模块 ID'] === 'N1' && analysis.ownership.includes('A2'),
      'change analyze: 从模块定位体验反馈归属和影响范围'
    );
    const analysisCli = spawnSync(process.execPath, [cli, 'change', 'analyze', 'N1', '--kind', 'experience'], { cwd: tmp, encoding: 'utf8' });
    assert(analysisCli.status === 0 && analysisCli.stdout.includes('change analyze: pass'), 'change cli: 输出影响分析结论');

    const validBrief = writeChangeBrief(tmp);
    const valid = validateChangeBrief({ cwd: tmp, path: validBrief });
    assert(valid.status === 'pass', 'change validate: 完整体验 Brief 通过');
    const delivery = validateDeliveryPreflight({ cwd: tmp, target: 'N1', taskId: 'N1.1', changePath: validBrief });
    assert(delivery.status === 'pass', 'delivery preflight: 可携带通过的 Change Impact Brief');

    writeDeliveryFixture(missingAffectedTmp);
    const missingAffectedBrief = writeChangeBrief(missingAffectedTmp);
    writeFileSync(missingAffectedBrief, readFileSync(missingAffectedBrief, 'utf8').replace('> Affected Components：A4', '> Affected Components：A2'));
    const missingAffected = validateChangeBrief({ cwd: missingAffectedTmp, path: missingAffectedBrief });
    assert(
      missingAffected.status === 'needs_revision' && missingAffected.issues.some((issue) => issue.code === 'affected_component_mismatch'),
      'change validate: 拒绝漏掉目标模块核心受影响组件的 Brief'
    );

    writeDeliveryFixture(architectureTmp);
    const architectureBrief = writeChangeBrief(architectureTmp, {
      kind: 'architecture',
      syncItems: ['spec.md: update affected scope.', '兼容/迁移验证: verify compatibility.'],
    });
    const missingArchitectureSync = validateChangeBrief({ cwd: architectureTmp, path: architectureBrief });
    assert(
      missingArchitectureSync.status === 'needs_revision' && missingArchitectureSync.issues.some((issue) => issue.code === 'sync_missing'),
      'change validate: 架构变更缺 architecture/ADR 同步项时拒绝'
    );

    writeDeliveryFixture(incompleteTmp);
    const incompleteBrief = writeChangeBrief(incompleteTmp, { status: 'complete' });
    const incomplete = validateChangeBrief({ cwd: incompleteTmp, path: incompleteBrief });
    assert(
      incomplete.status === 'needs_revision' && incomplete.issues.some((issue) => issue.code === 'sync_incomplete'),
      'change validate: complete Brief 留有未完成同步项时拒绝'
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(missingAffectedTmp, { recursive: true, force: true });
    rmSync(architectureTmp, { recursive: true, force: true });
    rmSync(incompleteTmp, { recursive: true, force: true });
  }
}

console.log('\n[N7 安全、发布与运行保障]');
{
  const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
  const tmp = mkdtempSync(join(tmpdir(), 'cct-operations-'));
  const highRiskTmp = mkdtempSync(join(tmpdir(), 'cct-operations-high-risk-'));
  const highRiskEvidenceTmp = mkdtempSync(join(tmpdir(), 'cct-operations-high-risk-evidence-'));
  const secretTmp = mkdtempSync(join(tmpdir(), 'cct-operations-secret-'));
  try {
    writeDeliveryFixture(tmp);
    const validBrief = writeOperationalReadinessBrief(tmp);
    const valid = validateOperationalReadiness({ cwd: tmp, path: validBrief });
    assert(valid.status === 'pass', 'operations validate: 完整 standard Readiness Brief 通过');
    const validCli = spawnSync(process.execPath, [cli, 'operations', 'validate', validBrief], { cwd: tmp, encoding: 'utf8' });
    assert(validCli.status === 0 && validCli.stdout.includes('operations validate: pass'), 'operations cli: 输出运行准备度结论');

    writeDeliveryFixture(highRiskTmp);
    const highRiskBrief = writeOperationalReadinessBrief(highRiskTmp, { riskLevel: 'high' });
    const highRisk = validateOperationalReadiness({ cwd: highRiskTmp, path: highRiskBrief });
    assert(
      highRisk.status === 'needs_revision' && highRisk.issues.some((issue) => issue.code === 'threat_model_missing') && highRisk.issues.some((issue) => issue.code === 'owner_decision_missing'),
      'operations validate: high risk 缺 Threat Model 和 Owner Decision 时拒绝'
    );

    writeDeliveryFixture(highRiskEvidenceTmp);
    const missingEvidenceBrief = writeOperationalReadinessBrief(highRiskEvidenceTmp, {
      name: 'missing-evidence.md',
      riskLevel: 'high',
      threatModel: 'missing-threat-model.md',
      ownerDecision: 'missing-owner-decision.md',
    });
    const missingEvidence = validateOperationalReadiness({ cwd: highRiskEvidenceTmp, path: missingEvidenceBrief });
    assert(
      missingEvidence.status === 'needs_revision' && missingEvidence.issues.some((issue) => issue.code === 'threat_model_invalid') && missingEvidence.issues.some((issue) => issue.code === 'owner_decision_invalid'),
      'operations validate: high risk 证据路径不存在时拒绝'
    );
    writeFileSync(join(highRiskEvidenceTmp, 'threat-model.md'), '# Threat model\n');
    writeFileSync(join(highRiskEvidenceTmp, 'owner-decision.md'), '# Owner decision\n');
    const highRiskEvidenceBrief = writeOperationalReadinessBrief(highRiskEvidenceTmp, {
      riskLevel: 'high',
      threatModel: 'threat-model.md',
      ownerDecision: 'owner-decision.md',
    });
    const highRiskEvidence = validateOperationalReadiness({ cwd: highRiskEvidenceTmp, path: highRiskEvidenceBrief });
    assert(highRiskEvidence.status === 'pass', 'operations validate: high risk 必须引用真实 Threat Model 和 Owner Decision');

    writeDeliveryFixture(secretTmp);
    const secretBrief = writeOperationalReadinessBrief(secretTmp, { extra: '- [x] API_KEY=supersecretvalue must not be committed.' });
    const secret = validateOperationalReadiness({ cwd: secretTmp, path: secretBrief });
    assert(
      secret.status === 'blocked' && secret.issues.some((issue) => issue.code === 'secret_exposed'),
      'operations validate: 阻止包含明文秘密的运行证据'
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(highRiskTmp, { recursive: true, force: true });
    rmSync(highRiskEvidenceTmp, { recursive: true, force: true });
    rmSync(secretTmp, { recursive: true, force: true });
  }
}

console.log('\n[N8.2 Owner Decision Gate]');
{
  const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
  const pendingTmp = mkdtempSync(join(tmpdir(), 'cct-decision-pending-'));
  const confirmedTmp = mkdtempSync(join(tmpdir(), 'cct-decision-confirmed-'));
  const mismatchTmp = mkdtempSync(join(tmpdir(), 'cct-decision-mismatch-'));
  const lowRiskTmp = mkdtempSync(join(tmpdir(), 'cct-decision-low-risk-'));
  try {
    writeDeliveryFixture(pendingTmp, { ownerDecisionRequired: 'yes', ownerDecisionTypes: 'architecture' });
    const missing = validateDeliveryPreflight({ cwd: pendingTmp, target: 'N1', taskId: 'N1.1' });
    assert(missing.status === 'blocked' && missing.issues.some((issue) => issue.code === 'owner_decision_missing'), 'decision gate: 需要确认但未提供 Brief 时阻止开工');

    const pendingBrief = writeOwnerDecisionBrief(pendingTmp, { status: 'awaiting_owner', withConfirmation: false });
    const pending = validateOwnerDecision({ cwd: pendingTmp, path: pendingBrief });
    assert(pending.status === 'blocked' && pending.issues.some((issue) => issue.code === 'status_not_confirmed'), 'decision validate: awaiting_owner 不能被视为确认');
    const misplacedBrief = join(pendingTmp, 'misplaced-decision.md');
    writeFileSync(misplacedBrief, readFileSync(pendingBrief, 'utf8'));
    const misplaced = validateOwnerDecision({ cwd: pendingTmp, path: misplacedBrief });
    assert(misplaced.status === 'blocked' && misplaced.issues.some((issue) => issue.code === 'brief_path_invalid'), 'decision validate: 仓库内但不在 decisions 目录的 Brief 被拒绝');
    const pendingPreflight = validateDeliveryPreflight({ cwd: pendingTmp, target: 'N1', taskId: 'N1.1', decisionPath: pendingBrief });
    assert(pendingPreflight.status === 'blocked' && pendingPreflight.issues.some((issue) => issue.code === 'decision_status_not_confirmed'), 'decision gate: pending Brief 仍阻止开工');

    writeDeliveryFixture(confirmedTmp, { ownerDecisionRequired: 'yes', ownerDecisionTypes: 'architecture' });
    const confirmedBrief = writeOwnerDecisionBrief(confirmedTmp);
    const confirmed = validateOwnerDecision({ cwd: confirmedTmp, path: confirmedBrief });
    assert(confirmed.status === 'pass' && confirmed.metadata['Decision ID'] === 'OD-TEST-001', 'decision validate: confirmed Brief 通过');
    const confirmedPreflight = validateDeliveryPreflight({ cwd: confirmedTmp, target: 'N1', taskId: 'N1.1', decisionPath: confirmedBrief });
    assert(confirmedPreflight.status === 'pass' && confirmedPreflight.decision?.metadata['Decision ID'] === 'OD-TEST-001', 'decision gate: 匹配的 confirmed Brief 允许开工');
    const confirmedTransition = validateDeliveryTransition({ cwd: confirmedTmp, target: 'N1', taskId: 'N1.1', toStatus: 'in_progress', decisionPath: confirmedBrief });
    assert(confirmedTransition.status === 'pass', 'decision gate: 任务迁移复用 confirmed Brief 检查');
    const confirmedCli = spawnSync(process.execPath, [cli, 'decision', 'validate', confirmedBrief], { cwd: confirmedTmp, encoding: 'utf8' });
    assert(confirmedCli.status === 0 && confirmedCli.stdout.includes('decision validate: pass'), 'decision cli: 输出确认结论');

    writeDeliveryFixture(mismatchTmp, { ownerDecisionRequired: 'yes', ownerDecisionTypes: 'architecture' });
    writeFileSync(join(mismatchTmp, 'roadmap.md'), `${readFileSync(join(mismatchTmp, 'roadmap.md'), 'utf8')}\n| N2 | done | Other fixture module | C1 | A4 | 无 |`);
    const mismatchBrief = writeOwnerDecisionBrief(mismatchTmp, { targetModule: 'N2' });
    const mismatch = validateDeliveryPreflight({ cwd: mismatchTmp, target: 'N1', taskId: 'N1.1', decisionPath: mismatchBrief });
    assert(mismatch.status === 'blocked' && mismatch.issues.some((issue) => issue.code === 'decision_target_mismatch'), 'decision gate: 其他模块的确认不能借用');

    writeDeliveryFixture(lowRiskTmp);
    const lowRisk = validateDeliveryPreflight({ cwd: lowRiskTmp, target: 'N1', taskId: 'N1.1' });
    assert(lowRisk.status === 'pass', 'decision gate: Owner Decision Required no 的低风险任务不被阻断');
    const parsed = parseFeatureTasks('### N8.2.1 three-level task\n- **状态**：planned\n');
    assert(parsed[0]?.id === 'N8.2.1', 'planning: 支持 N8.2.1 三级任务编号');
  } finally {
    rmSync(pendingTmp, { recursive: true, force: true });
    rmSync(confirmedTmp, { recursive: true, force: true });
    rmSync(mismatchTmp, { recursive: true, force: true });
    rmSync(lowRiskTmp, { recursive: true, force: true });
  }
}

console.log('\n[N8.1 Project Preset Lifecycle]');
{
  const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
  const validTmp = mkdtempSync(join(tmpdir(), 'cct-project-preset-valid-'));
  const absentTmp = mkdtempSync(join(tmpdir(), 'cct-project-preset-absent-'));
  const missingRuleTmp = mkdtempSync(join(tmpdir(), 'cct-project-preset-missing-rule-'));
  const emptySpecsTmp = mkdtempSync(join(tmpdir(), 'cct-project-preset-empty-specs-'));
  const forbiddenTmp = mkdtempSync(join(tmpdir(), 'cct-project-preset-forbidden-'));
  const pendingTmp = mkdtempSync(join(tmpdir(), 'cct-project-preset-pending-'));
  const feedbackAwaitingTmp = mkdtempSync(join(tmpdir(), 'cct-project-preset-feedback-awaiting-'));
  const feedbackConfirmedTmp = mkdtempSync(join(tmpdir(), 'cct-project-preset-feedback-confirmed-'));
  const feedbackInvalidTmp = mkdtempSync(join(tmpdir(), 'cct-project-preset-feedback-invalid-'));
  try {
    writeProjectPresetFixture(validTmp);
    const valid = validateProjectPreset({ cwd: validTmp });
    assert(valid.status === 'pass' && valid.issues.length === 0, 'project-preset validate: 完整 preset 通过');
    const context = getProjectPresetContext({ cwd: validTmp });
    assert(
      context.status === 'pass' && context.loadable && context.files[0] === 'project-preset/PRESET.md' && context.files.includes('project-preset/rules/project.md'),
      'project-preset context: 返回稳定加载顺序'
    );
    const validCli = spawnSync(process.execPath, [cli, 'project-preset', 'context', '--json'], { cwd: validTmp, encoding: 'utf8' });
    const validCliResult = JSON.parse(validCli.stdout);
    assert(validCli.status === 0 && validCliResult.loadable === true, 'project-preset cli: context JSON 可被自动化读取');

    const absent = validateProjectPreset({ cwd: absentTmp });
    assert(absent.status === 'absent' && absent.issues.length === 0, 'project-preset validate: 缺失 preset 明确降级而非阻塞');

    writeProjectPresetFixture(emptySpecsTmp, { specs: [] });
    const emptySpecs = validateProjectPreset({ cwd: emptySpecsTmp });
    assert(emptySpecs.status === 'pass' && !emptySpecs.files.some((file) => file.startsWith('project-preset/specs/')), 'project-preset validate: 空 specs 数组仍是有效的最小 preset');

    writeProjectPresetFixture(missingRuleTmp);
    rmSync(join(missingRuleTmp, 'project-preset', 'rules', 'testing.md'));
    const missingRule = validateProjectPreset({ cwd: missingRuleTmp });
    assert(
      missingRule.status === 'needs_revision' && missingRule.issues.some((issue) => issue.code === 'manifest_reference_missing'),
      'project-preset validate: 拒绝 manifest 指向不存在的 rule'
    );

    writeProjectPresetFixture(forbiddenTmp, { forbiddenDir: '.agents' });
    const forbidden = validateProjectPreset({ cwd: forbiddenTmp });
    assert(
      forbidden.status === 'needs_revision' && forbidden.issues.some((issue) => issue.code === 'forbidden_directory'),
      'project-preset validate: 拒绝覆盖边界内的嵌套配置目录'
    );

    writeProjectPresetFixture(pendingTmp, { curationResult: '需修订' });
    const pending = validateProjectPreset({ cwd: pendingTmp });
    assert(
      pending.status === 'needs_revision' && pending.issues.some((issue) => issue.code === 'curation_not_approved'),
      'project-preset validate: 未通过 curator 审查时不可加载'
    );

    writeProjectPresetFixture(feedbackAwaitingTmp);
    const awaitingProposal = writeProjectPresetFeedbackProposal(feedbackAwaitingTmp);
    const beforeAwaiting = readFileSync(join(feedbackAwaitingTmp, 'project-preset', 'rules', 'testing.md'), 'utf8');
    const awaiting = validateProjectPresetFeedback({ cwd: feedbackAwaitingTmp, path: awaitingProposal });
    const afterAwaiting = readFileSync(join(feedbackAwaitingTmp, 'project-preset', 'rules', 'testing.md'), 'utf8');
    assert(
      awaiting.status === 'needs_confirmation' && awaiting.issues.length === 0 && beforeAwaiting === afterAwaiting,
      'project-preset feedback: 候选修改结构完整但未确认时零写入'
    );
    const awaitingCli = spawnSync(process.execPath, [cli, 'project-preset', 'feedback', 'validate', awaitingProposal], { cwd: feedbackAwaitingTmp, encoding: 'utf8' });
    assert(
      awaitingCli.status === 1 && awaitingCli.stdout.includes('project-preset feedback validate: needs_confirmation'),
      'project-preset feedback cli: 未确认候选不得放行'
    );

    writeProjectPresetFixture(feedbackConfirmedTmp);
    const confirmedProposal = writeProjectPresetFeedbackProposal(feedbackConfirmedTmp, { status: 'confirmed', confirmed: true });
    const confirmedFeedback = validateProjectPresetFeedback({ cwd: feedbackConfirmedTmp, path: confirmedProposal });
    assert(
      confirmedFeedback.status === 'pass' && confirmedFeedback.targetFiles.includes('project-preset/rules/testing.md'),
      'project-preset feedback: Owner 确认后候选修改可作为更新门禁'
    );
    const confirmedCli = spawnSync(process.execPath, [cli, 'project-preset', 'feedback', 'validate', confirmedProposal, '--json'], { cwd: feedbackConfirmedTmp, encoding: 'utf8' });
    const confirmedCliResult = JSON.parse(confirmedCli.stdout);
    assert(
      confirmedCli.status === 0 && confirmedCliResult.status === 'pass',
      'project-preset feedback cli: 确认后返回可机器读取的 pass'
    );

    writeProjectPresetFixture(feedbackInvalidTmp);
    const invalidProposal = writeProjectPresetFeedbackProposal(feedbackInvalidTmp, { targetFiles: '.env' });
    const invalidFeedback = validateProjectPresetFeedback({ cwd: feedbackInvalidTmp, path: invalidProposal });
    assert(
      invalidFeedback.status === 'needs_revision' && invalidFeedback.issues.some((issue) => issue.code === 'target_file_invalid'),
      'project-preset feedback: 拒绝越出 project-profile/project-preset 的写入目标'
    );
  } finally {
    rmSync(validTmp, { recursive: true, force: true });
    rmSync(absentTmp, { recursive: true, force: true });
    rmSync(missingRuleTmp, { recursive: true, force: true });
    rmSync(emptySpecsTmp, { recursive: true, force: true });
    rmSync(forbiddenTmp, { recursive: true, force: true });
    rmSync(pendingTmp, { recursive: true, force: true });
    rmSync(feedbackAwaitingTmp, { recursive: true, force: true });
    rmSync(feedbackConfirmedTmp, { recursive: true, force: true });
    rmSync(feedbackInvalidTmp, { recursive: true, force: true });
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

// 旧项目 .preset 中的旧名也必须在 update 时保留 AI 预设叠加。
{
  const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
  const tmp = mkdtempSync(join(tmpdir(), 'cct-legacy-ai-update-'));
  try {
    const initialized = spawnSync(process.execPath, [cli, 'init', '--preset', 'ai-app'], { cwd: tmp, encoding: 'utf8' });
    writeFileSync(join(tmp, '.claude', '.preset'), 'ai-knowledge-base\n\n');
    const updated = spawnSync(process.execPath, [cli, 'update'], { cwd: tmp, encoding: 'utf8' });
    const ok = initialized.status === 0 && updated.status === 0 && existsSync(join(tmp, '.claude', 'skills', 'rag-pipeline', 'SKILL.md'));
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} legacy ai-knowledge-base update 保留 ai-app 预设叠加 (exit ${updated.status})`);
    ok ? passed++ : failed++;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
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
