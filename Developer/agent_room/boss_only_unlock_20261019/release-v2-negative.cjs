'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {rel,sameMap,must,sha,stable,provider}=require('./release-v2.cjs');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name)}
for(const p of ['../x','/../x','/a/../b','/a//b','/a\\b','/C:/x','/a?b','/a#b','/'])test('reject unsafe '+p,()=>assert.throws(()=>rel(p)));
test('safe exact path',()=>assert.equal(rel('/assets/main.js'),'assets/main.js'));
test('strict count extras rejected',()=>assert.throws(()=>sameMap([{path:'/a',hash:'x'},{path:'/extra',hash:'x'}],[{path:'/a',hash:'x'}])));
test('strict equal count replacement rejected',()=>assert.throws(()=>sameMap([{path:'/other',hash:'x'}],[{path:'/a',hash:'x'}])));
test('strict hash drift rejected',()=>assert.throws(()=>sameMap([{path:'/a',hash:'y'}],[{path:'/a',hash:'x'}])));
test('duplicate paths rejected',()=>assert.throws(()=>sameMap([{path:'/a',hash:'x'},{path:'/a',hash:'x'}],[{path:'/a',hash:'x'},{path:'/b',hash:'x'}])));
test('exact provider paths only',()=>assert.deepEqual(provider,['/__/firebase/init.js','/__/firebase/init.json']));
test('full exact map accepted',()=>sameMap([{path:'/a',hash:'x'}],[{path:'/a',hash:'x'}]));
test('false guard rejects',()=>assert.throws(()=>must(false,'closed')));
test('config exact old preservation',()=>{const c=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../r3f_prototype/firebase.boss-v2-20261019.json')));assert.equal(c.hosting.public,'dist');assert.equal(c.hosting.site,'escape-zombie-school');assert.deepEqual(c.hosting.ignore,['__/firebase/init.js','__/firebase/init.json']);assert.ok(c.hosting.predeploy[0].endsWith(' gate'));assert.ok(c.hosting.predeploy.at(-1).endsWith(' seal'));assert.ok(c.hosting.predeploy.includes('npm.cmd run require:safe-hosting-promotion'));assert.equal(c.database,undefined);assert.equal(c.functions,undefined)});
console.log(JSON.stringify({status:'PASS_GUARD_UNIT_ONLY',passed,productionWrites:false}));
