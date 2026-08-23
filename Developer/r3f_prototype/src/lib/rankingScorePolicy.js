import { getAdminRankingSeasonConfig } from './adminConfig.js'

export const SCORE_TYPE = 'survival_v1'
// 탈출구로 탈출하면 기본 점수(생존 초 + 스테이지 보너스)의 15%를 보너스로 받는다.
export const ESCAPE_BONUS_RATE = 0.15
// 보스 처치 보너스는 탈출 보너스까지 합산된 점수의 20%다(탈출 보너스와 순차 적용).
export const BOSS_BONUS_RATE = 0.2
// 스테이지 보너스는 난이도 단조증가에 맞춰 선형 +60.
// 런 길이에도 점수에도 상한이 없다 — 버틴 만큼 무한히 기록되는 것이 무한모드 경합의 전제다.
export const STAGE_BONUS = {
  stage1: 0,
  stage2: 60,
  stage3: 120,
  stage4: 180,
}

const STAGE_PRIORITY = {
  stage1: 1,
  stage2: 2,
  stage3: 3,
  stage4: 4,
}

// 기본 점수 = 생존 초 + 스테이지 보너스. 탈출/보스 보너스는 전부 이 값에서 파생된다.
export function getRankingBaseScore({ stageId = 'stage1', survivalSeconds = 0 } = {}, policy = getRankingScorePolicy()) {
  return readNonNegativeInt(survivalSeconds) + readNonNegativeInt(policy.stageBonus?.[stageId])
}

// 탈출구 탈출 보너스 = 기본 점수의 15%.
export function getEscapeBonus({ stageId = 'stage1', survivalSeconds = 0, cleared = false } = {}, policy = getRankingScorePolicy()) {
  if (cleared !== true) return 0
  return Math.floor(getRankingBaseScore({ stageId, survivalSeconds }, policy) * ESCAPE_BONUS_RATE)
}

export function getRankingScore({ stageId = 'stage1', survivalSeconds = 0, cleared = false, bossBonus = 0 } = {}, policy = getRankingScorePolicy()) {
  return getRankingBaseScore({ stageId, survivalSeconds }, policy)
    + getEscapeBonus({ stageId, survivalSeconds, cleared }, policy)
    // 보스 처치는 포탈 탈출을 대체하지 않는다. 미클리어 런에는 호출자가 보너스를 넘겨도 붙지 않는다.
    + (cleared ? readNonNegativeInt(bossBonus) : 0)
}

// 마지막 보스를 처치했다는 사실은 런 중에 기록한다. 다만 보너스 점수는 포탈
// 클리어 시점의 기본 점수 + 탈출 보너스를 기준으로 단 한 번 확정한다.
export function getBossClearBonus({ stageId = 'stage1', survivalSeconds = 0, cleared = false, bossDefeated = false } = {}, policy = getRankingScorePolicy()) {
  if (cleared !== true || bossDefeated !== true) return 0
  const base = getRankingBaseScore({ stageId, survivalSeconds }, policy)
  return Math.floor((base + getEscapeBonus({ stageId, survivalSeconds, cleared }, policy)) * BOSS_BONUS_RATE)
}

export function getRankingScorePolicy(seasonConfig = getAdminRankingSeasonConfig()) {
  const scorePolicy = seasonConfig?.scorePolicy ?? {}
  return {
    stageBonus: {
      stage1: readNonNegativeInt(scorePolicy.stageBonus?.stage1 ?? STAGE_BONUS.stage1),
      stage2: readNonNegativeInt(scorePolicy.stageBonus?.stage2 ?? STAGE_BONUS.stage2),
      stage3: readNonNegativeInt(scorePolicy.stageBonus?.stage3 ?? STAGE_BONUS.stage3),
      stage4: readNonNegativeInt(scorePolicy.stageBonus?.stage4 ?? STAGE_BONUS.stage4),
    },
  }
}

export function getStagePriority(stageId = 'stage1') {
  return STAGE_PRIORITY[stageId] ?? 0
}

export function compareRankingEntries(a, b) {
  return compareNumber(b.score, a.score)
    || compareBoolean(b.cleared, a.cleared)
    || compareNumber(getStagePriority(b.stageId), getStagePriority(a.stageId))
    || compareNumber(b.survivalSeconds, a.survivalSeconds)
    || compareNumber(b.kills, a.kills)
    || compareSubmittedAt(a.submittedAt, b.submittedAt)
    || String(a.displayName ?? '').localeCompare(String(b.displayName ?? ''), 'ko')
}

function compareNumber(a, b) {
  return readNonNegativeInt(a) - readNonNegativeInt(b)
}

function compareBoolean(a, b) {
  return Number(a === true) - Number(b === true)
}

function compareSubmittedAt(a, b) {
  const timeA = Date.parse(a ?? '')
  const timeB = Date.parse(b ?? '')
  const safeA = Number.isFinite(timeA) ? timeA : Number.MAX_SAFE_INTEGER
  const safeB = Number.isFinite(timeB) ? timeB : Number.MAX_SAFE_INTEGER
  return safeA - safeB
}

function readNonNegativeInt(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return 0
  return Math.floor(number)
}
