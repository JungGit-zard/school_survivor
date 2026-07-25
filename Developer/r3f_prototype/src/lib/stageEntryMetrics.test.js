import { describe, expect, it } from 'vitest'
import { createStageEntryMetric, snapshotRendererInfo, stageEntryMetricNames } from './stageEntryMetrics.js'

describe('stage entry metric contracts', () => {
  it('returns stable performance mark names per reset key', () => {
    expect(stageEntryMetricNames(17)).toEqual({
      start: 'escape-zombie-school:stage-entry:17:start',
      ready: 'escape-zombie-school:stage-entry:17:ready',
    })
  })

  it('snapshots renderer counters without leaking the mutable renderer info object', () => {
    const info = { render: { calls: 8, triangles: 144, points: 3, lines: 2 }, memory: { geometries: 11, textures: 5 } }
    const snapshot = snapshotRendererInfo(info)
    info.render.calls = 99
    expect(snapshot).toEqual({ calls: 8, triangles: 144, points: 3, lines: 2, geometries: 11, textures: 5 })
    expect(Object.isFrozen(snapshot)).toBe(true)
  })

  it('makes a one-shot diagnostic payload without browser storage', () => {
    const metric = createStageEntryMetric({ gameKey: 3, stageId: 'stage1', info: null, compileStatus: 'compiled' })
    expect(metric).toEqual({
      gameKey: 3,
      stageId: 'stage1',
      compileStatus: 'compiled',
      renderer: { calls: 0, triangles: 0, points: 0, lines: 0, geometries: 0, textures: 0 },
    })
  })
})
