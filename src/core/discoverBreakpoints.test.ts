import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverBreakpoints } from './discoverBreakpoints.js';
test('extracts media and container evidence including range syntax', () => {
  const result = discoverBreakpoints(['@media (max-width: 48em) {a{}} @container pane (width >= 400px) {b{}} @media (600px < width) {c{}}']);
  assert.equal(result.length, 3);
  assert.deepEqual(result.flatMap(item => item.widths).sort((a,b) => a-b), [400,600,768]);
  assert.ok(result.some(item => item.source === 'container'));
});
test('retains unsupported queries as evidence and deduplicates', () => {
  assert.deepEqual(discoverBreakpoints(['@media print {a{}} @media print {b{}}']), [{ source: 'media', text: 'print', widths: [] }]);
});
