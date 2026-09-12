import { Snapshot } from '../contracts/Snapshot.js';
import { computedStyles } from '../core/computedStyles.js';
import type { CaptureStrategy } from '../ports/CaptureStrategy.js';
export const domSnapshotStrategy: CaptureStrategy = {
  id: 'domsnapshot-v1',
  capture: async session => Snapshot.parse(await session.send('DOMSnapshot.captureSnapshot', {
    computedStyles: [...computedStyles], includeDOMRects: true, includePaintOrder: true,
  })),
};
