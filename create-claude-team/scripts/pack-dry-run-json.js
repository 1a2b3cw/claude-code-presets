#!/usr/bin/env node
/**
 * Writes a clean npm pack dry-run JSON report.
 *
 * npm lifecycle logs can be mixed into stdout before the JSON payload, so this
 * script extracts the final JSON array and writes it to an artifact file.
 */

import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const outputPath = process.env.PACK_DRY_RUN_JSON || 'pack-dry-run.json';

function runPackDryRun() {
  const spawnOptions = {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  };
  const result = process.platform === 'win32'
    ? spawnSync('npm pack --dry-run --json', { ...spawnOptions, shell: true })
    : spawnSync('npm', ['pack', '--dry-run', '--json'], spawnOptions);

  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    const detail = result.error ? `: ${result.error.message}` : '';
    throw new Error(`npm pack --dry-run --json failed with exit code ${result.status}${detail}`);
  }

  return result.stdout ?? '';
}

function parsePackJson(stdout) {
  const match = stdout.match(/(\[\s*\{[\s\S]*\}\s*\]\s*)$/);
  const jsonText = match ? match[1] : stdout;
  const parsed = JSON.parse(jsonText);
  const firstPack = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!firstPack?.files || !Array.isArray(firstPack.files)) {
    throw new Error('npm pack JSON output did not include files');
  }
  return parsed;
}

try {
  const report = parsePackJson(runPackDryRun());
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
  const pack = Array.isArray(report) ? report[0] : report;
  console.log(`Wrote ${outputPath} (${pack.files.length} files, ${pack.filename})`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
