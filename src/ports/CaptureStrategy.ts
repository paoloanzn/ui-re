import type { CDPSession } from 'playwright';
import type { Snapshot } from '../contracts/Snapshot.js';
export type CaptureStrategy = {
  readonly id: string;
  readonly capture: (session: CDPSession) => Promise<Snapshot>;
};
