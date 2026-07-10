#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const port = Number(process.env.WORKBENCH_PORT || 4185);
const host = '127.0.0.1';

const artifactPaths = {
  roadmap: 'docs/productivity-roadmap.md',
  tasks: 'docs/productivity-tasks.md',
  events: '.claude/workspace/events.jsonl',
};

async function readText(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) return '';
  return readFile(absolutePath, 'utf8');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parsePhase5Tasks(markdown) {
  const phaseMatch = markdown.match(/## Phase 5[\s\S]*?(?=\n## Phase 6|$)/);
  const phaseText = phaseMatch ? phaseMatch[0] : markdown;
  const taskPattern = /### (T5\.\d+) ([^\n]+)\n([\s\S]*?)(?=\n### T5\.|\n## Phase 6|$)/g;
  const tasks = [];

  for (const match of phaseText.matchAll(taskPattern)) {
    const [, id, title, body] = match;
    const status = body.match(/- \*\*状态\*\*：([^\n]+)/)?.[1]?.trim() || 'unknown';
    const goal = body.match(/- \*\*目标\*\*：([^\n]+)/)?.[1]?.trim() || '';
    const prompt = body.match(/```text\n([\s\S]*?)\n```/)?.[1]?.trim() || '';
    tasks.push({ id, title: title.trim(), status, goal, prompt });
  }

  return tasks;
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

function parseRoadmapPhase(markdown) {
  const match = markdown.match(/## 阶段 5：轻量工作台 MVP\n\n([\s\S]*?)(?=\n## 阶段 6|$)/);
  if (!match) {
    return {
      title: 'Phase 5 Workbench MVP',
      summary: '把状态、任务、run、standup、metrics 变成可看的工作台。',
    };
  }

  const text = match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('|'))
    .slice(0, 4)
    .join(' ');

  return {
    title: 'Phase 5 Workbench MVP',
    summary: text || '把 Markdown/CLI 状态变成每天可看的项目工作台。',
  };
}

function chooseFocusTask(tasks) {
  return tasks.find((task) => task.status !== 'done') || tasks.at(-1) || null;
}

function summarizeChecks(event) {
  const checks = event?.checks && typeof event.checks === 'object' ? event.checks : {};
  const entries = Object.entries(checks);
  if (!entries.length) return 'no checks recorded';
  return entries.map(([name, result]) => `${name}: ${result}`).join(' / ');
}

async function loadWorkbenchData() {
  const [roadmapText, tasksText, eventsText] = await Promise.all([
    readText(artifactPaths.roadmap),
    readText(artifactPaths.tasks),
    readText(artifactPaths.events),
  ]);

  const tasks = parsePhase5Tasks(tasksText);
  const events = parseEvents(eventsText);
  const latestEvent = events[0] || null;
  const focusTask = chooseFocusTask(tasks);
  const blockedTasks = tasks.filter((task) => task.status === 'blocked');
  const completedTasks = tasks.filter((task) => task.status === 'done');
  const roadmap = parseRoadmapPhase(roadmapText);

  return {
    roadmap,
    tasks,
    events,
    latestEvent,
    focusTask,
    blockedTasks,
    completedTasks,
    sources: artifactPaths,
  };
}

function statusClass(status) {
  if (status === 'done' || status === 'completed' || status === 'shipped') return 'pass';
  if (status === 'blocked' || status === 'failed') return 'blocked';
  if (status === 'todo' || status === 'planned') return 'watch';
  return 'info';
}

function renderTaskRows(tasks) {
  return tasks.map((task) => `
    <article class="row">
      <div class="row-head">
        <div>
          <h3>${escapeHtml(task.id)} ${escapeHtml(task.title)}</h3>
          <p>${escapeHtml(task.goal || 'No goal recorded')}</p>
        </div>
        <span class="badge ${statusClass(task.status)}">${escapeHtml(task.status)}</span>
      </div>
    </article>
  `).join('');
}

function renderEventRows(events) {
  if (!events.length) {
    return '<div class="empty">No events recorded yet.</div>';
  }

  return events.slice(0, 5).map((event) => `
    <article class="row">
      <div class="row-head">
        <div>
          <h3>${escapeHtml(event.command || 'event')} ${escapeHtml(event.task || '')}</h3>
          <p>${escapeHtml(event.summary || 'No summary')}</p>
        </div>
        <span class="badge ${statusClass(event.status)}">${escapeHtml(event.status || 'unknown')}</span>
      </div>
      <p class="meta">${escapeHtml(event.time || 'no time')} · ${escapeHtml(summarizeChecks(event))}</p>
    </article>
  `).join('');
}

function renderWorkbench(data) {
  const focus = data.focusTask;
  const latest = data.latestEvent;
  const nextAction = focus
    ? `继续 ${focus.id}：${focus.title}`
    : (latest?.next || '等待新的任务');
  const completion = data.tasks.length
    ? Math.round((data.completedTasks.length / data.tasks.length) * 100)
    : 0;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Workbench PoC</title>
  <link rel="icon" href="data:,">
  <style>
    :root {
      --bg: #f7f8fa;
      --surface: #ffffff;
      --soft: #eef2f7;
      --border: #d9dee7;
      --text: #172033;
      --muted: #5f6f86;
      --blue: #2764b8;
      --blue-soft: #e8f1ff;
      --green: #207a4c;
      --green-soft: #e6f4ed;
      --amber: #8b5c10;
      --amber-soft: #fff4d6;
      --red: #a43c3c;
      --red-soft: #faeaea;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    header {
      background: #ffffff;
      border-bottom: 1px solid var(--border);
      padding: 18px 24px;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    header h1 { margin: 0; font-size: 22px; }
    header p { margin: 4px 0 0; color: var(--muted); }
    main {
      width: min(1180px, 100%);
      margin: 0 auto;
      padding: 24px;
      display: grid;
      gap: 18px;
    }
    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tabs a {
      min-height: 34px;
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #ffffff;
      color: var(--text);
      padding: 6px 10px;
      text-decoration: none;
      transition: background 0.18s ease, border-color 0.18s ease;
    }
    .tabs a:hover { background: var(--blue-soft); border-color: var(--blue); }
    .section {
      display: grid;
      gap: 12px;
    }
    .section h2 { margin: 0; font-size: 18px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .panel,
    .metric,
    .row {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .panel { padding: 16px; }
    .metric {
      min-height: 110px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .metric h3 { margin: 0; font-size: 13px; color: var(--muted); }
    .metric strong { font-size: 25px; }
    .metric p,
    .panel p,
    .row p { margin: 0; color: var(--muted); }
    .hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .hero h2 { font-size: 24px; margin-bottom: 8px; }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .badge.pass { color: var(--green); background: var(--green-soft); }
    .badge.watch { color: var(--amber); background: var(--amber-soft); }
    .badge.blocked { color: var(--red); background: var(--red-soft); }
    .badge.info { color: var(--blue); background: var(--blue-soft); }
    .list {
      display: grid;
      gap: 10px;
    }
    .row {
      padding: 12px;
      display: grid;
      gap: 6px;
    }
    .row-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .row h3 { margin: 0 0 4px; font-size: 14px; }
    .meta { font-size: 12px; }
    .focus-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
      gap: 14px;
    }
    .artifact {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-top: 8px;
      color: var(--muted);
      font-size: 12px;
    }
    .progress {
      height: 10px;
      background: var(--soft);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 10px;
    }
    .progress span {
      display: block;
      height: 100%;
      width: ${completion}%;
      background: var(--blue);
    }
    .empty {
      border: 1px dashed #aeb8c8;
      border-radius: 8px;
      padding: 18px;
      color: var(--muted);
      background: #ffffff;
    }
    @media (max-width: 860px) {
      header { padding: 16px; }
      main { padding: 18px 16px 28px; }
      .grid,
      .focus-layout { grid-template-columns: 1fr; }
      .hero,
      .row-head { flex-direction: column; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Workbench PoC</h1>
    <p>读取本地 artifact，展示 Today 和 Task Focus 两个真实数据视图。</p>
  </header>
  <main>
    <nav class="tabs" aria-label="Workbench PoC views">
      <a href="#today">Today</a>
      <a href="#task-focus">Task Focus</a>
      <a href="#sources">Sources</a>
    </nav>

    <section id="today" class="section">
      <div class="panel hero">
        <div>
          <h2>${escapeHtml(data.roadmap.title)}</h2>
          <p>${escapeHtml(data.roadmap.summary)}</p>
        </div>
        <span class="badge info">local artifacts</span>
      </div>

      <div class="grid">
        <article class="metric">
          <h3>Focus</h3>
          <strong>${escapeHtml(focus?.id || 'none')}</strong>
          <p>${escapeHtml(focus?.title || 'No active task')}</p>
        </article>
        <article class="metric">
          <h3>Blocked</h3>
          <strong>${data.blockedTasks.length}</strong>
          <p>Phase 5 tasks</p>
        </article>
        <article class="metric">
          <h3>Progress</h3>
          <strong>${completion}%</strong>
          <p>${data.completedTasks.length}/${data.tasks.length} done</p>
        </article>
        <article class="metric">
          <h3>Latest run</h3>
          <strong>${escapeHtml(latest?.status || 'none')}</strong>
          <p>${escapeHtml(latest?.task || latest?.command || 'No event')}</p>
        </article>
      </div>

      <div class="focus-layout">
        <div class="panel">
          <h2>Next Best Action</h2>
          <p>${escapeHtml(nextAction)}</p>
          <div class="artifact"><span>reason</span><strong>${escapeHtml(focus ? `status: ${focus.status}` : 'from latest event')}</strong></div>
          <div class="artifact"><span>source</span><strong>${escapeHtml(data.sources.tasks)}</strong></div>
        </div>
        <div class="panel">
          <h2>Recent runs</h2>
          <div class="list">${renderEventRows(data.events)}</div>
        </div>
      </div>
    </section>

    <section id="task-focus" class="section">
      <h2>Task Focus</h2>
      <div class="focus-layout">
        <div class="panel">
          <h2>${escapeHtml(focus?.id || 'No task')} ${escapeHtml(focus?.title || '')}</h2>
          <p>${escapeHtml(focus?.goal || 'No active Phase 5 task found.')}</p>
          <div class="artifact"><span>status</span><strong>${escapeHtml(focus?.status || 'unknown')}</strong></div>
          <div class="artifact"><span>acceptance source</span><strong>${escapeHtml(data.sources.tasks)}</strong></div>
          <div class="artifact"><span>run command</span><strong>node workbench/poc/server.mjs</strong></div>
        </div>
        <div class="panel">
          <h2>Phase 5 task queue</h2>
          <div class="progress"><span></span></div>
          <div class="list" style="margin-top: 12px">${renderTaskRows(data.tasks)}</div>
        </div>
      </div>
    </section>

    <section id="sources" class="section">
      <h2>Sources</h2>
      <div class="panel">
        <div class="artifact"><span>roadmap</span><strong>${escapeHtml(data.sources.roadmap)}</strong></div>
        <div class="artifact"><span>tasks</span><strong>${escapeHtml(data.sources.tasks)}</strong></div>
        <div class="artifact"><span>events</span><strong>${escapeHtml(data.sources.events)}</strong></div>
      </div>
    </section>
  </main>
</body>
</html>`;
}

async function handleRequest(_request, response) {
  try {
    const data = await loadWorkbenchData();
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(renderWorkbench(data));
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.stack : String(error));
  }
}

async function runCheck() {
  const data = await loadWorkbenchData();
  const html = renderWorkbench(data);
  const result = {
    phase5TaskCount: data.tasks.length,
    eventCount: data.events.length,
    focusTask: data.focusTask?.id || null,
    hasToday: html.includes('id="today"'),
    hasTaskFocus: html.includes('id="task-focus"'),
    sources: data.sources,
  };

  const ok = result.phase5TaskCount >= 3 && result.hasToday && result.hasTaskFocus;
  console.log(JSON.stringify(result, null, 2));
  if (!ok) process.exit(1);
}

if (process.argv.includes('--check')) {
  await runCheck();
} else {
  createServer(handleRequest).listen(port, host, () => {
    console.log(`Workbench PoC running at http://${host}:${port}`);
  });
}
