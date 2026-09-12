/** Extract repeated CDP rule/style objects while retaining all response fields. */
export async function archiveCssEvidence(value:unknown,store:{put:(value:unknown)=>Promise<string>}):Promise<unknown> {
  if(Array.isArray(value)) {const result:unknown[]=[];for(const item of value)result.push(await archiveCssEvidence(item,store));return result;}
  if(value!==null&&typeof value==='object') {
    const result:Record<string,unknown>={};
    for(const [key,item] of Object.entries(value)) {
      if(['rule','inlineStyle','attributesStyle','cssPropertyRules','cssPropertyRegistrations','cssAtRules','cssKeyframesRules'].includes(key)&&item!==null&&typeof item==='object') result[key]={$cssObject:await store.put(item)};
      else result[key]=await archiveCssEvidence(item,store);
    }
    return result;
  }
  return value;
}
