import { z } from 'zod';
const bounds = z.tuple([z.number(), z.number(), z.number().nonnegative(), z.number().nonnegative()]);
export const UiTree = z.object({
  version: z.literal(1), frameId: z.string(), warnings: z.array(z.string()),
  documents: z.array(z.object({index:z.number().int(),url:z.string(),title:z.string(),frameId:z.string(),scroll:z.object({x:z.number(),y:z.number()})})).default([]),
  nodes: z.array(z.object({
    id: z.string(), parent: z.string().nullable(), children: z.array(z.string()),
    document: z.number().int(), backendNodeId: z.number().int(), fingerprint: z.string(),
    tag: z.string(), text: z.string(), attributes: z.record(z.string(), z.string()),
    bounds: bounds.nullable(), styles: z.record(z.string(), z.string()),
    visible: z.boolean(), role: z.string().optional(), name: z.string().optional(),
    paintOrder: z.number().optional(), css: z.unknown().optional(), fonts: z.unknown().optional(),
  }).strict()),
  regions: z.array(z.object({ id: z.string(), node: z.string(), bounds })),
}).strict();
export type UiTree = z.infer<typeof UiTree>;
