#!/usr/bin/env node
import { browserOptions } from './browser-options.mjs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { access, mkdtemp, rm, readFile } from 'node:fs/promises';
import { constants, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../package.json', import.meta.url));
export async function checkEnvironment(workspace = process.cwd()) {
  const checks = [];
  const check = async (name, fn) => {
    try { const detail = await fn(); checks.push({ name, ok: true, detail }); }
    catch (error) { checks.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) }); }
  };
  await check('node', () => { if (Number(process.versions.node.split('.')[0]) < 22) throw Error('Node.js >=22 required'); return process.version; });
  await check('npm', () => { const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], { encoding: 'utf8' }); if (r.status !== 0) throw Error('npm is unavailable'); return r.stdout.trim(); });
  await check('dependencies', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg) || !pkg.dependencies || typeof pkg.dependencies !== 'object' || Array.isArray(pkg.dependencies)) throw Error('Invalid package.json: dependencies must be an object');
    for (const section of [pkg.dependencies, pkg.devDependencies ?? {}]) {
      if (!section || typeof section !== 'object' || Array.isArray(section) || Object.values(section).some(value => typeof value !== 'string')) throw Error('Invalid package.json: dependency versions must be strings');
    }
    const missing = [];
    for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
      try { require.resolve(`${name}/package.json`); } catch { missing.push(name); }
    }
    if (missing.length) throw Error(`Missing project-local dependencies: ${missing.join(', ')}. Approved setup: node scripts/setup.mjs --approve`);
    return 'All project dependencies resolve';
  });
  await check('workspace-write', async () => { await access(workspace, constants.W_OK); const temp = await mkdtemp(join(resolve(workspace), '.ui-re-check-')); await rm(temp, { recursive: true }); return resolve(workspace); });
  await check('chromium-cdp', async () => {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, chromiumSandbox: true, ...browserOptions(chromium.executablePath()) });
    try { const page = await browser.newPage(); const cdp = await page.context().newCDPSession(page); await cdp.send('DOMSnapshot.captureSnapshot', { computedStyles: [], includeDOMRects: true }); return browser.version(); }
    finally { await browser.close(); }
  });
  return { version: 1, ok: checks.every(c => c.ok), checks };
}
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0]?.startsWith('-'))) { console.error('Usage: node scripts/check-environment.mjs [workspace]'); process.exitCode = 2; }
  else {
    const report = await checkEnvironment(args[0]);
    for (const c of report.checks) console.error(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
    console.log(JSON.stringify(report, null, 2)); process.exitCode = report.ok ? 0 : 1;
  }
}
