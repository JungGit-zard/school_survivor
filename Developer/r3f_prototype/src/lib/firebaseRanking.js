import { getFirebaseConfig } from './firebaseAuth.js'
import { isE2EAuthBypass } from './e2eAuth.js'
import { getAdminRankingSeasonConfig } from './adminConfig.js'
import { getSavedNickname } from './userNickname.js'
import { STAGE_CONFIGS } from './stageConfig.js'
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
const WINDOWS = ['daily', 'weekly']

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

function entriesPath(seasonId, stageId, window, key) {
  return `rankings/${seasonId}/stage/${stageId}/${window}/${key}/entries`
}

function pickDisplayName(user) {
  return getSavedNickname(user) || user?.displayName || '익명'
}

// 활성 시즌의 daily+weekly 버킷 2곳에 점수를 누적 기록. E2E 우회/미설정/시즌 밖이면 skip.
export async function submitRun(user, { stageId, score, timeMs, cleared } = {}) {
  if (!user?.uid || !isFirebaseRankingConfigured()) return
  // E2E 우회 유저 점수는 실랭킹에 오염되지 않게 차단
  if (isE2EAuthBypass()) return
  const now = Date.now()
  const season = getActiveSeason(now)
  if (!season.active) return // seasonOff: 제출 skip

  const nextScore = readScore(score)
  const nextTimeMs = readNonNegInt(timeMs)
  const entry = {
    uid: user.uid,
    displayName: pickDisplayName(user),
    score: nextScore,
    timeMs: nextTimeMs,
    cleared: cleared === true,
    updatedAt: now,
  }
  const safeStageId = readStageId(stageId)
  const { db, mod } = await getClient()

  await Promise.all(WINDOWS.map(async (window) => {
    const key = periodKey(window, now)
    const entryRef = mod.ref(db, `${entriesPath(season.seasonId, safeStageId, window, key)}/${user.uid}`)
    await mod.runTransaction(entryRef, (current) => {
      if (!current || typeof current !== 'object') return entry
      return {
        ...entry,
        score: readScore(current.score) + nextScore,
        timeMs: readNonNegInt(current.timeMs) + nextTimeMs,
        cleared: current.cleared === true || entry.cleared,
      }
    })
  }))
}

// 활성 시즌 현재 period의 스테이지별 top N (score 내림차순 + tie-break).
export async function fetchStageRanking(stageId, window, { limit = 100 } = {}) {
  if (!isFirebaseRankingConfigured()) return []
  const now = Date.now()
  const season = getActiveSeason(now)
  if (!season.active) return []
  const win = normalizeWindow(window)
  const key = periodKey(win, now)
  const { db, mod } = await getClient()
  const q = mod.query(
    mod.ref(db, entriesPath(season.seasonId, readStageId(stageId), win, key)),
    mod.orderByChild('score'),
    mod.limitToLast(limit),
  )
  const snap = await mod.get(q)
  if (!snap.exists()) return []
  const entries = []
  snap.forEach((child) => {
    const value = child.val() ?? {}
    entries.push({ ...value, uid: value.uid ?? child.key })
  })
  return entries.sort(compareRankingWindowEntries).slice(0, limit)
}

// 글로벌: 저장 노드 없음. 활성 시즌의 모든 스테이지 entries를 같은 window+periodKey로 모아
// uid별 스테이지 누적 score 합산 → tie-break 정렬 → top N.
// ponytail: on-read 집계, 규모 커지면 Cloud Function 집계 노드로 승격.
export async function fetchGlobalRanking(window, { limit = 100 } = {}) {
  if (!isFirebaseRankingConfigured()) return []
  const now = Date.now()
  const season = getActiveSeason(now)
  if (!season.active) return []
  const win = normalizeWindow(window)
  const key = periodKey(win, now)
  const { db, mod } = await getClient()

  const byUid = new Map()
  await Promise.all(Object.keys(STAGE_CONFIGS).map(async (stageId) => {
    const snap = await mod.get(mod.ref(db, entriesPath(season.seasonId, stageId, win, key)))
    if (!snap.exists()) return
    snap.forEach((child) => {
      const value = child.val() ?? {}
      const uid = value.uid ?? child.key
      const updatedAt = readNonNegInt(value.updatedAt)
      const current = byUid.get(uid)
      if (!current) {
        byUid.set(uid, {
          uid,
          displayName: typeof value.displayName === 'string' ? value.displayName : '익명',
          score: readScore(value.score),
          timeMs: readNonNegInt(value.timeMs),
          cleared: value.cleared === true,
          updatedAt,
        })
        return
      }
      // 스테이지별 누적 점수를 합산. displayName은 최신(updatedAt 큰 쪽) 것을 채택.
      current.score += readScore(value.score)
      current.timeMs += readNonNegInt(value.timeMs)
      current.cleared = current.cleared || value.cleared === true
      if (updatedAt > current.updatedAt) {
        current.updatedAt = updatedAt
        if (typeof value.displayName === 'string') current.displayName = value.displayName
      }
    })
  }))
  return [...byUid.values()].sort(compareRankingWindowEntries).slice(0, limit)
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

function readSeasonId(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function readScore(value) {
  const score = Number(value)
  return Number.isFinite(score) && score > 0 ? Math.floor(score) : 0
}

function readNonNegInt(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}
