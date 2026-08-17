import { describe, expect, it } from 'vitest'
import {
  TUMBLER_FALLOFF_CYCLE,
  TUMBLER_SUSTAINED_MULTIPLIER,
  tumblerHitMultiplier,
} from './tumblerFalloff.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { estimateWeaponDps } from './playerDpsEstimate.js'

describe('텀블러 연속 타격 감쇠 배율', () => {
  it('5타 주기로 1.00 → 0.60까지 10%씩 깎이고 6타째 1.00으로 복귀한다', () => {
    expect(TUMBLER_FALLOFF_CYCLE).toBe(5)
    // 0-based 타격 순번 0..9 = 사람이 세는 1..10타.
    const first10 = Array.from({ length: 10 }, (_, n) => tumblerHitMultiplier(n))
    first10.forEach((value, n) => {
      expect(value).toBeCloseTo([1.0, 0.9, 0.8, 0.7, 0.6, 1.0, 0.9, 0.8, 0.7, 0.6][n], 10)
    })
    // 0.5는 쓰지 않는다 — 0.6이 바닥이다.
    expect(Math.min(...first10)).toBeCloseTo(0.6, 10)
  })

  it('주기 평균 배율이 0.80이고 카탈로그가 그 값을 그대로 싣는다', () => {
    expect(TUMBLER_SUSTAINED_MULTIPLIER).toBeCloseTo(0.8, 10)
    expect(WEAPON_CATALOG.tumbler.base.sustainedDamageMultiplier).toBe(TUMBLER_SUSTAINED_MULTIPLIER)
    // 감쇠는 타격 구조 변경이다. 발사율과 기본 위력은 손대지 않는다.
    expect(WEAPON_CATALOG.tumbler.base.hitsPerSecond).toBe(2.5)
    expect(WEAPON_CATALOG.tumbler.base.damage).toBe(6)
  })
})

describe('마틸다 HP 파생 입력(estimateWeaponDps)에 감쇠가 반영된다', () => {
  // 마틸다 HP = 스폰 시점 플레이어 DPS × 1800초(Enemies.jsx)라, 추정기가 감쇠를 모르면
  // 텀블러 몫이 25% 부풀고 마틸다만 부당하게 단단해진다.
  const lv1 = () => ({ ...WEAPON_CATALOG.tumbler.base, active: true, level: 1 })
  // 도달 최대: MAX_WEAPON_LEVEL 5 = acquire 이후 카드 4장(tumblerDamage/Power/Count/Crit)
  // → damage 6+2.7+2.7, count 1→2, critChance 0.04+0.02, critMultiplier 1.5+0.75.
  const lvMax = () => ({ ...lv1(), level: 5, damage: 11.4, count: 2, critChance: 0.06, critMultiplier: 2.25 })

  it('감쇠 반영 지속 DPS는 Lv1 12.24, 최대 레벨 24.51이다', () => {
    expect(estimateWeaponDps(lv1())).toBeCloseTo(12.24, 2)
    expect(estimateWeaponDps(lvMax())).toBeCloseTo(24.51, 2)
  })

  it('감쇠 전 대비 정확히 0.80배다 (15.30 → 12.24, 30.64 → 24.51)', () => {
    const noFalloff = (weapon) => {
      const { sustainedDamageMultiplier, ...rest } = weapon
      return estimateWeaponDps(rest)
    }
    expect(noFalloff(lv1())).toBeCloseTo(15.30, 2)
    expect(noFalloff(lvMax())).toBeCloseTo(30.64, 2)
    expect(estimateWeaponDps(lv1()) / noFalloff(lv1())).toBeCloseTo(0.8, 10)
    expect(estimateWeaponDps(lvMax()) / noFalloff(lvMax())).toBeCloseTo(0.8, 10)
  })

  it('다른 무기는 sustainedDamageMultiplier가 없어 보정 1배 그대로다', () => {
    for (const [id, entry] of Object.entries(WEAPON_CATALOG)) {
      if (id === 'tumbler') continue
      expect(entry.base.sustainedDamageMultiplier).toBeUndefined()
    }
    const bell = { ...WEAPON_CATALOG.bell.base, active: true, level: 1 }
    expect(estimateWeaponDps(bell)).toBeCloseTo(10 / 3.2 * (1 + 0.05 * 0.5), 6)
  })
})
