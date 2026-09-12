import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CaptureBundle } from '../contracts/CaptureBundle.js';
import { RawFrame } from '../contracts/RawFrame.js';
import { UiTree } from '../contracts/UiTree.js';
import { EvidenceIndex } from '../contracts/EvidenceIndex.js';
import { preprocess } from './preprocess.js';
import { writeJson } from './writeJson.js';
import { readJson } from './readJson.js';

test('preprocess externalizes large binary URLs and resolves relative asset references',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ui-re-assets-'));const input=join(root,'raw');await mkdir(input);
 const payload=Buffer.alloc(100000,42).toString('base64');const data=`data:image/png;base64,${payload}`;
 try{
  const raw=RawFrame.parse({version:1,snapshot:{strings:['IMG','','src',data,'image.svg'],documents:[{documentURL:1,title:1,frameId:1,nodes:{parentIndex:[-1,-1],nodeType:[1,1],nodeName:[0,0],nodeValue:[1,1],backendNodeId:[1,2],attributes:[[2,3],[2,4]]},layout:{nodeIndex:[0,1],styles:[[],[]],bounds:[[0,0,10,10],[20,0,10,10]],text:[1,1]}}]},accessibility:{nodes:[]},css:{stylesheets:[],media:null,matched:[],ruleUsage:null},warnings:[]});
  await writeJson(join(input,'raw.json'),raw);await writeFile(join(input,'screen.png'),'placeholder');await mkdir(join(input,'assets'));await writeFile(join(input,'assets/image.svg'),'<svg/>');
  const bundle=CaptureBundle.parse({version:1,config:{url:'https://example.com/path/'},toolVersion:'test',browserVersion:'test',playwrightVersion:'test',createdAt:'2026-01-01T00:00:00Z',warnings:[],assets:[{id:'external',url:'https://example.com/path/image.svg',mime:'image/svg+xml',bytes:6,file:'assets/image.svg'}],breakpoints:[],frames:[{id:'frame',state:'default',url:'https://example.com/path/',viewport:{width:390,height:844,dpr:1},scroll:{x:0,y:0},timestamp:'2026-01-01T00:00:00Z',screenshot:'screen.png',archive:'archive.mhtml',raw:'raw.json'}]});
  await writeJson(join(input,'capture.json'),bundle);let calls=0;await preprocess(input,join(root,'ir'),[{id:'audit-pass',transform:tree=>{calls++;return {...tree,warnings:[...tree.warnings,'pass-observed']};}}]);assert.equal(calls,1);
  const tree=await readJson(join(root,'ir/trees/frame.json'),UiTree);assert.ok(tree.warnings.includes('pass-observed'));assert.equal(tree.nodes[1]?.attributes['src'],'asset:external');assert.match(tree.nodes[0]?.attributes['src']??'',/^asset:/);
  assert.ok((await readFile(join(root,'ir/trees/frame.json'),'utf8')).length<5000);
  const assets=await readJson(join(root,'ir/assets.json'),EvidenceIndex.assets);assert.equal(assets.assets.length,2);assert.ok(assets.assets.some(asset=>asset.bytes===100000&&asset.file));assert.ok(!JSON.stringify(assets).includes(payload));
 }finally{await rm(root,{recursive:true,force:true});}
});
