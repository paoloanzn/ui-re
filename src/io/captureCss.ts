import type { CDPSession } from 'playwright';
import { z } from 'zod';
import type { RawFrame } from '../contracts/RawFrame.js';
import type { Snapshot } from '../contracts/Snapshot.js';
const stylesheet = z.object({ text: z.string() });
const pushed = z.object({ nodeIds: z.array(z.number().int()) });
/** Matched rules supply authored sizing intent alongside resolved snapshot values. */
export async function captureCss(cdp: CDPSession, snapshot: Snapshot, headers: ReadonlyMap<string, string>, warnings: string[]): Promise<RawFrame['css']> {
  const stylesheets: RawFrame['css']['stylesheets'] = [];
  for (const [id, url] of [...headers].sort(([a], [b]) => a.localeCompare(b))) {
    try { const result = stylesheet.parse(await cdp.send('CSS.getStyleSheetText', { styleSheetId: id })); stylesheets.push({ id, url, text: result.text }); }
    catch (error) { warnings.push(`Stylesheet ${id} unavailable: ${String(error)}`); }
  }
  let media: unknown = null;
  try { media = await cdp.send('CSS.getMediaQueries'); } catch (error) { warnings.push(`Media evidence unavailable: ${String(error)}`); }
  const matched: RawFrame['css']['matched'] = [];
  await cdp.send('DOM.getDocument', { depth: 0 });
  const backendIds = [...new Set(snapshot.documents.flatMap(doc => doc.layout.nodeIndex.filter(index => doc.nodes.nodeType[index] === 1).map(index => doc.nodes.backendNodeId[index]).filter((id): id is number => id !== undefined)))];
  for (const backendNodeId of backendIds) {
    try {
      const nodeId = pushed.parse(await cdp.send('DOM.pushNodesByBackendIdsToFrontend', { backendNodeIds: [backendNodeId] })).nodeIds[0];
      if (!nodeId) { warnings.push(`No live CSS node for backend ${backendNodeId}`); continue; }
      const evidence: unknown = await cdp.send('CSS.getMatchedStylesForNode', { nodeId });
      let fonts: unknown = null;
      try { fonts = await cdp.send('CSS.getPlatformFontsForNode', { nodeId }); } catch (error) { warnings.push(`Fonts for ${backendNodeId}: ${String(error)}`); }
      matched.push({ backendNodeId, evidence, fonts });
    } catch (error) { warnings.push(`Matched CSS for ${backendNodeId}: ${String(error)}`); }
  }
  let ruleUsage: unknown = null;
  try { ruleUsage = await cdp.send('CSS.takeCoverageDelta'); } catch (error) { warnings.push(`Rule usage unavailable: ${String(error)}`); }
  return { stylesheets, media, matched, ruleUsage };
}
