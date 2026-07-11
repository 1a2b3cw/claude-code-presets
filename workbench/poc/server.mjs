#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStatus, readEvents } from '../../create-claude-team/lib/state-tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const port = Number(process.env.WORKBENCH_PORT || 4185);
const host = '127.0.0.1';

const artifactPaths = {
  roadmap: 'docs/maturity-roadmap.md',
  fallbackRoadmap: 'docs/productivity-roadmap.md',
  tasks: 'docs/maturity-tasks.md',
  fallbackTasks: 'docs/productivity-tasks.md',
  events: '.claude/workspace/events.jsonl',
  reviews: '.claude/workspace/reviews',
  releases: '.claude/workspace/releases',
  legacyReleases: 'workspace/releases',
  cleanup: '.claude/workspace/cleanup',
  dogfood: '.claude/workspace/dogfood.md',
  legacyDogfood: 'workspace/dogfood.md',
};

async function readText(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) return '';
  return readFile(absolutePath, 'utf8');
}

async function readLatestMarkdownReport(relativeDir) {
  const absoluteDir = resolve(repoRoot, relativeDir);
  if (!existsSync(absoluteDir)) {
    return { found: false, path: relativeDir, text: '', updatedAt: null };
  }

  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const markdownFiles = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const relativePath = `${relativeDir}/${entry.name}`.replaceAll('\\', '/');
    const fileStat = await stat(resolve(repoRoot, relativePath));
    markdownFiles.push({ relativePath, mtimeMs: fileStat.mtimeMs });
  }

  markdownFiles.sort((a, b) => b.mtimeMs - a.mtimeMs || b.relativePath.localeCompare(a.relativePath));
  const latest = markdownFiles[0];
  if (!latest) return { found: false, path: relativeDir, text: '', updatedAt: null };

  return {
    found: true,
    path: latest.relativePath,
    text: await readText(latest.relativePath),
    updatedAt: new Date(latest.mtimeMs).toISOString(),
  };
}

async function readLatestMarkdownReportFromDirs(relativeDirs) {
  const reports = await Promise.all(relativeDirs.map((relativeDir) => readLatestMarkdownReport(relativeDir)));
  const found = reports
    .filter((report) => report.found)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  return found[0] || reports[0];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parsePhaseTasks(markdown, phaseId) {
  const phasePattern = new RegExp(`## Phase ${phaseId}[\\s\\S]*?(?=\\n## Phase |$)`);
  const phaseMatch = markdown.match(phasePattern);
  const phaseText = phaseMatch ? phaseMatch[0] : markdown;
  const taskPattern = new RegExp(`### (${phaseId}\\.\\d+) ([^\\n]+)\\n([\\s\\S]*?)(?=\\n### ${phaseId}\\.|\\n## Phase |$)`, 'g');
  const tasks = [];

  for (const match of phaseText.matchAll(taskPattern)) {
    const [, id, title, body] = match;
    const acceptanceMatch = body.match(/- \*\*验收标准\*\*：\n([\s\S]*?)(?=\n- \*\*|\n### |\n---|$)/);
    const acceptance = acceptanceMatch
      ? acceptanceMatch[1].split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      : [];

    tasks.push({
      id,
      title: title.trim(),
      status: body.match(/- \*\*状态\*\*：([^\n]+)/)?.[1]?.trim() || 'unknown',
      priority: body.match(/- \*\*优先级\*\*：([^\n]+)/)?.[1]?.trim() || '',
      goal: body.match(/- \*\*目标\*\*：([^\n]+)/)?.[1]?.trim() || '',
      acceptance,
      phaseId,
    });
  }

  return tasks;
}

function parseTaskSet(maturityTasksText, productivityTasksText, status) {
  const currentPhase = status.currentMain?.match(/Phase\s+(M\d+)/)?.[1] || 'M6';
  const currentTasks = parsePhaseTasks(maturityTasksText, currentPhase);
  if (currentTasks.length) {
    return {
      label: `成熟化 ${currentPhase}`,
      description: status.currentMain || '当前成熟化主线',
      tasks: currentTasks,
      source: artifactPaths.tasks,
    };
  }

  return {
    label: 'Productivity Phase 5',
    description: 'Workbench MVP',
    tasks: parsePhaseTasks(productivityTasksText, 'T5'),
    source: artifactPaths.fallbackTasks,
  };
}

function parseEvents(jsonl) {
  return jsonl
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')));
}

function parseRoadmapSummary(maturityRoadmapText, productivityRoadmapText) {
  const sourceText = maturityRoadmapText || productivityRoadmapText;
  const title = maturityRoadmapText ? 'AI 开发交付框架成熟化' : 'AI 开发交付自动化';
  const match = sourceText.match(/## 一句话定位\n\n([\s\S]*?)(?=\n## |$)/);
  const summary = match?.[1]
    ?.split(/\r?\n/)
    .map((line) => line.trim().replace(/^> /, ''))
    .filter(Boolean)
    .join(' ');

  return {
    title,
    summary: summary || '本地 artifact 驱动的 AI 软件交付驾驶舱。',
    source: maturityRoadmapText ? artifactPaths.roadmap : artifactPaths.fallbackRoadmap,
  };
}

function isCompletedStatus(status) {
  return ['completed', 'done', 'shipped'].includes(String(status || '').trim());
}

function chooseFocusTask(tasks) {
  const preferred = ['in_progress', 'ready', 'planned'];
  return tasks.find((task) => preferred.includes(task.status)) ||
    tasks.find((task) => !isCompletedStatus(task.status)) ||
    null;
}

function parseCount(text, names) {
  for (const name of names) {
    const patterns = [
      new RegExp(`${name}\\s*[:：]\\s*(\\d+)`, 'i'),
      new RegExp(`${name}\\s*\\|\\s*(\\d+)`, 'i'),
      new RegExp(`\\|\\s*${name}\\s*\\|\\s*(\\d+)\\s*\\|`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
  }
  return 0;
}

function parseReviewReport(report) {
  if (!report.found) {
    return {
      found: false,
      path: report.path,
      conclusion: '无审查报告',
      critical: 0,
      major: 0,
      minor: 0,
      suggestion: 0,
      risk: '没有审查证据',
    };
  }

  const text = report.text;
  const conclusion = text.match(/## 结论：([^\n]+)/)?.[1]?.trim() ||
    text.match(/结论：`?([^`\n。]+)`?/)?.[1]?.trim() ||
    text.match(/review\s*[:：]\s*([^\n|]+)/i)?.[1]?.trim() ||
    '已记录';
  const risk = text.match(/## 剩余风险\n\n([\s\S]*?)(?=\n## |$)/)?.[1]
    ?.split(/\r?\n/)
    .map((line) => line.trim().replace(/^- /, ''))
    .filter(Boolean)
    .slice(0, 2)
    .join(' ') || '未记录剩余风险';

  return {
    found: true,
    path: report.path,
    conclusion,
    critical: parseCount(text, ['critical']),
    major: parseCount(text, ['major']),
    minor: parseCount(text, ['minor']),
    suggestion: parseCount(text, ['suggestion']),
    risk,
  };
}

function parseReleaseReport(report) {
  if (!report.found) {
    return {
      found: false,
      path: report.path,
      conclusion: '无发布报告',
      blockers: 0,
      warnings: 0,
      rollback: '未记录',
      risk: '没有发布证据',
      needsConfirmation: false,
    };
  }

  const text = report.text;
  const conclusion = text.match(/## 发布结论：([^\n]+)/)?.[1]?.trim() ||
    text.match(/release\s*[:：]\s*([^\n|]+)/i)?.[1]?.trim() ||
    '已记录';
  const risk = text.match(/## 风险\n\n([\s\S]*?)(?=\n## |$)/)?.[1]
    ?.split(/\r?\n/)
    .map((line) => line.trim().replace(/^- /, ''))
    .filter(Boolean)
    .slice(0, 2)
    .join(' ') || '未记录发布风险';
  const rollback = text.match(/rollback\s*[:：]\s*([^\n|]+)/i)?.[1]?.trim() ||
    (text.includes('## 回滚步骤') ? '已记录' : '未记录');

  return {
    found: true,
    path: report.path,
    conclusion,
    blockers: parseCount(text, ['blockers']),
    warnings: parseCount(text, ['warnings']),
    rollback,
    risk,
    needsConfirmation: /confirmation needed|等待用户确认|用户确认|needs_confirmation/i.test(text),
  };
}

function parseCleanupReport(report) {
  if (!report.found) {
    return {
      found: false,
      path: report.path,
      conclusion: '无 cleanup 报告',
      suggestions: ['当前没有 Delivery Steward cleanup 建议。'],
    };
  }

  const section = (title) => report.text.match(new RegExp(`## ${title}\\n\\n([\\s\\S]*?)(?=\\n## |$)`))?.[1]?.trim() || '';
  const conclusion = section('结论').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0];
  const nextAction = section('下一步').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0];
  const decisionText = section('需要 Owner 决策');
  const decisionLine = decisionText.match(/\*\*要决定什么：\*\*\s*([^\n]+)/)?.[1]?.trim();
  const suggestionSource = [nextAction, decisionLine].filter(Boolean);
  const suggestions = suggestionSource.length ? suggestionSource : ['报告存在，但未解析到明确下一步。'];

  return {
    found: true,
    path: report.path,
    conclusion: conclusion || '已记录 cleanup 建议',
    suggestions,
  };
}

function eventKey(event, index) {
  return encodeURIComponent(String(event.time || `${event.command || 'event'}-${index}`));
}

function selectedIndex(items, key, getKey) {
  const found = items.findIndex((item, index) => getKey(item, index) === key);
  return found >= 0 ? found : 0;
}

async function loadWorkbenchData(requestUrl = '/') {
  const [
    maturityRoadmapText,
    productivityRoadmapText,
    maturityTasksText,
    productivityTasksText,
    reviewReport,
    releaseReport,
    cleanupReport,
    dogfoodText,
    legacyDogfoodText,
    status,
    eventsResult,
  ] = await Promise.all([
    readText(artifactPaths.roadmap),
    readText(artifactPaths.fallbackRoadmap),
    readText(artifactPaths.tasks),
    readText(artifactPaths.fallbackTasks),
    readLatestMarkdownReport(artifactPaths.reviews),
    readLatestMarkdownReportFromDirs([artifactPaths.releases, artifactPaths.legacyReleases]),
    readLatestMarkdownReport(artifactPaths.cleanup),
    readText(artifactPaths.dogfood),
    readText(artifactPaths.legacyDogfood),
    buildStatus({ cwd: repoRoot }),
    readEvents({ cwd: repoRoot }),
  ]);

  const url = new URL(requestUrl, `http://${host}:${port}`);
  const taskSet = parseTaskSet(maturityTasksText, productivityTasksText, status);
  const tasks = taskSet.tasks;
  const events = eventsResult.events.sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')));
  const focusTask = chooseFocusTask(tasks);
  const blockedTasks = tasks.filter((task) => task.status === 'blocked');
  const completedTasks = tasks.filter((task) => isCompletedStatus(task.status));
  const allTasksDone = tasks.length > 0 && tasks.every((task) => isCompletedStatus(task.status));
  const selectedTaskKey = url.searchParams.get('task');
  const selectedTask = selectedTaskKey
    ? tasks.find((task) => task.id === selectedTaskKey) || focusTask || tasks[0] || null
    : focusTask || tasks[0] || null;
  const selectedEventIndex = selectedIndex(events, url.searchParams.get('run'), eventKey);

  return {
    roadmap: parseRoadmapSummary(maturityRoadmapText, productivityRoadmapText),
    taskSet,
    tasks,
    events,
    latestEvent: events[0] || null,
    selectedEvent: events[selectedEventIndex] || null,
    selectedEventIndex,
    selectedTask,
    focusTask,
    blockedTasks,
    completedTasks,
    allTasksDone,
    review: parseReviewReport(reviewReport),
    release: parseReleaseReport(releaseReport),
    cleanup: parseCleanupReport(cleanupReport),
    dogfoodStarted: Boolean(dogfoodText.trim() || legacyDogfoodText.trim()),
    status,
    eventsValidation: eventsResult.issues.length === 0 ? 'pass' : 'fail',
    eventsIssues: eventsResult.issues,
    sources: artifactPaths,
  };
}

function statusTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (['done', 'completed', 'shipped', 'pass', '通过'].some((part) => normalized.includes(part))) return 'pass';
  if (['blocked', 'failed', 'critical', 'major'].some((part) => normalized.includes(part))) return 'blocked';
  if (['todo', 'planned', 'warning', 'watch', 'needs_confirmation'].some((part) => normalized.includes(part))) return 'watch';
  return 'info';
}

function shortDate(value) {
  if (!value) return '无时间';
  return String(value).replace('T', ' ').replace('Z', '');
}

function summarizeChecks(event) {
  const checks = event?.checks && typeof event.checks === 'object' ? event.checks : {};
  const entries = Object.entries(checks);
  if (!entries.length) return '无检查记录';
  return entries.slice(0, 5).map(([name, result]) => `${name}: ${String(result)}`).join(' / ');
}

function buildNextAction(data) {
  if (data.blockedTasks.length) {
    return {
      title: `解除 ${data.blockedTasks[0].id} 阻塞`,
      detail: data.blockedTasks[0].title,
      command: '$team-command-fix',
      tone: 'blocked',
      source: data.taskSet.source,
    };
  }

  if (data.release.blockers > 0) {
    return {
      title: '修复发布阻塞',
      detail: data.release.risk,
      command: '$team-command-fix release gate',
      tone: 'blocked',
      source: data.release.path,
    };
  }

  if (data.review.critical > 0 || data.review.major > 0) {
    return {
      title: '修复审查问题',
      detail: data.review.risk,
      command: '$team-command-fix review findings',
      tone: 'blocked',
      source: data.review.path,
    };
  }

  if (data.focusTask) {
    return {
      title: `继续 ${data.focusTask.id}`,
      detail: data.focusTask.title,
      command: `$team-command-dev ${data.focusTask.id}`,
      tone: 'info',
      source: data.taskSet.source,
    };
  }

  if (data.allTasksDone && data.release.needsConfirmation) {
    return {
      title: '确认发布动作',
      detail: '合并、创建 tag 或发布 npm',
      command: '$team-command-ship',
      tone: 'watch',
      source: data.release.path,
    };
  }

  if (data.allTasksDone) {
    return {
      title: '进入下一轮',
      detail: 'dogfood、复盘或规划下一轮 roadmap',
      command: '$team-command-standup',
      tone: 'pass',
      source: data.taskSet.source,
    };
  }

  return {
    title: '刷新项目状态',
    detail: '补齐 tasks/events 后重新查看',
    command: '$team-command-standup',
    tone: 'watch',
    source: data.sources.events,
  };
}

function renderTaskList(data) {
  if (!data.tasks.length) return '<div class="empty">没有任务数据</div>';

  return data.tasks.map((task) => {
    const active = data.selectedTask?.id === task.id;
    return `
      <a class="task-item ${active ? 'active' : ''}" href="?task=${encodeURIComponent(task.id)}#task-panel">
        <span>
          <strong>${escapeHtml(task.id)}</strong>
          <small>${escapeHtml(task.title)}</small>
        </span>
        <em class="${statusTone(task.status)}">${escapeHtml(task.status)}</em>
      </a>
    `;
  }).join('');
}

function renderRunList(data) {
  if (!data.events.length) return '<div class="empty">没有运行记录</div>';

  return data.events.slice(0, 8).map((event, index) => {
    const active = index === data.selectedEventIndex;
    return `
      <a class="run-item ${active ? 'active' : ''}" href="?run=${eventKey(event, index)}#run-panel">
        <span>
          <strong>${escapeHtml(event.command || 'event')} ${escapeHtml(event.taskId || event.task || '')}</strong>
          <small>${escapeHtml(event.summary || '无摘要')}</small>
        </span>
        <em class="${statusTone(event.status)}">${escapeHtml(event.status || 'unknown')}</em>
      </a>
    `;
  }).join('');
}

function renderChecks(checks) {
  const entries = checks && typeof checks === 'object' ? Object.entries(checks) : [];
  if (!entries.length) return '<div class="empty">没有检查记录</div>';
  return entries.map(([name, result]) => `
    <div class="kv"><span>${escapeHtml(name)}</span><strong>${escapeHtml(String(result))}</strong></div>
  `).join('');
}

function renderArtifacts(artifacts) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    return '<div class="empty">没有证据文件</div>';
  }
  return artifacts.map((artifact) => `
    <div class="kv"><span>artifact</span><strong>${escapeHtml(artifact)}</strong></div>
  `).join('');
}

function renderFailureRecovery(failureRecovery) {
  if (!failureRecovery || typeof failureRecovery !== 'object') {
    return '<div class="empty">没有失败恢复记录</div>';
  }

  return `
    <div class="kv"><span>type</span><strong>${escapeHtml(failureRecovery.failureType || 'unknown')}</strong></div>
    <div class="kv"><span>root cause</span><strong>${escapeHtml(failureRecovery.rootCause || 'unknown')}</strong></div>
    <div class="kv"><span>action</span><strong>${escapeHtml(failureRecovery.recoveryAction || '未记录')}</strong></div>
    <div class="kv"><span>final</span><strong>${escapeHtml(failureRecovery.finalStatus || 'unknown')}</strong></div>
  `;
}

function renderDashboard(data) {
  const nextAction = buildNextAction(data);
  const completion = data.tasks.length ? Math.round((data.completedTasks.length / data.tasks.length) * 100) : 0;
  const selectedTask = data.selectedTask;
  const selectedEvent = data.selectedEvent;
  const focusTitle = data.allTasksDone ? '全部完成' : (data.focusTask?.id || '无焦点');
  const focusDetail = data.allTasksDone ? '当前任务集已闭环' : (data.focusTask?.title || '没有可执行任务');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>项目驾驶舱</title>
  <link rel="icon" href="data:,">
  <style>
    :root {
      --bg: #f5f7fa;
      --surface: #ffffff;
      --soft: #eef2f6;
      --border: #d7dde6;
      --text: #172033;
      --muted: #647287;
      --blue: #255fa8;
      --blue-soft: #e8f1ff;
      --green: #20734a;
      --green-soft: #e8f5ee;
      --amber: #83570d;
      --amber-soft: #fff3d5;
      --red: #a23b3b;
      --red-soft: #fae8e8;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 18px 24px;
      position: sticky;
      top: 0;
      z-index: 3;
    }
    header h1 { margin: 0; font-size: 22px; }
    header p { margin: 4px 0 0; color: var(--muted); }
    main {
      width: min(1220px, 100%);
      margin: 0 auto;
      padding: 22px 24px 32px;
      display: grid;
      gap: 16px;
    }
    a { color: inherit; text-decoration: none; }
    button, .button {
      min-height: 36px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--text);
      padding: 7px 11px;
      cursor: pointer;
      transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
      font: inherit;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    button:hover, .button:hover { background: var(--blue-soft); border-color: var(--blue); }
    button:active, .button:active { transform: translateY(1px); }
    .primary {
      background: var(--blue);
      border-color: var(--blue);
      color: #ffffff;
      font-weight: 700;
    }
    .primary:hover { background: #1f5394; color: #ffffff; }
    .layout {
      display: grid;
      grid-template-columns: 250px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    .rail {
      position: sticky;
      top: 82px;
      display: grid;
      gap: 8px;
    }
    .rail a {
      min-height: 38px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      padding: 8px 10px;
      color: var(--muted);
    }
    .rail a:hover { border-color: var(--blue); background: var(--blue-soft); color: var(--text); }
    .section { display: grid; gap: 12px; margin-bottom: 16px; }
    .section h2 { margin: 0; font-size: 18px; }
    .hero, .panel, .card, .task-item, .run-item {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .hero {
      padding: 18px;
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
      gap: 16px;
    }
    .hero h2 { margin: 0 0 8px; font-size: 24px; }
    .hero p, .panel p, .card p { margin: 0; color: var(--muted); }
    .action-box {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      background: #fbfcfe;
      display: grid;
      gap: 10px;
    }
    .action-box strong { font-size: 20px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .card, .panel { padding: 14px; }
    .card h3 { margin: 0; font-size: 13px; color: var(--muted); }
    .card strong { display: block; margin-top: 8px; font-size: 22px; overflow-wrap: anywhere; }
    .card p { margin-top: 6px; font-size: 13px; }
    .pass { color: var(--green); background: var(--green-soft); }
    .watch { color: var(--amber); background: var(--amber-soft); }
    .blocked { color: var(--red); background: var(--red-soft); }
    .info { color: var(--blue); background: var(--blue-soft); }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 12px;
      font-weight: 700;
      width: fit-content;
    }
    .split {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
      gap: 12px;
    }
    .task-list, .run-list { display: grid; gap: 8px; }
    .task-item, .run-item {
      padding: 10px;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      align-items: flex-start;
      transition: background 0.18s ease, border-color 0.18s ease;
    }
    .task-item:hover, .run-item:hover, .task-item.active, .run-item.active {
      border-color: var(--blue);
      background: var(--blue-soft);
    }
    .task-item span, .run-item span { min-width: 0; }
    .task-item strong, .run-item strong { display: block; }
    .task-item small, .run-item small {
      display: block;
      color: var(--muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 520px;
    }
    .task-item em, .run-item em {
      font-style: normal;
      border-radius: 999px;
      padding: 3px 8px;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 700;
    }
    .progress {
      height: 10px;
      background: var(--soft);
      border-radius: 999px;
      overflow: hidden;
      margin: 10px 0 4px;
    }
    .progress span {
      display: block;
      height: 100%;
      width: ${completion}%;
      background: var(--blue);
    }
    .kv {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px solid var(--border);
      padding: 9px 0;
      color: var(--muted);
      font-size: 13px;
    }
    .kv:first-child { border-top: 0; }
    .kv strong {
      color: var(--text);
      text-align: right;
      overflow-wrap: anywhere;
    }
    .empty {
      border: 1px dashed #aeb8c8;
      border-radius: 8px;
      padding: 16px;
      color: var(--muted);
      background: var(--surface);
    }
    .toast {
      position: fixed;
      right: 18px;
      bottom: 18px;
      background: #172033;
      color: #ffffff;
      border-radius: 8px;
      padding: 10px 12px;
      opacity: 0;
      transform: translateY(8px);
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: 10;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    @media (max-width: 920px) {
      header { padding: 16px; }
      main { padding: 16px; }
      .layout, .hero, .grid, .split { grid-template-columns: 1fr; }
      .rail { position: static; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .task-item small, .run-item small { max-width: 260px; }
    }
    @media (max-width: 520px) {
      .rail { grid-template-columns: 1fr; }
      .actions { display: grid; }
      .kv { flex-direction: column; }
      .kv strong { text-align: left; }
      .task-item, .run-item { flex-direction: column; }
      .task-item small, .run-item small { max-width: 100%; white-space: normal; }
    }
  </style>
</head>
<body>
  <header>
    <h1>项目驾驶舱</h1>
    <p>${escapeHtml(data.taskSet.label)} · ${escapeHtml(data.roadmap.title)}</p>
  </header>

  <main>
    <div class="layout">
      <nav class="rail" aria-label="Workbench sections">
        <a href="#today">今日 <span>${escapeHtml(focusTitle)}</span></a>
        <a href="#tasks">任务 <span>${data.completedTasks.length}/${data.tasks.length}</span></a>
        <a href="#runs">运行 <span>${data.events.length}</span></a>
        <a href="#evidence">证据 <span>${data.release.blockers} 阻塞</span></a>
        <a href="#cleanup">清理 <span>${data.cleanup.found ? '有报告' : '无报告'}</span></a>
      </nav>

      <div>
        <section id="today" class="section">
          <div class="hero">
            <div>
              <h2>${escapeHtml(focusTitle)}</h2>
              <p>${escapeHtml(focusDetail)}</p>
              <div class="progress"><span></span></div>
              <p>${completion}% · ${data.completedTasks.length}/${data.tasks.length} done</p>
            </div>
            <div class="action-box ${nextAction.tone}">
              <span class="pill ${nextAction.tone}">下一步</span>
              <strong>${escapeHtml(nextAction.title)}</strong>
              <p>${escapeHtml(nextAction.detail)}</p>
              <div class="actions">
                <button class="primary" type="button" data-copy="${escapeHtml(nextAction.command)}">复制命令</button>
                <a class="button" href="#evidence">查看证据</a>
                <a class="button" href="#tasks">查看任务</a>
              </div>
            </div>
          </div>

          <div class="grid">
            <article class="card">
              <h3>阻塞</h3>
              <strong>${data.blockedTasks.length}</strong>
              <p>${escapeHtml(data.blockedTasks[0]?.title || '无')}</p>
            </article>
            <article class="card">
              <h3>审查</h3>
              <strong>${escapeHtml(data.review.conclusion)}</strong>
              <p>${data.review.critical} critical / ${data.review.major} major</p>
            </article>
            <article class="card">
              <h3>发布</h3>
              <strong>${escapeHtml(data.release.conclusion)}</strong>
              <p>${data.release.blockers} blockers / ${data.release.warnings} warnings</p>
            </article>
            <article class="card">
              <h3>最近运行</h3>
              <strong>${escapeHtml(data.latestEvent?.status || '无')}</strong>
              <p>${escapeHtml(data.latestEvent?.taskId || data.latestEvent?.task || data.latestEvent?.command || '无记录')}</p>
            </article>
            <article class="card">
              <h3>状态源</h3>
              <strong>${escapeHtml(data.eventsValidation)}</strong>
              <p>${data.status.workspace.events.count} events / ${data.eventsIssues.length} issues</p>
            </article>
          </div>
        </section>

        <section id="tasks" class="section">
          <h2>任务</h2>
          <div class="split">
            <div class="task-list">${renderTaskList(data)}</div>
            <div id="task-panel" class="panel">
              <span class="pill ${statusTone(selectedTask?.status)}">${escapeHtml(data.allTasksDone ? 'all-done' : (selectedTask?.status || 'unknown'))}</span>
              <h2>${escapeHtml(data.allTasksDone ? '当前任务集已完成' : `${selectedTask?.id || 'No task'} ${selectedTask?.title || ''}`)}</h2>
              <p>${escapeHtml(data.allTasksDone ? '发布确认、dogfood、复盘或下一轮 roadmap 是当前出口。' : (selectedTask?.goal || '无目标记录'))}</p>
              <div class="kv"><span>优先级</span><strong>${escapeHtml(selectedTask?.priority || '未记录')}</strong></div>
              <div class="kv"><span>验收</span><strong>${escapeHtml(selectedTask?.acceptance?.[0] || '未记录')}</strong></div>
              <div class="kv"><span>来源</span><strong>${escapeHtml(data.taskSet.source)}</strong></div>
              <div class="actions" style="margin-top:12px">
                <button type="button" data-copy="${escapeHtml(selectedTask ? `$team-command-dev ${selectedTask.id}` : nextAction.command)}">复制任务命令</button>
                <a class="button" href="#runs">查看运行</a>
              </div>
            </div>
          </div>
        </section>

        <section id="runs" class="section">
          <h2>运行</h2>
          <div class="split">
            <div class="run-list">${renderRunList(data)}</div>
            <div id="run-panel" class="panel">
              ${selectedEvent ? `
                <span class="pill ${statusTone(selectedEvent.status)}">${escapeHtml(selectedEvent.status || 'unknown')}</span>
                <h2>${escapeHtml(selectedEvent.command || 'event')} ${escapeHtml(selectedEvent.taskId || selectedEvent.task || '')}</h2>
                <p>${escapeHtml(selectedEvent.summary || '无摘要')}</p>
                <div class="kv"><span>时间</span><strong>${escapeHtml(shortDate(selectedEvent.time))}</strong></div>
                <div class="kv"><span>下一步</span><strong>${escapeHtml(selectedEvent.next || '未记录')}</strong></div>
                <h2 style="margin-top:16px">检查</h2>
                ${renderChecks(selectedEvent.checks)}
              ` : '<div class="empty">没有选中的运行记录</div>'}
            </div>
          </div>
        </section>

        <section id="evidence" class="section">
          <h2>证据</h2>
          <div class="split">
            <div class="panel">
              <h2>报告</h2>
              <div class="kv"><span>review</span><strong>${escapeHtml(data.review.path)}</strong></div>
              <div class="kv"><span>review risk</span><strong>${escapeHtml(data.review.risk)}</strong></div>
              <div class="kv"><span>release</span><strong>${escapeHtml(data.release.path)}</strong></div>
              <div class="kv"><span>release risk</span><strong>${escapeHtml(data.release.risk)}</strong></div>
              <div class="kv"><span>rollback</span><strong>${escapeHtml(data.release.rollback)}</strong></div>
            </div>
            <div class="panel">
              <h2>运行证据</h2>
              ${selectedEvent ? renderArtifacts(selectedEvent.artifacts) : '<div class="empty">没有运行证据</div>'}
              <h2 style="margin-top:16px">恢复</h2>
              ${selectedEvent ? renderFailureRecovery(selectedEvent.failureRecovery) : '<div class="empty">没有恢复记录</div>'}
            </div>
          </div>
        </section>

        <section id="cleanup" class="section">
          <h2>Artifact Cleanup</h2>
          <div class="panel">
            <span class="pill ${data.cleanup.found ? 'watch' : 'info'}">${escapeHtml(data.cleanup.conclusion)}</span>
            <div class="kv"><span>报告</span><strong>${escapeHtml(data.cleanup.path)}</strong></div>
            ${data.cleanup.suggestions.map((item) => `
              <div class="kv"><span>建议</span><strong>${escapeHtml(item)}</strong></div>
            `).join('')}
          </div>
        </section>

        <section id="sources" class="section">
          <h2>来源</h2>
          <div class="panel">
            <div class="kv"><span>roadmap</span><strong>${escapeHtml(data.roadmap.source)}</strong></div>
            <div class="kv"><span>tasks</span><strong>${escapeHtml(data.taskSet.source)}</strong></div>
            <div class="kv"><span>events</span><strong>${escapeHtml(data.sources.events)}</strong></div>
            <div class="kv"><span>status</span><strong>${escapeHtml(data.status.workspace.events.validation)} via create-claude-team state tools</strong></div>
            <div class="kv"><span>cleanup</span><strong>${escapeHtml(data.sources.cleanup)}</strong></div>
            <div class="kv"><span>dogfood</span><strong>${escapeHtml(data.sources.dogfood)}</strong></div>
          </div>
        </section>
      </div>
    </div>
  </main>

  <div id="toast" class="toast" role="status" aria-live="polite">已复制</div>

  <script>
    const toast = document.getElementById('toast');
    function showToast(text) {
      toast.textContent = text;
      toast.classList.add('show');
      window.setTimeout(() => toast.classList.remove('show'), 1400);
    }
    document.querySelectorAll('[data-copy]').forEach((button) => {
      button.addEventListener('click', async () => {
        const value = button.getAttribute('data-copy') || '';
        try {
          await navigator.clipboard.writeText(value);
          showToast('已复制：' + value);
        } catch {
          showToast(value);
        }
      });
    });
  </script>
</body>
</html>`;
}

async function handleRequest(request, response) {
  try {
    const data = await loadWorkbenchData(request.url);
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(renderDashboard(data));
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.stack : String(error));
  }
}

async function runCheck() {
  const data = await loadWorkbenchData();
  const html = renderDashboard(data);
  const result = {
    taskSet: data.taskSet.label,
    taskCount: data.tasks.length,
    eventCount: data.events.length,
    focusTask: data.focusTask?.id || null,
    allTasksDone: data.allTasksDone,
    reviewFound: data.review.found,
    releaseFound: data.release.found,
    cleanupFound: data.cleanup.found,
    currentMain: data.status.currentMain,
    nextPlannedTask: data.status.nextPlannedTask?.id || null,
    eventsValidation: data.eventsValidation,
    hasToday: html.includes('id="today"'),
    hasTasks: html.includes('id="tasks"'),
    hasRuns: html.includes('id="runs"'),
    hasEvidence: html.includes('id="evidence"'),
    hasCleanup: html.includes('id="cleanup"'),
    hasCopyAction: html.includes('data-copy='),
    hasChineseShell: html.includes('项目驾驶舱') && html.includes('下一步'),
  };

  const ok = result.taskCount >= 1
    && result.currentMain
    && result.eventsValidation === 'pass'
    && result.hasToday
    && result.hasTasks
    && result.hasRuns
    && result.hasEvidence
    && result.hasCleanup
    && result.hasCopyAction
    && result.hasChineseShell
    && data.selectedEvent !== null
    && (!result.allTasksDone || result.focusTask === null);
  console.log(JSON.stringify(result, null, 2));
  if (!ok) process.exit(1);
}

if (process.argv.includes('--check')) {
  await runCheck();
} else {
  createServer(handleRequest).listen(port, host, () => {
    console.log(`Workbench running at http://${host}:${port}`);
  });
}
