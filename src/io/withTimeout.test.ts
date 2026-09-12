import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTimeout } from './withTimeout.js';

test('protocol deadlines distinguish stalled operations from ordinary errors', async () => {
  assert.equal(await withTimeout(Promise.resolve(42), 1000, 'CSS.getMediaQueries'), 42);
  const failure = new Error('No node with given id');
  await assert.rejects(withTimeout(Promise.reject(failure), 1000, 'CSS.getMatchedStylesForNode'), error => error === failure);
  await assert.rejects(withTimeout(new Promise<never>(() => {}), 10, 'CSS.getMatchedStylesForNode'), error =>
    error instanceof DOMException && error.name === 'TimeoutError' && error.message.includes('CSS.getMatchedStylesForNode'));
});
