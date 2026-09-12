#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { checkEnvironment } from './check-environment.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
if (process.argv.slice(2).join(' ') !== '--approve') {
  console.error('Setup requires explicit user approval. After approval run: node scripts/setup.mjs --approve');
  process.exitCode = 2;
} else {
  const before = await checkEnvironment(root);
  const run = (command, args) => { const r = spawnSync(command, args, { cwd: root, stdio: 'inherit' }); if (r.status !== 0) throw Error(`${command} failed (${r.status})`); };
  if (!before.checks.find(c => c.name === 'node')?.ok || !before.checks.find(c => c.name === 'npm')?.ok) {
    console.error('Install supported Node.js and npm explicitly; setup does not change system runtimes.'); process.exitCode = 1;
  } else {
    if (!before.checks.find(c => c.name === 'dependencies')?.ok) run(process.platform === 'win32' ? 'npm.cmd' : 'npm', [existsSync(new URL('../package-lock.json', import.meta.url)) ? 'ci' : 'install', '--no-audit', '--no-fund']);
    const afterDependencies = await checkEnvironment(root);
    if (!afterDependencies.checks.find(c => c.name === 'chromium-cdp')?.ok && !process.env.UI_RE_CHROMIUM) run(process.execPath, ['node_modules/playwright/cli.js', 'install', 'chromium']);
    const after = await checkEnvironment(root); console.log(JSON.stringify(after, null, 2)); process.exitCode = after.ok ? 0 : 1;
  }
}
