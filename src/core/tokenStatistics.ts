import type { UiTree } from '../contracts/UiTree.js';
export type TokenCandidate = { readonly property: string; readonly value: string; readonly count: number };
export function tokenStatistics(trees: readonly UiTree[]): TokenCandidate[] {
  const values = new Map<string,TokenCandidate>();
  for(const tree of trees) for(const node of tree.nodes) {
    if(!node.visible || node.tag==='#text') continue;
    for(const [property,value] of Object.entries(node.styles)) {
      if(!/color|margin|padding|gap|width|height|radius|font|line-height|letter-spacing|shadow/.test(property)) continue;
      if(['none','normal','auto','0px','rgba(0, 0, 0, 0)'].includes(value)) continue;
      const key=JSON.stringify([property,value]); const existing=values.get(key);
      values.set(key,{property,value,count:(existing?.count ?? 0)+1});
    }
  }
  return [...values.values()].filter(item => item.count>1).sort((a,b) => b.count-a.count || a.property.localeCompare(b.property) || a.value.localeCompare(b.value));
}
