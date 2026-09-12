#!/usr/bin/env node
// Checks this package's scalar frontmatter and directly linked resources.
import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {basename,resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const text=await readFile(new URL('../SKILL.md',import.meta.url),'utf8');
const match=/^---\n([\s\S]*?)\n---\n/.exec(text);
if(!match)throw Error('Missing YAML frontmatter');
const fields={};
for(const line of match[1].split('\n')){
 const field=/^([a-z-]+): (.+)$/.exec(line);
 if(!field)throw Error('This package validator expects scalar frontmatter fields');
 if(Object.hasOwn(fields,field[1]))throw Error(`Duplicate field ${field[1]}`);
 fields[field[1]]=field[2];
}
const allowed=['name','description','license','compatibility','allowed-tools'];
for(const key of Object.keys(fields))if(!allowed.includes(key))throw Error(`Unsupported field ${key}`);
if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.name??'')||fields.name.length>64||fields.name!==basename(resolve(root)))throw Error('Skill name must match its directory and naming rules');
if(!fields.description||fields.description.length>1024)throw Error('Description must be 1..1024 characters');
if(fields.compatibility?.length>500)throw Error('Compatibility must be <=500 characters');
if(text.split('\n').length>=500)throw Error('SKILL.md exceeds line guidance');
for(const link of text.matchAll(/\]\((references\/[^)]+)\)/g))await access(resolve(root,link[1]));
console.log(JSON.stringify({ok:true,name:fields.name,lines:text.split('\n').length,referenceLinks:[...text.matchAll(/\]\((references\/[^)]+)\)/g)].length}));
