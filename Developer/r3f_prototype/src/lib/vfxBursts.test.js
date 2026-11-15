import { beforeEach, describe, expect, it } from 'vitest'
import {
  ONIGIRI_TWINKLE_SPACING,
  VFX_BURST,
  VFX_BURST_QUEUE_CAPACITY,
  WEAPON_HIT_BURST,
  clearVfxBursts,
  drainVfxBursts,
  pendingVfxBurstCount,
  resetOnigiriTwinkle,
  resolveWeaponHitBurst,
  shedOnigiriTwinkle,
  spawnVfxBurst,
} from './vfxBursts.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'

const drainAll = () => {
  const out = []
  drainVfxBursts((kind, x, y, z, scale) => out.push({ kind, x, y, z, scale }))
  return out
}

describe('pooled VFX burst queue (Terry 2026-11-15 picks)', () => {
  beforeEach(() => clearVfxBursts())

  it('queues bursts without objects and drains them in FIFO order', () => {
    expect(spawnVfxBurst(VFX_BURST.KILL_PUFF, 1, 0, 2, 1.5)).toBe(true)
    expect(spawnVfxBurst(VFX_BURST.PICKUP, -1, 0, 3)).toBe(true)
    expect(pendingVfxBurstCount()).toBe(2)
    expect(drainAll()).toEqual([
      { kind: VFX_BURST.KILL_PUFF, x: 1, y: 0, z: 2, scale: 1.5 },
      { kind: VFX_BURST.PICKUP, x: -1, y: 0, z: 3, scale: 1 },
    ])
    expect(pendingVfxBurstCount()).toBe(0)
  })

  it('rejects unknown kinds and non-finite positions, and drops the oldest when full', () => {
    expect(spawnVfxBurst(0, 0, 0, 0)).toBe(false)
    expect(spawnVfxBurst(99, 0, 0, 0)).toBe(false)
    expect(spawnVfxBurst(VFX_BURST.HEAL, Number.NaN, 0, 0)).toBe(false)
    for (let i = 0; i < VFX_BURST_QUEUE_CAPACITY + 5; i += 1) spawnVfxBurst(VFX_BURST.HIT_PIXEL, i, 0, 0)
    const out = drainAll()
    expect(out).toHaveLength(VFX_BURST_QUEUE_CAPACITY)
    expect(out[0].x).toBe(5)
  })
})

describe('per-weapon hit distribution (picks.md)', () => {
  it('maps every picked weapon to its picked hit effect', () => {
    expect(WEAPON_HIT_BURST).toEqual({
      pencilThrow: VFX_BURST.HIT_PENCIL,
      schoolBag: VFX_BURST.HIT_REEBO,
      boxCutter: VFX_BURST.HIT_REEBO,
      stunGun: VFX_BURST.HIT_BINBUN,
      hanako: VFX_BURST.HIT_BINBUN,
      bell: VFX_BURST.HIT_CODEMANU,
      scienceFlask: VFX_BURST.HIT_CODEMANU,
      compassBlade: VFX_BURST.HIT_CODEMANU,
      studentLantern: VFX_BURST.HIT_LANTERN,
      onigiri: VFX_BURST.HIT_PIXEL,
      miniRosari: VFX_BURST.HIT_PIXEL,
      paperPlane: VFX_BURST.HIT_PIXEL,
      chibiko: VFX_BURST.HIT_CHIBIKO,
    })
    for (const key of Object.keys(WEAPON_HIT_BURST)) {
      if (key !== 'chibiko') expect(WEAPON_CATALOG[key], key).toBeTruthy()
    }
  })

  it('keeps the old HitSpark (NONE) for tumbler, umbrellaGuard and unlisted weapons', () => {
    for (const key of ['tumbler', 'umbrellaGuard', 'guidedMissile', 'sharkMissile', 'starlink', 'inucon', 'eraserBomb']) {
      expect(resolveWeaponHitBurst({ weaponKey: key }), key).toBe(VFX_BURST.NONE)
    }
    expect(resolveWeaponHitBurst(undefined)).toBe(VFX_BURST.NONE)
    expect(resolveWeaponHitBurst({})).toBe(VFX_BURST.NONE)
  })

  it('prefers the visual-only vfxKey over weaponKey', () => {
    expect(resolveWeaponHitBurst({ weaponKey: 'pencilThrow' })).toBe(VFX_BURST.HIT_PENCIL)
    expect(resolveWeaponHitBurst({ weaponKey: 'scienceFlask', vfxKey: 'chibiko' })).toBe(VFX_BURST.HIT_CHIBIKO)
  })
})

describe('onigiri twinkle trail', () => {
  beforeEach(() => clearVfxBursts())

  it('sheds one star per spacing travelled and restarts after a reset', () => {
    resetOnigiriTwinkle(3)
    expect(shedOnigiriTwinkle(3, 0, 0.5, 0)).toBe(false)
    expect(shedOnigiriTwinkle(3, ONIGIRI_TWINKLE_SPACING * 0.5, 0.5, 0)).toBe(false)
    expect(shedOnigiriTwinkle(3, ONIGIRI_TWINKLE_SPACING * 1.01, 0.5, 0)).toBe(true)
    const shed = drainAll()
    expect(shed).toHaveLength(1)
    expect(shed[0].kind).toBe(VFX_BURST.ONIGIRI_TWINKLE)
    expect(shed[0].x).toBeCloseTo(ONIGIRI_TWINKLE_SPACING * 1.01, 5)
    resetOnigiriTwinkle(3)
    expect(shedOnigiriTwinkle(3, 10, 0.5, 10)).toBe(false)
  })
})
