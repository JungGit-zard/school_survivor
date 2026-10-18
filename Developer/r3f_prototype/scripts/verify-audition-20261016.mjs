// Objective offline QA. No application/user state or network writes.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { ROOT, OUT, EVIDENCE, decode, getSoundEntries } from './generate-audition-20261016.mjs'
const scope={window:{}};vm.runInNewContext(readFileSync(resolve(OUT,'manifest.js'),'utf8'),scope)
const manifest=scope.window.SFX_AUDITION_MANIFEST
const failures=[],rows=[],pairs=[], pcmByPath=new Map()
const check=(ok,message)=>{if(!ok)failures.push(message)}
const hash=b=>createHash('sha256').update(b).digest('hex')
// FFT magnitudes from the highest-energy 2048-sample window (no external deps).
function spectrum(pcm) {
  const n=2048,re=new Float64Array(n),im=new Float64Array(n)
  let start=0,best=-1
  for(let off=0;off<pcm.length;off+=1024){let energy=0;for(let j=off;j<Math.min(off+n,pcm.length);j++)energy+=pcm[j]**2;if(energy>best){best=energy;start=off}}
  for(let i=0;i<n;i++)re[i]=(pcm[start+i]??0)*(.5-.5*Math.cos(2*Math.PI*i/(n-1)))
  for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]]}
  for(let size=2;size<=n;size*=2){const half=size/2;for(let off=0;off<n;off+=size)for(let j=0;j<half;j++){const a=-2*Math.PI*j/size,c=Math.cos(a),s=Math.sin(a),k=off+j,l=k+half,tr=re[l]*c-im[l]*s,ti=re[l]*s+im[l]*c;re[l]=re[k]-tr;im[l]=im[k]-ti;re[k]+=tr;im[k]+=ti}}
  const bins=new Float64Array(32);let total=0,weighted=0
  for(let i=1;i<n/2;i++){const p=re[i]**2+im[i]**2;bins[Math.min(31,Math.floor(i/(n/2)*32))]+=p;total+=p;weighted+=p*i*44100/n}
  return {centroidHz:weighted/Math.max(total,1e-30),bands:Array.from(bins,x=>x/Math.max(total,1e-30))}
}
function measures(pcm){
  let peak=0,sum=0,dc=0,clipped=0,delta=0
  const envelope=new Array(32).fill(0)
  for(let i=0;i<pcm.length;i++){const x=pcm[i];peak=Math.max(peak,Math.abs(x));sum+=x*x;dc+=x;if(Math.abs(x)>=.999)clipped++;if(i)delta=Math.max(delta,Math.abs(x-pcm[i-1]));envelope[Math.min(31,Math.floor(i/pcm.length*32))]+=x*x}
  const eSum=envelope.reduce((a,b)=>a+b,0)||1
  return {frames:pcm.length,durationSec:pcm.length/44100,peak,rms:Math.sqrt(sum/pcm.length),peakDbfs:20*Math.log10(Math.max(peak,1e-15)),rmsDbfs:10*Math.log10(Math.max(sum/pcm.length,1e-30)),dc:dc/pcm.length,clippedSamples:clipped,maxSampleDelta:delta,first:pcm[0],last:pcm.at(-1),envelope:envelope.map(x=>x/eSum),...spectrum(pcm)}
}
function distance(a,b){return Math.sqrt(a.reduce((s,x,i)=>s+(x-b[i])**2,0))}
function alignedCosine(a,b){let dot=0,aa=0,bb=0;for(let i=0;i<2048;i++){const x=a[Math.floor(i/2048*a.length)],y=b[Math.floor(i/2048*b.length)];dot+=x*y;aa+=x*x;bb+=y*y}return Math.abs(dot/Math.sqrt(Math.max(aa*bb,1e-30)))}
check(manifest.cases.length===93,'case count must be93')
const ids=manifest.cases.map(c=>c.id);check(new Set(ids).size===93,'duplicate case IDs')
for(const {id} of getSoundEntries())check(ids.includes(id),'missing SOUND_MAP '+id)
const categoryCounts={}
const uniqueCandidates=new Set()
for(const item of manifest.cases){
  categoryCounts[item.category]=(categoryCounts[item.category]??0)+1
  check(JSON.stringify(item.variants.map(v=>v.id))==='["A","B","C"]',item.id+' variant contract')
  check(/[가-힣]/.test(item.name),item.id+' Korean name')
  const clips=[{...item.original,id:'original'},...item.variants]
  // Also verify existing MP3 fallback decodes, not merely the audition OGG.
  if(item.original.src.endsWith('.ogg'))clips.push({id:'original-mp3',src:item.original.src.replace(/\.ogg$/,'.mp3')})
  const candidates=[]
  for(const clip of clips){
    check(clip.src.startsWith('/sfx/'),item.id+' URL root')
    const path=resolve(ROOT,'public'+clip.src)
    if(!existsSync(path)){failures.push('missing '+path);continue}
    let pcm
    try {pcm=decode(path)}catch(e){failures.push('decode '+path+': '+e.message);continue}
    const m=measures(pcm),sha256=hash(readFileSync(path)),candidate=['A','B','C'].includes(clip.id)
    check(pcm.length>100,item.id+' empty '+clip.id)
    check(Number.isFinite(m.rms)&&m.rms>0,item.id+' silent/nonfinite '+clip.id)
    if(candidate){
      check(m.clippedSamples===0,item.id+' clipped '+clip.id)
      check(m.peak<=.701,item.id+' peak '+clip.id)
      check(m.rms>.009,item.id+' inaudibly low '+clip.id)
      check(Math.abs(m.first)<.001&&Math.abs(m.last)<.001,item.id+' edge discontinuity '+clip.id)
      check(!uniqueCandidates.has(sha256),item.id+' duplicate candidate bytes '+clip.id)
      uniqueCandidates.add(sha256);candidates.push({id:clip.id,pcm,m,sha256})
    }
    pcmByPath.set(clip.src,pcm)
    rows.push({caseId:item.id,role:clip.id,src:clip.src,sha256,...m})
  }
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
    const a=candidates[i],b=candidates[j],pair={caseId:item.id,a:a.id,b:b.id,alignedAbsoluteCosine:alignedCosine(a.pcm,b.pcm),envelopeDistance:distance(a.m.envelope,b.m.envelope),spectralDistance:distance(a.m.bands,b.m.bands),durationDifferenceSec:Math.abs(a.m.durationSec-b.m.durationSec)}
    // A pure volume change has the same normalized waveform/envelope/spectrum.
    check(pair.alignedAbsoluteCosine<.995 && (pair.envelopeDistance>.02 || pair.spectralDistance>.03),item.id+' scalar/near-copy variants '+a.id+b.id)
    pairs.push(pair)
  }
}
const originalPreservation=[]
for(const {src} of getSoundEntries())for(const ext of ['ogg','mp3']){
  const repoPath='Developer/r3f_prototype/public'+src.replace(/\.ogg$/,'.'+ext)
  const actual=readFileSync(resolve(ROOT,'public'+src.replace(/\.ogg$/,'.'+ext)))
  const baseline=execFileSync('git',['show','HEAD:'+repoPath],{cwd:ROOT,maxBuffer:32*1024*1024})
  const unchanged=hash(actual)===hash(baseline)
  check(unchanged,'original changed '+repoPath)
  originalPreservation.push({path:repoPath,sha256:hash(actual),unchangedFromHead:unchanged})
}
check(uniqueCandidates.size===279,'candidate count must be279')
const candidateRows=rows.filter(r=>['A','B','C'].includes(r.role))
const summary={cases:manifest.cases.length,candidates:uniqueCandidates.size,decodedClips:rows.length,categoryCounts,candidatePeakMax:Math.max(...candidateRows.map(r=>r.peak)),candidateRmsMin:Math.min(...candidateRows.map(r=>r.rms)),candidateRmsMax:Math.max(...candidateRows.map(r=>r.rms)),candidateClippedSamples:candidateRows.reduce((n,r)=>n+r.clippedSamples,0),originalClippedClips:rows.filter(r=>r.role.startsWith('original')&&r.clippedSamples>0).length,originalFilesPreserved:originalPreservation.filter(r=>r.unchangedFromHead).length,pairs:pairs.length,pairMaxAlignedAbsoluteCosine:Math.max(...pairs.map(p=>p.alignedAbsoluteCosine)),failures}
writeFileSync(resolve(EVIDENCE,'decode-measurements.json'),JSON.stringify({generatedAt:new Date().toISOString(),summary,rows,pairs,originalPreservation,limitations:'Objective decode and acoustic difference evidence only; not human auditory approval or device speaker QA. Existing originals are measured but never normalized/repaired.'},null,2)+'\n')
console.log(JSON.stringify(summary,null,2));if(failures.length)process.exitCode=1
