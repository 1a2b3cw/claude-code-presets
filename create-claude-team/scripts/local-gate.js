#!/usr/bin/env node
/**
 * Local release gate.
 *
 * Runs the same checks expected before publishing and verifies that the npm
 * package includes the files needed by the CLI at install time.
 */

import { spawnSync } from 'node:child_process';

const REQUIRED_PACK_FILES = [
  'cli.js',
  'lib/init.js',
  'lib/update.js',
  'lib/validate.js',
  'lib/delivery-control.js',
  'lib/change-impact.js',
  'lib/operational-readiness.js',
  '.claude/CLAUDE.md',
  '.claude/commands/dev.md',
  '.claude/hooks/security-check.mjs',
  '.claude/hooks/bash-check.mjs',
  'presets/base/preset.json',
  'presets/mobile-app/preset.json',
];

function run(command, args, options = {}) {
  console.log(`\n$ ${[command, ...args].join(' ')}`);
  const spawnOptions = {
    cwd: options.cwd ?? process.cwd(),
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
  try {
    const match = stdout.match(/(\[\s*\{[\s\S]*\}\s*\]\s*)$/);
    const jsonText = match ? match[1] : stdout;
    const parsed = JSON.parse(jsonText);
    const firstPack = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!firstPack?.files || !Array.isArray(firstPack.files)) {
      throw new Error('missing files array');
    }
    return firstPack;
  } catch (err) {
    throw new Error(`unable to parse npm pack JSON output: ${err.message}`);
  }
}

function verifyPackFiles(pack) {
  const packedFiles = new Set(pack.files.map((file) => file.path));
  const missing = REQUIRED_PACK_FILES.filter((file) => !packedFiles.has(file));

  if (missing.length > 0) {
    throw new Error(`npm pack dry-run is missing required files: ${missing.join(', ')}`);
  }

  console.log(`\nPack dry-run OK: ${pack.files.length} files, ${pack.filename}`);
}

try {
  run('npm', ['run', 'validate']);
  run('npm', ['test']);
  const packOutput = run('npm', ['pack', '--dry-run', '--json'], { capture: true });
  const pack = parsePackJson(packOutput);
  verifyPackFiles(pack);
  console.log('\nLocal gate passed.');
} catch (err) {
  console.error(`\nLocal gate failed: ${err.message}`);
  process.exit(1);
}
