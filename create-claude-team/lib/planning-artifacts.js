import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROADMAP_STATUSES = new Set(['planned', 'in_progress', 'blocked', 'done', 'shipped']);
const TASK_STATUSES = new Set([
  'ready', 'needs_clarification', 'planned', 'in_progress', 'local_gate',
  'review_gate', 'release_gate', 'blocked', 'shipped', 'done',
]);

function normalize(value) {
  return String(value ?? '').trim().replace(/^`|`$/g, '');
}

function splitValues(value) {
  return normalize(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function expandModuleDependencies(value) {
  return splitValues(value).flatMap((item) => {
    const range = item.match(/^N(\d+)-N(\d+)$/);
    if (!range) return [item];
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (end < start) return [item];
    return Array.from({ length: end - start + 1 }, (_, index) => `N${start + index}`);
  });
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function parseTableRow(line) {
  return line.split('|').slice(1, -1).map((cell) => cell.trim());
}

function isSeparatorRow(line) {
  return /^\|?\s*:?-{3,}/.test(line.trim());
}

export function parseArtifactMetadata(markdown) {
  const metadata = {};
  for (const line of String(markdown ?? '').split(/\r?\n/)) {
    const match = line.match(/^>\s*([^：:]+)[：:]\s*(.+)$/);
    if (match) metadata[match[1].trim()] = normalize(match[2]);
  }
  return metadata;
}

export function parseRoadmapModules(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.includes('| 模块 ID |') && line.includes('| Capability ID |'));
  if (headerIndex < 0) return [];

  const headers = parseTableRow(lines[headerIndex]);
  const modules = [];
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim().startsWith('|')) break;
    if (isSeparatorRow(line)) continue;
    const cells = parseTableRow(line);
    if (cells.length !== headers.length) continue;
    const row = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex]]));
    if (/^N\d+$/.test(row['模块 ID'] ?? '')) modules.push(row);
  }
  return modules;
}

function parseIdsFromTable(markdown, columnName) {
  const lines = String(markdown ?? '').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes(`| ${columnName} |`)) continue;
    const headers = parseTableRow(lines[index]);
    const idIndex = headers.indexOf(columnName);
    if (idIndex < 0) continue;
    const ids = new Set();
    for (let rowIndex = index + 1; rowIndex < lines.length; rowIndex += 1) {
      const line = lines[rowIndex];
      if (!line.trim().startsWith('|')) break;
      if (isSeparatorRow(line)) continue;
      const cells = parseTableRow(line);
      if (cells[idIndex]) ids.add(cells[idIndex]);
    }
    return ids;
  }
  return new Set();
}

function parseTaskStatuses(markdown) {
  return [...String(markdown ?? '').matchAll(/- \*\*状态\*\*：([^\r\n]+)/g)]
    .map((match) => normalize(match[1]));
}

function parseTaskFields(markdown) {
  return Object.fromEntries(
    [...String(markdown ?? '').matchAll(/^- \*\*([^*]+)\*\*：([^\r\n]+)/gm)]
      .map((match) => [match[1].trim(), normalize(match[2])])
  );
}

export function parseFeatureTasks(markdown) {
  const tasks = [];
  const pattern = /^### (N\d+\.\d+) ([^\r\n]+)\r?\n([\s\S]*?)(?=^### N\d+\.\d+ |(?![\s\S]))/gm;
  for (const match of String(markdown ?? '').matchAll(pattern)) {
    const fields = parseTaskFields(match[3]);
    tasks.push({
      id: match[1],
      title: match[2].trim(),
      status: normalize(fields.状态),
      fields,
    });
  }
  return tasks;
}

function featureDirectories(cwd) {
  const root = join(cwd, '.claude', 'workspace', 'features');
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, path: join(root, entry.name) }));
}

function required(metadata, key, label, issues) {
  if (!metadata[key]) issues.push(`${label}: 缺少 ${key}`);
}

function validateReference(value, allowed, label, issues) {
  for (const id of splitValues(value)) {
    if (!allowed.has(id)) issues.push(`${label}: 未知引用 ${id}`);
  }
}

export function validatePlanningArtifacts({ cwd = process.cwd() } = {}) {
  const issues = [];
  const rootPaths = {
    brief: join(cwd, 'product-brief.md'),
    model: join(cwd, 'product-model.md'),
    architecture: join(cwd, 'architecture.md'),
    roadmap: join(cwd, 'roadmap.md'),
    contract: join(cwd, '.claude', 'workspace', 'planning', 'artifact-contract.md'),
  };
  const texts = Object.fromEntries(Object.entries(rootPaths).map(([key, path]) => [key, readText(path)]));
  for (const [key, text] of Object.entries(texts)) {
    if (text === null) issues.push(`缺少规划 artifact: ${relative(cwd, rootPaths[key]).replaceAll('\\', '/')}`);
  }
  if (issues.length > 0) return { valid: false, issues, modules: [], features: [] };

  const brief = parseArtifactMetadata(texts.brief);
  const model = parseArtifactMetadata(texts.model);
  const architecture = parseArtifactMetadata(texts.architecture);
  const roadmap = parseArtifactMetadata(texts.roadmap);
  const contract = parseArtifactMetadata(texts.contract);
  required(brief, 'Product Brief ID', 'product-brief.md', issues);
  required(model, 'Model ID', 'product-model.md', issues);
  required(architecture, 'Architecture ID', 'architecture.md', issues);
  required(roadmap, 'Roadmap ID', 'roadmap.md', issues);
  required(contract, 'Contract ID', 'artifact-contract.md', issues);

  if (model['Product Brief ID'] !== brief['Product Brief ID']) issues.push('product-model.md: Product Brief ID 与 product-brief.md 不一致');
  if (architecture['Product Brief ID'] !== brief['Product Brief ID']) issues.push('architecture.md: Product Brief ID 与 product-brief.md 不一致');
  if (architecture['Product Model ID'] !== model['Model ID']) issues.push('architecture.md: Product Model ID 与 product-model.md 不一致');
  for (const [key, expected] of [
    ['Product Brief ID', brief['Product Brief ID']],
    ['Product Model ID', model['Model ID']],
    ['Architecture ID', architecture['Architecture ID']],
  ]) {
    if (roadmap[key] !== expected) issues.push(`roadmap.md: ${key} 与上游 artifact 不一致`);
  }

  const capabilities = parseIdsFromTable(texts.model, 'Capability ID');
  const journeys = new Set([...String(texts.model).matchAll(/^### (J\d+)：/gm)].map((match) => match[1]));
  const components = parseIdsFromTable(texts.architecture, 'Architecture Component ID');
  const modules = parseRoadmapModules(texts.roadmap);
  const moduleIds = new Set(modules.map((module) => module['模块 ID']));
  if (modules.length === 0) issues.push('roadmap.md: 未找到 vNext 模块表');

  for (const module of modules) {
    const id = module['模块 ID'];
    if (!ROADMAP_STATUSES.has(module.状态)) issues.push(`roadmap.md ${id}: 非法模块状态 ${module.状态 || 'missing'}`);
    validateReference(module['Capability ID'], capabilities, `roadmap.md ${id} Capability ID`, issues);
    validateReference(module['Architecture Component ID'], components, `roadmap.md ${id} Architecture Component ID`, issues);
    for (const dependency of expandModuleDependencies(module.依赖).filter((item) => item !== '无')) {
      if (!moduleIds.has(dependency)) issues.push(`roadmap.md ${id}: 未知依赖 ${dependency}`);
    }
  }

  const features = featureDirectories(cwd).map(({ name, path }) => {
    const specPath = join(path, 'spec.md');
    const tasksPath = join(path, 'tasks.md');
    const specText = readText(specPath) ?? '';
    const tasksText = readText(tasksPath) ?? '';
    return {
      name,
      path,
      specPath,
      tasksPath,
      specText,
      tasksText,
      spec: parseArtifactMetadata(specText),
      tasks: parseArtifactMetadata(tasksText),
      taskStatuses: parseTaskStatuses(tasksText),
    };
  });

  for (const feature of features) {
    const label = `.claude/workspace/features/${feature.name}`;
    for (const key of [
      'Spec ID', 'Roadmap Module', 'Product Brief', 'Product Model', 'Capability ID', 'Journey ID',
      'Architecture', 'Architecture Component ID', 'Affected Components', 'Dependency Direction',
      'Security Impact', 'Operational Impact', '执行包',
    ]) required(feature.spec, key, `${label}/spec.md`, issues);
    for (const key of ['Task Set', 'Spec', 'Roadmap Module', '执行包']) required(feature.tasks, key, `${label}/tasks.md`, issues);

    const moduleId = normalize(feature.spec['Roadmap Module']).match(/^N\d+/)?.[0];
    const roadmapModule = modules.find((module) => module['模块 ID'] === moduleId);
    if (!roadmapModule) issues.push(`${label}/spec.md: Roadmap Module 不存在 (${feature.spec['Roadmap Module'] || 'missing'})`);
    if (feature.tasks['Roadmap Module'] !== moduleId) issues.push(`${label}/tasks.md: Roadmap Module 必须与 spec 一致`);
    if (feature.tasks.Spec !== 'spec.md') issues.push(`${label}/tasks.md: Spec 必须为 spec.md`);
    if (feature.spec['Product Brief'] !== 'product-brief.md') issues.push(`${label}/spec.md: Product Brief 必须引用 product-brief.md`);
    if (feature.spec['Product Model'] !== 'product-model.md') issues.push(`${label}/spec.md: Product Model 必须引用 product-model.md`);
    if (feature.spec.Architecture !== 'architecture.md') issues.push(`${label}/spec.md: Architecture 必须引用 architecture.md`);
    validateReference(feature.spec['Capability ID'], capabilities, `${label}/spec.md Capability ID`, issues);
    validateReference(feature.spec['Journey ID'], journeys, `${label}/spec.md Journey ID`, issues);
    validateReference(feature.spec['Architecture Component ID'], components, `${label}/spec.md Architecture Component ID`, issues);
    validateReference(feature.spec['Affected Components'], components, `${label}/spec.md Affected Components`, issues);
    if (roadmapModule && feature.spec['Capability ID'] !== roadmapModule['Capability ID']) issues.push(`${label}/spec.md: Capability ID 与 ${moduleId} 不一致`);
    if (roadmapModule && feature.spec['Architecture Component ID'] !== roadmapModule['Architecture Component ID']) issues.push(`${label}/spec.md: Architecture Component ID 与 ${moduleId} 不一致`);
    for (const status of feature.taskStatuses) {
      if (!TASK_STATUSES.has(status)) issues.push(`${label}/tasks.md: 非法 task 状态 ${status}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    modules,
    features,
    ids: { capabilities: [...capabilities], journeys: [...journeys], components: [...components] },
  };
}

export function formatPlanningValidation(result) {
  if (result.valid) {
    return `\nplanning artifact 校验通过\n  模块: ${result.modules.length}\n  feature packages: ${result.features.length}`;
  }
  return `\nplanning artifact 校验失败\n${result.issues.map((issue) => `  - ${issue}`).join('\n')}`;
}

export function readPlanningStatus({ cwd = process.cwd() } = {}) {
  const result = validatePlanningArtifacts({ cwd });
  if (result.modules.length === 0) {
    return { available: false, valid: false, issues: result.issues, modules: [], tasks: [] };
  }

  const activeModule = result.modules.find((module) => module.状态 === 'in_progress')
    ?? result.modules.find((module) => module.状态 === 'blocked')
    ?? result.modules.find((module) => module.状态 === 'planned')
    ?? result.modules.at(-1);
  const moduleId = activeModule?.['模块 ID'] ?? null;
  const feature = result.features.find((item) => normalize(item.spec['Roadmap Module']).match(/^N\d+/)?.[0] === moduleId) ?? null;
  const taskText = feature ? readText(feature.tasksPath) : null;
  const tasks = parseFeatureTasks(taskText);
  const nextTask = tasks.find((task) => ['in_progress', 'ready', 'planned', 'local_gate', 'review_gate'].includes(task.status))
    ?? (activeModule ? { id: moduleId, title: activeModule.模块, status: activeModule.状态 } : null);

  return {
    available: true,
    valid: result.valid,
    issues: result.issues,
    modules: result.modules,
    activeModule: activeModule ? {
      id: moduleId,
      title: activeModule.模块,
      status: activeModule.状态,
      capabilityId: activeModule['Capability ID'],
      architectureComponentId: activeModule['Architecture Component ID'],
    } : null,
    feature: feature ? {
      path: relative(cwd, feature.path).replaceAll('\\', '/'),
      tasksPath: relative(cwd, feature.tasksPath).replaceAll('\\', '/'),
      taskSet: feature.tasks['Task Set'] ?? null,
    } : null,
    tasks,
    nextTask,
  };
}
