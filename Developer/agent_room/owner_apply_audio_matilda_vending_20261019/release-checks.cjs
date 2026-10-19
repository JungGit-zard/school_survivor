const assert=require('node:assert/strict');
const {rel,sha,packed}=require('./release-common.cjs');
for(const p of ['../escape','/../escape','a/../b','a'+String.fromCharCode(92)+'b'])assert.throws(()=>rel(p));
assert.equal(rel('/assets/ok.js'),'assets/ok.js');
assert.equal(sha(Buffer.from('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.equal(packed(Buffer.from('abc')),packed(Buffer.from('abc')));
console.log('release path/hash deterministic checks 7/7 PASS');
