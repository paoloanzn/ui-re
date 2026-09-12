import { join } from 'node:path';
import { CaptureBundle } from '../contracts/CaptureBundle.js';
import { CaptureConfig } from '../contracts/CaptureConfig.js';
import { readJson } from './readJson.js';
import { capture, type CaptureDependencies } from './capture.js';
/** Re-render precisely the captured states/viewports; target actions may be mapped explicitly. */
export async function render(referencePath:string,url:string,outputPath:string,deps:CaptureDependencies,states?:CaptureConfig['states']):Promise<void> {
  const reference=await readJson(join(referencePath,'capture.json'),CaptureBundle);
  const viewports=[...new Map(reference.frames.map(frame=>[JSON.stringify(frame.viewport),frame.viewport])).values()];
  await capture({...reference.config,url,viewports,discoverBreakpoints:false,...(states?{states}:{})},outputPath,deps);
}
