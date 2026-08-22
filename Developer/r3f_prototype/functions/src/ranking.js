import { createHash } from 'node:crypto'

export const ALLOWED_STAGE_IDS = new Set(['stage1', 'stage2', 'stage3', 'stage4'])
export const MAX_RUN_SCORE = 100_000
export const MAX_RUN_TIME_MS = 300_000
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000

// 서버측 점수 재검증(안티치트) 상수. 단일 출처는 클라이언트 src/lib/rankingScorePolicy.js —
// 값 변경 시 두 곳을 반드시 동기화한다(스테이지 보너스 선형 +60, clear 30, 탈출 보너스 = 기본점의 15%).
export const SERVER_STAGE_BONUS = { stage1: 0, stage2: 60, stage3: 120, stage4: 180 }
export const SERVER_CLEAR_BONUS = 30
export const ESCAPE_SCORE_BONUS_RATE = 0.15

const DAY_MS = 24 * 60 * 60 * 1000
const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{12,80}$/

// 주어진 런의 정직한 최대 점수. getRankingScore(클라)와 clearStageWithEscapeBonus의
// 합산식과 동일: survival + stageBonus + (clear ? clearBonus : 0) + (clear ? floor(base*0.15) : 0).
// 정직한 런의 점수는 항상 정확히 이 상한과 같고, 하한은 보너스 없는 survival이다.
export function maxLegitScore(stageId, timeMs, cleared) {
  const survivalSec = Math.floor(readNonNegInt(timeMs) / 1000)
  const base = survivalSec + (SERVER_STAGE_BONUS[stageId] ?? 0) + (cleared ? SERVER_CLEAR_BONUS : 0)
  return base + (cleared ? Math.floor(base * ESCAPE_SCORE_BONUS_RATE) : 0)
}

export function normalizeRun(value) {
  const runId = typeof value?.runId === 'string' ? value.runId.trim() : ''
  const stageId = typeof value?.stageId === 'string' ? value.stageId.trim() : ''
  const score = Number(value?.score)
  const timeMs = Number(value?.timeMs ?? 0)

  if (!RUN_ID_PATTERN.test(runId)) throw new Error('runId must be a 12-80 character opaque ID')
  if (!ALLOWED_STAGE_IDS.has(stageId)) throw new Error('Unknown stageId')
  if (!Number.isSafeInteger(score) || score < 1 || score > MAX_RUN_SCORE) throw new Error('score is out of range')
  if (!Number.isSafeInteger(timeMs) || timeMs < 0 || timeMs > MAX_RUN_TIME_MS) throw new Error('timeMs is out of range')
  if (value?.cleared !== undefined && typeof value.cleared !== 'boolean') throw new Error('cleared must be boolean')

  const cleared = value?.cleared === true
  // 상한/하한 정합 검증(M5): 클라가 변조한 score 주입을 서버에서 차단.
  const survivalSec = Math.floor(timeMs / 1000)
  if (score < survivalSec || score > maxLegitScore(stageId, timeMs, cleared)) {
    throw new Error('score fails server revalidation')
  }

  return { runId, stageId, score, timeMs, cleared }
}

function readNonNegInt(value) {
  const n = Number(value)
  return Number.isSafeInteger(n) && n > 0 ? n : 0
}

export function getKstRankingKeys(nowMs) {
  const shifted = new Date(nowMs + KST_OFFSET_MS)
  const daily = formatUtcDate(shifted)
  const daysSinceMonday = (shifted.getUTCDay() + 6) % 7
  return {
    daily,
    weekly: formatUtcDate(new Date(shifted.getTime() - daysSinceMonday * DAY_MS)),
  }
}

export function publicEntryId(uid) {
  return createHash('sha256').update(uid).digest('base64url')
}

export function sanitizeDisplayName(value) {
  const name = typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, '').trim() : ''
  return (name || '익명 생존자').slice(0, 24)
}

export function buildPublicEntry({ displayName, score, timeMs, cleared, updatedAt }) {
  return { displayName, score, timeMs, cleared, updatedAt }
}

// All ranking state is intentionally below one RTDB root. A transaction at that
// root makes the run ledger and every leaderboard projection commit together.
export function applyRunSubmission(current, { uid, displayName, run, seasonId, nowMs }) {
  const state = structuredClone(current ?? {})
  const existing = state.users?.[uid]?.runs?.[run.runId]
  if (existing) return { state, duplicate: true }

  const keys = getKstRankingKeys(nowMs)
  const publicId = publicEntryId(uid)
  const runRecord = {
    stageId: run.stageId,
    score: run.score,
    timeMs: run.timeMs,
    cleared: run.cleared,
    submittedAt: nowMs,
    dailyKey: keys.daily,
    weeklyKey: keys.weekly,
  }

  state.users ??= {}
  state.users[uid] ??= {}
  state.users[uid].runs ??= {}
  state.users[uid].runs[run.runId] = runRecord

  const publicRoot = state.public ??= {}
  const season = publicRoot[seasonId] ??= {}
  incrementEntry(season, ['global', 'daily', keys.daily, 'entries', publicId], displayName, run, nowMs)
  incrementEntry(season, ['global', 'weekly', keys.weekly, 'entries', publicId], displayName, run, nowMs)
  incrementEntry(season, ['stage', run.stageId, 'daily', keys.daily, 'entries', publicId], displayName, run, nowMs)
  incrementEntry(season, ['stage', run.stageId, 'weekly', keys.weekly, 'entries', publicId], displayName, run, nowMs)

  return { state, duplicate: false, keys }
}

function incrementEntry(root, path, displayName, run, nowMs) {
  let parent = root
  for (const key of path.slice(0, -1)) parent = parent[key] ??= {}
  const key = path.at(-1)
  const current = parent[key] ?? {}
  parent[key] = buildPublicEntry({
    displayName,
    score: safeTotal(current.score) + run.score,
    timeMs: safeTotal(current.timeMs) + run.timeMs,
    cleared: current.cleared === true || run.cleared,
    updatedAt: nowMs,
  })
}

function safeTotal(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : 0
}

function formatUtcDate(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
