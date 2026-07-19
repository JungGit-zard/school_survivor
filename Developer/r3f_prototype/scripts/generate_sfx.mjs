/**
 * SFX 생성기 — 외부 의존성 없음, Node.js built-in만 사용.
 * SFXR 파라미터 기반 합성으로 57개 WAV 파일 생성.
 * 실행: node scripts/generate_sfx.mjs
 */

import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, '../public/sfx')

const SR = 44100  // sample rate
const PI2 = Math.PI * 2

// ── WAV 인코더 ────────────────────────────────────────────────────────────────
function writeWav(filepath, samples) {
  const len = samples.length
  const buf = Buffer.alloc(44 + len * 2)
  // RIFF header
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + len * 2, 4)
  buf.write('WAVE', 8); buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)       // chunk size
  buf.writeUInt16LE(1, 20)        // PCM
  buf.writeUInt16LE(1, 22)        // mono
  buf.writeUInt32LE(SR, 24)       // sample rate
  buf.writeUInt32LE(SR * 2, 28)   // byte rate
  buf.writeUInt16LE(2, 32)        // block align
  buf.writeUInt16LE(16, 34)       // bits per sample
  buf.write('data', 36); buf.writeUInt32LE(len * 2, 40)
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.floor(s * 32767), 44 + i * 2)
  }
  mkdirSync(dirname(filepath), { recursive: true })
  writeFileSync(filepath, buf)
}

// ── 기본 파형 ─────────────────────────────────────────────────────────────────
const osc = {
  sine:     (p) => Math.sin(PI2 * p),
  square:   (p) => Math.sign(Math.sin(PI2 * p)),
  sawtooth: (p) => 2 * (p % 1) - 1,
  triangle: (p) => 1 - 4 * Math.abs((p % 1) - 0.5),
  noise:    ()  => Math.random() * 2 - 1,
}

// ── 합성 엔진 ─────────────────────────────────────────────────────────────────
function synth({
  wave = 'sine',
  freq = 440,        // 시작 주파수
  freqEnd = null,    // 끝 주파수 (슬라이드)
  dur = 0.3,         // 초
  vol = 0.7,
  attack = 0.01,
  decay = 0.1,
  sustain = 0.5,
  release = 0.1,
  vibRate = 0,       // 비브라토 속도
  vibDepth = 0,      // 비브라토 깊이
  noiseAmt = 0,      // 노이즈 혼합
  pitchBend = 0,     // 초당 Hz 변화
  overtones = [],    // [{ratio, amp}]
}) {
  const n = Math.floor(SR * dur)
  const samples = new Float32Array(n)
  const atkS = Math.floor(SR * attack)
  const decS = Math.floor(SR * decay)
  const relS = Math.floor(SR * release)
  let phase = 0

  for (let i = 0; i < n; i++) {
    const t = i / SR
    const prog = i / n

    // 주파수 슬라이드
    const fSlide = freqEnd != null
      ? freq + (freqEnd - freq) * prog
      : freq + pitchBend * t
    const f = fSlide + (vibDepth > 0 ? Math.sin(PI2 * vibRate * t) * vibDepth : 0)

    phase += f / SR

    // 파형
    let s = osc[wave](phase)
    // 배음 추가
    for (const ov of overtones) {
      s += osc[wave](phase * ov.ratio) * ov.amp
    }
    // 노이즈 혼합
    if (noiseAmt > 0) s = s * (1 - noiseAmt) + osc.noise() * noiseAmt

    // 엔벨로프
    let env
    if (i < atkS) env = i / atkS
    else if (i < atkS + decS) env = 1 - (1 - sustain) * ((i - atkS) / decS)
    else if (i < n - relS) env = sustain
    else env = sustain * (1 - (i - (n - relS)) / relS)

    samples[i] = s * env * vol
  }
  return samples
}

// 여러 음을 합산
function mix(...layers) {
  const n = Math.max(...layers.map(l => l.length))
  const out = new Float32Array(n)
  for (const layer of layers) {
    for (let i = 0; i < layer.length; i++) out[i] += layer[i]
  }
  // 피크 정규화
  const peak = Math.max(...Array.from(out).map(Math.abs)) || 1
  return out.map(v => v / Math.max(peak, 1))
}

// ── 사운드 정의 ────────────────────────────────────────────────────────────────
const sounds = {

  // ── 무기 발사음 ──────────────────────────────────────────────────────────────
  'weapons/pencilFire': () => synth({
    wave:'triangle', freq:800, freqEnd:400, dur:0.18, vol:0.5,
    attack:0.005, decay:0.05, sustain:0.2, release:0.1,
  }),
  'weapons/rulerFire': () => synth({
    wave:'sawtooth', freq:600, freqEnd:200, dur:0.22, vol:0.6,
    attack:0.002, decay:0.08, sustain:0.15, release:0.1, noiseAmt:0.15,
  }),
  'weapons/boxCutterFire': () => synth({
    wave:'sawtooth', freq:1200, freqEnd:500, dur:0.15, vol:0.55,
    attack:0.001, decay:0.05, sustain:0.1, release:0.08, noiseAmt:0.1,
  }),
  'weapons/tumblerFire': () => mix(
    synth({ wave:'sine', freq:300, dur:0.4, vol:0.4, attack:0.05, decay:0.1, sustain:0.6, release:0.15 }),
    synth({ wave:'sine', freq:450, dur:0.4, vol:0.25, attack:0.06, decay:0.1, sustain:0.5, release:0.15 }),
  ),
  'weapons/bellFire': () => mix(
    synth({ wave:'sine', freq:880, dur:0.8, vol:0.7, attack:0.002, decay:0.3, sustain:0.2, release:0.4,
      overtones:[{ratio:2,amp:0.4},{ratio:3,amp:0.2}] }),
    synth({ wave:'sine', freq:1100, dur:0.5, vol:0.3, attack:0.001, decay:0.2, sustain:0.1, release:0.3 }),
  ),
  'weapons/flaskFire': () => synth({
    wave:'triangle', freq:500, freqEnd:200, dur:0.2, vol:0.5,
    attack:0.01, decay:0.06, sustain:0.2, release:0.1, noiseAmt:0.2,
  }),
  'weapons/onigiriFire': () => synth({
    wave:'sine', freq:300, freqEnd:180, dur:0.25, vol:0.45,
    attack:0.01, decay:0.08, sustain:0.3, release:0.12, noiseAmt:0.3,
  }),
  'weapons/stunGunFire': () => synth({
    wave:'square', freq:900, dur:0.3, vol:0.6,
    attack:0.001, decay:0.02, sustain:0.7, release:0.05,
    vibRate:60, vibDepth:80, noiseAmt:0.05,
  }),
  'weapons/missileFire': () => mix(
    synth({ wave:'sawtooth', freq:150, freqEnd:600, dur:0.35, vol:0.7,
      attack:0.01, decay:0.1, sustain:0.5, release:0.15, noiseAmt:0.2 }),
    synth({ wave:'noise', freq:1, dur:0.35, vol:0.3, attack:0.01, decay:0.1, sustain:0.4, release:0.1 }),
  ),
  'weapons/starlinkFire': () => mix(
    synth({ wave:'square', freq:2000, freqEnd:800, dur:0.25, vol:0.5,
      attack:0.001, decay:0.05, sustain:0.3, release:0.12 }),
    synth({ wave:'sine', freq:4000, freqEnd:1000, dur:0.2, vol:0.3,
      attack:0.001, decay:0.04, sustain:0.2, release:0.1 }),
  ),
  'weapons/compassFire': () => synth({
    wave:'sawtooth', freq:700, freqEnd:300, dur:0.2, vol:0.55,
    attack:0.001, decay:0.06, sustain:0.2, release:0.1, noiseAmt:0.08,
  }),
  'weapons/umbrellaFire': () => mix(
    synth({ wave:'triangle', freq:400, dur:0.3, vol:0.5,
      attack:0.05, decay:0.1, sustain:0.4, release:0.15 }),
    synth({ wave:'noise', freq:1, dur:0.15, vol:0.3, attack:0.001, decay:0.1, sustain:0.0, release:0.05 }),
  ),
  'weapons/eraserFire': () => synth({
    wave:'triangle', freq:350, freqEnd:150, dur:0.28, vol:0.55,
    attack:0.01, decay:0.08, sustain:0.25, release:0.15, noiseAmt:0.25,
  }),
  'weapons/chibikoFire': () => synth({
    wave:'square', freq:1400, freqEnd:700, dur:0.12, vol:0.4,
    attack:0.001, decay:0.04, sustain:0.1, release:0.06,
  }),
  'weapons/sharkFire': () => mix(
    synth({ wave:'sawtooth', freq:80, freqEnd:400, dur:0.4, vol:0.8,
      attack:0.005, decay:0.12, sustain:0.5, release:0.2, noiseAmt:0.3 }),
    synth({ wave:'noise', freq:1, dur:0.4, vol:0.4, attack:0.005, decay:0.1, sustain:0.4, release:0.15 }),
  ),

  // ── 무기 타격음 ──────────────────────────────────────────────────────────────
  'weapons/pencilHit': () => synth({
    wave:'noise', freq:1, dur:0.1, vol:0.5,
    attack:0.001, decay:0.04, sustain:0.0, release:0.05,
  }),
  'weapons/rulerHit': () => synth({
    wave:'noise', freq:1, dur:0.15, vol:0.6,
    attack:0.001, decay:0.05, sustain:0.1, release:0.08, pitchBend:-200,
  }),
  'weapons/boxCutterHit': () => mix(
    synth({ wave:'noise', freq:1, dur:0.12, vol:0.55, attack:0.001, decay:0.05, sustain:0.0, release:0.06 }),
    synth({ wave:'sawtooth', freq:800, freqEnd:200, dur:0.1, vol:0.2, attack:0.001, decay:0.04, sustain:0.0, release:0.05 }),
  ),
  'weapons/tumblerHit': () => synth({
    wave:'noise', freq:1, dur:0.15, vol:0.65,
    attack:0.001, decay:0.06, sustain:0.05, release:0.07,
  }),
  'weapons/bellHit': () => mix(
    synth({ wave:'sine', freq:600, dur:0.6, vol:0.6, attack:0.001, decay:0.15, sustain:0.1, release:0.35,
      overtones:[{ratio:2.3,amp:0.3}] }),
    synth({ wave:'noise', freq:1, dur:0.1, vol:0.3, attack:0.001, decay:0.05, sustain:0.0, release:0.04 }),
  ),
  'weapons/flaskHit': () => mix(
    synth({ wave:'noise', freq:1, dur:0.35, vol:0.7, attack:0.001, decay:0.1, sustain:0.2, release:0.2 }),
    synth({ wave:'sine', freq:200, freqEnd:80, dur:0.3, vol:0.4, attack:0.001, decay:0.1, sustain:0.1, release:0.15 }),
  ),
  'weapons/onigiriHit': () => synth({
    wave:'noise', freq:1, dur:0.2, vol:0.5,
    attack:0.001, decay:0.07, sustain:0.1, release:0.1, pitchBend:-100,
  }),
  'weapons/stunGunHit': () => synth({
    wave:'square', freq:600, dur:0.2, vol:0.55,
    attack:0.001, decay:0.03, sustain:0.4, release:0.1,
    vibRate:80, vibDepth:100, noiseAmt:0.1,
  }),
  'weapons/missileHit': () => mix(
    synth({ wave:'noise', freq:1, dur:0.45, vol:0.8, attack:0.001, decay:0.15, sustain:0.2, release:0.25 }),
    synth({ wave:'sine', freq:120, freqEnd:40, dur:0.4, vol:0.5, attack:0.001, decay:0.12, sustain:0.1, release:0.2 }),
  ),
  'weapons/starlinkHit': () => mix(
    synth({ wave:'square', freq:1200, freqEnd:300, dur:0.25, vol:0.5, attack:0.001, decay:0.06, sustain:0.1, release:0.12 }),
    synth({ wave:'noise', freq:1, dur:0.15, vol:0.3, attack:0.001, decay:0.06, sustain:0.0, release:0.07 }),
  ),
  'weapons/compassHit': () => mix(
    synth({ wave:'noise', freq:1, dur:0.5, vol:0.8, attack:0.001, decay:0.15, sustain:0.2, release:0.3 }),
    synth({ wave:'sawtooth', freq:250, freqEnd:60, dur:0.45, vol:0.5, attack:0.001, decay:0.12, sustain:0.15, release:0.25 }),
    synth({ wave:'sine', freq:800, freqEnd:100, dur:0.3, vol:0.3, attack:0.001, decay:0.08, sustain:0.05, release:0.2 }),
  ),
  // ── 오리요강 타격 '꽥' (compassBlade orbit hit) ──
  'weapons/compassQuack': () => mix(
    synth({
      wave:'sawtooth', freq:920, freqEnd:300, dur:0.16, vol:0.6,
      attack:0.004, decay:0.05, sustain:0.4, release:0.06,
      vibRate:22, vibDepth:32, noiseAmt:0.06,
      overtones:[{ratio:2,amp:0.5},{ratio:3,amp:0.28},{ratio:4,amp:0.12}],
    }),
    synth({
      wave:'triangle', freq:1350, freqEnd:560, dur:0.09, vol:0.22,
      attack:0.002, decay:0.03, sustain:0.15, release:0.05,
    }),
  ),
  'weapons/umbrellaHit': () => synth({
    wave:'noise', freq:1, dur:0.2, vol:0.55,
    attack:0.001, decay:0.07, sustain:0.05, release:0.1,
  }),
  'weapons/eraserHit': () => mix(
    synth({ wave:'noise', freq:1, dur:0.4, vol:0.75, attack:0.001, decay:0.12, sustain:0.2, release:0.22 }),
    synth({ wave:'sine', freq:180, freqEnd:60, dur:0.35, vol:0.4, attack:0.001, decay:0.1, sustain:0.1, release:0.2 }),
  ),
  'weapons/chibikoHit': () => synth({
    wave:'noise', freq:1, dur:0.08, vol:0.4,
    attack:0.001, decay:0.03, sustain:0.0, release:0.04,
  }),
  'weapons/sharkHit': () => mix(
    synth({ wave:'noise', freq:1, dur:0.55, vol:0.9, attack:0.001, decay:0.18, sustain:0.25, release:0.3 }),
    synth({ wave:'sawtooth', freq:80, freqEnd:30, dur:0.5, vol:0.5, attack:0.001, decay:0.15, sustain:0.1, release:0.28 }),
  ),

  // ── 플레이어 ─────────────────────────────────────────────────────────────────
  'player/playerHit': () => mix(
    synth({ wave:'noise', freq:1, dur:0.2, vol:0.6, attack:0.001, decay:0.07, sustain:0.05, release:0.12 }),
    synth({ wave:'sine', freq:300, freqEnd:150, dur:0.18, vol:0.3, attack:0.001, decay:0.06, sustain:0.0, release:0.1 }),
  ),
  'player/playerDeath': () => mix(
    synth({ wave:'noise', freq:1, dur:0.6, vol:0.7, attack:0.001, decay:0.2, sustain:0.15, release:0.35 }),
    synth({ wave:'sine', freq:250, freqEnd:60, dur:0.7, vol:0.5, attack:0.01, decay:0.2, sustain:0.1, release:0.4 }),
    synth({ wave:'sine', freq:400, freqEnd:100, dur:0.5, vol:0.3, attack:0.001, decay:0.15, sustain:0.05, release:0.3 }),
  ),
  'player/playerStep': () => synth({
    wave:'noise', freq:1, dur:0.1, vol:0.3,
    attack:0.001, decay:0.04, sustain:0.0, release:0.055,
  }),

  // ── 적 그로울 ────────────────────────────────────────────────────────────────
  'enemies/zombieGroan': () => mix(
    synth({ wave:'sawtooth', freq:120, dur:0.4, vol:0.5, attack:0.05, decay:0.1, sustain:0.5, release:0.2,
      noiseAmt:0.3, vibRate:4, vibDepth:8 }),
  ),
  'enemies/zombieTankGroan': () => mix(
    synth({ wave:'sawtooth', freq:80, dur:0.5, vol:0.6, attack:0.06, decay:0.15, sustain:0.5, release:0.25,
      noiseAmt:0.4, vibRate:3, vibDepth:6 }),
  ),
  'enemies/zombieSpawn': () => mix(
    synth({ wave:'noise', freq:1, dur:0.32, vol:0.72, attack:0.001, decay:0.07, sustain:0.08, release:0.22 }),
    synth({ wave:'sine', freq:150, freqEnd:58, dur:0.30, vol:0.52, attack:0.001, decay:0.06, sustain:0.08, release:0.22 }),
    synth({ wave:'triangle', freq:480, freqEnd:190, dur:0.18, vol:0.24, attack:0.001, decay:0.05, sustain:0.04, release:0.12 }),
  ),
  'enemies/zombieRunnerScreech': () => synth({
    wave:'sawtooth', freq:400, freqEnd:600, dur:0.3, vol:0.55,
    attack:0.01, decay:0.08, sustain:0.4, release:0.15, noiseAmt:0.2, vibRate:10, vibDepth:20,
  }),
  'enemies/zombieRangedShoot': () => synth({
    wave:'triangle', freq:300, freqEnd:150, dur:0.25, vol:0.45,
    attack:0.02, decay:0.07, sustain:0.2, release:0.1, noiseAmt:0.15,
  }),
  'enemies/zombieChargeRoar': () => mix(
    synth({ wave:'sawtooth', freq:100, freqEnd:200, dur:0.5, vol:0.7, attack:0.02, decay:0.15, sustain:0.5, release:0.2,
      noiseAmt:0.35 }),
    synth({ wave:'noise', freq:1, dur:0.5, vol:0.3, attack:0.02, decay:0.1, sustain:0.3, release:0.15 }),
  ),
  'enemies/zombieGiantThud': () => mix(
    synth({ wave:'sine', freq:60, freqEnd:20, dur:0.5, vol:0.8, attack:0.001, decay:0.15, sustain:0.1, release:0.3 }),
    synth({ wave:'noise', freq:1, dur:0.4, vol:0.5, attack:0.001, decay:0.12, sustain:0.05, release:0.25 }),
  ),
  'enemies/bossRoar': () => mix(
    synth({ wave:'sawtooth', freq:70, freqEnd:120, dur:0.8, vol:0.75, attack:0.03, decay:0.2, sustain:0.5, release:0.3,
      noiseAmt:0.4, vibRate:5, vibDepth:15 }),
    synth({ wave:'noise', freq:1, dur:0.8, vol:0.4, attack:0.03, decay:0.15, sustain:0.35, release:0.3 }),
    synth({ wave:'sine', freq:50, freqEnd:30, dur:0.7, vol:0.4, attack:0.02, decay:0.15, sustain:0.2, release:0.35 }),
  ),
  // 여자 웃음소리 "후-후-후-하-하" — 마틸다 등장 (2026-07-04 교체).
  // 음절 5개가 하강 피치로 이어지는 스타카토. sawtooth+배음 = 목소리 버즈,
  // 비브라토 + 약한 숨소리 노이즈로 사람 웃음 질감. 마지막 음절만 길게 끌며 마무리.
  'enemies/matildaSpawn': () => (() => {
    const f0s = [620, 580, 545, 505, 465]  // 여성 음역 하강 시퀀스
    const layers = f0s.map((f, i) => {
      const last = i === f0s.length - 1
      const dur = last ? 0.34 : 0.14
      const voiced = mix(
        synth({ wave:'sawtooth', freq:f, freqEnd:f*0.82, dur, vol:0.62, attack:0.012, decay:0.06,
          sustain:0.4, release: last ? 0.22 : 0.06, vibRate:5.5, vibDepth:14, noiseAmt:0.10,
          overtones:[{ratio:2,amp:0.45},{ratio:3,amp:0.22},{ratio:4,amp:0.10}] }),
        synth({ wave:'sine', freq:f*2, freqEnd:f*1.64, dur, vol:0.28, attack:0.012, decay:0.05,
          sustain:0.3, release: last ? 0.2 : 0.05 }),
      )
      const offset = Math.floor(i * 0.205 * SR)
      const padded = new Float32Array(voiced.length + offset)
      padded.set(voiced, offset)
      return padded
    })
    return mix(...layers)
  })(),

  // ── 적 사망음 ────────────────────────────────────────────────────────────────
  'enemies/zombieDeath': () => mix(
    synth({ wave:'noise', freq:1, dur:0.3, vol:0.6, attack:0.001, decay:0.1, sustain:0.05, release:0.18 }),
    synth({ wave:'sawtooth', freq:180, freqEnd:60, dur:0.28, vol:0.3, attack:0.001, decay:0.08, sustain:0.05, release:0.18 }),
  ),
  'enemies/zombieHeavyDeath': () => mix(
    synth({ wave:'noise', freq:1, dur:0.5, vol:0.75, attack:0.001, decay:0.15, sustain:0.1, release:0.3 }),
    synth({ wave:'sine', freq:120, freqEnd:40, dur:0.5, vol:0.5, attack:0.001, decay:0.12, sustain:0.08, release:0.3 }),
  ),
  'enemies/bossDeath': () => mix(
    synth({ wave:'noise', freq:1, dur:1.0, vol:0.9, attack:0.001, decay:0.3, sustain:0.2, release:0.5 }),
    synth({ wave:'sine', freq:80, freqEnd:20, dur:1.1, vol:0.7, attack:0.001, decay:0.25, sustain:0.15, release:0.65 }),
    synth({ wave:'sawtooth', freq:200, freqEnd:50, dur:0.9, vol:0.4, attack:0.001, decay:0.2, sustain:0.1, release:0.55 }),
    synth({ wave:'noise', freq:1, dur:0.5, vol:0.4, attack:0.001, decay:0.15, sustain:0.05, release:0.3 }),
  ),
  'enemies/matildaDeath': () => mix(
    synth({ wave:'sawtooth', freq:300, freqEnd:800, dur:0.8, vol:0.65, attack:0.001, decay:0.2, sustain:0.2, release:0.45,
      noiseAmt:0.25, vibRate:8, vibDepth:30 }),
    synth({ wave:'sine', freq:400, freqEnd:1200, dur:0.6, vol:0.35, attack:0.001, decay:0.15, sustain:0.1, release:0.4 }),
    synth({ wave:'noise', freq:1, dur:0.4, vol:0.3, attack:0.001, decay:0.12, sustain:0.05, release:0.25 }),
  ),
  'enemies/matildaDash': () => mix(
    synth({ wave:'noise', freq:1, dur:0.48, vol:0.7, attack:0.005, decay:0.10, sustain:0.18, release:0.28 }),
    synth({ wave:'sine', freq:780, freqEnd:170, dur:0.42, vol:0.34, attack:0.005, decay:0.08, sustain:0.12, release:0.25 }),
    synth({ wave:'triangle', freq:260, freqEnd:90, dur:0.34, vol:0.28, attack:0.005, decay:0.08, sustain:0.08, release:0.20 }),
  ),
  // Sound_Mini Animalese method: three short "o-ho-ho" machine-voice tokens.
  // This follows the project rule of using tiny synthesized syllable tokens,
  // not a copied game sample or real-person voice imitation.
  'enemies/matildaLaugh': () => (() => {
    const syllables = [620, 540, 660].map((freq, index) => {
      const voice = mix(
        synth({ wave:'sawtooth', freq, freqEnd:freq*0.9, dur:0.22, vol:0.46, attack:0.006, decay:0.04,
          sustain:0.25, release:0.08, vibRate:7, vibDepth:14, noiseAmt:0.08,
          overtones:[{ratio:2,amp:0.32},{ratio:3,amp:0.12}] }),
        synth({ wave:'triangle', freq:freq*1.5, freqEnd:freq*1.25, dur:0.18, vol:0.2, attack:0.004,
          decay:0.04, sustain:0.18, release:0.07 }),
      )
      const offset = Math.floor(index * 0.16 * SR)
      const padded = new Float32Array(voice.length + offset)
      padded.set(voice, offset)
      return padded
    })
    return mix(...syllables)
  })(),

  // ── UI ────────────────────────────────────────────────────────────────────────
  'ui/buttonClick': () => synth({
    wave:'sine', freq:800, freqEnd:600, dur:0.1, vol:0.5,
    attack:0.001, decay:0.04, sustain:0.0, release:0.05,
  }),
  'ui/coinCollect': () => mix(
    synth({ wave:'sine', freq:880, dur:0.2, vol:0.6, attack:0.001, decay:0.05, sustain:0.2, release:0.1 }),
    synth({ wave:'sine', freq:1100, dur:0.15, vol:0.4, attack:0.001, decay:0.04, sustain:0.1, release:0.08 }),
    synth({ wave:'triangle', freq:1320, dur:0.12, vol:0.3, attack:0.001, decay:0.03, sustain:0.0, release:0.08 }),
  ),
  'ui/levelUp': () => (() => {
    // 상승 아르페지오
    const notes = [523, 659, 784, 1047]
    const layers = notes.map((f, i) => {
      const s = synth({ wave:'sine', freq:f, dur:0.5, vol:0.5, attack:0.01, decay:0.08, sustain:0.3, release:0.15,
        overtones:[{ratio:2,amp:0.2}] })
      const offset = Math.floor(i * 0.09 * SR)
      const padded = new Float32Array(s.length + offset)
      padded.set(s, offset)
      return padded
    })
    return mix(...layers)
  })(),
  'ui/stageClear': () => (() => {
    const notes = [523, 659, 784, 1047, 1318]
    const layers = notes.map((f, i) => {
      const s = synth({ wave:'sine', freq:f, dur:0.6, vol:0.55, attack:0.01, decay:0.1, sustain:0.4, release:0.2,
        overtones:[{ratio:2,amp:0.3},{ratio:3,amp:0.1}] })
      const offset = Math.floor(i * 0.1 * SR)
      const padded = new Float32Array(s.length + offset)
      padded.set(s, offset)
      return padded
    })
    return mix(...layers)
  })(),
  'ui/gameOver': () => (() => {
    const notes = [392, 330, 262, 196]
    const layers = notes.map((f, i) => {
      const s = synth({ wave:'sine', freq:f, dur:0.7, vol:0.5, attack:0.02, decay:0.15, sustain:0.3, release:0.35,
        overtones:[{ratio:2,amp:0.2}] })
      const offset = Math.floor(i * 0.15 * SR)
      const padded = new Float32Array(s.length + offset)
      padded.set(s, offset)
      return padded
    })
    return mix(...layers)
  })(),

  // ── 특수 이벤트 ──────────────────────────────────────────────────────────────
  'events/bossWarning': () => mix(
    synth({ wave:'square', freq:440, dur:0.3, vol:0.5, attack:0.001, decay:0.05, sustain:0.6, release:0.1 }),
    synth({ wave:'square', freq:550, dur:0.3, vol:0.3, attack:0.001, decay:0.05, sustain:0.5, release:0.1 }),
  ),
  'events/bossSpawn': () => mix(
    synth({ wave:'sawtooth', freq:60, freqEnd:200, dur:0.8, vol:0.8, attack:0.001, decay:0.2, sustain:0.4, release:0.35,
      noiseAmt:0.3 }),
    synth({ wave:'noise', freq:1, dur:0.5, vol:0.5, attack:0.001, decay:0.15, sustain:0.15, release:0.3 }),
    synth({ wave:'sine', freq:40, freqEnd:20, dur:0.7, vol:0.5, attack:0.001, decay:0.15, sustain:0.2, release:0.4 }),
  ),
  'events/portalAppear': () => mix(
    synth({ wave:'sine', freq:300, freqEnd:800, dur:0.7, vol:0.6, attack:0.1, decay:0.15, sustain:0.4, release:0.25,
      vibRate:8, vibDepth:15 }),
    synth({ wave:'triangle', freq:600, freqEnd:1200, dur:0.6, vol:0.4, attack:0.08, decay:0.12, sustain:0.3, release:0.25 }),
    synth({ wave:'sine', freq:1200, freqEnd:2400, dur:0.5, vol:0.2, attack:0.05, decay:0.1, sustain:0.2, release:0.25 }),
  ),
  'events/portalSuction': () => mix(
    synth({ wave:'sine', freq:200, freqEnd:1200, dur:1.0, vol:0.65, attack:0.05, decay:0.2, sustain:0.5, release:0.25,
      noiseAmt:0.15, vibRate:6, vibDepth:20 }),
    synth({ wave:'noise', freq:1, dur:1.0, vol:0.3, attack:0.05, decay:0.15, sustain:0.4, release:0.3 }),
  ),
  'events/matildaWarningTick': () => mix(
    synth({ wave:'sine', freq:660, dur:0.15, vol:0.6, attack:0.001, decay:0.04, sustain:0.3, release:0.07 }),
    synth({ wave:'square', freq:330, dur:0.15, vol:0.3, attack:0.001, decay:0.04, sustain:0.2, release:0.07 }),
  ),
  'events/matildaCountdownEnd': () => mix(
    synth({ wave:'square', freq:220, dur:0.5, vol:0.7, attack:0.001, decay:0.1, sustain:0.5, release:0.2,
      noiseAmt:0.1 }),
    synth({ wave:'sawtooth', freq:110, dur:0.5, vol:0.5, attack:0.001, decay:0.1, sustain:0.4, release:0.2 }),
  ),
  'events/escapePortalClear': () => (() => {
    const notes = [784, 988, 1175, 1568, 1976]
    const layers = notes.map((f, i) => {
      const s = synth({ wave:'sine', freq:f, dur:0.8, vol:0.55, attack:0.02, decay:0.12, sustain:0.4, release:0.35,
        overtones:[{ratio:2,amp:0.25}], vibRate:6, vibDepth:10 })
      const offset = Math.floor(i * 0.08 * SR)
      const padded = new Float32Array(s.length + offset)
      padded.set(s, offset)
      return padded
    })
    return mix(...layers)
  })(),
  'events/bossClearJingle': () => (() => {
    const notes = [523, 659, 784, 1047, 1319, 1047]
    const layers = notes.map((f, i) => {
      const s = synth({ wave:'sine', freq:f, dur:0.6, vol:0.6, attack:0.01, decay:0.1, sustain:0.4, release:0.2,
        overtones:[{ratio:2,amp:0.3},{ratio:3,amp:0.1}] })
      const offset = Math.floor(i * 0.09 * SR)
      const padded = new Float32Array(s.length + offset)
      padded.set(s, offset)
      return padded
    })
    return mix(...layers)
  })(),
  'events/milestoneGold': () => mix(
    synth({ wave:'sine', freq:659, dur:0.25, vol:0.55, attack:0.001, decay:0.06, sustain:0.3, release:0.12 }),
    synth({ wave:'sine', freq:880, dur:0.2, vol:0.45, attack:0.001, decay:0.05, sustain:0.2, release:0.1 }),
    synth({ wave:'triangle', freq:1100, dur:0.15, vol:0.3, attack:0.001, decay:0.04, sustain:0.1, release:0.08 }),
  ),
  // 코치 호루라기 — 리드미컬 3연(삑·삑·삐이익 상승). RZL 런좀비 크루 출발 신호.
  // 페어 트릴 = 높은 vibRate/vibDepth, 삐침 = 근접 2음 맥놀이, 숨결 = 소량 noise.
  'events/rzlWhistle': () => (() => {
    const blast = (dur, fStart, fEnd, vol) => mix(
      synth({ wave:'sine', freq:fStart, freqEnd:fEnd, dur, vol,
        attack:0.006, decay:0.03, sustain:0.9, release:0.05,
        vibRate:24, vibDepth:150, noiseAmt:0.05, overtones:[{ratio:1.5,amp:0.16}] }),
      synth({ wave:'sine', freq:fStart+140, freqEnd:fEnd+140, dur, vol:vol*0.5,
        attack:0.006, decay:0.03, sustain:0.85, release:0.05, vibRate:24, vibDepth:150 }),
      synth({ wave:'triangle', freq:fStart*2, dur:dur*0.7, vol:vol*0.1,
        attack:0.004, decay:0.03, sustain:0.4, release:0.05 }),
    )
    const parts = [
      { s: blast(0.13, 2850, 2850, 0.8), at: 0.00 },
      { s: blast(0.13, 2850, 2850, 0.8), at: 0.22 },
      { s: blast(0.46, 2820, 3120, 0.9), at: 0.44 },
    ]
    const layers = parts.map(({ s, at }) => {
      const offset = Math.floor(at * SR)
      const padded = new Float32Array(s.length + offset)
      padded.set(s, offset)
      return padded
    })
    return mix(...layers)
  })(),
}

// ── 생성 실행 ─────────────────────────────────────────────────────────────────
// 필터 인자: node generate_sfx.mjs [부분문자열] — 매칭되는 사운드만 재생성.
// (noise 파형이 Math.random 기반이라 전체 재생성 시 모든 파일이 바뀜 → 선택 재생성 필수)
const filter = process.argv[2]
let count = 0
for (const [id, gen] of Object.entries(sounds)) {
  if (filter && !id.includes(filter)) continue
  const samples = gen()
  const filepath = join(OUT, id + '.wav')
  writeWav(filepath, samples)
  count++
  process.stdout.write(`\r생성 중... ${count}/${Object.keys(sounds).length} — ${id}.wav`)
}
console.log(`\n✓ ${count}개 사운드 생성 완료 → public/sfx/`)
