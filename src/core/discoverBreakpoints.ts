export type Breakpoint = { readonly source: 'media' | 'container'; readonly text: string; readonly widths: readonly number[] };
/** Extract observable width thresholds without assigning responsive semantics. */
export function discoverBreakpoints(stylesheets: readonly string[]): Breakpoint[] {
  const found = new Map<string, Breakpoint>();
  for (const sheet of stylesheets) {
    for (const match of sheet.matchAll(/@(media|container)\s*([^{}]+)\{/g)) {
      const source = match[1] === 'media' ? 'media' : 'container';
      const text = match[2]?.trim() ?? '';
      const widths = [...text.matchAll(/(?:min-width|max-width|width)\s*(?::|[<>=]{1,2})\s*([\d.]+)(px|em|rem)/g), ...text.matchAll(/([\d.]+)(px|em|rem)\s*[<>=]{1,2}\s*width/g)]
        .map(value => Number(value[1]) * (value[2] === 'px' ? 1 : 16)).filter(value => value > 0);
      found.set(`${source}:${text}`, { source, text, widths: [...new Set(widths)].sort((a, b) => a - b) });
    }
  }
  return [...found.values()].sort((a, b) => a.text.localeCompare(b.text));
}
