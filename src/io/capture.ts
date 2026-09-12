import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { z } from 'zod';
import type { Browser, Response } from 'playwright';
import { CaptureConfig } from '../contracts/CaptureConfig.js';
import { CaptureBundle } from '../contracts/CaptureBundle.js';
import { StoredFrame } from '../contracts/StoredFrame.js';
import { Snapshot } from '../contracts/Snapshot.js';
import type { CaptureStrategy } from '../ports/CaptureStrategy.js';
import { domSnapshotStrategy } from './domSnapshotStrategy.js';
import { referencedAssets } from '../core/referencedAssets.js';
import { discoverBreakpoints } from '../core/discoverBreakpoints.js';
import { createOutput } from './createOutput.js';
import { writeJson } from './writeJson.js';
import { applyActions } from './applyActions.js';
import { captureAccessibility } from './captureAccessibility.js';
import { captureCss } from './captureCss.js';

export type CaptureDependencies = { readonly strategy?: CaptureStrategy; readonly launch: () => Promise<Browser>; readonly now: () => Date; readonly log: (event: unknown) => void };
const headerSchema = z.object({ header: z.object({ styleSheetId: z.string(), sourceURL: z.string() }) });
const versionSchema = z.object({ version: z.string() });
const scrollSchema = z.object({ x: z.number(), y: z.number() });

export async function capture(input: unknown, outputPath: string, deps: CaptureDependencies): Promise<CaptureBundle> {
  const config = CaptureConfig.parse(input);
  const strategy = deps.strategy ?? domSnapshotStrategy;
  const output = await createOutput(outputPath);
  await mkdir(join(output, 'frames')); await mkdir(join(output, 'assets'));
  const browser = await deps.launch();
  const warnings: string[] = [];
  const references = new Set<string>();
  const assets = new Map<string, CaptureBundle['assets'][number]>();
  const pending = new Set<Promise<void>>();
  const require = createRequire(import.meta.url);
  const bundle: CaptureBundle = { version: 1, config, toolVersion: '0.1.0', strategy: strategy.id, browserVersion: browser.version(), playwrightVersion: versionSchema.parse(require('playwright/package.json')).version, createdAt: deps.now().toISOString(), warnings, assets: [], breakpoints: [], frames: [] };
  const preserve = async (response: Response): Promise<void> => {
    const kind = response.request().resourceType();
    if (!['image', 'font', 'media'].includes(kind)) return;
    const url = response.url();
    const id = createHash('sha256').update(url).digest('hex').slice(0, 20);
    if (assets.has(url)) return;
    const mime = response.headers()['content-type']?.split(';')[0] ?? 'application/octet-stream';
    const asset: CaptureBundle['assets'][number] = { id, url, mime, bytes: 0 };
    assets.set(url, asset);
    try {
      if(!response.ok()) throw new Error(`HTTP ${response.status()}`);
      const size = Number(response.headers()['content-length'] ?? '0');
      if (size > config.maxAssetBytes) throw new Error(`Asset exceeds ${config.maxAssetBytes} bytes`);
      const body = await response.body(); asset.bytes = body.length;
      if (body.length > config.maxAssetBytes) throw new Error(`Asset exceeds ${config.maxAssetBytes} bytes`);
      const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp', 'image/gif': 'gif', 'font/woff2': 'woff2', 'font/woff': 'woff' };
      asset.file = `assets/${id}.${extensions[mime] ?? 'bin'}`;
      await writeFile(join(output, asset.file), body, { flag: 'wx' });
    } catch (error) { asset.warning = String(error); warnings.push(`Asset ${url}: ${String(error)}`); }
  };
  try {
    const dprs = [...new Set(config.viewports.map(viewport => viewport.dpr))];
    for (const dpr of dprs) {
      const context = await browser.newContext({ deviceScaleFactor: dpr, locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
      const page = await context.newPage(); page.setDefaultTimeout(config.timeoutMs);
      page.on('response', response => { const task = preserve(response); pending.add(task); void task.finally(() => pending.delete(task)); });
      const cdp = await context.newCDPSession(page);
      const headers = new Map<string, string>();
      cdp.on('CSS.styleSheetAdded', (event: unknown) => { const parsed = headerSchema.safeParse(event); if (parsed.success) headers.set(parsed.data.header.styleSheetId, parsed.data.header.sourceURL); else warnings.push('Unsupported stylesheet header event'); });
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable'); await cdp.send('Accessibility.enable'); await cdp.send('CSS.startRuleUsageTracking');
      const viewports = config.viewports.filter(viewport => viewport.dpr === dpr);
      for (const state of config.states) {
        const first = viewports[0]; if (!first) continue;
        await page.setViewportSize(first);
        const url = state.path ? new URL(state.path, config.url).href : config.url;
        headers.clear();
        await page.goto(url, { waitUntil: 'load', timeout: config.timeoutMs });
        await applyActions(page, state.actions);
        await page.evaluate(async () => { await document.fonts.ready; });
        if (config.discoverBreakpoints) {
          const sheets: string[] = [];
          for (const id of headers.keys()) {
            try { sheets.push(z.object({ text: z.string() }).parse(await cdp.send('CSS.getStyleSheetText', { styleSheetId: id })).text); } catch (error) { warnings.push(`Breakpoint stylesheet ${id}: ${String(error)}`); }
          }
          const discovered = discoverBreakpoints(sheets);
          for (const item of discovered) if (!bundle.breakpoints.some(existing => existing.source === item.source && existing.text === item.text)) bundle.breakpoints.push({ ...item, widths: [...item.widths] });
          const widths = [...new Set(discovered.filter(item => item.source === 'media').flatMap(item => item.widths).flatMap(width => [Math.floor(width) - 1, Math.floor(width), Math.floor(width) + 1]))].filter(width => width >= 240 && width <= 7680).sort((a,b) => a-b).slice(0, config.maxDiscoveredViewports);
          for (const width of widths) if (!viewports.some(viewport => viewport.width === width)) viewports.push({ width, height: first.height, dpr });
        }
        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          await page.evaluate(async () => { await document.fonts.ready; });
          await page.waitForTimeout(config.settleMs);
          const id = `${state.id}-${viewport.width}x${viewport.height}-${dpr}`;
          const frameWarnings: string[] = [];
          const timestamp=deps.now().toISOString();
          // Screenshot animation handling can replace pseudo-elements; snapshot afterwards.
          const screenshot = `frames/${id}.png`; let archive = `frames/${id}.mhtml`; const rawPath = `frames/${id}.json`;
          await page.screenshot({ path: join(output, screenshot), fullPage: true, animations: 'disabled', caret: 'hide' });
          const snapshot = Snapshot.parse(await strategy.capture(cdp));
          for(const assetUrl of referencedAssets(snapshot,page.url()))references.add(assetUrl);
          const accessibility = await captureAccessibility(cdp, snapshot, frameWarnings);
          if (page.frames().length > snapshot.documents.length) frameWarnings.push('Some frames are outside this CDP snapshot session; capture their authorized URLs separately for full structure.');
          try { const result = z.object({ data: z.string() }).parse(await cdp.send('Page.captureSnapshot', { format: 'mhtml' })); await writeFile(join(output, archive), result.data); }
          catch (error) { frameWarnings.push(`MHTML unavailable; HTML fallback: ${String(error)}`); archive = `frames/${id}.html`; await writeFile(join(output, archive), await page.content()); }
          const scroll = scrollSchema.parse(await page.evaluate(() => ({ x: scrollX, y: scrollY })));
          const css = await captureCss(cdp, snapshot, headers, frameWarnings, output, id, deps.log, config.timeoutMs);
          await writeJson(join(output, rawPath), StoredFrame.parse({ version:2,snapshot,accessibility,css,warnings:frameWarnings }));
          bundle.frames.push({ id, state: state.id, url: page.url(), viewport, scroll, timestamp, screenshot, archive, raw: rawPath });
          deps.log({ phase: 'capture', frame: id, warnings: frameWarnings.length });
        }
      }
      await Promise.all(pending); await context.close();
    }
    for(const url of references) if(!assets.has(url)) {
      const warning='Referenced media was not fetched; it may be lazy, blocked, unavailable or a blob URL';
      assets.set(url,{id:createHash('sha256').update(url).digest('hex').slice(0,20),url,mime:'application/octet-stream',bytes:0,warning});
      warnings.push(`Asset ${url}: ${warning}`);
    }
    bundle.assets = [...assets.values()].sort((a,b) => a.id.localeCompare(b.id));
    bundle.breakpoints.sort((a,b) => a.text.localeCompare(b.text));
    const validated = CaptureBundle.parse(bundle); await writeJson(join(output, 'capture.json'), validated); return validated;
  } finally { await browser.close(); }
}
