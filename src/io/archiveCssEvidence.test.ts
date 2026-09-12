import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createJsonObjectStore } from './createJsonObjectStore.js';
import { archiveCssEvidence } from './archiveCssEvidence.js';
import { createCssReader } from './createCssReader.js';
test('repeated CSS rules are stored once and full evidence roundtrips',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ui-re-css-'));
 try{
  const store=await createJsonObjectStore(root,'css/objects');
  const rule={origin:'regular',selectorList:{text:'.card'},style:{cssProperties:[{name:'width',value:'100%'}]}};
  const evidence={matchedCSSRules:[{rule,matchingSelectors:[0]}],inherited:Array.from({length:20},()=>({matchedCSSRules:[{rule,matchingSelectors:[0]}]})),futureField:{untouched:42}};
  const archived=await archiveCssEvidence(evidence,store);
  await archiveCssEvidence(evidence,store);
  assert.equal((await readdir(join(root,'css/objects'))).length,1);
  assert.deepEqual(await createCssReader(root).expand(archived),evidence);
 }finally{await rm(root,{recursive:true,force:true});}
});
