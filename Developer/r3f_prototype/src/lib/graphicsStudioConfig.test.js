// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
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
      'enemy-matilda',
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

  it('registers Matilda as a model-only enemy preview without enemy stat coupling', () => {
    expect(getStudioItemById('enemy-matilda')).toMatchObject({
      category: 'enemy',
      label: 'Matilda',
      source: 'components/MatildaMesh.jsx',
      previewKind: 'matilda',
      runtimePreviewComponent: 'MatildaMesh',
      applyTargets: expect.arrayContaining(['components/MatildaMesh.jsx', 'lib/toon.js']),
    })
  })

  it('points weapon entries at shared in-game model previews where models exist', () => {
    expect(getStudioItemById('weapon-pencil')).toMatchObject({
      previewKind: 'weaponModel',
      weaponType: 'pencil',
      source: 'components/Weapons/Pencil.jsx',
    })
    expect(getStudioItemById('weapon-shark-missile')).toMatchObject({
      previewKind: 'weaponModel',
      weaponType: 'sharkMissile',
      source: 'components/Weapons/SharkMissile.jsx',
    })
    expect(getStudioItemById('weapon-extra-battery')).toMatchObject({
      previewKind: 'image',
      weaponType: 'extraBattery',
    })
  })

  it('keeps runtime-parity previews tied to shared runtime sources and apply targets', () => {
    const runtimeParityKinds = new Set(['player', 'zombie', 'floor', 'vfx', 'projectile', 'weaponModel'])
    const expectedSharedSources = {
      player: ['components/PlayerMesh.jsx'],
      zombie: ['components/ZombieMesh.jsx'],
      floor: ['components/Floor.jsx'],
      vfx: ['components/VFXLayer.jsx'],
      projectile: ['components/EnemyProjectileVisual.jsx'],
    }
    const expectedWeaponSources = {
      pencil: 'components/Weapons/Pencil.jsx',
      ruler: 'components/Weapons/SchoolBag.jsx',
      tumbler: 'components/Weapons/Tumbler.jsx',
      scienceFlask: 'components/Weapons/Flask.jsx',
      bell: 'components/Weapons/Bell.jsx',
      stunGun: 'components/Weapons/StunGun.jsx',
      onigiri: 'components/Weapons/Onigiri.jsx',
      starlink: 'components/Weapons/Starlink.jsx',
      compass: 'components/Weapons/CompassBlade.jsx',
      umbrella: 'components/Weapons/UmbrellaGuard.jsx',
      eraser: 'components/Weapons/EraserBomb.jsx',
      boxCutter: 'components/Weapons/BoxCutter.jsx',
      chibiko: 'components/Weapons/Chibiko.jsx',
      sharkMissile: 'components/Weapons/SharkMissile.jsx',
    }
    const expectedRuntimeComponents = {
      player: new Set(['PlayerVisual']),
      zombie: new Set(['EnemyVisual']),
      floor: new Set(['FloorVisual']),
      projectile: new Set(['EnemyProjectileVisual']),
      vfx: new Set(['HitSpark', 'ChargeWarningLine', 'PickupPop']),
      weaponModel: new Set([
        'PencilModel',
        'ThirtyCmRulerModel',
        'TumblerModel',
        'FlaskModel',
        'BellModel',
        'LightningBoltModel',
        'OnigiiriModel',
        'StrikeVisual',
        'CompassBladeModel',
        'UmbrellaModel',
        'EraserModel',
        'BoxCutterModel',
        'ChibikoModel',
        'SharkMissileModel',
      ]),
    }
    const studioOnlyPattern = /GraphicsStudio|StudioPreview|stand-?in|placeholder|approximation|mock/i
    const previewSource = readFileSync(path.join(process.cwd(), 'src/components/GraphicsStudioPreview.jsx'), 'utf8')

    const parityItems = GRAPHICS_STUDIO_CATALOG.filter((item) => runtimeParityKinds.has(item.previewKind))
    expect(parityItems.length).toBeGreaterThan(20)

    parityItems.forEach((item) => {
      const allowedSources = item.previewKind === 'weaponModel'
        ? [expectedWeaponSources[item.weaponType]]
        : expectedSharedSources[item.previewKind]
      const runtimePreviewSource = item.runtimePreviewSource ?? item.source

      expect(allowedSources).toContain(item.source)
      expect(item.runtimePreviewComponent).toEqual(expect.any(String))
      expect(expectedRuntimeComponents[item.previewKind]).toContain(item.runtimePreviewComponent)
      expect(previewSource).toContain(item.runtimePreviewComponent)
      expect(item.applyTargets).toEqual(expect.arrayContaining([item.source]))
      expect(item.applyTargets).toEqual(expect.arrayContaining([runtimePreviewSource]))
      expect(existsSync(path.join(process.cwd(), 'src', runtimePreviewSource))).toBe(true)
      expect([item.source, runtimePreviewSource, item.runtimePreviewComponent, ...item.applyTargets].join('\n'))
        .not.toMatch(studioOnlyPattern)
    })
  })

  it('documents extra battery as the only image-preview weapon exception', () => {
    const imagePreviewItems = GRAPHICS_STUDIO_CATALOG.filter((item) => item.previewKind === 'image')

    expect(imagePreviewItems.map((item) => item.id)).toEqual(['weapon-extra-battery'])
    expect(getStudioItemById('weapon-extra-battery').applyTargets).toEqual(expect.arrayContaining(['lib/upgrades.js']))
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
