import { getFirebaseConfig } from './firebaseAuth.js'
import { isE2EAuthBypass } from './e2eAuth.js'
import { getAdminRankingSeasonConfig } from './adminConfig.js'
import {
  kstDailyKey,
  kstWeeklyKey,
  kstDateStartMs,
  kstDateEndMs,
  compareRankingWindowEntries,
} from './rankingWindow.js'

const DATABASE_URL_KEY = 'VITE_FIREBASE_DATABASE_URL'
const DEFAULT_SEASON_ID = 'season-001'
const DEFAULT_SEASON_NAME = '상시 시즌'
const DAY_MS = 24 * 60 * 60 * 1000
const RANKING_REGION = 'asia-northeast3'
const RANKING_ROOT = 'rankingService/v1/public'

function getEnv() { return import.meta.env ?? {} }
function readEnv(key) {
  const v = getEnv()[key]
  return typeof v === 'string' ? v.trim() : ''
}

export function isFirebaseRankingConfigured() {
  return readEnv(DATABASE_URL_KEY).length > 0
}

// ponytail: singleton promise — same pattern as firebaseProgress.js
let _clientPromise = null
async function getClient() {
  if (!_clientPromise) _clientPromise = createClient()
  return _clientPromise
}

async function createClient() {
  const [{ initializeApp, getApp, getApps }, db] = await Promise.all([
    import('firebase/app'),
    import('firebase/database'),
  ])
  const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig(getEnv()))
  const database = db.getDatabase(app, readEnv(DATABASE_URL_KEY))
  return { db: database, mod: db }
}

// 활성 시즌 판정. 활성 = now ∈ [startAt, endAt](KST 달력일 경계). 미설정 시 always-on.
// 반환: { seasonId, name, endsAt(ms|null), active }
export function getActiveSeason(nowMs = Date.now(), config = getAdminRankingSeasonConfig()) {
  const seasonId = readSeasonId(config?.seasonId) || DEFAULT_SEASON_ID
  const name = (typeof config?.seasonName === 'string' && config.seasonName.trim()) || DEFAULT_SEASON_NAME
  const startMs = kstDateStartMs(config?.startsAt) // null = 하한 없음
  const endMs = kstDateEndMs(config?.endsAt) // null = 상한 없음
  const afterStart = startMs == null || nowMs >= startMs
  const beforeEnd = endMs == null || nowMs <= endMs
  return { seasonId, name, endsAt: endMs, active: afterStart && beforeEnd }
}

function periodKey(window, nowMs) {
  return window === 'weekly' ? kstWeeklyKey(nowMs) : kstDailyKey(nowMs)
}

function normalizeWindow(window) {
  return window === 'weekly' ? 'weekly' : 'daily'
}

function entriesPath(seasonId, stageId, key) {
  return `${RANKING_ROOT}/${seasonId}/stage/${stageId}/daily/${key}/entries`
}

function globalEntriesPath(seasonId, window, key) {
  return `${RANKING_ROOT}/${seasonId}/global/${window}/${key}/entries`
}

// 활성 시즌의 daily+weekly 버킷 2곳에 점수를 누적 기록. E2E 우회/미설정/시즌 밖이면 skip.
export async function submitRun(user, { stageId, score, timeMs, cleared, runId = createRunId() } = {}) {
  if (!user?.uid || !isFirebaseRankingConfigured()) return
  // E2E 우회 유저 점수는 실랭킹에 오염되지 않게 차단
  if (isE2EAuthBypass()) return
  const now = Date.now()
  const season = getActiveSeason(now)
  if (!season.active) return // seasonOff: 제출 skip

  const [{ initializeApp, getApp, getApps }, functionsModule] = await Promise.all([
    import('firebase/app'),
    import('firebase/functions'),
  ])
  const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig(getEnv()))
  const submit = functionsModule.httpsCallable(
    functionsModule.getFunctions(app, RANKING_REGION),
    'submitRankingRun',
  )
  await submit({
    runId: readRunId(runId),
    stageId: readStageId(stageId),
    score: readScore(score),
    timeMs: readNonNegInt(timeMs),
    cleared: cleared === true,
  })
}

// 활성 시즌 현재 period의 스테이지별 top N (score 내림차순 + tie-break).
export async function fetchStageRanking(stageId, _window, { limit = 100 } = {}) {
  if (!isFirebaseRankingConfigured()) return []
  const now = Date.now()
  const season = getActiveSeason(now)
  if (!season.active) return []
  const win = 'daily'
  const key = periodKey(win, now)
  const { db, mod } = await getClient()
  const q = mod.query(
    mod.ref(db, entriesPath(season.seasonId, readStageId(stageId), key)),
    mod.orderByChild('score'),
    mod.limitToLast(limit),
  )
  return readRankingEntries(await mod.get(q), limit)
}

export function subscribeStageRanking(stageId, _window, onEntries, { limit = 100 } = {}) {
  return subscribeRankingWindow(
    'daily',
    (seasonId, _win, key) => entriesPath(seasonId, readStageId(stageId), key),
    onEntries,
    limit,
  )
}

// 글로벌: 실행 시 함께 누적된 전용 통합 엔트리를 읽는다.
export async function fetchGlobalRanking(window, { limit = 100 } = {}) {
  if (!isFirebaseRankingConfigured()) return []
  const now = Date.now()
  const season = getActiveSeason(now)
  if (!season.active) return []
  const win = normalizeWindow(window)
  const key = periodKey(win, now)
  const { db, mod } = await getClient()

  const q = mod.query(
    mod.ref(db, globalEntriesPath(season.seasonId, win, key)),
    mod.orderByChild('score'),
    mod.limitToLast(limit),
  )
  return readRankingEntries(await mod.get(q), limit)
}

export function subscribeGlobalRanking(window, onEntries, { limit = 100 } = {}) {
  return subscribeRankingWindow(
    window,
    (seasonId, win, key) => globalEntriesPath(seasonId, win, key),
    onEntries,
    limit,
  )
}

// 레거시 호환 shim — UserRanking.jsx(Phase 2에서 새 fetch API로 교체 예정)가 아직 소비한다.
// seasonId 인자는 무시하고 활성 시즌 글로벌 일일 보드를 옛 평면 엔트리 형태로 변환한다.
export async function fetchTopRanking(_seasonId, limit = 100) {
  const rows = await fetchGlobalRanking('daily', { limit })
  return rows.map((row) => ({
    uid: row.uid,
    displayName: row.displayName,
    score: row.score,
    survivalSeconds: Math.floor((row.timeMs ?? 0) / 1000),
    cleared: row.cleared,
    submittedAt: '',
  }))
}

function readStageId(stageId) {
  const id = typeof stageId === 'string' ? stageId.trim() : ''
  return id || 'stage1'
}

function subscribeRankingWindow(window, pathForWindow, onEntries, limit) {
  if (typeof onEntries !== 'function') return () => {}
  if (!isFirebaseRankingConfigured()) {
    onEntries([])
    return () => {}
  }

  let closed = false
  let unsubscribe = () => {}
  let boundaryTimer = null
  const subscribe = async () => {
    unsubscribe()
    const now = Date.now()
    const season = getActiveSeason(now)
    if (!season.active) {
      onEntries([])
      return
    }

    try {
      const { db, mod } = await getClient()
      if (closed) return
      const win = normalizeWindow(window)
      const key = periodKey(win, now)
      const q = mod.query(
        mod.ref(db, pathForWindow(season.seasonId, win, key)),
        mod.orderByChild('score'),
        mod.limitToLast(limit),
      )
      unsubscribe = mod.onValue(
        q,
        (snap) => onEntries(readRankingEntries(snap, limit)),
        () => onEntries([]),
      )
      boundaryTimer = globalThis.setTimeout(subscribe, msUntilNextWindow(win, now))
    } catch {
      onEntries([])
    }
  }

  void subscribe()
  return () => {
    closed = true
    unsubscribe()
    if (boundaryTimer != null) globalThis.clearTimeout(boundaryTimer)
  }
}

function readRankingEntries(snap, limit) {
  if (!snap?.exists?.()) return []
  const entries = []
  snap.forEach((child) => {
    const value = child.val() ?? {}
    entries.push({ ...value, uid: value.uid ?? child.key })
  })
  return entries.sort(compareRankingWindowEntries).slice(0, limit)
}

function msUntilNextWindow(window, now) {
  const start = kstDateStartMs(window === 'weekly' ? kstWeeklyKey(now) : kstDailyKey(now))
  const duration = window === 'weekly' ? DAY_MS * 7 : DAY_MS
  return Math.max(1, start + duration - now + 50)
}

function readSeasonId(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function readRunId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{12,80}$/.test(value) ? value : createRunId()
}

function createRunId() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID().replaceAll('-', '')
  return `${Date.now()}${Math.random().toString(36).slice(2, 14)}`
}

function readScore(value) {
  const score = Number(value)
  return Number.isFinite(score) && score > 0 ? Math.floor(score) : 0
}

function readNonNegInt(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}
