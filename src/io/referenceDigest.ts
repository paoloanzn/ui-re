import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { UiManifest } from '../contracts/UiManifest.js';
import { UiTree } from '../contracts/UiTree.js';
import { CssReference } from '../contracts/CssReference.js';
import { readJson } from './readJson.js';
import { bundlePath } from './bundlePath.js';
/** Freeze reference pixels, geometry and authored CSS, including external records. */
export async function referenceDigest(root: string, manifest: UiManifest): Promise<string> {
  const hash = createHash('sha256').update(JSON.stringify(manifest));
  const seen=new Set<string>();
  const add=async(file:string):Promise<void>=>{
    for await(const chunk of createReadStream(await bundlePath(root,file)))hash.update(chunk);
  };
  for (const frame of manifest.frames) {
    for (const file of [frame.tree, frame.screenshot]) await add(file);
    const tree=await readJson(await bundlePath(root,frame.tree),UiTree);
    for(const node of tree.nodes) {
      if(node.css===null||typeof node.css!=='object'||!('file' in node.css))continue;
      const {file}=CssReference.parse(node.css);
      if(!seen.has(file)){await add(file);seen.add(file);}
    }
  }
  return hash.digest('hex');
}
