import { getAdminRankingSeasonConfig } from './adminConfig.js'
import { EXPANSION_STAGES } from './expansionContent.js'

export const SCORE_TYPE = 'survival_v1'
// 점수는 런 전체에 걸친 누적 점수 하나다(Terry 2026-11-21 확정). 끝난 스테이지 점수(보너스 포함)는
// 그대로 고정돼 다음 스테이지로 이월되고, 보스 20%·탈출 15%는 이번 스테이지 점수에만 붙는다.
// 탈출구로 탈출하면 그 순간 이번 스테이지 점수(보스 보너스 포함)의 15%를 더한다.
export const ESCAPE_BONUS_RATE = 0.15
// 보스를 처치한 그 순간 누적 점수의 20%를 한 번 더한다. 이 보너스는 탈출·사망·로비 이탈·탭 닫기
// 어느 경우에도 유지되고, 처치 이후에 쌓인 점수에는 곱해지지 않는다.
export const BOSS_BONUS_RATE = 0.2
// 스테이지 보너스는 난이도 단조증가에 맞춰 선형 +60.
// 런 길이에도 점수에도 상한이 없다 — 버틴 만큼 무한히 기록되는 것이 무한모드 경합의 전제다.
export const STAGE_BONUS = {
  stage1: 0,
  stage2: 60,
  stage3: 120,
  stage4: 180,
  stage5: 240,
  // 확장 스테이지(6~10)는 데이터 scoreStageBonus가 정본이다(2026-11-08: 예전에는 그 필드를 읽지 않았다).
  // 값은 300/360/420/480/540 그대로 — 서버 SERVER_STAGE_BONUS(functions/src/ranking.js)와 같아야 하며
  // rankingScorePolicy.test.js가 둘의 일치를 단언한다.
  ...Object.fromEntries(Object.values(EXPANSION_STAGES).map((stage) => [stage.id, stage.scoreStageBonus])),
}

const STAGE_PRIORITY = {
  stage1: 1,
  stage2: 2,
  stage3: 3,
  stage4: 4,
  stage5: 5,
  stage6: 6,
  stage7: 7,
  stage8: 8,
  stage9: 9,
  stage10: 10,
}

// 기본 점수 = 생존 초 + 스테이지 보너스. 탈출/보스 보너스는 전부 이 값에서 파생된다.
export function getRankingBaseScore({ stageId = 'stage1', survivalSeconds = 0 } = {}, policy = getRankingScorePolicy()) {
  return readNonNegativeInt(survivalSeconds) + readNonNegativeInt(policy.stageBonus?.[stageId])
}

// 탈출 보너스 = 탈출 순간 이번 스테이지 점수(기본 점수 + 보스 보너스)의 15%. 이월 점수에는 붙지 않는다.
export function getEscapeBonus(stageRunningScore = 0) {
  return Math.floor(readNonNegativeInt(stageRunningScore) * ESCAPE_BONUS_RATE)
}

// 보스 처치 보너스 = 처치 순간 이번 스테이지 점수의 20%. 처치 시점에 한 번 계산해 고정한다 —
// 이후에 쌓이는 생존 점수에도, 이전 스테이지에서 이월된 점수에도 곱하지 않는다.
export function getBossKillBonus({ stageId = 'stage1', survivalSeconds = 0 } = {}, policy = getRankingScorePolicy()) {
  return getBossKillBonusFromStageScore(getRankingBaseScore({ stageId, survivalSeconds }, policy))
}

export function getBossKillBonusFromStageScore(stageScoreAtKill = 0) {
  return Math.floor(readNonNegativeInt(stageScoreAtKill) * BOSS_BONUS_RATE)
}

// 런 총점 = 이월 점수(고정) + 이번 스테이지 점수. 이번 스테이지 점수 = 기본 점수 + (처치 시점에 고정된)
// 보스 보너스, 탈출하면 그 15%를 더한다. 보스 보너스는 클리어 여부와 무관하게 유지된다(사망·이탈 런에도 붙는다).
export function getRankingScore({ stageId = 'stage1', survivalSeconds = 0, cleared = false, bossBonus = 0, carriedScore = 0 } = {}, policy = getRankingScorePolicy()) {
  const stageRunning = getRankingBaseScore({ stageId, survivalSeconds }, policy) + readNonNegativeInt(bossBonus)
  return readNonNegativeInt(carriedScore) + stageRunning + (cleared === true ? getEscapeBonus(stageRunning) : 0)
}

export function getRankingScorePolicy(seasonConfig = getAdminRankingSeasonConfig()) {
  const scorePolicy = seasonConfig?.scorePolicy ?? {}
  return {
    stageBonus: {
      stage1: readNonNegativeInt(scorePolicy.stageBonus?.stage1 ?? STAGE_BONUS.stage1),
      stage2: readNonNegativeInt(scorePolicy.stageBonus?.stage2 ?? STAGE_BONUS.stage2),
      stage3: readNonNegativeInt(scorePolicy.stageBonus?.stage3 ?? STAGE_BONUS.stage3),
      stage4: readNonNegativeInt(scorePolicy.stageBonus?.stage4 ?? STAGE_BONUS.stage4),
      stage5: readNonNegativeInt(scorePolicy.stageBonus?.stage5 ?? STAGE_BONUS.stage5),
      stage6: readNonNegativeInt(scorePolicy.stageBonus?.stage6 ?? STAGE_BONUS.stage6),
      stage7: readNonNegativeInt(scorePolicy.stageBonus?.stage7 ?? STAGE_BONUS.stage7),
      stage8: readNonNegativeInt(scorePolicy.stageBonus?.stage8 ?? STAGE_BONUS.stage8),
      stage9: readNonNegativeInt(scorePolicy.stageBonus?.stage9 ?? STAGE_BONUS.stage9),
      stage10: readNonNegativeInt(scorePolicy.stageBonus?.stage10 ?? STAGE_BONUS.stage10),
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
