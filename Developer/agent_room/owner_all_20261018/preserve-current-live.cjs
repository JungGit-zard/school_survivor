const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),qa=path.join(root,'Quaility_Assurance/owner_all_20261018'),dist=path.join(root,'Developer/r3f_prototype/dist'),cache=path.join(qa,'live-preserved-assets');
const baseline=JSON.parse(fs.readFileSync(path.join(qa,'live-asset-baseline.json')));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');const packed=b=>digest(z.gzipSync(b,{level:9}));
function relative(p){const s=p.replace(/^\//,'');if(!s||s.split('/').includes('..')||path.isAbsolute(s))throw Error('Unsafe live path');return s}
(async()=>{
 // Existing Orca live-owner handoff explicitly excludes these two provider-managed routes.
 const providerManaged=['/__/firebase/init.js','/__/firebase/init.json'];
 const jobs=baseline.files.filter(f=>f.path!='/index.html'&&!providerManaged.includes(f.path));let next=0,kept=0,restored=0,downloaded=0;const evidence=[];
 async function worker(){while(next<jobs.length){const f=jobs[next++],r=relative(f.path),target=path.join(dist,r),stored=path.join(cache,r);let b;if(fs.existsSync(target)){b=fs.readFileSync(target);if(packed(b)===f.hash){kept++;evidence.push({path:f.path,gzip_sha256:f.hash,raw_sha256:digest(b),mode:'same-current-build'});continue}}
 if(fs.existsSync(stored)){b=fs.readFileSync(stored);if(packed(b)!==f.hash)throw Error('Cached live hash drift: '+f.path)}else{
  for(let attempt=0;attempt<3;attempt++){const response=await fetch('https://escape-zombie-school.web.app'+f.path,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Live download HTTP '+response.status+' '+f.path);b=Buffer.from(await response.arrayBuffer());if(packed(b)===f.hash)break;if(attempt===2)throw Error('Live gzip SHA mismatch: '+f.path)}
  fs.mkdirSync(path.dirname(stored),{recursive:true});fs.writeFileSync(stored,b);downloaded++;
 }
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,b);restored++;evidence.push({path:f.path,gzip_sha256:f.hash,raw_sha256:digest(b),mode:'exact-current-live-preservation'});
 }}
 await Promise.all(Array.from({length:4},worker));
 evidence.sort((a,b)=>a.path.localeCompare(b.path));const report={version:baseline.version,retained:evidence.length,kept,restored,downloaded,only_permitted_replacement:'/index.html',files:evidence,finished:new Date().toISOString()};
 fs.writeFileSync(path.join(qa,'live-preservation-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({version:baseline.version,retained:evidence.length,kept,restored,downloaded}));
})().catch(e=>{console.error(e.message);process.exit(1)});
