import { describe, it, expect } from 'vitest'
import { applyUpgradeToWeapon, isUpgradeAvailable, UPGRADE_EFFECTS } from './upgrades.js'

// 가상 무기 상태 빌더. weapons 객체의 한 항목 형태와 동일.
const wpn = (overrides = {}) => ({ active: false, level: 0, damage: 5, ...overrides })

describe('applyUpgradeToWeapon', () => {
  it('unlock effect: active=true, level=1로 초기화', () => {
    const out = applyUpgradeToWeapon(wpn(), { kind: 'acquire' })
    expect(out.active).toBe(true)
    expect(out.level).toBe(1)
  })

  it('damage effect: damage += dmg, level bump', () => {
    const out = applyUpgradeToWeapon(wpn({ active: true, level: 1, damage: 10 }), { kind: 'damage', dmg: 3 })
    expect(out.damage).toBe(13)
    expect(out.level).toBe(2)
  })

  it('damage effect: level 5에서 더 안 올라감 (cap)', () => {
    const out = applyUpgradeToWeapon(wpn({ active: true, level: 5, damage: 20 }), { kind: 'damage', dmg: 3 })
    expect(out.damage).toBe(23)
    expect(out.level).toBe(5)
  })

  it('stat effect: stat += step, level bump', () => {
    const out = applyUpgradeToWeapon(wpn({ active: true, level: 1, projectileCount: 1 }), {
      kind: 'stat', stat: 'projectileCount', step: 1, cap: 4,
    })
    expect(out.projectileCount).toBe(2)
    expect(out.level).toBe(2)
  })

  it('stat effect: cap에서 더 안 올라감', () => {
    const out = applyUpgradeToWeapon(wpn({ active: true, level: 3, projectileCount: 4 }), {
      kind: 'stat', stat: 'projectileCount', step: 1, cap: 4,
    })
    expect(out.projectileCount).toBe(4)
  })

  it('stat effect: undefined stat에서 시작 (default 0)', () => {
    const out = applyUpgradeToWeapon(wpn({ active: true, level: 1 }), {
      kind: 'stat', stat: 'pierce', step: 1, cap: 3,
    })
    expect(out.pierce).toBe(1)
  })

  it('bonus 필드: 주 효과와 함께 부가 스탯도 증가 (플라스크 존 지속 +1s/레벨)', () => {
    const flask = wpn({ active: true, level: 1, damage: 7.5, zoneDurationMs: 5000, radius: 1.6 })

    const afterDamage = applyUpgradeToWeapon(flask, UPGRADE_EFFECTS.flaskDamage)
    expect(afterDamage.damage).toBe(11.5)          // 7.5 + 4 (착탄 능력 절반)
    expect(afterDamage.zoneDurationMs).toBe(6000)  // 레벨업 → 존 +1초

    const afterRadius = applyUpgradeToWeapon(afterDamage, UPGRADE_EFFECTS.flaskRadius)
    expect(afterRadius.zoneDurationMs).toBe(7000)  // 어느 카드든 존 +1초
    expect(afterRadius.radius).toBeCloseTo(1.78)
  })

  it('bonus 없는 effect는 기존과 동일하게 동작', () => {
    const out = applyUpgradeToWeapon(wpn({ active: true, level: 1, damage: 10 }), { kind: 'damage', dmg: 3 })
    expect(out.zoneDurationMs).toBeUndefined()
  })
})

describe('isUpgradeAvailable', () => {
  const ownedWeapons = (n) => {
    const w = {}
    for (let i = 0; i < n; i++) w[`weapon${i}`] = wpn({ active: true, level: 1 })
    return w
  }

  it('player kind: 항상 사용 가능', () => {
    expect(isUpgradeAvailable({ kind: 'player' }, 1, {})).toBe(true)
  })

  it('minLevel 미달: false', () => {
    expect(isUpgradeAvailable({ weapon: 'bell', kind: 'acquire', minLevel: 4 }, 3, {})).toBe(false)
  })

  it('minLevel 도달: true', () => {
    expect(isUpgradeAvailable({ weapon: 'bell', kind: 'acquire', minLevel: 4 }, 4, { bell: wpn() })).toBe(true)
  })

  it('치비코 획득은 Lv.8 최고 레벨 카드로만 가능', () => {
    const weapons = { chibiko: wpn({ active: false }) }
    expect(UPGRADE_EFFECTS.acquireChibiko).toMatchObject({ weapon: 'chibiko', kind: 'acquire', minLevel: 8 })
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireChibiko, 7, weapons)).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireChibiko, 8, weapons)).toBe(true)
  })

  it('unlock: 이미 active이면 false', () => {
    expect(isUpgradeAvailable(
      { weapon: 'bell', kind: 'acquire' }, 10,
      { bell: wpn({ active: true }) },
    )).toBe(false)
  })

  // 'bell'은 starter (weaponCatalog) → isWeaponUnlocked 항상 true. 가상 candidate 무기는 unlock 게이트에 막힘.
  it('unlock: 4종 보유 상한 도달 시 false', () => {
    const weapons = { ...ownedWeapons(8), bell: wpn({ active: false }) }
    expect(isUpgradeAvailable({ weapon: 'bell', kind: 'acquire' }, 10, weapons)).toBe(false)
  })

  it('unlock: 3종 보유면 가능', () => {
    const weapons = { ...ownedWeapons(7), bell: wpn({ active: false }) }
    expect(isUpgradeAvailable({ weapon: 'bell', kind: 'acquire' }, 10, weapons)).toBe(true)
  })

  it('unlock: 카탈로그 미해금 무기(account-unlock 게이트)는 false', () => {
    // compassBlade는 starter 아니고 weaponUnlocks에 없음 → 미해금
    const weapons = { ...ownedWeapons(2), compassBlade: wpn({ active: false }) }
    expect(isUpgradeAvailable({ weapon: 'compassBlade', kind: 'acquire' }, 10, weapons)).toBe(false)
  })

  it('damage: 무기 비활성이면 false', () => {
    expect(isUpgradeAvailable(
      { weapon: 'bell', kind: 'damage', dmg: 3 }, 10,
      { bell: wpn({ active: false }) },
    )).toBe(false)
  })

  it('damage: 무기 Lv5 도달 시 false', () => {
    expect(isUpgradeAvailable(
      { weapon: 'bell', kind: 'damage', dmg: 3 }, 10,
      { bell: wpn({ active: true, level: 5 }) },
    )).toBe(false)
  })

  it('stat: stat cap 도달 시 false', () => {
    expect(isUpgradeAvailable(
      { weapon: 'pencil', kind: 'stat', stat: 'pierce', step: 1, cap: 3 }, 10,
      { pencil: wpn({ active: true, level: 2, pierce: 3 }) },
    )).toBe(false)
  })

  it('stat: cap 미달이면 true', () => {
    expect(isUpgradeAvailable(
      { weapon: 'pencil', kind: 'stat', stat: 'pierce', step: 1, cap: 3 }, 10,
      { pencil: wpn({ active: true, level: 2, pierce: 1 }) },
    )).toBe(true)
  })
})

describe('UPGRADE_EFFECTS 테이블 무결성', () => {
  it('모든 항목이 kind를 가짐', () => {
    for (const [id, eff] of Object.entries(UPGRADE_EFFECTS)) {
      expect(eff.kind, `${id} missing kind`).toBeDefined()
    }
  })

  it('weapon 키가 있는 항목은 weapon 식별자 보유', () => {
    for (const [id, eff] of Object.entries(UPGRADE_EFFECTS)) {
      if (eff.kind !== 'player') {
        expect(eff.weapon, `${id} missing weapon`).toBeDefined()
      }
    }
  })

  it('stat 항목은 stat / step / cap 모두 보유', () => {
    for (const [id, eff] of Object.entries(UPGRADE_EFFECTS)) {
      if (eff.kind === 'stat') {
        expect(eff.stat, `${id} missing stat`).toBeDefined()
        expect(eff.step, `${id} missing step`).toBeDefined()
        expect(eff.cap, `${id} missing cap`).toBeDefined()
      }
    }
  })

  it('상어미사일 획득/강화 카드를 제공한다', () => {
    expect(UPGRADE_EFFECTS.acquireSharkMissile).toMatchObject({
      weapon: 'sharkMissile',
      kind: 'acquire',
      minLevel: 8,
    })
    expect(UPGRADE_EFFECTS.sharkMissileDamage).toMatchObject({
      weapon: 'sharkMissile',
      kind: 'damage',
      dmg: 10,
    })
    expect(UPGRADE_EFFECTS.sharkMissileRadius).toMatchObject({
      weapon: 'sharkMissile',
      kind: 'stat',
      stat: 'radius',
      step: 0.2,
      cap: 2.6,
    })
  })

  it('오니기리 공격력 레벨업 증가량은 기존 5의 1.3배다', () => {
    expect(UPGRADE_EFFECTS.onigiiriDamage).toMatchObject({
      weapon: 'onigiri',
      kind: 'damage',
      dmg: 6.5,
    })
  })
})
