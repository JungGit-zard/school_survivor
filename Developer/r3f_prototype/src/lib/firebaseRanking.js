import { getFirebaseConfig } from './firebaseAuth.js'
import { getAdminRankingSeasonConfig } from './adminConfig.js'
import { getSavedNickname } from './userNickname.js'
import { t } from './i18n.js'
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
const defaultSeasonName = () => t('ranking.defaultSeason', null, DEFAULT_SEASON_NAME)
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
  const name = (typeof config?.seasonName === 'string' && config.seasonName.trim()) || defaultSeasonName()
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
// 신뢰 경계는 database.rules.json(본인 uid만·최고점만·스테이지 화이트리스트)이 전담한다.
// 점수 상한은 f955342에서 제거됐다 — 무한모드라 상한을 두면 긴 런이 기록되지 않는다.
// 활성 시즌의 stage(daily+weekly) + global(daily+weekly) = 4버킷에 auth.uid를 키로 멀티패스 기록.
// E2E 우회/미설정/시즌 밖이면 skip. 최고점(max) 모델 — 기존보다 낮은 점수는 규칙이 거른다.
// 반환: { written[], skipped[], failed[], reason? }. skipped는 정상(기존 최고점이 더 높음),
// failed는 최고점 유실(권한 거부·규칙 불일치·네트워크)이라 절대 같이 묶으면 안 된다.
export async function submitRun(user, { stageId, score, timeMs, cleared } = {}) {
  if (!user?.uid) return notSubmitted('signedOut')
  if (!isFirebaseRankingConfigured()) return notSubmitted('unconfigured')
  // E2E 우회 유저 점수는 실랭킹에 오염되지 않게 차단
  const now = Date.now()
  const season = getActiveSeason(now)
  if (!season.active) return notSubmitted('seasonOff')

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
  const results = await Promise.all(paths.map(async (path) => {
    const entryRef = mod.ref(db, `${path}/${uid}`)
    try {
      const snap = await mod.get(entryRef)
      if (snap?.exists?.() && readNonNegInt(snap.child('score').val()) >= entry.score) return { path, status: 'skipped' }
      await mod.set(entryRef, entry)
      return { path, status: 'written' }
    } catch (error) {
      // 실패한 버킷만 failed로 남긴다 — 다른 버킷은 계속 진행한다.
      return { path, status: 'failed', error }
    }
  }))

  // skipped(기존 최고점이 더 높음)와 failed(권한 거부·규칙 불일치·네트워크)는 전혀 다른 사건이다.
  // 예전에는 둘 다 같은 빈 catch로 삼켜서, 배포된 규칙이 클라 점수식보다 낡아 제출이 통째로
  // 거부돼도 아무도 몰랐다. failed는 "최고점이 유실됐다"는 뜻이므로 반드시 드러나야 한다.
  const outcome = summarize(results)
  if (outcome.failed.length > 0 && typeof console !== 'undefined') {
    console.warn('[ranking] submission rejected — this score was NOT recorded.', {
      stageId: sid, score: entry.score, timeMs: entry.timeMs, cleared: entry.cleared, failed: outcome.failed,
    })
  }
  return outcome
}

function summarize(results) {
  const pick = (status) => results.filter((result) => result.status === status).map((result) => result.path)
  const failures = results.filter((result) => result.status === 'failed')
  const outcome = { written: pick('written'), skipped: pick('skipped'), failed: pick('failed') }
  if (failures.length > 0) outcome.failureKind = classifyFailure(failures.map((result) => result.error))
  return outcome
}

// 규칙 거부와 네트워크/오프라인은 플레이어에게 전혀 다른 안내가 필요하다.
// 거부는 "이 점수는 이 규칙으로는 절대 안 올라간다"(재시도 무의미에 가깝다),
// 네트워크는 "지금만 실패했다"(재시도로 복구된다).
function classifyFailure(errors) {
  const text = errors
    .map((error) => `${error?.code ?? ''} ${error?.message ?? ''}`)
    .join(' ')
    .toLowerCase()
  return /permission[_ -]?denied/.test(text) ? 'rejected' : 'network'
}

function notSubmitted(reason) {
  return { written: [], skipped: [], failed: [], reason }
}

// submitRun 결과 → 화면이 그대로 소비할 단일 상태. 여기서 갈라두지 않으면 UI가
// written/skipped/failed 배열을 매번 재해석해야 하고, 그 과정에서 "정상 스킵"과
// "최고점 유실"이 또 뭉개진다. 사용자가 화낸 지점이 정확히 그 뭉갬이다.
//   recorded     : 최소 한 버킷에 새 최고점이 실제로 기록됐다
//   notBest      : 기존 최고점이 더 높아 정상 스킵 — 보드의 내 기록은 그대로다
//   failed       : 최고점 유실. reason = 'rejected' | 'network'
//   notSubmitted : 시도조차 안 했다. reason = 'signedOut' | 'unconfigured' | 'seasonOff' 등
export function describeSubmission(outcome) {
  if (!outcome) return { status: 'failed', reason: 'network' }
  if (outcome.reason) return { status: 'notSubmitted', reason: outcome.reason }
  if (outcome.failed?.length > 0) return { status: 'failed', reason: outcome.failureKind ?? 'network' }
  if (outcome.written?.length > 0) return { status: 'recorded' }
  return { status: 'notBest' }
}

// 계정 삭제 시 지울 수 있는 랭킹 버킷의 스테이지 목록(규칙의 $stageId 화이트리스트와 일치).
const RANKING_STAGE_IDS = Object.freeze(['stage1', 'stage2', 'stage3', 'stage4'])

// 계정 삭제 경로 전용. 활성 시즌의 "오늘 daily + 이번 주 weekly" 버킷에서 본인 엔트리를 제거한다.
// 4스테이지 × 2윈도 + 글로벌 2윈도 = 10경로.
//
// 한계(의도된 것이 아니라 구조적 제약): 클라이언트가 지울 수 있는 건 지금 계산 가능한
// periodKey뿐이다. 과거 날짜/주의 periodKey와 과거 시즌 ID는 열거할 방법이 없다 —
// 규칙이 entries 노드 아래만 읽기를 허용하고 periodKey 레벨 list 권한이 없으며 시즌
// 레지스트리도 없다. 즉 과거 기간의 기록은 이 함수로 지워지지 않는다.
//
// 각 경로는 독립적으로 시도하고(Promise.allSettled) 실패해도 나머지를 계속한다.
// 호출자는 failed로 "남는 데이터"를 알 수 있다.
export async function deleteRankingEntriesForUser(user) {
  if (!user?.uid || !isFirebaseRankingConfigured()) return { attempted: 0, deleted: [], failed: [] }

  const now = Date.now()
  // 삭제는 시즌 활성 여부와 무관하게 시도한다(비활성 시즌에도 데이터는 남아 있다).
  const { seasonId } = getActiveSeason(now)
  const dailyKey = kstDailyKey(now)
  const weeklyKey = kstWeeklyKey(now)
  const paths = [
    ...RANKING_STAGE_IDS.flatMap((stageId) => [
      entriesPath(seasonId, stageId, 'daily', dailyKey),
      entriesPath(seasonId, stageId, 'weekly', weeklyKey),
    ]),
    globalEntriesPath(seasonId, 'daily', dailyKey),
    globalEntriesPath(seasonId, 'weekly', weeklyKey),
  ].map((path) => `${path}/${user.uid}`)

  let client = null
  try {
    client = await getClient()
  } catch {
    return { attempted: paths.length, deleted: [], failed: [...paths] }
  }

  const { db, mod } = client
  const results = await Promise.allSettled(paths.map((path) => mod.remove(mod.ref(db, path))))
  const deleted = []
  const failed = []
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') deleted.push(paths[index])
    else failed.push(paths[index])
  })
  return { attempted: paths.length, deleted, failed }
}

// 랭킹 표시명: 저장된 닉네임 우선, 없으면 구글 표시명, 그래도 없으면 익명. 상한 40자(규칙과 일치).
function readDisplayName(user) {
  const nickname = typeof getSavedNickname() === 'string' ? getSavedNickname().trim() : ''
  const googleName = typeof user?.displayName === 'string' ? user.displayName.trim() : ''
  return (nickname || googleName || t('ranking.anonymousSurvivor', null, '익명 생존자')).slice(0, MAX_DISPLAY_NAME)
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
