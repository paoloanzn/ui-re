import { z } from 'zod';
import { CaptureBundle } from './CaptureBundle.js';
const match=z.object({from:z.string(),to:z.string(),method:z.enum(['explicit','fingerprint','structure']),boundsDelta:z.array(z.number()).nullable(),styleDelta:z.record(z.string(),z.object({from:z.string(),to:z.string()}))});
export const EvidenceIndex={
 assets:z.object({version:z.literal(1),assets:CaptureBundle.shape.assets}).strict(),
 tokens:z.object({version:z.literal(1),candidates:z.array(z.object({property:z.string(),value:z.string(),count:z.number().int().positive()}))}).strict(),
 responsive:z.object({version:z.literal(1),breakpoints:CaptureBundle.shape.breakpoints,correspondence:z.array(z.object({from:z.string(),to:z.string(),matches:z.array(match),unmatchedReference:z.array(z.string()),unmatchedTarget:z.array(z.string())}))}).strict(),
};
