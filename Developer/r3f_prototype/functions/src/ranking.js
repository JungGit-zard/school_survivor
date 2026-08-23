import { createHash } from 'node:crypto'

export const ALLOWED_STAGE_IDS = new Set(['stage1', 'stage2', 'stage3', 'stage4'])
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000

// 점수 구성 상수. 단일 출처는 클라이언트 src/lib/rankingScorePolicy.js — 값 변경 시 함께 갱신한다.
// 런 길이에도 점수에도 상한을 두지 않는다: 무한모드 경합이 이 게임의 핵심 컨텐츠라
// 100시간을 버티든 3년을 버티든 버틴 그대로 기록되어야 한다. 예전에 여기 있던
// MAX_RUN_SCORE / MAX_RUN_TIME_MS와 maxLegitScore 재검증은 그 요구와 정면으로 충돌해 걷어냈다.
export const SERVER_STAGE_BONUS = { stage1: 0, stage2: 60, stage3: 120, stage4: 180 }
export const SERVER_ESCAPE_BONUS_RATE = 0.15
export const BOSS_BONUS_RATE = 0.2

const DAY_MS = 24 * 60 * 60 * 1000
const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{12,80}$/

// 클라이언트 getRankingScore와 같은 합산식.
// base = survival + stageBonus, 탈출하면 base의 15%, 보스까지 잡으면 (base + 탈출보너스)의 20%.
// 검증용이 아니라 서버가 같은 모델을 알고 있게 하기 위한 참조 구현이다.
export function expectedScore(stageId, timeMs, cleared, bossDefeated = false) {
  const survivalSec = Math.floor(readNonNegInt(timeMs) / 1000)
  const base = survivalSec + (SERVER_STAGE_BONUS[stageId] ?? 0)
  const escape = cleared ? Math.floor(base * SERVER_ESCAPE_BONUS_RATE) : 0
  const boss = cleared && bossDefeated ? Math.floor((base + escape) * BOSS_BONUS_RATE) : 0
  return base + escape + boss
}

export function normalizeRun(value) {
  const runId = typeof value?.runId === 'string' ? value.runId.trim() : ''
  const stageId = typeof value?.stageId === 'string' ? value.stageId.trim() : ''
  const score = Number(value?.score)
  const timeMs = Number(value?.timeMs ?? 0)

  if (!RUN_ID_PATTERN.test(runId)) throw new Error('runId must be a 12-80 character opaque ID')
  if (!ALLOWED_STAGE_IDS.has(stageId)) throw new Error('Unknown stageId')
  // 상한은 없다. 남는 검증은 "숫자인가, 음수가 아닌가, 정밀도가 살아 있는가"뿐이다.
  // isSafeInteger는 천장이 아니라 정밀도 경계다 — 그 위로는 정수 연산이 값을 잃는다.
  if (!Number.isSafeInteger(score) || score < 0) throw new Error('score must be a non-negative integer')
  if (!Number.isSafeInteger(timeMs) || timeMs < 0) throw new Error('timeMs must be a non-negative integer')
  if (value?.cleared !== undefined && typeof value.cleared !== 'boolean') throw new Error('cleared must be boolean')

  const cleared = value?.cleared === true
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
