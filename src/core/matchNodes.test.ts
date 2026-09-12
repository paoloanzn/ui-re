import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiTree } from '../contracts/UiTree.js';
import { matchNodes } from './matchNodes.js';
function tree(ids:string[]):UiTree {
 return UiTree.parse({version:1,frameId:'test',warnings:[],nodes:ids.map(id=>({id,parent:null,children:[],document:0,backendNodeId:1,fingerprint:'same',tag:'div',text:'',attributes:{},bounds:[0,0,100,20],styles:{},visible:true})),regions:[]});
}
test('ambiguous fingerprints remain unmatched after DOM replacement',()=>{
 assert.equal(matchNodes(tree(['a','b']),tree(['c'])).matches.length,0);
 assert.equal(matchNodes(tree(['a','b']),tree(['a','b'])).matches.length,2);
});
test('explicit anchors reserve the intended node before fingerprint matching',()=>{
 const target=tree(['c']);const node=target.nodes[0];assert.ok(node);node.attributes['data-ui-re-id']='b';
 const result=matchNodes(tree(['a','b']),target);assert.equal(result.matches[0]?.from,'b');assert.deepEqual(result.unmatchedReference,['a']);
});
