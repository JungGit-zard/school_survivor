// 2026-11-14 Terry: "마틸다 여자아이 목소리 엄수해" / "마틸다 음성은 지금 괴기스러우니까 100퍼센트 완전히 바꿔".
// 마틸다의 목소리 큐는 전부 scripts/generate_matilda_girl_voice.mjs(CC0 실제 여자아이 녹음, 자르기·정리만)가
// 만든다. 합성 생성기에 다시 들어가면 다음 일괄 재생성 때 옛 기계음/괴기음이 덮어쓴다 — 그걸 싸게 막는다.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { DIALOGUE_GRAIN_DIR, MATILDA_DIALOGUE_GRAINS, MATILDA_VOICE_CUES, SOURCES } from '../../scripts/generate_matilda_girl_voice.mjs'
import { DIALOGUE_VOICE_PROFILES } from './dialogueVoice.js'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')

// matildaWarningTick은 목소리가 아니다(947/474 Hz 두 번 울리는 경고 비프) — 합성 그대로 둔다.
const VOCAL_MATILDA_CUES = ['matildaSpawn', 'matildaDash', 'matildaLaugh', 'matildaDeath', 'matildaCountdownEnd']

describe('Matilda voice is a real little girl, never re-synthesized', () => {
  it('the girl-voice generator owns every vocal Matilda cue', () => {
    expect(Object.keys(MATILDA_VOICE_CUES).sort()).toEqual([...VOCAL_MATILDA_CUES].sort())
  })

  it('uses only SHA-pinned CC0 sources', () => {
    for (const spec of Object.values(MATILDA_VOICE_CUES)) {
      for (const [key] of spec.parts) {
        expect(SOURCES[key].license).toBe('CC0-1.0')
        expect(SOURCES[key].sha256).toMatch(/^[0-9a-f]{64}$/)
      }
    }
  })

  for (const script of ['scripts/generate_voice_sfx.mjs', 'scripts/generate_sfx.mjs']) {
    it(`${script} does not define any vocal Matilda cue`, () => {
      const src = read(script).toString('utf8')
      for (const cue of VOCAL_MATILDA_CUES) {
        const definition = new RegExp(`^\\s*['"]?(?:enemies/|events/)?${cue}['"]?\\s*:`, 'm')
        expect(src, `${cue} is defined in ${script}`).not.toMatch(definition)
      }
    })
  }

  it('plays the dash at natural pitch (no rate slowdown on the girl voice)', () => {
    const enemy = read('src/components/Enemy.jsx').toString('utf8')
    const dashSfx = enemy.match(/\{[^{}]*id: 'matildaDash'[^{}]*\}/g) ?? []
    expect(dashSfx.length).toBeGreaterThan(0)
    for (const literal of dashSfx) expect(literal).not.toMatch(/\brate\s*:/)
  })

  it('provenance manifest records the shipped bytes as CC0-recording-derived', () => {
    const manifest = JSON.parse(read('../agent_room/audio_asset_provenance_manifest_2026-07-30.json').toString('utf8'))
    for (const cue of VOCAL_MATILDA_CUES) {
      const entry = manifest.assets.find((asset) => asset.logicalId === cue)
      expect(entry?.provenanceType, cue).toBe('cc0-recording-derived')
      expect(entry.source).toContain('generate_matilda_girl_voice.mjs')
      for (const ext of ['ogg', 'mp3']) {
        const rel = `public/sfx/${MATILDA_VOICE_CUES[cue].dir}/${cue}.${ext}`
        const bytes = read(rel)
        const recorded = entry.paths.find((p) => p.path.endsWith(rel))
        expect(recorded, rel).toBeTruthy()
        expect(recorded.sha256, rel).toBe(sha(bytes))
        expect(recorded.bytes, rel).toBe(bytes.length)
      }
    }
  })
})

// 대사 블립도 같은 아이 녹음 그레인이어야 한다(오실레이터 삐삐 금지).
describe('Matilda dialogue blips are the same recorded girl', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

  it('the Matilda profile uses only the generated girl grains and no oscillator voice', () => {
    const profile = DIALOGUE_VOICE_PROFILES.matilda
    expect(profile.grainUrls).toEqual(MATILDA_DIALOGUE_GRAINS.map((g) => `/sfx/${DIALOGUE_GRAIN_DIR}/${g.id}`))
    for (const key of ['waveform', 'overtoneWaveform', 'vibratoRate', 'baseFrequency', 'semitonePattern', 'detuneCents', 'playbackRate']) {
      expect(profile[key], key).toBeUndefined()
    }
    for (const g of MATILDA_DIALOGUE_GRAINS) expect(SOURCES[g.source].license).toBe('CC0-1.0')
  })

  it('grain files are tiny and recorded in the provenance manifest', () => {
    const manifest = JSON.parse(read('../agent_room/audio_asset_provenance_manifest_2026-07-30.json').toString('utf8'))
    for (const g of MATILDA_DIALOGUE_GRAINS) {
      const entry = manifest.assets.find((asset) => asset.logicalId === g.id)
      expect(entry?.provenanceType, g.id).toBe('cc0-recording-derived')
      for (const ext of ['ogg', 'mp3']) {
        const rel = `public/sfx/${DIALOGUE_GRAIN_DIR}/${g.id}.${ext}`
        const bytes = read(rel)
        expect(bytes.length, rel).toBeLessThanOrEqual(4500)
        expect(entry.paths.find((p) => p.path.endsWith(rel))?.sha256, rel).toBe(sha(bytes))
      }
    }
  })

  it('speaks Matilda lines with buffer grains at natural rate, never oscillators', async () => {
    vi.useFakeTimers()
    const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() })
    const sources = [], oscillators = [], fetched = []
    const context = {
      state: 'running', currentTime: 0, destination: {},
      createGain: () => ({ connect() {}, disconnect() {}, gain: param() }),
      createBiquadFilter: () => ({ connect() {}, disconnect() {}, frequency: param(), Q: param() }),
      createOscillator: () => { const o = { connect() {}, disconnect() {}, start() {}, stop() {}, frequency: param(), detune: param() }; oscillators.push(o); return o },
      createBufferSource: () => { const s = { connect() {}, disconnect() {}, start: vi.fn(), stop() {}, playbackRate: param() }; sources.push(s); return s },
      decodeAudioData: (bytes) => Promise.resolve({ duration: 0.08, sampleRate: 22050, getChannelData: () => new Float32Array(8).fill(0.2), tag: bytes.tag }),
    }
    vi.stubGlobal('fetch', vi.fn((url) => { fetched.push(url); const ab = new ArrayBuffer(8); ab.tag = url; return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(ab) }) }))
    vi.resetModules()
    vi.doMock('./sharedAudioContext.js', () => ({ getSharedAudioContext: () => context }))
    vi.doMock('./streamingBgm.js', () => ({ resumeStreamingBgm: () => {} }))
    vi.doMock('./audioSettings.js', () => ({ getSfxVolumeScale: () => 1 }))
    const { playDialogueVoice, stopDialogueVoice } = await import('./dialogueVoice.js')
    playDialogueVoice('호호호, 어서 와!', 'matilda')
    await vi.runAllTimersAsync()
    stopDialogueVoice()
    vi.doUnmock('./sharedAudioContext.js'); vi.doUnmock('./streamingBgm.js'); vi.doUnmock('./audioSettings.js')

    expect(oscillators).toHaveLength(0)
    expect(sources).toHaveLength(6) // 6 voiced glyphs, punctuation/space silent
    expect(new Set(sources.map((s) => s.buffer.tag)).size).toBeGreaterThan(2) // grains rotate
    for (const s of sources) expect(s.playbackRate.setValueAtTime).not.toHaveBeenCalled()
    expect(fetched.every((url) => /^\/sfx\/dialogue\/matildaGrain\d\.(ogg|mp3)$/.test(url))).toBe(true)
  })
})
