// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_STAGE_BOSS_PREVIEW,
  DEFAULT_STUDIO_TUNING,
  GRAPHICS_STUDIO_CATALOG,
  GRAPHICS_STUDIO_TUNING_EVENT,
  STAGE_BOSS_PREVIEW_EVENT,
  TEXTURE_DECALS_EVENT,
  getStudioItemById,
  getStudioZombieItemId,
  loadStageBossPreview,
  loadStudioTunings,
  loadTextureDecals,
  normalizeStageBossPreview,
  normalizeStudioTuning,
  normalizeTextureDecal,
  saveStageBossPreview,
  saveStudioTunings,
  saveTextureDecals,
  serializeStudioSnapshot,
} from './graphicsStudioConfig.js'
import {
  blockFirebaseStudioRuntime,
  commitFirebaseStudioRuntime,
} from './studioRuntimeState.js'

function readyRuntime(overrides = {}) {
  commitFirebaseStudioRuntime({
    tunings: {},
    sfxTunings: {},
    stageBossPreview: {},
    decals: {},
    propPlacements: {},
    ...overrides,
  }, { revision: 1 })
}

describe('Firebase runtime Graphics Studio config', () => {
  beforeEach(() => {
    readyRuntime()
  })

  it('fails closed before Firebase hydrate for every authored visual dataset', () => {
    blockFirebaseStudioRuntime()
    expect(() => loadStudioTunings()).toThrowError(/hydrate is required/i)
    expect(() => loadStageBossPreview()).toThrowError(/hydrate is required/i)
    expect(() => loadTextureDecals()).toThrowError(/hydrate is required/i)
  })

  it('lists the real game graphic groups and stable zombie IDs', () => {
    const ids = GRAPHICS_STUDIO_CATALOG.map((item) => item.id)
    const categories = new Set(GRAPHICS_STUDIO_CATALOG.map((item) => item.category))
    expect(categories).toEqual(new Set(['actor', 'enemy', 'pickup', 'stageObject', 'floor', 'weapon', 'vfx', 'title', 'ui']))
    expect(ids).toEqual(expect.arrayContaining([
      'player',
      'actor-doge',
      'zombie-e01',
      'stage2-boss-v2',
      'zombie-b03-pe-teacher',
      'zombie-b04-chef',
      'stage-lock',
    ]))
    expect(getStudioZombieItemId('E01')).toBe('zombie-e01')
    expect(getStudioZombieItemId('B03')).toBe('zombie-b03-pe-teacher')
    expect(getStudioItemById('player').previewKind).toBe('player')
  })

  it('normalizes tuning numbers, colors, and animation safely', () => {
    expect(normalizeStudioTuning({
      scale: 99,
      positionX: -99,
      outlineOpacity: 2,
      color: '#ABC',
      rotationY: 12.6,
      animation: 'charge',
    })).toMatchObject({
      scale: 2.5,
      positionX: -3,
      outlineOpacity: 1,
      color: '#aabbcc',
      rotationY: 13,
      animation: 'charge',
    })
    expect(normalizeStudioTuning({ animation: 'unknown' }).animation).toBe(DEFAULT_STUDIO_TUNING.animation)
  })

  it('patches tuning entries in memory without dropping other Firebase entries', () => {
    readyRuntime({
      tunings: {
        player: { scale: 1.2 },
        'zombie-e01': { color: '#66dd88' },
      },
    })
    saveStudioTunings({ player: { positionY: 0.25 } })
    expect(loadStudioTunings().player).toMatchObject({ scale: 1.2, positionY: 0.25 })
    expect(loadStudioTunings()['zombie-e01'].color).toBe('#66dd88')
  })

  it('normalizes and replaces stage boss preview in memory', () => {
    expect(normalizeStageBossPreview({ zoom: 999, panX: -9, panY: 9 })).toEqual({
      zoom: 180,
      panX: -2,
      panY: 0.5,
    })
    expect(loadStageBossPreview()).toEqual(DEFAULT_STAGE_BOSS_PREVIEW)
    saveStageBossPreview({ zoom: 133, panX: 0.35, panY: -0.25 })
    expect(loadStageBossPreview()).toEqual({ zoom: 133, panX: 0.35, panY: -0.25 })
  })

  it('normalizes texture decals and drops invalid layers', () => {
    const valid = normalizeTextureDecal({
      partId: 'sample-head',
      faceAxis: '+z',
      imageDataUrl: 'data:image/png;base64,AAAA',
      offset: [9, -9],
      scale: [0, 9],
      rotation: 181,
    })
    expect(valid).toMatchObject({
      partId: 'sample-head',
      faceAxis: '+z',
      offset: [3, -3],
      scale: [0.05, 4],
      rotation: 180,
    })
    expect(normalizeTextureDecal({ partId: '', imageDataUrl: '' })).toBeNull()

    saveTextureDecals({
      player: [valid, { partId: '', imageDataUrl: '' }],
    })
    expect(loadTextureDecals().player).toEqual([valid])
  })

  it('dispatches runtime change events for each authored visual dataset', () => {
    const tuning = vi.fn()
    const boss = vi.fn()
    const decals = vi.fn()
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, tuning, { once: true })
    window.addEventListener(STAGE_BOSS_PREVIEW_EVENT, boss, { once: true })
    window.addEventListener(TEXTURE_DECALS_EVENT, decals, { once: true })

    saveStudioTunings({ player: { scale: 1.1 } })
    saveStageBossPreview({ zoom: 120 })
    saveTextureDecals({})

    expect(tuning).toHaveBeenCalledOnce()
    expect(boss).toHaveBeenCalledOnce()
    expect(decals).toHaveBeenCalledOnce()
  })

  it('rejects any alternate persistence adapter without reading it', () => {
    const adapter = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() }
    expect(() => loadStudioTunings(adapter)).toThrow(/storage adapters are forbidden/i)
    expect(() => saveStudioTunings({}, adapter)).toThrow(/storage adapters are forbidden/i)
    expect(() => loadStageBossPreview(adapter)).toThrow(/storage adapters are forbidden/i)
    expect(() => saveTextureDecals({}, adapter)).toThrow(/storage adapters are forbidden/i)
    expect(adapter.getItem).not.toHaveBeenCalled()
    expect(adapter.setItem).not.toHaveBeenCalled()
  })

  it('serializes the current Firebase runtime snapshot for export', () => {
    saveStudioTunings({ player: { scale: 1.25 } })
    saveStageBossPreview({ zoom: 140, panX: 0.2, panY: -0.1 })
    const snapshot = JSON.parse(serializeStudioSnapshot({ selectedItemId: 'player' }))
    expect(snapshot.tool).toBe('graphics-studio')
    expect(snapshot.selectedItem.id).toBe('player')
    expect(snapshot.tunings.player.scale).toBe(1.25)
    expect(snapshot.stageBossPreview).toEqual({ zoom: 140, panX: 0.2, panY: -0.1 })
  })
})
