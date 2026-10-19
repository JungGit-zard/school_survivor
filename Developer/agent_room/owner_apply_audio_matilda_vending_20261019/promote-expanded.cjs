// Expanded owner-approved instance of the established nonce -> preview -> verify -> clone path.
// No existing HUD-only receipt/config/guard is modified or skipped.
const {fs,path,app,dir,read,api,sourceGate}=require('./release-common.cjs');const {spawnSync}=require('node:child_process'),{randomUUID}=require('node:crypto');
const channel=process.argv[2];if(!/^[a-z0-9-]{1,50}$/.test(channel||''))throw Error('Explicit preview channel required');const rollback=channel+'-rollback';
const nonce=randomUUID(),firebase=process.platform==='win32'?'firebase.cmd':'firebase';
function run(args){const r=spawnSync(firebase,args,{cwd:app,encoding:'utf8',shell:process.platform==='win32',windowsHide:true,env:{...process.env,ESCAPE_HOSTING_PROMOTION_NONCE:nonce}});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');if(r.error||r.status!==0)throw Error('Firebase operation failed; do not bypass: '+(r.error?.message||r.status));return r}
function verify(ch,mode){const r=spawnSync(process.execPath,[path.join(dir,'verify-channel.cjs'),ch,mode],{cwd:app,encoding:'utf8',windowsHide:true});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');if(r.status!==0)throw Error(mode+' verification failed; live promotion halted')}
(async()=>{
 await sourceGate();const {get}=await api();if(await get(channel))throw Error('Preview channel already exists; use a fresh name');if(await get(rollback))throw Error('Rollback channel already exists; use a fresh name');
 run(['hosting:clone','escape-zombie-school:live','escape-zombie-school:'+rollback,'--project','escape-zombie-school','--non-interactive']);verify(rollback,'rollback');
 run(['hosting:channel:deploy',channel,'--config','firebase.owner-expanded-20261019.json','--project','escape-zombie-school','--non-interactive','--json']);
 const preview=await get(channel);const v=spawnSync(process.execPath,['scripts/verify-hosting-assets.mjs','--url',preview.url],{cwd:app,encoding:'utf8',windowsHide:true});process.stdout.write(v.stdout||'');process.stderr.write(v.stderr||'');if(v.status!==0)throw Error('Established preview JS graph validation failed');
 verify(channel,'preview');await sourceGate();
 run(['hosting:clone','escape-zombie-school:'+channel,'escape-zombie-school:live','--project','escape-zombie-school','--non-interactive']);verify('live','live');
 console.log('Expanded reviewed release promoted and freshly verified. Preview='+preview.url+' rollback='+rollback);
})().catch(e=>{console.error(e.message);process.exit(1)});
