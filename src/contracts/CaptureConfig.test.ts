import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CaptureConfig } from './CaptureConfig.js';
test('rejects unsafe URLs, duplicate states and unrecognized actions', () => {
  assert.equal(CaptureConfig.safeParse({ url: 'file:///etc/passwd' }).success, false);
  assert.equal(CaptureConfig.safeParse({ url: 'https://example.com', states: [{id:'x'}, {id:'x'}] }).success, false);
  assert.equal(CaptureConfig.safeParse({ url: 'https://example.com', states: [{id:'x',actions:[{type:'eval',code:'bad'}]}] }).success, false);
});
test('populates bounded reproducible defaults', () => {
  const config = CaptureConfig.parse({url:'https://example.com'});
  assert.equal(config.version, 1);
  assert.equal(config.states[0]?.id, 'default');
  assert.equal(config.viewports.length, 2);
});
