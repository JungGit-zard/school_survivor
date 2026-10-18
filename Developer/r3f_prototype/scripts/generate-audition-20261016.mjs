// Additive audition only: never selects a runtime candidate or rewrites original assets.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import ffmpeg from '@ffmpeg-installer/ffmpeg'
import { sounds, synth, writeWav } from './generate_sfx.mjs'
import { VOICE_SFX } from './generate_voice_sfx.mjs'
import { VOICES, synthVoice, ZOMBIE_DEATH_PITCH_SCALE } from './generate_zombie_death_voices.mjs'
import { DIALOGUE_VOICE_PROFILES } from '../src/lib/dialogueVoice.js'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const OUT = resolve(ROOT, 'public/sfx/audition-20261016')
export const EVIDENCE = resolve(ROOT, '../agent_room/audio_ship_20261016/soundmini')
export const SR = 44100
const sha = b => createHash('sha256').update(b).digest('hex')
const hash = s => parseInt(sha(s).slice(0, 8), 16)
function random(seed) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296 } }
export function getSoundEntries() {
  const src = readFileSync(resolve(ROOT, 'src/lib/sfxRegistry.js'), 'utf8')
  return [...src.matchAll(/^\s*(\w+):\s*'([^']+\.ogg)'/gm)].map(([,id,src]) => ({ id, src, category: src.split('/')[2] }))
}
function resample(input, length) {
  return Float32Array.from({ length }, (_, i) => {
    const x = i * (input.length - 1) / Math.max(1, length - 1), j = Math.floor(x)
    return input[j] * (1 - x + j) + (input[j + 1] ?? input[j]) * (x - j)
  })
}
export function decode(path) {
  const b = execFileSync(ffmpeg.path, ['-v','error','-i',path,'-f','f32le','-ac','1','-ar',String(SR),'pipe:1'], { maxBuffer: 32 * 1024 * 1024 })
  return Float32Array.from({length:b.length/4}, (_,i) => b.readFloatLE(i*4))
}
export function makeSource(entry) {
  let samples, generator, sourceRate = SR
  const savedRandom = Math.random
  Math.random = random(hash(entry.id))
  try {
    if (entry.id === 'inuconBite') {
      samples = decode(resolve(ROOT, `public${entry.src}`))
      generator = 'preserved 2026-08-30 bark / generate-audition-20261016.mjs decode (not obsolete voice preset)'
    } else if (VOICES[entry.id]) {
      samples = synthVoice({ ...VOICES[entry.id], pitchScale: ZOMBIE_DEATH_PITCH_SCALE }); sourceRate = 22050
      generator = 'scripts/generate_zombie_death_voices.mjs / VOICES.' + entry.id
    } else if (VOICE_SFX[entry.id]) {
      samples = VOICE_SFX[entry.id].synth(); sourceRate = 22050
      generator = 'scripts/generate_voice_sfx.mjs / VOICE_SFX.' + entry.id
    } else if (sounds[entry.category + '/' + entry.id]) {
      samples = sounds[entry.category + '/' + entry.id]()
      generator = 'scripts/generate_sfx.mjs / sounds.' + entry.category + '/' + entry.id
    } else {
      samples = decode(resolve(ROOT, `public${entry.src}`))
      generator = 'scripts/generate-audition-20261016.mjs / decode preserved baseline; no current exportable preset'
    }
  } finally { Math.random = savedRandom }
  if (sourceRate !== SR) samples = resample(samples, Math.round(samples.length * SR / sourceRate))
  return { samples, generator, sampleRate: SR }
}
const MATERIALS = [
  [/bell|tumbler|compass|Cutter|ruler|lantern/i, '공명 타격', 780, 2.76],
  [/flask|eraser|onigiri|chest|textbook|playerStep/i, '물성 충격', 310, 1.47],
  [/stun|starlink|missile|critical/i, '전기 파열', 1180, 1.63],
  [/portal|umbrella|shark|lineDraw/i, '공기 궤적', 510, 2.13],
  [/Warning|Countdown|Whistle/i, '경고 호출', 1360, 1.5],
  [/Collect|levelUp|Clear|Gold|button|gameOver/i, '보상 신호', 880, 1.25],
]
export function recipe(entry) {
  const voice = entry.category === 'enemies' || /^player(Hit|Death|Heal)$/.test(entry.id) || /dialogue|bossSpawn|matildaCountdownEnd/.test(entry.id)
  const material = MATERIALS.find(([re]) => re.test(entry.id)) ?? [null,'짧은 발사',620,1.8]
  return { voice, name: voice ? '생명체 토큰' : material[1], frequency: material[2] * 2 ** ((hash(entry.id) % 13 - 6) / 12), ratio: material[3], seed: hash(entry.id) }
}
function finish(input, targetRms = 0.13) {
  let mean = 0; for (const x of input) mean += x; mean /= input.length
  let sum = 0, peak = 0
  for (let i=0;i<input.length;i++) {
    const edge = Math.min(1, i / (SR * .004), (input.length - 1 - i) / (SR * .016))
    input[i] = (input[i] - mean) * Math.max(0, edge); sum += input[i] ** 2; peak = Math.max(peak, Math.abs(input[i]))
  }
  const gain = Math.min(.70 / Math.max(peak, .001), targetRms / Math.max(.001, Math.sqrt(sum/input.length)))
  return input.map(x => x * gain)
}
export function designCandidate(entry, source, variant) {
  const r = recipe(entry), v = ['A','B','C'].indexOf(variant)
  if (v < 0) throw new Error('Unknown variant')
  const base = resample(source.samples, Math.round(source.samples.length * [.82,1.12,.70][v]))
  const delay = Math.round(SR * (.038 + (r.seed % 19)/1000))
  const extra = v === 2 ? Math.round(base.length * .74) + delay : v === 1 ? Math.round(SR * .075) : Math.round(SR * .012)
  const out = new Float32Array(base.length + extra)
  const rnd = random(r.seed ^ (v + 1) * 7717)
  let low = 0
  const alpha = 1 - Math.exp(-2 * Math.PI * [3800,1600,2800][v] / SR)
  for (let i=0;i<out.length;i++) {
    const x = base[i] ?? 0, t = i/SR
    low += alpha * (x-low)
    let y = v===0 ? .72*x + .28*(x-low) : v===1 ? low*.8 + x*.2 : low*.6+x*.4
    if (v===1 && i>=delay) y += (base[i-delay] ?? 0)*.28
    if (v===2) {
      const j=i-Math.round(base.length*.74)-delay
      if (j>=0 && j<base.length) y += base[j]*.65
      y *= .75+.25*Math.cos(2*Math.PI*(r.voice?13:22)*t)
    }
    const tail = Math.exp(-t/[.034,.13,.065][v])
    const metallic = Math.sin(2*Math.PI*r.frequency*t) + .3*Math.sin(2*Math.PI*r.frequency*r.ratio*t)
    const air = (rnd()*2-1) * (r.name==='공기 궤적' ? .18 : .035)
    y += (metallic * (r.voice ? .025 : [.08,.16,.055][v]) + air) * tail
    out[i] = y
  }
  return finish(out, r.voice ? .105 : .13)
}
const NOUNS = { pencil:'연필',ruler:'자',boxCutter:'커터칼',tumbler:'텀블러',bell:'종',flask:'플라스크',onigiri:'삼각김밥',stunGun:'스턴건',missile:'미사일',starlink:'스타링크',compass:'컴퍼스',umbrella:'우산',eraser:'지우개',chibiko:'치비코',shark:'상어',lantern:'랜턴',bikittyCutter:'바이키티 커터칼',lineDraw:'선긋기',player:'플레이어',zombie:'좀비',boss:'보스',matilda:'마틸다',doge:'도지',inucon:'이누콘',button:'버튼',coin:'동전',textbook:'교과서',level:'레벨',stage:'스테이지',game:'게임',critical:'치명타',portal:'포탈',escapePortal:'탈출 포탈',milestone:'생존 보상',chest:'상자',rzl:'런크루 리더',stage2Guard:'2스테이지 경비원' }
const ACTIONS = { Fire:'발사',Hit:'타격',Tick:'지속 타격',Fall:'낙하',Explosion:'폭발',Snap:'날 파단',Reload:'날 교체',Slash:'긋기',Cross:'가로지르기',Expire:'소멸',Quack:'꽥',Death:'사망',Heal:'회복',Step:'발걸음',Groan:'신음',Spawn:'등장',TankGroan:'탱커 신음',RunnerScreech:'러너 외침',RangedShoot:'원거리 공격',ChargeRoar:'돌진 포효',GiantThud:'거대 충격',Roar:'포효',Dash:'돌진',Laugh:'웃음',DeathGrunt:'사망 으윽',DeathHeavy:'사망 우어억',DeathShriek:'사망 끼야악',DeathGurgle:'사망 커르륵',DeathBellow:'사망 끄아앙',Escape:'도주',Yelp:'짧은 외침',Bite:'밀치기 짖음',Click:'클릭',Collect:'수집',Up:'상승',Clear:'클리어',Over:'종료',Warning:'경고',Appear:'출현',Suction:'흡입',WarningTick:'경고 틱',CountdownEnd:'카운트 종료',ClearJingle:'승리 징글',Gold:'골드',Drop:'드롭',Open:'열기',Land:'착지',Whistle:'휘파람' }
export function koreanName(id) {
  for (const key of Object.keys(NOUNS).sort((a,b)=>b.length-a.length)) if(id.startsWith(key) && ACTIONS[id.slice(key.length)]) return NOUNS[key]+' '+ACTIONS[id.slice(key.length)]
  throw new Error('Missing Korean label: '+id)
}
export const DIALOGUE_SAMPLES = {
  protagonistIntro: { name:'주인공 일반 대사', text:'학교에서 무슨 일이 생긴 걸까.' },
  protagonistUrgent: { name:'주인공 긴급 대사', text:'난 여기서 빠져나가야겠어!' },
  matilda: { name:'마틸다 대사', text:'오호호호! 떡하나주면 안잡아먹지!' },
}
function dialogueSource(id, variant) {
  const profile = DIALOGUE_VOICE_PROFILES[id], v = ['A','B','C'].indexOf(variant)
  const chars = Array.from(DIALOGUE_SAMPLES[id].text).filter(c=>!/[\s.!?]/.test(c))
  const out = new Float32Array(Math.round(SR*(chars.length*[.067,.083,.074][v]+.1)))
  chars.forEach((c,i)=>{
    const tokenMs = [52,72,60][v], vowels = [['ee','aa','oo'],['oo','aw','ee'],['aa','ee','ng']][v]
    const f=profile.baseFrequency*2**((profile.semitonePattern[i%profile.semitonePattern.length]+[2,-1,4][v])/12)
    const token = synthVoice({dur:tokenMs/1000, seed:hash(id+c+i+variant), pitchScale:1, f0:[[0,f],[1,f*[1.04,.88,1.12][v]]],hold:1,bits:[9,8,7][v],drive:1.1,targetLoudness:.12,jitter:.008,frames:[{t:0,v:vowels[0],amp:0,voice:1,noise:.06},{t:.09,v:vowels[0],amp:.8,voice:1,noise:.04},{t:.55,v:vowels[1],amp:.65,voice:1,noise:.07},{t:1,v:vowels[2],amp:0,voice:1,noise:.08}]})
    const res = resample(token,token.length*2), offset=Math.round(SR*i*[.067,.083,.074][v])
    for(let j=0;j<res.length;j++) if(offset+j<out.length) out[offset+j]+=res[j]
  })
  return finish(out,.055)
}
export function recordFile(path, extra={}) { const b=readFileSync(path); return {path:path.replaceAll('\\','/').replace(ROOT.replaceAll('\\','/')+'/', ''),bytes:b.length,sha256:sha(b),...extra} }
export function generate() {
  mkdirSync(OUT,{recursive:true}); mkdirSync(EVIDENCE,{recursive:true})
  const generatedAt = new Date().toISOString(), cases=[], files=[]
  for(const entry of getSoundEntries()) {
    const source=makeSource(entry), r=recipe(entry)
    const item={id:entry.id,category:entry.category,name:koreanName(entry.id),description:`${r.name}: 원본 보존, 세 후보는 비교 전용이며 게임에 자동 적용하지 않음.`,original:{src:entry.src,label:'현행 원본'},variants:[]}
    const baselineMetadata = JSON.parse(readFileSync(resolve(ROOT, '../agent_room/audio_asset_provenance_manifest_2026-07-30.json'), 'utf8')).assets.find(a => a.logicalId === entry.id)
    files.push(recordFile(resolve(ROOT,'public'+entry.src),{caseId:entry.id,role:'original',source:baselineMetadata.source,license:baselineMetadata.licenseEvidence,reason:'Preserved existing runtime asset; no replacement.'}))
    for(const variant of ['A','B','C']) {
      const pcm=designCandidate(entry,source,variant), path=resolve(OUT,entry.id+'-'+variant+'.wav')
      writeWav(path,pcm)
      const description={A:`${r.name}의 짧고 건조한 어택, 고역 윤곽 강화`,B:`${r.name}의 둥근 저역 몸통과 지연 공명`,C:`${r.name}의 두 번 응답 리듬과 맥동 꼬리`}[variant]
      item.variants.push({id:variant,label:variant+' · '+{A:'또렷한 단발',B:'둥근 공명',C:'리듬 응답'}[variant],description,src:'/sfx/audition-20261016/'+entry.id+'-'+variant+'.wav'})
      files.push(recordFile(path,{caseId:entry.id,role:variant,source:source.generator,recipe:r,reason:description,license:'project-generated-procedural; no external samples'}))
    }
    cases.push(item)
  }
  for(const [id,spec] of Object.entries(DIALOGUE_SAMPLES)) {
    const caseId='dialogue-'+id
    const original=resolve(OUT,caseId+'-original.wav')
    if(!existsSync(original)) throw new Error('Faithful OfflineAudioContext render required before final manifest: '+original)
    const item={id:caseId,category:'dialogue',name:spec.name,description:'동일 예문: '+spec.text+' / 원본은 현행 WebAudio 프로필 직접 렌더, 후보는 새 포먼트 토큰 방식.',original:{src:'/sfx/audition-20261016/'+caseId+'-original.wav',label:'현행 프로필 직접 렌더 (기본 음량)'},variants:[]}
    files.push(recordFile(original,{caseId,role:'original',source:'src/lib/dialogueVoice.js exact graph rendered by native OfflineAudioContext; see dialogue-render.json',reason:'Faithful current profile, fixed per-glyph index; no normalization.'}))
    for(const variant of ['A','B','C']) {
      const path=resolve(OUT,caseId+'-'+variant+'.wav');writeWav(path,dialogueSource(id,variant))
      const description={A:'52ms 밝은 이-아 토큰, 빠른 발음',B:'72ms 둥근 우-어 토큰, 여유 있는 호흡',C:'60ms 아-이 토큰, 상승형 장난 리듬'}[variant]
      item.variants.push({id:variant,label:variant+' · '+{A:'밝은 토큰',B:'둥근 토큰',C:'장난 토큰'}[variant],description,src:'/sfx/audition-20261016/'+caseId+'-'+variant+'.wav'})
      files.push(recordFile(path,{caseId,role:variant,source:'scripts/generate_zombie_death_voices.mjs synthVoice + generate-audition-20261016.mjs dialogueSource',reason:description,license:'project-generated-procedural; no external samples'}))
    }
    cases.push(item)
  }
  const manifest={generatedAt,cases}
  writeFileSync(resolve(OUT,'manifest.js'),'window.SFX_AUDITION_MANIFEST = '+JSON.stringify(manifest,null,2)+';\n')
  writeFileSync(resolve(EVIDENCE,'source-reason-sha.json'),JSON.stringify({generatedAt,ffmpeg:ffmpeg.path,scope:'audition-only; no automatic runtime selections',cases:cases.length,candidates:cases.length*3,files,sources:['generate-audition-20261016.mjs','render-dialogue-audition-20261016.mjs','verify-audition-20261016.mjs','generate_sfx.mjs','generate_voice_sfx.mjs','generate_zombie_death_voices.mjs'].map(p=>recordFile(resolve(ROOT,'scripts',p)))},null,2)+'\n')
  console.log(JSON.stringify({cases:cases.length,candidates:cases.length*3,manifest:resolve(OUT,'manifest.js')}))
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) generate()
