/**
 * 좀비 사망 "음성" 5종 생성기 — 외부 의존성 없음(Node 내장 + ffmpeg만).
 *
 * 8비트 시대 음성 표현 기법을 그대로 옮긴 source-filter 합성기다.
 *   - 여기(excitation): 성문 펄스열(TMS5220의 chirp ROM = 글로탈 펄스 루프) +
 *     LFSR 노이즈(무성음/마찰음). TI LPC 칩이 유성/무성을 이 둘로 갈랐다.
 *   - 필터: 2-pole 공명기 3개(F1/F2/F3) 병렬. SAM(Software Automatic Mouth, C64 1982)이
 *     A1*sin(f1t)+A2*sin(f2t)+A3*rect(f3t)로 근사했던 그 3포먼트 구조를,
 *     고정 사인 대신 공명기로 바꿔 성문 펄스의 배음이 포먼트에 걸리게 했다.
 *     -> 모음 색깔(ㅡ/ㅓ/ㅏ/ㅜ/ㅣ)이 실제로 들린다.
 *   - 포먼트 궤적: SAM의 phoneme transition table처럼 키프레임 사이를 선형 보간한다.
 *     모음이 시간에 따라 움직여야 "으윽", "끄아앙"처럼 읽힌다.
 *   - 자음: amp=0 구간(폐쇄) -> noise 버스트(파열). 8비트기가 파열음을 만든 방식.
 *   - 8비트 질감: sample-and-hold 다운샘플(NES DPCM의 낮은 고정 샘플레이트) +
 *     6~8비트 양자화(DPCM 출력이 7비트 0~127이었다).
 *
 * 난수는 전부 시드 고정(LFSR + mulberry32)이라 재실행해도 바이트가 동일하다.
 * generate_sfx.mjs가 Math.random을 써서 전체 재생성 시 모든 파일이 바뀌던 문제를 피한다.
 *
 * 실행: node scripts/generate_zombie_death_voices.mjs [id필터]
 * ffmpeg 경로는 FFMPEG_BINARY 환경변수로 덮어쓸 수 있다.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, '../public/sfx/enemies')
const TMP = join(__dir, '../tmp_zombie_voice')
const FFMPEG = process.env.FFMPEG_BINARY || 'ffmpeg'

const SR = 22050 // 음성은 8kHz 위에 정보가 거의 없다. 파일 용량 절반.
const PI2 = Math.PI * 2

// ── 모음 포먼트 표 ────────────────────────────────────────────────────────────
// [F1, F2, F3, BW1, BW2, BW3, A1, A2, A3]
// 남성 화자 기준값에서 출발해 좀비용으로 F1을 조금 낮췄다(목이 눌린 소리).
const VOWELS = {
  aa: [700, 1150, 2600, 90, 110, 160, 1.0, 0.5, 0.2], // ㅏ
  aw: [570, 850, 2400, 85, 100, 150, 1.0, 0.45, 0.16], // ㅓ(원순)
  oh: [450, 800, 2550, 80, 95, 150, 1.0, 0.4, 0.14], // ㅗ
  oo: [320, 800, 2400, 75, 95, 150, 1.0, 0.32, 0.1], // ㅜ
  eu: [330, 1300, 2200, 80, 110, 160, 1.0, 0.42, 0.16], // ㅡ
  uh: [640, 1190, 2390, 90, 110, 160, 1.0, 0.48, 0.18], // ㅓ
  ee: [280, 2250, 2950, 70, 130, 180, 1.0, 0.6, 0.3], // ㅣ
  ng: [260, 1100, 2300, 200, 200, 260, 1.0, 0.35, 0.12], // ㅇ 받침(비음: 대역폭 넓음)
}

// ── 결정적 난수 ───────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// NES/TMS5220 계열 15비트 LFSR 노이즈. 순수 white noise보다 살짝 색이 있다.
function makeLfsr(seed) {
  let reg = (seed & 0x7fff) || 1
  return () => {
    const bit = (reg ^ (reg >> 1)) & 1
    reg = (reg >> 1) | (bit << 14)
    return reg & 1 ? 1 : -1
  }
}

// ── 보간 ──────────────────────────────────────────────────────────────────────
function lerp(a, b, k) {
  return a + (b - a) * k
}

function sampleContour(points, t) {
  if (t <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    if (t <= points[i][0]) {
      const [t0, v0] = points[i - 1]
      const [t1, v1] = points[i]
      const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0)
      return lerp(v0, v1, k)
    }
  }
  return points[points.length - 1][1]
}

function sampleFrames(frames, t) {
  let lo = frames[0]
  let hi = frames[0]
  let k = 0
  if (t > frames[0].t) {
    lo = frames[frames.length - 1]
    hi = frames[frames.length - 1]
    for (let i = 1; i < frames.length; i++) {
      if (t <= frames[i].t) {
        lo = frames[i - 1]
        hi = frames[i]
        const span = hi.t - lo.t
        k = span === 0 ? 0 : (t - lo.t) / span
        break
      }
    }
  }
  const a = VOWELS[lo.v]
  const b = VOWELS[hi.v]
  const formants = new Array(9)
  for (let i = 0; i < 9; i++) formants[i] = lerp(a[i], b[i], k)
  return {
    formants,
    amp: lerp(lo.amp, hi.amp, k),
    voice: lerp(lo.voice, hi.voice, k),
    noise: lerp(lo.noise, hi.noise, k),
  }
}

// ── 합성 본체 ─────────────────────────────────────────────────────────────────
export function synthVoice(spec) {
  const n = Math.floor(SR * spec.dur)
  const out = new Float32Array(n)
  const rnd = mulberry32(spec.seed)
  const lfsr = makeLfsr(spec.seed ^ 0x5a5a)

  // 3개 공명기 상태 (Klatt 2-pole: y = A x + B y[-1] + C y[-2])
  const state = [
    [0, 0],
    [0, 0],
    [0, 0],
  ]

  let glottalPhase = 0
  let prevGlottal = 0
  let jitterHold = 0
  let jitterValue = 0

  const Tp = 0.4 // 성문 개방 상승 구간
  const Tn = 0.16 // 폐쇄(하강) 구간

  for (let i = 0; i < n; i++) {
    const t = i / SR
    const p = i / n

    const fr = sampleFrames(spec.frames, p)
    let f0 = sampleContour(spec.f0, p)

    // 비브라토 + 지터(피치 흔들림) — 기계음을 유기적으로 만든다
    if (spec.vib) f0 *= 1 + spec.vib.depth * Math.sin(PI2 * spec.vib.rate * t)
    if (spec.jitter) {
      if (i >= jitterHold) {
        jitterValue = (rnd() * 2 - 1) * spec.jitter
        jitterHold = i + Math.floor(SR / f0)
      }
      f0 *= 1 + jitterValue
    }

    // 성문 펄스 (Rosenberg 근사) -> 미분해서 여기 신호로 사용
    glottalPhase += f0 / SR
    if (glottalPhase >= 1) glottalPhase -= 1
    let g = 0
    if (glottalPhase < Tp) g = 0.5 * (1 - Math.cos(Math.PI * glottalPhase / Tp))
    else if (glottalPhase < Tp + Tn) g = Math.cos(Math.PI * (glottalPhase - Tp) / (2 * Tn))
    const glottal = (g - prevGlottal) * 6
    prevGlottal = g

    const excitation = fr.voice * glottal + fr.noise * lfsr() * 0.55

    // 병렬 포먼트 뱅크
    let acc = 0
    for (let b = 0; b < 3; b++) {
      const F = fr.formants[b]
      const BW = fr.formants[3 + b]
      const A = fr.formants[6 + b]
      const r = Math.exp(-Math.PI * BW / SR)
      const B = 2 * r * Math.cos(PI2 * F / SR)
      const C = -r * r
      const gain = 1 - B - C
      const y = gain * excitation + B * state[b][0] + C * state[b][1]
      state[b][1] = state[b][0]
      state[b][0] = y
      acc += A * y
    }

    let v = acc * fr.amp

    // 진동음(르륵) — 진폭 게이팅. 목젖 떨림/구개수 전동음의 8비트식 근사.
    if (spec.trill) {
      const shape = Math.pow(0.5 + 0.5 * Math.cos(PI2 * spec.trill.rate * t), 1.6)
      v *= 1 - spec.trill.depth + spec.trill.depth * shape
    }
    // 링 모듈레이션 — SID 시절 괴물 목소리 트릭. 저주파 부화음이 덩치를 만든다.
    if (spec.ring) v *= 1 - spec.ring.depth + spec.ring.depth * Math.sin(PI2 * spec.ring.rate * t)

    out[i] = Math.tanh(v * (spec.drive ?? 1.6)) * 0.85
  }

  // ── 8비트 질감: sample-and-hold 다운샘플 + 비트 양자화 ──────────────────────
  const hold = spec.hold ?? 1
  if (hold > 1) {
    for (let i = 0; i < n; i += hold) {
      const s = out[i]
      for (let j = 1; j < hold && i + j < n; j++) out[i + j] = s
    }
  }
  const levels = Math.pow(2, spec.bits ?? 8) / 2
  for (let i = 0; i < n; i++) out[i] = Math.round(out[i] * levels) / levels

  // ── 음량 정렬 ───────────────────────────────────────────────────────────────
  // 피크 정규화는 쓰면 안 된다. 실측했더니 bellow RMS 0.17 vs shriek 0.52로
  // 약 10dB 벌어졌다 — 거대 좀비가 러너보다 작게 죽는 역전이 생긴다.
  // 단순 전체 RMS도 안 된다. bellow는 꼬리가 길어서 조용한 구간이 평균을 끌어내린다.
  // 그래서 EBU R128식 게이팅: 10ms 프레임 중 큰 쪽 40%만으로 라우드니스를 잰다.
  // = "소리의 큰 부분"끼리 맞추므로 길이가 달라도 체감 음량이 맞는다.
  const gatedLoudness = (buf) => {
    const hop = Math.max(1, Math.floor(SR * 0.01))
    const frames = []
    for (let i = 0; i + hop <= buf.length; i += hop) {
      let s = 0
      for (let j = 0; j < hop; j++) s += buf[i + j] * buf[i + j]
      frames.push(s / hop)
    }
    if (!frames.length) return 0
    frames.sort((a, b) => b - a)
    const keep = Math.max(1, Math.round(frames.length * 0.4))
    let sum = 0
    for (let i = 0; i < keep; i++) sum += frames[i]
    return Math.sqrt(sum / keep)
  }

  // targetLoudness 기준값은 이 소리들이 대체한 구 자산의 실측치다:
  // zombieDeath gated=0.200 / zombieHeavyDeath gated=0.229 (라이브러리 87개 중앙값 0.190).
  // 처음엔 0.36~0.40으로 뽑았다가 라이브러리 전체를 다시 재고 되돌렸다 — 그 값이면
  // 사망음이 전 음원 중 최상위권 라우드니스가 되어 난전에서 믹스를 다 잡아먹는다.
  // 등청감 보정은 유지: 고음(shriek)은 낮게, 저음(bellow)은 높게.
  const target = spec.targetLoudness ?? 0.2
  const loud0 = gatedLoudness(out)
  const norm = loud0 > 0 ? target / loud0 : 1

  // tanh 소프트 리미터 — 크레스트 팩터를 줄여 피크를 잡으면서 몸통은 살린다.
  // 하드 리니어 감쇠로 피크를 맞추면 bellow처럼 스파이크가 큰 소리만 확 작아진다.
  const SHAPE = 1.4
  // 0.89: 손실 압축(ogg/mp3)은 디코드 시 원본보다 피크가 살짝 넘친다.
  // 0.95로 두면 bellow 디코드 피크가 1.00까지 올라가 재생 클리핑 위험이 있었다.
  const shapeNorm = 0.89 / Math.tanh(SHAPE)
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * norm * SHAPE) * shapeNorm

  // 리미팅으로 달라진 라우드니스를 다시 목표에 맞춘다(피크는 0.97로 하드 가드).
  const loud1 = gatedLoudness(out)
  let trim = loud1 > 0 ? target / loud1 : 1
  let peak = 0
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i] * trim))
  // 0.85: 0.90으로 두면 bellow의 ogg 디코드에서 4샘플이 -32768로 포화했다(실측).
  // Vorbis 디코드 오버슈트를 흡수할 여유를 더 준다.
  if (peak > 0.85) trim *= 0.85 / peak

  const fadeIn = Math.floor(SR * 0.0015)
  const fadeOut = Math.floor(SR * 0.006)
  for (let i = 0; i < n; i++) {
    let k = trim
    if (i < fadeIn) k *= i / fadeIn
    if (i > n - fadeOut) k *= (n - i) / fadeOut
    out[i] *= k
  }
  return out
}

// ── WAV ───────────────────────────────────────────────────────────────────────
function writeWav(filepath, samples) {
  const len = samples.length
  const buf = Buffer.alloc(44 + len * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + len * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(len * 2, 40)
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }
  mkdirSync(dirname(filepath), { recursive: true })
  writeFileSync(filepath, buf)
}

// ── 5종 사망 발성 사양 ────────────────────────────────────────────────────────
// 구분 축: 기본 피치대 / 길이 / 모음 궤적 / 노이즈 비율 / 8비트 열화 정도.
export const VOICES = {
  // "으윽" — 기본 잡몹(E01/E07/RZG). 짧고 건조한 신음 + ㄱ 받침 폐쇄·파열.
  zombieDeathGrunt: {
    dur: 0.34,
    targetLoudness: 0.2,
    seed: 0x1001,
    hold: 2,
    bits: 7,
    drive: 1.7,
    f0: [
      [0, 136],
      [0.7, 112],
      [1, 92],
    ],
    jitter: 0.012,
    frames: [
      { t: 0.0, v: 'eu', amp: 0.0, voice: 1, noise: 0.45 },
      { t: 0.05, v: 'eu', amp: 1.0, voice: 1, noise: 0.14 },
      { t: 0.38, v: 'eu', amp: 0.88, voice: 1, noise: 0.1 },
      { t: 0.62, v: 'uh', amp: 0.62, voice: 1, noise: 0.12 },
      { t: 0.76, v: 'oo', amp: 0.28, voice: 1, noise: 0.16 },
      { t: 0.83, v: 'oo', amp: 0.0, voice: 1, noise: 0.2 },
      { t: 0.9, v: 'oo', amp: 0.0, voice: 0, noise: 1.0 },
      { t: 0.93, v: 'eu', amp: 0.48, voice: 0, noise: 1.0 },
      { t: 1.0, v: 'eu', amp: 0.0, voice: 0, noise: 1.0 },
    ],
  },

  // "우어억" — 뚱뚱한 탱커/차저(E02/E05/RZT). 낮고 길고 축 늘어진 웨블.
  zombieDeathHeavy: {
    dur: 0.6,
    targetLoudness: 0.21,
    seed: 0x2002,
    hold: 3,
    bits: 6,
    drive: 1.9,
    f0: [
      [0, 92],
      [0.5, 74],
      [1, 56],
    ],
    vib: { rate: 5.2, depth: 0.062 },
    jitter: 0.018,
    frames: [
      { t: 0.0, v: 'oo', amp: 0.0, voice: 1, noise: 0.4 },
      { t: 0.06, v: 'oo', amp: 0.92, voice: 1, noise: 0.16 },
      { t: 0.3, v: 'aw', amp: 1.0, voice: 1, noise: 0.14 },
      { t: 0.58, v: 'aa', amp: 0.88, voice: 1, noise: 0.16 },
      { t: 0.74, v: 'aw', amp: 0.55, voice: 1, noise: 0.2 },
      { t: 0.85, v: 'oh', amp: 0.0, voice: 1, noise: 0.25 },
      { t: 0.9, v: 'oh', amp: 0.0, voice: 0, noise: 1.0 },
      { t: 0.94, v: 'aw', amp: 0.42, voice: 0, noise: 1.0 },
      { t: 1.0, v: 'aw', amp: 0.0, voice: 0, noise: 1.0 },
    ],
  },

  // "끼야악" — 러너/런크루(E03/RZC/RZL). 높고 짧고 날카로운 비명. 열화 최소로 밝게.
  zombieDeathShriek: {
    dur: 0.3,
    targetLoudness: 0.175,
    seed: 0x3003,
    hold: 1,
    bits: 8,
    drive: 1.5,
    f0: [
      [0, 300],
      [0.12, 372],
      [0.5, 336],
      [1, 238],
    ],
    vib: { rate: 11.5, depth: 0.045 },
    jitter: 0.022,
    frames: [
      { t: 0.0, v: 'ee', amp: 0.0, voice: 0, noise: 1.0 },
      { t: 0.03, v: 'ee', amp: 0.8, voice: 0, noise: 1.0 },
      { t: 0.07, v: 'ee', amp: 1.0, voice: 1, noise: 0.2 },
      { t: 0.28, v: 'ee', amp: 0.96, voice: 1, noise: 0.12 },
      { t: 0.46, v: 'aa', amp: 1.0, voice: 1, noise: 0.1 },
      { t: 0.8, v: 'aa', amp: 0.7, voice: 1, noise: 0.14 },
      { t: 0.91, v: 'aa', amp: 0.0, voice: 1, noise: 0.3 },
      { t: 1.0, v: 'aa', amp: 0.0, voice: 0, noise: 1.0 },
    ],
  },

  // "커르륵" — 원거리 침뱉기(E04). 26Hz 진동음으로 목 가르랑거림, 노이즈 비율 최고.
  zombieDeathGurgle: {
    dur: 0.48,
    targetLoudness: 0.2,
    seed: 0x4004,
    hold: 2,
    bits: 6,
    drive: 1.8,
    f0: [
      [0, 152],
      [0.6, 124],
      [1, 100],
    ],
    trill: { rate: 26, depth: 0.58 },
    jitter: 0.03,
    frames: [
      { t: 0.0, v: 'uh', amp: 0.0, voice: 0, noise: 1.0 },
      { t: 0.04, v: 'uh', amp: 0.9, voice: 0, noise: 1.0 },
      { t: 0.1, v: 'uh', amp: 0.95, voice: 1, noise: 0.45 },
      { t: 0.35, v: 'eu', amp: 0.88, voice: 1, noise: 0.5 },
      { t: 0.62, v: 'eu', amp: 0.82, voice: 1, noise: 0.55 },
      { t: 0.8, v: 'oo', amp: 0.55, voice: 1, noise: 0.5 },
      { t: 0.88, v: 'oo', amp: 0.0, voice: 1, noise: 0.6 },
      { t: 0.92, v: 'oo', amp: 0.0, voice: 0, noise: 1.0 },
      { t: 0.95, v: 'eu', amp: 0.4, voice: 0, noise: 1.0 },
      { t: 1.0, v: 'eu', amp: 0.0, voice: 0, noise: 1.0 },
    ],
  },

  // "끄아아앙" — 거대 좀비(E06) 단독. 최저 피치 + 링모드 부화음 + 비음 받침으로 끝.
  zombieDeathBellow: {
    dur: 0.82,
    targetLoudness: 0.23,
    seed: 0x5005,
    hold: 3,
    bits: 6,
    drive: 2.0,
    f0: [
      [0, 74],
      [0.35, 63],
      [1, 45],
    ],
    vib: { rate: 4.2, depth: 0.05 },
    ring: { rate: 31, depth: 0.3 },
    jitter: 0.015,
    frames: [
      { t: 0.0, v: 'eu', amp: 0.0, voice: 0, noise: 1.0 },
      { t: 0.03, v: 'eu', amp: 0.78, voice: 0, noise: 1.0 },
      { t: 0.08, v: 'eu', amp: 0.9, voice: 1, noise: 0.2 },
      { t: 0.2, v: 'aa', amp: 1.0, voice: 1, noise: 0.13 },
      { t: 0.55, v: 'aa', amp: 0.95, voice: 1, noise: 0.13 },
      { t: 0.75, v: 'aw', amp: 0.8, voice: 1, noise: 0.15 },
      { t: 0.9, v: 'ng', amp: 0.45, voice: 1, noise: 0.12 },
      { t: 1.0, v: 'ng', amp: 0.0, voice: 1, noise: 0.12 },
    ],
  },
}

// ── 실행 ──────────────────────────────────────────────────────────────────────
// import 되었을 때는 생성하지 않는다(테스트가 VOICES/synthVoice만 읽을 수 있게).
if (process.argv[1] && process.argv[1].endsWith('generate_zombie_death_voices.mjs')) {
  const filter = process.argv[2]
  mkdirSync(TMP, { recursive: true })
  mkdirSync(OUT, { recursive: true })
  let made = 0
  for (const [id, spec] of Object.entries(VOICES)) {
    if (filter && !id.includes(filter)) continue
    const wav = join(TMP, `${id}.wav`)
    writeWav(wav, synthVoice(spec))
    const ogg = join(OUT, `${id}.ogg`)
    const mp3 = join(OUT, `${id}.mp3`)
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '2', '-ar', String(SR), ogg])
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', String(SR), mp3])
    console.log(`ok ${id}  (${spec.dur.toFixed(2)}s, ${spec.bits}bit, hold x${spec.hold})`)
    made++
  }
  rmSync(TMP, { recursive: true, force: true })
  console.log(`\n${made}개 좀비 사망 발성 생성 완료 -> public/sfx/enemies/`)
}
