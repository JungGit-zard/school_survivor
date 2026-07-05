import stage1FloorUrl from '../assets/background_floor/tile_stage01.png.png'
import stage2FloorUrl from '../assets/background_floor/tile_stage02_corridor.png'
import stage2EndWallUrl from '../assets/background_floor/stage02_corridor_end_wall.png'
import pencilIconUrl from '../assets/weapon_icon/01_wea_pencil.png.png'
import rulerIconUrl from '../assets/weapon_icon/02_wea_30ruller.png.png'
import tumblerIconUrl from '../assets/weapon_icon/03_wea_tumbler.png.png'
import scienceIconUrl from '../assets/weapon_icon/04_wea_science.png.png'
import bellIconUrl from '../assets/weapon_icon/05_wea_bell.png.png'
import stunGunIconUrl from '../assets/weapon_icon/06_wea_stungun.png.png'
import onigiriIconUrl from '../assets/weapon_icon/07_wea_onigiri.png.png'
import batteryIconUrl from '../assets/weapon_icon/08_wea_extrabattery.png.png'
import starlinkIconUrl from '../assets/weapon_icon/09_wea_starlink.png.png'
import compassIconUrl from '../assets/weapon_icon/10_wea_compass.png.png'
import umbrellaIconUrl from '../assets/weapon_icon/11_wea_umb.png.png'
import eraserIconUrl from '../assets/weapon_icon/12_wea_eraser.png.png'
import boxCutterIconUrl from '../assets/weapon_icon/13_wea_boxcutter.svg'
import chibikoIconUrl from '../assets/weapon_icon/14_wea_chibiko.svg'
import sharkMissileIconUrl from '../assets/weapon_icon/14_wea_shark_missile.svg'
import { ENEMY_DEATH_COLLAPSE_STYLES } from './enemyDeathCollapse.js'

export const GRAPHICS_STUDIO_STORAGE_KEY = 'escape-zombie-school.graphicsStudioTunings.v1'
export const GRAPHICS_STUDIO_RESET_BASELINE_KEY = 'escape-zombie-school.graphicsStudioResetBaseline.2026-07-05T17'
export const GRAPHICS_STUDIO_TUNING_EVENT = 'escape-zombie-school.graphicsStudioTunings.changed'
export const STAGE_BOSS_PREVIEW_STORAGE_KEY = 'escape-zombie-school.stageBossPreview.v1'
export const STAGE_BOSS_PREVIEW_EVENT = 'escape-zombie-school.stageBossPreview.changed'

export const DEFAULT_STUDIO_TUNING = Object.freeze({
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  outlineThickness: 1,
  outlineOpacity: 0.96,
  outlineColor: '#050209',
  color: '#ffffff',
  colorStrength: 0,
  saturation: 1,
  brightness: 1,
  emissiveIntensity: 0.14,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  animation: 'normal',
})

export const DEFAULT_STAGE_BOSS_PREVIEW = Object.freeze({
  zoom: 100,
  panX: 0,
  panY: 0,
})
export const STAGE_BOSS_PREVIEW_PAN_Y_RANGE = Object.freeze([-0.8, 0.5])

export const GRAPHICS_STUDIO_CATEGORIES = Object.freeze([
  { id: 'actor', label: 'Actor' },
  { id: 'enemy', label: 'Enemy' },
  { id: 'pickup', label: 'Pickup' },
  { id: 'stageObject', label: 'Stage Object' },
  { id: 'floor', label: 'Floor' },
  { id: 'weapon', label: 'Weapon Model' },
  { id: 'vfx', label: 'VFX' },
  { id: 'title', label: 'Title Scene' },
  { id: 'ui', label: 'UI Overlay' },
])

const weaponVisuals = [
  ['weapon-pencil', 'Pencil', 'pencil', pencilIconUrl, 'components/Weapons/Pencil.jsx', 'weaponModel', 'PencilModel'],
  ['weapon-ruler', '30cm Ruler', 'ruler', rulerIconUrl, 'components/Weapons/SchoolBag.jsx', 'weaponModel', 'ThirtyCmRulerModel'],
  ['weapon-tumbler', 'Tumbler', 'tumbler', tumblerIconUrl, 'components/Weapons/Tumbler.jsx', 'weaponModel', 'TumblerModel'],
  ['weapon-science-flask', 'Science Flask', 'scienceFlask', scienceIconUrl, 'components/Weapons/Flask.jsx', 'weaponModel', 'FlaskModel'],
  ['weapon-bell', 'Bell', 'bell', bellIconUrl, 'components/Weapons/Bell.jsx', 'weaponModel', 'BellModel'],
  ['weapon-stun-gun', 'Stun Gun', 'stunGun', stunGunIconUrl, 'components/Weapons/StunGun.jsx', 'weaponModel', 'LightningBoltModel'],
  ['weapon-onigiri', 'Onigiri', 'onigiri', onigiriIconUrl, 'components/Weapons/Onigiri.jsx', 'weaponModel', 'OnigiiriModel'],
  ['weapon-extra-battery', 'Extra Battery Upgrade Icon', 'extraBattery', batteryIconUrl, 'lib/upgrades.js', 'image'],
  ['weapon-starlink', 'Starlink', 'starlink', starlinkIconUrl, 'components/Weapons/Starlink.jsx', 'weaponModel', 'StrikeVisual'],
  ['weapon-compass', 'Compass', 'compass', compassIconUrl, 'components/Weapons/CompassBlade.jsx', 'weaponModel', 'CompassBladeModel'],
  ['weapon-umbrella', 'Umbrella', 'umbrella', umbrellaIconUrl, 'components/Weapons/UmbrellaGuard.jsx', 'weaponModel', 'UmbrellaModel'],
  ['weapon-eraser', 'Eraser', 'eraser', eraserIconUrl, 'components/Weapons/EraserBomb.jsx', 'weaponModel', 'EraserModel'],
  ['weapon-box-cutter', 'Box Cutter', 'boxCutter', boxCutterIconUrl, 'components/Weapons/BoxCutter.jsx', 'weaponModel', 'BoxCutterModel'],
  ['weapon-chibiko', 'Chibiko', 'chibiko', chibikoIconUrl, 'components/Weapons/Chibiko.jsx', 'weaponModel', 'ChibikoModel'],
  ['weapon-shark-missile', 'Shark Missile', 'sharkMissile', sharkMissileIconUrl, 'components/Weapons/SharkMissile.jsx', 'weaponModel', 'SharkMissileModel'],
]

export const GRAPHICS_STUDIO_CATALOG = Object.freeze([
  {
    id: 'player',
    category: 'actor',
    label: 'Player',
    source: 'components/PlayerMesh.jsx',
    previewKind: 'player',
    runtimePreviewSource: 'components/Player.jsx',
    runtimePreviewComponent: 'PlayerVisual',
    applyTargets: ['components/PlayerMesh.jsx', 'components/Player.jsx', 'lib/characterVisualScale.js', 'lib/toon.js'],
  },
  ...['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'B01', 'B02'].map((type) => ({
    id: `zombie-${type.toLowerCase()}`,
    category: 'enemy',
    label: `Zombie ${type}`,
    source: 'components/ZombieMesh.jsx',
    previewKind: 'zombie',
    runtimePreviewSource: 'components/Enemy.jsx',
    runtimePreviewComponent: 'EnemyVisual',
    zombieType: type,
    applyTargets: ['components/ZombieMesh.jsx', 'components/Enemy.jsx', 'lib/toon.js'],
  })),
  {
    id: 'enemy-matilda',
    category: 'enemy',
    label: 'Matilda',
    source: 'components/MatildaMesh.jsx',
    previewKind: 'matilda',
    runtimePreviewComponent: 'MatildaMesh',
    applyTargets: ['components/MatildaMesh.jsx', 'lib/toon.js'],
  },
  {
    id: 'pickup-gold-coin',
    category: 'pickup',
    label: 'Gold Coin',
    source: 'components/GoldCoin.jsx',
    previewKind: 'pickup',
    pickupType: 'goldCoin',
    applyTargets: ['components/GoldCoin.jsx', 'lib/pickup.js', 'lib/toon.js'],
  },
  {
    id: 'pickup-xp-textbook',
    category: 'pickup',
    label: 'XP Textbook',
    source: 'components/XpTextbook.jsx',
    previewKind: 'pickup',
    pickupType: 'xpTextbook',
    applyTargets: ['components/XpTextbook.jsx', 'lib/pickup.js', 'lib/toon.js'],
  },
  {
    id: 'pickup-xp-orb',
    category: 'pickup',
    label: 'XP Orb',
    source: 'components/XpOrb.jsx',
    previewKind: 'pickup',
    pickupType: 'xpOrb',
    applyTargets: ['components/XpOrb.jsx'],
  },
  {
    id: 'pickup-lunch-meal',
    category: 'pickup',
    label: 'Lunch Meal',
    source: 'components/LunchItems.jsx',
    previewKind: 'pickup',
    pickupType: 'lunchMeal',
    applyTargets: ['components/LunchItems.jsx', 'lib/toon.js'],
  },
  {
    id: 'pickup-lunch-milk',
    category: 'pickup',
    label: 'Lunch Milk',
    source: 'components/LunchItems.jsx',
    previewKind: 'pickup',
    pickupType: 'lunchMilk',
    applyTargets: ['components/LunchItems.jsx', 'lib/toon.js'],
  },
  {
    id: 'stage-object-desk',
    category: 'stageObject',
    label: 'Classroom Desk',
    source: 'components/StageObjects/ClassroomDesk.jsx',
    previewKind: 'stageObject',
    objectType: 'desk',
    variant: 'tilted',
    applyTargets: ['components/StageObjects/ClassroomDesk.jsx', 'components/StageObjects/propRendering.js', 'lib/toon.js'],
  },
  {
    id: 'stage-object-chair',
    category: 'stageObject',
    label: 'Classroom Chair',
    source: 'components/StageObjects/ClassroomChair.jsx',
    previewKind: 'stageObject',
    objectType: 'chair',
    variant: 'abandoned',
    applyTargets: ['components/StageObjects/ClassroomChair.jsx', 'components/StageObjects/propRendering.js', 'lib/toon.js'],
  },
  {
    id: 'stage-object-unconscious-student',
    category: 'stageObject',
    label: 'Unconscious Student',
    source: 'components/StageObjects/UnconsciousStudent.jsx',
    previewKind: 'stageObject',
    objectType: 'student',
    variant: 'sideLeft',
    applyTargets: ['components/StageObjects/UnconsciousStudent.jsx', 'components/StageObjects/propRendering.js', 'lib/toon.js'],
  },
  {
    id: 'stage-floor-stage1',
    category: 'floor',
    label: 'Stage 1 Floor',
    source: 'components/Floor.jsx',
    previewKind: 'floor',
    runtimePreviewComponent: 'FloorVisual',
    stageId: 'stage1',
    assetUrl: stage1FloorUrl,
    applyTargets: ['components/Floor.jsx', 'components/ClassroomFloor.jsx', 'assets/background_floor/tile_stage01.png.png'],
  },
  {
    id: 'stage-floor-stage2',
    category: 'floor',
    label: 'Stage 2 Corridor Floor',
    source: 'components/Floor.jsx',
    previewKind: 'floor',
    runtimePreviewComponent: 'FloorVisual',
    stageId: 'stage2',
    assetUrl: stage2FloorUrl,
    companionAssetUrl: stage2EndWallUrl,
    applyTargets: [
      'components/Floor.jsx',
      'components/ClassroomFloor.jsx',
      'lib/stage2CorridorWall.js',
      'assets/background_floor/tile_stage02_corridor.png',
      'assets/background_floor/stage02_corridor_end_wall.png',
    ],
  },
  {
    id: 'weapon-starlink-satellite',
    category: 'weapon',
    label: 'Starlink Satellite Model',
    source: 'components/Weapons/StarlinkSatellite.jsx',
    previewKind: 'starlinkSatellite',
    assetUrl: starlinkIconUrl,
    applyTargets: ['components/Weapons/StarlinkSatellite.jsx', 'lib/starlinkCrash.js', 'lib/toon.js'],
  },
  {
    id: 'weapon-starlink-crash-fall',
    category: 'weapon',
    label: 'Starlink Crash 01 - Falling',
    source: 'components/Weapons/StarlinkSatellite.jsx',
    previewKind: 'starlinkCrash',
    crashPhase: 'falling',
    assetUrl: starlinkIconUrl,
    applyTargets: ['components/Weapons/StarlinkSatellite.jsx', 'lib/starlinkCrash.js', 'lib/toon.js'],
  },
  {
    id: 'weapon-starlink-crash-impact',
    category: 'weapon',
    label: 'Starlink Crash 02 - Impact',
    source: 'components/Weapons/StarlinkSatellite.jsx',
    previewKind: 'starlinkCrash',
    crashPhase: 'impact',
    assetUrl: starlinkIconUrl,
    applyTargets: ['components/Weapons/StarlinkSatellite.jsx', 'lib/starlinkCrash.js', 'lib/toon.js'],
  },
  {
    id: 'actor-zomlonbisk',
    category: 'actor',
    label: 'Zomlonbisk',
    source: 'components/Weapons/StarlinkSatellite.jsx',
    previewKind: 'zomlonbisk',
    applyTargets: ['components/Weapons/StarlinkSatellite.jsx', 'lib/starlinkCrash.js', 'lib/toon.js'],
  },
  ...weaponVisuals.map(([id, label, weaponType, assetUrl, implementationTarget, previewKind = 'weaponModel', runtimePreviewComponent]) => ({
    id,
    category: 'weapon',
    label,
    source: previewKind === 'image'
      ? `assets/weapon_icon/${assetUrl.split('/').at(-1)}`
      : implementationTarget,
    previewKind,
    weaponType,
    ...(runtimePreviewComponent ? { runtimePreviewComponent } : {}),
    assetUrl,
    applyTargets: [`assets/weapon_icon/${assetUrl.split('/').at(-1)}`, implementationTarget],
  })),
  {
    id: 'vfx-hit-spark',
    category: 'vfx',
    label: 'Hit Spark',
    source: 'components/VFXLayer.jsx',
    previewKind: 'vfx',
    runtimePreviewComponent: 'HitSpark',
    vfxType: 'hitSpark',
    applyTargets: ['components/VFXLayer.jsx', 'lib/vfxPalette.js', 'lib/enemyHitVfx.js'],
  },
  {
    id: 'vfx-charge-warning',
    category: 'vfx',
    label: 'Charge Warning',
    source: 'components/VFXLayer.jsx',
    previewKind: 'vfx',
    runtimePreviewComponent: 'ChargeWarningLine',
    vfxType: 'chargeWarning',
    applyTargets: ['components/VFXLayer.jsx', 'lib/vfxPalette.js', 'lib/vfxGeometry.js'],
  },
  {
    id: 'vfx-pickup-pop',
    category: 'vfx',
    label: 'Pickup Pop',
    source: 'components/VFXLayer.jsx',
    previewKind: 'vfx',
    runtimePreviewComponent: 'PickupPop',
    vfxType: 'pickupPop',
    applyTargets: ['components/VFXLayer.jsx', 'lib/vfxPalette.js', 'lib/vfxMath.js'],
  },
  {
    id: 'enemy-projectile-e04',
    category: 'vfx',
    label: 'Enemy Projectile',
    source: 'components/EnemyProjectileVisual.jsx',
    previewKind: 'projectile',
    runtimePreviewComponent: 'EnemyProjectileVisual',
    applyTargets: ['components/EnemyProjectileVisual.jsx', 'components/Enemy.jsx', 'lib/stage2ProjectileRules.js', 'lib/toon.js'],
  },
  {
    id: 'enemy-death-collapse',
    category: 'vfx',
    label: 'Zombie Death 00 - Cycle',
    source: 'components/EnemyDeathCollapse.jsx',
    previewKind: 'enemyCollapse',
    applyTargets: ['components/EnemyDeathCollapse.jsx', 'lib/enemyDeathCollapse.js', 'components/ZombieMesh.jsx', 'lib/toon.js'],
  },
  ...ENEMY_DEATH_COLLAPSE_STYLES.map((deathStyle, index) => {
    const number = String(index + 1).padStart(2, '0')
    return {
      id: `enemy-death-${number}`,
      category: 'vfx',
      label: `Zombie Death ${number} - ${deathStyle}`,
      source: 'components/EnemyDeathCollapse.jsx',
      previewKind: 'enemyCollapse',
      deathStyle,
      deathStyleIndex: index,
      applyTargets: ['components/EnemyDeathCollapse.jsx', 'lib/enemyDeathCollapse.js', 'components/ZombieMesh.jsx', 'lib/toon.js'],
    }
  }),
  {
    id: 'title-scene',
    category: 'title',
    label: 'Title Scene 3D',
    source: 'components/TitleScene3D.jsx',
    previewKind: 'titleScene',
    applyTargets: ['components/TitleScene3D.jsx', 'components/TitleScreen.jsx', 'lib/toon.js'],
  },
  {
    id: 'ui-mini-health-bar',
    category: 'ui',
    label: 'Mini Health Bar',
    source: 'components/MiniHealthBar.jsx',
    previewKind: 'healthBar',
    applyTargets: ['components/MiniHealthBar.jsx', 'components/Enemy.jsx'],
  },
])

const NUMERIC_RANGES = Object.freeze({
  scale: [0.35, 2.5],
  scaleX: [0.35, 2.5],
  scaleY: [0.35, 2.5],
  scaleZ: [0.35, 2.5],
  positionX: [-3, 3],
  positionY: [-3, 3],
  positionZ: [-3, 3],
  outlineThickness: [0.4, 2.2],
  outlineOpacity: [0, 1],
  colorStrength: [0, 1],
  saturation: [0.1, 1.8],
  brightness: [0.35, 1.8],
  emissiveIntensity: [0, 1.2],
  rotationX: [-180, 180],
  rotationY: [-180, 180],
  rotationZ: [-180, 180],
})

const VALID_ANIMATIONS = new Set(['normal', 'warn', 'charge', 'stun', 'lantern', 'lanternFlashlight'])

function getStorage(storage) {
  if (storage) return storage
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  return null
}

function clampNumber(value, [min, max], fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  const short = trimmed.match(/^#([0-9a-fA-F]{3})$/)
  if (short) {
    return `#${short[1].split('').map((char) => char + char).join('')}`.toLowerCase()
  }
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()
  return fallback
}

export function normalizeStageBossPreview(input = {}) {
  const source = input && typeof input === 'object' ? input : {}
  return {
    zoom: Math.round(clampNumber(source.zoom, [50, 180], DEFAULT_STAGE_BOSS_PREVIEW.zoom)),
    panX: Number(clampNumber(source.panX, [-2, 2], DEFAULT_STAGE_BOSS_PREVIEW.panX).toFixed(2)),
    panY: Number(clampNumber(source.panY, STAGE_BOSS_PREVIEW_PAN_Y_RANGE, DEFAULT_STAGE_BOSS_PREVIEW.panY).toFixed(2)),
  }
}

export function normalizeStudioTuning(input = {}) {
  const source = input && typeof input === 'object' ? input : {}
  const normalized = { ...DEFAULT_STUDIO_TUNING }

  for (const [key, range] of Object.entries(NUMERIC_RANGES)) {
    normalized[key] = clampNumber(source[key], range, DEFAULT_STUDIO_TUNING[key])
  }

  normalized.scale = Number(normalized.scale.toFixed(2))
  normalized.scaleX = Number(normalized.scaleX.toFixed(2))
  normalized.scaleY = Number(normalized.scaleY.toFixed(2))
  normalized.scaleZ = Number(normalized.scaleZ.toFixed(2))
  normalized.positionX = Number(normalized.positionX.toFixed(2))
  normalized.positionY = Number(normalized.positionY.toFixed(2))
  normalized.positionZ = Number(normalized.positionZ.toFixed(2))
  normalized.outlineThickness = Number(normalized.outlineThickness.toFixed(2))
  normalized.outlineOpacity = Number(normalized.outlineOpacity.toFixed(2))
  normalized.colorStrength = Number(normalized.colorStrength.toFixed(2))
  normalized.saturation = Number(normalized.saturation.toFixed(2))
  normalized.brightness = Number(normalized.brightness.toFixed(2))
  normalized.emissiveIntensity = Number(normalized.emissiveIntensity.toFixed(2))
  normalized.rotationX = Math.round(normalized.rotationX)
  normalized.rotationY = Math.round(normalized.rotationY)
  normalized.rotationZ = Math.round(normalized.rotationZ)
  normalized.outlineColor = normalizeHexColor(source.outlineColor, DEFAULT_STUDIO_TUNING.outlineColor)
  normalized.color = normalizeHexColor(source.color, DEFAULT_STUDIO_TUNING.color)
  normalized.animation = VALID_ANIMATIONS.has(source.animation) ? source.animation : DEFAULT_STUDIO_TUNING.animation

  return normalized
}

export function getStudioItemById(id) {
  return GRAPHICS_STUDIO_CATALOG.find((item) => item.id === id) ?? GRAPHICS_STUDIO_CATALOG[0]
}

export function loadStudioTunings(storage) {
  const targetStorage = getStorage(storage)
  if (!targetStorage) return {}

  try {
    const raw = targetStorage.getItem(GRAPHICS_STUDIO_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(
      Object.entries(parsed).map(([itemId, tuning]) => [itemId, normalizeStudioTuning(tuning)]),
    )
  } catch {
    return {}
  }
}

export function saveStudioTunings(tunings, storage) {
  const targetStorage = getStorage(storage)
  const normalized = Object.fromEntries(
    Object.entries(tunings ?? {}).map(([itemId, tuning]) => [itemId, normalizeStudioTuning(tuning)]),
  )
  targetStorage?.setItem(GRAPHICS_STUDIO_STORAGE_KEY, JSON.stringify(normalized))
  if (!storage && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GRAPHICS_STUDIO_TUNING_EVENT, { detail: normalized }))
  }
  return normalized
}

export function loadStageBossPreview(storage) {
  const targetStorage = getStorage(storage)
  if (!targetStorage) return DEFAULT_STAGE_BOSS_PREVIEW

  try {
    const raw = targetStorage.getItem(STAGE_BOSS_PREVIEW_STORAGE_KEY)
    if (!raw) return DEFAULT_STAGE_BOSS_PREVIEW
    return normalizeStageBossPreview(JSON.parse(raw))
  } catch {
    return DEFAULT_STAGE_BOSS_PREVIEW
  }
}

export function saveStageBossPreview(framing, storage) {
  const targetStorage = getStorage(storage)
  const normalized = normalizeStageBossPreview(framing)
  targetStorage?.setItem(STAGE_BOSS_PREVIEW_STORAGE_KEY, JSON.stringify(normalized))
  if (!storage && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STAGE_BOSS_PREVIEW_EVENT, { detail: normalized }))
  }
  return normalized
}

export function loadStudioResetBaseline(storage) {
  const targetStorage = getStorage(storage)
  if (!targetStorage) return {}

  try {
    const raw = targetStorage.getItem(GRAPHICS_STUDIO_RESET_BASELINE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(
      Object.entries(parsed).map(([itemId, tuning]) => [itemId, normalizeStudioTuning(tuning)]),
    )
  } catch {
    return {}
  }
}

export function ensureStudioResetBaseline(tunings = loadStudioTunings(), storage) {
  const targetStorage = getStorage(storage)
  const existing = loadStudioResetBaseline(storage)
  if (Object.keys(existing).length || !targetStorage) return existing

  const normalized = Object.fromEntries(
    Object.entries(tunings ?? {}).map(([itemId, tuning]) => [itemId, normalizeStudioTuning(tuning)]),
  )
  targetStorage.setItem(GRAPHICS_STUDIO_RESET_BASELINE_KEY, JSON.stringify(normalized))
  return normalized
}

export function serializeStudioSnapshot({ selectedItemId = 'player', tunings = loadStudioTunings(), stageBossPreview = loadStageBossPreview() } = {}) {
  const selectedItem = getStudioItemById(selectedItemId)
  const normalizedTunings = Object.fromEntries(
    Object.entries(tunings ?? {}).map(([itemId, tuning]) => [itemId, normalizeStudioTuning(tuning)]),
  )

  return JSON.stringify({
    tool: 'graphics-studio',
    version: 1,
    generatedAt: new Date().toISOString(),
    selectedItem: {
      id: selectedItem.id,
      label: selectedItem.label,
      category: selectedItem.category,
      source: selectedItem.source,
      applyTargets: selectedItem.applyTargets,
    },
    tunings: normalizedTunings,
    stageBossPreview: normalizeStageBossPreview(stageBossPreview),
  }, null, 2)
}
