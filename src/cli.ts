import type { VerificationResult } from './contracts/VerificationResult.js';
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { capture } from './io/capture.js';
import { preprocess } from './io/preprocess.js';
import { render } from './io/render.js';
import { verify } from './io/verify.js';
import { prepareReconstruction } from './io/prepareReconstruction.js';
import { launchBrowser } from './io/launchBrowser.js';
import { comparePixels } from './core/comparePixels.js';
import { reactAdapter } from './core/reactAdapter.js';
const commandSchema=z.enum(['capture','preprocess','reconstruct','render','verify','run']);
const optionsSchema=z.object({input:z.string().optional(),output:z.string().min(1),url:z.string().optional(),target:z.string().optional(),config:z.string().optional(),policy:z.string().optional(),shadcn:z.boolean().default(false)}).strict();
async function json(path:string|undefined):Promise<unknown>{return path?JSON.parse(await readFile(path,'utf8')) as unknown:{};}
function required(value:string|undefined,name:string):string{if(!value)throw new Error(`Missing --${name}`);return value;}
function verificationExit(result: VerificationResult): void {
  switch(result.status) {
    case 'compared': console.error(JSON.stringify(result)); if(!result.accepted)process.exitCode=1; break;
    case 'iteration-limit': console.error(JSON.stringify(result)); process.exitCode=1; break;
    case 'policy-conflict': console.error(JSON.stringify(result)); process.exitCode=2; break;
    default: { const exhaustive:never=result; throw new Error(String(exhaustive)); }
  }
}
async function main():Promise<void>{
  const {positionals,values}=parseArgs({allowPositionals:true,options:{input:{type:'string'},output:{type:'string'},url:{type:'string'},target:{type:'string'},config:{type:'string'},policy:{type:'string'},shadcn:{type:'boolean'}}});
  if(positionals.length!==1)throw new Error('Usage: node scripts/ui-re.mjs <capture|preprocess|reconstruct|render|verify|run> --output PATH [--input PATH] [--url URL] [--config FILE] [--target URL_OR_IR] [--policy FILE] [--shadcn]');
  const command=commandSchema.parse(positionals[0]);const args=optionsSchema.parse(values);
  const deps={launch:launchBrowser,now:()=>new Date(),log:(event:unknown)=>console.error(JSON.stringify(event))};
  switch(command){
    case 'capture':{const config=z.record(z.string(),z.unknown()).parse(await json(args.config));await capture({...config,...(args.url?{url:args.url}:{})},args.output,deps);break;}
    case 'preprocess':await preprocess(required(args.input,'input'),args.output);break;
    case 'reconstruct':await prepareReconstruction(required(args.input,'input'),args.output,args.shadcn,reactAdapter);break;
    case 'render':await render(required(args.input,'input'),required(args.url,'url'),args.output,deps);break;
    case 'verify':verificationExit(await verify(required(args.input,'input'),required(args.target,'target'),args.output,await json(args.policy),comparePixels));break;
    case 'run':{
      const config=z.record(z.string(),z.unknown()).parse(await json(args.config));
      await capture({...config,...(args.url?{url:args.url}:{})},join(args.output,'capture'),deps);
      await preprocess(join(args.output,'capture'),join(args.output,'ir'));
      await prepareReconstruction(join(args.output,'ir'),join(args.output,'reconstruction'),args.shadcn,reactAdapter);
      if(args.target){await render(join(args.output,'capture'),args.target,join(args.output,'render'),deps);await preprocess(join(args.output,'render'),join(args.output,'target-ir'));verificationExit(await verify(join(args.output,'ir'),join(args.output,'target-ir'),join(args.output,'verification'),await json(args.policy),comparePixels));}
      else deps.log({phase:'reconstruct',status:'awaiting-agent-implementation',task:join(args.output,'reconstruction/TASK.md')});
      break;
    }
    default:{const exhaustive:never=command;throw new Error(String(exhaustive));}
  }
}
main().catch((error:unknown)=>{console.error(JSON.stringify({error:error instanceof Error?error.message:String(error),status:'failed'}));process.exitCode=2;});
