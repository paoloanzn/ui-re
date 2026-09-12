import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { CaptureBundle } from '../contracts/CaptureBundle.js';
import { RawFrame } from '../contracts/RawFrame.js';
import { EvidenceIndex } from '../contracts/EvidenceIndex.js';
import { UiManifest } from '../contracts/UiManifest.js';
import { UiTree } from '../contracts/UiTree.js';
import { normalize } from '../core/normalize.js';
import { tokenStatistics } from '../core/tokenStatistics.js';
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
  const rewrite=(value:string):string => {
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
  const sanitize=(value:unknown):unknown => {
    if(typeof value==='string') return rewrite(value);
    if(Array.isArray(value)) return value.map(sanitize);
    if(value!==null && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,sanitize(item)]));
    return value;
  };
  const trees:UiTree[]=[];
  for(const frame of bundle.frames) {
    frameUrl=frame.url;
    const raw=await readJson(await bundlePath(inputPath,frame.raw),RawFrame);
    const normalized=normalize(raw,frame.id,{rewrite});
    let tree=UiTree.parse(sanitize(normalized));
    for (const pass of passes) { tree=UiTree.parse(pass.transform(tree)); if(tree.frameId!==frame.id) throw new Error(`Pass ${pass.id} changed the frame identity`); }
    trees.push(tree);
    await writeJson(join(output,`trees/${frame.id}.json`),tree);
    await copyFile(await bundlePath(inputPath,frame.screenshot),join(output,`screenshots/${frame.id}.png`));
  }
  const responsive=[];
  for(const state of bundle.config.states) {
    const frames=bundle.frames.filter(frame => frame.state===state.id);
    const baseline=frames[0]; if(!baseline) continue;
    const first=trees.find(tree => tree.frameId===baseline.id); if(!first) continue;
    for(const frame of frames.slice(1)) { const tree=trees.find(item => item.frameId===frame.id); if(tree) responsive.push({from:baseline.id,to:frame.id,...matchNodes(first,tree)}); }
  }
  await Promise.all(pending);
  await writeJson(join(output,'assets.json'),EvidenceIndex.assets.parse({version:1,assets:assets.map(asset=>({...asset,url:asset.url.startsWith('data:')?`inline:${asset.id}`:asset.url})).sort((a,b)=>a.id.localeCompare(b.id))}));
  await writeJson(join(output,'tokens.json'),EvidenceIndex.tokens.parse({version:1,candidates:tokenStatistics(trees)}));
  await writeJson(join(output,'responsive.json'),EvidenceIndex.responsive.parse({version:1,breakpoints:bundle.breakpoints,correspondence:responsive}));
  await writeJson(join(output,'manifest.json'),UiManifest.parse({version:1,sourceUrl:bundle.config.url,assets:'assets.json',tokens:'tokens.json',responsive:'responsive.json',warnings:bundle.warnings,frames:bundle.frames.map(({raw: _raw, archive: _archive, ...frame})=>({...frame,tree:`trees/${frame.id}.json`,screenshot:`screenshots/${frame.id}.png`}))}));
}
