import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { CaptureBundle } from '../contracts/CaptureBundle.js';
import { CssReference } from '../contracts/CssReference.js';
import { StoredFrame } from '../contracts/StoredFrame.js';
import { compactCss } from '../core/compactCss.js';
import { createCssReader } from './createCssReader.js';
import { createJsonObjectStore } from './createJsonObjectStore.js';
import { RawFrame } from '../contracts/RawFrame.js';
import { EvidenceIndex } from '../contracts/EvidenceIndex.js';
import { UiManifest } from '../contracts/UiManifest.js';
import { UiTree } from '../contracts/UiTree.js';
import { normalize } from '../core/normalize.js';
import { createTokenStatistics } from '../core/createTokenStatistics.js';
import { matchNodes } from '../core/matchNodes.js';
import type { PreprocessPass } from '../ports/PreprocessPass.js';
import { bundlePath } from './bundlePath.js';
import { createOutput } from './createOutput.js';
import { readJson } from './readJson.js';
import { writeJson } from './writeJson.js';

export async function preprocess(inputPath: string, outputPath: string, passes: readonly PreprocessPass[] = []): Promise<void> {
  const bundle = await readJson(await bundlePath(inputPath,'capture.json'),CaptureBundle);
  const output=await createOutput(outputPath);
  for(const folder of ['trees','screenshots','assets']) await mkdir(join(output,folder));
  let frameUrl=bundle.config.url;
  const assets=[...bundle.assets]; const pending:Promise<void>[]=[];
  for(const asset of assets) if(asset.file) await copyFile(await bundlePath(inputPath,asset.file),join(output,asset.file));
  const rewriteCache=new Map<string,string>();
  const rewriteValue=(value:string):string => {
    let result=value;
    try { const absolute=new URL(value,frameUrl).href; const asset=assets.find(item=>item.url===absolute&&item.file); if(asset) return `asset:${asset.id}`; } catch { /* Non-URL style/text remains unchanged. */ }
    for(const asset of assets) if(asset.file) result=result.split(asset.url).join(`asset:${asset.id}`);
    result=result.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g,(whole:string,url:string)=>{try{const absolute=new URL(url,frameUrl).href;const asset=assets.find(item=>item.url===absolute&&item.file);return asset?`url(asset:${asset.id})`:whole;}catch{return whole;}});
    return result.replace(/data:([\w/+.-]+)(;base64)?,([^\s"'<>)]*)/g,(url:string,mime:string,encoding:string|undefined,payload:string) => {
      const id=createHash('sha256').update(url).digest('hex').slice(0,20);
      if(!assets.some(asset => asset.id===id)) {
        try { const body=encoding ? Buffer.from(payload,'base64'):Buffer.from(decodeURIComponent(payload)); const file=`assets/${id}.bin`; assets.push({id,url:`inline:${id}`,mime,bytes:body.length,file}); pending.push(writeFile(join(output,file),body,{flag:'wx'})); }
        catch { assets.push({id,url:`inline:${id}`,mime,bytes:0,warning:'Could not decode inline asset'}); }
      }
      return `asset:${id}`;
    });
  };
  const rewrite=(value:string):string=>{
    const cached=rewriteCache.get(value);if(cached!==undefined)return cached;
    const result=rewriteValue(value);if(value.length<100000)rewriteCache.set(value,result);return result;
  };
  const sanitize=(value:unknown):unknown => {
    if(typeof value==='string') return rewrite(value);
    if(Array.isArray(value)) return value.map(sanitize);
    if(value!==null && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,sanitize(item)]));
    return value;
  };
  const cssReader=createCssReader(inputPath);
  const cssStore=await createJsonObjectStore(output,'css');
  const statistics=createTokenStatistics();
  for(const frame of bundle.frames) {
    frameUrl=frame.url;rewriteCache.clear();
    const stored=await readJson(await bundlePath(inputPath,frame.raw),StoredFrame);
    const raw=stored.version===1?stored:RawFrame.parse({...stored,version:1,css:{stylesheets:[],matched:[],media:stored.css.media,ruleUsage:stored.css.ruleUsage}});
    const normalized=normalize(raw,frame.id,{rewrite});
    let tree=UiTree.parse(sanitize(normalized));
    if(stored.version===2) {
      const nodesByBackend=new Map<number,UiTree['nodes']>();
      for(const node of tree.nodes){const group=nodesByBackend.get(node.backendNodeId)??[];group.push(node);nodesByBackend.set(node.backendNodeId,group);}
      for(const file of stored.css.matched) {
        const entry=await readJson(await bundlePath(inputPath,file),RawFrame.shape.css.shape.matched.element);
        const nodes=nodesByBackend.get(entry.backendNodeId);if(!nodes)continue;
        const compact=sanitize(compactCss(await cssReader.expand(entry.evidence)));
        if(compact&&typeof compact==='object'&&'warning' in compact)tree.warnings.push(`CSS backend ${entry.backendNodeId}: ${String(compact.warning)}`);
        const cssFile=await cssStore.put(compact);
        for(const node of nodes){node.css=CssReference.parse({file:cssFile});node.fonts=sanitize(entry.fonts);}
      }
    }
    for (const pass of passes) { tree=UiTree.parse(pass.transform(tree)); if(tree.frameId!==frame.id) throw new Error(`Pass ${pass.id} changed the frame identity`); }
    statistics.add(tree);
    await writeJson(join(output,`trees/${frame.id}.json`),tree);
    await copyFile(await bundlePath(inputPath,frame.screenshot),join(output,`screenshots/${frame.id}.png`));
  }
  const responsive=[];
  for(const state of bundle.config.states) {
    const frames=bundle.frames.filter(frame => frame.state===state.id);
    const baseline=frames[0]; if(!baseline) continue;
    const first=await readJson(join(output,`trees/${baseline.id}.json`),UiTree);
    for(const frame of frames.slice(1)) { const tree=await readJson(join(output,`trees/${frame.id}.json`),UiTree); responsive.push({from:baseline.id,to:frame.id,...matchNodes(first,tree)}); }
  }
  await Promise.all(pending);
  await writeJson(join(output,'assets.json'),EvidenceIndex.assets.parse({version:1,assets:assets.map(asset=>({...asset,url:asset.url.startsWith('data:')?`inline:${asset.id}`:asset.url})).sort((a,b)=>a.id.localeCompare(b.id))}));
  await writeJson(join(output,'tokens.json'),EvidenceIndex.tokens.parse({version:1,candidates:statistics.values()}));
  await writeJson(join(output,'responsive.json'),EvidenceIndex.responsive.parse({version:1,breakpoints:bundle.breakpoints,correspondence:responsive}));
  await writeJson(join(output,'manifest.json'),UiManifest.parse({version:1,sourceUrl:bundle.config.url,assets:'assets.json',tokens:'tokens.json',responsive:'responsive.json',warnings:bundle.warnings,frames:bundle.frames.map(({raw: _raw, archive: _archive, ...frame})=>({...frame,tree:`trees/${frame.id}.json`,screenshot:`screenshots/${frame.id}.png`}))}));
}
