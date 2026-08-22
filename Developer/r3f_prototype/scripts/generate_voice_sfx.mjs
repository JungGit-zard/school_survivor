/*
 * 생물/캐릭터 음성형 SFX 생성기.
 * 외부 샘플 없이 Node.js가 파형을 직접 계산하고 ffmpeg로 ogg/mp3를 만든다.
 * 기반: generate_zombie_death_voices.mjs의 source-filter 합성기.
 * 실행: node scripts/generate_voice_sfx.mjs [id필터]
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { synthVoice } from './generate_zombie_death_voices.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')
const TMP = join(ROOT, 'tmp_voice_sfx')
const FFMPEG = process.env.FFMPEG_BINARY || 'ffmpeg'
const SR = 22050
const PI2 = Math.PI * 2
// 2026-08-22 Terry 피드백: 음성형 SFX 전반이 너무 저음/아저씨톤.
// 휘파람을 제외한 캐릭터/생물 목소리의 기본 F0를 약 +4반음 올린다.
export const VOICE_PITCH_SCALE = 1.26
// 주인공/마틸다는 괴물톤이 아니라 귀여운 여성 음성으로 들려야 해서 별도 고음 스케일을 쓴다.
export const CUTE_FEMALE_VOICE_PITCH_SCALE = 1.8

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

function envAt(p, attack = 0.02, release = 0.18) {
  if (p < attack) return p / attack
  if (p > 1 - release) return Math.max(0, (1 - p) / release)
  return 1
}

function normalize(samples, peakTarget = 0.82) {
  let peak = 0
  for (const s of samples) peak = Math.max(peak, Math.abs(s))
  const k = peak > 0 ? peakTarget / peak : 1
  for (let i = 0; i < samples.length; i++) samples[i] = Math.tanh(samples[i] * k * 1.25) * 0.86
  return samples
}

function synthWhistle({ dur = 0.46, seed = 1, f0 = [[0, 1200], [1, 2200]], vibRate = 7, vibDepth = 18, noise = 0.015, chirp = false } = {}) {
  const n = Math.floor(SR * dur)
  const out = new Float32Array(n)
  const rnd = mulberry32(seed)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const p = i / n
    let freq = f0[0][1]
    for (let j = 1; j < f0.length; j++) {
      if (p <= f0[j][0]) {
        const [p0, v0] = f0[j - 1]
        const [p1, v1] = f0[j]
        const k = (p - p0) / (p1 - p0 || 1)
        freq = v0 + (v1 - v0) * k
        break
      }
      freq = f0[j][1]
    }
    freq += Math.sin(PI2 * vibRate * i / SR) * vibDepth
    phase += freq / SR
    const tone = Math.sin(PI2 * phase) + Math.sin(PI2 * phase * 2.01) * 0.12
    const air = (rnd() * 2 - 1) * noise
    const trill = chirp ? (0.75 + 0.25 * Math.sin(PI2 * 32 * i / SR)) : 1
    out[i] = (tone * 0.72 + air) * envAt(p, 0.03, 0.16) * trill
  }
  return normalize(out, 0.76)
}

function voice(spec) {
  return synthVoice({ ...spec, pitchScale: spec.pitchScale ?? VOICE_PITCH_SCALE })
}

const VOICE_SFX = {
  // 좀비 생존/공격 발성
  zombieSpawn: { dir: 'enemies', synth: () => voice({ dur: 0.34, targetLoudness: 0.18, seed: 0x6101, hold: 2, bits: 7, drive: 1.55, f0: [[0, 118], [0.45, 103], [1, 88]], jitter: 0.018, frames: [
    { t: 0, v: 'eu', amp: 0, voice: 1, noise: 0.55 }, { t: 0.06, v: 'eu', amp: 0.85, voice: 1, noise: 0.22 }, { t: 0.45, v: 'uh', amp: 0.78, voice: 1, noise: 0.18 }, { t: 0.8, v: 'oh', amp: 0.38, voice: 1, noise: 0.22 }, { t: 1, v: 'oh', amp: 0, voice: 0, noise: 0.8 },
  ] }) },
  zombieGroan: { dir: 'enemies', synth: () => voice({ dur: 0.58, targetLoudness: 0.16, seed: 0x6102, hold: 3, bits: 6, drive: 1.7, f0: [[0, 108], [1, 82]], vib: { rate: 5.6, depth: 0.04 }, jitter: 0.018, frames: [
    { t: 0, v: 'eu', amp: 0, voice: 1, noise: 0.3 }, { t: 0.08, v: 'eu', amp: 0.72, voice: 1, noise: 0.18 }, { t: 0.48, v: 'aw', amp: 0.8, voice: 1, noise: 0.16 }, { t: 0.82, v: 'oo', amp: 0.38, voice: 1, noise: 0.25 }, { t: 1, v: 'oo', amp: 0, voice: 1, noise: 0.3 },
  ] }) },
  zombieTankGroan: { dir: 'enemies', synth: () => voice({ dur: 0.76, targetLoudness: 0.2, seed: 0x6103, hold: 3, bits: 6, drive: 1.85, f0: [[0, 86], [0.5, 74], [1, 58]], vib: { rate: 4.5, depth: 0.055 }, ring: { rate: 29, depth: 0.18 }, jitter: 0.016, frames: [
    { t: 0, v: 'oo', amp: 0, voice: 1, noise: 0.28 }, { t: 0.07, v: 'oo', amp: 0.88, voice: 1, noise: 0.16 }, { t: 0.35, v: 'aw', amp: 0.98, voice: 1, noise: 0.14 }, { t: 0.78, v: 'oh', amp: 0.54, voice: 1, noise: 0.18 }, { t: 1, v: 'oh', amp: 0, voice: 1, noise: 0.22 },
  ] }) },
  zombieRunnerScreech: { dir: 'enemies', synth: () => voice({ dur: 0.32, targetLoudness: 0.17, seed: 0x6104, hold: 1, bits: 8, drive: 1.35, f0: [[0, 270], [0.22, 420], [1, 310]], vib: { rate: 13, depth: 0.05 }, jitter: 0.025, frames: [
    { t: 0, v: 'ee', amp: 0, voice: 0, noise: 1 }, { t: 0.04, v: 'ee', amp: 0.78, voice: 0, noise: 1 }, { t: 0.12, v: 'ee', amp: 1, voice: 1, noise: 0.24 }, { t: 0.6, v: 'aa', amp: 0.9, voice: 1, noise: 0.2 }, { t: 1, v: 'aa', amp: 0, voice: 0, noise: 0.7 },
  ] }) },
  zombieRangedShoot: { dir: 'enemies', synth: () => voice({ dur: 0.26, targetLoudness: 0.19, seed: 0x6105, hold: 2, bits: 7, drive: 2.0, f0: [[0, 155], [1, 118]], trill: { rate: 30, depth: 0.5 }, jitter: 0.025, frames: [
    { t: 0, v: 'uh', amp: 0, voice: 0, noise: 1 }, { t: 0.05, v: 'uh', amp: 0.95, voice: 0, noise: 1 }, { t: 0.2, v: 'aw', amp: 0.7, voice: 1, noise: 0.55 }, { t: 0.48, v: 'aa', amp: 0.0, voice: 1, noise: 0.6 }, { t: 0.62, v: 'aa', amp: 0.92, voice: 0, noise: 1 }, { t: 1, v: 'aa', amp: 0, voice: 0, noise: 1 },
  ] }) },
  zombieChargeRoar: { dir: 'enemies', synth: () => voice({ dur: 0.52, targetLoudness: 0.22, seed: 0x6106, hold: 2, bits: 7, drive: 1.85, f0: [[0, 130], [0.22, 158], [1, 94]], vib: { rate: 7, depth: 0.05 }, jitter: 0.02, frames: [
    { t: 0, v: 'oo', amp: 0, voice: 1, noise: 0.42 }, { t: 0.06, v: 'oo', amp: 0.9, voice: 1, noise: 0.2 }, { t: 0.35, v: 'aa', amp: 1, voice: 1, noise: 0.18 }, { t: 0.75, v: 'aw', amp: 0.58, voice: 1, noise: 0.24 }, { t: 1, v: 'aw', amp: 0, voice: 0, noise: 0.8 },
  ] }) },

  // 보스
  bossSpawn: { dir: 'events', synth: () => voice({ dur: 0.72, targetLoudness: 0.21, seed: 0x6201, hold: 3, bits: 6, drive: 2.0, f0: [[0, 76], [0.35, 64], [1, 52]], ring: { rate: 24, depth: 0.25 }, vib: { rate: 4.1, depth: 0.045 }, jitter: 0.014, frames: [
    { t: 0, v: 'oo', amp: 0, voice: 1, noise: 0.35 }, { t: 0.06, v: 'oo', amp: 0.85, voice: 1, noise: 0.17 }, { t: 0.36, v: 'aw', amp: 1, voice: 1, noise: 0.16 }, { t: 0.8, v: 'aa', amp: 0.5, voice: 1, noise: 0.22 }, { t: 1, v: 'ng', amp: 0, voice: 1, noise: 0.2 },
  ] }) },
  bossRoar: { dir: 'enemies', synth: () => voice({ dur: 0.86, targetLoudness: 0.23, seed: 0x6202, hold: 3, bits: 6, drive: 2.05, f0: [[0, 82], [0.18, 104], [1, 55]], ring: { rate: 27, depth: 0.28 }, vib: { rate: 5, depth: 0.06 }, jitter: 0.018, frames: [
    { t: 0, v: 'eu', amp: 0, voice: 0, noise: 0.9 }, { t: 0.04, v: 'eu', amp: 0.75, voice: 0, noise: 1 }, { t: 0.12, v: 'aw', amp: 1, voice: 1, noise: 0.16 }, { t: 0.52, v: 'aa', amp: 0.98, voice: 1, noise: 0.14 }, { t: 0.86, v: 'oh', amp: 0.45, voice: 1, noise: 0.22 }, { t: 1, v: 'oh', amp: 0, voice: 1, noise: 0.25 },
  ] }) },
  bossDeath: { dir: 'enemies', synth: () => voice({ dur: 0.95, targetLoudness: 0.22, seed: 0x6203, hold: 3, bits: 6, drive: 2.1, f0: [[0, 78], [0.55, 58], [1, 39]], ring: { rate: 22, depth: 0.34 }, vib: { rate: 3.6, depth: 0.06 }, jitter: 0.022, frames: [
    { t: 0, v: 'aa', amp: 0, voice: 1, noise: 0.3 }, { t: 0.05, v: 'aa', amp: 1, voice: 1, noise: 0.18 }, { t: 0.42, v: 'aw', amp: 0.95, voice: 1, noise: 0.19 }, { t: 0.72, v: 'oh', amp: 0.55, voice: 1, noise: 0.25 }, { t: 0.9, v: 'ng', amp: 0.3, voice: 1, noise: 0.28 }, { t: 1, v: 'ng', amp: 0, voice: 1, noise: 0.3 },
  ] }) },

  // 마틸다
  matildaSpawn: { dir: 'enemies', synth: () => voice({ dur: 0.62, targetLoudness: 0.18, seed: 0x6301, hold: 1, bits: 8, drive: 1.35, pitchScale: CUTE_FEMALE_VOICE_PITCH_SCALE, f0: [[0, 230], [0.32, 255], [1, 190]], vib: { rate: 6.5, depth: 0.035 }, jitter: 0.012, frames: [
    { t: 0, v: 'aa', amp: 0, voice: 1, noise: 0.12 }, { t: 0.08, v: 'aa', amp: 0.7, voice: 1, noise: 0.08 }, { t: 0.38, v: 'ee', amp: 0.78, voice: 1, noise: 0.06 }, { t: 0.7, v: 'aa', amp: 0.55, voice: 1, noise: 0.1 }, { t: 1, v: 'ng', amp: 0, voice: 1, noise: 0.14 },
  ] }) },
  matildaLaugh: { dir: 'enemies', synth: () => voice({ dur: 0.7, targetLoudness: 0.18, seed: 0x6302, hold: 1, bits: 8, drive: 1.45, pitchScale: CUTE_FEMALE_VOICE_PITCH_SCALE, f0: [[0, 260], [0.25, 315], [0.5, 245], [0.72, 310], [1, 230]], vib: { rate: 8.5, depth: 0.055 }, jitter: 0.018, frames: [
    { t: 0, v: 'aa', amp: 0, voice: 0, noise: 0.5 }, { t: 0.04, v: 'aa', amp: 0.8, voice: 1, noise: 0.12 }, { t: 0.22, v: 'aa', amp: 0.15, voice: 1, noise: 0.12 }, { t: 0.3, v: 'ee', amp: 0.78, voice: 1, noise: 0.1 }, { t: 0.48, v: 'ee', amp: 0.12, voice: 1, noise: 0.12 }, { t: 0.58, v: 'aa', amp: 0.74, voice: 1, noise: 0.12 }, { t: 1, v: 'aa', amp: 0, voice: 1, noise: 0.18 },
  ] }) },
  matildaDash: { dir: 'enemies', synth: () => voice({ dur: 0.22, targetLoudness: 0.18, seed: 0x6303, hold: 1, bits: 8, drive: 1.55, pitchScale: CUTE_FEMALE_VOICE_PITCH_SCALE, f0: [[0, 310], [0.3, 360], [1, 250]], jitter: 0.014, frames: [
    { t: 0, v: 'aa', amp: 0, voice: 0, noise: 0.8 }, { t: 0.05, v: 'aa', amp: 0.9, voice: 1, noise: 0.22 }, { t: 0.42, v: 'ee', amp: 0.75, voice: 1, noise: 0.15 }, { t: 1, v: 'ee', amp: 0, voice: 1, noise: 0.18 },
  ] }) },
  matildaDeath: { dir: 'enemies', synth: () => voice({ dur: 0.5, targetLoudness: 0.2, seed: 0x6304, hold: 1, bits: 8, drive: 1.65, pitchScale: CUTE_FEMALE_VOICE_PITCH_SCALE, f0: [[0, 250], [0.24, 330], [1, 170]], vib: { rate: 9, depth: 0.05 }, ring: { rate: 38, depth: 0.16 }, jitter: 0.02, frames: [
    { t: 0, v: 'ee', amp: 0, voice: 0, noise: 0.7 }, { t: 0.04, v: 'ee', amp: 0.85, voice: 1, noise: 0.12 }, { t: 0.24, v: 'aa', amp: 1, voice: 1, noise: 0.1 }, { t: 0.58, v: 'aw', amp: 0.45, voice: 1, noise: 0.18 }, { t: 1, v: 'ng', amp: 0, voice: 1, noise: 0.22 },
  ] }) },

  // 주인공
  playerHit: { dir: 'player', synth: () => voice({ dur: 0.2, targetLoudness: 0.18, seed: 0x6401, hold: 1, bits: 8, drive: 1.25, pitchScale: CUTE_FEMALE_VOICE_PITCH_SCALE, f0: [[0, 265], [0.18, 330], [1, 210]], jitter: 0.01, frames: [
    { t: 0, v: 'aa', amp: 0, voice: 0, noise: 0.35 }, { t: 0.04, v: 'aa', amp: 0.95, voice: 1, noise: 0.1 }, { t: 0.45, v: 'uh', amp: 0.65, voice: 1, noise: 0.1 }, { t: 1, v: 'uh', amp: 0, voice: 1, noise: 0.12 },
  ] }) },
  playerDeath: { dir: 'player', synth: () => voice({ dur: 0.58, targetLoudness: 0.18, seed: 0x6402, hold: 1, bits: 8, drive: 1.3, pitchScale: CUTE_FEMALE_VOICE_PITCH_SCALE, f0: [[0, 245], [0.28, 285], [1, 135]], vib: { rate: 5.4, depth: 0.035 }, jitter: 0.012, frames: [
    { t: 0, v: 'aa', amp: 0, voice: 1, noise: 0.18 }, { t: 0.06, v: 'aa', amp: 0.9, voice: 1, noise: 0.1 }, { t: 0.34, v: 'aw', amp: 0.78, voice: 1, noise: 0.12 }, { t: 0.75, v: 'uh', amp: 0.35, voice: 1, noise: 0.18 }, { t: 1, v: 'uh', amp: 0, voice: 1, noise: 0.24 },
  ] }) },
  playerHeal: { dir: 'player', synth: () => voice({ dur: 0.36, targetLoudness: 0.14, seed: 0x6403, hold: 1, bits: 8, drive: 1.05, pitchScale: CUTE_FEMALE_VOICE_PITCH_SCALE, f0: [[0, 220], [1, 175]], vib: { rate: 4.2, depth: 0.018 }, jitter: 0.006, frames: [
    { t: 0, v: 'oo', amp: 0, voice: 1, noise: 0.18 }, { t: 0.1, v: 'oo', amp: 0.52, voice: 1, noise: 0.08 }, { t: 0.6, v: 'aw', amp: 0.46, voice: 1, noise: 0.08 }, { t: 1, v: 'aw', amp: 0, voice: 1, noise: 0.1 },
  ] }) },

  // 도지/이누콘
  dogeEscape: { dir: 'enemies', synth: () => voice({ dur: 0.22, targetLoudness: 0.17, seed: 0x6501, hold: 1, bits: 8, drive: 1.35, f0: [[0, 390], [0.2, 520], [1, 360]], vib: { rate: 16, depth: 0.04 }, jitter: 0.012, frames: [
    { t: 0, v: 'aw', amp: 0, voice: 0, noise: 0.35 }, { t: 0.04, v: 'aw', amp: 0.9, voice: 1, noise: 0.1 }, { t: 0.42, v: 'aa', amp: 0.65, voice: 1, noise: 0.1 }, { t: 1, v: 'aa', amp: 0, voice: 1, noise: 0.15 },
  ] }) },
  dogeYelp: { dir: 'enemies', synth: () => voice({ dur: 0.18, targetLoudness: 0.16, seed: 0x6502, hold: 1, bits: 8, drive: 1.3, f0: [[0, 520], [0.25, 680], [1, 430]], jitter: 0.016, frames: [
    { t: 0, v: 'ee', amp: 0, voice: 0, noise: 0.4 }, { t: 0.04, v: 'ee', amp: 0.92, voice: 1, noise: 0.12 }, { t: 0.48, v: 'aa', amp: 0.55, voice: 1, noise: 0.12 }, { t: 1, v: 'aa', amp: 0, voice: 1, noise: 0.18 },
  ] }) },
  dogeDeath: { dir: 'enemies', synth: () => voice({ dur: 0.3, targetLoudness: 0.15, seed: 0x6503, hold: 1, bits: 8, drive: 1.2, f0: [[0, 430], [0.2, 530], [1, 280]], vib: { rate: 9, depth: 0.04 }, jitter: 0.014, frames: [
    { t: 0, v: 'ee', amp: 0, voice: 1, noise: 0.18 }, { t: 0.05, v: 'ee', amp: 0.75, voice: 1, noise: 0.1 }, { t: 0.45, v: 'aw', amp: 0.55, voice: 1, noise: 0.12 }, { t: 1, v: 'oo', amp: 0, voice: 1, noise: 0.14 },
  ] }) },
  inuconBite: { dir: 'enemies', synth: () => voice({ dur: 0.2, targetLoudness: 0.17, seed: 0x6504, hold: 1, bits: 8, drive: 1.45, f0: [[0, 330], [0.25, 460], [1, 250]], jitter: 0.012, frames: [
    { t: 0, v: 'aw', amp: 0, voice: 0, noise: 0.55 }, { t: 0.04, v: 'aw', amp: 0.9, voice: 1, noise: 0.12 }, { t: 0.35, v: 'aa', amp: 0.75, voice: 1, noise: 0.12 }, { t: 0.65, v: 'aa', amp: 0, voice: 1, noise: 0.18 }, { t: 0.78, v: 'aa', amp: 0.45, voice: 0, noise: 1 }, { t: 1, v: 'aa', amp: 0, voice: 0, noise: 1 },
  ] }) },
  inuconHeal: { dir: 'enemies', synth: () => voice({ dur: 0.32, targetLoudness: 0.13, seed: 0x6505, hold: 1, bits: 8, drive: 1.1, f0: [[0, 360], [1, 310]], vib: { rate: 5, depth: 0.02 }, jitter: 0.008, frames: [
    { t: 0, v: 'ee', amp: 0, voice: 1, noise: 0.14 }, { t: 0.08, v: 'ee', amp: 0.5, voice: 1, noise: 0.08 }, { t: 0.55, v: 'oo', amp: 0.46, voice: 1, noise: 0.08 }, { t: 1, v: 'oo', amp: 0, voice: 1, noise: 0.1 },
  ] }) },

  // 휘파람/호출 계열
  rzlWhistle: { dir: 'events', synth: () => synthWhistle({ seed: 0x6601, dur: 0.42, f0: [[0, 1300], [0.32, 2250], [0.6, 1850], [1, 2500]], vibRate: 8, vibDepth: 30, noise: 0.012 }) },
  stage2GuardWhistle: { dir: 'events', synth: () => synthWhistle({ seed: 0x6602, dur: 0.5, f0: [[0, 1700], [0.18, 2600], [0.5, 2600], [0.68, 1900], [1, 2350]], vibRate: 11, vibDepth: 24, noise: 0.01, chirp: true }) },
  matildaCountdownEnd: { dir: 'events', synth: () => voice({ dur: 0.42, targetLoudness: 0.17, seed: 0x6603, hold: 1, bits: 8, drive: 1.45, pitchScale: CUTE_FEMALE_VOICE_PITCH_SCALE, f0: [[0, 280], [0.22, 360], [1, 190]], vib: { rate: 10, depth: 0.05 }, ring: { rate: 42, depth: 0.14 }, jitter: 0.018, frames: [
    { t: 0, v: 'ee', amp: 0, voice: 0, noise: 0.7 }, { t: 0.05, v: 'ee', amp: 0.72, voice: 1, noise: 0.15 }, { t: 0.3, v: 'aa', amp: 0.8, voice: 1, noise: 0.12 }, { t: 0.78, v: 'ng', amp: 0.28, voice: 1, noise: 0.18 }, { t: 1, v: 'ng', amp: 0, voice: 1, noise: 0.2 },
  ] }) },
}

if (process.argv[1] && process.argv[1].endsWith('generate_voice_sfx.mjs')) {
  const filter = process.argv[2]
  mkdirSync(TMP, { recursive: true })
  let made = 0
  for (const [id, spec] of Object.entries(VOICE_SFX)) {
    if (filter && !id.includes(filter)) continue
    const samples = spec.synth()
    const wav = join(TMP, `${id}.wav`)
    writeWav(wav, samples)
    const outDir = join(ROOT, 'public/sfx', spec.dir)
    mkdirSync(outDir, { recursive: true })
    const ogg = join(outDir, `${id}.ogg`)
    const mp3 = join(outDir, `${id}.mp3`)
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '2', '-ar', String(SR), ogg])
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', String(SR), mp3])
    console.log(`ok ${id} -> public/sfx/${spec.dir}/${id}.ogg`)
    made += 1
  }
  rmSync(TMP, { recursive: true, force: true })
  console.log(`\n${made} voice-like SFX generated.`)
}

export { VOICE_SFX }
