import { open } from 'node:fs/promises';
import { jsonChunks } from '../core/jsonChunks.js';
/** Never materialize the complete JSON document as a V8 string. */
export async function writeJson(path: string, value: unknown): Promise<void> {
  const file=await open(path,'wx');
  try {
    let buffer='';
    for(const chunk of jsonChunks(value)) {
      buffer+=chunk;
      if(buffer.length>=65536) { await file.writeFile(buffer);buffer=''; }
    }
    await file.writeFile(`${buffer}\n`);
  } finally { await file.close(); }
}
