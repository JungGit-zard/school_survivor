import { describe, expect, it } from 'vitest'
import {
  createE2EPerformanceResult,
  getE2EPerformanceDurationSeconds,
  percentile,
  summarizeFrameIntervals,
} from './e2eRuntimePerformance.js'

describe('E2E runtime performance helpers', () => {
  it('uses 60 seconds for absent or invalid duration and clamps valid numeric input', () => {
    expect(getE2EPerformanceDurationSeconds('')).toBe(60)
    expect(getE2EPerformanceDurationSeconds('?e2eperfseconds=invalid')).toBe(60)
    expect(getE2EPerformanceDurationSeconds('?e2eperfseconds=2')).toBe(5)
    expect(getE2EPerformanceDurationSeconds('?e2eperfseconds=720')).toBe(600)
    expect(getE2EPerformanceDurationSeconds('?e2eperfseconds=12.5')).toBe(12.5)
  })

  it('uses nearest-rank percentiles and exact long-frame thresholds', () => {
    expect(percentile([30, 10, 20, 40], 50)).toBe(20)
    expect(percentile([], 95)).toBeNull()
    expect(summarizeFrameIntervals([16, 33.34, 33.35, 50, 50.01])).toMatchObject({
      sampleCount: 5,
      p50: 33.35,
      p95: 50.01,
      p99: 50.01,
      max: 50.01,
      longFrames: {
        over33_34ms: { count: 3, ratio: 0.6 },
        over50ms: { count: 1, ratio: 0.2 },
      },
    })
  })

  it('reports only measured browser values and explicit unsupported memory', () => {
    const result = createE2EPerformanceResult({
      startedAt: 10,
      endedAt: 1010,
      intervals: [16, 17],
      visibilityTransitions: [{ atMs: 100, state: 'hidden' }],
      webglContextLostCount: 1,
      canvas: null,
      stageEntryMetric: { compileStatus: 'compiled', renderer: { calls: 3, triangles: 12, geometries: 2, textures: 4 } },
    })
    expect(result).toMatchObject({
      status: 'complete',
      elapsedMs: 1000,
      webglContextLostCount: 1,
      canvas: { status: 'not-found' },
      stageEntry: { status: 'received', calls: 3, triangles: 12, geometries: 2, textures: 4, compileStatus: 'compiled' },
      limitations: ['GPU memory and LUFS are not measured by this probe.'],
    })
    expect(['captured', 'unsupported']).toContain(result.performanceMemory.status)
  })
})
