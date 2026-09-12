import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from './normalize.js';
import { computedStyles } from './computedStyles.js';
import { RawFrame } from '../contracts/RawFrame.js';
import { canCollapse } from './canCollapse.js';
import { tokenStatistics } from './tokenStatistics.js';
import { matchNodes } from './matchNodes.js';
function fixture():RawFrame {
 const strings=['#document','DIV','SCRIPT','#text','Hello','secret','block','0','rgb(1, 2, 3)','1'];
 return RawFrame.parse({version:1,snapshot:{strings,documents:[{documentURL:0,title:0,frameId:0,nodes:{parentIndex:[-1,0,1,1,3],nodeType:[9,1,3,1,3],nodeName:[0,1,3,2,3],nodeValue:[0,0,4,0,5],backendNodeId:[1,2,3,4,5],attributes:[[],[],[],[],[]]},layout:{nodeIndex:[1,2],styles:[[...computedStyles.map(key=>key==='opacity'?7:key==='color'?8:6)],[...computedStyles.map(key=>key==='opacity'?9:key==='color'?8:6)]],bounds:[[0,0,100,100],[0,0,40,20]],text:[0,4]}}]},accessibility:{nodes:[]},css:{stylesheets:[],media:null,matched:[],ruleUsage:null},warnings:[]});
}
test('normalization removes script subtrees and propagates invisible opacity',()=>{
 const tree=normalize(fixture(),'frame',{rewrite:value=>value});
 assert.equal(tree.nodes.length,3);assert.ok(!JSON.stringify(tree).includes('secret'));assert.equal(tree.nodes.find(node=>node.text==='Hello')?.visible,false);
});
test('wrapper collapsing requires proven lack of layout and semantic contribution',()=>{
 const node=normalize(fixture(),'frame',{rewrite:value=>value}).nodes[1];assert.ok(node);
 assert.equal(canCollapse(node),false);assert.equal(canCollapse({...node,text:'',styles:{display:'contents'},attributes:{}}),true);
 assert.equal(canCollapse({...node,text:'',styles:{display:'contents',padding:'10px'},attributes:{}}),false);
 assert.equal(canCollapse({...node,text:'',styles:{display:'contents'},attributes:{role:'navigation'}}),false);
});
test('statistics and correspondence retain objective values',()=>{
 const tree=normalize(fixture(),'frame',{rewrite:value=>value});for(const node of tree.nodes)node.visible=true;
 const duplicate={...tree,frameId:'other'};
 assert.ok(tokenStatistics([tree,duplicate]).some(token=>token.value==='rgb(1, 2, 3)'));
 assert.equal(matchNodes(tree,duplicate).unmatchedReference.length,0);
});
