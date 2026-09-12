import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { writeJson } from './writeJson.js';
test('JSON writer roundtrips without overwriting evidence',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ui-re-json-'));
 try{const path=join(root,'value.json');const value={text:'a\n😀'.repeat(40000),items:[1,null,true]};await writeJson(path,value);assert.deepEqual(JSON.parse(await readFile(path,'utf8')),value);await assert.rejects(writeJson(path,{}),/EEXIST/);}
 finally{await rm(root,{recursive:true,force:true});}
});
test('JSON output exceeds V8 string limit with a 96MB heap',{skip:process.env.UI_RE_STRESS!=='1',timeout:120000},async()=>{
 const root=await mkdtemp(join(tmpdir(),'ui-re-json-stress-'));
 try{
  const script=`import {writeJson} from ${JSON.stringify(new URL('../../dist/io/writeJson.js',import.meta.url).href)};
import {constants} from 'node:buffer';import {stat} from 'node:fs/promises';
const payload='x'.repeat(65536);const count=Math.ceil((constants.MAX_STRING_LENGTH+1)/payload.length);
await writeJson(${JSON.stringify(join(root,'large.json'))},Array(count).fill(payload));
console.log(JSON.stringify({bytes:(await stat(${JSON.stringify(join(root,'large.json'))})).size,limit:constants.MAX_STRING_LENGTH,rss:process.memoryUsage().rss}));`;
  const child=spawnSync(process.execPath,['--max-old-space-size=96','--input-type=module','-e',script],{encoding:'utf8',timeout:110000});
  assert.equal(child.status,0,child.stderr);
  const result=z.object({bytes:z.number(),limit:z.number(),rss:z.number()}).parse(JSON.parse(child.stdout) as unknown);
  assert.ok(result.bytes>result.limit);assert.ok(result.rss<256*1024*1024,`RSS ${result.rss}`);
  console.log(`Large JSON: ${result.bytes} bytes; V8 limit ${result.limit}; RSS ${result.rss}`);
 }finally{await rm(root,{recursive:true,force:true});}
});
