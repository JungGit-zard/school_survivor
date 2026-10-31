export const BOSS_PASSIVE_ITEM_UI_CAPACITY = 8

// 보스 스킬과 같은 성질의 무기 3종 +5% (세트는 서로소 — getBossPassiveDamageMultiplier는 첫 매칭만 반환).
// B02 통제선: 바닥에 그은 선/링/빛 상자 — 선긋기·벨 8방향 충격파·랜턴 빛 상자.
// B03 왕복 달리기: 달려가 때리고 돌아오거나 튀어다니는 것 — 꼬마 로자리 왕복 사냥꾼·치비코 동반 주자·오니기리 바운스.
// B04 포격·국물 대폭발: 던지고 터지는 급식 — 텀블러·플라스크 웅덩이·지우개 폭탄 폭발.

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
    name: '복도 통제선',
    description: '선긋기·벨·학생용 랜턴 공격력 +5%',
    weaponIds: Object.freeze(['lineDraw', 'bell', 'studentLantern']),
    damageMultiplier: 1.05,
  }),
  b03GymWhistle: Object.freeze({
    id: 'b03GymWhistle',
    bossId: 'B03',
    name: '체육관 호루라기',
    description: '꼬마 로자리·치비코·오니기리 공격력 +5%',
    weaponIds: Object.freeze(['miniRosari', 'chibiko', 'onigiri']),
    damageMultiplier: 1.05,
  }),
  b04ServingLadle: Object.freeze({
    id: 'b04ServingLadle',
    bossId: 'B04',
    name: '급식 국자',
    description: '텀블러·과학 플라스크·지우개 폭탄 공격력 +5%',
    weaponIds: Object.freeze(['tumbler', 'scienceFlask', 'eraserBomb']),
    damageMultiplier: 1.05,
  }),
})

const B01_SET_SQUARE_ID = 'b01SetSquare'
const B02_CORRIDOR_PASS_ID = 'b02CorridorPass'
const B03_GYM_WHISTLE_ID = 'b03GymWhistle'
const B04_SERVING_LADLE_ID = 'b04ServingLadle'

export function normalizeBossPassiveUnlocks(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out = {}
  if (value[B01_SET_SQUARE_ID] === true) out[B01_SET_SQUARE_ID] = true
  if (value[B02_CORRIDOR_PASS_ID] === true) out[B02_CORRIDOR_PASS_ID] = true
  if (value[B03_GYM_WHISTLE_ID] === true) out[B03_GYM_WHISTLE_ID] = true
  if (value[B04_SERVING_LADLE_ID] === true) out[B04_SERVING_LADLE_ID] = true
  return out
}

export function isBossPassiveItemUnlocked(unlocks, itemId) {
  return normalizeBossPassiveUnlocks(unlocks)[itemId] === true
}

export function unlockBossPassiveItem(unlocks, itemId) {
  if (![B01_SET_SQUARE_ID, B02_CORRIDOR_PASS_ID, B03_GYM_WHISTLE_ID, B04_SERVING_LADLE_ID].includes(itemId)) return normalizeBossPassiveUnlocks(unlocks)
  return { ...normalizeBossPassiveUnlocks(unlocks), [itemId]: true }
}

export function getBossPassiveDamageMultiplier(weaponId, unlocks) {
  for (const item of Object.values(BOSS_PASSIVE_ITEMS)) {
    if (isBossPassiveItemUnlocked(unlocks, item.id) && item.weaponIds?.includes(weaponId)) return item.damageMultiplier
  }
  return 1
}

// 이 함수는 카탈로그의 원본 base weapon에 한 번만 적용한다. 반환값에는 적용 배수를 남겨
// 같은 런타임 객체에 다시 호출해도 1.05 × 1.05가 되지 않는다.
export function applyBossPassiveDamageToBaseWeapon(weaponId, weapon, unlocks) {
  const multiplier = getBossPassiveDamageMultiplier(weaponId, unlocks)
  if (!weapon || typeof weapon.damage !== 'number' || multiplier === 1) return weapon
  if (weapon.bossPassiveDamageMultiplier === multiplier) return weapon

  // 설명이 "공격력 +5%"이므로 보조 피해(선긋기 잔류 절단선, 플라스크 웅덩이 틱)도 같이 곱한다(balanceqa 2026-10-31).
  const out = { ...weapon, bossPassiveDamageMultiplier: multiplier }
  for (const key of ['damage', 'lineCrossDamage', 'zoneTickDamage']) {
    if (typeof weapon[key] === 'number') out[key] = Math.round(weapon[key] * multiplier * 1_000_000) / 1_000_000
  }
  return out
}
