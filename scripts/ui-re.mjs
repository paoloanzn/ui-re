#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const result=spawnSync(process.execPath,['--import',fileURLToPath(new URL('../node_modules/tsx/dist/loader.mjs',import.meta.url)),fileURLToPath(new URL('../src/cli.ts',import.meta.url)),...process.argv.slice(2)],{stdio:'inherit'});
process.exitCode=result.status??2;
