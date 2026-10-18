// Native offline render of the CURRENT dialogueVoice.js graph, not a DSP approximation.
// Requires Advisor browser-slot clearance AND npm run browser:reserve immediately before execution.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { ROOT, OUT, EVIDENCE, DIALOGUE_SAMPLES } from './generate-audition-20261016.mjs'
import { writeWav } from './generate_sfx.mjs'

mkdirSync(OUT,{recursive:true});mkdirSync(EVIDENCE,{recursive:true})
const source=readFileSync(resolve(ROOT,'src/lib/dialogueVoice.js'),'utf8')
const sourceSha256=createHash('sha256').update(source).digest('hex')
let browser
const evidence={source:'src/lib/dialogueVoice.js',sourceSha256,method:'Native Chromium OfflineAudioContext, direct private playGlyphBleep graph via read-only source evaluation, current fixed per-glyph index, volume=1, no gain normalization',samples:[],closed:false}
try {
  browser=await chromium.launch({headless:true, channel:'chrome'})
  const cdp=await browser.newBrowserCDPSession()
  const {processInfo}=await cdp.send('SystemInfo.getProcessInfo')
  evidence.browserPid=processInfo.find(p=>p.type==='browser')?.id
  evidence.browserVersion=browser.version()
  const page=await browser.newPage()
  // about:blank only. No application, network route, persistent browser profile or data access.
  for(const [profileName,sample] of Object.entries(DIALOGUE_SAMPLES)) {
    const result=await page.evaluate(async ({source,profileName,text})=>{
      // Cleanup timers are suppressed during offline scheduling: their wall-clock
      // deadlines must NOT disconnect an offline graph before it has rendered.
      const api=new Function('setTimeout','clearTimeout',source.replace(/\bexport\s+/g,'')+'; return {playGlyphBleep,getDialogueVoiceProfile,segmentDialogueText,isSilentDialogueGlyph,getDialogueGlyphDelay};')(()=>0,()=>{})
      const profile=api.getDialogueVoiceProfile(profileName,text)
      const glyphs=api.segmentDialogueText(text)
      const schedule=[];let cursor=0,index=0
      for(const glyph of glyphs){
        if(!api.isSilentDialogueGlyph(glyph)) schedule.push({glyph,index:index++,at:cursor/1000})
        cursor+=api.getDialogueGlyphDelay(glyph,profile)
      }
      const sr=44100, context=new OfflineAudioContext(1,Math.ceil(sr*(cursor/1000+.25)),sr)
      let at=0
      const proxy=new Proxy(context,{get(target,key){if(key==='currentTime')return at;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}})
      for(const item of schedule){at=item.at;api.playGlyphBleep(proxy,profile,item.glyph,item.index,1)}
      const buffer=await context.startRendering()
      return {pcm:Array.from(buffer.getChannelData(0)),profile,schedule,sampleRate:sr}
    },{source,profileName,text:sample.text})
    const path=resolve(OUT,'dialogue-'+profileName+'-original.wav')
    writeWav(path,Float32Array.from(result.pcm))
    evidence.samples.push({profileName,text:sample.text,path,profile:result.profile,schedule:result.schedule,sampleRate:result.sampleRate,frames:result.pcm.length,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})
  }
} finally {
  if(browser){await browser.close();evidence.closed=true}
  writeFileSync(resolve(EVIDENCE,'dialogue-render.json'),JSON.stringify(evidence,null,2)+'\n')
  console.log(JSON.stringify({browserPid:evidence.browserPid,closed:evidence.closed,rendered:evidence.samples.length,sourceSha256}))
}
