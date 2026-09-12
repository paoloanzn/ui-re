import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
/** Refuse existing output, preserving resumable evidence and previous iterations. */
export async function createOutput(path: string): Promise<string> {
  const output = resolve(path);
  await mkdir(dirname(output), { recursive: true });
  await mkdir(output);
  return output;
}
