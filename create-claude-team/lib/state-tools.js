import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative } from 'node:path';

const VALID_EVENT_STATUS = new Set(['completed', 'failed', 'blocked', 'skipped']);
const METRIC_FIELDS = [
  'specRejectCount',
  'checkIssueCount',
  'checkFixRounds',
  'reviewRejectCount',
  'testFailureCount',
];

function repoPath(cwd, artifactPath) {
  return join(cwd, artifactPath);
}

function workspaceDir(cwd) {
  return join(cwd, '.claude', 'workspace');
}

function eventPath(cwd) {
  return join(workspaceDir(cwd), 'events.jsonl');
}

function metricsPath(cwd) {
  return join(workspaceDir(cwd), 'metrics.md');
}

function rel(cwd, path) {
  return relative(cwd, path).replaceAll('\\', '/');
}

async function readTextIfExists(path) {
  if (!existsSync(path)) return null;
  return readFile(path, 'utf8');
}

function parseJsonLine(line, index) {
  try {
    return { event: JSON.parse(line) };
  } catch (err) {
    return { issue: `line ${index}: JSON 无效 (${err.message})` };
  }
}

function validateEvent(event, index, cwd) {
  const issues = [];

  for (const field of ['time', 'command', 'status', 'summary']) {
    if (event[field] === undefined || event[field] === null || event[field] === '') {
      issues.push(`line ${index}: 缺少必填字段 ${field}`);
    }
  }

  if (event.time && Number.isNaN(Date.parse(event.time))) {
    issues.push(`line ${index}: time 不是可解析的 ISO 时间`);
  }

  if (event.status && !VALID_EVENT_STATUS.has(event.status)) {
    issues.push(`line ${index}: status 无效 (${event.status})`);
  }

  if (event.artifacts !== undefined && !Array.isArray(event.artifacts)) {
    issues.push(`line ${index}: artifacts 必须是数组`);
  }

  for (const artifact of event.artifacts ?? []) {
    if (typeof artifact !== 'string' || artifact.trim() === '') {
      issues.push(`line ${index}: artifact 必须是非空字符串`);
      continue;
    }
    if (isAbsolute(artifact)) {
      issues.push(`line ${index}: artifact 必须使用仓库相对路径 (${artifact})`);
      continue;
    }
    if (!existsSync(repoPath(cwd, artifact))) {
      issues.push(`line ${index}: artifact 不存在 (${artifact})`);
    }
  }

  return issues;
}

export async function readEvents({ cwd = process.cwd() } = {}) {
  const path = eventPath(cwd);
  if (!existsSync(path)) {
    return { path, events: [], issues: [`缺少 ${rel(cwd, path)}`] };
  }

  const text = await readFile(path, 'utf8');
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const events = [];
  const issues = [];

  lines.forEach((line, offset) => {
    const index = offset + 1;
    const parsed = parseJsonLine(line, index);
    if (parsed.issue) {
      issues.push(parsed.issue);
      return;
    }
    events.push(parsed.event);
    issues.push(...validateEvent(parsed.event, index, cwd));
  });

  return { path, events, issues };
}

function latestEvent(events) {
  return [...events].sort((a, b) => Date.parse(b.time ?? 0) - Date.parse(a.time ?? 0))[0] ?? null;
}

async function readCurrentMain(cwd) {
  const tasksText = await readTextIfExists(join(cwd, 'docs', 'maturity-tasks.md'));
  if (!tasksText) return null;
  const match = tasksText.match(/## 当前主线\s+([\s\S]*?)(?=\n#{2,3} |\n---|$)/);
  return match?.[1]?.trim().split(/\r?\n/).find((line) => line.trim())?.trim() ?? null;
}

async function readNextPlannedTask(cwd) {
  const tasksText = await readTextIfExists(join(cwd, 'docs', 'maturity-tasks.md'));
  if (!tasksText) return null;
  const sections = [...tasksText.matchAll(/### (M\d+\.\d+) ([^\n]+)\n\n- \*\*状态\*\*：([^\n]+)/g)];
  const planned = sections.find((section) => section[3].trim() === 'planned');
  if (!planned) return null;
  return {
    id: planned[1],
    title: planned[2].replaceAll('`', '').trim(),
    status: planned[3].trim(),
  };
}

function countDirEntries(path) {
  if (!existsSync(path)) return 0;
  return 1;
}

export async function buildStatus({ cwd = process.cwd() } = {}) {
  const { path, events, issues } = await readEvents({ cwd });
  const latest = latestEvent(events);
  const metrics = metricsPath(cwd);
  const journal = join(workspaceDir(cwd), 'journal.md');
  const currentMain = await readCurrentMain(cwd);
  const nextPlannedTask = await readNextPlannedTask(cwd);

  return {
    cwd,
    currentMain,
    nextPlannedTask,
    latestEvent: latest ? {
      time: latest.time,
      command: latest.command,
      task: latest.task ?? null,
      status: latest.status,
      summary: latest.summary,
      next: latest.next ?? null,
    } : null,
    workspace: {
      events: {
        path: rel(cwd, path),
        exists: existsSync(path),
        count: events.length,
        validation: issues.length === 0 ? 'pass' : 'fail',
        issueCount: issues.length,
      },
      metrics: {
        path: rel(cwd, metrics),
        exists: existsSync(metrics),
      },
      journal: {
        path: rel(cwd, journal),
        exists: existsSync(journal),
      },
      reviews: {
        path: '.claude/workspace/reviews',
        exists: countDirEntries(join(workspaceDir(cwd), 'reviews')) > 0,
      },
    },
  };
}

export async function printStatus({ cwd = process.cwd(), json = false } = {}) {
  const status = await buildStatus({ cwd });
  if (json) {
    console.log(JSON.stringify(status, null, 2));
    return status;
  }

  console.log('\n项目状态');
  console.log(`  当前主线: ${status.currentMain ?? '未找到'}`);
  console.log(`  下一任务: ${status.nextPlannedTask ? `${status.nextPlannedTask.id} ${status.nextPlannedTask.title}` : '未找到 planned 任务'}`);
  console.log(`  最近事件: ${status.latestEvent ? `${status.latestEvent.command} ${status.latestEvent.task ?? ''} (${status.latestEvent.status})` : '无'}`);
  if (status.latestEvent?.summary) console.log(`  摘要: ${status.latestEvent.summary}`);
  if (status.latestEvent?.next) console.log(`  建议: ${status.latestEvent.next}`);
  console.log(`  events: ${status.workspace.events.validation} (${status.workspace.events.count} 条, ${status.workspace.events.issueCount} 个问题)`);
  console.log(`  metrics: ${status.workspace.metrics.exists ? 'found' : 'missing'}`);
  console.log(`  journal: ${status.workspace.journal.exists ? 'found' : 'missing'}`);
  console.log('');
  return status;
}

export async function validateEvents({ cwd = process.cwd() } = {}) {
  const { path, events, issues } = await readEvents({ cwd });
  if (issues.length > 0) {
    console.error('\nevents 校验失败');
    console.error(`  文件: ${rel(cwd, path)}`);
    for (const issue of issues) console.error(`  - ${issue}`);
    throw new Error(`events 校验发现 ${issues.length} 个问题`);
  }

  console.log('\nevents 校验通过');
  console.log(`  文件: ${rel(cwd, path)}`);
  console.log(`  事件: ${events.length} 条`);
  console.log(`  最近: ${latestEvent(events)?.summary ?? '无'}`);
  return { events, issues };
}

function metricValue(event, field) {
  const value = event[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function average(events, field) {
  if (events.length === 0) return null;
  const total = events.reduce((sum, event) => sum + metricValue(event, field), 0);
  return total / events.length;
}

function statusForAverage(field, value) {
  if (value === null) return '-';
  if (field === 'specRejectCount') return value >= 3 ? 'warning' : 'healthy';
  if (field === 'checkIssueCount') return value >= 5 ? 'warning' : 'healthy';
  if (field === 'checkFixRounds') return value >= 2 ? 'warning' : 'healthy';
  if (field === 'reviewRejectCount') return value >= 1 ? 'warning' : 'healthy';
  if (field === 'testFailureCount') return value >= 1 ? 'warning' : 'healthy';
  return 'healthy';
}

function formatNumber(value) {
  if (value === null) return '-';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function metricsMarkdown(events) {
  const taskEvents = events.filter((event) => event.command !== '/standup').slice(-10);
  const latest = latestEvent(events);
  const rows = METRIC_FIELDS.map((field) => {
    const value = average(taskEvents, field);
    return `| ${field} | ${formatNumber(value)} | ${statusForAverage(field, value)} |`;
  }).join('\n');
  const failureEvents = taskEvents.filter((event) => event.failureRecovery);
  const failures = failureEvents.length === 0
    ? '- 无'
    : failureEvents.map((event) => `- ${event.time} ${event.failureRecovery.failureType}: ${event.failureRecovery.finalStatus}`).join('\n');

  return `# 团队效能指标

> 由 \`create-claude-team metrics update\` 从 \`.claude/workspace/events.jsonl\` 聚合生成。
> events.jsonl 是机器事实来源；本文件是人类可读摘要。

---

## 摘要

- 事件总数：${events.length}
- 最近事件：${latest?.summary ?? '无'}
- 最近 10 条非 standup 事件：${taskEvents.length}

## 最近 10 次任务

| 指标 | 平均值 | 状态 |
|------|--------|------|
${rows}

## 失败恢复

${failures}

## 原始数据

- 来源：\`.claude/workspace/events.jsonl\`
- 生成时间：${new Date().toISOString()}
`;
}

export async function updateMetrics({ cwd = process.cwd(), dryRun = false } = {}) {
  const { events, issues } = await readEvents({ cwd });
  if (issues.length > 0) {
    throw new Error(`events 校验未通过，先运行 events validate 修复 ${issues.length} 个问题`);
  }

  const output = metricsMarkdown(events);
  const path = metricsPath(cwd);
  if (dryRun) {
    console.log(output);
    return { path, written: false };
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, output, 'utf8');
  console.log('\nmetrics 已更新');
  console.log(`  文件: ${rel(cwd, path)}`);
  console.log(`  事件: ${events.length} 条`);
  console.log(`  最近: ${basename(events.at(-1)?.taskId ?? events.at(-1)?.task ?? 'none')}`);
  return { path, written: true };
}
