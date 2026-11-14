/**
 * SFX 생성기 — 외부 의존성 없음, Node.js built-in만 사용.
 * SFXR 파라미터 기반 합성으로 57개 WAV 파일 생성.
 * 실행: node scripts/generate_sfx.mjs
 */

import { writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { execFileSync } from 'child_process'
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

// ── 필터 ──────────────────────────────────────────────────────────────────────
// 1-pole IIR. 이 엔진에는 원래 필터가 없어서 noise 계열 음이 전부 백색(중심주파수
// 6~11kHz)으로 몰린다. 아래 두 헬퍼는 '색이 있는' 마찰/디텐트 질감을 만들기 위한 것이며,
// 명시적으로 호출한 사운드에만 적용된다(기존 정의의 출력은 바뀌지 않는다).
function lowpass(samples, cutoff) {
  const dt = 1 / SR
  const alpha = dt / (1 / (PI2 * cutoff) + dt)
  const out = new Float32Array(samples.length)
  let prev = 0
  for (let i = 0; i < samples.length; i++) { prev += alpha * (samples[i] - prev); out[i] = prev }
  return out
}

function highpass(samples, cutoff) {
  const dt = 1 / SR
  const rc = 1 / (PI2 * cutoff)
  const alpha = rc / (rc + dt)
  const out = new Float32Array(samples.length)
  let prev = 0
  for (let i = 1; i < samples.length; i++) {
    prev = alpha * (prev + samples[i] - samples[i - 1])
    out[i] = prev
  }
  return out
}

const bandpass = (samples, low, high) => highpass(lowpass(samples, high), low)

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

// ── 2026-11-08 추가 헬퍼 (Stage 5·6 / B03 착지 레시피 전용) ────────────────────────
// 기존 정의는 이 헬퍼를 쓰지 않으므로 기존 음원 출력은 바뀌지 않는다.

// 레이어를 sec초 뒤에 놓는다(기존 정의의 offset/padded 패턴을 함수로 묶은 것).
function at(samples, sec) {
  const offset = Math.floor(sec * SR)
  const out = new Float32Array(samples.length + offset)
  out.set(samples, offset)
  return out
}

// 지수 감쇠 부분음 합성. 종('띵')과 저역 충격('쿵')에 쓴다. synth()의 선형 ADSR보다
// 실제 타격음처럼 빨리 떨어진다. partials = [[주파수비, 진폭, 감쇠시간배수?], ...]
function strike({ freq, freqEnd = null, dur, vol = 0.6, tau = 0.2, attack = 0.002, partials = [[1, 1]] }) {
  const n = Math.floor(SR * dur)
  const out = new Float32Array(n)
  const phases = partials.map(() => 0)
  const tailS = Math.floor(SR * 0.008)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const f = freqEnd != null ? freq * Math.pow(freqEnd / freq, i / n) : freq
    let s = 0
    for (let k = 0; k < partials.length; k++) {
      const [ratio, amp, tauMul = 1] = partials[k]
      phases[k] += (f * ratio) / SR
      s += amp * Math.sin(PI2 * phases[k]) * Math.exp(-t / (tau * tauMul))
    }
    const atk = t < attack ? t / attack : 1
    const tail = i > n - tailS ? (n - i) / tailS : 1
    out[i] = s * atk * tail * vol
  }
  return out
}

// 컷오프가 시간에 따라 움직이는 대역 노이즈('휙', '착', '드르륵'). 2단 1-pole LP + HP(fc/3).
// am > 0이면 그 주파수로 진폭을 흔들어 철문 롤러 같은 덜컹임을 만든다.
function sweptNoise({ dur, from, to, vol = 0.5, attack = 0.005, release = 0.05, am = 0, amDepth = 0 }) {
  const n = Math.floor(SR * dur)
  const out = new Float32Array(n)
  const atkS = Math.max(1, Math.floor(SR * attack))
  const relS = Math.max(1, Math.floor(SR * release))
  let lp1 = 0, lp2 = 0, hp = 0, prevIn = 0
  for (let i = 0; i < n; i++) {
    const fc = from * Math.pow(to / from, i / n)
    const a = 1 - Math.exp(-PI2 * fc / SR)
    lp1 += a * (osc.noise() - lp1)
    lp2 += a * (lp1 - lp2)
    const hpA = Math.exp(-PI2 * (fc / 3) / SR)
    hp = hpA * (hp + lp2 - prevIn)
    prevIn = lp2
    let env = i < atkS ? i / atkS : (i > n - relS ? (n - i) / relS : 1)
    if (am > 0) env *= 1 - amDepth * (0.5 + 0.5 * Math.sin(PI2 * am * i / SR))
    out[i] = hp * env
  }
  return peakTo(out, vol)
}

// 피크를 target으로 맞추고 끝 5ms를 페이드해 클릭을 없앤다.
function peakTo(samples, target) {
  let peak = 0
  for (const v of samples) peak = Math.max(peak, Math.abs(v))
  const g = peak > 0 ? target / peak : 0
  const fadeS = Math.floor(SR * 0.005)
  const out = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const fade = i > samples.length - fadeS ? (samples.length - i) / fadeS : 1
    out[i] = samples[i] * g * fade
  }
  return out
}

// 정확한 길이로 자른다(스펙 길이 고정용).
function trimTo(samples, sec) {
  return samples.slice(0, Math.min(samples.length, Math.floor(sec * SR)))
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
  // ── 바이키티 커터칼 (bikittyCutter) 3종 ────────────────────────────────────
  // 공업용 L형 대형 커터칼. 8단 래칫 → 파단 → 날 교체 루프.
  // 전부 절차 합성이며 외부 샘플/타 게임 음원을 쓰지 않는다.

  // 1) 딸깍 — 날을 한 칸 밀어내는 래칫 디텐트. 건조하게 끊고, 잔향을 남기지 않는다.
  //    8연타 대비: 유효 길이 ~0.07초. 로직이 rate 0.8~1.6으로 단수 피치를 올린다.
  //    의도된 최고 성분이 2.6kHz라 rate 1.6에서도 4.2kHz — 하시(harsh) 영역에 닿지 않는다.
  'weapons/bikittyCutterFire': () => (() => {
    const at = (samples, seconds) => {
      const offset = Math.floor(seconds * SR)
      const padded = new Float32Array(samples.length + offset)
      padded.set(samples, offset)
      return padded
    }
    return mix(
      // "딸" 본체 — triangle 이 주역이다. 노이즈가 주역이면 rate 0.8~1.6 피치 사다리가
      // 귀에 안 들린다(백색 노이즈는 리샘플해도 음정이 거의 안 잡힌다).
      at(synth({ wave:'triangle', freq:1500, freqEnd:820, dur:0.05, vol:0.55,
        attack:0.0005, decay:0.016, sustain:0.0, release:0.024 }), 0),
      // 디텐트 grit — 3.4kHz 저역통과로 hiss 대신 '플라스틱 톱니' 질감
      at(lowpass(synth({ wave:'noise', freq:1, dur:0.03, vol:0.30,
        attack:0.0004, decay:0.010, sustain:0.0, release:0.016 }), 3400), 0),
      // 금속 에지 반짝임 — 아주 짧게만, 사각파 상위 배음은 잘라서 밝기가 튀지 않게
      at(lowpass(synth({ wave:'square', freq:2400, freqEnd:1400, dur:0.022, vol:0.14,
        attack:0.0004, decay:0.008, sustain:0.0, release:0.012 }), 6000), 0),
      // 플라스틱 하우징 저역 — 폰 스피커에서 hiss로 들리지 않게 하는 몸통
      at(synth({ wave:'triangle', freq:520, freqEnd:380, dur:0.055, vol:0.22,
        attack:0.001, decay:0.018, sustain:0.0, release:0.026 }), 0),
      // "깍" — 디텐트가 다음 톱니로 빠지는 뒤꿈치. 26ms 뒤라 하나의 딸깍으로 붙는다.
      at(synth({ wave:'triangle', freq:1900, freqEnd:1200, dur:0.035, vol:0.28,
        attack:0.0004, decay:0.012, sustain:0.0, release:0.018 }), 0.026),
      at(lowpass(synth({ wave:'noise', freq:1, dur:0.022, vol:0.16,
        attack:0.0004, decay:0.008, sustain:0.0, release:0.012 }), 3400), 0.026),
    )
  })(),

  // 2) 챙 — 8단째 날이 톡 부러지고 조각이 부채꼴로 튀는 파열음. 세 소리 중 최대.
  //    비정수 배음(2.74, 4.2)으로 '두들긴 금속'을 만든다. 정수배음이면 종/악기처럼 들린다.
  'weapons/bikittyCutterSnap': () => (() => {
    const at = (samples, seconds) => {
      const offset = Math.floor(seconds * SR)
      const padded = new Float32Array(samples.length + offset)
      padded.set(samples, offset)
      return padded
    }
    const shard = (freq, delay, vol) => at(synth({
      wave:'triangle', freq, freqEnd:freq*0.62, dur:0.10, vol,
      attack:0.0006, decay:0.03, sustain:0.06, release:0.06, noiseAmt:0.10,
    }), delay)
    return mix(
      // 파단 트랜지언트 — 광대역 크랙. mix()가 피크 정규화를 하므로 층이 전부 t=0에
      // 겹치면 합이 커져 전체가 눌리고 체감 크기(RMS)가 오히려 작아진다.
      // 그래서 아래 층들을 3~10ms씩 어긋나게 둔다 — 하나의 타격으로 들리는 범위다.
      at(lowpass(synth({ wave:'noise', freq:1, dur:0.10, vol:0.62,
        attack:0.0004, decay:0.035, sustain:0.04, release:0.06 }), 7000), 0),
      // 부러지는 순간의 급강하 — 금속이 '찢어지며' 끊기는 에지
      at(synth({ wave:'sawtooth', freq:1900, freqEnd:460, dur:0.12, vol:0.34,
        attack:0.0005, decay:0.04, sustain:0.05, release:0.06, noiseAmt:0.14 }), 0.003),
      // 저역 무게 — 소형 스피커에서 '크다'고 느끼게 하는 몸통
      at(synth({ wave:'sine', freq:230, freqEnd:75, dur:0.30, vol:0.55,
        attack:0.001, decay:0.09, sustain:0.12, release:0.18 }), 0.004),
      // "챙" 상단 금속 링잉 — 비정수 배음(2.74/4.2)이라 악기음이 아닌 두들긴 금속
      at(synth({ wave:'sine', freq:1750, dur:0.62, vol:0.90,
        attack:0.001, decay:0.14, sustain:0.26, release:0.44,
        overtones:[{ratio:2.74,amp:0.40},{ratio:4.2,amp:0.16}] }), 0.006),
      // 하단 링잉 — 금속 체급감을 주고 중심주파수를 끌어내려 hiss화를 막는다
      at(synth({ wave:'sine', freq:980, dur:0.58, vol:0.66,
        attack:0.001, decay:0.13, sustain:0.24, release:0.40,
        overtones:[{ratio:2.41,amp:0.32}] }), 0.010),
      // 부채꼴로 흩어지는 조각 5개 — 시간차 + 음량 감쇠로 확산 방향감
      shard(3100, 0.06, 0.26),
      shard(2650, 0.11, 0.22),
      shard(3450, 0.17, 0.19),
      shard(2300, 0.24, 0.16),
      shard(2900, 0.33, 0.13),
    )
  })(),

  // 3) 스륵 — 새 날을 밀어 넣는 마찰음. 1.2초 재장전 대비 실측 ~0.93초로
  //    끝을 남겨 두어 재무장 순간의 첫 딸깍과 겹치지 않는다.
  //    필터가 없는 엔진이라 noiseAmt로 sine을 착색해 '색이 있는 마찰 노이즈'를 만든다.
  'weapons/bikittyCutterReload': () => (() => {
    const at = (samples, seconds) => {
      const offset = Math.floor(seconds * SR)
      const padded = new Float32Array(samples.length + offset)
      padded.set(samples, offset)
      return padded
    }
    return mix(
      // 마찰 베드 — 700~4200Hz 대역통과. 백색 노이즈 그대로면 '스륵'이 아니라
      // 라디오 잡음처럼 들린다. 이 대역이 실제 금속 슬라이드 마찰이 사는 곳이다.
      // 무장해제 구간의 배경 텍스처라 챙보다 확실히 작게 유지한다.
      at(bandpass(synth({ wave:'sine', freq:380, freqEnd:640, dur:0.95, vol:0.62,
        attack:0.07, decay:0.20, sustain:0.55, release:0.28,
        vibRate:11, vibDepth:45, noiseAmt:0.68 }), 700, 4200), 0),
      // 금속 레일 shimmer — 날 등이 가이드에 긁히는 고역
      at(lowpass(synth({ wave:'triangle', freq:2600, freqEnd:3300, dur:0.85, vol:0.11,
        attack:0.09, decay:0.18, sustain:0.5, release:0.26,
        vibRate:7, vibDepth:90, noiseAmt:0.20 }), 6500), 0),
      // 레일 저역 rumble — 큰 공업용 커터라는 체급감. 밝기를 눌러 주는 역할도 한다.
      at(synth({ wave:'triangle', freq:150, freqEnd:110, dur:0.90, vol:0.30,
        attack:0.08, decay:0.20, sustain:0.45, release:0.30 }), 0),
      // 안착 "톡" — 재무장 예고 신호. 0.84초 지점이라 1.2초 안에 확실히 끝난다.
      at(lowpass(synth({ wave:'noise', freq:1, dur:0.09, vol:0.40,
        attack:0.0005, decay:0.025, sustain:0.0, release:0.04 }), 3800), 0.84),
      at(synth({ wave:'triangle', freq:1500, freqEnd:900, dur:0.07, vol:0.26,
        attack:0.0005, decay:0.022, sustain:0.0, release:0.035 }), 0.84),
    )
  })(),

  // ── 선긋기 (lineDraw) 3종 ──────────────────────────────────────────────────
  // 30cm 자 + 커터칼. 자를 대고 그은 직선이 2초간 남고, 그 선을 '가로지르는' 적만 잘린다.
  // 반응형 무기가 아니라 길목에 미리 깔아 두는 함정이므로, 소리도 타격감이 아니라
  // 「긋는다 → 지나가다 잘린다 → 사라진다」는 상태 전이를 들려주는 쪽으로 설계한다.
  //
  // 대역 배치(실측 centroid 기준):
  //   bikittyCutterSnap 3.7k · boxCutterHit 4.7k · bikittyCutterFire 4.9k
  //   bikittyCutterReload 6.9k · sharkHit 9.2k
  // 이 사이의 빈 자리에 slash를 아래(2.5k대), cross를 위(7.9k대)로 벌려 배치한다.
  // 전부 절차 합성이며 외부 샘플/타 게임 음원을 쓰지 않는다.

  // 1) 스으윽 — 자에 붙여 6.0 길이를 쭉 미는 직선 마찰음.
  //    bikittyCutterFire(0.058초)의 8배 길이로, '거리'가 시간으로 들리게 한다.
  //    저역통과를 2단으로 걸어 중심주파수를 2.5kHz대까지 끌어내렸다(1단은 6dB/oct라
  //    노이즈 상단이 새어 centroid가 7kHz로 뜬다 — reload가 그 사례다).
  //    커터칼 계열이 전부 3.7~4.9kHz에 몰려 있어, 이 무기만 그 아래에서 운다.
  'weapons/lineDrawSlash': () => (() => {
    const at = (samples, seconds) => {
      const offset = Math.floor(seconds * SR)
      const padded = new Float32Array(samples.length + offset)
      padded.set(samples, offset)
      return padded
    }
    return mix(
      // 마찰 베드 — 자 모서리를 따라 날이 미끄러지는 본체.
      // vib는 아주 얕게: 깊으면 '흔들리는 선'이 되고, 이 무기는 완벽한 직선이어야 한다.
      at(lowpass(lowpass(bandpass(synth({ wave:'sine', freq:430, freqEnd:760, dur:0.44, vol:0.72,
        attack:0.045, decay:0.15, sustain:0.62, release:0.17,
        vibRate:13, vibDepth:26, noiseAmt:0.56 }), 620, 2600), 2600), 2400), 0),
      // 자에 눌린 톤 스파인 — 상승하는 삼각파. 강체 모서리를 긁을 때 생기는 음정감이고,
      // 상승이 '앞으로 나아간다'는 방향감을 준다.
      at(lowpass(synth({ wave:'triangle', freq:880, freqEnd:1480, dur:0.42, vol:0.22,
        attack:0.05, decay:0.14, sustain:0.55, release:0.16 }), 3400), 0),
      // 빠져나가는 끝 — 후반부에만 밝은 대역을 얹어 시작보다 끝이 밝아진다.
      // 날이 재료를 관통해 반대편으로 빠지는 순간의 해방감이고, 이것이 '사거리 6.0을
      // 끝까지 그었다'는 종료 신호도 겸한다. 앞머리에 얹으면 그냥 치찰음이 된다.
      at(lowpass(bandpass(synth({ wave:'sine', freq:620, freqEnd:1150, dur:0.20, vol:0.38,
        attack:0.05, decay:0.05, sustain:0.72, release:0.09, noiseAmt:0.66 }), 2200, 4800), 4800), 0.26),
      // 바닥에 붙은 자의 저역 — 폰 스피커에서 hiss가 아니라 '긋는 물체'로 들리게 하는 몸통.
      at(synth({ wave:'triangle', freq:190, freqEnd:150, dur:0.45, vol:0.10,
        attack:0.04, decay:0.15, sustain:0.5, release:0.18 }), 0),
      // 시작점 접촉 — 날을 대는 순간의 작은 톡. 여기서 선이 시작된다는 표식.
      at(lowpass(lowpass(synth({ wave:'noise', freq:1, dur:0.024, vol:0.26,
        attack:0.0005, decay:0.008, sustain:0.0, release:0.014 }), 2200), 2200), 0),
    )
  })(),

  // 2) 서걱 — 절단선을 가로지른 적이 잘리는 순간. 아주 짧고 건조하게 끊는다.
  //    한 프레임에 여러 마리가 동시에 지날 수 있어 폴리포니가 실제로 겹친다. 그래서
  //    (a) 7.9kHz대 좁은 대역으로 몰아 boxCutterHit(4.7k)·bikittyCutterFire(4.9k)와
  //        1.7옥타브 떨어뜨리고,
  //    (b) 꼬리를 아예 남기지 않아(≈0.046초) 겹쳐도 잔향이 쌓이지 않게 한다.
  //    저역 몸통은 hiss 방지 최소량만 — 키우면 centroid가 커터칼 대역으로 내려온다.
  'weapons/lineDrawCross': () => (() => {
    const at = (samples, seconds) => {
      const offset = Math.floor(seconds * SR)
      const padded = new Float32Array(samples.length + offset)
      padded.set(samples, offset)
      return padded
    }
    return mix(
      // 절단 트랜지언트 — 4.6~8.6kHz 대역통과 위에 8.6kHz 저역통과를 한 번 더.
      // 상단을 12dB/oct로 닫아야 sharkHit(9.2k)·flaskTick(9.7k) 위로 새지 않는다.
      at(lowpass(bandpass(synth({ wave:'noise', freq:1, dur:0.038, vol:0.70,
        attack:0.0004, decay:0.012, sustain:0.0, release:0.021 }), 5000, 9400), 9400), 0),
      // 날의 에지 — 고역 삼각파를 짧게. 노이즈만이면 '치익'이 되고 절단면이 안 보인다.
      at(highpass(synth({ wave:'triangle', freq:4600, freqEnd:3200, dur:0.022, vol:0.24,
        attack:0.0004, decay:0.007, sustain:0.0, release:0.013 }), 2200), 0.001),
      // 최소 몸통 — 순수 hiss가 되지 않을 만큼만. 키우면 centroid가 커터칼 대역으로 내려온다.
      at(lowpass(synth({ wave:'triangle', freq:760, freqEnd:520, dur:0.030, vol:0.055,
        attack:0.0006, decay:0.010, sustain:0.0, release:0.017 }), 2400), 0.001),
    )
  })(),

  // 3) 스륵 — 2초 뒤 절단선이 스스로 지워지는 소멸음. 전투 중 가장 조용해야 한다.
  //    쿨다운 2.2초 + 지속 2초 = 4.2초마다 반복되므로, 존재를 알리되 주의를 끌면 안 된다.
  //    피로 회피 3원칙: (a) 어택 없는 하강 — 놀람 반사를 유발하는 트랜지언트가 없다,
  //    (b) 900Hz 저역통과 — 다른 어떤 무기·적 신호 대역에도 얹히지 않는다,
  //    (c) 피크를 0.3 미만으로 묶어 mix()의 정규화(peak>1일 때만 동작)에 걸리지 않게 한다.
  'weapons/lineDrawExpire': () => mix(
    // 하강하는 숨 — '지워진다'는 방향. 상승이면 무언가 생긴 신호로 오해된다.
    synth({ wave:'sine', freq:430, freqEnd:245, dur:0.22, vol:0.058,
      attack:0.022, decay:0.08, sustain:0.34, release:0.11 }),
    // 흩어지는 가루 — 900Hz 저역통과를 2단(12dB/oct)으로. 1단은 상단이 새어
    // '치이' 하는 hiss가 남고, 그러면 조용해도 존재감이 생겨 피로해진다.
    lowpass(lowpass(synth({ wave:'noise', freq:1, dur:0.20, vol:0.11,
      attack:0.03, decay:0.07, sustain:0.28, release:0.09 }), 900), 900),
    // 아주 옅은 몸통 — 폰 스피커에서 완전히 사라지지 않을 최소한.
    lowpass(lowpass(synth({ wave:'triangle', freq:620, freqEnd:380, dur:0.18, vol:0.038,
      attack:0.025, decay:0.06, sustain:0.3, release:0.09 }), 1100), 1100),
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
  // 좀비/보스 발성(zombieGroan/TankGroan/Spawn/RunnerScreech/RangedShoot/ChargeRoar, bossRoar/bossDeath,
  // events/bossSpawn)은 scripts/generate_voice_sfx.mjs(VOICE_SFX, 포먼트 발성)가 정본이다.
  // 여기 있던 옛 톱니/사인 프리셋(최저 20~80Hz)은 2026-11-14 Terry "너무 저음이거나 무거운 좀비 목소리
  // 다 바꿔"로 삭제했다 — 되살리면 이 스크립트 재실행 때 저음 그르렁으로 덮어쓴다.
  'enemies/zombieGiantThud': () => mix(
    synth({ wave:'sine', freq:60, freqEnd:20, dur:0.5, vol:0.8, attack:0.001, decay:0.15, sustain:0.1, release:0.3 }),
    synth({ wave:'noise', freq:1, dur:0.4, vol:0.5, attack:0.001, decay:0.12, sustain:0.05, release:0.25 }),
  ),
  // 마틸다 목소리 큐(Spawn/Dash/Laugh/Death/CountdownEnd)는 2026-11-14부터 scripts/generate_matilda_girl_voice.mjs
  // (CC0 실제 4살 여자아이 녹음, 자르기·정리만)가 만든다. 여기 합성 프리셋을 되살리면 --encode 때 옛 기계음으로
  // 덮어쓰고 src/lib/matildaGirlVoice.test.js가 실패한다. 목소리가 아닌 events/matildaWarningTick 비프만 여기 남는다.

  // ── 적 사망음 ────────────────────────────────────────────────────────────────
  // 좀비 사망음은 여기서 빠졌다 — 노이즈+톱니 버스트라 "음성"이 아니었다.
  // 포먼트가 들리는 발성 5종으로 대체 → scripts/generate_zombie_death_voices.mjs

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

  // ── Stage 5 「교무실 최종 돌파」 (B_stage5.md §11-2, 2026-11-08 soundmini) ──────────
  // 전부 자체 합성. 실존 교내 방송 차임·기존 게임 음원을 복제하지 않는다.
  // 전교 호출 경고 차임 1.6s — 딩-동-댕-동 4음(G5-E5-C5-G4, 스펙 음정). 사인 종 + 약한 스퀘어.
  'events/stage5CallChime': () => (() => {
    const notes = [784, 659, 523, 392]
    const layers = notes.map((f, i) => {
      const last = i === notes.length - 1
      const dur = last ? 0.52 : 0.5
      return at(mix(
        strike({ freq: f, dur, vol: 0.55, tau: last ? 0.34 : 0.26,
          partials: [[1, 1], [2, 0.18, 0.6], [3, 0.06, 0.4]] }),
        synth({ wave: 'square', freq: f, dur: 0.3, vol: 0.06, attack: 0.003, decay: 0.1, sustain: 0.3, release: 0.15 }),
      ), i * 0.36)
    })
    return peakTo(trimTo(mix(...layers), 1.6), 0.8)
  })(),
  // 호출 시작 0.4s — 마이크 '삑'(1kHz 블립) + 방송 히스 꼬리.
  'events/stage5CallStart': () => peakTo(trimTo(mix(
    sweptNoise({ dur: 0.015, from: 3000, to: 1500, vol: 0.25, attack: 0.001, release: 0.01 }),
    synth({ wave: 'sine', freq: 1000, dur: 0.13, vol: 0.6, attack: 0.002, decay: 0.02, sustain: 0.9, release: 0.025 }),
    synth({ wave: 'square', freq: 1000, dur: 0.13, vol: 0.1, attack: 0.002, decay: 0.02, sustain: 0.9, release: 0.025 }),
    at(sweptNoise({ dur: 0.29, from: 5200, to: 2400, vol: 0.16, attack: 0.01, release: 0.22 }), 0.11),
  ), 0.4), 0.8),
  // 결재 도장 내려찍기 0.35s — 저역 '쿵' + 종이 '착'.
  'enemies/b10StampSlam': () => peakTo(trimTo(mix(
    strike({ freq: 120, freqEnd: 48, dur: 0.3, vol: 0.9, tau: 0.09, partials: [[1, 1], [2, 0.25, 0.5]] }),
    strike({ freq: 240, freqEnd: 150, dur: 0.12, vol: 0.35, tau: 0.03 }),
    at(sweptNoise({ dur: 0.07, from: 6000, to: 3000, vol: 0.45, attack: 0.001, release: 0.05 }), 0.004),
    at(sweptNoise({ dur: 0.25, from: 2500, to: 1200, vol: 0.07, attack: 0.01, release: 0.2 }), 0.05),
  ), 0.35), 0.9),
  // 출석부 휘두르기 0.3s — 휙(상승 노이즈 스윕) + 끝에 장부 '팍'.
  'enemies/b10LedgerSwing': () => peakTo(trimTo(mix(
    sweptNoise({ dur: 0.24, from: 420, to: 3200, vol: 0.6, attack: 0.12, release: 0.09 }),
    at(mix(
      sweptNoise({ dur: 0.06, from: 3000, to: 1500, vol: 0.32, attack: 0.001, release: 0.045 }),
      strike({ freq: 180, freqEnd: 120, dur: 0.07, vol: 0.25, tau: 0.02 }),
    ), 0.22),
  ), 0.3), 0.85),
  // 교무회의 소집 0.5s — 탁상 종 '띵'(비조화 부분음 + 미세 디튠 맥놀이).
  'enemies/b10MeetingBell': () => peakTo(trimTo(mix(
    sweptNoise({ dur: 0.01, from: 6000, to: 4000, vol: 0.2, attack: 0.001, release: 0.006 }),
    strike({ freq: 1568, dur: 0.5, vol: 0.6, tau: 0.22,
      partials: [[1, 1], [1.004, 0.5], [2.76, 0.35, 0.5], [5.4, 0.15, 0.3]] }),
  ), 0.5), 0.75),

  // ── Stage 6 「운동장 최후의 조회」 (C_stage6.md C-11-2, 2026-11-08 soundmini) ───────
  // 국가·실존 교가·실제 교내 차임 선율 미사용. 음정은 전부 자작.
  // 훈화 마이크 하울링 0.5s — 사인 2.4kHz→3.1kHz 상승 + 약한 노이즈, 끝 50ms 페이드.
  'events/stage6MicFeedback': () => peakTo(trimTo(mix(
    synth({ wave: 'sine', freq: 2400, freqEnd: 3100, dur: 0.5, vol: 0.45, attack: 0.15, decay: 0.05,
      sustain: 0.95, release: 0.05, vibRate: 7, vibDepth: 25, noiseAmt: 0.05, overtones: [{ ratio: 2, amp: 0.08 }] }),
    synth({ wave: 'sine', freq: 120, dur: 0.5, vol: 0.06, attack: 0.02, decay: 0.05, sustain: 0.8, release: 0.05 }),
  ), 0.5), 0.6),
  // 훈화 고리 active 0.25s — 120Hz 저역 펄스 + 짧은 '웅' 포먼트.
  'events/stage6SpeechRingPulse': () => peakTo(trimTo(mix(
    strike({ freq: 120, freqEnd: 95, dur: 0.25, vol: 0.8, tau: 0.08, partials: [[1, 1], [2, 0.4, 0.6], [3, 0.2, 0.4]] }),
    peakTo(bandpass(lowpass(synth({ wave: 'sawtooth', freq: 125, freqEnd: 110, dur: 0.22, vol: 0.5,
      attack: 0.01, decay: 0.06, sustain: 0.4, release: 0.12 }), 900), 250, 900), 0.4),
  ), 0.25), 0.85),
  // 첫 훈화 튜토리얼 학교 종 1.6s — 자작 4음 D5-G5-A5-D6, 사각파(부드럽게 LP) + 한 옥타브 아래 사인.
  'events/stage6SchoolChime': () => (() => {
    const notes = [587, 784, 880, 1175]
    const layers = notes.map((f, i) => {
      const last = i === notes.length - 1
      const dur = last ? 0.52 : 0.4
      return at(mix(
        lowpass(synth({ wave: 'square', freq: f, dur, vol: 0.4, attack: 0.004, decay: 0.12, sustain: 0.35,
          release: last ? 0.3 : 0.2 }), 3200),
        synth({ wave: 'sine', freq: f / 2, dur, vol: 0.18, attack: 0.004, decay: 0.12, sustain: 0.3,
          release: last ? 0.3 : 0.2 }),
      ), i * 0.36)
    })
    return peakTo(trimTo(mix(...layers), 1.6), 0.8)
  })(),
  // 계주 호루라기 0.6s — 짧게 두 번, 3.2kHz 트릴.
  'events/stage6RelayWhistle': () => (() => {
    const blast = (dur, fStart, fEnd, vol) => mix(
      synth({ wave: 'sine', freq: fStart, freqEnd: fEnd, dur, vol, attack: 0.006, decay: 0.03, sustain: 0.9,
        release: 0.04, vibRate: 30, vibDepth: 170, noiseAmt: 0.05, overtones: [{ ratio: 1.5, amp: 0.14 }] }),
      synth({ wave: 'sine', freq: fStart + 120, freqEnd: fEnd + 120, dur, vol: vol * 0.45, attack: 0.006,
        decay: 0.03, sustain: 0.85, release: 0.04, vibRate: 30, vibDepth: 170 }),
    )
    return peakTo(trimTo(mix(
      blast(0.18, 3200, 3200, 0.75),
      at(blast(0.26, 3150, 3260, 0.8), 0.3),
    ), 0.6), 0.85)
  })(),
  // 교가 제창 windup 0.9s — 자작 3음 상행 금관풍 칩튠(G4-C5-E5), 마지막 음 비브라토로 끈다.
  'events/stage6AnthemSting': () => (() => {
    const note = (f, dur, last) => lowpass(mix(
      synth({ wave: 'sawtooth', freq: f, dur, vol: 0.45, attack: 0.025, decay: 0.08, sustain: 0.7,
        release: last ? 0.2 : 0.05, vibRate: last ? 5.5 : 0, vibDepth: last ? 6 : 0 }),
      synth({ wave: 'square', freq: f / 2, dur, vol: 0.14, attack: 0.025, decay: 0.08, sustain: 0.6,
        release: last ? 0.2 : 0.05 }),
    ), 2800)
    return peakTo(trimTo(mix(
      note(392, 0.2, false),
      at(note(523, 0.2, false), 0.2),
      at(note(659, 0.5, true), 0.4),
    ), 0.9), 0.85)
  })(),
  // 정문 개방 0.9s — 철문 미닫이 '드르륵'(22Hz 롤러 덜컹 AM 노이즈) + 끝에 '쿵'.
  'events/stage6GateOpen': () => peakTo(trimTo(mix(
    sweptNoise({ dur: 0.72, from: 1800, to: 900, vol: 0.5, attack: 0.04, release: 0.12, am: 22, amDepth: 0.85 }),
    lowpass(synth({ wave: 'sawtooth', freq: 520, freqEnd: 470, dur: 0.6, vol: 0.05, attack: 0.08, decay: 0.1,
      sustain: 0.6, release: 0.15 }), 1500),
    at(mix(
      strike({ freq: 95, freqEnd: 45, dur: 0.2, vol: 0.85, tau: 0.06, partials: [[1, 1], [2.3, 0.3, 0.4]] }),
      sweptNoise({ dur: 0.05, from: 2500, to: 1000, vol: 0.3, attack: 0.001, release: 0.04 }),
      strike({ freq: 620, dur: 0.18, vol: 0.18, tau: 0.05, partials: [[1, 1], [2.7, 0.4, 0.5]] }),
    ), 0.7),
  ), 0.9), 0.9),

  // ── B03 셔틀런 착지 '쿵' (2026-11-08 Terry "쿵쿵쿵") ───────────────────────────────
  // 0.22s. 저역 쿵(95→42Hz) + 폰 스피커용 180Hz 몸통 + 짧은 바닥 트랜지언트. 홉 간격(≥0.33s)보다 짧다.
  'enemies/b03ShuttleStomp': () => peakTo(trimTo(mix(
    strike({ freq: 95, freqEnd: 42, dur: 0.22, vol: 0.95, tau: 0.07, partials: [[1, 1], [2, 0.3, 0.5], [3, 0.12, 0.3]] }),
    strike({ freq: 180, freqEnd: 110, dur: 0.1, vol: 0.5, tau: 0.035, partials: [[1, 1], [2, 0.35, 0.6]] }),
    sweptNoise({ dur: 0.04, from: 900, to: 300, vol: 0.35, attack: 0.001, release: 0.03 }),
  ), 0.22), 0.9),

  // ── 신규 좀비 행동·사망 개그 21종 (2026-11-14 soundmini, Terry "각종 재미있는 효과음 모두 적용해") ──
  // 전부 자체 합성(용수철·휙·끽·슬픈 트롬본·소품 소리). 기존 게임/만화 음원·실존 멜로디 복제 없음.
  // 런타임 배정·간격 정본: src/lib/enemyAbilitySfx.js. 한 음원을 종마다 다른 피치(rate)로 나눠 쓴다.
  // 용수철 '뾰잉' 0.2s — 예고(신규 근접 12종·E55·E58). 빠른 비브라토가 스프링 떨림이다.
  'enemies/gagWindup': () => peakTo(trimTo(mix(
    synth({ wave: 'triangle', freq: 200, freqEnd: 520, dur: 0.2, vol: 0.6, attack: 0.004, decay: 0.06, sustain: 0.6, release: 0.08, vibRate: 26, vibDepth: 45 }),
    synth({ wave: 'sine', freq: 400, freqEnd: 1040, dur: 0.16, vol: 0.2, attack: 0.004, decay: 0.05, sustain: 0.4, release: 0.06, vibRate: 26, vibDepth: 80 }),
  ), 0.2), 0.8),
  // 휙 0.24s — 돌진·휘두르기. 상승 노이즈 스윕 + 아래로 떨어지는 몸통 사인.
  'enemies/gagSwoosh': () => peakTo(trimTo(mix(
    sweptNoise({ dur: 0.24, from: 500, to: 2800, vol: 0.7, attack: 0.1, release: 0.1 }),
    synth({ wave: 'sine', freq: 320, freqEnd: 150, dur: 0.2, vol: 0.12, attack: 0.05, decay: 0.05, sustain: 0.5, release: 0.08 }),
  ), 0.24), 0.8),
  // 운동화 '끽' 0.14s — 옆걸음·셔틀런. 2kHz대 떨리는 고음 + 고무 마찰 노이즈.
  'enemies/gagSneakerSqueak': () => peakTo(trimTo(mix(
    synth({ wave: 'sine', freq: 1750, freqEnd: 2300, dur: 0.14, vol: 0.5, attack: 0.01, decay: 0.03, sustain: 0.8, release: 0.04, vibRate: 45, vibDepth: 120 }),
    synth({ wave: 'square', freq: 1750, freqEnd: 2300, dur: 0.14, vol: 0.06, attack: 0.01, decay: 0.03, sustain: 0.6, release: 0.04, vibRate: 45, vibDepth: 120 }),
    sweptNoise({ dur: 0.12, from: 3500, to: 2500, vol: 0.12, attack: 0.01, release: 0.05 }),
  ), 0.14), 0.75),
  // 슬픈 트롬본 0.62s — 신규 근접 12종 사망 개그. 두 음(D4 → C4가 G3까지 미끄러짐), 마지막 음 떨림.
  'enemies/gagWahWah': () => (() => {
    const horn = (freq, freqEnd, dur, vib) => lowpass(mix(
      synth({ wave: 'sawtooth', freq, freqEnd, dur, vol: 0.5, attack: 0.03, decay: 0.06, sustain: 0.75, release: 0.08, vibRate: vib ? 6 : 0, vibDepth: vib ? 7 : 0 }),
      synth({ wave: 'square', freq: freq / 2, freqEnd: freqEnd / 2, dur, vol: 0.12, attack: 0.03, decay: 0.06, sustain: 0.6, release: 0.08 }),
    ), 1600)
    return peakTo(trimTo(mix(
      horn(294, 290, 0.2, false),
      at(horn(262, 196, 0.4, true), 0.22),
    ), 0.62), 0.8)
  })(),
  // 던지기 '휙' 0.16s — 지우개·우유갑·분필 투척.
  'enemies/gagToss': () => peakTo(trimTo(mix(
    sweptNoise({ dur: 0.16, from: 900, to: 3500, vol: 0.6, attack: 0.03, release: 0.08 }),
    synth({ wave: 'sine', freq: 600, freqEnd: 1200, dur: 0.12, vol: 0.12, attack: 0.01, decay: 0.03, sustain: 0.5, release: 0.05 }),
  ), 0.16), 0.75),
  // 물 '철퍽' 0.32s — 양동이·배수구·물덩이 착지.
  'enemies/gagSplash': () => peakTo(trimTo(mix(
    sweptNoise({ dur: 0.32, from: 3200, to: 600, vol: 0.6, attack: 0.004, release: 0.22, am: 30, amDepth: 0.5 }),
    synth({ wave: 'sine', freq: 420, freqEnd: 140, dur: 0.12, vol: 0.3, attack: 0.002, decay: 0.04, sustain: 0.4, release: 0.06 }),
  ), 0.32), 0.8),
  // 공 '퍽-뵹' 0.2s — 배구·야구·술래 터치.
  'enemies/gagBallThwack': () => peakTo(trimTo(mix(
    strike({ freq: 180, freqEnd: 90, dur: 0.12, vol: 0.8, tau: 0.035 }),
    sweptNoise({ dur: 0.04, from: 4000, to: 1500, vol: 0.35, attack: 0.001, release: 0.03 }),
    at(synth({ wave: 'sine', freq: 300, freqEnd: 520, dur: 0.12, vol: 0.18, attack: 0.005, decay: 0.04, sustain: 0.4, release: 0.06, vibRate: 22, vibDepth: 30 }), 0.05),
  ), 0.2), 0.8),
  // 합창 '라' 0.22s — 의사 음성(포먼트 /a/ 대역). E51 음표·E70 술래 부르기.
  'enemies/gagChoirLa': () => peakTo(trimTo(mix(
    peakTo(bandpass(synth({ wave: 'sawtooth', freq: 480, freqEnd: 523, dur: 0.22, vol: 0.6, attack: 0.025, decay: 0.05, sustain: 0.75, release: 0.08, vibRate: 5.5, vibDepth: 6 }), 650, 1300), 0.6),
    peakTo(bandpass(synth({ wave: 'sawtooth', freq: 480, freqEnd: 523, dur: 0.22, vol: 0.4, attack: 0.025, decay: 0.05, sustain: 0.7, release: 0.08 }), 1050, 1500), 0.25),
    synth({ wave: 'sine', freq: 523, dur: 0.22, vol: 0.15, attack: 0.025, decay: 0.05, sustain: 0.7, release: 0.08 }),
  ), 0.22), 0.75),
  // 물약 '뽀글' 0.26s — 기포 세 방울(빠른 상승 사인).
  'enemies/gagPotionBlorp': () => peakTo(trimTo(mix(
    synth({ wave: 'sine', freq: 300, freqEnd: 900, dur: 0.05, vol: 0.6, attack: 0.002, decay: 0.02, sustain: 0.6, release: 0.02 }),
    at(synth({ wave: 'sine', freq: 380, freqEnd: 1100, dur: 0.045, vol: 0.5, attack: 0.002, decay: 0.02, sustain: 0.6, release: 0.02 }), 0.08),
    at(synth({ wave: 'sine', freq: 260, freqEnd: 800, dur: 0.06, vol: 0.55, attack: 0.002, decay: 0.02, sustain: 0.6, release: 0.025 }), 0.17),
  ), 0.26), 0.75),
  // 물감 '철썩' 0.2s.
  'enemies/gagPaintSplat': () => peakTo(trimTo(mix(
    sweptNoise({ dur: 0.2, from: 2500, to: 400, vol: 0.6, attack: 0.001, release: 0.15 }),
    strike({ freq: 140, freqEnd: 70, dur: 0.1, vol: 0.4, tau: 0.03 }),
  ), 0.2), 0.8),
  // 확성기 '뿌왕' 0.32s — 카주풍 부저(사각파 + 대역 필터 + 버즈 노이즈).
  'enemies/gagMegaphone': () => peakTo(trimTo(bandpass(mix(
    synth({ wave: 'square', freq: 233, freqEnd: 208, dur: 0.32, vol: 0.5, attack: 0.015, decay: 0.05, sustain: 0.8, release: 0.08, vibRate: 6, vibDepth: 8, noiseAmt: 0.1 }),
    synth({ wave: 'sawtooth', freq: 466, freqEnd: 416, dur: 0.32, vol: 0.2, attack: 0.015, decay: 0.05, sustain: 0.7, release: 0.08, vibRate: 6, vibDepth: 16 }),
  ), 500, 2600), 0.32), 0.75),
  // 반짝 상승 4음 0.3s — 보건실 회복·학생회 방패(적 버프).
  'enemies/gagBuffSparkle': () => peakTo(trimTo(mix(
    ...[1047, 1319, 1568, 2093].map((f, k) => at(strike({ freq: f, dur: 0.14, vol: 0.45, tau: 0.05, partials: [[1, 1], [2, 0.2, 0.5]] }), k * 0.05)),
  ), 0.3), 0.7),
  // 종이 '착' 0.09s — 출석카드·시험지·종이비행기.
  'enemies/gagCardFlick': () => peakTo(trimTo(mix(
    sweptNoise({ dur: 0.06, from: 6000, to: 2500, vol: 0.6, attack: 0.001, release: 0.04 }),
    strike({ freq: 1500, dur: 0.03, vol: 0.2, tau: 0.008 }),
  ), 0.09), 0.7),
  // 줄 '휘리릭' 0.3s — 줄넘기·부메랑 자·지구본 회전(진폭 18Hz 흔들림).
  'enemies/gagRopeWhirr': () => peakTo(trimTo(
    sweptNoise({ dur: 0.3, from: 800, to: 1900, vol: 0.6, attack: 0.04, release: 0.1, am: 18, amDepth: 0.8 }),
  0.3), 0.75),
  // 식판 '쨍그랑' 0.32s — 비조화 금속 부분음 세 번.
  'enemies/gagTrayClatter': () => peakTo(trimTo(mix(
    strike({ freq: 620, dur: 0.3, vol: 0.5, tau: 0.07, partials: [[1, 1], [2.76, 0.6, 0.6], [5.4, 0.4, 0.4], [8.9, 0.2, 0.3]] }),
    at(strike({ freq: 540, dur: 0.2, vol: 0.4, tau: 0.05, partials: [[1, 1], [2.76, 0.5, 0.6], [5.4, 0.3, 0.4]] }), 0.09),
    at(strike({ freq: 700, dur: 0.14, vol: 0.25, tau: 0.04, partials: [[1, 1], [2.76, 0.5, 0.6]] }), 0.17),
    sweptNoise({ dur: 0.06, from: 5000, to: 2500, vol: 0.25, attack: 0.001, release: 0.05 }),
  ), 0.32), 0.75),
  // 분필가루 '풀썩' 0.26s.
  'enemies/gagChalkPuff': () => peakTo(trimTo(mix(
    sweptNoise({ dur: 0.26, from: 1800, to: 500, vol: 0.6, attack: 0.02, release: 0.18 }),
    strike({ freq: 110, freqEnd: 70, dur: 0.1, vol: 0.25, tau: 0.04 }),
  ), 0.26), 0.75),
  // 플라나리아 '쭈왑-뽁' 0.3s — 끈적한 상승음 + 끝에 팝.
  'enemies/gagSplitSquelch': () => peakTo(trimTo(mix(
    synth({ wave: 'sine', freq: 180, freqEnd: 520, dur: 0.22, vol: 0.45, attack: 0.01, decay: 0.05, sustain: 0.7, release: 0.05, vibRate: 30, vibDepth: 40 }),
    lowpass(sweptNoise({ dur: 0.22, from: 900, to: 1400, vol: 0.35, attack: 0.02, release: 0.06, am: 30, amDepth: 0.7 }), 1800),
    at(strike({ freq: 700, freqEnd: 300, dur: 0.07, vol: 0.5, tau: 0.02 }), 0.22),
  ), 0.3), 0.8),
  // 도미노 '딱' 0.08s — 나무 패. 연쇄로 여러 번 울린다.
  'enemies/gagDominoClack': () => peakTo(trimTo(mix(
    strike({ freq: 1100, dur: 0.08, vol: 0.6, tau: 0.012, partials: [[1, 1], [2.3, 0.4, 0.6]] }),
    sweptNoise({ dur: 0.02, from: 4000, to: 2500, vol: 0.3, attack: 0.001, release: 0.015 }),
  ), 0.08), 0.75),
  // 순간이동 '뿅' 0.18s.
  'enemies/gagBlinkPop': () => peakTo(trimTo(mix(
    synth({ wave: 'sine', freq: 400, freqEnd: 1600, dur: 0.12, vol: 0.6, attack: 0.003, decay: 0.04, sustain: 0.6, release: 0.05 }),
    synth({ wave: 'square', freq: 200, freqEnd: 800, dur: 0.12, vol: 0.08, attack: 0.003, decay: 0.04, sustain: 0.5, release: 0.05 }),
    at(strike({ freq: 1600, dur: 0.06, vol: 0.2, tau: 0.02 }), 0.11),
  ), 0.18), 0.75),
  // 우유갑 '펑' 0.25s — 터짐 + 짧은 물 튐 꼬리.
  'enemies/gagCartonPop': () => peakTo(trimTo(mix(
    strike({ freq: 220, freqEnd: 80, dur: 0.12, vol: 0.7, tau: 0.05 }),
    sweptNoise({ dur: 0.06, from: 3500, to: 800, vol: 0.45, attack: 0.001, release: 0.05 }),
    at(sweptNoise({ dur: 0.15, from: 2000, to: 700, vol: 0.18, attack: 0.01, release: 0.12 }), 0.08),
  ), 0.25), 0.8),
  // 소품 '와르르 딸그락' 0.32s — 학용품이 떨어지는 작은 딸깍 네 번.
  'enemies/gagPropClatter': () => peakTo(trimTo(mix(
    ...[[900, 0], [1300, 0.06], [700, 0.13], [1100, 0.2]].map(([f, t]) => at(mix(
      strike({ freq: f, dur: 0.06, vol: 0.5, tau: 0.016, partials: [[1, 1], [2.4, 0.35, 0.5]] }),
      sweptNoise({ dur: 0.015, from: 4500, to: 2500, vol: 0.18, attack: 0.001, release: 0.01 }),
    ), t)),
  ), 0.32), 0.75),
}

function encodeDeployPair(wavPath) {
  const ffmpeg = process.env.FFMPEG_BINARY || 'ffmpeg'
  const base = wavPath.replace(/\.wav$/, '')
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wavPath, '-ac', '1', '-ar', String(SR), '-c:a', 'libvorbis', '-q:a', '2', base + '.ogg'])
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wavPath, '-ac', '1', '-ar', String(SR), '-c:a', 'libmp3lame', '-b:a', '64k', base + '.mp3'])
  unlinkSync(wavPath)
}

// ── 생성 실행 ─────────────────────────────────────────────────────────────────
// 필터 인자: node generate_sfx.mjs [부분문자열] — 매칭되는 사운드만 재생성.
// (noise 파형이 Math.random 기반이라 전체 재생성 시 모든 파일이 바뀜 → 선택 재생성 필수)
export { sounds, synth, writeWav }
// --encode: WAV를 배포 쌍(OGG libvorbis q2 / MP3 64k, 44.1kHz 모노)으로 바꾸고 WAV는 지운다.
//   ffmpeg 경로는 FFMPEG_BINARY 환경변수(예: node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe).
if (process.argv[1] && process.argv[1].endsWith('generate_sfx.mjs')) {
  const args = process.argv.slice(2)
  const encode = args.includes('--encode')
  const filter = args.find((arg) => !arg.startsWith('--'))
  let count = 0
  for (const [id, gen] of Object.entries(sounds)) {
    if (filter && !id.includes(filter)) continue
    const samples = gen()
    const filepath = join(OUT, id + '.wav')
    writeWav(filepath, samples)
    if (encode) encodeDeployPair(filepath)
    count++
    process.stdout.write(`\r생성 중... ${count}/${Object.keys(sounds).length} — ${id}.wav`)
  }
  console.log(`\n✓ ${count}개 사운드 생성 완료 → public/sfx/`)
}
