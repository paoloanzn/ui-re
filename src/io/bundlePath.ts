import { realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
/** Resolve existing evidence files without following links outside their bundle. */
export async function bundlePath(root: string, file: string): Promise<string> {
  const base = await realpath(root);
  const target = await realpath(resolve(base, file));
  const path = relative(base, target);
  if (path === '..' || path.startsWith('../') || path.startsWith('..\\') || isAbsolute(path)) {
    throw new Error(`Evidence path escapes bundle: ${file}`);
  }
  return target;
}
