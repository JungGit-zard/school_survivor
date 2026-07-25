import { getFirebaseConfig } from './firebaseAuth.js'
import { isE2EAuthBypass } from './e2eAuth.js'
import { getAdminRankingSeasonConfig } from './adminConfig.js'
import { getSavedNickname } from './userNickname.js'
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
const RANKING_ROOT = 'rankingService/v1/public'
const MAX_DISPLAY_NAME = 40

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
let _testClient = null
async function getClient() {
  if (_testClient) return _testClient
  if (!_clientPromise) _clientPromise = createClient()
  return _clientPromise
}

// 테스트 전용 주입 seam — { db, mod }를 밀어넣어 실제 firebase/database 없이 submit/fetch 검증.
export function _setFirebaseRankingClientForTests(client) {
  _testClient = client
  _clientPromise = null
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
  return `${RANKING_ROOT}/${seasonId}/stage/${stageId}/${normalizeWindow(window)}/${key}/entries`
}

function globalEntriesPath(seasonId, window, key) {
  return `${RANKING_ROOT}/${seasonId}/global/${window}/${key}/entries`
}

// Spark 무료 플랜: Cloud Function 없이 클라가 RTDB에 직접 자기 엔트리를 쓴다.
// 신뢰 경계는 database.rules.json(본인 uid만·점수 상한·최고점만)이 전담한다.
// 활성 시즌의 stage(daily+weekly) + global(daily+weekly) = 4버킷에 auth.uid를 키로 멀티패스 기록.
// E2E 우회/미설정/시즌 밖이면 skip. 최고점(max) 모델 — 기존보다 낮은 점수는 규칙이 거른다.
export async function submitRun(user, { stageId, score, timeMs, cleared } = {}) {
  if (!user?.uid || !isFirebaseRankingConfigured()) return
  // E2E 우회 유저 점수는 실랭킹에 오염되지 않게 차단
  if (isE2EAuthBypass()) return
  const now = Date.now()
  const season = getActiveSeason(now)
  if (!season.active) return // seasonOff: 제출 skip

  // 엔트리 키 = auth.uid (해시키 아님). 규칙이 "$uid === auth.uid"로 본인 쓰기만 강제하려면
  // 키가 opaque uid여야 검증 가능하기 때문. Firebase uid는 이메일이 아닌 불투명 식별자라
  // 공개 리더보드 읽기에 노출돼도 게임 랭킹 수준에서 수용 가능(개인정보 아님).
  const uid = user.uid
  const sid = readStageId(stageId)
  const entry = {
    uid,
    displayName: readDisplayName(user),
    score: readScore(score),
    timeMs: readNonNegInt(timeMs),
    cleared: cleared === true,
    stageId: sid,
    submittedAt: now,
  }

  const { db, mod } = await getClient()
  const dailyKey = kstDailyKey(now)
  const weeklyKey = kstWeeklyKey(now)
  const paths = [
    entriesPath(season.seasonId, sid, 'daily', dailyKey),
    entriesPath(season.seasonId, sid, 'weekly', weeklyKey),
    globalEntriesPath(season.seasonId, 'daily', dailyKey),
    globalEntriesPath(season.seasonId, 'weekly', weeklyKey),
  ]

  // 각 버킷을 독립적으로 기록한다. 멀티패스 atomic update는 쓰면 안 된다 —
  // 최고점(best-only) 규칙은 버킷마다 독립이라(daily/weekly는 리셋 주기가 다름),
  // 이번 점수가 주간 최고보다 낮아도 새 일일 버킷에는 최고일 수 있다. atomic이면
  // 주간 경로의 best-only 거부가 전체 쓰기를 롤백해 일일 기록까지 유실된다.
  // 버킷별로 기존 최고점을 읽어 더 높을 때만 쓰고, 규칙이 best-only의 최종 방어선이다.
  await Promise.all(paths.map(async (path) => {
    const entryRef = mod.ref(db, `${path}/${uid}`)
    try {
      const snap = await mod.get(entryRef)
      if (snap?.exists?.() && readNonNegInt(snap.child('score').val()) >= entry.score) return
      await mod.set(entryRef, entry)
    } catch {
      // 읽기/쓰기 실패(권한·best-only 거부 등)는 해당 버킷만 skip — 다른 버킷에 영향 없음.
    }
  }))
}

// 랭킹 표시명: 저장된 닉네임 우선, 없으면 구글 표시명, 그래도 없으면 익명. 상한 40자(규칙과 일치).
function readDisplayName(user) {
  const nickname = typeof getSavedNickname() === 'string' ? getSavedNickname().trim() : ''
  const googleName = typeof user?.displayName === 'string' ? user.displayName.trim() : ''
  return (nickname || googleName || '익명 생존자').slice(0, MAX_DISPLAY_NAME)
}

// 활성 시즌 현재 period의 스테이지별 top N (score 내림차순 + tie-break). window=daily|weekly.
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
  return readRankingEntries(await mod.get(q), limit)
}

export function subscribeStageRanking(stageId, window, onEntries, { limit = 100 } = {}) {
  return subscribeRankingWindow(
    window,
    (seasonId, win, key) => entriesPath(seasonId, readStageId(stageId), win, key),
    onEntries,
    limit,
  )
}

// 글로벌: 제출 시 함께 기록된 유저별 최고점(max) 통합 엔트리를 읽는다.
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

function readScore(value) {
  const score = Number(value)
  return Number.isFinite(score) && score > 0 ? Math.floor(score) : 0
}

function readNonNegInt(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}
