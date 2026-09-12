import { z } from 'zod';
import { computedStyles } from './computedStyles.js';
const property=z.object({name:z.string(),value:z.string(),important:z.boolean().optional(),disabled:z.boolean().optional()});
const style=z.object({cssProperties:z.array(property)}).passthrough();
const rule=z.object({origin:z.string().optional(),style,selectorList:z.object({text:z.string()}).optional(),media:z.array(z.object({text:z.string()}).passthrough()).optional(),containerQueries:z.array(z.object({text:z.string()}).passthrough()).optional(),styleSheetId:z.string().optional()}).passthrough();
const schema=z.object({inlineStyle:style.optional(),attributesStyle:style.optional(),matchedCSSRules:z.array(z.object({rule})).optional(),inherited:z.array(z.object({inlineStyle:style.optional(),matchedCSSRules:z.array(z.object({rule})).optional()})).optional(),pseudoElements:z.array(z.object({pseudoType:z.string(),matches:z.array(z.object({rule}))})).optional()}).passthrough();
/** Retain authored intent/query context, dropping protocol ranges and duplicated UA rules. */
export function compactCss(value:unknown):unknown {
  const parsed=schema.safeParse(value);
  if(!parsed.success)return {warning:'Unsupported matched CSS shape; inspect raw frame'};
  const relevant=new Set([...computedStyles,'margin','padding','border','border-radius','background','font','flex','grid','overflow','inset']);
  const declarations=(input:z.infer<typeof style>|undefined):{name:string;value:string;important:boolean}[]=>input?.cssProperties.filter(item=>!item.disabled&&(relevant.has(item.name)||item.name.startsWith('--'))).map(item=>({name:item.name,value:item.value,important:item.important??false}))??[];
  const rules=(input:{rule:z.infer<typeof rule>}[]|undefined):unknown[]=>input?.filter(item=>item.rule.origin!=='user-agent').map(({rule:item})=>({selector:item.selectorList?.text??'',stylesheet:item.styleSheetId,declarations:declarations(item.style),media:item.media?.map(query=>query.text),containers:item.containerQueries?.map(query=>query.text)}))??[];
  const data=parsed.data;
  return {inline:declarations(data.inlineStyle),attributes:declarations(data.attributesStyle),rules:rules(data.matchedCSSRules),inherited:data.inherited?.map(item=>({inline:declarations(item.inlineStyle),rules:rules(item.matchedCSSRules)})).filter(item=>item.inline.length||item.rules.length),pseudo:data.pseudoElements?.map(item=>({type:item.pseudoType,rules:rules(item.matches)}))};
}
