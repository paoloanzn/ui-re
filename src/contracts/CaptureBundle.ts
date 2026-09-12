import { z } from 'zod';
import { ArtifactId } from './ArtifactId.js';
import { CaptureConfig } from './CaptureConfig.js';
const relativePath = z.string().min(1).refine(value => !value.startsWith('/') && !value.includes('\\') && !value.split('/').includes('..') && !value.includes(':'), 'Expected safe relative bundle path');
export const CaptureBundle = z.object({
  version: z.literal(1), config: CaptureConfig,
  toolVersion: z.string(), strategy: z.string().default('domsnapshot-v1'), browserVersion: z.string(), playwrightVersion: z.string(),
  createdAt: z.iso.datetime(), warnings: z.array(z.string()),
  assets: z.array(z.object({ id: z.string(), url: z.string(), mime: z.string(), bytes: z.number().int().nonnegative(), file: relativePath.optional(), warning: z.string().optional() })),
  breakpoints: z.array(z.object({ source: z.enum(['media', 'container']), text: z.string(), widths: z.array(z.number().positive()) })),
  frames: z.array(z.object({
    id: ArtifactId, state: ArtifactId, url: z.url(),
    viewport: z.object({ width: z.number().positive(), height: z.number().positive(), dpr: z.number().positive() }),
    scroll: z.object({ x: z.number(), y: z.number() }), timestamp: z.iso.datetime(),
    screenshot: relativePath, archive: relativePath, raw: relativePath,
  })),
}).strict();
export type CaptureBundle = z.infer<typeof CaptureBundle>;
