export const E2E_PERFORMANCE_DEFAULT_DURATION_SECONDS = 60
export const E2E_PERFORMANCE_MIN_DURATION_SECONDS = 5
export const E2E_PERFORMANCE_MAX_DURATION_SECONDS = 600
export const LONG_FRAME_33_MS = 33.34
export const LONG_FRAME_50_MS = 50

export function getE2EPerformanceDurationSeconds(search) {
  const params = new URLSearchParams(typeof search === 'string' ? search : '')
  const raw = params.get('e2eperfseconds')
  if (raw == null || raw.trim() === '') return E2E_PERFORMANCE_DEFAULT_DURATION_SECONDS
  const value = Number(raw)
  if (!Number.isFinite(value)) return E2E_PERFORMANCE_DEFAULT_DURATION_SECONDS
  return Math.min(E2E_PERFORMANCE_MAX_DURATION_SECONDS, Math.max(E2E_PERFORMANCE_MIN_DURATION_SECONDS, value))
}

export function percentile(values, percentage) {
  if (!Array.isArray(values) || values.length === 0) return null
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentage / 100) * sorted.length) - 1))
  return sorted[index]
}

export function summarizeFrameIntervals(intervals) {
  const samples = Array.isArray(intervals) ? intervals.filter(Number.isFinite) : []
  const sampleCount = samples.length
  const over33Count = samples.filter((value) => value > LONG_FRAME_33_MS).length
  const over50Count = samples.filter((value) => value > LONG_FRAME_50_MS).length
  const p50 = percentile(samples, 50)
  const p95 = percentile(samples, 95)
  const p99 = percentile(samples, 99)
  const max = sampleCount ? Math.max(...samples) : null
  const average = sampleCount ? samples.reduce((total, value) => total + value, 0) / sampleCount : null
  return {
    sampleCount,
    p50,
    p95,
    p99,
    max,
    fpsEstimate: average && average > 0 ? 1000 / average : null,
    longFrames: {
      over33_34ms: { count: over33Count, ratio: sampleCount ? over33Count / sampleCount : 0 },
      over50ms: { count: over50Count, ratio: sampleCount ? over50Count / sampleCount : 0 },
    },
  }
}

export function snapshotCanvas(canvas) {
  if (!canvas) return { status: 'not-found', clientWidth: null, clientHeight: null, backingWidth: null, backingHeight: null, devicePixelRatio: null }
  return {
    status: 'captured',
    clientWidth: Number(canvas.clientWidth) || 0,
    clientHeight: Number(canvas.clientHeight) || 0,
    backingWidth: Number(canvas.width) || 0,
    backingHeight: Number(canvas.height) || 0,
    devicePixelRatio: typeof window === 'undefined' ? null : Number(window.devicePixelRatio) || 1,
  }
}

export function snapshotPerformanceMemory(performanceObject = globalThis.performance) {
  const memory = performanceObject?.memory
  if (!memory) return { status: 'unsupported', usedJSHeapSize: null, totalJSHeapSize: null, jsHeapSizeLimit: null }
  return {
    status: 'captured',
    usedJSHeapSize: Number.isFinite(memory.usedJSHeapSize) ? memory.usedJSHeapSize : null,
    totalJSHeapSize: Number.isFinite(memory.totalJSHeapSize) ? memory.totalJSHeapSize : null,
    jsHeapSizeLimit: Number.isFinite(memory.jsHeapSizeLimit) ? memory.jsHeapSizeLimit : null,
  }
}

export function createE2EPerformanceResult({ startedAt, endedAt, intervals, visibilityTransitions, webglContextLostCount, canvas, stageEntryMetric }) {
  return {
    status: 'complete',
    elapsedMs: Math.max(0, endedAt - startedAt),
    ...summarizeFrameIntervals(intervals),
    visibility: { transitions: visibilityTransitions },
    canvas: snapshotCanvas(canvas),
    webglContextLostCount,
    stageEntry: stageEntryMetric
      ? { status: 'received', calls: stageEntryMetric.renderer?.calls ?? null, triangles: stageEntryMetric.renderer?.triangles ?? null, geometries: stageEntryMetric.renderer?.geometries ?? null, textures: stageEntryMetric.renderer?.textures ?? null, compileStatus: stageEntryMetric.compileStatus ?? null }
      : { status: 'not-received', calls: null, triangles: null, geometries: null, textures: null, compileStatus: null },
    performanceMemory: snapshotPerformanceMemory(),
    limitations: ['GPU memory and LUFS are not measured by this probe.'],
  }
}
