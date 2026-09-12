import { z } from 'zod';
/** IDs become filenames, so accept one path-safe segment only. */
export const ArtifactId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/);
