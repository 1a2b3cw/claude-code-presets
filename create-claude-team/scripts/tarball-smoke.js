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
  const result = process.platform === 'win32'
    ? spawnSync([command, ...args].join(' '), { ...spawnOptions, shell: true })
    : spawnSync(command, args, spawnOptions);

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

  run('node', [cliPath, 'init', '--preset', 'base', '--dry-run'], { cwd: projectDir, capture: true });
  run('node', [cliPath, 'init', '--preset', 'base'], { cwd: projectDir, capture: true });
  run('node', [cliPath, 'validate'], { cwd: projectDir, capture: true });

  if (!existsSync(join(projectDir, '.claude', 'CLAUDE.md'))) {
    throw new Error('init did not create .claude/CLAUDE.md');
  }

  console.log('\nTarball install smoke passed.');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
