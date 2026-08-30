import { describe, it, expect, beforeEach } from 'vitest'
import { applyChibikoAllWeaponBoost, applyUpgradeToWeapon, applyUpgradeWithChibikoBoost, isUpgradeAvailable, selectSequentialLevelupChoices, UPGRADE_EFFECTS } from './upgrades.js'
import { WEAPON_CATALOG, getAccountUnlockableWeaponIds, getAllWeaponIds } from './weaponCatalog.js'
import { _resetForTests as resetWeaponUnlocksForTests, setUnlocked } from './weaponUnlocks.js'

// 가상 무기 상태 빌더. weapons 객체의 한 항목 형태와 동일.
const wpn = (overrides = {}) => ({ active: false, level: 0, damage: 5, ...overrides })

describe('sequential rotating level-up choices', () => {
  it('synthetic 20 eligible acquire items appear exactly once across the first five four-card screens', () => {
    const orderedKeys = Array.from({ length: 20 }, (_, index) => `acquire-${index + 1}`)
    let exposedAcquireKeys = []
    const displayed = []

    for (let screen = 0; screen < 5; screen += 1) {
      const result = selectSequentialLevelupChoices({
        orderedKeys,
        availableKeys: orderedKeys,
        exposedAcquireKeys,
        isAcquireKey: () => true,
      })
      displayed.push(...result.choiceKeys)
      exposedAcquireKeys = result.nextExposedAcquireKeys
    }

    expect(displayed).toEqual(orderedKeys)
    expect(new Set(displayed)).toHaveLength(20)
    expect(selectSequentialLevelupChoices({
      orderedKeys,
      availableKeys: orderedKeys,
      exposedAcquireKeys,
      isAcquireKey: () => true,
    })).toMatchObject({ choiceKeys: orderedKeys.slice(0, 4), cycleWrapped: true })
  })

  it('active/locked removal does not skip later unexposed acquire items', () => {
    const orderedKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const first = selectSequentialLevelupChoices({ orderedKeys, availableKeys: orderedKeys, isAcquireKey: () => true })
    const second = selectSequentialLevelupChoices({
      orderedKeys,
      availableKeys: ['B', 'C', 'D', 'E', 'F', 'G', 'H'],
      exposedAcquireKeys: first.nextExposedAcquireKeys,
      isAcquireKey: () => true,
    })
    expect(first.choiceKeys).toEqual(['A', 'B', 'C', 'D'])
    expect(second.choiceKeys).toEqual(['E', 'F', 'G', 'H'])
  })

  it('pending guarantees are first, consume no duplicate slot, and normal upgrades fill only remaining slots', () => {
    const result = selectSequentialLevelupChoices({
      orderedKeys: ['g1', 'a1', 'a2', 'general1', 'general2'],
      availableKeys: ['g1', 'a1', 'a2', 'general1', 'general2'],
      pendingGuaranteedKeys: ['g1', 'a2'],
      isAcquireKey: (key) => ['g1', 'a1', 'a2'].includes(key),
      getChoiceGroupKey: (key) => (key === 'a1' || key === 'a2' ? 'weapon:shared' : key),
    })
    expect(result.choiceKeys).toEqual(['g1', 'a2', 'general1', 'general2'])
    expect(result.displayedGuaranteedKeys).toEqual(['g1', 'a2'])
    expect(result.nextExposedAcquireKeys).toEqual(['g1', 'a2'])
  })

  it('keeps stable general-upgrade order when fewer than four acquire candidates are eligible', () => {
    expect(selectSequentialLevelupChoices({
      orderedKeys: ['acquire1', 'general1', 'general2', 'general3'],
      availableKeys: ['acquire1', 'general1', 'general2', 'general3'],
      isAcquireKey: (key) => key === 'acquire1',
    }).choiceKeys).toEqual(['acquire1', 'general1', 'general2', 'general3'])
  })

  it('records every displayed account-unlocked weapon before any group repeats', () => {
    const weaponKeys = getAccountUnlockableWeaponIds()
    expect(weaponKeys).toHaveLength(17)
    expect(weaponKeys.every((weaponId) => Object.values(UPGRADE_EFFECTS).some((effect) => effect.weapon === weaponId))).toBe(true)
    let weaponCycleIds = []
    const displayed = []

    for (let screen = 0; screen < 5; screen += 1) {
      const result = selectSequentialLevelupChoices({
        orderedKeys: [...weaponKeys, 'health'],
        availableKeys: [...weaponKeys, 'health'],
        weaponCycleIds,
        rotationWeaponIds: weaponKeys,
        getWeaponCycleId: (key) => weaponKeys.includes(key) ? key : null,
      })
      displayed.push(...result.choiceKeys.filter((key) => weaponKeys.includes(key)))
      weaponCycleIds = result.nextWeaponCycleIds
    }

    expect(displayed).toEqual(weaponKeys)
    expect(new Set(displayed)).toHaveLength(17)
  })

  it('uses displayed groups, excludes locked IDs, and wraps only after the account-unlocked list completes', () => {
    const groupFor = (key) => ({ a: 'A', b: 'B', c: 'C' })[key] ?? null
    const first = selectSequentialLevelupChoices({
      orderedKeys: ['a', 'b', 'c', 'health'],
      availableKeys: ['a', 'b', 'c', 'health'],
      weaponCycleIds: ['A', 'locked'],
      rotationWeaponIds: ['A', 'B', 'C'],
      getWeaponCycleId: groupFor,
    })
    expect(first.choiceKeys).toEqual(['b', 'c', 'health'])
    expect(first.nextWeaponCycleIds).toEqual(['A', 'B', 'C'])
    expect(selectSequentialLevelupChoices({
      orderedKeys: ['a', 'b', 'c', 'health'],
      availableKeys: ['a', 'b', 'c', 'health'],
      weaponCycleIds: first.nextWeaponCycleIds,
      rotationWeaponIds: ['A', 'B', 'C'],
      getWeaponCycleId: groupFor,
    }).choiceKeys).toEqual(['a', 'b', 'c', 'health'])
  })

  it('does not let a pending guarantee bypass the displayed-weapon rotation', () => {
    expect(selectSequentialLevelupChoices({
      orderedKeys: ['a', 'b', 'health'],
      availableKeys: ['a', 'b', 'health'],
      pendingGuaranteedKeys: ['a'],
      weaponCycleIds: ['A'],
      rotationWeaponIds: ['A', 'B'],
      getWeaponCycleId: (key) => ({ a: 'A', b: 'B' })[key] ?? null,
    })).toMatchObject({ choiceKeys: ['b', 'health'], displayedGuaranteedKeys: [] })
  })
})

describe('applyUpgradeToWeapon', () => {
  it('커터칼과 바이키티 커터칼 피해 강화는 기존 수치의 정확히 2배다', () => {
    expect(UPGRADE_EFFECTS.boxCutterDamage.dmg).toBe(16.4)
    expect(UPGRADE_EFFECTS.boxCutterPower.dmg).toBe(16.4)
    expect(UPGRADE_EFFECTS.bikittyCutterDamage.dmg).toBe(14)
    expect(UPGRADE_EFFECTS.bikittyCutterPower.dmg).toBe(14)
  })

  it('치비코는 연속형 무기 능력을 10% 강화하고 쿨타임은 10% 줄인다', () => {
    const out = applyChibikoAllWeaponBoost({ damage: 10, range: 2, cooldown: 1000, projectileCount: 1 })

    expect(out).toMatchObject({ damage: 11, range: 2.2, cooldown: 900, projectileCount: 1 })
  })

  it('치비코 강화 상태에서 레벨업한 증가분에도 같은 보너스를 유지한다', () => {
    const boosted = applyChibikoAllWeaponBoost({ active: true, level: 1, damage: 10 })
    const out = applyUpgradeWithChibikoBoost(boosted, { kind: 'damage', dmg: 5 }, 0.1)

    expect(out.damage).toBe(16.5)
    expect(out.chibikoBoostPercent).toBe(0.1)
  })

  it('연필 데미지 카드 두 장이 각각 +1.2를 올린다 (2026-08-15 레벨 곡선 재조정)', () => {
    // base 2.4(2026-08-01 Stage 2 밸런스) + 1.2 = 3.6. 예전에는 카드가 pencilDamage 한 장(+0.75)뿐이라
    // 만렙까지 키워도 위력이 1.42배밖에 안 올랐다. 두 장 합계 +2.4 = base의 100%로 성장폭 2.0배를 만든다.
    const once = applyUpgradeToWeapon(
      wpn({ active: true, level: 1, damage: WEAPON_CATALOG.pencilThrow.base.damage }),
      UPGRADE_EFFECTS.pencilDamage,
    )
    expect(once.damage).toBeCloseTo(3.6, 10)

    const twice = applyUpgradeToWeapon(once, UPGRADE_EFFECTS.pencilPower)
    expect(twice.damage).toBeCloseTo(4.8, 10)
    expect(twice.damage / WEAPON_CATALOG.pencilThrow.base.damage).toBeCloseTo(2, 10)
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
    expect(afterDamage.damage).toBeCloseTo(12.1, 10)  // 7.5 + 4.6
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
  beforeEach(() => {
    resetWeaponUnlocksForTests()
  })

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
    setUnlocked('bell')
    expect(isUpgradeAvailable({ weapon: 'bell', kind: 'acquire', minLevel: 4 }, 4, { bell: wpn() })).toBe(true)
  })

  it('계정 해금 무기 획득은 최소 레벨을 우회하지 못하지만 8개 보유 시 교체 후보로는 남는다', () => {
    setUnlocked('starlink')
    const weaponsAtCap = { ...ownedWeapons(8), starlink: wpn({ active: false }) }

    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireStarlink, 2, { starlink: wpn({ active: false }) })).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireStarlink, 8, weaponsAtCap)).toBe(true)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireStarlink, 8, {
      ...ownedWeapons(7),
      starlink: wpn({ active: false }),
    })).toBe(true)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireCompassBlade, 2, {
      compassBlade: wpn({ active: false }),
    })).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireBikittyCutter, 2, {
      boxCutter: wpn({ active: true }),
      bikittyCutter: wpn({ active: false }),
    })).toBe(false)
  })

  it('계정 해금된 치비코 획득도 Lv.8 전에는 불가하고 Lv.8부터 가능하다', () => {
    setUnlocked('chibiko')
    const weapons = { chibiko: wpn({ active: false }) }
    expect(UPGRADE_EFFECTS.acquireChibiko).toMatchObject({ weapon: 'chibiko', kind: 'acquire', minLevel: 8 })
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireChibiko, 2, weapons)).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireChibiko, 8, weapons)).toBe(true)
  })

  it('하나코 획득은 치비코 선행 활성만 요구하고 계정 해금과 독립 레벨 게이트는 요구하지 않는다', () => {
    expect(UPGRADE_EFFECTS.acquireHanako).toEqual({
      weapon: 'hanako',
      kind: 'acquire',
      requiresActiveWeapon: 'chibiko',
      skipAccountUnlock: true,
    })
    expect(UPGRADE_EFFECTS.acquireHanako).not.toHaveProperty('minLevel')

    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireHanako, 1, {
      chibiko: wpn({ active: false }),
      hanako: wpn({ active: false }),
    })).toBe(false)
  })

  it('하나코 획득은 치비코 활성 후 Lv.1에서 가능하고 하나코 활성 후에는 다시 나오지 않는다', () => {
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireHanako, 1, {
      chibiko: wpn({ active: true, level: 1 }),
      hanako: wpn({ active: false }),
    })).toBe(true)

    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireHanako, 1, {
      chibiko: wpn({ active: true, level: 1 }),
      hanako: wpn({ active: true, level: 1 }),
    })).toBe(false)
  })

  it('unlock: 이미 active이면 false', () => {
    expect(isUpgradeAvailable(
      { weapon: 'bell', kind: 'acquire' }, 10,
      { bell: wpn({ active: true }) },
    )).toBe(false)
  })

  // bell은 Stage 1 클리어 계정 해금 무기다. 8종 보유 상한에 도달해도 교체 프롬프트 후보로는 남아야 한다.
  it('unlock: 8종 보유 상한 도달 시 true', () => {
    setUnlocked('bell')
    const weapons = { ...ownedWeapons(8), bell: wpn({ active: false }) }
    expect(isUpgradeAvailable({ weapon: 'bell', kind: 'acquire' }, 10, weapons)).toBe(true)
  })

  it('unlock: 3종 보유면 가능', () => {
    setUnlocked('bell')
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
      dmg: 10.4,
    })
    expect(UPGRADE_EFFECTS.sharkMissilePower).toMatchObject({
      weapon: 'sharkMissile',
      kind: 'damage',
      dmg: 10.4,
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
        chanceStep: id === 'boxCutterCrit' ? 0.04 : 0.02,
        multStep: 0.75,
        multCap: 4.5,
      })
    }

    expect(UPGRADE_EFFECTS.missileCrit).toBeUndefined()
    expect(UPGRADE_EFFECTS.sharkMissileCrit).toBeUndefined()
    expect(UPGRADE_EFFECTS.umbrellaCrit).toBeUndefined()
    expect(UPGRADE_EFFECTS.eraserCrit).toBeUndefined()
  })

  it('오니기리 데미지 카드 두 장이 base 52.5의 약 85%를 채운다', () => {
    // 예전에는 "기존 5의 1.3배 = 6.5" 한 장뿐이었다. 2026-08-15 레벨 곡선 재조정에서
    // 8.9 × 2장 = 17.8 (base 21의 84.8%)로 바꿔 만렙 성장폭 2.0배를 만든다.
    expect(UPGRADE_EFFECTS.onigiiriDamage).toMatchObject({ weapon: 'onigiri', kind: 'damage', dmg: 22.25 })
    expect(UPGRADE_EFFECTS.onigiiriPower).toMatchObject({ weapon: 'onigiri', kind: 'damage', dmg: 22.25 })
  })

  // 회귀 방어(2026-08-15): 예전에는 19종 전부 데미지 카드가 정확히 1장뿐이라, 레벨업 절반이
  // 단일 대상 기준 체감 0이고 만렙 성장폭이 1.31~1.61배에 그쳤다. 카드가 다시 한 장으로
  // 줄면 그 곡선으로 되돌아간다. 이누콘은 2026-08-21 추가된 생존 보조 동반자라 데미지 카드가 없다.
  it('피해를 주는 무기는 전부 데미지 카드를 갖고, 힐/유틸 동반자만 예외다', () => {
    const damageCardCount = {}
    for (const id of getAllWeaponIds()) damageCardCount[id] = 0
    for (const effect of Object.values(UPGRADE_EFFECTS)) {
      if (effect.kind === 'damage') damageCardCount[effect.weapon] += 1
    }

    // 힐/유틸 전용 동반자 하나코·이누콘만 데미지 카드가 없다.
    expect(Object.keys(damageCardCount).filter((id) => damageCardCount[id] === 0).sort()).toEqual(['hanako', 'inucon'])
    // 랜턴·치비코는 광역/버프 역할이라 1장, 나머지 주력 16종은 2장이다.
    expect(Object.keys(damageCardCount).filter((id) => damageCardCount[id] === 1).sort())
      .toEqual(['chibiko', 'studentLantern'])
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

    it(`${weapon}: 영구 강화 없이 런 크리 4픽만 → critChance=base+(chanceStep×4), critMultiplier=4.5`, () => {
      const effect = UPGRADE_EFFECTS[key]
      const base = WEAPON_CATALOG[weapon].base
      let w = wpn({ active: true, level: 1, critChance: base.critChance, critMultiplier: base.critMultiplier })

      for (let i = 0; i < 4; i++) {
        w = applyUpgradeToWeapon(w, effect)
      }

      expect(w.critChance).toBeCloseTo(base.critChance + effect.chanceStep * 4, 5)
      expect(w.critMultiplier).toBeCloseTo(4.5, 5)
    })
  }
})
