import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { capture } from './capture.js';
import { launchBrowser } from './launchBrowser.js';
import { preprocess } from './preprocess.js';
import { readJson } from './readJson.js';
import { RawFrame } from '../contracts/RawFrame.js';
import { UiTree } from '../contracts/UiTree.js';
test('alternate-route menu/hover state and child-frame accessibility survive capture',{skip:process.env.UI_RE_INTEGRATION!=='1',timeout:60000},async()=>{
 const html=await readFile(new URL('../../fixtures/site/index.html',import.meta.url),'utf8');
 const server=createServer((request,response)=>{
  response.setHeader('Content-Type','text/html');
  if(request.url==='/missing.png'){response.statusCode=404;response.end('missing');return;}
  if(request.url==='/embedded'){response.end('<!doctype html><h2>Embedded heading</h2>');return;}
  response.end(html.replace('</main>','<img src="/missing.png" alt="Unavailable illustration"><iframe src="/embedded" title="Embedded sample"></iframe></main>'));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');
 const root=await mkdtemp(join(tmpdir(),'ui-re-states-'));
 try{
  const bundle=await capture({url:`http://127.0.0.1:${address.port}`,discoverBreakpoints:false,viewports:[{width:390,height:844}],states:[{id:'menu',path:'/alternate',actions:[{type:'click',selector:'.menu-toggle'},{type:'wait',selector:'nav.open'},{type:'hover',selector:'.hero button'}]}]},join(root,'capture'),{launch:launchBrowser,now:()=>new Date(),log:()=>{}});
  assert.ok(bundle.assets.some(asset=>asset.url.endsWith('/missing.png')&&asset.warning?.includes('HTTP 404')));
  const frame=bundle.frames[0];assert.ok(frame);assert.match(frame.url,/alternate$/);
  const raw=await readJson(join(root,'capture',frame.raw),RawFrame);assert.equal(raw.snapshot.documents.length,2);assert.ok(raw.accessibility.nodes.some(node=>node.name?.value==='Embedded heading'));
  await preprocess(join(root,'capture'),join(root,'ir'));const tree=await readJson(join(root,'ir/trees',`${frame.id}.json`),UiTree);
  assert.equal(tree.documents.length,2);assert.ok(tree.nodes.some(node=>node.attributes['aria-expanded']==='true'));
  assert.ok(tree.nodes.some(node=>node.tag==='button'&&node.styles['background-color']==='rgb(71, 105, 80)'));
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await rm(root,{recursive:true,force:true});}
});
