#!/usr/bin/env node
/**
 * Tarball install smoke test.
 *
 * Packs this package, installs the tarball into a temporary project, then
 * verifies the installed CLI can dry-run, initialize, and validate.
 */

import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(scriptDir, '..');

function run(command, args, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  console.log(`\n$ ${[command, ...args].join(' ')}  (${cwd})`);
  const spawnOptions = {
    cwd,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  };
  const resolved = resolveCommand(command);
  const result = spawnSync(resolved.command, [...resolved.args, ...args], spawnOptions);

  if (result.status !== 0) {
    if (options.capture) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    const detail = result.error ? `: ${result.error.message}` : '';
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}${detail}`);
  }

  return result.stdout ?? '';
}

function resolveCommand(command) {
  if (process.platform !== 'win32') {
    return { command, args: [] };
  }

  if (command === 'node') {
    return { command: process.execPath, args: [] };
  }

  if (command === 'npm') {
    return { command: process.execPath, args: [findNpmCli()] };
  }

  return { command, args: [] };
}

function findNpmCli() {
  const candidates = [
    process.env.npm_execpath,
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].filter(Boolean);

  const npmCli = candidates.find((candidate) => existsSync(candidate));
  if (!npmCli) {
    throw new Error('unable to locate npm CLI for Windows tarball smoke test');
  }

  return npmCli;
}

function parsePackJson(stdout) {
  const match = stdout.match(/(\[\s*\{[\s\S]*\}\s*\]\s*)$/);
  const jsonText = match ? match[1] : stdout;
  const parsed = JSON.parse(jsonText);
  const firstPack = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!firstPack?.filename) {
    throw new Error('npm pack JSON output did not include a filename');
  }
  return firstPack;
}

const tempRoot = mkdtempSync(join(tmpdir(), 'cct-tarball-'));
const packDir = join(tempRoot, 'pack');
const projectDir = join(tempRoot, 'project');
mkdirSync(packDir);
mkdirSync(projectDir);

try {
  const packOutput = run('npm', ['pack', '--json', '--pack-destination', packDir], {
    cwd: packageDir,
    capture: true,
  });
  const pack = parsePackJson(packOutput);
  const tarballPath = join(packDir, pack.filename);
  if (!existsSync(tarballPath)) {
    throw new Error(`packed tarball was not created: ${tarballPath}`);
  }

  run('npm', ['init', '-y'], { cwd: projectDir, capture: true });
  run('npm', ['install', tarballPath, '--ignore-scripts'], { cwd: projectDir, capture: true });

  const cliPath = join(projectDir, 'node_modules', 'create-claude-team', 'cli.js');
  if (!existsSync(cliPath)) {
    throw new Error(`installed CLI not found: ${cliPath}`);
  }

  const helpOutput = run('node', [cliPath, '--help'], { cwd: projectDir, capture: true });
  if (!helpOutput.includes('operations validate') || !helpOutput.includes('project-preset context')) {
    throw new Error('installed CLI help is missing a required validation command');
  }

  run('node', [cliPath, 'init', '--preset', 'base', '--dry-run'], { cwd: projectDir, capture: true });
  run('node', [cliPath, 'init', '--preset', 'base'], { cwd: projectDir, capture: true });
  run('node', [cliPath, 'validate'], { cwd: projectDir, capture: true });
  const projectPresetValidate = run('node', [cliPath, 'project-preset', 'validate'], { cwd: projectDir, capture: true });
  if (!projectPresetValidate.includes('project-preset validate: absent')) {
    throw new Error('installed CLI did not report the expected project-preset fallback state');
  }
  const projectPresetContext = JSON.parse(run('node', [cliPath, 'project-preset', 'context', '--json'], { cwd: projectDir, capture: true }));
  if (projectPresetContext.status !== 'absent' || projectPresetContext.loadable !== false) {
    throw new Error('installed CLI project-preset context did not preserve the fallback contract');
  }

  if (!existsSync(join(projectDir, '.claude', 'CLAUDE.md'))) {
    throw new Error('init did not create .claude/CLAUDE.md');
  }

  console.log('\nTarball install smoke passed.');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
