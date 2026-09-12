import type { RawFrame } from '../contracts/RawFrame.js';
import { UiTree } from '../contracts/UiTree.js';
import { computedStyles } from './computedStyles.js';
import { fingerprint } from './fingerprint.js';
import { compactCss } from './compactCss.js';
import { canCollapse } from './canCollapse.js';

export type NormalizeOptions = { readonly rewrite: (value: string) => string };
const noise = new Set(['script','style','meta','link','head','title','noscript']);
const meaningfulAttribute = /^(id|class|role|aria-[\w-]+|alt|title|href|src|srcset|type|name|value|placeholder|disabled|checked|selected|open|tabindex|for|viewBox|viewbox|d|fill|stroke|width|height|x|y|cx|cy|r|points|xmlns|data-ui-re-id|preserveAspectRatio|preserveaspectratio|transform|gradientUnits|gradientunits|gradientTransform|gradienttransform|x1|x2|y1|y2|offset|stop-color|stop-opacity|clip-path|mask|filter|vector-effect|stroke-width|stroke-linecap|stroke-linejoin|stroke-dasharray|fill-rule|opacity)$/;
export function normalize(raw: RawFrame, frameId: string, options: NormalizeOptions): UiTree {
  const strings = raw.snapshot.strings;
  const stringAt = (index: number | undefined): string => index === undefined ? '' : strings[index] ?? '';
  const nodes: UiTree['nodes'] = [];
  const warnings = [...raw.warnings];
  raw.snapshot.documents.forEach((doc, document) => {
    const layoutByNode = new Map(doc.layout.nodeIndex.map((node,index) => [node,index]));
    const ids = new Map<number,string>();
    const excluded = new Set<number>();
    const paths = new Map<number,string>();
    doc.nodes.nodeName.forEach((nameIndex,index) => {
      const tag = stringAt(nameIndex).toLowerCase();
      const parentIndex = doc.nodes.parentIndex[index] ?? -1;
      if (noise.has(tag) || excluded.has(parentIndex)) { excluded.add(index); return; }
      const nodeType = doc.nodes.nodeType[index];
      if (nodeType !== 1 && nodeType !== 3 && nodeType !== 9) return;
      const attributes: Record<string,string> = {};
      const attr = doc.nodes.attributes[index] ?? [];
      for (let position=0;position<attr.length;position+=2) { const key=stringAt(attr[position]); if (meaningfulAttribute.test(key)) attributes[key]=options.rewrite(stringAt(attr[position+1])); }
      let text = options.rewrite(stringAt(doc.nodes.nodeValue[index]).replace(/\s+/g,' ').trim());
      const path = `${paths.get(parentIndex) ?? `document-${document}`}/${tag}[${index}]`;
      paths.set(index,path);
      const id = `n-${fingerprint(path)}`; ids.set(index,id);
      const layoutIndex = layoutByNode.get(index);
      const styles: Record<string,string> = {};
      if (layoutIndex !== undefined) (doc.layout.styles[layoutIndex] ?? []).forEach((value,position) => { const key=computedStyles[position]; if(key) styles[key]=options.rewrite(stringAt(value)); });
      if (/^(pre|break-spaces)/.test(styles['white-space'] ?? '')) text=options.rewrite(stringAt(doc.nodes.nodeValue[index]));
      const bounds = layoutIndex === undefined ? null : doc.layout.bounds[layoutIndex] ?? null;
      const backendNodeId = doc.nodes.backendNodeId[index] ?? -1;
      const ax = raw.accessibility.nodes.find(item => item.backendDOMNodeId === backendNodeId && !item.ignored);
      const role = typeof ax?.role?.value === 'string' ? ax.role.value : undefined;
      const name = typeof ax?.name?.value === 'string' ? options.rewrite(ax.name.value) : undefined;
      const css = raw.css.matched.find(item => item.backendNodeId === backendNodeId);
      const cssEvidence = css ? compactCss(css.evidence) : undefined;
      if (cssEvidence && typeof cssEvidence === 'object' && 'warning' in cssEvidence) warnings.push(`${id}: ${String(cssEvidence.warning)}`);
      const visible = !!bounds && bounds[2]>0 && bounds[3]>0 && styles['display']!=='none' && styles['visibility']!=='hidden' && styles['visibility']!=='collapse' && Number(styles['opacity'] ?? '1')>0.001;
      nodes.push({ id, parent: ids.get(parentIndex) ?? null, children: [], document, backendNodeId, fingerprint: fingerprint(JSON.stringify([tag,text,attributes['id'],attributes['role'],attributes['aria-label'],attributes['alt'],attributes['href'],name])), tag,text,attributes,bounds,styles,visible, ...(role ? {role}:{}), ...(name ? {name}:{}), ...(layoutIndex !== undefined && doc.layout.paintOrders?.[layoutIndex] !== undefined ? {paintOrder:doc.layout.paintOrders[layoutIndex]}:{}), ...(css ? {css:cssEvidence,fonts:css.fonts}:{}) });
    });
  });
  const byId = new Map(nodes.map(node => [node.id,node]));
  for (const node of nodes) if(node.parent) byId.get(node.parent)?.children.push(node.id);
  // Opacity applies to the entire subtree even when descendants report opacity:1.
  for (const node of nodes) {
    let parent = node.parent ? byId.get(node.parent) : undefined;
    let opacity=Number(node.styles['opacity'] ?? '1');
    while(parent) { opacity*=Number(parent.styles['opacity'] ?? '1'); if(opacity<=0.001 || Number(parent.styles['opacity'] ?? '1')<=0.001 || parent.styles['display']==='none') { node.visible=false; break; } parent=parent.parent ? byId.get(parent.parent):undefined; }
  }
  const collapsed = new Set<string>();
  for (const node of nodes) if(canCollapse(node)) {
    const parent=node.parent ? byId.get(node.parent):undefined;
    if(parent) parent.children=parent.children.flatMap(id => id===node.id ? node.children:[id]);
    for(const childId of node.children) { const child=byId.get(childId); if(child) child.parent=node.parent; }
    collapsed.add(node.id);
  }
  const retained=nodes.filter(node => !collapsed.has(node.id));
  const regions = retained.filter(node => node.visible && node.bounds && node.tag!=='#text' && node.bounds[2]*node.bounds[3]>=10000 && node.children.length>0).sort((a,b) => (b.bounds?.[2] ?? 0)*(b.bounds?.[3] ?? 0)-(a.bounds?.[2] ?? 0)*(a.bounds?.[3] ?? 0)).slice(0,20).flatMap(node => node.bounds ? [{id:`region-${node.id}`,node:node.id,bounds:node.bounds}]:[]);
  if(raw.snapshot.documents.length>1) warnings.push('Child document coordinates are local to their document; inspect frame metadata before comparing global geometry.');
  return UiTree.parse({version:1,frameId,warnings,nodes:retained,regions,documents:raw.snapshot.documents.map((doc,index)=>({index,url:options.rewrite(stringAt(doc.documentURL)),title:options.rewrite(stringAt(doc.title)),frameId:stringAt(doc.frameId),scroll:{x:doc.scrollOffsetX??0,y:doc.scrollOffsetY??0}}))});
}
