/*
 * 마틸다 음성 생성기 — 실제 4살 여자아이 웃음 녹음(CC0)을 "잘라서 다듬기만" 한다.
 *
 * 이력
 *   2026-11-14 오전 (ea3a5395): BigSoundBank #1660/#1663 녹음을 리샘플(+2~3반음)·숨소리 노이즈 주입·
 *     비명 끝음 하강(약 -5반음)으로 가공 → Terry: "마틸다 음성은 지금 괴기스러우니까 100퍼센트 완전히 바꿔",
 *     "마틸다 여자아이 목소리 엄수해". 그 가공 체인과 원본을 모두 버렸다.
 *   2026-11-14 오후 (현재): 아빠가 간지럽히는 동안 깔깔 웃는 4살 여자아이 녹음 한 세션만 쓴다.
 *     같은 아이·같은 녹음이라 모든 큐가 한 아이 목소리로 들린다.
 *
 * 원본 (Freesound, CC0 1.0 public domain — https://creativecommons.org/publicdomain/zero/1.0/)
 *   #166345 "Elise laughing, Oct 1, 2012, v2.mp3" by Electron John
 *     https://freesound.org/people/Electron%20John/sounds/166345/
 *     "This is a second version of my daughter laughing and squealing while I tickled her."
 *   #166344 "Elise laughing, Oct 1, 2012.mp3" by Electron John
 *     https://freesound.org/people/Electron%20John/sounds/166344/
 *     "This sound file is of my 4 year old daughter laughing and squealing while I tickled her."
 *   공개 HQ 미리듣기 MP3(cdn.freesound.org, 로그인 불필요)를 SHA-256으로 고정해 받는다.
 *
 * 가공은 "가벼운 정리"만 한다 — 피치/속도 변경, 리샘플, 포먼트 이동, 비트크러시, 드라이브/클리핑,
 * 링모드, 리버브, 지터, 합성 노이즈 주입을 하지 않는다(그런 게 이전 음성을 괴기스럽게 만들었다).
 *   1) 음절 경계(무음에 가까운 지점)에서 자르기, 필요하면 두 구간을 짧은 크로스페이드로 잇기
 *   2) 하이패스 150 Hz(실내 웅웅거림 제거), 6 dB/oct 로우패스 9 kHz(테이프 히스 완화)
 *   3) 약한 노이즈 게이트(음절 사이 배경 잡음만 -12 dB 낮춤, 음절 자체는 건드리지 않음)
 *   4) 6 ms 페이드인 / 큐별 페이드아웃
 *   5) 전체 RMS를 이전 큐 음량에 맞추는 선형 게인(피크 -1.5 dBFS 넘으면 게인을 낮춘다 — 리미터/클리핑 없음)
 * 단어가 없는 웃음/환호라 ko/en/ja 현지화가 필요 없다.
 *
 * 실행:
 *   node scripts/generate_matilda_girl_voice.mjs               # public/sfx에 설치
 *   node scripts/generate_matilda_girl_voice.mjs --audition DIR  # DIR에 wav/ogg/mp3만 출력(설치 안 함)
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

export const SOURCES = Object.freeze({
  elise166345: {
    url: 'https://cdn.freesound.org/previews/166/166345_1315778-hq.mp3',
    sha256: '25ee0bef47e9dc28bbda4fd91efe96a93ec7ea5cdf54a04edd4d7f897dd73026',
    page: 'https://freesound.org/people/Electron%20John/sounds/166345/',
    license: 'CC0-1.0',
  },
  elise166344: {
    url: 'https://cdn.freesound.org/previews/166/166344_1315778-hq.mp3',
    sha256: '8ab6607a3c39a854784ed73021e407acaaea471991f2a5c9437e6c3c78e985e3',
    page: 'https://freesound.org/people/Electron%20John/sounds/166344/',
    license: 'CC0-1.0',
  },
})

// 마틸다의 "목소리" 큐 전부. 이 목록에 있는 큐는 오직 이 스크립트가 만든다
// (generate_voice_sfx.mjs / generate_sfx.mjs에 다시 넣으면 테스트가 실패한다).
// matildaWarningTick은 목소리가 아니라 947/474 Hz 두 번 울리는 경고 비프라 여기 없다.
//
// 구간 실측(10 ms 프레임 자기상관 f0): 모두 아이 음역 370–1150 Hz.
//   #166345 10.92–11.16 "헤헤" 550→430 Hz / 11.16–11.36 "핫!" 590→700→420 Hz /
//           11.37–11.78 "꺄아~!" 420→1130→900 Hz / 2.30–2.73 "하하하" ≈400 Hz ×3 / 3.12–3.44 "하하" ≈400 Hz
//   #166344 2.93–3.34 "꺄아!" ≈800–880 Hz 지속
// targetRmsDb는 교체 직전 각 큐의 전체 RMS(ffmpeg volumedetect mean_volume)에 맞춘 값이다.
export const MATILDA_VOICE_CUES = Object.freeze({
  matildaSpawn: { dir: 'enemies', parts: [['elise166345', 10.92, 11.16]], fadeOut: 0.04, targetRmsDb: -21.3, character: '등장: 짧은 "헤헤"' },
  matildaDash: { dir: 'enemies', parts: [['elise166345', 11.16, 11.36]], fadeOut: 0.04, targetRmsDb: -17.0, character: '돌진: 신난 "핫!"' },
  matildaLaugh: { dir: 'enemies', parts: [['elise166345', 2.30, 2.73], ['elise166345', 3.12, 3.44]], fadeOut: 0.06, targetRmsDb: -21.6, character: '추격 웃음: 깔깔 "하하하-하하"' },
  matildaDeath: { dir: 'enemies', parts: [['elise166344', 2.93, 3.34]], fadeOut: 0.07, targetRmsDb: -21.6, character: '잡았다: 신난 "꺄아!"' },
  matildaCountdownEnd: { dir: 'events', parts: [['elise166345', 11.37, 11.78]], fadeOut: 0.06, targetRmsDb: -18.6, character: '곧 나온다: 올라가는 "꺄아~!"' },
})

// 대사 블립용 음절 그레인(2026-11-14 추가, 같은 아이·같은 녹음). 대화창에서 마틸다 대사가 한 글자 나올 때마다
// 하나씩 돌려 쓴다(src/lib/dialogueVoice.js matilda 프로필). 피치/속도는 건드리지 않는다.
// at = 음절 근처 시각(초). 실제 시작점은 그 근처 5 ms RMS가 음절 최대의 20%를 처음 넘는 곳 - 3 ms로 맞춘다.
export const DIALOGUE_GRAIN_SEC = 0.08
export const MATILDA_DIALOGUE_GRAINS = Object.freeze([
  { id: 'matildaGrain1', source: 'elise166345', at: 2.32 }, // "하" ≈400 Hz
  { id: 'matildaGrain2', source: 'elise166345', at: 10.98 }, // "헤" ≈560 Hz
  { id: 'matildaGrain3', source: 'elise166345', at: 2.50 }, // "하" ≈410 Hz
  { id: 'matildaGrain4', source: 'elise166345', at: 11.17 }, // "햐" ≈600 Hz
  { id: 'matildaGrain5', source: 'elise166345', at: 3.14 }, // "하" ≈415 Hz
])
export const DIALOGUE_GRAIN_DIR = 'dialogue'
const DIALOGUE_GRAIN_RMS_DB = -20

// ── 원본 확보 ────────────────────────────────────────────────────────────────
async function ffmpegPath() {
  if (process.env.FFMPEG_BINARY) return process.env.FFMPEG_BINARY
  return (await import('@ffmpeg-installer/ffmpeg')).default.path
}

async function fetchSource(key, FFMPEG) {
  const src = SOURCES[key]
  const cacheDir = process.env.EZS_VOICE_SOURCE_CACHE || join(tmpdir(), 'ezs-voice-sources')
  mkdirSync(cacheDir, { recursive: true })
  const file = join(cacheDir, `${key}.mp3`)
  const sha = (buf) => createHash('sha256').update(buf).digest('hex')
  if (!existsSync(file) || sha(readFileSync(file)) !== src.sha256) {
    const res = await fetch(src.url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) throw new Error(`download failed ${res.status}: ${src.url}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  const got = sha(readFileSync(file))
  if (got !== src.sha256) throw new Error(`sha256 mismatch for ${key}: ${got}`)
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

// 두 구간을 12 ms 등전력 크로스페이드로 잇는다(자른 경계는 모두 음절 사이 저음량 지점).
function join2(a, b, xf = sec(0.012)) {
  const out = new Float32Array(a.length + b.length - xf)
  out.set(a.subarray(0, a.length - xf))
  for (let i = 0; i < xf; i++) {
    const t = (i + 0.5) / xf
    out[a.length - xf + i] = a[a.length - xf + i] * Math.cos(t * Math.PI / 2) + b[i] * Math.sin(t * Math.PI / 2)
  }
  out.set(b.subarray(xf), a.length)
  return out
}

// 10 ms 창 RMS가 구간 최대보다 30 dB 이상 낮은 곳(음절 사이 배경 잡음)만 -12 dB까지 부드럽게 낮춘다.
function gentleGate(x) {
  const win = sec(0.01)
  const env = new Float32Array(x.length)
  let peak = 0
  for (let i = 0; i < x.length; i += win) {
    let s = 0
    const n = Math.min(win, x.length - i)
    for (let j = 0; j < n; j++) s += x[i + j] * x[i + j]
    const r = Math.sqrt(s / n)
    env.fill(r, i, i + n)
    peak = Math.max(peak, r)
  }
  const thr = peak * Math.pow(10, -30 / 20)
  const floorGain = Math.pow(10, -12 / 20)
  const att = Math.exp(-1 / sec(0.003)), rel = Math.exp(-1 / sec(0.04))
  let g = 1
  for (let i = 0; i < x.length; i++) {
    const want = env[i] >= thr ? 1 : floorGain
    g = want > g ? want + (g - want) * att : want + (g - want) * rel
    x[i] *= g
  }
  return x
}

function fades(x, fadeIn, fadeOut) {
  const a = sec(fadeIn), r = sec(fadeOut)
  for (let i = 0; i < a && i < x.length; i++) x[i] *= i / a
  for (let i = 0; i < r && i < x.length; i++) x[x.length - 1 - i] *= i / r
  return x
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

export function buildCue(spec, S) {
  const slices = spec.parts.map(([key, t0, t1]) => Float32Array.from(S[key].subarray(sec(t0), sec(t1))))
  let x = slices.reduce((acc, s) => (acc ? join2(acc, s) : s), null)
  highpass(x, 150)
  lowpass(x, 9000)
  gentleGate(x)
  fades(x, 0.006, spec.fadeOut)
  return normalize(x, spec.targetRmsDb)
}

function onsetNear(x, at) {
  const hop = sec(0.002), win = sec(0.005)
  const lo = sec(at - 0.03), hi = sec(at + 0.1)
  const env = []
  for (let i = lo; i + win <= hi; i += hop) {
    let s = 0
    for (let j = 0; j < win; j++) s += x[i + j] * x[i + j]
    env.push([i, Math.sqrt(s / win)])
  }
  const max = Math.max(...env.map(([, r]) => r))
  const first = env.find(([, r]) => r >= max * 0.2)
  return first[0] - sec(0.003)
}

export function buildDialogueGrain(grain, S) {
  const x = S[grain.source]
  const a = onsetNear(x, grain.at)
  const g = Float32Array.from(x.subarray(a, a + sec(DIALOGUE_GRAIN_SEC)))
  highpass(g, 150)
  lowpass(g, 9000)
  fades(g, 0.003, 0.02)
  return normalize(g, DIALOGUE_GRAIN_RMS_DB)
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

if (process.argv[1] && process.argv[1].endsWith('generate_matilda_girl_voice.mjs')) {
  const FFMPEG = await ffmpegPath()
  const S = {}
  for (const key of Object.keys(SOURCES)) S[key] = await fetchSource(key, FFMPEG)
  const tmp = join(tmpdir(), `ezs-matilda-voice-${process.pid}`)
  mkdirSync(tmp, { recursive: true })
  const ai = process.argv.indexOf('--audition')
  const auditionDir = ai > 0 ? process.argv[ai + 1] : null
  for (const [cue, spec] of Object.entries(MATILDA_VOICE_CUES)) {
    const x = buildCue(spec, S)
    const base = auditionDir ? join(auditionDir, cue) : join(ROOT, 'public/sfx', spec.dir, cue)
    encode(FFMPEG, x, base, join(tmp, `${cue}.wav`))
    if (auditionDir) writeWav(`${base}.wav`, x)
    console.log(`ok ${cue} ${(x.length / SR).toFixed(2)}s -> ${auditionDir ? base : `public/sfx/${spec.dir}/${cue}`}.{ogg,mp3} — ${spec.character}`)
  }
  for (const grain of MATILDA_DIALOGUE_GRAINS) {
    const x = buildDialogueGrain(grain, S)
    const base = auditionDir ? join(auditionDir, grain.id) : join(ROOT, 'public/sfx', DIALOGUE_GRAIN_DIR, grain.id)
    encode(FFMPEG, x, base, join(tmp, `${grain.id}.wav`))
    if (auditionDir) writeWav(`${base}.wav`, x)
    console.log(`ok ${grain.id} ${(x.length / SR).toFixed(3)}s -> ${auditionDir ? base : `public/sfx/${DIALOGUE_GRAIN_DIR}/${grain.id}`}.{ogg,mp3} (대사 블립)`)
  }
  rmSync(tmp, { recursive: true, force: true })
}
