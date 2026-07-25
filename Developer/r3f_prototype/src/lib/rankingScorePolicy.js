import { getAdminRankingSeasonConfig } from './adminConfig.js'

export const SCORE_TYPE = 'survival_v1'
export const CLEAR_BONUS = 30
// 스테이지 보너스는 난이도 단조증가에 맞춰 선형 +60. 서버 재검증 상수(functions/src/ranking.js
// SERVER_STAGE_BONUS)와 값이 일치해야 한다 — 변경 시 두 곳을 함께 갱신한다.
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

export function getRankingScore({ stageId = 'stage1', survivalSeconds = 0, cleared = false, bossBonus = 0 } = {}, policy = getRankingScorePolicy()) {
  return readNonNegativeInt(survivalSeconds)
    + readNonNegativeInt(policy.stageBonus?.[stageId])
    + (cleared ? readNonNegativeInt(policy.clearBonus) : 0)
    + readNonNegativeInt(bossBonus)
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
    clearBonus: readNonNegativeInt(scorePolicy.clearBonus ?? CLEAR_BONUS),
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
