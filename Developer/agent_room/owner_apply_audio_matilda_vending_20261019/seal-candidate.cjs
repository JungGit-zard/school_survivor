const {fs,path,app,dist,dir,sha,packed,read,write,walk,git,sourceGate}=require('./release-common.cjs');
(async()=>{
 const source=await sourceGate(),baseline=read('live-baseline.json'),allow=new Set(source.allowedExistingHostingReplacements),provider=['/__/firebase/init.js','/__/firebase/init.json'];
 for(const [name,expected] of Object.entries(source.replacementExpectedSha256||{})){const p=path.join(dist,name.replace(/^\//,''));if(!fs.existsSync(p)||sha(fs.readFileSync(p))!==expected)throw Error('Approved replacement bytes drift '+name)}
 for(const f of baseline.files){if(allow.has(f.path)||provider.includes(f.path))continue;const p=path.join(dist,f.path.replace(/^\//,''));if(!fs.existsSync(p)||packed(fs.readFileSync(p))!==f.hash)throw Error('Preservation drift '+f.path)}
 const files=walk(dist).map(p=>{const b=fs.readFileSync(p);return {path:'/'+path.relative(dist,p).replace(/\\/g,'/'),hash:packed(b),sha256:sha(b),bytes:b.length}}).filter(f=>!provider.includes(f.path));
 const index=fs.readFileSync(path.join(dist,'index.html'),'utf8');const entry=index.match(/src="([^"]+\.js)"/)?.[1];if(!entry||!files.some(f=>f.path===entry))throw Error('Missing current entry');
 write('candidate-seal.json',{utc:new Date().toISOString(),sourceCommit:git('rev-parse','HEAD'),sourceManifestSha256:sha(fs.readFileSync(path.join(dir,'reviewed-source.json'))),baseline:baseline.version,configSha256:sha(fs.readFileSync(path.join(app,'firebase.owner-expanded-20261019.json'))),entry,files});console.log('New QA-bound source/dist seal PASS files='+files.length+' entry='+entry);
})().catch(e=>{console.error(e.message);process.exit(1)});
