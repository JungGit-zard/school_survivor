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

export const GRAPHICS_STUDIO_STORAGE_KEY = 'escape-zombie-school.graphicsStudioTunings.v1'

export const DEFAULT_STUDIO_TUNING = Object.freeze({
  scale: 1,
  outlineThickness: 1,
  outlineOpacity: 0.96,
  outlineColor: '#050209',
  color: '#ffffff',
  colorStrength: 0,
  saturation: 1,
  brightness: 1,
  emissiveIntensity: 0.14,
  rotationY: 0,
  animation: 'normal',
})

export const GRAPHICS_STUDIO_CATEGORIES = Object.freeze([
  { id: 'actor', label: 'Actor' },
  { id: 'enemy', label: 'Enemy' },
  { id: 'pickup', label: 'Pickup' },
  { id: 'stageObject', label: 'Stage Object' },
  { id: 'floor', label: 'Floor' },
  { id: 'weapon', label: 'Weapon Icon' },
  { id: 'vfx', label: 'VFX' },
  { id: 'title', label: 'Title Scene' },
  { id: 'ui', label: 'UI Overlay' },
])

const weaponIcons = [
  ['weapon-pencil', 'Pencil', pencilIconUrl, 'components/Weapons/Pencil.jsx'],
  ['weapon-ruler', '30cm Ruler', rulerIconUrl, 'components/Weapons/SchoolBag.jsx'],
  ['weapon-tumbler', 'Tumbler', tumblerIconUrl, 'components/Weapons/Tumbler.jsx'],
  ['weapon-science-flask', 'Science Flask', scienceIconUrl, 'components/Weapons/Flask.jsx'],
  ['weapon-bell', 'Bell', bellIconUrl, 'components/Weapons/Bell.jsx'],
  ['weapon-stun-gun', 'Stun Gun', stunGunIconUrl, 'components/Weapons/StunGun.jsx'],
  ['weapon-onigiri', 'Onigiri', onigiriIconUrl, 'components/Weapons/Onigiri.jsx'],
  ['weapon-extra-battery', 'Extra Battery', batteryIconUrl, 'lib/upgrades.js'],
  ['weapon-starlink', 'Starlink', starlinkIconUrl, 'components/Weapons/Starlink.jsx'],
  ['weapon-compass', 'Compass', compassIconUrl, 'components/Weapons/CompassBlade.jsx'],
  ['weapon-umbrella', 'Umbrella', umbrellaIconUrl, 'components/Weapons/UmbrellaGuard.jsx'],
  ['weapon-eraser', 'Eraser', eraserIconUrl, 'components/Weapons/EraserBomb.jsx'],
  ['weapon-box-cutter', 'Box Cutter', boxCutterIconUrl, 'components/Weapons/BoxCutter.jsx'],
  ['weapon-chibiko', 'Chibiko', chibikoIconUrl, 'components/Weapons/Chibiko.jsx'],
  ['weapon-shark-missile', 'Shark Missile', sharkMissileIconUrl, 'components/Weapons/SharkMissile.jsx'],
]

export const GRAPHICS_STUDIO_CATALOG = Object.freeze([
  {
    id: 'player',
    category: 'actor',
    label: 'Player',
    source: 'components/PlayerMesh.jsx',
    previewKind: 'player',
    applyTargets: ['components/PlayerMesh.jsx', 'lib/characterVisualScale.js', 'lib/toon.js'],
  },
  ...['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'B01'].map((type) => ({
    id: `zombie-${type.toLowerCase()}`,
    category: 'enemy',
    label: `Zombie ${type}`,
    source: 'components/ZombieMesh.jsx',
    previewKind: 'zombie',
    zombieType: type,
    applyTargets: ['components/ZombieMesh.jsx', 'components/Enemy.jsx', 'lib/toon.js'],
  })),
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
    source: 'assets/background_floor/tile_stage01.png.png',
    previewKind: 'floor',
    stageId: 'stage1',
    assetUrl: stage1FloorUrl,
    applyTargets: ['components/ClassroomFloor.jsx', 'assets/background_floor/tile_stage01.png.png'],
  },
  {
    id: 'stage-floor-stage2',
    category: 'floor',
    label: 'Stage 2 Corridor Floor',
    source: 'assets/background_floor/tile_stage02_corridor.png',
    previewKind: 'floor',
    stageId: 'stage2',
    assetUrl: stage2FloorUrl,
    companionAssetUrl: stage2EndWallUrl,
    applyTargets: [
      'components/ClassroomFloor.jsx',
      'lib/stage2CorridorWall.js',
      'assets/background_floor/tile_stage02_corridor.png',
      'assets/background_floor/stage02_corridor_end_wall.png',
    ],
  },
  ...weaponIcons.map(([id, label, assetUrl, implementationTarget]) => ({
    id,
    category: 'weapon',
    label,
    source: `assets/weapon_icon/${assetUrl.split('/').at(-1)}`,
    previewKind: 'image',
    assetUrl,
    applyTargets: [`assets/weapon_icon/${assetUrl.split('/').at(-1)}`, implementationTarget],
  })),
  {
    id: 'vfx-hit-spark',
    category: 'vfx',
    label: 'Hit Spark',
    source: 'components/VFXLayer.jsx',
    previewKind: 'vfx',
    vfxType: 'hitSpark',
    applyTargets: ['components/VFXLayer.jsx', 'lib/vfxPalette.js', 'lib/enemyHitVfx.js'],
  },
  {
    id: 'vfx-charge-warning',
    category: 'vfx',
    label: 'Charge Warning',
    source: 'components/VFXLayer.jsx',
    previewKind: 'vfx',
    vfxType: 'chargeWarning',
    applyTargets: ['components/VFXLayer.jsx', 'lib/vfxPalette.js', 'lib/vfxGeometry.js'],
  },
  {
    id: 'vfx-pickup-pop',
    category: 'vfx',
    label: 'Pickup Pop',
    source: 'components/VFXLayer.jsx',
    previewKind: 'vfx',
    vfxType: 'pickupPop',
    applyTargets: ['components/VFXLayer.jsx', 'lib/vfxPalette.js', 'lib/vfxMath.js'],
  },
  {
    id: 'enemy-projectile-e04',
    category: 'vfx',
    label: 'Enemy Projectile',
    source: 'components/Enemy.jsx',
    previewKind: 'projectile',
    applyTargets: ['components/Enemy.jsx', 'lib/stage2ProjectileRules.js', 'lib/toon.js'],
  },
  {
    id: 'enemy-death-collapse',
    category: 'vfx',
    label: 'Enemy Death Collapse',
    source: 'components/EnemyDeathCollapse.jsx',
    previewKind: 'enemyCollapse',
    applyTargets: ['components/EnemyDeathCollapse.jsx', 'lib/enemyDeathCollapse.js', 'components/ZombieMesh.jsx', 'lib/toon.js'],
  },
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
  outlineThickness: [0.4, 2.2],
  outlineOpacity: [0, 1],
  colorStrength: [0, 1],
  saturation: [0.1, 1.8],
  brightness: [0.35, 1.8],
  emissiveIntensity: [0, 1.2],
  rotationY: [-180, 180],
})

const VALID_ANIMATIONS = new Set(['normal', 'warn', 'charge', 'stun'])

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

export function normalizeStudioTuning(input = {}) {
  const source = input && typeof input === 'object' ? input : {}
  const normalized = { ...DEFAULT_STUDIO_TUNING }

  for (const [key, range] of Object.entries(NUMERIC_RANGES)) {
    normalized[key] = clampNumber(source[key], range, DEFAULT_STUDIO_TUNING[key])
  }

  normalized.scale = Number(normalized.scale.toFixed(2))
  normalized.outlineThickness = Number(normalized.outlineThickness.toFixed(2))
  normalized.outlineOpacity = Number(normalized.outlineOpacity.toFixed(2))
  normalized.colorStrength = Number(normalized.colorStrength.toFixed(2))
  normalized.saturation = Number(normalized.saturation.toFixed(2))
  normalized.brightness = Number(normalized.brightness.toFixed(2))
  normalized.emissiveIntensity = Number(normalized.emissiveIntensity.toFixed(2))
  normalized.rotationY = Math.round(normalized.rotationY)
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
  return normalized
}

export function serializeStudioSnapshot({ selectedItemId = 'player', tunings = loadStudioTunings() } = {}) {
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
  }, null, 2)
}
