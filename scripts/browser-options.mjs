import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
/** Prefer configured or managed Chromium, then an existing platform installation. */
export function browserOptions(managedExecutable) {
  if(typeof managedExecutable!=='string')throw Error('Expected managed browser executable path');
  if(process.env.UI_RE_CHROMIUM)return {executablePath:process.env.UI_RE_CHROMIUM};
  if(existsSync(managedExecutable))return {executablePath:managedExecutable};
  const candidates=process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium']:process.platform==='win32'?[join(process.env.PROGRAMFILES??'C:\\Program Files','Google/Chrome/Application/chrome.exe'),join(process.env.LOCALAPPDATA??'','Google/Chrome/Application/chrome.exe')]:['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'];
  for(const directory of (process.env.PATH??'').split(delimiter))if(directory)for(const name of ['chromium','chromium-browser','google-chrome'])candidates.push(join(directory,name));
  const executablePath=candidates.find(path=>existsSync(path));
  return executablePath?{executablePath}:{};
}
