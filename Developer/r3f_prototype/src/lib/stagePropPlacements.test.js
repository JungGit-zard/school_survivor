// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  STAGE_PROP_PLACEMENTS_STORAGE_KEY,
  STAGE_PROP_PLACEMENTS_EVENT,
  STAGE_PROP_STAGE_IDS,
  STAGE_PROP_TYPES,
  normalizePropPlacement,
  normalizeStagePropList,
  normalizeStagePropPlacements,
  loadStagePropPlacements,
  saveStagePropPlacements,
  getStagePropOverride,
  resetStagePropPlacementsCache,
} from './stagePropPlacements.js'
import { STAGE_OBJECT_TYPES } from '../components/StageObjects/StageObjectLayer.jsx'
import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'
import { TYPE_COLORS } from '../components/StagePropPlacementEditor.jsx'
import { computeDefaultStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'

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

describe('gym prop type coverage + prop preservation (stage3 data-loss regression)', () => {
  const GYM_TYPES = [
    'basketballHoop',
    'basketballBallCart',
    'basketballCluster',
    'gymBench',
    'gymTrainingCones',
    'gymMats',
    'gymScoreboard',
    'gymBanner',
    'gymExitDoor',
    'gymEquipmentSpill',
  ]

  it('accepts every gym prop type through normalize (survives save/load)', () => {
    const storage = createStorage()
    const list = GYM_TYPES.map((type, index) => ({
      id: `gym-${index}`,
      type,
      position: [index, 0, index],
    }))
    saveStagePropPlacements({ stage3: list }, storage)
    const loaded = loadStagePropPlacements(storage)
    expect(loaded.stage3).toHaveLength(GYM_TYPES.length)
    expect(loaded.stage3.map((item) => item.type).sort()).toEqual([...GYM_TYPES].sort())
  })

  it('preserves damaged / knockedOver / count props across normalize + round-trip', () => {
    const storage = createStorage()
    saveStagePropPlacements({
      stage3: [
        { id: 'hoop', type: 'basketballHoop', position: [0, 0, -16], props: { damaged: true } },
        { id: 'bench', type: 'gymBench', position: [-15, 0, -3], props: { knockedOver: true } },
        { id: 'balls', type: 'basketballCluster', position: [12, 0, -12], props: { count: 6 } },
      ],
    }, storage)
    const [hoop, bench, balls] = loadStagePropPlacements(storage).stage3
    expect(hoop.props).toEqual({ damaged: true })
    expect(bench.props).toEqual({ knockedOver: true })
    expect(balls.props).toEqual({ count: 6 })
  })

  it('clamps count into 1..12 integer range and still drops unknown prop keys', () => {
    expect(normalizePropPlacement({ id: 'c1', type: 'basketballCluster', position: [0, 0, 0], props: { count: 99 } }).props).toEqual({ count: 12 })
    expect(normalizePropPlacement({ id: 'c2', type: 'basketballCluster', position: [0, 0, 0], props: { count: 0 } }).props).toEqual({ count: 1 })
    expect(normalizePropPlacement({ id: 'c3', type: 'basketballCluster', position: [0, 0, 0], props: { count: 3.6 } }).props).toEqual({ count: 4 })
    expect(normalizePropPlacement({ id: 'c4', type: 'basketballCluster', position: [0, 0, 0], props: { count: 5, saboteur: 'x' } }).props).toEqual({ count: 5 })
    // 알 수 없는 boolean/string 조합은 화이트리스트만 남긴다.
    expect(normalizePropPlacement({ id: 'c5', type: 'gymBench', position: [0, 0, 0], props: { knockedOver: 'yes' } }).props).toBeUndefined()
  })
})

describe('STAGE_PROP_TYPES stays in sync with the render pipeline', () => {
  it('covers every type StageObjectLayer can render (superset guard)', () => {
    const declared = new Set(STAGE_PROP_TYPES)
    const missing = STAGE_OBJECT_TYPES.filter((type) => !declared.has(type))
    expect(missing).toEqual([])
  })

  it('does not declare placeable types the render pipeline cannot draw', () => {
    const renderable = new Set(STAGE_OBJECT_TYPES)
    const orphan = STAGE_PROP_TYPES.filter((type) => !renderable.has(type))
    expect(orphan).toEqual([])
  })

  it('palette and TYPE_COLORS cover every declared prop type', () => {
    const paletteTypes = new Set(STAGE_PROP_PALETTE.map((entry) => entry.type))
    for (const type of STAGE_PROP_TYPES) {
      expect(paletteTypes.has(type)).toBe(true)
      expect(typeof TYPE_COLORS[type]).toBe('string')
    }
  })
})

describe('stage3 authored layout survives the editor normalization path', () => {
  it('keeps all 12 authored placements (no silent drop to []) and preserves their gym state', () => {
    const authored = computeDefaultStageObjectPlacements('stage3')
    expect(authored).toHaveLength(12)

    const storage = createStorage()
    saveStagePropPlacements({ stage3: authored }, storage)
    const loaded = loadStagePropPlacements(storage).stage3
    expect(loaded).toHaveLength(12)

    const byId = Object.fromEntries(loaded.map((item) => [item.id, item]))
    expect(byId['stage3-hoop-south-damaged'].props).toMatchObject({ damaged: true })
    expect(byId['stage3-bench-east-knocked'].props).toMatchObject({ knockedOver: true })
    expect(byId['stage3-balls-ne-scattered'].props).toMatchObject({ count: 6 })
  })

  it('preserves blocking:false pass-through flags through normalize/save/load', () => {
    const authored = computeDefaultStageObjectPlacements('stage3')
    const passThroughIds = authored.filter((item) => item.blocking === false).map((item) => item.id)
    expect(passThroughIds).toEqual(expect.arrayContaining([
      'stage3-balls-ne-scattered',
      'stage3-cones-mid-left-zigzag',
      'stage3-banner-south-wall',
      'stage3-equipment-spill-sw',
    ]))

    const storage = createStorage()
    saveStagePropPlacements({ stage3: authored }, storage)
    const loaded = loadStagePropPlacements(storage).stage3
    const byId = Object.fromEntries(loaded.map((item) => [item.id, item]))
    for (const id of passThroughIds) {
      expect(byId[id].blocking).toBe(false)
    }
    // blocking 미지정 프랍은 키 자체가 없어야 한다(기본 충돌체 유지).
    expect('blocking' in byId['stage3-hoop-north-normal']).toBe(false)
  })
})
