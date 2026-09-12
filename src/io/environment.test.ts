import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, cp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
const reportSchema=z.object({ok:z.boolean(),checks:z.array(z.object({name:z.string(),ok:z.boolean(),detail:z.string()}))});
test('dependency-free preflight diagnoses missing packages and setup refuses unapproved changes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ui-re-env-'));
 try{
  await mkdir(join(root,'scripts'));await cp(new URL('../../scripts/browser-options.mjs',import.meta.url),join(root,'scripts/browser-options.mjs'));await cp(new URL('../../scripts/check-environment.mjs',import.meta.url),join(root,'scripts/check-environment.mjs'));await cp(new URL('../../scripts/setup.mjs',import.meta.url),join(root,'scripts/setup.mjs'));
  await writeFile(join(root,'package.json'),JSON.stringify({type:'module',dependencies:{'ui-re-deliberately-missing':'1.0.0'}}));
  const check=spawnSync(process.execPath,[join(root,'scripts/check-environment.mjs'),root],{encoding:'utf8'});
  assert.equal(check.status,1);const data=reportSchema.parse(JSON.parse(check.stdout) as unknown);assert.equal(data.ok,false);assert.match(data.checks.find(item=>item.name==='dependencies')?.detail??'',/ui-re-deliberately-missing/);
  await writeFile(join(root,'package.json'),JSON.stringify({dependencies:42}));
  const malformed=spawnSync(process.execPath,[join(root,'scripts/check-environment.mjs'),root],{encoding:'utf8'});
  assert.equal(malformed.status,1);assert.match(malformed.stdout,/Invalid package.json/);
  const setup=spawnSync(process.execPath,[join(root,'scripts/setup.mjs')],{encoding:'utf8'});assert.equal(setup.status,2);assert.match(setup.stderr,/explicit user approval/);
 }finally{await rm(root,{recursive:true,force:true});}
});
