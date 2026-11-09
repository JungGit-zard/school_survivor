import { describe, expect, it } from 'vitest'
import {
  BOSS_PASSIVE_ITEMS,
  BOSS_PASSIVE_ITEM_UI_CAPACITY,
  applyBossPassiveDamageToBaseWeapon,
  getBossPassiveDamageMultiplier,
  getBossPassiveItemIdForBoss,
  isBossPassiveItemUnlocked,
  normalizeBossPassiveUnlocks,
  unlockBossPassiveItem,
} from './bossPassiveItems.js'

describe('B01 boss passive item catalog', () => {
  it('defines 삼각자 as the first of eight boss passive slots', () => {
    expect(BOSS_PASSIVE_ITEM_UI_CAPACITY).toBe(8)
    expect(BOSS_PASSIVE_ITEMS.b01SetSquare).toMatchObject({
      id: 'b01SetSquare',
      bossId: 'B01',
      name: '삼각자',
      description: '커터칼·30cm 자·바이키티 공격력 +5%',
      weaponIds: ['boxCutter', 'schoolBag', 'bikittyCutter'],
      damageMultiplier: 1.05,
    })
  })

  it('accepts only the currently implemented B01 unlock flag', () => {
    expect(normalizeBossPassiveUnlocks({ b01SetSquare: true, futureBossItem: true })).toEqual({ b01SetSquare: true })
    expect(isBossPassiveItemUnlocked({ b01SetSquare: 1 }, 'b01SetSquare')).toBe(false)
    expect(unlockBossPassiveItem({}, 'b01SetSquare')).toEqual({ b01SetSquare: true })
    expect(unlockBossPassiveItem({ b01SetSquare: true }, 'b02Unknown')).toEqual({ b01SetSquare: true })
  })

  it('raises damage by exactly five percent only for the three target weapons', () => {
    const unlocks = { b01SetSquare: true }

    expect(getBossPassiveDamageMultiplier('boxCutter', unlocks)).toBe(1.05)
    expect(getBossPassiveDamageMultiplier('schoolBag', unlocks)).toBe(1.05)
    expect(getBossPassiveDamageMultiplier('bikittyCutter', unlocks)).toBe(1.05)
    expect(getBossPassiveDamageMultiplier('tumbler', unlocks)).toBe(1)
    expect(applyBossPassiveDamageToBaseWeapon('boxCutter', { damage: 24 }, unlocks)).toMatchObject({ damage: 25.2 })
    expect(applyBossPassiveDamageToBaseWeapon('tumbler', { damage: 6 }, unlocks)).toEqual({ damage: 6 })
  })

  it.each([
    ['b02CorridorPass', 'B02', '복도 통제선', '선긋기·벨·학생용 랜턴 공격력 +5%', ['lineDraw', 'bell', 'studentLantern']],
    ['b03GymWhistle', 'B03', '체육관 호루라기', '꼬마 로자리·치비코·오니기리 공격력 +5%', ['miniRosari', 'chibiko', 'onigiri']],
    ['b04ServingLadle', 'B04', '급식 국자', '텀블러·과학 플라스크·지우개 폭탄 공격력 +5%', ['tumbler', 'scienceFlask', 'eraserBomb']],
  ])('defines %s as a +5%% damage passive for its three weapons only', (id, bossId, name, description, weaponIds) => {
    const unlocks = { [id]: true }
    expect(BOSS_PASSIVE_ITEMS[id]).toMatchObject({ id, bossId, name, description, weaponIds, damageMultiplier: 1.05 })
    expect(normalizeBossPassiveUnlocks({ [id]: true, futureBossItem: true })).toEqual({ [id]: true })
    for (const weaponId of weaponIds) expect(getBossPassiveDamageMultiplier(weaponId, unlocks)).toBe(1.05)
    expect(getBossPassiveDamageMultiplier('boxCutter', unlocks)).toBe(1)
    expect(getBossPassiveDamageMultiplier('pencilThrow', unlocks)).toBe(1)
  })

  it('scales the secondary damage fields of line draw and flask with the same multiplier', () => {
    expect(applyBossPassiveDamageToBaseWeapon('lineDraw', { damage: 20, lineCrossDamage: 14 }, { b02CorridorPass: true }))
      .toMatchObject({ damage: 21, lineCrossDamage: 14.7 })
    expect(applyBossPassiveDamageToBaseWeapon('scienceFlask', { damage: 7.5, zoneTickDamage: 2.4 }, { b04ServingLadle: true }))
      .toMatchObject({ damage: 7.875, zoneTickDamage: 2.52 })
  })

  it.each([
    ['b10ApprovalStamp', 'B10', '교감 결재 도장', '연필·오리요강·하나코 공격력 +5%', ['pencilThrow', 'compassBlade', 'hanako']],
    ['b05PrincipalMic', 'B05', '교장 훈화 마이크', '전기·고장난 스타링크·우산 방어막 공격력 +5%', ['stunGun', 'starlink', 'umbrellaGuard']],
  ])('Stage 5·6 boss passive %s (%s) is +5%% on its three weapons only', (id, bossId, name, description, weaponIds) => {
    const unlocks = { [id]: true }
    expect(BOSS_PASSIVE_ITEMS[id]).toMatchObject({ id, bossId, name, description, weaponIds, damageMultiplier: 1.05 })
    expect(getBossPassiveItemIdForBoss(bossId)).toBe(id)
    expect(normalizeBossPassiveUnlocks({ [id]: true, futureBossItem: true })).toEqual({ [id]: true })
    expect(unlockBossPassiveItem({ b01SetSquare: true }, id)).toEqual({ b01SetSquare: true, [id]: true })
    for (const weaponId of weaponIds) expect(getBossPassiveDamageMultiplier(weaponId, unlocks)).toBe(1.05)
    for (const other of ['boxCutter', 'lineDraw', 'onigiri', 'tumbler', 'guidedMissile', 'sharkMissile', 'inucon']) {
      expect(getBossPassiveDamageMultiplier(other, unlocks), other).toBe(1)
    }
  })

  it('spec checks: compassBlade with B10 stamp and stunGun with B05 mic are exactly 1.05', () => {
    expect(getBossPassiveDamageMultiplier('compassBlade', { b10ApprovalStamp: true })).toBe(1.05)
    expect(getBossPassiveDamageMultiplier('stunGun', { b05PrincipalMic: true })).toBe(1.05)
    expect(getBossPassiveDamageMultiplier('stunGun', { b10ApprovalStamp: true })).toBe(1)
  })

  it('maps each boss to its passive; bosses without one get null', () => {
    expect(['B01', 'B02', 'B03', 'B04', 'B10', 'B05'].map(getBossPassiveItemIdForBoss))
      .toEqual(['b01SetSquare', 'b02CorridorPass', 'b03GymWhistle', 'b04ServingLadle', 'b10ApprovalStamp', 'b05PrincipalMic'])
    for (const bossId of ['B06', 'B07', 'B08', 'B09', 'E01', '', undefined, 'constructor', '__proto__']) {
      expect(getBossPassiveItemIdForBoss(bossId), String(bossId)).toBeNull()
    }
  })

  it('keeps the six boss passive weapon sets disjoint and leaves the missiles out', () => {
    const all = Object.values(BOSS_PASSIVE_ITEMS).flatMap((item) => item.weaponIds)
    expect(all).toHaveLength(18)
    expect(new Set(all).size).toBe(all.length)
    for (const missile of ['guidedMissile', 'sharkMissile']) expect(all).not.toContain(missile)
    expect(Object.keys(BOSS_PASSIVE_ITEMS).length).toBeLessThanOrEqual(BOSS_PASSIVE_ITEM_UI_CAPACITY)
  })

  it('does not multiply the same runtime weapon twice', () => {
    const once = applyBossPassiveDamageToBaseWeapon('schoolBag', { damage: 12 }, { b01SetSquare: true })
    const twice = applyBossPassiveDamageToBaseWeapon('schoolBag', once, { b01SetSquare: true })

    expect(once.damage).toBe(12.6)
    expect(twice).toBe(once)
    expect(twice.damage).toBe(12.6)
  })
})
