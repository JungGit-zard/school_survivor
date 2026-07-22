import { describe, it, expect } from 'vitest'
import { applyUpgradeToWeapon, isUpgradeAvailable, UPGRADE_EFFECTS } from './upgrades.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'

// 가상 무기 상태 빌더. weapons 객체의 한 항목 형태와 동일.
const wpn = (overrides = {}) => ({ active: false, level: 0, damage: 5, ...overrides })

describe('applyUpgradeToWeapon', () => {
  it('연필 피해 강화는 절반 수치인 +1.5만 적용한다', () => {
    const out = applyUpgradeToWeapon(
      wpn({ active: true, level: 1, damage: WEAPON_CATALOG.pencilThrow.base.damage }),
      UPGRADE_EFFECTS.pencilDamage,
    )
    expect(out.damage).toBe(4.5)
  })

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

  it('crit effect: 치명타 확률과 배율을 함께 올리고 무기 레벨도 증가', () => {
    const out = applyUpgradeToWeapon(wpn({ active: true, level: 1, critChance: 0.08, critMultiplier: 1.5 }), UPGRADE_EFFECTS.pencilCrit)
    expect(out.critChance).toBe(0.1)
    expect(out.critMultiplier).toBeCloseTo(2.25)
    expect(out.level).toBe(2)
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

  it('stat 항목은 stat / step / cap 모두 보유 (crit 항목은 별도 검증)', () => {
    for (const [id, eff] of Object.entries(UPGRADE_EFFECTS)) {
      if (eff.kind === 'stat') {
        expect(eff.stat, `${id} missing stat`).toBeDefined()
        expect(eff.step, `${id} missing step`).toBeDefined()
        expect(eff.cap, `${id} missing cap`).toBeDefined()
      }
    }
  })

  it('crit 항목은 chanceStep / chanceCap / multStep / multCap 모두 보유', () => {
    for (const [id, eff] of Object.entries(UPGRADE_EFFECTS)) {
      if (eff.kind === 'crit') {
        expect(eff.chanceStep, `${id} missing chanceStep`).toBeDefined()
        expect(eff.chanceCap, `${id} missing chanceCap`).toBeDefined()
        expect(eff.multStep, `${id} missing multStep`).toBeDefined()
        expect(eff.multCap, `${id} missing multCap`).toBeDefined()
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

  it('크리티컬 적용 무기에는 런 중 치명타 확률 강화 카드를 제공하고 폭발 무기는 제외한다', () => {
    const critCardIds = [
      'pencilCrit',
      'bagCrit',
      'boxCutterCrit',
      'tumblerCrit',
      'flaskCrit',
      'bellCrit',
      'stunCrit',
      'onigiiriCrit',
      'starlinkCrit',
      'compassBladeCrit',
      'lanternCrit',
      'chibikoCrit',
    ]

    for (const id of critCardIds) {
      expect(UPGRADE_EFFECTS[id], `${id} missing`).toMatchObject({
        kind: 'crit',
        chanceStep: 0.02,
        multStep: 0.75,
        multCap: 4.5,
      })
    }

    expect(UPGRADE_EFFECTS.missileCrit).toBeUndefined()
    expect(UPGRADE_EFFECTS.sharkMissileCrit).toBeUndefined()
    expect(UPGRADE_EFFECTS.umbrellaCrit).toBeUndefined()
    expect(UPGRADE_EFFECTS.eraserCrit).toBeUndefined()
  })

  it('오니기리 공격력 레벨업 증가량은 기존 5의 1.3배다', () => {
    expect(UPGRADE_EFFECTS.onigiiriDamage).toMatchObject({
      weapon: 'onigiri',
      kind: 'damage',
      dmg: 6.5,
    })
  })
})

describe('GAP-1: 크리 카드 배율 성장 축 통합', () => {
  const CRIT_CARDS = [
    { key: 'pencilCrit', weapon: 'pencilThrow' },
    { key: 'bagCrit', weapon: 'schoolBag' },
    { key: 'boxCutterCrit', weapon: 'boxCutter' },
    { key: 'tumblerCrit', weapon: 'tumbler' },
    { key: 'flaskCrit', weapon: 'scienceFlask' },
    { key: 'bellCrit', weapon: 'bell' },
    { key: 'stunCrit', weapon: 'stunGun' },
    { key: 'onigiiriCrit', weapon: 'onigiri' },
    { key: 'starlinkCrit', weapon: 'starlink' },
    { key: 'compassBladeCrit', weapon: 'compassBlade' },
    { key: 'lanternCrit', weapon: 'studentLantern' },
    { key: 'chibikoCrit', weapon: 'chibiko' },
  ]

  for (const { key, weapon } of CRIT_CARDS) {
    it(`${weapon}: 영구 max 모사(critChance +0.08) + 런 크리 4픽 → chanceCap·multCap(4.5) 도달, 5픽째 불가`, () => {
      const effect = UPGRADE_EFFECTS[key]
      const base = WEAPON_CATALOG[weapon].base

      // 영구 강화 max 모사: weaponPermanentUpgrades 미경유, critChance +0.08만 pre-bake로 흉내낸다.
      let w = wpn({ active: true, level: 1, critChance: base.critChance + 0.08, critMultiplier: base.critMultiplier })

      for (let i = 0; i < 4; i++) {
        expect(isUpgradeAvailable(effect, 10, { [weapon]: w }), `${weapon} pick ${i + 1} should be available`).toBe(true)
        w = applyUpgradeToWeapon(w, effect)
      }

      expect(w.critChance).toBeCloseTo(effect.chanceCap, 5)
      expect(w.critMultiplier).toBeCloseTo(4.5, 5)
      expect(isUpgradeAvailable(effect, 10, { [weapon]: w })).toBe(false)
    })

    it(`${weapon}: 영구 강화 없이 런 크리 4픽만 → critChance=base+0.08, critMultiplier=4.5`, () => {
      const effect = UPGRADE_EFFECTS[key]
      const base = WEAPON_CATALOG[weapon].base
      let w = wpn({ active: true, level: 1, critChance: base.critChance, critMultiplier: base.critMultiplier })

      for (let i = 0; i < 4; i++) {
        w = applyUpgradeToWeapon(w, effect)
      }

      expect(w.critChance).toBeCloseTo(base.critChance + 0.08, 5)
      expect(w.critMultiplier).toBeCloseTo(4.5, 5)
    })
  }
})
