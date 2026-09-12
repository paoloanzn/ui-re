import { z } from 'zod';
const path=z.string().regex(/^[a-zA-Z0-9_./-]+$/).refine(value=>!value.startsWith('/')&&!value.split('/').includes('..'));
export const CssArchive=z.object({
  format:z.literal('css-archive-v1'),
  stylesheets:z.array(z.object({id:z.string(),url:z.string(),file:path})),
  matched:z.array(path),
  media:z.unknown(),ruleUsage:z.unknown(),
  nodes:z.number().int().nonnegative(),
}).strict();
export type CssArchive=z.infer<typeof CssArchive>;
