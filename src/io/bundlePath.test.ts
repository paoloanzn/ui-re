import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { bundlePath } from './bundlePath.js';
import { ArtifactId } from '../contracts/ArtifactId.js';
test('evidence reads and derived filenames cannot escape their bundle',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ui-re-path-'));
 try{
  await mkdir(join(root,'bundle'));await writeFile(join(root,'outside'),'secret');await symlink(join(root,'outside'),join(root,'bundle/link'));
  await assert.rejects(bundlePath(join(root,'bundle'),'link'),/escapes bundle/);
  await assert.rejects(bundlePath(join(root,'bundle'),'../outside'),/escapes bundle/);
  assert.equal(ArtifactId.safeParse('../../outside').success,false);
 }finally{await rm(root,{recursive:true,force:true});}
});
