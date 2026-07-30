/**
 * Project-owned BGM generator. It uses only deterministic math and Node built-ins:
 * no sample, recording, external instrument, or package is part of either asset.
 *
 * Run: node scripts/generate-project-bgm.mjs
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIRECTORY = resolve(scriptDirectory, '../src/assets/audio')
const WORKSPACE_ROOT = resolve(scriptDirectory, '../../..')
const MANIFEST_PATH = resolve(WORKSPACE_ROOT, 'Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json')
export const BGM_SAMPLE_RATE = 22050
export const BGM_CHANNELS = 1
export const BGM_DURATION_SECONDS = 8
const TAU = Math.PI * 2

function seededNoise(index, salt) {
  let value = (index + 1) * 1103515245 + salt * 12345
  value ^= value >>> 16
  value = Math.imul(value, 2246822519)
  value ^= value >>> 13
  return ((value >>> 0) / 0xffffffff) * 2 - 1
}

function noteHz(midi) {
  return 440 * (2 ** ((midi - 69) / 12))
}

function pulse(t, start, duration) {
  const local = (t - start) / duration
  if (local < 0 || local >= 1) return 0
  return Math.min(1, local * 70, (1 - local) * 8)
}

function createLoop({ bass, melody, sparkleSalt }) {
  const sampleCount = BGM_SAMPLE_RATE * BGM_DURATION_SECONDS
  const samples = new Float64Array(sampleCount)
  const beatSeconds = 0.5
  const stepSeconds = beatSeconds / 2

  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / BGM_SAMPLE_RATE
    const step = Math.floor(t / stepSeconds) % melody.length
    const stepStart = Math.floor(t / stepSeconds) * stepSeconds
    const beatStart = Math.floor(t / beatSeconds) * beatSeconds
    const bassStep = Math.floor(t / beatSeconds) % bass.length
    const melodyEnvelope = pulse(t, stepStart, stepSeconds * 0.82)
    const bassEnvelope = pulse(t, beatStart, beatSeconds * 0.9)
    const melodyPhase = (t - stepStart) * noteHz(melody[step])
    const bassPhase = (t - beatStart) * noteHz(bass[bassStep])
    const lead = Math.sign(Math.sin(TAU * melodyPhase)) * 0.125 * melodyEnvelope
    const harmony = Math.sin(TAU * melodyPhase * 2) * 0.028 * melodyEnvelope
    const low = Math.sin(TAU * bassPhase) * 0.085 * bassEnvelope
    const kick = Math.sin(TAU * (48 + 35 * Math.exp(-(t - beatStart) * 18)) * (t - beatStart))
      * 0.075 * pulse(t, beatStart, 0.12)
    const eighth = Math.floor(t / stepSeconds) % 2 === 1
      ? seededNoise(index, sparkleSalt) * 0.015 * pulse(t, stepStart, 0.035)
      : 0
    samples[index] = lead + harmony + low + kick + eighth
  }
  return samples
}

function encodeWav(samples) {
  const output = Buffer.alloc(44 + samples.length * 2)
  output.write('RIFF', 0)
  output.writeUInt32LE(output.length - 8, 4)
  output.write('WAVE', 8)
  output.write('fmt ', 12)
  output.writeUInt32LE(16, 16)
  output.writeUInt16LE(1, 20)
  output.writeUInt16LE(BGM_CHANNELS, 22)
  output.writeUInt32LE(BGM_SAMPLE_RATE, 24)
  output.writeUInt32LE(BGM_SAMPLE_RATE * BGM_CHANNELS * 2, 28)
  output.writeUInt16LE(BGM_CHANNELS * 2, 32)
  output.writeUInt16LE(16, 34)
  output.write('data', 36)
  output.writeUInt32LE(samples.length * 2, 40)
  for (let index = 0; index < samples.length; index += 1) {
    output.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[index])) * 32767), 44 + index * 2)
  }
  return output
}

function describePcm(wav) {
  let peak = 0
  let squareTotal = 0
  const samples = (wav.length - 44) / 2
  for (let offset = 44; offset < wav.length; offset += 2) {
    const normalized = wav.readInt16LE(offset) / 32767
    peak = Math.max(peak, Math.abs(normalized))
    squareTotal += normalized * normalized
  }
  return {
    sampleRate: BGM_SAMPLE_RATE,
    channels: BGM_CHANNELS,
    durationSeconds: samples / BGM_SAMPLE_RATE,
    pcmPeak: peak,
    pcmRms: Math.sqrt(squareTotal / samples),
    bytes: wav.length,
    sha256: createHash('sha256').update(wav).digest('hex'),
  }
}

export function generateProjectBgmAssets() {
  const definitions = [
    {
      file: 'gameplay_bgm.wav',
      logicalId: 'gameplayBgm',
      samples: createLoop({
        bass: [38, 38, 41, 36, 38, 38, 43, 36],
        melody: [62, 65, 69, 65, 62, 65, 70, 69, 62, 67, 70, 67, 60, 64, 67, 64],
        sparkleSalt: 29,
      }),
    },
  ]
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true })
  return definitions.map(({ file, logicalId, samples }) => {
    const wav = encodeWav(samples)
    const outputPath = resolve(OUTPUT_DIRECTORY, file)
    writeFileSync(outputPath, wav)
    return { logicalId, file, outputPath, ...describePcm(wav) }
  })
}

export function writeProjectBgmManifest({ manifestPath = MANIFEST_PATH } = {}) {
  const generated = generateProjectBgmAssets()
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.manifestVersion = 2
  manifest.assets = manifest.assets.filter((asset) => asset.logicalId !== 'gameplayBgm')
  manifest.assets.push(...generated.map((asset) => ({
    logicalId: asset.logicalId,
    category: 'bgm',
    paths: [{
      path: `Developer/r3f_prototype/src/assets/audio/${asset.file}`,
      bytes: asset.bytes,
      sha256: asset.sha256,
    }],
    provenanceType: 'project-generated-procedural',
    licenseEvidence: 'project-generated-procedural-no-external-samples',
    source: 'scripts/generate-project-bgm.mjs (deterministic Node built-in PCM synthesis; no external samples or recorded source)',
    notes: `${BGM_DURATION_SECONDS}s ${BGM_SAMPLE_RATE}Hz mono 16-bit WAV loop; source values are PCM measurements, not a perceptual loudness claim.`,
    sampleRate: asset.sampleRate,
    channels: asset.channels,
    durationSeconds: asset.durationSeconds,
    pcmPeak: asset.pcmPeak,
    pcmRms: asset.pcmRms,
  })))
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return generated
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const generated = process.argv.includes('--write-manifest') ? writeProjectBgmManifest() : generateProjectBgmAssets()
  for (const asset of generated) {
    console.log(`${asset.logicalId}: ${asset.bytes} bytes, sha256 ${asset.sha256}, peak ${asset.pcmPeak.toFixed(6)}, rms ${asset.pcmRms.toFixed(6)}`)
  }
}
