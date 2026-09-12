import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { domSnapshotStrategy } from './domSnapshotStrategy.js';
import { capture } from './capture.js';
import { launchBrowser } from './launchBrowser.js';
import { readJson } from './readJson.js';
import { CaptureBundle } from '../contracts/CaptureBundle.js';
import { RawFrame } from '../contracts/RawFrame.js';

test('Chromium captures responsive structure, semantics, assets and dialog state', { skip: process.env.UI_RE_INTEGRATION !== '1', timeout: 120000 }, async () => {
  const server = createServer((request, response) => {
    const name = request.url === '/landscape.svg' ? 'landscape.svg' : 'index.html';
    response.setHeader('Content-Type', name.endsWith('svg') ? 'image/svg+xml' : 'text/html');
    void readFile(new URL(`../../fixtures/site/${name}`, import.meta.url)).then(body => response.end(body)).catch(() => { response.statusCode = 500; response.end(); });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const root = await mkdtemp(join(tmpdir(), 'ui-re-capture-'));
  try {
    const output = join(root, 'capture');
    let strategyCalls=0;
    const result = await capture({ url: `http://127.0.0.1:${address.port}`, viewports: [{width:390,height:844},{width:1100,height:800}], maxDiscoveredViewports: 3, states:[{id:'default'}, {id:'dialog',actions:[{type:'click',selector:'.hero button'}]}] }, output, { strategy:{id:'test-strategy',capture:session=>{strategyCalls++;return domSnapshotStrategy.capture(session);}}, launch: launchBrowser, now: () => new Date('2026-01-01T00:00:00Z'), log: () => {} });
    assert.equal(result.frames.length, 10);assert.equal(strategyCalls,10);assert.equal(result.strategy,'test-strategy');
    assert.ok(result.breakpoints.some(item => item.widths.includes(760)));
    assert.ok(result.assets.some(asset => asset.mime === 'image/svg+xml' && asset.file));
    const saved = await readJson(join(output,'capture.json'), CaptureBundle); assert.deepEqual(saved,result);
    const frame = result.frames.find(item => item.state === 'dialog'); assert.ok(frame);
    const raw = await readJson(join(output,frame.raw), RawFrame);
    assert.ok(raw.snapshot.documents[0]?.layout.bounds.length);
    assert.ok(raw.accessibility.nodes.some(node => node.role?.value === 'dialog'));
    assert.ok(raw.css.matched.length > 0); assert.ok(raw.css.stylesheets.length > 0);
    assert.ok((await readFile(join(output,frame.screenshot))).length > 1000);
    assert.match(await readFile(join(output,frame.archive),'utf8'), /Fieldnotes/);
  } finally { await new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve())); await rm(root,{recursive:true,force:true}); }
});
