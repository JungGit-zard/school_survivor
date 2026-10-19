const {fs,path,dist,dir,sha,packed,read,write,rel,sourceGate}=require('./release-common.cjs');
(async()=>{
 await sourceGate();const b=read('live-baseline.json'),s=read('reviewed-source.json');const allow=new Set(s.allowedExistingHostingReplacements);const provider=['/__/firebase/init.js','/__/firebase/init.json'];
 const jobs=b.files.filter(f=>!allow.has(f.path)&&!provider.includes(f.path));let next=0;const evidence=[];
 // Reuse only content that cryptographically matches this NEW baseline, never trust old cache receipts.
 const oldCache=path.resolve(dir,'../../../Quaility_Assurance/owner_all_20261018/live-preserved-assets');
 async function worker(){while(next<jobs.length){const f=jobs[next++],r=rel(f.path),target=path.join(dist,r);let bytes,mode;
 if(fs.existsSync(target)&&packed(bytes=fs.readFileSync(target))===f.hash)mode='current-build-exact';
 else {const cache=path.join(oldCache,r);if(fs.existsSync(cache)&&packed(bytes=fs.readFileSync(cache))===f.hash)mode='revalidated-old-cache';else {const response=await fetch('https://escape-zombie-school.web.app'+f.path,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('HTTP '+response.status+' '+f.path);bytes=Buffer.from(await response.arrayBuffer());if(packed(bytes)!==f.hash)throw Error('Current live bytes mismatch '+f.path);mode='fresh-live';}fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes)}
 evidence.push({path:f.path,hash:f.hash,rawSha256:sha(bytes),mode});}}
 await Promise.all(Array.from({length:4},worker));evidence.sort((a,b)=>a.path.localeCompare(b.path));write('preservation-result.json',{baseline:b.version,utc:new Date().toISOString(),preserved:evidence.length,allowed:[...allow],providerManaged:provider,files:evidence});
 console.log('New current-live preservation PASS '+evidence.length);
})().catch(e=>{console.error(e.message);process.exit(1)});
