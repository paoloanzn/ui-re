import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { capture } from './capture.js';
import { launchBrowser } from './launchBrowser.js';
import { preprocess } from './preprocess.js';
import { render } from './render.js';
import { verify } from './verify.js';
import { comparePixels } from '../core/comparePixels.js';
import { readJson } from './readJson.js';
import { VerificationReport } from '../contracts/VerificationReport.js';
import { UiManifest } from '../contracts/UiManifest.js';

test('disk-resumed pipeline accepts control, rejects changed layout, freezes policy and limits repairs',{skip:process.env.UI_RE_INTEGRATION!=='1',timeout:120000},async()=>{
 let changed=false;
 const server=createServer((request,response)=>{
  const name=request.url==='/landscape.svg'?'landscape.svg':'index.html';response.setHeader('Content-Type',name.endsWith('svg')?'image/svg+xml':'text/html');
  void readFile(new URL(`../../fixtures/site/${name}`,import.meta.url),'utf8').then(body=>response.end(changed&&name==='index.html'?body.replace('padding:48px 40px','padding:72px 40px'):body)).catch(()=>{response.statusCode=500;response.end();});
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');
 const root=await mkdtemp(join(tmpdir(),'ui-re-pipeline-'));const url=`http://127.0.0.1:${address.port}`;
 const deps={launch:launchBrowser,now:()=>new Date(),log:()=>{}};
 try{
  await capture({url,viewports:[{width:1100,height:800}],discoverBreakpoints:false},join(root,'capture'),deps);
  await preprocess(join(root,'capture'),join(root,'ir'));
  const manifest=await readJson(join(root,'ir/manifest.json'),UiManifest);const frame=manifest.frames[0];assert.ok(frame);
  const tree=await readFile(join(root,'ir',frame.tree),'utf8');assert.ok(tree.length<500000);assert.ok(!tree.includes('data:image/'));
  await render(join(root,'capture'),url,join(root,'render'),deps);await preprocess(join(root,'render'),join(root,'target'));
  const policy={maxIterations:2};assert.ok('accepted' in (await verify(join(root,'ir'),join(root,'target'),join(root,'reports'),policy,comparePixels)));
  assert.equal((await readJson(join(root,'reports/iteration-001/report.json'),VerificationReport)).accepted,true);
  changed=true;await render(join(root,'capture'),url,join(root,'changed'),deps);await preprocess(join(root,'changed'),join(root,'changed-ir'));
  const failed=await verify(join(root,'ir'),join(root,'changed-ir'),join(root,'reports'),policy,comparePixels);
  assert.equal(failed.status,'compared'); if(failed.status==='compared')assert.equal(failed.accepted,false);
  assert.match(await readFile(join(root,'reports/iteration-002/report.md'),'utf8'),/FAIL/);
  assert.equal((await verify(join(root,'ir'),join(root,'target'),join(root,'reports'),{maxIterations:3},comparePixels)).status,'policy-conflict');
  assert.equal((await verify(join(root,'ir'),join(root,'target'),join(root,'reports'),policy,comparePixels)).status,'iteration-limit');
  await writeFile(join(root,'target',frame.screenshot),'not a PNG');
  const corrupt=await verify(join(root,'ir'),join(root,'target'),join(root,'corrupt-reports'),{},comparePixels);
  assert.equal(corrupt.status,'compared');if(corrupt.status==='compared')assert.equal(corrupt.accepted,false);
  const corruptReport=await readJson(join(root,'corrupt-reports/iteration-001/report.json'),VerificationReport);assert.ok(corruptReport.frames.some(item=>'error' in item&&item.error.includes('comparison failed')));
  await writeFile(join(root,'ir',frame.tree),tree+'\n');
  assert.equal((await verify(join(root,'ir'),join(root,'target'),join(root,'reports'),policy,comparePixels)).status,'policy-conflict');
  await assert.rejects(preprocess(join(root,'capture'),join(root,'ir')),/EEXIST/);
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await rm(root,{recursive:true,force:true});}
});
