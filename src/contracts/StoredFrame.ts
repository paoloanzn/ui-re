import { z } from 'zod';
import { RawFrame } from './RawFrame.js';
import { CssArchive } from './CssArchive.js';
/** V1 remains readable; V2 moves unbounded CSS collections out of the frame. */
export const StoredFrame=z.union([RawFrame,RawFrame.extend({version:z.literal(2),css:CssArchive})]);
export type StoredFrame=z.infer<typeof StoredFrame>;
