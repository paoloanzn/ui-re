import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { PNG } from 'pngjs';
import { z } from 'zod';
import type { VerificationResult } from '../contracts/VerificationResult.js';
import { referenceDigest } from './referenceDigest.js';
import { bundlePath } from './bundlePath.js';
import { UiManifest } from '../contracts/UiManifest.js';
import { UiTree } from '../contracts/UiTree.js';
import { VerificationReport } from '../contracts/VerificationReport.js';
import { VerificationConfig } from '../contracts/VerificationConfig.js';
import type { PixelComparator } from '../core/comparePixels.js';
import { compareGeometry } from '../core/compareGeometry.js';
import { readJson } from './readJson.js';
import { writeJson } from './writeJson.js';
const lockSchema=z.object({version:z.literal(1),reference:z.string(),digest:z.string(),config:VerificationConfig});

export async function verify(referencePath:string,targetPath:string,outputPath:string,input:unknown,compare:PixelComparator):Promise<VerificationResult> {
  const config=VerificationConfig.parse(input);
  const reference=await readJson(await bundlePath(referencePath,'manifest.json'),UiManifest);const target=await readJson(await bundlePath(targetPath,'manifest.json'),UiManifest);
  await mkdir(outputPath,{recursive:true});
  const lock={version:1 as const,reference:resolve(referencePath),digest:await referenceDigest(referencePath,reference),config};
  try {await writeJson(join(outputPath,'policy.json'),lock);} catch(error) {
    if(!(error instanceof Error&&'code' in error&&error.code==='EEXIST')) throw error;
    const saved=await readJson(join(outputPath,'policy.json'),lockSchema);
    if(JSON.stringify(saved)!==JSON.stringify(lock)) return {status:'policy-conflict',message:'Verification policy and reference are frozen. Restore the original thresholds/reference for this run.'};
  }
  let iteration=1;
  for(;iteration<=config.maxIterations;iteration++) {
    try {await mkdir(join(outputPath,`iteration-${String(iteration).padStart(3,'0')}`));break;} catch(error) {if(!(error instanceof Error&&'code' in error&&error.code==='EEXIST')) throw error;}
  }
  if(iteration>config.maxIterations) return {status:'iteration-limit',message:`Repair iteration limit (${config.maxIterations}) reached. Inspect preserved reports.`};
  const output=join(outputPath,`iteration-${String(iteration).padStart(3,'0')}`);
  const frames=[];
  for(const frame of reference.frames) {
    const other=target.frames.find(item=>item.state===frame.state&&JSON.stringify(item.viewport)===JSON.stringify(frame.viewport));
    if(!other) {frames.push({frame:frame.id,state:frame.state,accepted:false,error:'Missing target viewport/state'});continue;}
    try {
    const [refBuffer,targetBuffer,refTree,targetTree]=await Promise.all([readFile(await bundlePath(referencePath,frame.screenshot)),readFile(await bundlePath(targetPath,other.screenshot)),readJson(await bundlePath(referencePath,frame.tree),UiTree),readJson(await bundlePath(targetPath,other.tree),UiTree)]);
    const pixels=compare(PNG.sync.read(refBuffer),PNG.sync.read(targetBuffer),config.pixelTolerance);
    const geometry=compareGeometry(refTree,targetTree);
    const accepted=pixels.dimensionsMatch&&pixels.error<=config.maxPixelError&&geometry.maxDelta<=config.maxGeometryDelta&&geometry.coverage>=config.minGeometryCoverage;
    const diff=`${frame.id}-diff.png`;await writeFile(join(output,diff),PNG.sync.write({width:pixels.diff.width,height:pixels.diff.height,data:Buffer.from(pixels.diff.data)} as PNG));
    const {diff:_,...metrics}=pixels;
    frames.push({frame:frame.id,state:frame.state,viewport:frame.viewport,accepted,pixels:metrics,geometry,diff});
    } catch(error) { frames.push({frame:frame.id,state:frame.state,accepted:false,error:`Frame comparison failed: ${error instanceof Error ? error.message : String(error)}`}); }
  }
  const accepted=frames.length>0&&frames.every(frame=>frame.accepted);
  await writeJson(join(output,'report.json'),VerificationReport.parse({version:1,iteration,accepted,limitReached:!accepted&&iteration===config.maxIterations,policy:config,frames}));
  await writeFile(join(output,'report.md'),`# Verification ${iteration}: ${accepted?'PASS':'FAIL'}\n\n${frames.map(frame=>`- ${frame.frame}: ${frame.accepted?'PASS':'FAIL'}${'pixels' in frame?` — pixel error ${frame.pixels?.error.toFixed(5)}, geometry coverage ${frame.geometry?.coverage.toFixed(3)}, max delta ${frame.geometry?.maxDelta.toFixed(2)}px`:` — ${frame.error}`}`).join('\n')}\n`);
  return {status:'compared',accepted,report:join(output,'report.json')};
}
