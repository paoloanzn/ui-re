import { browserOptions } from '../../scripts/browser-options.mjs';
import { chromium, type Browser } from 'playwright';
import { z } from 'zod';
const environment = z.object({ UI_RE_CHROMIUM: z.string().min(1).optional() });
export async function launchBrowser(): Promise<Browser> {
  environment.parse(process.env);
  return chromium.launch({ headless: true, chromiumSandbox: true, ...browserOptions(chromium.executablePath()) });
}
