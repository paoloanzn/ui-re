import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { bundlePath } from './bundlePath.js';
/** A bounded LRU avoids rereading shared rules without caching the entire site. */
export function createCssReader(root:string):{expand:(value:unknown)=>Promise<unknown>} {
  const cache=new Map<string,{value:unknown;bytes:number}>();let bytes=0;
  const maxBytes=16*1024*1024;
  const expand=async(value:unknown):Promise<unknown>=>{
    if(Array.isArray(value)){const result:unknown[]=[];for(const item of value)result.push(await expand(item));return result;}
    if(value!==null&&typeof value==='object') {
      if('$cssObject' in value) {
        const ref=z.object({$cssObject:z.string().regex(/^css\/objects\/[a-f0-9]{64}\.json$/)}).strict().parse(value);
        const key=ref.$cssObject;const hit=cache.get(key);
        if(hit){cache.delete(key);cache.set(key,hit);return hit.value;}
        const text=await readFile(await bundlePath(root,key),'utf8');
        const data:unknown=JSON.parse(text);
        if(text.length<=maxBytes) {
          while(bytes+text.length>maxBytes&&cache.size){const first=cache.keys().next().value;if(first===undefined)break;bytes-=cache.get(first)?.bytes??0;cache.delete(first);}
          cache.set(key,{value:data,bytes:text.length});bytes+=text.length;
        }
        return data;
      }
      const result:Record<string,unknown>={};for(const [key,item] of Object.entries(value))result[key]=await expand(item);return result;
    }
    return value;
  };
  return {expand};
}
