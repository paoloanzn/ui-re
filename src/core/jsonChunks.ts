/** Serialize plain JSON incrementally, including strings larger than one output chunk. */
export function* jsonChunks(value: unknown): Generator<string> {
  const ancestors = new Set<object>();
  function* string(text: string): Generator<string> {
    yield '"';
    for (let offset=0;offset<text.length;offset+=16384) yield JSON.stringify(text.slice(offset,offset+16384)).slice(1,-1);
    yield '"';
  }
  function* visit(item: unknown): Generator<string> {
    if(item===null || typeof item==='number' || typeof item==='boolean') { yield JSON.stringify(item); return; }
    if(typeof item==='string') { yield* string(item); return; }
    if(typeof item!=='object') throw new TypeError(`Unsupported JSON value: ${typeof item}`);
    if(ancestors.has(item)) throw new TypeError('Circular JSON value');
    ancestors.add(item);
    if(Array.isArray(item)) {
      yield '[';
      for(let i=0;i<item.length;i++) { if(i)yield ','; yield* visit(item[i]===undefined?null:item[i]); }
      yield ']';
    } else {
      yield '{'; let first=true;
      for(const [key,entry] of Object.entries(item)) {
        if(entry===undefined)continue;
        if(!first)yield ',';first=false;
        yield* string(key);yield ':';yield* visit(entry);
      }
      yield '}';
    }
    ancestors.delete(item);
  }
  yield* visit(value);
}
