import type { UiTree } from '../contracts/UiTree.js';
/** Only display:contents wrappers can be proven not to add a layout box. */
export function canCollapse(node: UiTree['nodes'][number]): boolean {
  if (node.tag !== 'div' && node.tag !== 'span') return false;
  if (node.role || node.name || node.text || Object.keys(node.attributes).some(key => key !== 'class')) return false;
  if (node.styles['display'] !== 'contents') return false;
  const defaults: Record<string, readonly string[]> = {
    position: ['static'], transform: ['none'], opacity: ['1'], visibility: ['visible'],
    'background-color': ['rgba(0, 0, 0, 0)', 'transparent'], 'background-image': ['none'],
    'overflow-x': ['visible'], 'overflow-y': ['visible'], 'box-shadow': ['none'],
  };
  for (const [key, values] of Object.entries(defaults)) if (node.styles[key] && !values.includes(node.styles[key] ?? '')) return false;
  for (const [key,value] of Object.entries(node.styles)) if (/^(padding|margin|border-.*-width|gap|row-gap|column-gap)/.test(key) && !['0px','normal','0'].includes(value)) return false;
  return true;
}
