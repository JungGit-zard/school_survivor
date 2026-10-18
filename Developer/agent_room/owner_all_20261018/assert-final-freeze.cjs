const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),ready=JSON.parse(fs.readFileSync(path.join(__dirname,'integration-ready.json')));
const base='C:/Users/admin/AppData/Roaming/npm/node_modules/firebase-tools/lib';
(async()=>{
 if(!ready.sourceHashManifest||!ready.files.length)throw Error('No final hash freeze');
 for(const f of ready.files){const p=path.join(root,f.path);if(!fs.existsSync(p)||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==f.sha256)throw Error('Final source/dist drift: '+f.path)}
 const account=require(base+'/auth.js').getGlobalDefaultAccount();if(!account)throw Error('Firebase CLI login required');
 await require(base+'/requireAuth.js').requireAuth({project:'escape-zombie-school',...account});
 const live=await require(base+'/hosting/api.js').getChannel('escape-zombie-school','escape-zombie-school','live');
 if(live.release.version.name!==ready.liveBaseVersion)throw Error('Live changed after reviewed baseline; reconcile and re-QA');
 console.log('Exact final source/dist and unchanged live baseline PASS '+ready.sourceHashManifest);
})().catch(e=>{console.error(e.message);process.exit(1)});
