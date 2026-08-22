import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import {
  WEAPON_CATALOG,
  STARTER,
  getAllWeaponIds,
  getAccountUnlockableWeaponIds,
  getStarterIds,
  isAccountUnlockable,
  isRuntimeCombinationWeapon,
  isStarter,
  isValidWeaponId,
  evaluateUnlocks,
} from './weaponCatalog.js'

describe('weaponCatalog', () => {
  it('20종 entry 등록 + 기본군 starter 4종', () => {
    const all = getAllWeaponIds()
    expect(all.length).toBe(20)
    const starter = getStarterIds()
    expect(starter).toEqual(['pencilThrow', 'schoolBag', 'boxCutter', 'tumbler'])
    expect(getAccountUnlockableWeaponIds()).toHaveLength(17)
    expect(['hanako', 'bikittyCutter', 'lineDraw'].every(isRuntimeCombinationWeapon)).toBe(true)
    expect(['hanako', 'bikittyCutter', 'lineDraw'].every(isAccountUnlockable)).toBe(false)
  })

  it('승인된 20종 해금표가 ID별로 정확히 고정된다', () => {
    const conditionById = Object.fromEntries(getAllWeaponIds().map((id) => [id, WEAPON_CATALOG[id].unlockConditions]))
    expect(conditionById).toEqual({
      pencilThrow: STARTER,
      schoolBag: STARTER,
      boxCutter: STARTER,
      tumbler: STARTER,
      scienceFlask: [{ type: 'totalRuns', value: 2 }],
      bell: [{ type: 'stage1Clears', value: 1 }],
      stunGun: [{ type: 'stage2Clears', value: 1 }],
      onigiri: [{ type: 'totalKills', value: 700 }],
      chibiko: [{ type: 'totalRuns', value: 3 }],
      hanako: null,
      inucon: [{ type: 'bossKills', value: 3 }],
      guidedMissile: [{ type: 'bossKills', value: 1 }],
      sharkMissile: [{ type: 'stage2Clears', value: 1 }],
      starlink: [{ type: 'totalKills', value: 2500 }],
      compassBlade: [{ type: 'totalKills', value: 200 }],
      umbrellaGuard: [{ type: 'totalSurvivalSeconds', value: 300 }],
      eraserBomb: [{ type: 'totalGold', value: 160 }],
      studentLantern: [{ type: 'stage3Clears', value: 1 }],
      bikittyCutter: null,
      lineDraw: null,
    })
    expect(Object.fromEntries(getAllWeaponIds().map((id) => [id, WEAPON_CATALOG[id].minLevelToAppear ?? null]))).toEqual({
      pencilThrow: 1, schoolBag: 2, boxCutter: 2, tumbler: 2, scienceFlask: 4,
      bell: 4, stunGun: 6, onigiri: 6, chibiko: 8, hanako: null, inucon: 8,
      guidedMissile: 4, sharkMissile: 8, starlink: 8, compassBlade: 3,
      umbrellaGuard: 3, eraserBomb: 4, studentLantern: 5, bikittyCutter: 6, lineDraw: 8,
    })
  })

  it('Starter base 스탯이 BASE_WEAPONS 정본 값과 일치한다', () => {
    const source = readFileSync(new URL('./weaponCatalog.js', import.meta.url), 'utf8')

    // 2026-08-02 사용자 확정: 공격력 2.4만 유지하고 cooldown/pierce는 변경 전 값으로 롤백.
    expect(WEAPON_CATALOG.pencilThrow.base.damage).toBe(2.4)
    expect(WEAPON_CATALOG.pencilThrow.base.cooldown).toBe(550)
    expect(WEAPON_CATALOG.pencilThrow.base.pierce).toBe(1)
    expect(WEAPON_CATALOG.pencilThrow.base.projectileCount).toBe(1) // 레벨업 성장 여지 보존
    // E01 collider 지름 약 0.747을 1zm=0.75 world units로 고정한다.
    // 연필 발사 원 지름 6zm → 반지름 3zm = 2.25 world units.
    expect(WEAPON_CATALOG.pencilThrow.base.range).toBe(2.25)
    expect(source).toContain("import { PENCIL_FIRE_RANGE_WORLD_UNITS } from './gameplayUnits.js'")
    expect(source).toContain('range: PENCIL_FIRE_RANGE_WORLD_UNITS')
    expect(WEAPON_CATALOG.schoolBag.base.damage).toBe(12)
    expect(WEAPON_CATALOG.boxCutter.base.damage).toBe(24) // '30cm 자'(12)의 2배
    expect(WEAPON_CATALOG.boxCutter.base.range).toBe(1.4) // 사거리 2배 확장 (0.7 → 1.4)
    expect(WEAPON_CATALOG.boxCutter.base.width).toBe(0.18)
    expect(WEAPON_CATALOG.boxCutter.base.knockback).toBe(1.8)
    expect(WEAPON_CATALOG.boxCutter.base.critChance).toBe(0.25)
    expect(WEAPON_CATALOG.boxCutter.base.critMultiplier).toBe(1.5)
    // 업그레이드 없는 기본 쿨다운: 기존 650ms의 정확히 5배
    expect(WEAPON_CATALOG.boxCutter.base.cooldown).toBe(3250)
    expect(WEAPON_CATALOG.boxCutter.base.cooldown).toBe(650 * 5)
    expect(WEAPON_CATALOG.tumbler.base.hitsPerSecond).toBe(2.5)
    expect(WEAPON_CATALOG.scienceFlask.base.damage).toBe(7.5) // 리워크: 착탄 데미지 절반, 웅덩이 존 추가
    expect(WEAPON_CATALOG.bell.base.directions).toBe(8)
    expect(WEAPON_CATALOG.stunGun.base.chainCount).toBe(2)
    expect(WEAPON_CATALOG.onigiri.base.damage).toBe(21)
    expect(WEAPON_CATALOG.onigiri.base.cooldown).toBe(5000)
    expect(WEAPON_CATALOG.onigiri.base.bounces).toBe(6)
    expect(WEAPON_CATALOG.chibiko.base.damage).toBe(1.25)
    expect(WEAPON_CATALOG.chibiko.base.cooldown).toBe(1100)
    expect(WEAPON_CATALOG.chibiko.base.followDistance).toBe(0.72)
    expect(WEAPON_CATALOG.hanako).toMatchObject({
      id: 'hanako',
      label: '하나코',
      base: {
        healIntervalMs: 20000,
        healPercent: 0.05,
        followDistance: 1.44,
      },
      unlockConditions: null,
    })
    expect(WEAPON_CATALOG.hanako.minLevelToAppear).toBeUndefined()
    expect(WEAPON_CATALOG.inucon).toMatchObject({
      id: 'inucon',
      label: '이누콘',
      base: {
        damage: 0,
        healIntervalMs: 10000,
        healPercent: 0.10,
        followDistance: 1.08,
        pushRadius: 0.85,
        knockback: 2.8,
        knockbackMs: 180,
        contactPulseIntervalMs: 250,
      },
      unlockConditions: [{ type: 'bossKills', value: 3 }],
      minLevelToAppear: 8,
    })
  })

  it('복원 2종(R6) Lv.1 스탯 정확히 일치', () => {
    expect(WEAPON_CATALOG.guidedMissile.base.damage).toBe(16)
    expect(WEAPON_CATALOG.guidedMissile.base.cooldown).toBe(6000)
    expect(WEAPON_CATALOG.guidedMissile.base.cooldown).toBe(4000 * 1.5)
    expect(WEAPON_CATALOG.guidedMissile.base.range).toBe(7.34)
    expect(WEAPON_CATALOG.guidedMissile.base.radius).toBe(1.6)
    expect(WEAPON_CATALOG.starlink.base.damage).toBe(28)
    expect(WEAPON_CATALOG.starlink.base.cooldown).toBe(3800)
    expect(WEAPON_CATALOG.starlink.base.strikeCenter).toBe(5)
    expect(WEAPON_CATALOG.starlink.base.strikeRadius).toBe(1.2)
  })

  it('신규 3종(R7) Lv.1 스탯 정확히 일치', () => {
    expect(WEAPON_CATALOG.compassBlade.label).toBe('오리요강')
    // 2026-08-18 사용자 확정: 7 → 5. 타격은 텀블러(6)보다 약하고, 값어치는 폭발에 있다.
    expect(WEAPON_CATALOG.compassBlade.base.damage).toBe(5)
    expect(WEAPON_CATALOG.compassBlade.base.radius).toBe(1.15)
    // 2026-08-15 격차 완화: 2.5 → 2.0. 타격 빈도만 내렸다.
    expect(WEAPON_CATALOG.compassBlade.base.hitsPerSecond).toBe(2.0)
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

  it('scienceFlask 웅덩이 존 스펙 (리워크 기획 정본)', () => {
    const flask = WEAPON_CATALOG.scienceFlask.base
    expect(flask.cooldown).toBe(8400)
    expect(flask.zoneRadius).toBe(1.4)       // E01 9마리 3×3 밀집 대형 커버
    expect(flask.zoneDurationMs).toBe(5000)  // 1레벨 5초
    // 2026-08-01: 연필 damage 파생을 끊고 1.5에 고정했다. Stage 2 초반 밸런스로 연필만
    // 2.4로 올리면서, 이번 범위가 아닌 플라스크가 전 스테이지에서 함께 오르는 것을 막기 위해서다.
    expect(flask.zoneTickDamage).toBe(1.5)
    expect(flask.zoneTickDamage).not.toBe(WEAPON_CATALOG.pencilThrow.base.damage)
  })

  it('studentLantern 스펙 (신무기 기획 정본)', () => {
    const lantern = WEAPON_CATALOG.studentLantern.base
    // 위와 같은 이유로 연필 파생에서 분리해 0.15(구 연필 1.5의 1/10)에 고정했다.
    expect(lantern.damage).toBeCloseTo(0.15, 10)
    expect(lantern.damage).not.toBe(WEAPON_CATALOG.pencilThrow.base.damage * 0.1)
    expect(lantern.durationMs).toBe(3000)      // 1레벨 3초 점등 → 3타
    expect(lantern.hitIntervalMs).toBe(300)
    expect(lantern.lightLength).toBe(2.08)
    expect(lantern.lightWidth).toBe(3.6)
    expect(lantern.lightBaseWidth).toBe(0.35)
    expect(WEAPON_CATALOG.studentLantern.minLevelToAppear).toBe(5)
  })

  it('evaluateUnlocks(stage3Clears:1) unlocks studentLantern', () => {
    const u = evaluateUnlocks({ stage3Clears: 1 })
    expect(u.has('studentLantern')).toBe(true)
  })

  it('defines sharkMissile at 1.3x guidedMissile damage (기획 정본)', () => {
    const battery = WEAPON_CATALOG.guidedMissile.base

    expect(WEAPON_CATALOG.sharkMissile).toMatchObject({
      id: 'sharkMissile',
      label: '상어미사일',
      base: {
        damage: battery.damage * 1.3,
        // 2026-08-15 역전 제거: 7000 → 4200. 쿨다운이 1.75배라 상위 무기인데도 단일 대상
        // DPS가 보조배터리 미사일보다 낮았다(2.97 < 4.00). 4200이면 4.95로 1.24배가 된다.
        cooldown: 4200,
        range: 28,
        radius: 1.8,
        speed: 8.5,
        retargetIntervalMs: 300,
      },
      unlockConditions: [{ type: 'stage2Clears', value: 1 }],
      minLevelToAppear: 8,
    })
  })

  it('evaluateUnlocks 빈 records → 기본군 4종만', () => {
    const u = evaluateUnlocks({})
    expect(u.size).toBe(4)
    for (const id of getStarterIds()) expect(u.has(id)).toBe(true)
    expect(u.has('compassBlade')).toBe(false)
  })

  it('evaluateUnlocks(totalKills:200) → compassBlade unlock', () => {
    const u = evaluateUnlocks({ totalKills: 200 })
    expect(u.has('compassBlade')).toBe(true)
  })

  it('evaluateUnlocks(totalSurvivalSeconds:300) → umbrellaGuard unlock', () => {
    const u = evaluateUnlocks({ totalSurvivalSeconds: 300 })
    expect(u.has('umbrellaGuard')).toBe(true)
  })

  it('evaluateUnlocks(totalGold:160) → eraserBomb unlock', () => {
    const u = evaluateUnlocks({ totalGold: 160 })
    expect(u.has('eraserBomb')).toBe(true)
  })

  it('evaluateUnlocks(totalRuns:2/3) → scienceFlask와 chibiko unlock', () => {
    expect(evaluateUnlocks({ totalRuns: 2 }).has('scienceFlask')).toBe(true)
    expect(evaluateUnlocks({ totalRuns: 2 }).has('chibiko')).toBe(false)
    expect(evaluateUnlocks({ totalRuns: 3 }).has('chibiko')).toBe(true)
  })

  it('evaluateUnlocks(totalKills:2500) → starlink unlock', () => {
    const u = evaluateUnlocks({ totalKills: 2500 })
    expect(u.has('starlink')).toBe(true)
  })

  it('stage와 보스 조건은 지정된 무기만 해금한다', () => {
    const stage1 = evaluateUnlocks({ stage1Clears: 1 })
    expect(stage1.has('bell')).toBe(true)
    expect(stage1.has('sharkMissile')).toBe(false)
    const stage2 = evaluateUnlocks({ stage2Clears: 1 })
    expect(stage2.has('sharkMissile')).toBe(true)
    expect(stage2.has('stunGun')).toBe(true)
    const firstBoss = evaluateUnlocks({ bossKills: 1 })
    expect(firstBoss.has('guidedMissile')).toBe(true)
    expect(firstBoss.has('inucon')).toBe(false)
    expect(evaluateUnlocks({ bossKills: 3 }).has('inucon')).toBe(true)
  })

  it('조합 3종은 어떤 계정 기록으로도 evaluateUnlocks에 들어가지 않는다', () => {
    const u = evaluateUnlocks({ totalRuns: 999, totalKills: 99999, totalGold: 99999, totalSurvivalSeconds: 99999, stage1Clears: 9, stage2Clears: 9, stage3Clears: 9, bossKills: 9 })
    expect(u.has('hanako')).toBe(false)
    expect(u.has('bikittyCutter')).toBe(false)
    expect(u.has('lineDraw')).toBe(false)
  })

  it('미지정 type은 false 처리 + 다른 조건 평가는 계속한다', () => {
    const u = evaluateUnlocks({ bogusType: 9999, totalKills: 200 })
    expect(u.has('compassBlade')).toBe(true)
  })

  it('null/undefined records 안전', () => {
    expect(() => evaluateUnlocks(null)).not.toThrow()
    expect(() => evaluateUnlocks(undefined)).not.toThrow()
    expect(evaluateUnlocks(null).size).toBe(4) // starter only
  })

  it('isStarter / isValidWeaponId / STARTER 상수', () => {
    expect(STARTER).toBe('starter')
    expect(isStarter('pencilThrow')).toBe(true)
    expect(isStarter('scienceFlask')).toBe(false)
    expect(isValidWeaponId('guidedMissile')).toBe(true)
    expect(isValidWeaponId('sharkMissile')).toBe(true)
    expect(isValidWeaponId('bogus')).toBe(false)
  })
})
