import { test } from 'node:test';
import assert from 'node:assert/strict';
import { constants } from 'node:buffer';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { PNG } from 'pngjs';
import { CaptureBundle } from '../contracts/CaptureBundle.js';
import { StoredFrame } from '../contracts/StoredFrame.js';
import { UiTree } from '../contracts/UiTree.js';
import { CssReference } from '../contracts/CssReference.js';
import { preprocess } from './preprocess.js';
import { writeJson } from './writeJson.js';
import { Snapshot } from '../contracts/Snapshot.js';
import { captureCss } from './captureCss.js';
import { createCssReader } from './createCssReader.js';

function snapshot(count:number):Snapshot {
  const indexes=Array.from({length:count},(_,i)=>i);
  return Snapshot.parse({strings:['DIV'],documents:[{documentURL:0,title:0,frameId:0,
    nodes:{parentIndex:indexes.map(()=>-1),nodeType:indexes.map(()=>1),nodeName:indexes.map(()=>0),nodeValue:indexes.map(()=>0),backendNodeId:indexes.map(i=>i+1),attributes:indexes.map(()=>[])},
    layout:{nodeIndex:indexes,styles:indexes.map(()=>[]),bounds:indexes.map(()=>[0,0,10,10]),text:indexes.map(()=>0)}}]});
}

test('capture and preprocess retain every element when aggregate CSS exceeds the V8 string limit', {skip:process.env.UI_RE_STRESS!=='1',timeout:120000}, async()=>{
  const root=await mkdtemp(join(tmpdir(),'ui-re-heavy-css-'));
  try {
    const rule={origin:'regular',selectorList:{text:'.card'},style:{cssProperties:[{name:'--large-token',value:'x'.repeat(512*1024)}]}};
    const evidence={matchedCSSRules:[{rule,matchingSelectors:[0]}],inherited:[{matchedCSSRules:[{rule,matchingSelectors:[0]}]}],futureField:{retained:true}};
    const responseBytes=Buffer.byteLength(JSON.stringify(evidence));
    const count=Math.ceil((constants.MAX_STRING_LENGTH+1)/responseBytes);
    let calls=0;
    const cdp:Parameters<typeof captureCss>[0]={send:async(method,params)=>{
      switch(method) {
        case 'DOM.pushNodesByBackendIdsToFrontend': return {nodeIds:z.object({backendNodeIds:z.array(z.number())}).parse(params).backendNodeIds};
        case 'CSS.getMatchedStylesForNode': calls++;return structuredClone(evidence);
        case 'CSS.getPlatformFontsForNode': return {fonts:[]};
        default:return {};
      }
    }};
    const archive=await captureCss(cdp,snapshot(count),new Map(),[],root,'heavy',()=>{},1000);
    assert.equal(calls,count);assert.equal(archive.matched.length,count);
    assert.ok(responseBytes*count>constants.MAX_STRING_LENGTH);
    const objects=await readdir(join(root,'css/objects'));
    assert.equal(objects.length,1);
    let storedBytes=0;
    for(const file of [...archive.matched,...objects.map(file=>`css/objects/${file}`)])storedBytes+=(await stat(join(root,file))).size;
    assert.ok(storedBytes<2*1024*1024,`Stored ${storedBytes} bytes`);
    const reader=createCssReader(root);
    for(const file of [archive.matched[0],archive.matched.at(-1)]) {
      assert.ok(file);
      const record=z.object({evidence:z.unknown()}).parse(JSON.parse(await readFile(join(root,file),'utf8')) as unknown);
      assert.deepEqual(await reader.expand(record.evidence),evidence);
    }
    const timestamp='2026-01-01T00:00:00Z';
    const viewport={width:390,height:844,dpr:1};
    await writeJson(join(root,'frame.json'),StoredFrame.parse({version:2,snapshot:snapshot(count),accessibility:{nodes:[]},css:archive,warnings:[]}));
    await writeFile(join(root,'frame.png'),PNG.sync.write(new PNG({width:1,height:1})));
    await writeJson(join(root,'capture.json'),CaptureBundle.parse({version:1,config:{url:'https://example.test',viewports:[viewport],discoverBreakpoints:false},toolVersion:'test',browserVersion:'synthetic',playwrightVersion:'test',createdAt:timestamp,warnings:[],assets:[],breakpoints:[],frames:[{id:'heavy',state:'default',url:'https://example.test',viewport,scroll:{x:0,y:0},timestamp,screenshot:'frame.png',archive:'frame.html',raw:'frame.json'}]}));
    const ir=join(root,'ir');await preprocess(root,ir);
    const tree=UiTree.parse(JSON.parse(await readFile(join(ir,'trees/heavy.json'),'utf8')) as unknown);
    assert.equal(tree.nodes.length,count);
    for(const node of tree.nodes)CssReference.parse(node.css);
    assert.equal((await readdir(join(ir,'css'))).length,1,'identical normalized CSS is shared across every node');
    const first=tree.nodes[0];assert.ok(first);
    const css=JSON.parse(await readFile(join(ir,CssReference.parse(first.css).file),'utf8')) as unknown;
    const normalized=z.object({rules:z.array(z.object({declarations:z.array(z.object({name:z.string(),value:z.string()}))}))}).parse(css);
    assert.equal(normalized.rules[0]?.declarations[0]?.value,rule.style.cssProperties[0]?.value);
    console.log(`CSS archive: ${count} nodes, ${responseBytes*count} logical bytes, ${storedBytes} stored bytes`);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('a stalled CSS session fails promptly instead of producing a misleading complete archive',async()=>{
  const root=await mkdtemp(join(tmpdir(),'ui-re-stalled-css-'));
  try {
    const cdp:Parameters<typeof captureCss>[0]={send:async()=>new Promise<never>(()=>{})};
    await assert.rejects(captureCss(cdp,snapshot(3),new Map(),[],root,'stalled',()=>{},10),error=>
      error instanceof DOMException&&error.name==='TimeoutError'&&error.message.includes('CSS.getMediaQueries'));
  } finally {await rm(root,{recursive:true,force:true});}
});
