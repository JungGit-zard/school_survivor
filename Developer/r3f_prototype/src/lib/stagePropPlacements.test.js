// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  STAGE_PROP_PLACEMENTS_STORAGE_KEY,
  STAGE_PROP_PLACEMENTS_EVENT,
  STAGE_PROP_STAGE_IDS,
  normalizePropPlacement,
  normalizeStagePropList,
  normalizeStagePropPlacements,
  loadStagePropPlacements,
  saveStagePropPlacements,
  getStagePropOverride,
  resetStagePropPlacementsCache,
} from './stagePropPlacements.js'

function createStorage() {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  }
}

beforeEach(() => {
  resetStagePropPlacementsCache()
  window.localStorage.clear()
})

describe('normalizePropPlacement', () => {
  it('accepts a valid placement and normalizes rotation/scale shape', () => {
    const result = normalizePropPlacement({
      id: 'a',
      type: 'classroomDesk',
      position: [1.234567, 0, -2.5],
      rotation: 0.5,
      scale: 0.8,
      props: { variant: 'tilted' },
    })
    expect(result).toEqual({
      id: 'a',
      type: 'classroomDesk',
      position: [1.235, 0, -2.5],
      rotation: [0, 0.5, 0],
      scale: 0.8,
      props: { variant: 'tilted' },
    })
  })

  it('rejects unknown prop types', () => {
    expect(normalizePropPlacement({ id: 'x', type: 'spaceship', position: [0, 0, 0] })).toBeNull()
  })

  it('rejects NaN / Infinity positions', () => {
    expect(normalizePropPlacement({ id: 'x', type: 'classroomDesk', position: [NaN, 0, 1] })).toBeNull()
    expect(normalizePropPlacement({ id: 'x', type: 'classroomDesk', position: [Infinity, 0, 1] })).toBeNull()
  })

  it('clamps absurd coordinates to the defensive world limit', () => {
    const result = normalizePropPlacement({ id: 'x', type: 'classroomDesk', position: [9999, 0, -9999] })
    expect(result.position[0]).toBe(120)
    expect(result.position[2]).toBe(-120)
  })

  it('clamps scale into range and drops invalid variant props', () => {
    const big = normalizePropPlacement({ id: 'x', type: 'classroomChair', position: [0, 0, 0], scale: 99 })
    expect(big.scale).toBe(4)
    const noVariant = normalizePropPlacement({ id: 'y', type: 'classroomChair', position: [0, 0, 0], props: { variant: 5 } })
    expect(noVariant.props).toBeUndefined()
  })

  it('generates an id when missing', () => {
    const result = normalizePropPlacement({ type: 'classroomDesk', position: [0, 0, 0] })
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
  })
})

describe('normalizeStagePropList / normalizeStagePropPlacements', () => {
  it('filters out invalid items and keeps valid ones', () => {
    const list = normalizeStagePropList([
      { id: 'ok', type: 'classroomDesk', position: [0, 0, 0] },
      { id: 'bad', type: 'nope', position: [0, 0, 0] },
      null,
    ])
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('ok')
  })

  it('returns null per-stage when not an array (means: use default placement)', () => {
    const config = normalizeStagePropPlacements({ stage1: 'not-an-array' })
    for (const stageId of STAGE_PROP_STAGE_IDS) {
      expect(config[stageId]).toBeNull()
    }
  })

  it('always includes all known stage keys', () => {
    const config = normalizeStagePropPlacements({})
    expect(Object.keys(config).sort()).toEqual([...STAGE_PROP_STAGE_IDS].sort())
  })
})

describe('load / save round-trip + event dispatch', () => {
  it('ignores the legacy dense corridor snapshot so the two-desk Stage 2 layout takes over', () => {
    window.localStorage.setItem('escape-zombie-school.stagePropPlacements.v3', JSON.stringify({
      stage2: [{ id: 'legacy-row-desk', type: 'classroomDesk', position: [-6, 0, 0] }],
    }))

    expect(STAGE_PROP_PLACEMENTS_STORAGE_KEY).toContain('.v5')
    expect(loadStagePropPlacements().stage2).toBeNull()
  })

  it('migrates legacy Stage 2 board overrides from their side-on angle to 45 degrees', () => {
    window.localStorage.setItem('escape-zombie-school.stagePropPlacements.v4', JSON.stringify({
      stage2: [{ id: 'legacy-board', type: 'corridorLostFoundBoard', position: [0, 0, 0], rotation: [0, Math.PI / 2 + 0.08, 0] }],
    }))

    const loaded = loadStagePropPlacements()
    expect(loaded.stage2[0].rotation[1]).toBeCloseTo(Math.PI / 4 + 0.08, 3)
    expect(window.localStorage.getItem(STAGE_PROP_PLACEMENTS_STORAGE_KEY)).not.toBeNull()
  })

  it('persists to storage and reloads equivalently', () => {
    const storage = createStorage()
    const saved = saveStagePropPlacements({
      stage1: [{ id: 'a', type: 'classroomDesk', position: [1, 0, 2], scale: 0.8 }],
    }, storage)
    const loaded = loadStagePropPlacements(storage)
    expect(loaded.stage1).toEqual(saved.stage1)
    expect(loaded.stage2).toBeNull()
  })

  it('dispatches the change event when saving to the default (window) storage', () => {
    const listener = vi.fn()
    window.addEventListener(STAGE_PROP_PLACEMENTS_EVENT, listener)
    saveStagePropPlacements({ stage2: [{ id: 'b', type: 'corridorLockerBank', position: [0, 0, 0] }] })
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(STAGE_PROP_PLACEMENTS_EVENT, listener)
  })

  it('getStagePropOverride returns the array for overridden stages, null otherwise', () => {
    const storage = createStorage()
    saveStagePropPlacements({ stage3: [{ id: 'c', type: 'classroomChair', position: [0, 0, 0] }] }, storage)
    expect(getStagePropOverride('stage3', storage)).toHaveLength(1)
    expect(getStagePropOverride('stage1', storage)).toBeNull()
  })
})
