import { z } from 'zod';
const indexes = z.array(z.number().int());
const rects = z.array(z.tuple([z.number(), z.number(), z.number(), z.number()]));
/** Validate the consumed CDP fields; retain experimental fields in the raw archive. */
export const Snapshot = z.object({
  strings: z.array(z.string()),
  documents: z.array(z.object({
    documentURL: z.number().int(), title: z.number().int(), frameId: z.number().int(),
    scrollOffsetX: z.number().optional(), scrollOffsetY: z.number().optional(),
    nodes: z.object({ parentIndex: indexes, nodeType: indexes, nodeName: indexes, nodeValue: indexes, backendNodeId: indexes, attributes: z.array(indexes), contentDocumentIndex: z.object({ index: indexes, value: indexes }).optional() }).passthrough(),
    layout: z.object({ nodeIndex: indexes, styles: z.array(indexes), bounds: rects, text: indexes, paintOrders: indexes.optional() }).passthrough(),
  }).passthrough()),
}).passthrough();
export type Snapshot = z.infer<typeof Snapshot>;
