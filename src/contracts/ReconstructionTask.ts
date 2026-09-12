import { z } from 'zod';
export const ReconstructionTask=z.object({version:z.literal(1),framework:z.string().min(1),shadcn:z.boolean(),evidence:z.string().min(1),frames:z.array(z.string()),status:z.literal('awaiting-agent-implementation')}).strict();
export type ReconstructionTask=z.infer<typeof ReconstructionTask>;
