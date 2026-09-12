import type { CDPSession } from 'playwright';
import { z } from 'zod';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { CssArchive } from '../contracts/CssArchive.js';
import { createJsonObjectStore } from './createJsonObjectStore.js';
import { archiveCssEvidence } from './archiveCssEvidence.js';
import { withTimeout } from './withTimeout.js';
import { writeJson } from './writeJson.js';
import type { Snapshot } from '../contracts/Snapshot.js';
const stylesheet = z.object({ text: z.string() });
const pushed = z.object({ nodeIds: z.array(z.number().int()) });
/** Matched rules supply authored sizing intent alongside resolved snapshot values. */
export async function captureCss(cdp: {send:(method:Parameters<CDPSession['send']>[0],params?:Record<string,unknown>)=>Promise<unknown>}, snapshot: Snapshot, headers: ReadonlyMap<string, string>, warnings: string[], root: string, frameId: string, log: (event:unknown)=>void, timeoutMs: number): Promise<CssArchive> {
  const request=(method:Parameters<CDPSession['send']>[0],params?:Record<string,unknown>):Promise<unknown>=>withTimeout(cdp.send(method,params),timeoutMs,`${method} (${frameId}, ${JSON.stringify(params??{})})`);
  const warn=(message:string,error:unknown):void=>{
    if(error instanceof DOMException&&error.name==='TimeoutError')throw error;
    warnings.push(`${message}: ${String(error)}`);
  };
  const stylesheets: CssArchive['stylesheets'] = [];
  const store=await createJsonObjectStore(root,'css/objects');
  const directory=`css/frames/${frameId}`;
  await mkdir(join(root,directory),{recursive:true});
  await mkdir(join(root,'css/stylesheets'),{recursive:true});
  for (const [id, url] of [...headers].sort(([a], [b]) => a.localeCompare(b))) {
    let text:string;
    try { text=stylesheet.parse(await request('CSS.getStyleSheetText', { styleSheetId: id })).text; }
    catch (error) { warn(`Stylesheet ${id} unavailable`,error);continue; }
    const file=`css/stylesheets/${createHash('sha256').update(text).digest('hex')}.css`;
    try {await writeFile(join(root,file),text,{flag:'wx'});}
    catch(error){if(!(error instanceof Error&&'code' in error&&error.code==='EEXIST'))throw error;}
    stylesheets.push({id,url,file});
  }
  let media: unknown = null;
  try { media = await request('CSS.getMediaQueries'); } catch (error) { warn('Media evidence unavailable',error); }
  const matched: string[] = [];
  await request('DOM.getDocument', { depth: 0 });
  const backendIds = [...new Set(snapshot.documents.flatMap(doc => doc.layout.nodeIndex.filter(index => doc.nodes.nodeType[index] === 1).map(index => doc.nodes.backendNodeId[index]).filter((id): id is number => id !== undefined)))];
  for (const backendNodeId of backendIds) {
    let evidence:unknown;
    let fonts:unknown=null;
    try {
      const nodeId = pushed.parse(await request('DOM.pushNodesByBackendIdsToFrontend', { backendNodeIds: [backendNodeId] })).nodeIds[0];
      if (!nodeId) { warnings.push(`No live CSS node for backend ${backendNodeId}`); continue; }
      evidence = await request('CSS.getMatchedStylesForNode', { nodeId });
      try { fonts = await request('CSS.getPlatformFontsForNode', { nodeId }); } catch (error) { warn(`Fonts for ${backendNodeId}`,error); }
    } catch (error) {
      warn(`Matched CSS for ${backendNodeId}`,error);
      log({phase:'capture-css-warning',frame:frameId,backendNodeId,error:String(error)});
      continue;
    }
    // Storage failures must stop capture instead of silently dropping evidence.
    const file=`${directory}/${backendNodeId}.json`;
    await writeJson(join(root,file),{backendNodeId,evidence:await archiveCssEvidence(evidence,store),fonts});
    matched.push(file);
    if(matched.length%100===0)log({phase:'capture-css',frame:frameId,completed:matched.length,total:backendIds.length});
  }
  let ruleUsage: unknown = null;
  try { ruleUsage = await request('CSS.takeCoverageDelta'); } catch (error) { warn('Rule usage unavailable',error); }
  return { format:'css-archive-v1',stylesheets, media, matched, ruleUsage, nodes:matched.length };
}
