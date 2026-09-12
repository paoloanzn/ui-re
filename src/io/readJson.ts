import { readFile } from 'node:fs/promises';
import type { z } from 'zod';
export async function readJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  return schema.parse(value);
}
