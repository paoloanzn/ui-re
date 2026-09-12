import { z } from 'zod';

const viewport = z.object({ width: z.number().int().min(240).max(7680), height: z.number().int().min(240).max(4320), dpr: z.number().min(0.5).max(4).default(1) }).strict();
const action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('click'), selector: z.string().min(1) }).strict(),
  z.object({ type: z.literal('hover'), selector: z.string().min(1) }).strict(),
  z.object({ type: z.literal('fill'), selector: z.string().min(1), value: z.string() }).strict(),
  z.object({ type: z.literal('press'), selector: z.string().min(1), key: z.string() }).strict(),
  z.object({ type: z.literal('scroll'), x: z.number().nonnegative(), y: z.number().nonnegative() }).strict(),
  z.object({ type: z.literal('wait'), selector: z.string().min(1) }).strict(),
]);
export const CaptureConfig = z.object({
  version: z.literal(1).default(1),
  url: z.url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'Only HTTP(S) targets are supported'),
  viewports: z.array(viewport).min(1).default([{ width: 390, height: 844, dpr: 1 }, { width: 1440, height: 900, dpr: 1 }]),
  discoverBreakpoints: z.boolean().default(true),
  maxDiscoveredViewports: z.number().int().min(0).max(30).default(9),
  states: z.array(z.object({ id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/), path: z.string().startsWith('/').optional(), actions: z.array(action).default([]) }).strict()).min(1).default([{ id: 'default', actions: [] }]),
  settleMs: z.number().int().min(0).max(10000).default(150),
  timeoutMs: z.number().int().min(1000).max(120000).default(30000),
  maxAssetBytes: z.number().int().positive().max(100000000).default(10000000),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.viewports.map(viewport => JSON.stringify(viewport))).size !== value.viewports.length) ctx.addIssue({ code: 'custom', message: 'Viewports must be unique' });
  if (new Set(value.states.map(state => state.id)).size !== value.states.length) ctx.addIssue({ code: 'custom', message: 'State IDs must be unique' });
});
export type CaptureConfig = z.infer<typeof CaptureConfig>;
