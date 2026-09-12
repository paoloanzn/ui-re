import type { Snapshot } from '../contracts/Snapshot.js';
import { computedStyles } from './computedStyles.js';
/** Identify rendered/declared media references; downloading remains at the I/O boundary. */
export function referencedAssets(snapshot: Snapshot, baseUrl: string): string[] {
  const urls = new Set<string>();
  const add = (value: string): void => {
    try { const url=new URL(value,baseUrl); if(['http:','https:','blob:'].includes(url.protocol))urls.add(url.href); } catch { /* Not a resource URL. */ }
  };
  for(const document of snapshot.documents) {
    const base=snapshot.strings[document.documentURL] || baseUrl;
    for(let index=0;index<document.nodes.nodeName.length;index++) {
      const tag=(snapshot.strings[document.nodes.nodeName[index]??-1]??'').toLowerCase();
      if(!['img','source','video','audio','image'].includes(tag))continue;
      const attributes=document.nodes.attributes[index]??[];
      for(let i=0;i<attributes.length;i+=2) {
        const key=snapshot.strings[attributes[i]??-1];const value=snapshot.strings[attributes[i+1]??-1];
        if(value&&key==='srcset'&&!value.startsWith('data:')) for(const candidate of value.split(',')) {const source=candidate.trim().split(/\s+/)[0];if(source){try{add(new URL(source,base).href);}catch{/* Invalid candidate stays in raw evidence. */}}}
        if(value&&['src','poster','href','xlink:href'].includes(key??'')) { try {add(new URL(value,base).href);} catch { /* Invalid source stays in raw evidence. */ } }
      }
    }
    const background=computedStyles.indexOf('background-image');
    for(const style of document.layout.styles) for(const match of (snapshot.strings[style[background]??-1]??'').matchAll(/url\(["']?([^"')]+)["']?\)/g)) if(match[1])add(match[1]);
  }
  return [...urls].sort();
}
