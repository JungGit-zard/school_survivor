// 치프(정예) 좀비 계층 정본 — 일반 좀비와 스테이지 보스 사이. Level_Mini 소유.
//
// 치프는 보스가 아니다: isBossType() false, 보스 HUD·보스 구간(bossPhase) 파생·보스 소환에 끼지 않는다.
// 규칙(설계안 v1 §1):
//  - 실효 HP = base 400 × 스테이지 배수(그 스테이지 E06의 약 1.25배, 보스의 25~35%).
//  - 동시 1체, 런마다 데뷔 1회(작성된 행 하나). 로스터 순환·오버타임 혼합·저밀도 보강에 절대 들어가지 않는다.
//    두 몸 치프(E95 긴줄넘기 듀오)는 행 하나가 몸 bodyCount(2)개를 낸다 — 데뷔 장부도 몸 수만큼만 받는다.
//  - 보상 = 엘리트 보상 행(교과서 2권 × 45XP + 골드 2). E06(1권 56XP + 골드 1)보다 크고 B01(3권 × 40 + 골드 5)보다 작다.
//    두 몸 치프는 몸마다 나눠 준다(E95: 몸마다 교과서 1 × 45XP + 골드 1 → 둘 다 잡으면 같은 2 + 2).
//  - 화면 상단에 이름표 + 미니 HP바(ChiefStatusBar). 두 몸 치프는 살아 있는 몸 HP 합 / (몸 하나 최대 HP × 몸 수).
import { NOVEL2_CHIEF_IDS, NOVEL2_ROWS, NOVEL2_TYPE_CODES } from './novelZombie2Content.js'

export const CHIEF_IDS = NOVEL2_CHIEF_IDS
const CHIEF_ID_SET = new Set(CHIEF_IDS)
const CHIEF_CODE_SET = new Set(CHIEF_IDS.map((id) => NOVEL2_TYPE_CODES[id]))

export const CHIEF_BASE_HP = 400
export const CHIEF_ELITE_REWARD = Object.freeze({ textbook: 2, textbookXp: 45, gold: 2 })

// 치프 한 종이 내는 몸 수(기본 1). E95 긴줄넘기 듀오 = 2.
export function chiefBodyCount(type) {
  const id = typeof type === 'string' ? type : CHIEF_IDS.find((chief) => NOVEL2_TYPE_CODES[chief] === type)
  const count = id && NOVEL2_ROWS[id]?.bodyCount
  return Number.isInteger(count) && count > 1 ? count : 1
}

// 몸 하나의 보상 = 치프 보상 ÷ 몸 수(두 몸을 다 잡으면 치프 보상 그대로).
function chiefRewardPerBody(id) {
  const bodies = chiefBodyCount(id)
  if (bodies === 1) return CHIEF_ELITE_REWARD
  return Object.freeze({ textbook: CHIEF_ELITE_REWARD.textbook / bodies, textbookXp: CHIEF_ELITE_REWARD.textbookXp, gold: CHIEF_ELITE_REWARD.gold / bodies })
}

// Enemies.jsx ELITE_BONUS에 펼친다. 구현된 치프만 넣는다(스폰되지 않는 예약 id에 보상 행이 있을 이유가 없다).
export const CHIEF_ELITE_BONUS = Object.freeze(Object.fromEntries(
  CHIEF_IDS.filter((id) => NOVEL2_ROWS[id].implemented).map((id) => [id, chiefRewardPerBody(id)]),
))

export function isChiefType(type) {
  return typeof type === 'string' ? CHIEF_ID_SET.has(type) : CHIEF_CODE_SET.has(type)
}

export function isChiefTypeCode(typeCode) {
  return CHIEF_CODE_SET.has(typeCode)
}

// 런 1회분 데뷔 장부. 같은 치프는 한 런에 한 번만 스폰된다(캐치업 재생·중복 행이 있어도). 두 몸 치프는 몸 수만큼.
export function createChiefDebutLedger() {
  return { spawned: new Map() }
}

export function admitChiefSpawn(ledger, type) {
  if (!isChiefType(type)) return true
  if (!ledger) return true
  const count = ledger.spawned.get(type) ?? 0
  if (count >= chiefBodyCount(type)) return false
  ledger.spawned.set(type, count + 1)
  return true
}

// 화면 상단 치프 바: 살아 있는 치프 하나(가장 낮은 슬롯)를 찾는다. 할당 없이 out에 채운다.
export function findLiveChiefInto(pool, out) {
  out.index = -1
  out.typeCode = 0
  out.hp = 0
  out.maxHp = 0
  if (!pool?.active) return out
  const highest = Number.isInteger(pool.highestActive) ? pool.highestActive : pool.active.length - 1
  for (let index = 0; index <= highest; index += 1) {
    if (pool.active[index] !== 1 || !CHIEF_CODE_SET.has(pool.type[index])) continue
    out.index = index
    out.typeCode = pool.type[index]
    out.hp = pool.hp[index]
    out.maxHp = pool.maxHp[index]
    const bodies = chiefBodyCount(out.typeCode)
    if (bodies > 1) {
      // 두 몸 치프: 같은 종의 살아 있는 몸 HP를 더하고, 분모는 몸 하나 최대 HP × 몸 수(한 몸이 죽으면 바가 절반 아래로).
      out.maxHp = pool.maxHp[index] * bodies
      for (let other = index + 1; other <= highest; other += 1) {
        if (pool.active[other] === 1 && pool.type[other] === out.typeCode) out.hp += pool.hp[other]
      }
    }
    return out
  }
  return out
}
