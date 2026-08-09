import { describe, it, expect } from 'vitest'
import {
  bikittyCycleDamage,
  bikittyCycleDps,
  bikittyCycleMs,
  bikittySegmentCount,
  bikittySegmentDamage,
  bikittySegmentRange,
  clampBikittySegment,
  isBikittySnapSegment,
  isPointInBikittyFan,
  nextBikittySegment,
} from './bikittyCutter.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { UPGRADE_EFFECTS, isUpgradeAvailable } from './upgrades.js'

const base = () => ({ ...WEAPON_CATALOG.bikittyCutter.base })
const wpn = (over = {}) => ({ active: false, level: 0, ...over })

describe('바이키티 커터칼 카탈로그 정본', () => {
  it('기획 확정 스탯을 그대로 담는다', () => {
    const b = WEAPON_CATALOG.bikittyCutter.base
    expect(b).toMatchObject({
      damage: 18,
      cooldown: 2400,
      range: 1.0,
      width: 0.18,
      knockback: 1.8,
      critChance: 0.25,
      critMultiplier: 1.5,
      segments: 8,
      segmentRangeStep: 0.18,
      segmentDamageStep: 0.12,
      snapDamage: 30,
      snapPellets: 8,
      snapArcDeg: 90,
      snapRange: 3.2,
      reloadMs: 1200,
    })
    expect(WEAPON_CATALOG.bikittyCutter.minLevelToAppear).toBe(6)
  })
})

describe('단(segment)별 유효 사거리·유효 위력', () => {
  it('단 0→7에서 사거리가 1.0 → 2.26으로 자란다', () => {
    const w = base()
    expect(bikittySegmentCount(w)).toBe(8)
    expect(bikittySegmentRange(w, 0)).toBeCloseTo(1.0, 10)
    expect(bikittySegmentRange(w, 7)).toBeCloseTo(2.26, 10)

    // 매 단 정확히 +0.18씩 오른다.
    for (let s = 1; s <= 7; s += 1) {
      expect(bikittySegmentRange(w, s) - bikittySegmentRange(w, s - 1)).toBeCloseTo(0.18, 10)
    }
  })

  it('단 0→7에서 위력이 18 → 18×1.84로 자란다', () => {
    const w = base()
    expect(bikittySegmentDamage(w, 0)).toBeCloseTo(18, 10)
    expect(bikittySegmentDamage(w, 7)).toBeCloseTo(18 * 1.84, 10)
    expect(bikittySegmentDamage(w, 7)).toBeCloseTo(33.12, 10)

    // 가산 배율이므로 단당 증가폭은 항상 base damage × 0.12로 일정하다.
    for (let s = 1; s <= 7; s += 1) {
      expect(bikittySegmentDamage(w, s) - bikittySegmentDamage(w, s - 1)).toBeCloseTo(18 * 0.12, 10)
    }
  })

  it('범위를 벗어난 단은 0~7로 clamp된다', () => {
    const w = base()
    expect(clampBikittySegment(-3, w)).toBe(0)
    expect(clampBikittySegment(99, w)).toBe(7)
    expect(bikittySegmentRange(w, 99)).toBeCloseTo(2.26, 10)
    expect(bikittySegmentDamage(w, -1)).toBeCloseTo(18, 10)
  })

  it('8단째(segment 7)에서만 부러지고 그 다음 단은 1단(0)으로 리셋된다', () => {
    const w = base()
    for (let s = 0; s <= 6; s += 1) {
      expect(isBikittySnapSegment(w, s)).toBe(false)
      expect(nextBikittySegment(w, s)).toBe(s + 1)
    }
    expect(isBikittySnapSegment(w, 7)).toBe(true)
    expect(nextBikittySegment(w, 7)).toBe(0)
  })

  it('레벨업으로 segmentRangeStep이 오르면 단별 사거리도 함께 오른다', () => {
    const w = { ...base(), segmentRangeStep: 0.26 }
    expect(bikittySegmentRange(w, 7)).toBeCloseTo(1.0 + 0.26 * 7, 10)
  })
})

describe('사이클 검산 (기획서 §1 위력 계산)', () => {
  it('사이클 총 피해 234.48 / 사이클 시간 20.4s / 단일 대상 DPS ≈ 11.5', () => {
    const w = base()

    // 8타 위력 배수 합 = 8 + 0.12 × (0+1+…+7) = 11.36
    const multiplierSum = 8 + 0.12 * 28
    expect(multiplierSum).toBeCloseTo(11.36, 10)

    // 사이클 총 피해 = 18 × 11.36 + snap 30 = 234.48
    expect(bikittyCycleDamage(w)).toBeCloseTo(18 * 11.36 + 30, 6)
    expect(bikittyCycleDamage(w)).toBeCloseTo(234.48, 6)

    // 사이클 시간 = 8 × 2400ms + reload 1200ms = 20400ms
    expect(bikittyCycleMs(w)).toBe(20400)

    // 단일 대상 DPS ≈ 11.5 (기획서 목표치)
    expect(bikittyCycleDps(w)).toBeCloseTo(11.49, 2)
  })

  it('커터칼 7.4 대비 1.55배, 30cm 자 9.2 대비 1.25배 구간에 든다', () => {
    const dps = bikittyCycleDps(base())
    const boxCutterDps = WEAPON_CATALOG.boxCutter.base.damage / (WEAPON_CATALOG.boxCutter.base.cooldown / 1000)
    const rulerDps = WEAPON_CATALOG.schoolBag.base.damage / (WEAPON_CATALOG.schoolBag.base.cooldown / 1000)

    expect(boxCutterDps).toBeCloseTo(7.38, 2)
    expect(rulerDps).toBeCloseTo(9.23, 2)
    // 기획서 목표 배수 1.55배 / 1.25배 — 반올림 오차 ±0.01 안에 든다.
    expect(dps / boxCutterDps).toBeGreaterThan(1.54)
    expect(dps / boxCutterDps).toBeLessThan(1.56)
    expect(dps / rulerDps).toBeGreaterThan(1.24)
    expect(dps / rulerDps).toBeLessThan(1.26)
  })
})

describe('부러짐 산탄 부채꼴 판정', () => {
  const origin = { x: 0, z: 0 }
  const facing = { x: 0, z: 1 } // +z 정면
  const fan = (point) => isPointInBikittyFan({ origin, facing, point, range: 3.2, arcDeg: 90 })

  it('정면 sanpRange 안은 맞고 바깥은 빠진다', () => {
    expect(fan({ x: 0, z: 3.0 })).toBe(true)
    expect(fan({ x: 0, z: 3.3 })).toBe(false)
  })

  it('90° 부채꼴이므로 정면 기준 ±45° 안만 맞는다', () => {
    // 정확히 44°: 맞음 / 46°: 빠짐 (거리는 둘 다 2.0으로 동일)
    const at = (deg) => ({ x: Math.sin((deg * Math.PI) / 180) * 2, z: Math.cos((deg * Math.PI) / 180) * 2 })
    expect(fan(at(0))).toBe(true)
    expect(fan(at(44))).toBe(true)
    expect(fan(at(-44))).toBe(true)
    expect(fan(at(46))).toBe(false)
    expect(fan(at(-46))).toBe(false)
    expect(fan(at(180))).toBe(false) // 뒤쪽은 절대 안 맞는다
  })

  it('플레이어 발밑에 겹친 적은 각도를 정의할 수 없으므로 포함시킨다', () => {
    expect(fan({ x: 0, z: 0 })).toBe(true)
  })
})

describe('바이키티 커터칼 획득 카드 등장 조건', () => {
  it('커터칼 선행 활성과 Lv.6만 요구하고 계정 해금은 요구하지 않는다', () => {
    expect(UPGRADE_EFFECTS.acquireBikittyCutter).toEqual({
      weapon: 'bikittyCutter',
      kind: 'acquire',
      minLevel: 6,
      requiresActiveWeapon: 'boxCutter',
      skipAccountUnlock: true,
    })
  })

  it('커터칼 미보유면 false, 보유하면 true', () => {
    const withoutBoxCutter = { boxCutter: wpn({ active: false }), bikittyCutter: wpn() }
    const withBoxCutter = { boxCutter: wpn({ active: true, level: 1 }), bikittyCutter: wpn() }

    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireBikittyCutter, 6, withoutBoxCutter)).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireBikittyCutter, 6, withBoxCutter)).toBe(true)
  })

  it('커터칼을 보유해도 Lv.6 미만이면 등장하지 않는다', () => {
    const weapons = { boxCutter: wpn({ active: true, level: 1 }), bikittyCutter: wpn() }
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireBikittyCutter, 5, weapons)).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireBikittyCutter, 6, weapons)).toBe(true)
  })

  it('이미 획득했으면 다시 나오지 않는다', () => {
    const weapons = {
      boxCutter: wpn({ active: true, level: 1 }),
      bikittyCutter: wpn({ active: true, level: 1 }),
    }
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireBikittyCutter, 6, weapons)).toBe(false)
  })

  it('강화 카드 3종은 바이키티 커터칼 보유 시에만 뜬다', () => {
    const owned = { bikittyCutter: wpn({ active: true, level: 1, ...base() }) }
    const notOwned = { bikittyCutter: wpn({ active: false, ...base() }) }

    for (const key of ['bikittyCutterDamage', 'bikittyCutterRange', 'bikittyCutterCrit']) {
      expect(isUpgradeAvailable(UPGRADE_EFFECTS[key], 6, notOwned)).toBe(false)
      expect(isUpgradeAvailable(UPGRADE_EFFECTS[key], 6, owned)).toBe(true)
    }
  })
})
