import { describe, expect, it, vi } from 'vitest'
import {
  AUDIO_DIAGNOSTIC_EXPECTED_COUNT,
  AUDIO_DIAGNOSTIC_SFX_COUNT,
  getAudioDiagnosticCatalog,
  measureDecodedAudioBuffer,
  runAudioDiagnostics,
  validateAudioDiagnosticCatalog,
} from './audioDiagnostics.js'

function makeBuffer({ samples = [[0, 0.5, -0.25, 1]], sampleRate = 22050, duration = 1 } = {}) {
  return {
    numberOfChannels: samples.length,
    sampleRate,
    duration,
    length: samples[0].length,
    getChannelData: (channel) => Float32Array.from(samples[channel]),
  }
}

describe('audio diagnostics catalog', () => {
  // 기대 수치는 audioDiagnostics.js의 상수를 그대로 참조한다. 예전처럼 76/75를 이 파일에
  // 또 하드코딩하면 상수만 갱신됐을 때 조용히 어긋난다(실제로 그렇게 드리프트했다).
  it('derives the exact SFX plus canonical title BGM contract from runtime sources', () => {
    const catalog = getAudioDiagnosticCatalog()
    expect(catalog).toHaveLength(AUDIO_DIAGNOSTIC_EXPECTED_COUNT)
    expect(catalog.filter((entry) => entry.kind === 'sfx')).toHaveLength(AUDIO_DIAGNOSTIC_SFX_COUNT)
    expect(catalog.map((entry) => entry.logicalId)).toEqual(expect.arrayContaining(['titleBgm']))
    expect(validateAudioDiagnosticCatalog(catalog)).toMatchObject({
      valid: true,
      actualCount: AUDIO_DIAGNOSTIC_EXPECTED_COUNT,
      sfxCount: AUDIO_DIAGNOSTIC_SFX_COUNT,
      bgmCount: 1,
    })
  })
})

describe('measureDecodedAudioBuffer', () => {
  it('reports PCM sample peak, RMS, and RMS dBFS without treating them as LUFS or true peak', () => {
    const result = measureDecodedAudioBuffer(makeBuffer())
    expect(result).toMatchObject({ durationSec: 1, channels: 1, sampleRate: 22050, samplePeak: 1 })
    expect(result.pcmRms).toBeCloseTo(Math.sqrt(1.3125 / 4), 8)
    expect(result.pcmRmsDbfs).toBeCloseTo(20 * Math.log10(Math.sqrt(1.3125 / 4)), 8)
  })

  it('preserves decoded-sample overs as PCM risk evidence instead of classifying it as a decode error', () => {
    const result = measureDecodedAudioBuffer(makeBuffer({ samples: [[0, 1.1, -1.2]] }))
    expect(result.samplePeak).toBeCloseTo(1.2, 5)
    expect(result.samplePeakDbfs).toBeCloseTo(20 * Math.log10(1.2), 5)
    expect(result).toMatchObject({ clippedSampleCount: 2, clippedSampleRatio: 2 / 3, hasSampleOvers: true })
  })

  it('rejects non-finite decoded PCM and derived values', () => {
    expect(() => measureDecodedAudioBuffer(makeBuffer({ samples: [[Number.NaN]] }))).toThrow(/non-finite PCM sample/)
    expect(() => measureDecodedAudioBuffer(makeBuffer({ samples: [[Number.POSITIVE_INFINITY]] }))).toThrow(/non-finite PCM sample/)
    expect(() => measureDecodedAudioBuffer({
      numberOfChannels: 1,
      sampleRate: 22050,
      duration: 1,
      length: 1,
      getChannelData: () => [Number.MAX_VALUE],
    })).toThrow(/non-finite derived value/)
  })
})

describe('runAudioDiagnostics', () => {
  it('fetches and decodes every catalog row, preserving explicit decode failures', async () => {
    const catalog = [
      { logicalId: 'ok', url: '/ok.ogg', kind: 'sfx' },
      { logicalId: 'broken', url: '/broken.ogg', kind: 'sfx' },
    ]
    const invalid = await runAudioDiagnostics({ catalog, audioContext: {}, fetchImpl: vi.fn() })
    expect(invalid).toMatchObject({ status: 'complete-with-errors', completed: 2, errorCount: 2 })

    const validCatalog = getAudioDiagnosticCatalog()
    const fetchImpl = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }))
    const audioContext = { decodeAudioData: vi.fn(async () => makeBuffer({ samples: [[0, 1.1, -1.2]] })) }
    const result = await runAudioDiagnostics({ catalog: validCatalog, audioContext, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(AUDIO_DIAGNOSTIC_EXPECTED_COUNT)
    expect(audioContext.decodeAudioData).toHaveBeenCalledTimes(AUDIO_DIAGNOSTIC_EXPECTED_COUNT)
    expect(result).toMatchObject({
      status: 'complete',
      completed: AUDIO_DIAGNOSTIC_EXPECTED_COUNT,
      okCount: AUDIO_DIAGNOSTIC_EXPECTED_COUNT,
      errorCount: 0,
    })
    expect(result.rows[0]).toMatchObject({
      logicalId: validCatalog[0].logicalId,
      status: 'ok',
      sampleRate: 22050,
      clippedSampleCount: 2,
      hasSampleOvers: true,
    })
  })

  it('turns individual fetch/decode failures into rows rather than dropping logical IDs', async () => {
    const catalog = getAudioDiagnosticCatalog()
    const fetchImpl = vi.fn(async (url) => ({
      ok: !url.includes('pencilFire'),
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(8),
    }))
    const result = await runAudioDiagnostics({
      catalog,
      audioContext: { decodeAudioData: vi.fn(async () => makeBuffer()) },
      fetchImpl,
    })
    expect(result).toMatchObject({
      completed: AUDIO_DIAGNOSTIC_EXPECTED_COUNT,
      errorCount: 1,
      okCount: AUDIO_DIAGNOSTIC_EXPECTED_COUNT - 1,
      status: 'complete-with-errors',
    })
    expect(result.rows.find((row) => row.logicalId === 'pencilFire')).toMatchObject({ status: 'error', error: 'Fetch failed (404).' })
  })
})
