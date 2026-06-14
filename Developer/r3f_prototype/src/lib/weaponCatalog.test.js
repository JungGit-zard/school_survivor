import { describe, it, expect } from 'vitest'
import {
  WEAPON_CATALOG,
  STARTER,
  getAllWeaponIds,
  getStarterIds,
  isStarter,
  isValidWeaponId,
  evaluateUnlocks,
} from './weaponCatalog.js'

describe('weaponCatalog', () => {
  it('14종 entry 등록 + starter 9종', () => {
    const all = getAllWeaponIds()
    expect(all.length).toBe(15)
    const starter = getStarterIds()
    expect(starter).toEqual(['pencilThrow', 'schoolBag', 'boxCutter', 'tumbler', 'scienceFlask', 'bell', 'stunGun', 'onigiri', 'chibiko'])
  })

  it('Starter base 스탯이 BASE_WEAPONS 정본 값과 일치한다', () => {
    expect(WEAPON_CATALOG.pencilThrow.base.damage).toBe(5)
    expect(WEAPON_CATALOG.pencilThrow.base.cooldown).toBe(1100)
    expect(WEAPON_CATALOG.schoolBag.base.damage).toBe(12)
    expect(WEAPON_CATALOG.boxCutter.base.damage).toBe(24) // '30cm 자'(12)의 2배
    expect(WEAPON_CATALOG.boxCutter.base.range).toBe(0.7) // 자보다 훨씬 좁은 근접 범위
    expect(WEAPON_CATALOG.boxCutter.base.width).toBe(0.18)
    expect(WEAPON_CATALOG.tumbler.base.hitsPerSecond).toBe(2.5)
    expect(WEAPON_CATALOG.scienceFlask.base.damage).toBe(15)
    expect(WEAPON_CATALOG.bell.base.directions).toBe(8)
    expect(WEAPON_CATALOG.stunGun.base.chainCount).toBe(2)
    expect(WEAPON_CATALOG.onigiri.base.cooldown).toBe(5000)
    expect(WEAPON_CATALOG.onigiri.base.bounces).toBe(1)
    expect(WEAPON_CATALOG.chibiko.base.damage).toBe(5)
    expect(WEAPON_CATALOG.chibiko.base.cooldown).toBe(1100)
    expect(WEAPON_CATALOG.chibiko.base.followDistance).toBe(0.72)
  })

  it('복원 2종(R6) Lv.1 스탯 정확히 일치', () => {
    expect(WEAPON_CATALOG.guidedMissile.base.damage).toBe(16)
    expect(WEAPON_CATALOG.guidedMissile.base.cooldown).toBe(4000)
    expect(WEAPON_CATALOG.guidedMissile.base.range).toBe(22)
    expect(WEAPON_CATALOG.guidedMissile.base.radius).toBe(1.6)
    expect(WEAPON_CATALOG.starlink.base.damage).toBe(28)
    expect(WEAPON_CATALOG.starlink.base.cooldown).toBe(3800)
    expect(WEAPON_CATALOG.starlink.base.strikeCenter).toBe(5)
    expect(WEAPON_CATALOG.starlink.base.strikeRadius).toBe(1.2)
  })

  it('신규 3종(R7) Lv.1 스탯 정확히 일치', () => {
    expect(WEAPON_CATALOG.compassBlade.base.damage).toBe(7)
    expect(WEAPON_CATALOG.compassBlade.base.radius).toBe(1.15)
    expect(WEAPON_CATALOG.compassBlade.base.hitsPerSecond).toBe(2.5)
    expect(WEAPON_CATALOG.umbrellaGuard.base.damage).toBe(12)
    expect(WEAPON_CATALOG.umbrellaGuard.base.cooldown).toBe(3600)
    expect(WEAPON_CATALOG.umbrellaGuard.base.radius).toBe(1.25)
    expect(WEAPON_CATALOG.umbrellaGuard.base.spinDurationMs).toBe(1200)
    expect(WEAPON_CATALOG.eraserBomb.base.damage).toBe(26)
    expect(WEAPON_CATALOG.eraserBomb.base.cooldown).toBe(6000)
    expect(WEAPON_CATALOG.eraserBomb.base.radius).toBe(1.35)
  })

  it('카드 등장 레벨 게이트(R8)', () => {
    expect(WEAPON_CATALOG.compassBlade.minLevelToAppear).toBe(3)
    expect(WEAPON_CATALOG.umbrellaGuard.minLevelToAppear).toBe(3)
    expect(WEAPON_CATALOG.eraserBomb.minLevelToAppear).toBe(4)
    expect(WEAPON_CATALOG.guidedMissile.minLevelToAppear).toBe(4)
    expect(WEAPON_CATALOG.starlink.minLevelToAppear).toBe(8)
    expect(WEAPON_CATALOG.chibiko.minLevelToAppear).toBe(8)
    expect(WEAPON_CATALOG.sharkMissile.minLevelToAppear).toBe(8)
  })

  it('defines sharkMissile as a high-impact cluster homing weapon based on scienceFlask', () => {
    const flask = WEAPON_CATALOG.scienceFlask.base

    expect(WEAPON_CATALOG.sharkMissile).toMatchObject({
      id: 'sharkMissile',
      label: '상어미사일',
      base: {
        damage: flask.damage * 2,
        cooldown: flask.cooldown * 5,
        range: 28,
        radius: 1.8,
        speed: 8.5,
        retargetIntervalMs: 300,
      },
      unlockConditions: [
        { type: 'stage1Clears', value: 1 },
        { type: 'totalRuns', value: 8 },
      ],
      minLevelToAppear: 8,
    })
  })

  it('evaluateUnlocks 빈 records → starter 9종만', () => {
    const u = evaluateUnlocks({})
    expect(u.size).toBe(9)
    for (const id of getStarterIds()) expect(u.has(id)).toBe(true)
    expect(u.has('compassBlade')).toBe(false)
  })

  it('evaluateUnlocks(runKills:80) → compassBlade unlock (OR 첫 분기)', () => {
    const u = evaluateUnlocks({ runKills: 80 })
    expect(u.has('compassBlade')).toBe(true)
  })

  it('evaluateUnlocks(totalKills:200) → compassBlade unlock (OR 두 번째 분기)', () => {
    const u = evaluateUnlocks({ totalKills: 200 })
    expect(u.has('compassBlade')).toBe(true)
  })

  it('evaluateUnlocks(runSurvivalSeconds:90) → umbrellaGuard unlock', () => {
    const u = evaluateUnlocks({ runSurvivalSeconds: 90 })
    expect(u.has('umbrellaGuard')).toBe(true)
  })

  it('evaluateUnlocks(runGold:80) → eraserBomb unlock', () => {
    const u = evaluateUnlocks({ runGold: 80 })
    expect(u.has('eraserBomb')).toBe(true)
  })

  it('evaluateUnlocks(totalRuns:5) → guidedMissile unlock', () => {
    const u = evaluateUnlocks({ totalRuns: 5 })
    expect(u.has('guidedMissile')).toBe(true)
    expect(u.has('starlink')).toBe(false)
  })

  it('evaluateUnlocks(totalRuns:10) → starlink unlock', () => {
    const u = evaluateUnlocks({ totalRuns: 10 })
    expect(u.has('starlink')).toBe(true)
  })

  it('evaluateUnlocks(totalKills:5000) → starlink unlock (OR 두 번째 분기)', () => {
    const u = evaluateUnlocks({ totalKills: 5000 })
    expect(u.has('starlink')).toBe(true)
  })

  it('evaluateUnlocks(stage1Clears:1) unlocks sharkMissile', () => {
    const u = evaluateUnlocks({ stage1Clears: 1 })
    expect(u.has('sharkMissile')).toBe(true)
  })

  it('evaluateUnlocks(totalRuns:8) unlocks sharkMissile fallback path', () => {
    const u = evaluateUnlocks({ totalRuns: 8 })
    expect(u.has('sharkMissile')).toBe(true)
  })

  it('미지정 type은 false 처리 + 다른 OR 분기 계속 평가', () => {
    // bogus type + totalKills 200 → compassBlade 여전히 해금
    const u = evaluateUnlocks({ bogusType: 9999, totalKills: 200 })
    expect(u.has('compassBlade')).toBe(true)
  })

  it('null/undefined records 안전', () => {
    expect(() => evaluateUnlocks(null)).not.toThrow()
    expect(() => evaluateUnlocks(undefined)).not.toThrow()
    expect(evaluateUnlocks(null).size).toBe(9) // starter only
  })

  it('isStarter / isValidWeaponId / STARTER 상수', () => {
    expect(STARTER).toBe('starter')
    expect(isStarter('pencilThrow')).toBe(true)
    expect(isStarter('compassBlade')).toBe(false)
    expect(isValidWeaponId('guidedMissile')).toBe(true)
    expect(isValidWeaponId('sharkMissile')).toBe(true)
    expect(isValidWeaponId('bogus')).toBe(false)
  })
})
