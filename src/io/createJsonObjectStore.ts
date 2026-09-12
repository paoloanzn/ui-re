import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
/** Store one CDP rule or one normalized node's CSS, never a frame-wide collection. */
export async function createJsonObjectStore(root:string,directory:string):Promise<{put:(value:unknown)=>Promise<string>}> {
  await mkdir(join(root,directory),{recursive:true});
  const known=new Set<string>();
  return {put:async(value:unknown):Promise<string>=>{
    // Individual records already fit in one CDP response. Native serialization keeps
    // repeated-rule hashing inexpensive; aggregate documents use writeJson's stream.
    const serialized=JSON.stringify(value);
    if(serialized===undefined)throw new TypeError('Expected a JSON object');
    const id=createHash('sha256').update(serialized).digest('hex');const file=`${directory}/${id}.json`;
    if(!known.has(id)) {
      try {await writeFile(join(root,file),serialized,{flag:'wx'});}catch(error){if(!(error instanceof Error&&'code' in error&&error.code==='EEXIST'))throw error;}
      known.add(id);
    }
    return file;
  }};
}
