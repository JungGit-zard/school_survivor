import { SOUND_MAP } from './sfxRegistry.js'
import titleBgmUrl from '../assets/audio/title_bgm.m4a'
import gameplayBgmUrl from '../assets/audio/gameplay_bgm.wav'

export const AUDIO_DIAGNOSTIC_SFX_COUNT = 75
export const AUDIO_DIAGNOSTIC_EXPECTED_COUNT = 77

// This is intentionally derived from the runtime SFX authority plus the two
// runtime BGM imports. It is not a second audio manifest.
export function getAudioDiagnosticCatalog() {
  return [
    ...Object.entries(SOUND_MAP).map(([logicalId, url]) => ({ logicalId, url, kind: 'sfx' })),
    { logicalId: 'titleBgm', url: titleBgmUrl, kind: 'bgm' },
    { logicalId: 'gameplayBgm', url: gameplayBgmUrl, kind: 'bgm' },
  ]
}

export function validateAudioDiagnosticCatalog(catalog = getAudioDiagnosticCatalog()) {
  const ids = catalog.map((entry) => entry.logicalId)
  const uniqueIds = new Set(ids)
  const sfxEntries = catalog.filter((entry) => entry.kind === 'sfx')
  const bgmEntries = catalog.filter((entry) => entry.kind === 'bgm')
  return {
    valid: catalog.length === AUDIO_DIAGNOSTIC_EXPECTED_COUNT
      && sfxEntries.length === AUDIO_DIAGNOSTIC_SFX_COUNT
      && bgmEntries.length === 2
      && uniqueIds.size === catalog.length
      && ids.includes('titleBgm')
      && ids.includes('gameplayBgm'),
    expectedCount: AUDIO_DIAGNOSTIC_EXPECTED_COUNT,
    actualCount: catalog.length,
    sfxCount: sfxEntries.length,
    bgmCount: bgmEntries.length,
    duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
  }
}

export function measureDecodedAudioBuffer(buffer) {
  const channels = Number(buffer?.numberOfChannels)
  const sampleRate = Number(buffer?.sampleRate)
  const durationSec = Number(buffer?.duration)
  const length = Number(buffer?.length)
  if (!Number.isInteger(channels) || channels < 1 || channels > 64) {
    throw new Error('Decoded audio has an invalid channel count.')
  }
  if (!Number.isFinite(sampleRate) || sampleRate < 1 || sampleRate > 384000) {
    throw new Error('Decoded audio has an invalid sample rate.')
  }
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 3600) {
    throw new Error('Decoded audio has an invalid duration.')
  }
  if (!Number.isInteger(length) || length < 1) {
    throw new Error('Decoded audio has no PCM samples.')
  }

  let samplePeak = 0
  let sumSquares = 0
  let sampleCount = 0
  let clippedSampleCount = 0
  for (let channel = 0; channel < channels; channel += 1) {
    const samples = buffer.getChannelData(channel)
    if (!samples || samples.length !== length) throw new Error('Decoded audio channel data is invalid.')
    for (const sample of samples) {
      if (!Number.isFinite(sample)) throw new Error('Decoded audio contains a non-finite PCM sample.')
      const magnitude = Math.abs(sample)
      samplePeak = Math.max(samplePeak, magnitude)
      sumSquares += sample * sample
      sampleCount += 1
      if (magnitude > 1) clippedSampleCount += 1
    }
  }

  const pcmRms = Math.sqrt(sumSquares / sampleCount)
  const pcmRmsDbfs = pcmRms > 0 ? 20 * Math.log10(pcmRms) : null
  const samplePeakDbfs = samplePeak > 0 ? 20 * Math.log10(samplePeak) : null
  const clippedSampleRatio = clippedSampleCount / sampleCount
  if (!Number.isFinite(sumSquares)
    || !Number.isFinite(samplePeak)
    || !Number.isFinite(pcmRms)
    || !Number.isFinite(clippedSampleRatio)
    || (pcmRmsDbfs !== null && !Number.isFinite(pcmRmsDbfs))
    || (samplePeakDbfs !== null && !Number.isFinite(samplePeakDbfs))) {
    throw new Error('Decoded audio measurement contains a non-finite derived value.')
  }

  return {
    durationSec,
    channels,
    sampleRate,
    samplePeak,
    samplePeakDbfs,
    pcmRms,
    pcmRmsDbfs,
    clippedSampleCount,
    clippedSampleRatio,
    hasSampleOvers: clippedSampleCount > 0,
  }
}

export async function runAudioDiagnostics({
  catalog = getAudioDiagnosticCatalog(),
  audioContext,
  fetchImpl = globalThis.fetch,
  signal,
  onProgress,
} = {}) {
  const catalogValidation = validateAudioDiagnosticCatalog(catalog)
  if (!catalogValidation.valid) {
    return buildFailureResult(catalog, catalogValidation, new Error('Audio diagnostic catalog contract is invalid.'))
  }
  if (!audioContext || typeof audioContext.decodeAudioData !== 'function') {
    return buildFailureResult(catalog, catalogValidation, new Error('Web Audio decodeAudioData is unavailable.'))
  }
  if (typeof fetchImpl !== 'function') {
    return buildFailureResult(catalog, catalogValidation, new Error('fetch is unavailable.'))
  }

  const rows = []
  for (const entry of catalog) {
    throwIfAborted(signal)
    let row
    try {
      const response = await fetchImpl(entry.url, { signal })
      if (!response?.ok) throw new Error(`Fetch failed (${response?.status ?? 'unknown status'}).`)
      const payload = await response.arrayBuffer()
      throwIfAborted(signal)
      const decoded = await audioContext.decodeAudioData(payload)
      row = { logicalId: entry.logicalId, url: entry.url, kind: entry.kind, status: 'ok', ...measureDecodedAudioBuffer(decoded) }
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) throw error
      row = { logicalId: entry.logicalId, url: entry.url, kind: entry.kind, status: 'error', error: formatDiagnosticError(error) }
    }
    rows.push(row)
    onProgress?.({ completed: rows.length, total: catalog.length, row })
  }

  const errorCount = rows.filter((row) => row.status === 'error').length
  return {
    status: errorCount === 0 ? 'complete' : 'complete-with-errors',
    catalog: catalogValidation,
    completed: rows.length,
    okCount: rows.length - errorCount,
    errorCount,
    rows,
  }
}

export function buildFailureResult(catalog, catalogValidation, error) {
  const message = formatDiagnosticError(error)
  const rows = catalog.map((entry) => ({
    logicalId: entry.logicalId,
    url: entry.url,
    kind: entry.kind,
    status: 'error',
    error: message,
  }))
  return {
    status: 'complete-with-errors',
    catalog: catalogValidation,
    completed: rows.length,
    okCount: 0,
    errorCount: rows.length,
    rows,
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw createAbortError()
}

function createAbortError() {
  const error = new Error('Audio diagnostics aborted.')
  error.name = 'AbortError'
  return error
}

function isAbortError(error) {
  return error?.name === 'AbortError'
}

function formatDiagnosticError(error) {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
  return message.slice(0, 300)
}
