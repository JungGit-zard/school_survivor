// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_STUDIO_TUNING,
  GRAPHICS_STUDIO_CATALOG,
  getStudioItemById,
  loadStudioTunings,
  normalizeStudioTuning,
  saveStudioTunings,
  serializeStudioSnapshot,
} from './graphicsStudioConfig.js'

describe('graphicsStudioConfig', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('lists the first real game graphic groups for tuning', () => {
    const ids = GRAPHICS_STUDIO_CATALOG.map((item) => item.id)
    const categories = new Set(GRAPHICS_STUDIO_CATALOG.map((item) => item.category))

    expect(categories).toEqual(new Set(['actor', 'enemy', 'pickup', 'stageObject', 'floor', 'weapon', 'vfx', 'title', 'ui']))
    expect(ids).toEqual(expect.arrayContaining([
      'player',
      'zombie-e01',
      'pickup-gold-coin',
      'pickup-xp-textbook',
      'pickup-lunch-meal',
      'stage-object-desk',
      'stage-floor-stage1',
      'weapon-pencil',
      'vfx-hit-spark',
      'enemy-death-collapse',
      'title-scene',
      'ui-mini-health-bar',
    ]))
  })

  it('keeps source and apply target metadata for every tunable item', () => {
    expect(GRAPHICS_STUDIO_CATALOG.length).toBeGreaterThan(30)
    GRAPHICS_STUDIO_CATALOG.forEach((item) => {
      expect(item.source).toEqual(expect.any(String))
      expect(item.applyTargets).toEqual(expect.arrayContaining([expect.any(String)]))
    })
  })

  it('normalizes user tuning values into a safe visual range', () => {
    const tuning = normalizeStudioTuning({
      scale: 9,
      outlineThickness: -2,
      outlineOpacity: 2,
      outlineColor: 'not-a-color',
      color: '#abc',
      colorStrength: 3,
      saturation: 0,
      brightness: 3,
      emissiveIntensity: -1,
      rotationY: 999,
      animation: 'charge',
    })

    expect(tuning).toMatchObject({
      scale: 2.5,
      outlineThickness: 0.4,
      outlineOpacity: 1,
      outlineColor: DEFAULT_STUDIO_TUNING.outlineColor,
      color: '#aabbcc',
      colorStrength: 1,
      saturation: 0.1,
      brightness: 1.8,
      emissiveIntensity: 0,
      rotationY: 180,
      animation: 'charge',
    })
  })

  it('saves and loads confirmed item tunings by item id', () => {
    saveStudioTunings({
      player: { scale: 1.42, outlineThickness: 1.35 },
      'zombie-e01': { color: '#66dd88', colorStrength: 0.6 },
    })

    const loaded = loadStudioTunings()
    expect(loaded.player.scale).toBe(1.42)
    expect(loaded.player.outlineThickness).toBe(1.35)
    expect(loaded['zombie-e01'].color).toBe('#66dd88')
    expect(loaded['zombie-e01'].colorStrength).toBe(0.6)
  })

  it('serializes the selected item and confirmed tuning for Codex application', () => {
    const item = getStudioItemById('player')
    const snapshot = serializeStudioSnapshot({
      selectedItemId: item.id,
      tunings: {
        player: { scale: 1.25, outlineColor: '#101820' },
      },
    })

    const parsed = JSON.parse(snapshot)
    expect(parsed.tool).toBe('graphics-studio')
    expect(parsed.selectedItem.id).toBe('player')
    expect(parsed.selectedItem.label).toBe(item.label)
    expect(parsed.selectedItem.applyTargets).toEqual(item.applyTargets)
    expect(parsed.tunings.player.scale).toBe(1.25)
    expect(parsed.tunings.player.outlineColor).toBe('#101820')
    expect(typeof parsed.generatedAt).toBe('string')
  })
})
