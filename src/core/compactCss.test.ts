import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compactCss } from './compactCss.js';
test('compact CSS retains authored sizing/query intent and omits protocol noise',()=>{
 const result=compactCss({matchedCSSRules:[{rule:{origin:'regular',selectorList:{text:'.hero'},style:{cssProperties:[{name:'width',value:'100%'},{name:'max-width',value:'1280px'},{name:'padding',value:'1rem'}]},media:[{text:'(width > 760px)',range:{startLine:2}}],containerQueries:[{text:'(width > 300px)'}],range:{startLine:1}}},{rule:{origin:'user-agent',style:{cssProperties:[{name:'display',value:'block'}]}}}]});
 const text=JSON.stringify(result);assert.match(text,/100%/);assert.match(text,/1280px/);assert.match(text,/760px/);assert.match(text,/300px/);assert.ok(!text.includes('startLine'));assert.ok(!text.includes('user-agent'));
});
