import type { CDPSession } from 'playwright';
import { RawFrame } from '../contracts/RawFrame.js';
import type { Snapshot } from '../contracts/Snapshot.js';
export async function captureAccessibility(session: CDPSession, snapshot: Snapshot, warnings: string[]): Promise<RawFrame['accessibility']> {
  const main = RawFrame.shape.accessibility.parse(await session.send('Accessibility.getFullAXTree'));
  for (const document of snapshot.documents.slice(1)) {
    const frameId = snapshot.strings[document.frameId];
    if (!frameId) { warnings.push('Child document has no accessible frame ID'); continue; }
    try {
      const child = RawFrame.shape.accessibility.parse(await session.send('Accessibility.getFullAXTree', { frameId }));
      main.nodes.push(...child.nodes);
    } catch (error) { warnings.push(`Child-frame accessibility ${frameId} unavailable: ${String(error)}`); }
  }
  return main;
}
