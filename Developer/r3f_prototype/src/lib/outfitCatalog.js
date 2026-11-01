// Rosari wardrobe outfits: unlock conditions + trade-off abilities. Single source of truth.
//
// 정본 기획: levelmini 의상 획득 조건 + 의상 능력 기획서 (balanceqa 검수 반영, 2026-11-01).
// - 외형(색·장식)은 rosariOutfits.js(threemini)가 정본이다. 이 파일은 외형을 읽지도 쓰지도 않는다.
// - 이 파일은 순수 데이터 + 순수 함수만 둔다. Firebase·스토어·React를 import하지 않는다 (leaf playerOutfitIds.js만)
//   (firebaseProgress.js·titleSettings.js·useGameStore.js가 모두 이 파일을 import하므로 순환을 막는다).
//
// 규칙 6 (맞바꾸기 능력):
//   6-a 모든 의상은 장점 1개 + 단점 1개 (default는 둘 다 없음)
//   6-c 히트박스·충돌 크기·자석·무기 공격력·쿨다운은 건드리지 않는다 (powerBank 미사일 포함)
//   6-d 시간이 지날수록 커지는 효과, 초당 회복, 웨이브·마틸다·탈출구 규칙 변경 금지
//       → 마틸다 접촉 즉사(killPlayer)는 의상 배율을 거치지 않는다. 탈출 후 압박에 상한을 두지 않는다.
//   6-f 판 도중에는 바꿀 수 없다 → 스토어 runOutfitId가 판 시작 때 고정된다.

import { DEFAULT_PLAYER_OUTFIT, PLAYER_OUTFIT_IDS } from './playerOutfitIds.js'

export const DEFAULT_OUTFIT_ID = DEFAULT_PLAYER_OUTFIT

// 표시 순서 = 획득 순서. id 목록 정본은 leaf 모듈 playerOutfitIds.js(backendmini, RTDB 규칙 허용값과
// 글자까지 같음)이다. 이 카탈로그는 그 목록의 모든 id를 정확히 한 번씩 정의한다 (T-01).
export const OUTFIT_IDS = PLAYER_OUTFIT_IDS

// 판정에 쓰는 기록 키. playerRecords.js RECORD_KEYS / stageConfig.js clearRecordKey와 같다.
const STAGE_CLEAR_RECORD_KEYS = Object.freeze({
  1: 'stage1Clears',
  2: 'stage2Clears',
  3: 'stage3Clears',
  4: 'stage4Clears',
})

// 의상 배율의 "아무 효과 없음" 값. default는 이 값과 완전히 같다.
export const NEUTRAL_OUTFIT_STATS = Object.freeze({
  damageTakenMult: 1, // 받는 모든 피해 배율 (damagePlayer, 이누콘 흡수 전)
  projectileDamageMult: 1, // 적 투사체 피해 추가 배율 (source === ENEMY_PROJECTILE_DAMAGE_SOURCE)
  speedMult: 1, // 이동속도 배율 (speed·baseSpeed 둘 다 → 이속 카드 상한 baseSpeed×1.8에도 반영)
  maxHpDelta: 0, // 최대 체력 증감 (판 시작 체력 = maxHp)
  xpMult: 1, // 얻는 경험치 배율 (gainXp carry 방식, growthMultiplier에 곱하지 않는다)
  lunchHealMult: 1, // 급식 아이템(우유·급식판, RZT 드롭 포함) 회복 배율
})

// Enemies.jsx projectileHitRef가 damagePlayer에 넘기는 source. 비옷 판정은 이 값 하나로 한다.
export const ENEMY_PROJECTILE_DAMAGE_SOURCE = 'enemyProjectile'

function stageClearsUnlock(stageNumbers) {
  return Object.freeze({
    type: 'stageClears',
    stageNumbers: Object.freeze([...stageNumbers]),
    stageIds: Object.freeze(stageNumbers.map((n) => `stage${n}`)),
    recordKeys: Object.freeze(stageNumbers.map((n) => STAGE_CLEAR_RECORD_KEYS[n])),
    // 표시용 i18n 키 + 인자. 한 스테이지면 outfit.unlock.stageClear {n},
    // 여러 스테이지면 outfit.unlock.stagesClear {from, to} (예: "Stage 1~4 모두 탈출").
    labelKey: stageNumbers.length === 1 ? 'outfit.unlock.stageClear' : 'outfit.unlock.stagesClear',
    labelParams: Object.freeze(stageNumbers.length === 1
      ? { n: stageNumbers[0] }
      : { from: stageNumbers[0], to: stageNumbers[stageNumbers.length - 1] }),
  })
}

const ALWAYS_UNLOCK = Object.freeze({
  type: 'always',
  stageNumbers: Object.freeze([]),
  stageIds: Object.freeze([]),
  recordKeys: Object.freeze([]),
  labelKey: null,
  labelParams: Object.freeze({}),
})

function defineOutfit({ id, order, unlock, stats = {} }) {
  return Object.freeze({
    id,
    order,
    nameKey: `outfit.${id}.name`,
    unlock,
    stats: Object.freeze({ ...NEUTRAL_OUTFIT_STATS, ...stats }),
    // Terry 2026-11-01: 6벌 모두 연다. 4벌 새 옷은 threemini 임시 외형으로 visualReady.
    // 외형이 없는 옷을 능력만으로 열지 않는다 — 옷장은 visualReady && available만 보여 준다.
    visualReady: true,
    available: true,
  })
}

// §2 수치 정본 (balanceqa 조정 반영: apron xp −5%, grad 피해 +8%, grad 조건 Stage 1~4 모두 탈출).
export const OUTFIT_CATALOG = Object.freeze({
  default: defineOutfit({ id: 'default', order: 0, unlock: ALWAYS_UNLOCK }),
  winter: defineOutfit({
    id: 'winter', order: 1, unlock: stageClearsUnlock([1]),
    stats: { damageTakenMult: 0.92, speedMult: 0.96 },
  }),
  raincoat: defineOutfit({
    id: 'raincoat', order: 2, unlock: stageClearsUnlock([2]),
    stats: { projectileDamageMult: 0.70, maxHpDelta: -6 },
  }),
  gym: defineOutfit({
    id: 'gym', order: 3, unlock: stageClearsUnlock([3]),
    stats: { speedMult: 1.06, maxHpDelta: -12 },
  }),
  apron: defineOutfit({
    id: 'apron', order: 4, unlock: stageClearsUnlock([4]),
    stats: { lunchHealMult: 1.3, xpMult: 0.95 },
  }),
  grad: defineOutfit({
    id: 'grad', order: 5, unlock: stageClearsUnlock([1, 2, 3, 4]),
    stats: { xpMult: 1.08, damageTakenMult: 1.08 },
  }),
})

export function isOutfitId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(OUTFIT_CATALOG, id)
}

// 계정에 저장하는 해금 id (default는 항상 보유라 저장하지 않는다).
export function isAccountUnlockableOutfitId(id) {
  return isOutfitId(id) && id !== DEFAULT_OUTFIT_ID
}

// 모르는 id는 default로 떨어진다.
export function getOutfit(id) {
  return isOutfitId(id) ? OUTFIT_CATALOG[id] : OUTFIT_CATALOG[DEFAULT_OUTFIT_ID]
}

export function getOutfitStats(id) {
  return getOutfit(id).stats
}

// 옷장 목록 순서대로. 기본은 옷장에 보여 줄 옷(visualReady && available)만.
export function listOutfits({ includeHidden = false } = {}) {
  return OUTFIT_IDS
    .map((id) => OUTFIT_CATALOG[id])
    .filter((outfit) => includeHidden || (outfit.visualReady && outfit.available))
}

// ---- 능력 표시 설명자 (uimini 옷장 기능표·일시정지 한 줄이 그대로 렌더한다) ----
// 표시 순서. stat → i18n 키(문구 정본 §7-4), 단위, "값이 클수록 좋은가".
const ABILITY_DISPLAY = Object.freeze([
  { stat: 'damageTakenMult', labelKey: 'outfit.ability.damageTaken', unit: '%', kind: 'mult', higherIsBetter: false },
  { stat: 'projectileDamageMult', labelKey: 'outfit.ability.projectileDamage', unit: '%', kind: 'mult', higherIsBetter: false },
  { stat: 'speedMult', labelKey: 'outfit.ability.moveSpeed', unit: '%', kind: 'mult', higherIsBetter: true },
  { stat: 'maxHpDelta', labelKey: 'outfit.ability.maxHp', unit: '', kind: 'delta', higherIsBetter: true },
  { stat: 'xpMult', labelKey: 'outfit.ability.xp', unit: '%', kind: 'mult', higherIsBetter: true },
  { stat: 'lunchHealMult', labelKey: 'outfit.ability.lunchHeal', unit: '%', kind: 'mult', higherIsBetter: true },
])

export const OUTFIT_ABILITY_NONE_KEY = 'outfit.ability.none'

function formatSigned(value) {
  // U+2212 minus는 쓰지 않는다 — 폰트마다 폭이 달라 한 줄 20자 예산이 흔들린다.
  return value > 0 ? `+${value}` : `${value}`
}

// [{ stat, labelKey, value, unit, display, positive }]
//   value: 부호 있는 정수 (−8, +6, −12 …). 배율은 (m−1)×100 반올림.
//   display: i18n {v}에 그대로 넣는 문자열 ("-8", "+6"). 단위(%)는 문구 쪽에 이미 있다.
//   positive: 장점이면 true(초록), 단점이면 false(빨강).
// 장점이 먼저, 단점이 다음. default는 [] (OUTFIT_ABILITY_NONE_KEY를 보여 준다).
export function getOutfitAbilities(id) {
  const stats = getOutfitStats(id)
  const out = []
  for (const entry of ABILITY_DISPLAY) {
    const raw = stats[entry.stat]
    const neutral = NEUTRAL_OUTFIT_STATS[entry.stat]
    if (raw === neutral) continue
    const value = entry.kind === 'mult' ? Math.round((raw - 1) * 100) : raw
    if (value === 0) continue
    const positive = entry.higherIsBetter ? value > 0 : value < 0
    out.push(Object.freeze({
      stat: entry.stat,
      labelKey: entry.labelKey,
      value,
      unit: entry.unit,
      display: formatSigned(value),
      positive,
    }))
  }
  return out.sort((a, b) => Number(b.positive) - Number(a.positive))
}

// ---- 해금 판정 (weaponCatalog.evaluateUnlocks와 같은 모양: 기록 → 보유 id Set) ----
function readClearCount(records, key) {
  const value = records?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function isOutfitUnlockedByRecords(id, records) {
  if (!isOutfitId(id)) return false
  const { unlock } = OUTFIT_CATALOG[id]
  if (unlock.type === 'always') return true
  if (unlock.type === 'stageClears') return unlock.recordKeys.every((key) => readClearCount(records, key) >= 1)
  return false
}

// default 포함. records가 비거나 숫자가 아니면 default만.
export function evaluateOutfitUnlocks(records) {
  const out = new Set()
  for (const id of OUTFIT_IDS) {
    if (isOutfitUnlockedByRecords(id, records ?? {})) out.add(id)
  }
  return out
}

// ---- 능력 수식 (스토어·컴포넌트·밸런스 프로브가 같은 식을 쓴다) ----

// 급식 회복량. 우유 8→10, 급식판 14→18 (급식 당번복). default는 원래 값 그대로.
export function getLunchHealAmount(baseHeal, outfitId) {
  const mult = getOutfitStats(outfitId).lunchHealMult
  if (mult === 1) return baseHeal
  return Math.round(baseHeal * mult)
}

// 받는 피해 배율. 소수는 그대로 둔다(표시만 반올림). default는 amount 그대로.
export function applyOutfitDamageTaken(amount, outfitId, source = null) {
  const stats = getOutfitStats(outfitId)
  let mult = stats.damageTakenMult
  if (source === ENEMY_PROJECTILE_DAMAGE_SOURCE) mult *= stats.projectileDamageMult
  return mult === 1 ? amount : amount * mult
}

// XP carry 방식 (balanceqa 정정). base = 이미 Math.floor(amount × growthMultiplier)한 값.
// 내림 오차를 판 전체로 넘겨 표기 비율이 그대로 나온다. xpMult 1이면 { gained: base, carry } 그대로.
const XP_CARRY_EPSILON = 1e-9
export function applyOutfitXpCarry(base, carry, outfitId) {
  return applyXpMultCarry(base, carry, getOutfitStats(outfitId).xpMult)
}

// 같은 식을 배율로 직접 받는 형태 (stageBalanceProbe의 의상 인자 A/B용).
export function applyXpMultCarry(base, carry, mult) {
  if (mult === 1) return { gained: base, carry }
  let nextCarry = carry + base * (mult - 1)
  const bonus = Math.trunc(nextCarry + (nextCarry >= 0 ? XP_CARRY_EPSILON : -XP_CARRY_EPSILON))
  nextCarry -= bonus
  return { gained: base + bonus, carry: nextCarry }
}
