import { getAdminRankingSeasonConfig } from './adminConfig.js'

export const SCORE_TYPE = 'survival_v1'
export const CLEAR_BONUS = 30
// 스테이지 보너스는 난이도 단조증가에 맞춰 선형 +60. 이 값은 안티치트 점수 상한의 단일 출처다 —
// database.rules.json의 랭킹 entries `.validate` 상한 삼항(stage1:0/stage2:60/stage3:120/stage4:180,
// clear 30, boss 20%)과 반드시 일치. 변경 시 두 곳(+미배포 functions/src/ranking.js)을 함께 갱신한다.
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
    // 보스 처치는 포탈 탈출을 대체하지 않는다. 이 마지막 방어선은 호출자가
    // 중간 처치 보너스를 넘겨도 미클리어 RTDB payload가 규칙 상한을 넘지 않게 한다.
    + (cleared ? readNonNegativeInt(bossBonus) : 0)
}

// 마지막 보스를 처치했다는 사실은 런 중에 기록한다. 다만 보너스 점수는 포탈
// 클리어 시점의 생존 시간·클리어 보너스를 기준으로 단 한 번 확정한다.
export function getBossClearBonus({ stageId = 'stage1', survivalSeconds = 0, cleared = false, bossDefeated = false } = {}, policy = getRankingScorePolicy()) {
  if (cleared !== true || bossDefeated !== true) return 0
  const baseScore = readNonNegativeInt(survivalSeconds)
    + readNonNegativeInt(policy.stageBonus?.[stageId])
    + readNonNegativeInt(policy.clearBonus)
  return Math.floor(baseScore * 0.2)
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
