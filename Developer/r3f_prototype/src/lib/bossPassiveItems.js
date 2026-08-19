export const BOSS_PASSIVE_ITEM_UI_CAPACITY = 8

export const BOSS_PASSIVE_ITEMS = Object.freeze({
  b01SetSquare: Object.freeze({
    id: 'b01SetSquare',
    bossId: 'B01',
    name: '삼각자',
    description: '커터칼·30cm 자·바이키티 공격력 +5%',
    weaponIds: Object.freeze(['boxCutter', 'schoolBag', 'bikittyCutter']),
    damageMultiplier: 1.05,
  }),
  b02CorridorPass: Object.freeze({
    id: 'b02CorridorPass',
    bossId: 'B02',
    name: '복도 출입증',
    description: '연필·벨·오니기리 공격력 +5%',
    weaponIds: Object.freeze(['pencilThrow', 'bell', 'onigiri']),
    damageMultiplier: 1.05,
  }),
})

const B01_SET_SQUARE_ID = 'b01SetSquare'
const B02_CORRIDOR_PASS_ID = 'b02CorridorPass'

export function normalizeBossPassiveUnlocks(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out = {}
  if (value[B01_SET_SQUARE_ID] === true) out[B01_SET_SQUARE_ID] = true
  if (value[B02_CORRIDOR_PASS_ID] === true) out[B02_CORRIDOR_PASS_ID] = true
  return out
}

export function isBossPassiveItemUnlocked(unlocks, itemId) {
  return normalizeBossPassiveUnlocks(unlocks)[itemId] === true
}

export function unlockBossPassiveItem(unlocks, itemId) {
  if (itemId !== B01_SET_SQUARE_ID && itemId !== B02_CORRIDOR_PASS_ID) return normalizeBossPassiveUnlocks(unlocks)
  return { ...normalizeBossPassiveUnlocks(unlocks), [itemId]: true }
}

export function getBossPassiveDamageMultiplier(weaponId, unlocks) {
  for (const item of Object.values(BOSS_PASSIVE_ITEMS)) {
    if (isBossPassiveItemUnlocked(unlocks, item.id) && item.weaponIds.includes(weaponId)) return item.damageMultiplier
  }
  return 1
}

// 이 함수는 카탈로그의 원본 base weapon에 한 번만 적용한다. 반환값에는 적용 배수를 남겨
// 같은 런타임 객체에 다시 호출해도 1.05 × 1.05가 되지 않는다.
export function applyBossPassiveDamageToBaseWeapon(weaponId, weapon, unlocks) {
  const multiplier = getBossPassiveDamageMultiplier(weaponId, unlocks)
  if (!weapon || typeof weapon.damage !== 'number' || multiplier === 1) return weapon
  if (weapon.bossPassiveDamageMultiplier === multiplier) return weapon

  return {
    ...weapon,
    damage: Math.round(weapon.damage * multiplier * 1_000_000) / 1_000_000,
    bossPassiveDamageMultiplier: multiplier,
  }
}
