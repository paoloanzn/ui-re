import { z } from 'zod';
import { ArtifactId } from './ArtifactId.js';
const path=z.string().regex(/^[a-zA-Z0-9_./-]+$/).refine(value=>!value.startsWith('/')&&!value.split('/').includes('..'));
export const UiManifest=z.object({version:z.literal(1),sourceUrl:z.url(),assets:path,tokens:path,responsive:path,warnings:z.array(z.string()),frames:z.array(z.object({id:ArtifactId,state:ArtifactId,url:z.url(),viewport:z.object({width:z.number().positive(),height:z.number().positive(),dpr:z.number().positive()}),scroll:z.object({x:z.number(),y:z.number()}),timestamp:z.iso.datetime(),tree:path,screenshot:path}).strict())}).strict();
export type UiManifest=z.infer<typeof UiManifest>;
