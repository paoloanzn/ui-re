import { z } from 'zod';
import { Snapshot } from './Snapshot.js';
export const RawFrame = z.object({
  version: z.literal(1), snapshot: Snapshot,
  accessibility: z.object({ nodes: z.array(z.object({ nodeId: z.string(), ignored: z.boolean(), backendDOMNodeId: z.number().optional(), role: z.object({ value: z.unknown().optional() }).passthrough().optional(), name: z.object({ value: z.unknown().optional() }).passthrough().optional() }).passthrough()) }).passthrough(),
  css: z.object({ stylesheets: z.array(z.object({ id: z.string(), url: z.string(), text: z.string() })), media: z.unknown(), matched: z.array(z.object({ backendNodeId: z.number(), evidence: z.unknown(), fonts: z.unknown() })), ruleUsage: z.unknown() }),
  warnings: z.array(z.string()),
}).strict();
export type RawFrame = z.infer<typeof RawFrame>;
