import { describe, expect, it } from 'vitest'
import {
  TUMBLER_DENSE_HITS_PER_SECOND,
  consumeTumblerDurability,
  isTumblerDurabilitySpent,
  tumblerDurabilityUptime,
  tumblerSingleTargetUptime,
} from './tumblerDurability.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { UPGRADE_EFFECTS, applyUpgradeToWeapon } from './upgrades.js'
import { estimateWeaponDps } from './playerDpsEstimate.js'

const base = WEAPON_CATALOG.tumbler.base

describe('텀블러 내구력 상태 전이', () => {
  it('유효타마다 1 소모, durability회째에 깨지고 rechargeMs 뒤 재생 시각을 준다', () => {
    let state = { used: 0 }
    for (let hit = 1; hit < 40; hit += 1) {
      state = consumeTumblerDurability({ used: state.used, durability: 40, rechargeMs: 2000, nowMs: 1000 })
      expect(state).toEqual({ used: hit, broken: false, brokenUntilMs: 0 })
    }
    expect(consumeTumblerDurability({ used: 39, durability: 40, rechargeMs: 2000, nowMs: 1000 }))
      .toEqual({ used: 0, broken: true, brokenUntilMs: 3000 })
  })

  it('최대 내구력이 오르면 살아 있는 텀블러도 즉시 더 버틴다 (used 기준 상태)', () => {
    expect(isTumblerDurabilitySpent(40, 40)).toBe(true)
    expect(isTumblerDurabilitySpent(40, 50)).toBe(false)
  })

  it('durability가 없거나 비정상이면 깨지지 않는다', () => {
    expect(consumeTumblerDurability({ used: 999, durability: undefined, rechargeMs: 2000 }).broken).toBe(false)
    expect(isTumblerDurabilitySpent(5, 0)).toBe(false)
  })
})

describe('텀블러 내구력 밸런스 (목표: 장기 지속 화력 10~20% 하향)', () => {
  const uptime = (h, durability = base.durability) =>
    tumblerDurabilityUptime({ durability, rechargeMs: base.rechargeMs, hitsPerSecond: h })

  it('Lv1 밀집 군중(4타/s)은 83.3% — 손실 16.7%로 목표 범위 안', () => {
    expect(TUMBLER_DENSE_HITS_PER_SECOND).toBe(4)
    expect(uptime(4)).toBeCloseTo(10 / 12, 10)
    expect(1 - uptime(4)).toBeGreaterThanOrEqual(0.10)
    expect(1 - uptime(4)).toBeLessThanOrEqual(0.20)
  })

  it('Lv1 마틸다 단일 대상(2.5타/s)은 88.9%, 드문드문(1.5타/s)은 93%', () => {
    expect(uptime(2.5)).toBeCloseTo(16 / 18, 10)
    expect(uptime(1.5)).toBeCloseTo((40 / 1.5) / (40 / 1.5 + 2), 10)
  })

  it('텀블러 카드 4종이 전부 내구력 +10을 주고, 만렙 80이면 밀집 손실이 9.1%로 준다', () => {
    let w = { ...base, active: true, level: 1 }
    for (const key of ['tumblerDamage', 'tumblerPower', 'tumblerCount', 'tumblerCrit']) {
      expect(UPGRADE_EFFECTS[key].bonus).toEqual({ stat: 'durability', step: 10 })
      w = applyUpgradeToWeapon(w, UPGRADE_EFFECTS[key])
    }
    expect(w.durability).toBe(80)
    expect(w.rechargeMs).toBe(2000)
    expect(uptime(4, 80)).toBeCloseTo(20 / 22, 10)
  })
})

describe('마틸다 HP 추정기(estimateWeaponDps)에 내구력 가동률이 곱해진다', () => {
  const lv1 = { ...base, active: true, level: 1 }
  const lvMax = { ...lv1, level: 5, damage: 11.4, count: 2, critChance: 0.06, durability: 80 }
  const withoutDurability = (w) => {
    const { durability, rechargeMs, ...rest } = w
    return rest
  }

  it('단일 대상 가동률: Lv1 16/18, 만렙(2개가 2.5타/s를 나눠 받음) 64/66', () => {
    expect(tumblerSingleTargetUptime(lv1)).toBeCloseTo(16 / 18, 10)
    expect(tumblerSingleTargetUptime(lvMax)).toBeCloseTo(64 / 66, 10)
  })

  it('Lv1 12.24 → 10.88, 만렙 23.48 → 22.77', () => {
    expect(estimateWeaponDps(withoutDurability(lv1))).toBeCloseTo(12.24, 2)
    expect(estimateWeaponDps(lv1)).toBeCloseTo(12.24 * 16 / 18, 6)
    expect(estimateWeaponDps(lv1)).toBeCloseTo(10.88, 2)
    expect(estimateWeaponDps(withoutDurability(lvMax))).toBeCloseTo(23.48, 2)
    expect(estimateWeaponDps(lvMax)).toBeCloseTo(22.77, 2)
  })

  it('내구력 필드가 없는 다른 무기는 영향 없다', () => {
    for (const [id, entry] of Object.entries(WEAPON_CATALOG)) {
      if (id === 'tumbler') continue
      expect(entry.base.durability).toBeUndefined()
    }
  })
})
