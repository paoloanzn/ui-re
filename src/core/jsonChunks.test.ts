import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsonChunks } from './jsonChunks.js';
test('chunked JSON roundtrips escapes, unicode boundaries and shared objects',()=>{
 const shared={text:'x'.repeat(16383)+'😀\\\n"\t',empty:''};
 const value={a:shared,b:shared,omit:undefined,array:[undefined,null,NaN,true,3]};
 assert.deepEqual(JSON.parse([...jsonChunks(value)].join('')),JSON.parse(JSON.stringify(value)));
 assert.ok([...jsonChunks(value)].every(chunk=>chunk.length<100000));
});
test('chunked JSON rejects cycles',()=>{
 const value:Record<string,unknown>={};value['self']=value;
 assert.throws(()=>[...jsonChunks(value)],/Circular/);
});
