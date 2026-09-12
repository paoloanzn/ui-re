import { z } from 'zod';
/** Authored CSS stored outside a normalized tree; path is relative to its IR bundle. */
export const CssReference=z.object({file:z.string().regex(/^css\/[a-f0-9]{64}\.json$/)}).strict();
