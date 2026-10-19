// Read-only negative fixture. No receipt or HTML file is modified.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const dir=__dirname,script=path.join(dir,'release-common.cjs'),manifest=fs.readFileSync(path.join(dir,'reviewed-source.json'));
const parsed=JSON.parse(manifest),html=path.resolve(dir,'../../r3f_prototype/index.html');
assert(parsed.files.some(f=>f.path==='Developer/r3f_prototype/index.html'),'HTML must be an explicit reviewed input');
const fixtureFs=new Proxy(fs,{get(t,k){if(k!=='readFileSync')return t[k];return function(p,...a){const resolved=path.resolve(String(p));if(resolved===path.join(dir,'qa-approval.json'))return JSON.stringify({approved:true,sourceManifestSha256:crypto.createHash('sha256').update(manifest).digest('hex')});if(resolved===html){const b=Buffer.concat([fs.readFileSync(html),Buffer.from('\n<script>/* memory-only drift */</script>')]);return a[0]==='utf8'?b.toString():b}return fs.readFileSync(p,...a)}}});
const box={module:{exports:{}},exports:{},__dirname:dir,require:n=>n==='node:fs'?fixtureFs:require(n),process,Buffer,console};vm.runInNewContext(fs.readFileSync(script,'utf8'),box,{filename:script});
box.module.exports.sourceGate().then(()=>{throw Error('HTML drift unexpectedly accepted')}).catch(e=>{assert.equal(e.message,'Reviewed source drift Developer/r3f_prototype/index.html');console.log('QA-01 HTML changed-byte fail-closed fixture: PASS (no writes, no auth/network reached)')});
