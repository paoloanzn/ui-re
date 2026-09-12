import type { UiTree } from '../contracts/UiTree.js';
export type NodeMatch = { readonly from: string; readonly to: string; readonly method: 'explicit' | 'fingerprint' | 'structure'; readonly boundsDelta: readonly number[] | null; readonly styleDelta: Readonly<Record<string,{readonly from:string;readonly to:string}>> };
export function matchNodes(reference: UiTree, target: UiTree): { matches: NodeMatch[]; unmatchedReference: string[]; unmatchedTarget: string[] } {
  const remainingReference = new Set(reference.nodes.map(node => node.id));
  const remainingTarget = new Set(target.nodes.map(node => node.id));
  const matches: NodeMatch[] = [];
  const group=(nodes:UiTree['nodes'],key:(node:UiTree['nodes'][number])=>string|undefined):Map<string,UiTree['nodes']>=>{
    const result=new Map<string,UiTree['nodes']>();for(const node of nodes){const value=key(node);if(value===undefined)continue;const entries=result.get(value)??[];entries.push(node);result.set(value,entries);}return result;
  };
  const anchors=group(target.nodes,node=>node.attributes['data-ui-re-id']);
  const sourceFingerprints=group(reference.nodes,node=>node.fingerprint);
  const targetFingerprints=group(target.nodes,node=>node.fingerprint);
  const targetIds=new Map(target.nodes.map(node=>[node.id,node]));
  const add = (node: UiTree['nodes'][number], other: UiTree['nodes'][number], method: NodeMatch['method']): void => {
    remainingReference.delete(node.id); remainingTarget.delete(other.id);
    const styleDelta: Record<string,{from:string;to:string}> = {};
    for (const key of new Set([...Object.keys(node.styles), ...Object.keys(other.styles)])) {
      if (node.styles[key] !== other.styles[key]) styleDelta[key] = {from:node.styles[key] ?? '',to:other.styles[key] ?? ''};
    }
    matches.push({from:node.id,to:other.id,method,boundsDelta:node.bounds && other.bounds ? other.bounds.map((value,index) => value-(node.bounds?.[index] ?? 0)):null,styleDelta});
  };
  // Reserve explicit anchors before less specific matching can consume them.
  for (const node of reference.nodes) {
    const anchor = node.attributes['data-ui-re-id'] ?? node.id;
    const candidates = anchors.get(anchor)??[];
    if (candidates.length === 1 && candidates[0] && remainingTarget.has(candidates[0].id)) add(node,candidates[0],'explicit');
  }
  for (const node of reference.nodes) {
    if (!remainingReference.has(node.id)) continue;
    const sourceCount = sourceFingerprints.get(node.fingerprint)?.length??0;
    const candidates = targetFingerprints.get(node.fingerprint)??[];
    const other = sourceCount === 1 && candidates.length === 1 ? candidates[0] : undefined;
    if (other && remainingTarget.has(other.id) && !other.attributes['data-ui-re-id']) add(node,other,'fingerprint');
  }
  for (const node of reference.nodes) {
    if (!remainingReference.has(node.id)) continue;
    const other = targetIds.get(node.id);
    if (other && remainingTarget.has(other.id) && !other.attributes['data-ui-re-id'] && other.tag === node.tag && other.text === node.text) add(node,other,'structure');
  }
  return {matches,unmatchedReference:[...remainingReference],unmatchedTarget:[...remainingTarget]};
}
