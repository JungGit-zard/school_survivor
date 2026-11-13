/*
 * 마틸다 "귀여운 여자아이" 음성 생성기 (2026-11-14, Terry: "완전히 바꿔라. 귀여운 여자아이 목소리로").
 *
 * 이전 마틸다 음성은 3-포먼트 합성 + 8비트 양자화라 성인 포먼트에 피치만 올린 "기계음"이었다.
 * 이번에는 실제 아이 목소리 녹음(CC0)을 재료로 쓴다:
 *   - BigSoundBank (Joseph SARDIN) CC0 public domain, https://bigsoundbank.com/licenses.html
 *   - #1660 "Laughter of children"  (4.5세 여아 + 2.5세 남아가 마이크 앞에서 웃는 흉내)
 *   - #1662 / #1663 / #1677 "Howling of a girl" (4.5세 여아 비명, 단독)
 * 원본은 SHA-256으로 고정해 내려받고(계정/키 불필요), 아래 가공만 한다:
 *   음절 잘라내기·재배열, 짧은 리샘플(±몇 반음), TD-PSOLA(포먼트 유지 피치 이동),
 *   숨소리("h")/자음 버스트 노이즈, 엔벨로프, 라우드니스 정규화.
 * 단어가 없는 비언어 발성(키득/헤헤/꺄)만 만든다 — ko/en/ja 현지화 불필요.
 *
 * 실행:
 *   node scripts/generate_matilda_girl_voice.mjs                # 채택 후보를 public/sfx에 설치
 *   node scripts/generate_matilda_girl_voice.mjs --audition DIR # A/B/C 전부 DIR에 출력(설치 안 함)
 *   환경변수 FFMPEG_BINARY, EZS_VOICE_SOURCE_CACHE(원본 캐시 폴더) 선택.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')
const FFMPEG = process.env.FFMPEG_BINARY || ffmpegInstaller.path
const SR = 44100
const OUT_SR = 22050 // 기존 public/sfx 규약(22.05kHz, ogg q2 + mp3 64k)
const PI2 = Math.PI * 2

export const INSTALLED_CANDIDATE = 'A'

export const SOURCES = Object.freeze({
  laugh1660: { url: 'https://bigsoundbank.com/UPLOAD/ogg/1660.ogg', sha256: '6d39b48db136a604cca10d0bec9cb75822fc951c32df51c61d749c21bde412d1', page: 'https://bigsoundbank.com/laughter-of-children-s1660.html' },
  girl1662: { url: 'https://bigsoundbank.com/UPLOAD/mp3/1662.mp3', sha256: '51c3d7c59011808b683e8f7d17d3cf48b5cc2faa49797d4e0fd23a04db06a005', page: 'https://bigsoundbank.com/howling-of-a-girl-1-s1662.html' },
  girl1663: { url: 'https://bigsoundbank.com/UPLOAD/mp3/1663.mp3', sha256: 'c7daae353caaa63441dc3b3617436353d5db0cabe810e8ab596d622bee9096d3', page: 'https://bigsoundbank.com/howling-of-a-girl-2-s1663.html' },
  girl1677: { url: 'https://bigsoundbank.com/UPLOAD/mp3/1677.mp3', sha256: '174636cd95af9549a9d26d775fb6233eee5c1f16b62d48d9c33c63cd582faa99', page: 'https://bigsoundbank.com/howling-of-a-girl-3-s1677.html' },
})

// ── 원본 확보 ────────────────────────────────────────────────────────────────
async function fetchSource(key) {
  const src = SOURCES[key]
  const cacheDir = process.env.EZS_VOICE_SOURCE_CACHE || join(tmpdir(), 'ezs-voice-sources')
  mkdirSync(cacheDir, { recursive: true })
  const file = join(cacheDir, `${key}${src.url.slice(src.url.lastIndexOf('.'))}`)
  const sha = (buf) => createHash('sha256').update(buf).digest('hex')
  if (!existsSync(file) || sha(readFileSync(file)) !== src.sha256) {
    const res = await fetch(src.url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://bigsoundbank.com/' } })
    if (!res.ok) throw new Error(`download failed ${res.status}: ${src.url}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  const got = sha(readFileSync(file))
  if (got !== src.sha256) throw new Error(`sha256 mismatch for ${key}: ${got}`)
  const raw = execFileSync(FFMPEG, ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 26 })
  const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
  return new Float32Array(ab)
}

// ── 기본 DSP ─────────────────────────────────────────────────────────────────
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

const sec = (s) => Math.round(s * SR)

function slice(x, t0, len) {
  const a = sec(t0)
  return Float32Array.from(x.subarray(a, Math.min(x.length, a + sec(len))))
}

// Catmull-Rom 리샘플. rate>1이면 피치·포먼트가 같이 올라간다(몇 반음 이내로만 쓴다).
function resample(x, rate) {
  const n = Math.floor((x.length - 3) / rate)
  const out = new Float32Array(Math.max(0, n))
  for (let i = 0; i < n; i++) {
    const p = 1 + i * rate
    const k = Math.floor(p)
    const f = p - k
    const y0 = x[k - 1], y1 = x[k], y2 = x[k + 1], y3 = x[k + 2]
    out[i] = y1 + 0.5 * f * (y2 - y0 + f * (2 * y0 - 5 * y1 + 4 * y2 - y3 + f * (3 * (y1 - y2) + y3 - y0)))
  }
  return out
}

// 가변 속도 리샘플 — 실제 녹음 그대로 끝음만 미끄러지듯 떨어뜨린다(rateFn(u), u=0..1 출력 진행도).
function resampleGlide(x, outDur, rateFn) {
  const n = sec(outDur)
  const out = new Float32Array(n)
  let p = 1
  for (let i = 0; i < n && p < x.length - 3; i++) {
    const k = Math.floor(p)
    const f = p - k
    const y0 = x[k - 1], y1 = x[k], y2 = x[k + 1], y3 = x[k + 2]
    out[i] = y1 + 0.5 * f * (y2 - y0 + f * (2 * y0 - 5 * y1 + 4 * y2 - y3 + f * (3 * (y1 - y2) + y3 - y0)))
    p += rateFn(i / n)
  }
  return out
}

// 실제 비명 녹음의 첫 부분을 "꺄아~"로: 자음 버스트 + 원음 + 끝음 하강.
function realCry(src, { t0, dur, rate, burst = 0.8, seed = 61, lowpass = 0, release = 0.16, decayPow = 0.6 }) {
  const v = resampleGlide(src.subarray(sec(t0)), dur, rate)
  if (lowpass) onePoleLowpass(v, lowpass)
  envelope(v, { attack: 0.004, release, decayPow })
  const pre = sec(0.012)
  const out = new Float32Array(pre + v.length)
  const n = envelope(breathNoise(pre + sec(0.02), seed, { formants: [[3200, 900], [5200, 1600]], hp: 2400 }), { attack: 0.001, release: 0.02 })
  const g = rms(v) * burst / (rms(n) + 1e-9)
  for (let i = 0; i < n.length && i < out.length; i++) out[i] += n[i] * g
  for (let i = 0; i < v.length; i++) out[pre + i] += v[i]
  return out
}

function onePoleLowpass(x, hz) {
  const a = Math.exp(-PI2 * hz / SR)
  let y = 0
  for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y }
  return x
}

function highpass(x, hz) {
  const a = Math.exp(-PI2 * hz / SR)
  let prevX = 0, y = 0
  for (let i = 0; i < x.length; i++) { y = a * (y + x[i] - prevX); prevX = x[i]; x[i] = y }
  return x
}

function resonator(x, f, bw) {
  const r = Math.exp(-Math.PI * bw / SR)
  const b = 2 * r * Math.cos(PI2 * f / SR)
  const c = -r * r
  const g = 1 - b - c
  const out = new Float32Array(x.length)
  let y1 = 0, y2 = 0
  for (let i = 0; i < x.length; i++) { const y = g * x[i] + b * y1 + c * y2; y2 = y1; y1 = y; out[i] = y }
  return out
}

// 숨소리/자음 노이즈 — 아이 "아" 모음대(고포먼트) 색을 입힌 노이즈.
function breathNoise(len, seed, { formants = [[1250, 500], [2500, 700], [4300, 1200]], hp = 900 } = {}) {
  const rnd = mulberry32(seed)
  const n = new Float32Array(len)
  for (let i = 0; i < len; i++) n[i] = rnd() * 2 - 1
  const out = new Float32Array(len)
  for (const [f, bw] of formants) {
    const r = resonator(n, f, bw)
    for (let i = 0; i < len; i++) out[i] += r[i]
  }
  return highpass(out, hp)
}

function envelope(x, { attack = 0.005, release = 0.03, decayPow = 0 } = {}) {
  const n = x.length
  const a = Math.max(1, sec(attack)), r = Math.max(1, sec(release))
  for (let i = 0; i < n; i++) {
    let e = 1
    if (i < a) e = i / a
    if (i > n - r) e *= Math.max(0, (n - i) / r)
    if (decayPow > 0) e *= Math.pow(1 - i / n, decayPow) * 0.75 + 0.25 * (1 - i / n)
    x[i] *= e
  }
  return x
}

function mixAt(out, x, t, gain = 1) {
  const o = sec(t)
  for (let i = 0; i < x.length && o + i < out.length; i++) out[o + i] += x[i] * gain
}

function rms(x) {
  let s = 0
  for (let i = 0; i < x.length; i++) s += x[i] * x[i]
  return Math.sqrt(s / Math.max(1, x.length))
}

// ── TD-PSOLA: 원본 성문 주기 단위로 잘라 다시 쌓는다(포먼트=아이 성도 유지, 피치만 이동) ──
function detectPeriod(x, pos, fmin = 280, fmax = 1300) {
  const minLag = Math.floor(SR / fmax), maxLag = Math.ceil(SR / fmin)
  const win = maxLag * 2
  let best = minLag, bestV = -Infinity
  const vals = new Float64Array(maxLag + 1)
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0, e0 = 0, e1 = 0
    for (let i = 0; i < win; i++) {
      const a = x[pos + i] ?? 0, b = x[pos + i + lag] ?? 0
      s += a * b; e0 += a * a; e1 += b * b
    }
    vals[lag] = s / Math.sqrt(e0 * e1 + 1e-12)
    if (vals[lag] > bestV) { bestV = vals[lag]; best = lag }
  }
  // 옥타브 하향 오류 방지: 최댓값의 92% 이상인 가장 짧은 주기를 쓴다.
  for (let lag = minLag; lag < best; lag++) {
    if (vals[lag] >= bestV * 0.92 && vals[lag] >= vals[lag - 1] && vals[lag] >= vals[lag + 1]) return lag
  }
  return best
}

function pitchMarks(x, t0, t1) {
  const end = sec(t1)
  let pos = sec(t0)
  let T = detectPeriod(x, pos)
  let m = pos
  for (let i = pos; i < pos + T; i++) if (x[i] > x[m]) m = i
  const marks = [], periods = []
  while (m < end) {
    marks.push(m); periods.push(T)
    T = detectPeriod(x, m)
    const guess = m + T
    const w = Math.max(2, Math.round(T * 0.18))
    let n = guess
    for (let i = guess - w; i <= guess + w; i++) if (x[i] > x[n]) n = i
    if (n <= m) n = m + T
    m = n
  }
  return { marks, periods }
}

// f0(u, tSec): 목표 절대 피치(Hz). srcRate: 원본을 읽어 나가는 속도(1=원래 템포).
function psola(x, pm, dur, f0, { srcRate = 1, seed = 1, jitter = 0.008 } = {}) {
  const outLen = sec(dur)
  const pad = 400
  const out = new Float32Array(outLen + pad * 2)
  const rnd = mulberry32(seed)
  const { marks, periods } = pm
  const base = marks[0]
  let t = 0
  let j = 0
  while (t < outLen) {
    const srcPos = base + t * srcRate
    while (j < marks.length - 1 && Math.abs(marks[j + 1] - srcPos) <= Math.abs(marks[j] - srcPos)) j++
    const m = marks[j], T = periods[j]
    for (let k = -T; k <= T; k++) {
      const w = 0.5 * (1 + Math.cos(Math.PI * k / T))
      out[pad + t + k] += (x[m + k] ?? 0) * w
    }
    const target = f0(t / outLen, t / SR) * (1 + (rnd() * 2 - 1) * jitter)
    t += Math.max(12, Math.round(SR / target))
  }
  return out.subarray(pad, pad + outLen)
}

// 단일 음절 — 실제 녹음 조각(리샘플) 또는 PSOLA 조각 + 앞 숨소리.
function realSyllable(src, { t0, len, rate = 1, attack = 0.004, release = 0.035, decayPow = 1.2, breath = 0, seed = 7, lowpass = 0 }) {
  let s = resample(slice(src, t0, len * rate + 0.01), rate).subarray(0, sec(len))
  s = Float32Array.from(s)
  if (lowpass) onePoleLowpass(s, lowpass)
  envelope(s, { attack, release, decayPow })
  if (!breath) return s
  const bLen = sec(0.022)
  const b = envelope(breathNoise(bLen + sec(0.03), seed), { attack: 0.012, release: 0.03 })
  const g = rms(s) * breath / (rms(b) + 1e-9)
  const out = new Float32Array(bLen + s.length)
  for (let i = 0; i < b.length && i < out.length; i++) out[i] += b[i] * g
  for (let i = 0; i < s.length; i++) out[bLen + i] += s[i]
  return out
}

function psolaSyllable(src, pm, { dur, f0, attack = 0.006, release = 0.04, decayPow = 1.0, breath = 0.25, burst = 0, seed = 11, vib = null, lowpass = 0, srcRate = 1 }) {
  const f = vib
    ? (u, t) => f0(u) * (1 + vib.depth * Math.min(1, u * 2.5) * Math.sin(PI2 * vib.rate * t))
    : (u) => f0(u)
  const v = Float32Array.from(psola(src, pm, dur, f, { seed, srcRate }))
  if (lowpass) onePoleLowpass(v, lowpass)
  envelope(v, { attack, release, decayPow })
  const pre = sec(burst ? 0.012 : breath ? 0.02 : 0)
  const out = new Float32Array(pre + v.length)
  if (pre) {
    const n = envelope(breathNoise(pre + sec(0.02), seed ^ 0x55, burst ? { formants: [[3200, 900], [5200, 1600]], hp: 2400 } : {}), { attack: burst ? 0.001 : 0.01, release: 0.02 })
    const g = rms(v) * (burst || breath) / (rms(n) + 1e-9)
    for (let i = 0; i < n.length && i < out.length; i++) out[i] += n[i] * g
  }
  // 발성 중에도 약한 숨결을 섞어 "버즈"가 아니라 사람 숨이 섞인 소리로 만든다.
  const air = breathNoise(v.length, seed ^ 0x99)
  const ag = rms(v) * 0.06 / (rms(air) + 1e-9)
  for (let i = 0; i < v.length; i++) out[pre + i] += v[i] + air[i] * ag * Math.abs(v[i]) / (rms(v) * 1.4 + 1e-9)
  return out
}

const glide = (pts) => (u) => {
  for (let i = 1; i < pts.length; i++) {
    if (u <= pts[i][0]) {
      const [u0, v0] = pts[i - 1], [u1, v1] = pts[i]
      const k = (u - u0) / (u1 - u0 || 1)
      return v0 * Math.pow(v1 / v0, k) // 로그 보간(반음 단위로 자연스럽게)
    }
  }
  return pts[pts.length - 1][1]
}

function assemble(parts, totalDur) {
  const out = new Float32Array(sec(totalDur))
  for (const p of parts) mixAt(out, p.x, p.t, p.gain ?? 1)
  return out
}

// 활성 구간 RMS를 목표 dBFS에 맞추고, 피크는 소프트 리미트.
function finish(x, { activeRmsDb = -20, peakDb = -2.5, fadeOut = 0.012 } = {}) {
  highpass(x, 140)
  const hop = sec(0.02)
  let s = 0, c = 0
  for (let i = 0; i + hop <= x.length; i += hop) {
    const r = rms(x.subarray(i, i + hop))
    if (r > 0.004) { s += r * r; c++ }
  }
  const act = Math.sqrt(s / Math.max(1, c)) || 1e-6
  const k = Math.pow(10, activeRmsDb / 20) / act
  const lim = Math.pow(10, peakDb / 20)
  for (let i = 0; i < x.length; i++) {
    const v = x[i] * k
    x[i] = Math.abs(v) <= lim * 0.7 ? v : Math.sign(v) * (lim * 0.7 + lim * 0.3 * Math.tanh((Math.abs(v) - lim * 0.7) / (lim * 0.3)))
  }
  const f = sec(fadeOut)
  for (let i = 0; i < f; i++) x[x.length - 1 - i] *= i / f
  // 앞뒤 무음 트림
  let a = 0, b = x.length
  while (a < b && Math.abs(x[a]) < 1e-4) a++
  while (b > a && Math.abs(x[b - 1]) < 1e-4) b--
  return x.subarray(Math.max(0, a - 20), Math.min(x.length, b + 20))
}

// ── 후보 정의 ────────────────────────────────────────────────────────────────
// 실측(analysis): #1660 3.24–3.45s "하" ≈400→470Hz, 0.70–0.84s "하" ≈480Hz, 2.84–3.10s "히이!" ≈800→950Hz.
// #1662/#1663/#1677 여아 비명 정상부 ≈900–960Hz.
export function buildCandidates(S) {
  const pm1662 = pitchMarks(S.girl1662, 0.1, 2.15)
  const L = S.laugh1660

  return {
    // A 발랄: 진짜 아이 웃음 음절을 그대로 이어 붙인 키득키득(+2~3반음), 등장은 "히이!" 환호, 사망은 "꺄아!"
    A: {
      character: '발랄한 꼬마 — 진짜 아이 웃음 음절을 그대로 잘라 이은 밝은 키득키득',
      matildaSpawn: finish(assemble([
        { x: realSyllable(L, { t0: 2.83, len: 0.27, rate: 0.94, attack: 0.006, release: 0.07, decayPow: 0.5 }), t: 0 },
      ], 0.3), { activeRmsDb: -21 }),
      matildaLaugh: finish(assemble([
        { x: realSyllable(L, { t0: 3.25, len: 0.1, rate: 1.19, breath: 0.35, seed: 21 }), t: 0, gain: 1.0 },
        { x: realSyllable(L, { t0: 0.7, len: 0.095, rate: 1.12, breath: 0.35, seed: 22 }), t: 0.125, gain: 0.95 },
        { x: realSyllable(L, { t0: 3.3, len: 0.095, rate: 1.14, breath: 0.35, seed: 23 }), t: 0.25, gain: 0.88 },
        { x: realSyllable(L, { t0: 0.72, len: 0.095, rate: 1.05, breath: 0.35, seed: 24 }), t: 0.37, gain: 0.78 },
        { x: realSyllable(L, { t0: 3.27, len: 0.15, rate: 1.0, breath: 0.3, seed: 25, decayPow: 1.6, release: 0.06 }), t: 0.49, gain: 0.66 },
      ], 0.7), { activeRmsDb: -21 }),
      // 실제 여아 비명(#1663) 첫 0.45초를 원음 그대로, 끝 40%만 약 4반음 하강.
      matildaDeath: finish(realCry(S.girl1663, {
        t0: 0.07, dur: 0.46, seed: 31, rate: glide([[0, 0.93], [0.6, 0.9], [1, 0.72]]),
      }), { activeRmsDb: -21.5 }),
    },
    // B 수줍은: 같은 실제 웃음 음절을 원래 높이로, 3음절만, 숨소리 많고 고역을 눌러 부드럽게.
    B: {
      character: '수줍은 꼬마 — 원래 높이의 실제 웃음 3음절, 숨소리 많고 작고 부드럽게 "히히…"',
      matildaSpawn: finish(assemble([
        { x: realSyllable(L, { t0: 0.69, len: 0.16, rate: 1.03, breath: 0.6, seed: 41, lowpass: 5200, decayPow: 0.9, release: 0.06 }), t: 0 },
      ], 0.22), { activeRmsDb: -23 }),
      matildaLaugh: finish(assemble([
        { x: realSyllable(L, { t0: 3.26, len: 0.1, rate: 1.0, breath: 0.7, seed: 42, lowpass: 5200 }), t: 0, gain: 1.0 },
        { x: realSyllable(L, { t0: 0.71, len: 0.1, rate: 0.97, breath: 0.7, seed: 43, lowpass: 5200 }), t: 0.16, gain: 0.85 },
        { x: realSyllable(L, { t0: 3.29, len: 0.13, rate: 0.93, breath: 0.8, seed: 44, lowpass: 4600, decayPow: 1.8, release: 0.07 }), t: 0.32, gain: 0.7 },
      ], 0.55), { activeRmsDb: -23 }),
      matildaDeath: finish(realCry(S.girl1677, {
        t0: 0.24, dur: 0.38, seed: 45, burst: 0.5, lowpass: 5200, release: 0.15, decayPow: 0.9,
        rate: glide([[0, 0.88], [0.5, 0.86], [1, 0.72]]),
      }), { activeRmsDb: -23 }),
    },
    // C 장난스러운: 여아 단독 녹음(#1662)만으로 PSOLA 음절을 만들어 "헤헤헤-헤~" 놀리는 억양.
    C: {
      character: '장난꾸러기 — 여아 단독 녹음으로만 만든 "헤헤헤~" 놀리는 억양(끝음 올렸다 내림)',
      matildaSpawn: finish(psolaSyllable(S.girl1662, pm1662, {
        dur: 0.34, breath: 0.45, seed: 51, decayPow: 0.5, release: 0.09,
        f0: glide([[0, 560], [0.45, 760], [1, 650]]), vib: { rate: 6, depth: 0.02 },
      }), { activeRmsDb: -21 }),
      matildaLaugh: finish(assemble([
        { x: psolaSyllable(S.girl1662, pm1662, { dur: 0.085, breath: 0.5, seed: 52, decayPow: 1.3, release: 0.03, f0: glide([[0, 700], [1, 660]]) }), t: 0 },
        { x: psolaSyllable(S.girl1662, pm1662, { dur: 0.085, breath: 0.5, seed: 53, decayPow: 1.3, release: 0.03, f0: glide([[0, 670], [1, 630]]), srcRate: 2 }), t: 0.125, gain: 0.92 },
        { x: psolaSyllable(S.girl1662, pm1662, { dur: 0.085, breath: 0.5, seed: 54, decayPow: 1.3, release: 0.03, f0: glide([[0, 640], [1, 600]]), srcRate: 3 }), t: 0.25, gain: 0.85 },
        { x: psolaSyllable(S.girl1662, pm1662, { dur: 0.24, breath: 0.45, seed: 55, decayPow: 0.8, release: 0.09, f0: glide([[0, 600], [0.4, 720], [1, 560]]), vib: { rate: 7, depth: 0.03 }, srcRate: 1.5 }), t: 0.39, gain: 0.8 },
      ], 0.68), { activeRmsDb: -21 }),
      matildaDeath: finish(psolaSyllable(S.girl1662, pm1662, {
        dur: 0.6, burst: 0.9, seed: 56, decayPow: 0.5, release: 0.2,
        f0: glide([[0, 780], [0.1, 860], [0.45, 820], [1, 470]]), vib: { rate: 8, depth: 0.035 },
      }), { activeRmsDb: -21 }),
    },
  }
}

// ── 출력 ─────────────────────────────────────────────────────────────────────
function writeWav(filepath, samples) {
  const len = samples.length
  const buf = Buffer.alloc(44 + len * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + len * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(len * 2, 40)
  for (let i = 0; i < len; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2)
  mkdirSync(dirname(filepath), { recursive: true })
  writeFileSync(filepath, buf)
}

function encode(samples, outBase, tmpWav) {
  writeWav(tmpWav, samples)
  mkdirSync(dirname(outBase), { recursive: true })
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmpWav, '-fflags', '+bitexact', '-flags:a', '+bitexact', '-c:a', 'libvorbis', '-q:a', '2', '-ar', String(OUT_SR), '-map_metadata', '-1', `${outBase}.ogg`])
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmpWav, '-fflags', '+bitexact', '-flags:a', '+bitexact', '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', String(OUT_SR), '-map_metadata', '-1', `${outBase}.mp3`])
}

const TARGET_DIR = { matildaSpawn: 'enemies', matildaLaugh: 'enemies', matildaDeath: 'enemies' }

if (process.argv[1] && process.argv[1].endsWith('generate_matilda_girl_voice.mjs')) {
  const S = {}
  for (const key of Object.keys(SOURCES)) S[key] = await fetchSource(key)
  const cands = buildCandidates(S)
  const tmp = join(tmpdir(), `ezs-matilda-voice-${process.pid}`)
  mkdirSync(tmp, { recursive: true })
  const ai = process.argv.indexOf('--audition')
  if (ai > 0) {
    const dir = process.argv[ai + 1]
    for (const [id, c] of Object.entries(cands)) {
      for (const cue of Object.keys(TARGET_DIR)) {
        encode(c[cue], join(dir, id, cue), join(tmp, `${id}_${cue}.wav`))
        writeWav(join(dir, id, `${cue}.wav`), c[cue])
      }
      console.log(`audition ${id}: ${c.character}`)
    }
  } else {
    const c = cands[INSTALLED_CANDIDATE]
    for (const [cue, dir] of Object.entries(TARGET_DIR)) {
      encode(c[cue], join(ROOT, 'public/sfx', dir, cue), join(tmp, `${cue}.wav`))
      console.log(`ok ${cue} -> public/sfx/${dir}/${cue}.{ogg,mp3} (candidate ${INSTALLED_CANDIDATE})`)
    }
  }
  rmSync(tmp, { recursive: true, force: true })
}
