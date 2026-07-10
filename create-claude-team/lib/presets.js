import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findSourceDir } from './copy.js';

export const PRESET_ALIASES = { 'ai-knowledge-base': 'ai-app' };

export function readPresetCatalog(sourceDir = findSourceDir()) {
  const presetsDir = join(sourceDir, 'presets');
  if (!existsSync(presetsDir)) return [];

  return readdirSync(presetsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readPresetManifest(sourceDir, entry.name))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
}

export function readPresetManifest(sourceDir, name) {
  const manifestPath = join(sourceDir, 'presets', name, 'preset.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`找不到预设 manifest: presets/${name}/preset.json`);
  }
  return { ...JSON.parse(readFileSync(manifestPath, 'utf8')), dirName: name };
}

export function resolvePresetName(name) {
  return PRESET_ALIASES[name] ?? name;
}

export function getDefaultPreset(catalog) {
  return catalog.find((preset) => preset.default)?.name ?? catalog[0]?.name ?? 'web-fullstack';
}

export function getAvailableLanguages(catalog) {
  return [...new Set(catalog.flatMap((preset) => Object.keys(preset.languages ?? {})))];
}

export function getDefaultLanguage(manifest) {
  const entries = Object.entries(manifest.languages ?? {});
  if (entries.length === 0) return null;
  return entries.find(([, config]) => config.default)?.[0] ?? entries[0][0];
}

export function getNextSteps(manifest, lang) {
  return manifest.languages?.[lang]?.nextSteps ?? manifest.nextSteps ?? [];
}

export function validatePresetManifest(manifest) {
  const issues = [];
  if (manifest.dirName && manifest.name !== manifest.dirName) {
    issues.push(`${manifest.dirName}: manifest name 应为 ${manifest.dirName}，实际为 ${manifest.name}`);
  }
  const required = ['name', 'displayName', 'help', 'description', 'skillCount'];
  for (const key of required) {
    if (manifest[key] === undefined || manifest[key] === '') {
      issues.push(`${manifest.name ?? '<unknown>'}: 缺少 ${key}`);
    }
  }
  if (!Number.isInteger(manifest.skillCount) || manifest.skillCount < 0) {
    issues.push(`${manifest.name}: skillCount 必须是非负整数`);
  }
  if (manifest.languages) {
    const defaults = Object.values(manifest.languages).filter((lang) => lang.default).length;
    if (defaults > 1) issues.push(`${manifest.name}: languages 只能有一个 default`);
  }
  return issues;
}
