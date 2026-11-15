/*
 * 이누콘 가드 짖음 "멍!멍!" 생성기 — 실제 소형견 녹음(CC0) 한 번을 잘라 두 번 짖게 엮는다.
 *
 * 이력
 *   2026-10-31 (4f00133e): generate_voice_sfx.mjs의 source-filter 합성 "왈!" 한 번(0.26s)으로 시작.
 *   2026-11-15 (현재): 요청 "귀엽고 밝은 카툰 강아지, 짧은 두 번 '멍!멍!', 0.4–0.6초, 무섭거나 낮지 않게".
 *     합성 큐를 버리고 실제 강아지 녹음으로 바꿨다. 이 큐는 이제 이 스크립트만 만든다
 *     (generate_voice_sfx.mjs / generate_sfx.mjs에 다시 넣으면 src/lib/inuconBark.test.js가 실패한다).
 *
 * 원본 (Freesound, CC0 1.0 public domain — https://creativecommons.org/publicdomain/zero/1.0/)
 *   #800278 "Small Dog Bark" by SecureSubset
 *     https://freesound.org/people/SecureSubset/sounds/800278/
 *     "The sound of a chihuahua barking. Recorded with the zoom H6 built in microphone and edited for
 *      noise reduction and brevity."
 *   공개 HQ 미리듣기 MP3(cdn.freesound.org, 로그인 불필요)를 SHA-256으로 고정해 받는다.
 *   실측(10 ms 자기상관): 짖음 본체 0.00–0.12 s, f0 ≈ 920 Hz, 스펙트럼 무게중심 ≈ 1.2 kHz — 밝지만 날카롭지 않다.
 *   후보 비교: #583142 Puppy Bark는 다른 녹음("moffet's barking dog")을 가공한 2차 저작이라 출처 사슬이 불명확해 제외,
 *   #630648(무게중심 ≈ 830 Hz)은 둥글지만 어둡고, #625274(≈ 1.9 kHz)는 숨소리가 많아 제외했다.
 *
 * 가공 (가볍게만)
 *   1) 짖음 한 번(0.00–0.20 s) 잘라내기 → 하이패스 150 Hz, 6 dB/oct 로우패스 9 kHz
 *   2) 3 ms 페이드인 / 40 ms 페이드아웃
 *   3) 두 번째 "멍!"은 같은 짖음을 재생속도 ×1.06(약 +1 반음)으로 살짝 올리고 -1 dB — 끝이 올라가는 밝은 "멍!멍!"
 *   4) 첫 짖음 시작 0 s, 두 번째 시작 0.24 s → 전체 약 0.43 s
 *   5) 전체 RMS를 다른 짧은 SFX와 같은 -17 dBFS로 맞추는 선형 게인(피크 -1.5 dBFS 넘으면 게인을 낮춘다 — 리미터 없음)
 *   왜곡·비트크러시·리버브·포먼트 이동 없음. 단어가 없는 동물 소리라 현지화가 필요 없다.
 *
 * 실행:
 *   node scripts/generate_inucon_bark.mjs                 # public/sfx/enemies/inuconBark.{ogg,mp3}에 설치
 *   node scripts/generate_inucon_bark.mjs --audition DIR  # DIR에 wav/ogg/mp3만 출력(설치 안 함)
 *   환경변수 FFMPEG_BINARY, EZS_VOICE_SOURCE_CACHE(원본 캐시 폴더) 선택.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')
const SR = 44100
const OUT_SR = 22050 // 기존 public/sfx 규약(22.05kHz, ogg q2 + mp3 64k)
const PI2 = Math.PI * 2

export const INUCON_BARK_SOURCE = Object.freeze({
  key: 'freesound800278',
  url: 'https://cdn.freesound.org/previews/800/800278_16752880-hq.mp3',
  sha256: 'f60ad9c3671c3439aa919f388ff2d1d999bdc88ef5fdd9d51de7991d01495dbb',
  page: 'https://freesound.org/people/SecureSubset/sounds/800278/',
  license: 'CC0-1.0',
})

export const INUCON_BARK_CUE = Object.freeze({
  id: 'inuconBark',
  dir: 'enemies',
  bark: [0.0, 0.2], // 원본에서 짖음 한 번(초)
  secondOnset: 0.24, // 두 번째 "멍!" 시작(초)
  secondRate: 1.06, // 두 번째 짖음 재생속도(약 +1 반음)
  secondGainDb: -1,
  fadeIn: 0.003,
  fadeOut: 0.04,
  targetRmsDb: -17,
})

// ── 원본 확보 ────────────────────────────────────────────────────────────────
async function ffmpegPath() {
  if (process.env.FFMPEG_BINARY) return process.env.FFMPEG_BINARY
  return (await import('@ffmpeg-installer/ffmpeg')).default.path
}

async function fetchSource(FFMPEG) {
  const src = INUCON_BARK_SOURCE
  const cacheDir = process.env.EZS_VOICE_SOURCE_CACHE || join(tmpdir(), 'ezs-voice-sources')
  mkdirSync(cacheDir, { recursive: true })
  const file = join(cacheDir, `${src.key}.mp3`)
  const sha = (buf) => createHash('sha256').update(buf).digest('hex')
  if (!existsSync(file) || sha(readFileSync(file)) !== src.sha256) {
    const res = await fetch(src.url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) throw new Error(`download failed ${res.status}: ${src.url}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  const got = sha(readFileSync(file))
  if (got !== src.sha256) throw new Error(`sha256 mismatch for ${src.key}: ${got}`)
  const raw = execFileSync(FFMPEG, ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 26 })
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength))
}

// ── 가벼운 정리 ──────────────────────────────────────────────────────────────
const sec = (s) => Math.round(s * SR)

function highpass(x, hz) {
  const a = Math.exp(-PI2 * hz / SR)
  let prevX = 0, y = 0
  for (let i = 0; i < x.length; i++) { y = a * (y + x[i] - prevX); prevX = x[i]; x[i] = y }
  return x
}

function lowpass(x, hz) {
  const a = Math.exp(-PI2 * hz / SR)
  let y = 0
  for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y }
  return x
}

function fades(x, fadeIn, fadeOut) {
  const a = sec(fadeIn), r = sec(fadeOut)
  for (let i = 0; i < a && i < x.length; i++) x[i] *= i / a
  for (let i = 0; i < r && i < x.length; i++) x[x.length - 1 - i] *= i / r
  return x
}

// 선형 보간 리샘플(재생속도 rate배, 음높이도 같이 오른다).
function resample(x, rate) {
  const out = new Float32Array(Math.floor((x.length - 1) / rate))
  for (let i = 0; i < out.length; i++) {
    const p = i * rate, k = Math.floor(p), f = p - k
    out[i] = x[k] * (1 - f) + x[k + 1] * f
  }
  return out
}

// 선형 게인만: 전체 RMS를 목표 dBFS로, 단 피크가 -1.5 dBFS를 넘지 않게. 리미터/소프트클립 없음.
function normalize(x, targetRmsDb, peakDb = -1.5) {
  let s = 0, pk = 0
  for (let i = 0; i < x.length; i++) { s += x[i] * x[i]; pk = Math.max(pk, Math.abs(x[i])) }
  const rms = Math.sqrt(s / x.length) || 1e-9
  const g = Math.min(Math.pow(10, targetRmsDb / 20) / rms, Math.pow(10, peakDb / 20) / (pk || 1e-9))
  for (let i = 0; i < x.length; i++) x[i] *= g
  return x
}

export function buildInuconBark(source, cue = INUCON_BARK_CUE) {
  const bark = Float32Array.from(source.subarray(sec(cue.bark[0]), sec(cue.bark[1])))
  highpass(bark, 150)
  lowpass(bark, 9000)
  fades(bark, cue.fadeIn, cue.fadeOut)
  const second = resample(bark, cue.secondRate)
  const g2 = Math.pow(10, cue.secondGainDb / 20)
  const at = sec(cue.secondOnset)
  const out = new Float32Array(Math.max(bark.length, at + second.length))
  out.set(bark)
  for (let i = 0; i < second.length; i++) out[at + i] += second[i] * g2
  return normalize(out, cue.targetRmsDb)
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

function encode(FFMPEG, samples, outBase, tmpWav) {
  writeWav(tmpWav, samples)
  mkdirSync(dirname(outBase), { recursive: true })
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmpWav, '-fflags', '+bitexact', '-flags:a', '+bitexact', '-c:a', 'libvorbis', '-q:a', '2', '-ar', String(OUT_SR), '-map_metadata', '-1', `${outBase}.ogg`])
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmpWav, '-fflags', '+bitexact', '-flags:a', '+bitexact', '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', String(OUT_SR), '-map_metadata', '-1', `${outBase}.mp3`])
}

if (process.argv[1] && process.argv[1].endsWith('generate_inucon_bark.mjs')) {
  const FFMPEG = await ffmpegPath()
  const source = await fetchSource(FFMPEG)
  const tmp = join(tmpdir(), `ezs-inucon-bark-${process.pid}`)
  mkdirSync(tmp, { recursive: true })
  const ai = process.argv.indexOf('--audition')
  const auditionDir = ai > 0 ? process.argv[ai + 1] : null
  const cue = INUCON_BARK_CUE
  const x = buildInuconBark(source)
  const base = auditionDir ? join(auditionDir, cue.id) : join(ROOT, 'public/sfx', cue.dir, cue.id)
  encode(FFMPEG, x, base, join(tmp, `${cue.id}.wav`))
  if (auditionDir) writeWav(`${base}.wav`, x)
  console.log(`ok ${cue.id} ${(x.length / SR).toFixed(3)}s -> ${auditionDir ? base : `public/sfx/${cue.dir}/${cue.id}`}.{ogg,mp3} — 가드 "멍!멍!"`)
  rmSync(tmp, { recursive: true, force: true })
}
