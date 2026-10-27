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
// adminConfig 기본 시즌명. 운영자가 이름을 바꾸지 않았으면 현재 로케일 문구로 보여 준다.
const BUILT_IN_SEASON_NAME = '첫 생존 시즌'

export function displaySeasonName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (trimmed === BUILT_IN_SEASON_NAME) return t('lobby.firstSeason', null, BUILT_IN_SEASON_NAME)
  return trimmed || defaultSeasonName()
}
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
let guestClientPromise = null
const pendingBuckets = new Map()
const deletingRankingUids = new Set()
// 이 세션에서 본인이 제출한 엔트리의 로컬 사본(fullPath → 병합 엔트리). 서버 쓰기가 아직 끝나지
// 않았거나 확인(readback) 전이라도 로비 "내 최고기록"이 방금 끝낸 판을 보여주게 한다.
const ownSubmittedEntries = new Map()
// fullPath → 이 세션이 마지막으로 확인한 서버 값(null = 서버에 없음, 키 없음 = 아직 모름).
// 버킷마다 한 번만 읽고 이후 병합은 이 캐시로 계산한다. 예전 runTransaction은 클라가 그 경로를
// 구독하지 않아 첫 시도가 항상 빈 로컬 해시로 나가 datastale → 재시도가 됐다(2026-10-27 QA:
// 4분에 경로당 77트랜잭션, datastale 233회). 쓰기는 본인 uid만 하므로 캐시가 틀어지는 건
// 같은 계정의 다른 기기/탭뿐이고, 그때는 규칙(score 단조)이 거부 → 캐시를 버리고 재시도에서 다시 읽는다.
const serverEntries = new Map()
// fullPath → 그 버킷의 마지막 flush 결과({ path, status, error? }). 큐 뒤쪽 호출자가 결과를 읽는다.
const lastBucketOutcome = new Map()
// uid → 진행 중/대기 중 flush 체인. 한 uid의 버킷 쓰기는 한 번에 하나만, 나머지는 병합돼 뒤따른다.
const flushQueues = new Map()
export function resumeRankingSubmissions(user) { if (user?.uid) deletingRankingUids.delete(user.uid) }
export function completeRankingAccountDeletion(user) {
  for (const [path, request] of pendingBuckets) if (request.user.uid === user?.uid) pendingBuckets.delete(path)
  for (const [path, entry] of ownSubmittedEntries) if (entry.uid === user?.uid) ownSubmittedEntries.delete(path)
  for (const path of serverEntries.keys()) if (path.endsWith(`/${user?.uid}`)) serverEntries.delete(path)
}
const guestWriteQueues = new Map()
function enqueueGuestWrite(user, operation) {
  const previous = guestWriteQueues.get(user.uid) ?? Promise.resolve()
  const queued = previous.catch(() => {}).then(operation)
  guestWriteQueues.set(user.uid, queued)
  const cleanup = () => { if (guestWriteQueues.get(user.uid) === queued) guestWriteQueues.delete(user.uid) }
  queued.then(cleanup, cleanup)
  return queued
}
async function getClient(user) {
  if (_testClient) return _testClient
  if (user?.isAnonymous) {
    if (!guestClientPromise) guestClientPromise = import('./guestRankingIdentity.js').then(module => module.getGuestRankingClient()).catch(error => { guestClientPromise = null; throw error })
    return guestClientPromise
  }
  if (!_clientPromise) _clientPromise = createClient().catch(error => { _clientPromise = null; throw error })
  return _clientPromise
}

// 테스트 전용 주입 seam — { db, mod }를 밀어넣어 실제 firebase/database 없이 submit/fetch 검증.
export function _setFirebaseRankingClientForTests(client) {
  guestClientPromise = null
  pendingBuckets.clear()
  ownSubmittedEntries.clear()
  serverEntries.clear()
  lastBucketOutcome.clear()
  flushQueues.clear()
  deletingRankingUids.clear()
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
  const name = displaySeasonName(config?.seasonName)
  const startMs = kstDateStartMs(config?.startsAt) // null = 하한 없음
  const endMs = kstDateEndMs(config?.endsAt) // null = 상한 없음
  const afterStart = startMs == null || nowMs >= startMs
  const beforeEnd = endMs == null || nowMs <= endMs
  return { seasonId, name, endsAt: endMs, active: afterStart && beforeEnd }
}

function periodKey(window, nowMs) {
  if (window === 'allTime') return 'all-time'
  return window === 'weekly' ? kstWeeklyKey(nowMs) : kstDailyKey(nowMs)
}

function normalizeWindow(window) {
  if (window === 'allTime') return 'allTime'
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
export function prepareRankingSubmission(run = {}, eventAt = Date.now()) {
  const submittedAt = run.submittedAt ?? eventAt
  const season = getActiveSeason(submittedAt)
  return { ...run, submittedAt, lastPlayedAt: run.lastPlayedAt ?? submittedAt,
    rankingPeriod: run.rankingPeriod ?? { seasonId: season.seasonId, active: season.active,
      dailyKey: kstDailyKey(submittedAt), weeklyKey: kstWeeklyKey(submittedAt) } }
}

// 한 런 = 한 번의 쓰기. 스테이지를 이어 간 런은 run 배열로 넘긴다 — 스테이지마다 자기 보드에
// 엔트리를 남기되(stageScore), 전부 같은 멀티패스 update() 한 번으로 나간다. 글로벌 보드는 같은
// 경로라 pendingBuckets에서 최고점으로 병합된다.
export async function submitRun(user, run = {}) {
  if (!user?.uid) return notSubmitted('signedOut')
  const runs = Array.isArray(run) ? run : [run]
  if (runs.length === 0) return notSubmitted('empty')
  const eventAt = Date.now()
  const captured = runs.map(stageRun => prepareRankingSubmission(stageRun, eventAt))
  if (deletingRankingUids.has(user.uid)) return notSubmitted('accountDeleting')
  if (user.isAnonymous) {
    await guestWriteQueues.get(user.uid)?.catch(() => {})
    const { getGuestRankingNicknameForUid } = await import('./guestRankingIdentity.js')
    user = { ...user, displayName: getGuestRankingNicknameForUid(user.uid) || user.displayName }
  }
  if (deletingRankingUids.has(user.uid)) return notSubmitted('accountDeleting')
  if (!isFirebaseRankingConfigured()) return notSubmitted('unconfigured')
  const requests = captured.flatMap(stageRun => enqueueRunBuckets(user, stageRun))
  await flushPendingBuckets(user)
  const paths = [...new Set(requests.map(request => request.path))]
  // skipped(기존 최고점이 더 높음)와 failed(권한 거부·규칙 불일치·네트워크)는 전혀 다른 사건이다.
  // 예전에는 둘 다 같은 빈 catch로 삼켜서, 배포된 규칙이 클라 점수식보다 낡아 제출이 통째로
  // 거부돼도 아무도 몰랐다. failed는 "최고점이 유실됐다"는 뜻이므로 반드시 드러나야 한다.
  const outcome = summarize(paths.map(bucketOutcome))
  if (outcome.failed.length > 0 && typeof console !== 'undefined') {
    console.warn('[ranking] submission has unacknowledged buckets', {
      stages: captured.map(stageRun => ({ stageId: stageRun.stageId, score: stageRun.score, timeMs: stageRun.timeMs, cleared: stageRun.cleared === true })),
      failed: outcome.failed,
    })
  }
  return outcome
}

export async function retryPendingRankings(user = null) {
  user ??= [...pendingBuckets.values()].find(request => request.user.isAnonymous && !deletingRankingUids.has(request.user.uid))?.user
  if (!user?.uid || deletingRankingUids.has(user.uid)) return notSubmitted('signedOut')
  const paths = [...pendingBuckets.values()].filter(request => request.user.uid === user.uid).map(request => request.path)
  if (paths.length > 0) await flushPendingBuckets(user)
  return { ...summarize(paths.map(bucketOutcome)), uid: user.uid, anonymous: user.isAnonymous === true }
}

function bucketOutcome(path) {
  return lastBucketOutcome.get(path) ?? { path, status: 'failed', error: new Error('Ranking bucket was not flushed') }
}

function waitForRankingWrites(uid) {
  return flushQueues.get(uid)?.catch(() => {}) ?? Promise.resolve()
}

// 한 uid의 대기 버킷을 직렬로 flush한다. 앞 flush가 도는 동안 들어온 제출은 pendingBuckets에서
// 병합돼 다음 flush 한 번으로 나간다(체크포인트가 몰려도 왕복은 늘지 않는다).
function flushPendingBuckets(user) {
  const uid = user.uid
  const previous = flushQueues.get(uid) ?? Promise.resolve()
  const queued = previous.catch(() => {}).then(() => flushPendingBucketsNow(user))
  flushQueues.set(uid, queued)
  const cleanup = () => { if (flushQueues.get(uid) === queued) flushQueues.delete(uid) }
  queued.then(cleanup, cleanup)
  return queued
}

// 버킷당 서버 값은 세션에서 처음 한 번만 읽고(serverEntries), 바뀐 버킷만 모아 루트 기준
// 멀티패스 update() 한 번으로 쓴다. 트랜잭션·쓰기 후 readback을 쓰지 않는다 — update 프라미스의
// resolve가 곧 서버 커밋 ACK다. 버킷별 best-only는 여기서 버킷마다 병합해 지키고, 규칙의 score 단조
// 검사가 최종 방어선이다. 캐시가 낡아 규칙이 거부하면 배치 전체가 실패하므로(atomic) 캐시를 버리고
// failed로 남겨 retryPendingRankings가 다시 읽고 쓰게 한다.
async function flushPendingBucketsNow(user) {
  const uid = user.uid
  const requests = [...pendingBuckets.values()].filter(request => request.user.uid === uid)
  if (requests.length === 0) return
  const fail = (error) => {
    for (const request of requests) {
      serverEntries.delete(request.path)
      lastBucketOutcome.set(request.path, { path: request.path, status: 'failed', error })
    }
  }
  if (deletingRankingUids.has(uid)) return fail(new Error('Account deletion in progress'))
  try {
    const { db, mod } = await getClient(user)
    await Promise.all(requests.filter(request => !serverEntries.has(request.path)).map(async (request) => {
      const snapshot = await mod.get(mod.ref(db, request.path))
      serverEntries.set(request.path, snapshot.exists() ? snapshot.val() : null)
    }))
    if (deletingRankingUids.has(uid)) return fail(new Error('Account deletion in progress'))
    const batch = requests.map(request => ({ request, incoming: request.entry, merged: mergeRankingPlay(serverEntries.get(request.path), request.entry) }))
    const updates = {}
    for (const { request, merged } of batch) if (merged) updates[request.path] = merged
    if (Object.keys(updates).length > 0) await mod.update(mod.ref(db), updates)
    for (const { request, incoming, merged } of batch) {
      if (merged) serverEntries.set(request.path, merged)
      lastBucketOutcome.set(request.path, { path: request.path, status: merged ? 'written' : 'skipped' })
      if (request.entry === incoming) pendingBuckets.delete(request.path)
    }
  } catch (error) { fail(error) }
}

// 한 스테이지 기록을 그 보드들의 대기 버킷에 병합만 한다. 네트워크는 submitRun의 flush 한 번이 탄다.
function enqueueRunBuckets(user, { stageId, score, stageScore = score, timeMs, globalTimeMs = timeMs, cleared, lastPlayedAt, submittedAt, rankingPeriod } = {}) {
  // E2E 우회 유저 점수는 실랭킹에 오염되지 않게 차단
  const now = submittedAt
  const season = rankingPeriod

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
    ...(Number.isFinite(lastPlayedAt) && lastPlayedAt > 0 ? { lastPlayedAt } : {}),
  }

  const dailyKey = rankingPeriod.dailyKey
  const weeklyKey = rankingPeriod.weeklyKey
  const paths = [
    ...(season.active ? [
    entriesPath(season.seasonId, sid, 'daily', dailyKey),
    entriesPath(season.seasonId, sid, 'weekly', weeklyKey),
    globalEntriesPath(season.seasonId, 'daily', dailyKey),
    globalEntriesPath(season.seasonId, 'weekly', weeklyKey),
    ] : []),
    entriesPath('all-time', sid, 'allTime', 'all-time'),
    globalEntriesPath('all-time', 'allTime', 'all-time'),
  ]

  // 최고점(best-only)은 버킷마다 독립이다(daily/weekly는 리셋 주기가 다름) — 이번 점수가 주간
  // 최고보다 낮아도 새 일일 버킷에는 최고일 수 있다. 그래서 버킷마다 서버 값과 병합해 "바뀐 버킷만"
  // 멀티패스 update에 넣는다. 기존 최고가 더 높은 버킷은 최고 엔트리를 그대로(lastPlayedAt만 갱신)
  // 다시 쓰므로 규칙의 score 단조 검사를 통과하고, 한 버킷 때문에 배치 전체가 롤백되지 않는다.
  return paths.map(path => {
    const incoming = path.includes('/stage/') ? { ...entry, score: readScore(stageScore) } : { ...entry, timeMs: readNonNegInt(globalTimeMs) }
    const fullPath = `${path}/${uid}`
    const own = ownSubmittedEntries.get(fullPath)
    ownSubmittedEntries.set(fullPath, mergeRankingPlay(own, incoming) ?? own)
    const existing = pendingBuckets.get(fullPath)
    if (existing) existing.entry = mergeRankingPlay(existing.entry, incoming) ?? existing.entry
    else pendingBuckets.set(fullPath, { path: fullPath, user, entry: incoming })
    return pendingBuckets.get(fullPath)
  })
}

function mergeRankingPlay(current, incoming) {
  if (!current) return incoming
  const best = compareRankingWindowEntries(current, incoming) <= 0 ? current : incoming
  const lastPlayedAt = Math.max(readNonNegInt(current.lastPlayedAt), readNonNegInt(incoming.lastPlayedAt))
  const next = { ...best, displayName: incoming.displayName, ...(lastPlayedAt > 0 ? { lastPlayedAt } : {}) }
  return JSON.stringify(next) === JSON.stringify(current) ? undefined : next
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
  if (outcome.failed?.length > 0) return { status: 'failed', reason: outcome.failureKind ?? 'network', ...((outcome.written?.length || outcome.skipped?.length) ? { partial: true, acknowledgedCount: (outcome.written?.length ?? 0) + (outcome.skipped?.length ?? 0), failedCount: outcome.failed.length } : {}) }
  if (outcome.written?.length > 0) return { status: 'recorded' }
  return { status: 'notBest' }
}

// 계정 삭제 시 지울 수 있는 랭킹 버킷의 스테이지 목록(규칙의 $stageId 화이트리스트와 일치).
const RANKING_STAGE_IDS = Object.freeze(['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7', 'stage8', 'stage9', 'stage10'])

// 계정 삭제 경로 전용. 활성 시즌의 "오늘 daily + 이번 주 weekly" 버킷에서 본인 엔트리를 제거한다.
// 현재 기간 스테이지 10개 및 글로벌의 daily/weekly + 각 allTime 경로.
//
// 한계(의도된 것이 아니라 구조적 제약): 클라이언트가 지울 수 있는 건 지금 계산 가능한
// periodKey뿐이다. 과거 날짜/주의 periodKey와 과거 시즌 ID는 열거할 방법이 없다 —
// 규칙이 entries 노드 아래만 읽기를 허용하고 periodKey 레벨 list 권한이 없으며 시즌
// 레지스트리도 없다. 즉 과거 기간의 기록은 이 함수로 지워지지 않는다.
//
// 각 경로는 독립적으로 시도하고(Promise.allSettled) 실패해도 나머지를 계속한다.
// 호출자는 failed로 "남는 데이터"를 알 수 있다.
function knownRankingEntryPaths(uid) {
  const now = Date.now()
  // 삭제는 시즌 활성 여부와 무관하게 시도한다(비활성 시즌에도 데이터는 남아 있다).
  const { seasonId } = getActiveSeason(now)
  const dailyKey = kstDailyKey(now)
  const weeklyKey = kstWeeklyKey(now)
  return [
    ...RANKING_STAGE_IDS.flatMap((stageId) => [
      entriesPath(seasonId, stageId, 'daily', dailyKey),
      entriesPath(seasonId, stageId, 'weekly', weeklyKey),
    ]),
    globalEntriesPath(seasonId, 'daily', dailyKey),
    globalEntriesPath(seasonId, 'weekly', weeklyKey),
    ...RANKING_STAGE_IDS.map((stageId) => entriesPath('all-time', stageId, 'allTime', 'all-time')),
    globalEntriesPath('all-time', 'allTime', 'all-time'),
  ].map((path) => `${path}/${uid}`)
}

export async function deleteRankingEntriesForUser(user) {
  if (!user?.uid || !isFirebaseRankingConfigured()) return { attempted: 0, deleted: [], failed: [] }
  deletingRankingUids.add(user.uid)
  for (const [path, entry] of ownSubmittedEntries) if (entry.uid === user.uid) ownSubmittedEntries.delete(path)
  await waitForRankingWrites(user.uid)
  const paths = [...new Set([...knownRankingEntryPaths(user.uid), ...[...pendingBuckets.values()].filter(request => request.user.uid === user.uid).map(request => request.path)])]

  let client = null
  try {
    client = await getClient(user)
  } catch {
    return { attempted: paths.length, deleted: [], failed: [...paths] }
  }

  const { db, mod } = client
  const results = await Promise.allSettled(paths.map((path) => mod.remove(mod.ref(db, path))))
  const deleted = []
  const failed = []
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') { deleted.push(paths[index]); serverEntries.set(paths[index], null) }
    else { failed.push(paths[index]); serverEntries.delete(paths[index]) }
  })
  return { attempted: paths.length, deleted, failed }
}

export async function renameRankingEntriesForUser(user, nickname) {
  if (user?.isAnonymous) return enqueueGuestWrite(user, async () => {
    await waitForRankingWrites(user.uid)
    return renameRankingEntriesNow(user, nickname)
  })
  return renameRankingEntriesNow(user, nickname)
}

async function renameRankingEntriesNow(user, nickname) {
  if (deletingRankingUids.has(user?.uid)) return { attempted: 0, updated: [], failed: [], reason: 'accountDeleting' }
  if (!user?.uid || !isFirebaseRankingConfigured()) return { attempted: 0, updated: [], failed: [], reason: 'unavailable' }
  if (typeof nickname !== 'string' || nickname.length < 2 || nickname.length > 12 || !nickname.trim()) {
    return { attempted: 0, updated: [], failed: [], reason: 'invalidNickname' }
  }
  const paths = knownRankingEntryPaths(user.uid)
  let client
  try {
    client = await getClient(user)
  } catch {
    return { attempted: paths.length, updated: [], failed: [...paths] }
  }
  const { db, mod } = client
  const results = await Promise.all(paths.map(async (path) => {
    try {
      const entryRef = mod.ref(db, path)
      const snapshot = await mod.get(entryRef)
      if (!snapshot.exists()) return { path, status: 'missing' }
      await mod.update(entryRef, { displayName: nickname })
      serverEntries.delete(path)
      return { path, status: 'updated' }
    } catch {
      return { path, status: 'failed' }
    }
  }))
  if (results.every(result => result.status !== 'failed')) {
    for (const request of pendingBuckets.values()) if (request.user.uid === user.uid) request.entry = { ...request.entry, displayName: nickname }
  }
  return { attempted: paths.length,
    updated: results.filter((result) => result.status === 'updated').map((result) => result.path),
    failed: results.filter((result) => result.status === 'failed').map((result) => result.path) }
}

// 랭킹 표시명: 저장된 닉네임 우선, 없으면 구글 표시명, 그래도 없으면 익명. 상한 40자(규칙과 일치).
function readDisplayName(user) {
  if (user?.isAnonymous) return (user.displayName?.trim() || t('ranking.anonymousSurvivor', null, '익명 생존자')).slice(0, MAX_DISPLAY_NAME)
  const nickname = typeof getSavedNickname() === 'string' ? getSavedNickname().trim() : ''
  const googleName = typeof user?.displayName === 'string' ? user.displayName.trim() : ''
  return (nickname || googleName || t('ranking.anonymousSurvivor', null, '익명 생존자')).slice(0, MAX_DISPLAY_NAME)
}

// 스테이지별 top N. window=daily|weekly|allTime; 영구 보드는 시즌과 무관하다.
export async function fetchStageRanking(stageId, window, { limit = 100 } = {}) {
  if (!isFirebaseRankingConfigured()) return []
  const now = Date.now()
  const season = getActiveSeason(now)
  const win = normalizeWindow(window)
  if (!season.active && win !== 'allTime') return []
  const key = periodKey(win, now)
  const { db, mod } = await getClient()
  const q = mod.query(
    mod.ref(db, entriesPath(win === 'allTime' ? 'all-time' : season.seasonId, readStageId(stageId), win, key)),
    mod.orderByChild('score'),
    mod.limitToLast(limit),
  )
  return readRankingEntries(await mod.get(q), limit)
}

export function subscribeStageRanking(stageId, window, onEntries, { limit = 100, onError } = {}) {
  return subscribeRankingWindow(
    window,
    (seasonId, win, key) => entriesPath(seasonId, readStageId(stageId), win, key),
    onEntries,
    limit,
    onError,
  )
}

// 본인 엔트리 1개를 정확한 버킷 경로로 읽는다(게스트·로그인 공통). 보드는 상위 N개만 그리므로
// 0점·저점 엔트리는 저장돼 있어도 보드에 안 보인다 — "내 기록" 줄과 로비 최고기록은 이걸 쓴다.
// stageId가 없으면 글로벌 버킷. 서버 값과 이 세션의 본인 제출분(쓰기 진행 중 포함) 중 더 좋은 쪽.
export async function fetchMyRankingEntry(user, window = 'allTime', stageId = null) {
  const uid = typeof user?.uid === 'string' ? user.uid : ''
  if (!uid || !isFirebaseRankingConfigured()) return null
  const now = Date.now()
  const win = normalizeWindow(window)
  const season = getActiveSeason(now)
  if (!season.active && win !== 'allTime') return null
  const seasonId = win === 'allTime' ? 'all-time' : season.seasonId
  const key = periodKey(win, now)
  const bucket = stageId ? entriesPath(seasonId, readStageId(stageId), win, key) : globalEntriesPath(seasonId, win, key)
  const fullPath = `${bucket}/${uid}`
  let server = null
  try {
    const { db, mod } = await getClient()
    const snap = await mod.get(mod.ref(db, fullPath))
    server = snap.exists() ? snap.val() : null
  } catch { server = null }
  const candidates = [server, ownSubmittedEntries.get(fullPath)].filter((entry) => entry && entry.uid === uid)
  if (candidates.length === 0) return null
  return { ...candidates.sort(compareRankingWindowEntries)[0] }
}

// 로비 "내 최고기록" 단일 출처: 본인 all-time 스테이지 엔트리. 게스트는 users/{uid} 진행도가 없어
// playerRecords로는 기록을 볼 수 없다. 0점 엔트리도 기록이다(정책: 0점이라도 등록, 입장이력은 모두 등록).
// 반환: { [stageId]: { score, timeMs, cleared } } — 엔트리가 없는 스테이지는 키가 없다.
export async function fetchMyStageBests(user, stageIds = []) {
  const bests = {}
  await Promise.all(stageIds.map(async (stageId) => {
    const entry = await fetchMyRankingEntry(user, 'allTime', stageId)
    if (entry) bests[readStageId(stageId)] = { score: readScore(entry.score), timeMs: readNonNegInt(entry.timeMs), cleared: entry.cleared === true }
  }))
  return bests
}

// 글로벌: 제출 시 함께 기록된 유저별 최고점(max) 통합 엔트리를 읽는다.
export async function fetchGlobalRanking(window, { limit = 100 } = {}) {
  if (!isFirebaseRankingConfigured()) return []
  const now = Date.now()
  const season = getActiveSeason(now)
  const win = normalizeWindow(window)
  if (!season.active && win !== 'allTime') return []
  const key = periodKey(win, now)
  const { db, mod } = await getClient()

  const q = mod.query(
    mod.ref(db, globalEntriesPath(win === 'allTime' ? 'all-time' : season.seasonId, win, key)),
    mod.orderByChild('score'),
    mod.limitToLast(limit),
  )
  return readRankingEntries(await mod.get(q), limit)
}

export function subscribeGlobalRanking(window, onEntries, { limit = 100, onError } = {}) {
  return subscribeRankingWindow(
    window,
    (seasonId, win, key) => globalEntriesPath(seasonId, win, key),
    onEntries,
    limit,
    onError,
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
    lastPlayedAt: row.lastPlayedAt ?? null,
  }))
}

function readStageId(stageId) {
  const id = typeof stageId === 'string' ? stageId.trim() : ''
  return id || 'stage1'
}

function subscribeRankingWindow(window, pathForWindow, onEntries, limit, onError) {
  if (typeof onEntries !== 'function') return () => {}
  if (!isFirebaseRankingConfigured()) {
    onEntries([])
    return () => {}
  }

  let closed = false
  let unsubscribe = () => {}
  let boundaryTimer = null
  let generation = 0
  const subscribe = async () => {
    const current = ++generation
    unsubscribe()
    if (boundaryTimer != null) globalThis.clearTimeout(boundaryTimer)
    const win = normalizeWindow(window)
    try {
      const { db, mod } = await getClient()
      if (closed || current !== generation) return
      // Client/auth initialization may finish after midnight or a season change.
      const now = Date.now()
      const season = getActiveSeason(now)
      if (!season.active && win !== 'allTime') {
        onEntries([])
        return
      }
      const key = periodKey(win, now)
      const q = mod.query(
        mod.ref(db, pathForWindow(win === 'allTime' ? 'all-time' : season.seasonId, win, key)),
        mod.orderByChild('score'),
        mod.limitToLast(limit),
      )
      unsubscribe = mod.onValue(
        q,
        (snap) => { if (!closed && current === generation) onEntries(readRankingEntries(snap, limit)) },
        (error) => { if (!closed && current === generation) onError?.(error) },
      )
      if (win !== 'allTime') boundaryTimer = globalThis.setTimeout(subscribe, msUntilNextWindow(win, Date.now()))
    } catch (error) {
      if (!closed && current === generation) onError?.(error)
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
