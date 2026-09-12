import { z } from 'zod';
import { VerificationConfig } from './VerificationConfig.js';
const geometry=z.object({coverage:z.number().min(0).max(1),maxDelta:z.number().nonnegative(),discrepancies:z.array(z.object({from:z.string(),to:z.string(),method:z.enum(['explicit','fingerprint','structure']),boundsDelta:z.array(z.number()).nullable(),styleDelta:z.record(z.string(),z.object({from:z.string(),to:z.string()}))})),unmatchedReference:z.array(z.string()),unmatchedTarget:z.array(z.string())});
const base={frame:z.string(),state:z.string(),accepted:z.boolean()};
export const VerificationReport=z.object({version:z.literal(1),iteration:z.number().int().positive(),accepted:z.boolean(),limitReached:z.boolean(),policy:VerificationConfig,frames:z.array(z.union([
 z.object({...base,error:z.string()}).strict(),
 z.object({...base,viewport:z.object({width:z.number().positive(),height:z.number().positive(),dpr:z.number().positive()}),pixels:z.object({error:z.number().min(0).max(1),meanAbsoluteError:z.number().min(0).max(1),changedPixels:z.number().int().nonnegative(),dimensionsMatch:z.boolean(),regions:z.array(z.object({x:z.number().nonnegative(),y:z.number().nonnegative(),width:z.number().positive(),height:z.number().positive(),changedPixels:z.number().int().positive()}))}),geometry,diff:z.string()}).strict(),
]))}).strict();
export type VerificationReport=z.infer<typeof VerificationReport>;
