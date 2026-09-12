import type { UiTree } from '../contracts/UiTree.js';
import type { TokenCandidate } from './tokenStatistics.js';
/** Accumulate counts, not frame trees. */
export function createTokenStatistics():{add:(tree:UiTree)=>void;values:()=>TokenCandidate[]} {
  const counts=new Map<string,TokenCandidate>();
  return {
    add:(tree:UiTree):void=>{
      for(const node of tree.nodes) {
        if(!node.visible||node.tag==='#text')continue;
        for(const [property,value] of Object.entries(node.styles)) {
          if(!/color|margin|padding|gap|width|height|radius|font|line-height|letter-spacing|shadow/.test(property)||['none','normal','auto','0px','rgba(0, 0, 0, 0)'].includes(value))continue;
          const key=JSON.stringify([property,value]);counts.set(key,{property,value,count:(counts.get(key)?.count??0)+1});
        }
      }
    },
    values:():TokenCandidate[]=>[...counts.values()].filter(item=>item.count>1).sort((a,b)=>b.count-a.count||a.property.localeCompare(b.property)||a.value.localeCompare(b.value)),
  };
}
