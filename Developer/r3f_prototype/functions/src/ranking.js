import { createHash } from 'node:crypto'

export const ALLOWED_STAGE_IDS = new Set(['stage1', 'stage2', 'stage3'])
export const MAX_RUN_SCORE = 100_000
export const MAX_RUN_TIME_MS = 3_600_000
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000

const DAY_MS = 24 * 60 * 60 * 1000
const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{12,80}$/

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

  return { runId, stageId, score, timeMs, cleared: value?.cleared === true }
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
