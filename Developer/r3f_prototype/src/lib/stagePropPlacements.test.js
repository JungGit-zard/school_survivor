// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  STAGE_PROP_PLACEMENTS_EVENT,
  getStagePropOverride,
  loadStagePropPlacements,
  normalizePropPlacement,
  normalizeStagePropPlacements,
  saveStagePropPlacements,
  subscribeStagePropPlacements,
} from './stagePropPlacements.js'
import {
  blockFirebaseStudioRuntime,
  commitFirebaseStudioRuntime,
} from './studioRuntimeState.js'

function readyRuntime(propPlacements = {}) {
  commitFirebaseStudioRuntime({
    tunings: {},
    sfxTunings: {},
    stageBossPreview: {},
    decals: {},
    propPlacements,
  }, { revision: 1 })
}

describe('Firebase runtime stage prop placements', () => {
  beforeEach(() => {
    readyRuntime()
  })

  it('fails closed before Firebase hydrate', () => {
    blockFirebaseStudioRuntime()
    expect(() => loadStagePropPlacements()).toThrowError(/hydrate is required/i)
  })

  it('normalizes every stage to an authored list or null', () => {
    expect(normalizeStagePropPlacements({ stage1: [] })).toEqual({
      stage1: [],
      stage2: null,
      stage3: null,
    })
  })

  it('normalizes finite coordinates, yaw, scale, blocking, and supported props', () => {
    expect(normalizePropPlacement({
      id: 'bench-1',
      type: 'gymBench',
      position: [1.23456, 99, -2.34567],
      rotation: [1, 0.123456, 2],
      scale: 9,
      blocking: false,
      props: { variant: 'blue', damaged: true, count: 99, ignored: true },
    })).toEqual({
      id: 'bench-1',
      type: 'gymBench',
      position: [1.235, 0, -2.346],
      rotation: [0, 0.1235, 0],
      scale: 4,
      blocking: false,
      props: { variant: 'blue', damaged: true, count: 12 },
    })
  })

  it('rejects unknown prop types and invalid coordinates', () => {
    expect(normalizePropPlacement({ type: 'unknown', position: [0, 0, 0] })).toBeNull()
    expect(normalizePropPlacement({ type: 'classroomDesk', position: [Number.NaN, 0, 0] })).toBeNull()
  })

  it('saves and loads only through Firebase-backed module memory', () => {
    const saved = saveStagePropPlacements({
      stage1: [{
        id: 'desk-1',
        type: 'classroomDesk',
        position: [1, 0, 2],
        rotation: [0, 0.5, 0],
        scale: 1,
      }],
    })

    expect(loadStagePropPlacements()).toEqual(saved)
    expect(getStagePropOverride('stage1')).toHaveLength(1)
    expect(getStagePropOverride('stage2')).toBeNull()
  })

  it('rejects alternate storage adapters', () => {
    const adapter = { getItem: vi.fn(), setItem: vi.fn() }
    expect(() => loadStagePropPlacements(adapter)).toThrow(/storage adapters are forbidden/i)
    expect(() => saveStagePropPlacements({}, adapter)).toThrow(/storage adapters are forbidden/i)
    expect(adapter.getItem).not.toHaveBeenCalled()
    expect(adapter.setItem).not.toHaveBeenCalled()
  })

  it('dispatches and subscribes to the in-memory change event', () => {
    const callback = vi.fn()
    const unsubscribe = subscribeStagePropPlacements(callback)
    saveStagePropPlacements({ stage3: [] })
    expect(callback).toHaveBeenCalledOnce()
    unsubscribe()
    window.dispatchEvent(new CustomEvent(STAGE_PROP_PLACEMENTS_EVENT))
    expect(callback).toHaveBeenCalledOnce()
  })

  it('preserves all supported gym prop fields through a round trip', () => {
    saveStagePropPlacements({
      stage3: [
        {
          id: 'hoop',
          type: 'basketballHoop',
          position: [2, 0, -3],
          rotation: [0, 1.2, 0],
          scale: 1.2,
          blocking: true,
        },
        {
          id: 'balls',
          type: 'basketballCluster',
          position: [-1, 0, 4],
          rotation: [0, 0, 0],
          scale: 0.8,
          blocking: false,
          props: { count: 5, knockedOver: true },
        },
      ],
    })

    expect(loadStagePropPlacements().stage3).toEqual([
      {
        id: 'hoop',
        type: 'basketballHoop',
        position: [2, 0, -3],
        rotation: [0, 1.2, 0],
        scale: 1.2,
        blocking: true,
      },
      {
        id: 'balls',
        type: 'basketballCluster',
        position: [-1, 0, 4],
        rotation: [0, 0, 0],
        scale: 0.8,
        blocking: false,
        props: { count: 5, knockedOver: true },
      },
    ])
  })
})
