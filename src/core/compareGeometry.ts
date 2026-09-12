import type { UiTree } from '../contracts/UiTree.js';
import { matchNodes } from './matchNodes.js';
export function compareGeometry(reference:UiTree,target:UiTree):{coverage:number;maxDelta:number;discrepancies:ReturnType<typeof matchNodes>['matches'];unmatchedReference:string[];unmatchedTarget:string[]} {
  const filter=(tree:UiTree):UiTree=>({...tree,nodes:tree.nodes.filter(node=>node.visible&&node.tag!=='#text'&&node.tag!=='#document')});
  const visible=filter(reference);const matching=matchNodes(visible,filter(target));
  const discrepancies=matching.matches.filter(match=>match.boundsDelta?.some(delta=>Math.abs(delta)>0.01)||Object.keys(match.styleDelta).length>0);
  return {coverage:visible.nodes.length?matching.matches.length/visible.nodes.length:1,maxDelta:Math.max(0,...matching.matches.flatMap(match=>match.boundsDelta?.map(Math.abs)??[])),discrepancies,unmatchedReference:matching.unmatchedReference,unmatchedTarget:matching.unmatchedTarget};
}
