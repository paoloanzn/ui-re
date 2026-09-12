import type { Page } from 'playwright';
import type { CaptureConfig } from '../contracts/CaptureConfig.js';
export async function applyActions(page: Page, actions: CaptureConfig['states'][number]['actions']): Promise<void> {
  for (const action of actions) {
    switch (action.type) {
      case 'click': await page.locator(action.selector).click(); break;
      case 'hover': await page.locator(action.selector).hover(); break;
      case 'fill': await page.locator(action.selector).fill(action.value); break;
      case 'press': await page.locator(action.selector).press(action.key); break;
      case 'wait': await page.locator(action.selector).waitFor({ state: 'visible' }); break;
      case 'scroll': await page.evaluate(({ x, y }) => window.scrollTo(x, y), action); break;
      default: { const exhaustive: never = action; throw new Error(`Unsupported action: ${String(exhaustive)}`); }
    }
  }
}
