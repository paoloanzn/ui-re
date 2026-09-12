import { z } from 'zod';
export const VerificationConfig=z.object({version:z.literal(1).default(1),maxPixelError:z.number().min(0).max(1).default(0.01),pixelTolerance:z.number().int().min(0).max(255).default(16),maxGeometryDelta:z.number().nonnegative().default(2),minGeometryCoverage:z.number().min(0).max(1).default(0.9),maxIterations:z.number().int().min(1).max(100).default(5)}).strict();
export type VerificationConfig=z.infer<typeof VerificationConfig>;
