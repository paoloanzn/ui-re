import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparePixels } from './comparePixels.js';
test('pixel comparison detects edits, applies tolerance and reports tile bounds',()=>{
 const a={width:2,height:1,data:new Uint8Array([0,0,0,255,20,20,20,255])};
 const b={width:2,height:1,data:new Uint8Array([0,0,0,255,40,20,20,255])};
 assert.equal(comparePixels(a,a,0).error,0);assert.equal(comparePixels(a,b,16).error,0.5);assert.equal(comparePixels(a,b,20).error,0);
 assert.equal(comparePixels(a,b,16).regions[0]?.changedPixels,1);
 assert.equal(comparePixels(a,{width:1,height:1,data:a.data.slice(0,4)},16).dimensionsMatch,false);
});
