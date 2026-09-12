import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { UiManifest } from '../contracts/UiManifest.js';
import { bundlePath } from './bundlePath.js';
/** Freeze reference pixels and geometry, not just the manifest's path. */
export async function referenceDigest(root: string, manifest: UiManifest): Promise<string> {
  const hash = createHash('sha256').update(JSON.stringify(manifest));
  for (const frame of manifest.frames) {
    for (const file of [frame.tree, frame.screenshot]) hash.update(await readFile(await bundlePath(root, file)));
  }
  return hash.digest('hex');
}
