import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// season/E2E 게이트를 결정적으로 제어하기 위한 훅(hoisted — 팩토리가 참조해도 TDZ 안전).
const gates = vi.hoisted(() => ({ seasonConfig: {} }))
const guest = vi.hoisted(() => ({ getClient: vi.fn(), nickname: '' }))
vi.mock('./adminConfig.js', () => ({ getAdminRankingSeasonConfig: () => gates.seasonConfig }))
vi.mock('./guestRankingIdentity.js', () => ({ getGuestRankingClient: guest.getClient, getGuestRankingNicknameForUid: () => guest.nickname }))

import {
  submitRun,
  describeSubmission,
  subscribeStageRanking,
  subscribeGlobalRanking,
  fetchGlobalRanking,
  fetchStageRanking,
  deleteRankingEntriesForUser,
  renameRankingEntriesForUser,
  _setFirebaseRankingClientForTests,
} from './firebaseRanking.js'

function makeFakeClient({ existingScore = null } = {}) {
  const writes = {}
  const mod = {
    ref: (_db, path) => ({ path: path ?? '' }),
    get: vi.fn(async () => ({
      exists: () => existingScore != null,
      child: () => ({ val: () => existingScore }),
    })),
    set: vi.fn(async (ref, value) => {
      writes[ref.path] = value
    }),
  }
  return { client: { db: {}, mod }, mod, writes }
}

describe('firebaseRanking submitRun — direct RTDB write (Spark, no Cloud Function)', () => {
  beforeEach(() => {
    gates.seasonConfig = {}
    guest.nickname = ''
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://x-default-rtdb.firebaseio.com')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    _setFirebaseRankingClientForTests(null)
    vi.restoreAllMocks()
  })

  it('writes the caller entry independently to stage + global daily/weekly buckets keyed by auth uid', async () => {
    const { client, mod, writes } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)

    await submitRun({ uid: 'me', displayName: 'Neo' }, { stageId: 'stage2', score: 100, timeMs: 50000, cleared: true })

    // 각 버킷을 독립 set — atomic 멀티패스 update 아님.
    expect(mod.set).toHaveBeenCalledTimes(6)
    const keys = Object.keys(writes)
    expect(keys).toHaveLength(6)
    expect(keys.every((key) => key.endsWith('/me'))).toBe(true)
    expect(keys.some((key) => key.includes('/stage/stage2/daily/'))).toBe(true)
    expect(keys.some((key) => key.includes('/stage/stage2/weekly/'))).toBe(true)
    expect(keys.some((key) => key.includes('/global/daily/'))).toBe(true)
    expect(keys.some((key) => key.includes('/global/weekly/'))).toBe(true)
    for (const key of keys) {
      expect(writes[key]).toMatchObject({
        uid: 'me',
        displayName: 'Neo',
        score: 100,
        timeMs: 50000,
        cleared: true,
        stageId: 'stage2',
      })
      expect(typeof writes[key].submittedAt).toBe('number')
    }
  })

  it('skips the write in buckets where an existing entry already ties or beats the new score (best-only)', async () => {
    const { client, mod } = makeFakeClient({ existingScore: 500 })
    _setFirebaseRankingClientForTests(client)

    await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 100, timeMs: 60000, cleared: false })

    expect(mod.set).not.toHaveBeenCalled()
  })

  it('keeps stage scores local and global scores cumulative without adding persisted fields', async () => {
    const { client, writes } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)
    await submitRun({ uid: 'me' }, { stageId: 'stage2', score: 900, stageScore: 400,
      timeMs: 300000, globalTimeMs: 540000, cleared: true })
    for (const [path, entry] of Object.entries(writes)) {
      expect(entry.score).toBe(path.includes('/global/') ? 900 : 400)
      expect(entry.timeMs).toBe(path.includes('/global/') ? 540000 : 300000)
      expect(entry).not.toHaveProperty('stageScore')
      expect(entry).not.toHaveProperty('globalTimeMs')
    }
  })

  it('writes zero at first entry, while an existing best score stays intact', async () => {
    const empty = makeFakeClient()
    _setFirebaseRankingClientForTests(empty.client)
    await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 0, timeMs: 0 })
    expect(empty.mod.set).toHaveBeenCalledTimes(6)
    const existing = makeFakeClient({ existingScore: 999999999 })
    _setFirebaseRankingClientForTests(existing.client)
    await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 0, timeMs: 0 })
    expect(existing.mod.set).not.toHaveBeenCalled()
  })

  it('uses the isolated anonymous client and chosen nickname for guest zero-score registration', async () => {
    const { client, writes } = makeFakeClient()
    _setFirebaseRankingClientForTests(null)
    guest.getClient.mockResolvedValueOnce(client)
    await submitRun({ uid: 'guest-uid', isAnonymous: true, displayName: '좀비학생' }, { stageId: 'stage1', score: 0, timeMs: 0 })
    expect(guest.getClient).toHaveBeenCalled()
    expect(Object.values(writes)).toHaveLength(6)
    expect(Object.values(writes).every((entry) => entry.displayName === '좀비학생' && entry.uid === 'guest-uid' && entry.score === 0)).toBe(true)
  })

  it('keeps one permanent high-score path across day, week, and season changes', async () => {
    const { client, writes } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(Date.parse('2026-10-01T12:00:00Z'))
    await submitRun({ uid: 'me' }, { stageId: 'stage2', score: 999999999, stageScore: 888888888, timeMs: 200000, globalTimeMs: 400000 })
    gates.seasonConfig = { seasonId: 'new-season' }
    now.mockReturnValue(Date.parse('2026-11-01T12:00:00Z'))
    await submitRun({ uid: 'me' }, { stageId: 'stage2', score: 999999999, stageScore: 888888888, timeMs: 200000, globalTimeMs: 400000 })
    const permanent = Object.entries(writes).filter(([path]) => path.includes('/allTime/'))
    expect(permanent).toHaveLength(2)
    expect(permanent.every(([path]) => path.includes('/public/all-time/'))).toBe(true)
    expect(permanent.find(([path]) => path.includes('/global/'))[1]).toMatchObject({ score: 999999999, timeMs: 400000 })
    expect(permanent.find(([path]) => path.includes('/stage/'))[1]).toMatchObject({ score: 888888888, timeMs: 200000 })
  })

  it('deletes all five permanent entries along with the ten current-period entries', async () => {
    const { client, mod } = makeFakeClient()
    mod.remove = vi.fn(async () => {})
    _setFirebaseRankingClientForTests(client)
    const result = await deleteRankingEntriesForUser({ uid: 'me' })
    expect(result).toMatchObject({ attempted: 15, failed: [] })
    expect(result.deleted.filter((path) => path.includes('/allTime/all-time/'))).toHaveLength(5)
    expect(result.deleted.every((path) => path.endsWith('/me'))).toBe(true)
  })

  it('renames only existing own entries including zero scores without changing any score or creating absent stages', async () => {
    const { client, mod } = makeFakeClient()
    const records = { global: { score: 999999999, timeMs: 900000, cleared: true }, stage: { score: 0, timeMs: 0, cleared: false } }
    mod.get = vi.fn(async (ref) => ({ exists: () => ref.path.includes('/allTime/') && (ref.path.includes('/global/') || ref.path.includes('/stage/stage1/')) }))
    mod.update = vi.fn(async (ref, patch) => { Object.assign(ref.path.includes('/global/') ? records.global : records.stage, patch) })
    _setFirebaseRankingClientForTests(client)
    const result = await renameRankingEntriesForUser({ uid: 'me', isAnonymous: true }, '새닉네임')
    expect(result).toMatchObject({ attempted: 15, failed: [] })
    expect(result.updated).toHaveLength(2)
    expect(mod.set).not.toHaveBeenCalled()
    expect(mod.update.mock.calls.every(([ref, patch]) => ref.path.endsWith('/me') && JSON.stringify(patch) === JSON.stringify({ displayName: '새닉네임' }))).toBe(true)
    expect(records).toEqual({ global: { score: 999999999, timeMs: 900000, cleared: true, displayName: '새닉네임' }, stage: { score: 0, timeMs: 0, cleared: false, displayName: '새닉네임' } })
  })

  it('returns nickname-update failures rather than silently losing the update', async () => {
    const { client, mod } = makeFakeClient({ existingScore: 0 })
    mod.update = vi.fn(async () => { throw new Error('permission denied') })
    _setFirebaseRankingClientForTests(client)
    const result = await renameRankingEntriesForUser({ uid: 'me' }, '새닉네임')
    expect(result.failed).toHaveLength(15)
    expect(result.updated).toEqual([])
  })

  it('serializes delayed guest submissions and rename, then uses the confirmed name for stale later arguments', async () => {
    const records = new Map()
    let releaseWrites
    const writesReleased = new Promise((resolve) => { releaseWrites = resolve })
    let signalFirstWrite
    const firstWrite = new Promise((resolve) => { signalFirstWrite = resolve })
    let delay = true
    const mod = { ref: (_db, path) => ({ path }),
      get: vi.fn(async ({ path }) => ({ exists: () => records.has(path), child: (key) => ({ val: () => records.get(path)?.[key] }) })),
      set: vi.fn(async ({ path }, entry) => { if (delay) { signalFirstWrite(); await writesReleased } records.set(path, entry) }),
      update: vi.fn(async ({ path }, patch) => { records.set(path, { ...records.get(path), ...patch }) }) }
    _setFirebaseRankingClientForTests({ db: {}, mod })
    const staleUser = { uid: 'guest-race', isAnonymous: true, displayName: '옛이름' }
    guest.nickname = '옛이름'
    const pending = submitRun(staleUser, { stageId: 'stage1', score: 999999, timeMs: 500000 })
    await firstWrite
    guest.nickname = '새이름'
    const rename = renameRankingEntriesForUser(staleUser, '새이름')
    expect(mod.update).not.toHaveBeenCalled()
    delay = false
    releaseWrites()
    await pending
    await rename
    expect([...records.values()].every((entry) => entry.displayName === '새이름' && entry.score === 999999 && entry.timeMs === 500000)).toBe(true)
    await submitRun(staleUser, { stageId: 'stage2', score: 1000000, timeMs: 600000 })
    expect([...records.values()].every((entry) => entry.displayName === '새이름')).toBe(true)
  })

  it('continues the guest write queue after a failed request', async () => {
    _setFirebaseRankingClientForTests(null)
    guest.getClient.mockRejectedValueOnce(new Error('offline'))
    const user = { uid: 'guest-retry', isAnonymous: true, displayName: '학생이름' }
    await expect(submitRun(user, { score: 0 })).rejects.toThrow('offline')
    const { client, mod } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)
    await submitRun(user, { stageId: 'stage1', score: 0, timeMs: 0 })
    expect(mod.set).toHaveBeenCalledTimes(6)
  })

  it('writes when the new score beats the existing entry', async () => {
    const { client, mod } = makeFakeClient({ existingScore: 50 })
    _setFirebaseRankingClientForTests(client)

    await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 100, timeMs: 60000, cleared: false })

    expect(mod.set).toHaveBeenCalledTimes(6)
  })

  // 2026-08-25 랭킹 감사에서 나온 결함: 배포된 규칙이 클라 점수식보다 낡아 제출이 통째로
  // 거부돼도 submitRun이 빈 catch로 전부 삼켜서 "최고점 유실"과 "정상 best-only 스킵"이
  // 구분되지 않았다. 거부는 failed로, 낮은 점수는 skipped로 갈라져 나와야 한다.
  it('reports a rules rejection as failed — not as a silent best-only skip', async () => {
    const { client, mod } = makeFakeClient()
    mod.set = vi.fn(async () => { throw new Error('PERMISSION_DENIED') })
    _setFirebaseRankingClientForTests(client)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const outcome = await submitRun({ uid: 'me' }, { stageId: 'stage2', score: 4968, timeMs: 3600000, cleared: true })

    expect(outcome.failed).toHaveLength(6)
    expect(outcome.written).toHaveLength(0)
    expect(outcome.skipped).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
  })

  it('reports an existing higher score as skipped, and never as failed', async () => {
    const { client } = makeFakeClient({ existingScore: 500 })
    _setFirebaseRankingClientForTests(client)

    const outcome = await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 100, timeMs: 60000, cleared: false })

    expect(outcome.skipped).toHaveLength(6)
    expect(outcome.failed).toHaveLength(0)
    expect(outcome.written).toHaveLength(0)
  })

  it('keeps the buckets that succeeded when another bucket is rejected', async () => {
    const { client, mod } = makeFakeClient()
    const original = mod.set
    mod.set = vi.fn(async (ref, value) => {
      if (ref.path.includes('/weekly/')) throw new Error('PERMISSION_DENIED')
      return original(ref, value)
    })
    _setFirebaseRankingClientForTests(client)
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const outcome = await submitRun({ uid: 'me' }, { stageId: 'stage3', score: 400, timeMs: 280000, cleared: false })

    expect(outcome.written).toHaveLength(4)
    expect(outcome.written.every((path) => !path.includes('/weekly/'))).toBe(true)
    expect(outcome.failed).toHaveLength(2)
  })

  it('skips submission without a signed-in uid', async () => {
    const { client, mod } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)

    await submitRun(null, { stageId: 'stage1', score: 10, timeMs: 1000 })
    await submitRun({}, { stageId: 'stage1', score: 10, timeMs: 1000 })

    expect(mod.set).not.toHaveBeenCalled()
  })

  it('skips submission when the database URL is unconfigured', async () => {
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', '')
    const { client, mod } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)

    await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 10, timeMs: 1000 })

    expect(mod.set).not.toHaveBeenCalled()
  })

  it('records only permanent boards outside an active season window', async () => {
    gates.seasonConfig = { endsAt: '2000-01-01' } // 과거 종료 → 비활성 시즌
    const { client, mod } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)

    await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 10, timeMs: 1000 })

    expect(mod.set).toHaveBeenCalledTimes(2)
  })
})

describe('firebaseRanking client contract', () => {
  const source = readFileSync(new URL('./firebaseRanking.js', import.meta.url), 'utf8')

  it('no longer routes writes through a Cloud Function (Spark-plan compatible)', () => {
    expect(source).not.toContain("import('firebase/functions')")
    expect(source).not.toContain('httpsCallable')
    expect(source).not.toContain("'submitRankingRun'")
  })

  it('writes directly to RTDB via independent per-bucket set keyed by uid (not atomic multi-path)', () => {
    expect(source).toContain('mod.set(')
    expect(source.slice(source.indexOf('export async function submitRun('), source.indexOf('function summarize('))).not.toContain('mod.update(')
    expect(source).toContain('${path}/${uid}')
  })

  it('reads public global and stage projections across daily/weekly windows', () => {
    expect(source).toContain("const RANKING_ROOT = 'rankingService/v1/public'")
    expect(source).toContain('/global/${window}/${key}/entries')
    expect(source).toContain('/stage/${stageId}/${normalizeWindow(window)}/${key}/entries')
  })

  it('subscribes to ranking updates and rebinds at KST period boundaries', () => {
    expect(source).toContain('mod.onValue(')
    expect(source).toContain('msUntilNextWindow')
    expect(source).toContain('kstWeeklyKey(now)')
  })
})

// 2026-08-29: "최고기록을 세웠는데 랭킹 보드가 비어 있다"는 신고의 핵심은 화면이 제출 결과를
// 전혀 모른다는 것이었다. submitRun은 written/skipped/failed 배열만 돌려주고 호출부는 그걸
// 버렸다. describeSubmission은 그 배열을 화면이 그대로 쓸 단일 상태로 접는다 —
// 여기서 갈라지지 않으면 "정상 스킵"과 "최고점 유실"이 또 같은 침묵으로 뭉개진다.
describe('describeSubmission — 제출 결과를 화면이 읽을 단일 상태로 접는다', () => {
  it('새 최고점이 한 버킷이라도 기록되면 recorded', () => {
    expect(describeSubmission({ written: ['a'], skipped: ['b', 'c'], failed: [] })).toEqual({ status: 'recorded' })
  })

  it('전부 스킵이면 notBest — 유실이 아니라 정상이다', () => {
    expect(describeSubmission({ written: [], skipped: ['a', 'b'], failed: [] })).toEqual({ status: 'notBest' })
  })

  it('일부라도 실패하면 failed — 같은 요청에 written이 섞여 있어도 실패가 이긴다', () => {
    expect(describeSubmission({ written: ['a'], skipped: [], failed: ['b'], failureKind: 'rejected' }))
      .toEqual({ status: 'failed', reason: 'rejected' })
  })

  it('규칙 거부와 네트워크 실패를 다른 reason으로 구분한다', () => {
    expect(describeSubmission({ written: [], skipped: [], failed: ['a'], failureKind: 'network' }))
      .toEqual({ status: 'failed', reason: 'network' })
  })

  it('시도조차 못 한 사유(seasonOff·signedOut·unconfigured)를 notSubmitted로 보존한다', () => {
    for (const reason of ['seasonOff', 'signedOut', 'unconfigured']) {
      expect(describeSubmission({ written: [], skipped: [], failed: [], reason }))
        .toEqual({ status: 'notSubmitted', reason })
    }
  })
})

describe('submitRun failureKind — 재시도가 의미 있는 실패인지 구분한다', () => {
  beforeEach(() => {
    gates.seasonConfig = {}
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://x-default-rtdb.firebaseio.com')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    _setFirebaseRankingClientForTests(null)
    vi.restoreAllMocks()
  })

  it('PERMISSION_DENIED는 rejected — 같은 페이로드를 다시 쏴도 또 거부된다', async () => {
    const { client, mod } = makeFakeClient()
    mod.set = vi.fn(async () => { throw new Error('PERMISSION_DENIED: permission_denied at /rankingService') })
    _setFirebaseRankingClientForTests(client)

    const outcome = await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 500, timeMs: 400000, cleared: true })

    expect(outcome.failureKind).toBe('rejected')
    expect(describeSubmission(outcome)).toEqual({ status: 'failed', reason: 'rejected' })
  })

  it('오프라인·타임아웃은 network — 재시도로 복구될 수 있다', async () => {
    const { client, mod } = makeFakeClient()
    mod.set = vi.fn(async () => { throw new Error('Failed to fetch') })
    _setFirebaseRankingClientForTests(client)

    const outcome = await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 500, timeMs: 400000, cleared: true })

    expect(outcome.failureKind).toBe('network')
    expect(describeSubmission(outcome)).toEqual({ status: 'failed', reason: 'network' })
  })

  it('시즌 밖에도 영구 기록은 제출되고 기간 기록은 만들지 않는다', async () => {
    gates.seasonConfig = { endsAt: '2000-01-01' }
    const { client } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)

    const outcome = await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 500, timeMs: 400000, cleared: true })

    expect(outcome.written).toHaveLength(2)
    expect(outcome.written.every((path) => path.includes('/allTime/all-time/'))).toBe(true)
  })
})

// "즉각 보인다"의 구조적 전제. 1회성 get()이면 제출이 성공해도 이미 열려 있는 보드는
// 절대 갱신되지 않는다. onValue 구독이어야 서버 쓰기가 곧 화면 갱신이 된다.
describe('subscribeStageRanking — 1회성 조회가 아니라 실시간 구독이다', () => {
  beforeEach(() => {
    gates.seasonConfig = {}
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://x-default-rtdb.firebaseio.com')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    _setFirebaseRankingClientForTests(null)
    vi.restoreAllMocks()
  })

  function makeSnapshot(entries) {
    return {
      exists: () => entries.length > 0,
      forEach: (fn) => { entries.forEach((entry) => fn({ key: entry.uid, val: () => entry })) },
    }
  }

  it('서버가 새 최고점을 밀어줄 때마다 onEntries를 다시 부른다', async () => {
    const listeners = []
    const mod = {
      ref: (_db, path) => ({ path }),
      query: (ref) => ref,
      orderByChild: () => 'orderByChild',
      limitToLast: () => 'limitToLast',
      get: vi.fn(),
      onValue: vi.fn((_q, onNext) => { listeners.push(onNext); return vi.fn() }),
    }
    _setFirebaseRankingClientForTests({ db: {}, mod })

    const seen = []
    const unsubscribe = subscribeStageRanking('stage1', 'daily', (rows) => seen.push(rows), { limit: 30 })
    await Promise.resolve()
    await Promise.resolve()

    expect(mod.onValue).toHaveBeenCalledTimes(1)
    expect(mod.get).not.toHaveBeenCalled() // 1회성 조회로 끝내지 않는다

    // 서버 push 1: 아직 아무 기록도 없다.
    listeners[0](makeSnapshot([]))
    // 서버 push 2: 방금 제출된 최고기록이 도착한다 — 재조회 없이 그대로 화면에 흘러야 한다.
    listeners[0](makeSnapshot([{ uid: 'me', displayName: '정실장', score: 415, timeMs: 295499, cleared: false }]))

    expect(seen).toHaveLength(2)
    expect(seen[0]).toEqual([])
    expect(seen[1][0]).toMatchObject({ uid: 'me', score: 415 })
    unsubscribe()
  })

  it('reads and subscribes to permanent boards outside seasons without rollover timers', async () => {
    gates.seasonConfig = { endsAt: '2000-01-01', seasonId: 'expired' }
    const snapshot = makeSnapshot([{ uid: 'me', score: 999999999, timeMs: 400000 }])
    const mod = { ref: (_db, path) => ({ path }), query: (ref) => ref,
      orderByChild: () => 'score', limitToLast: () => 100,
      get: vi.fn(async () => snapshot), onValue: vi.fn(() => vi.fn()) }
    _setFirebaseRankingClientForTests({ db: {}, mod })
    const timer = vi.spyOn(globalThis, 'setTimeout')
    expect((await fetchGlobalRanking('allTime'))[0].score).toBe(999999999)
    expect((await fetchStageRanking('stage2', 'allTime'))[0].score).toBe(999999999)
    const stopGlobal = subscribeGlobalRanking('allTime', vi.fn())
    const stopStage = subscribeStageRanking('stage2', 'allTime', vi.fn())
    await Promise.resolve()
    await Promise.resolve()
    expect(mod.onValue).toHaveBeenCalledTimes(2)
    expect(mod.onValue.mock.calls.every(([q]) => q.path.includes('/public/all-time/') && q.path.includes('/allTime/all-time/'))).toBe(true)
    expect(timer).not.toHaveBeenCalled()
    stopGlobal()
    stopStage()
  })
})

describe('permanent ranking rules ownership and fixed namespace', () => {
  const rules = JSON.parse(readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8')).rules.rankingService.v1.public.$seasonId
  const global = rules.global.$window.$periodKey.entries
  const stage = rules.stage.$stageId.$window.$periodKey.entries
  function writeAllowed(node, { uid = 'me', authUid = 'me', season = 'all-time', period = 'all-time', window = 'allTime', stageId = 'stage2', score = 900, oldScore = 400, deleting = false } = {}) {
    const oldData = { exists: () => true, child: () => ({ val: () => oldScore }) }
    const newData = { exists: () => !deleting, child: (key) => ({ val: () => deleting ? null : key === 'stageId' ? stageId : score }) }
    return Function('auth', '$uid', '$seasonId', '$periodKey', '$window', '$stageId', 'data', 'newData', `return (${node.$uid['.write']})`)(authUid == null ? null : { uid: authUid }, uid, season, period, window, stageId, oldData, newData)
  }
  it('allows only authenticated own best scores in the fixed permanent season and period', () => {
    for (const node of [global, stage]) {
      expect(writeAllowed(node)).toBe(true)
      expect(writeAllowed(node, { authUid: null })).toBe(false)
      expect(writeAllowed(node, { authUid: 'other' })).toBe(false)
      expect(writeAllowed(node, { score: 399 })).toBe(false)
      expect(writeAllowed(node, { season: 'new-season' })).toBe(false)
      expect(writeAllowed(node, { period: '2026-10-14' })).toBe(false)
      expect(node.$uid.$other['.validate']).toBe(false)
    }
    expect(writeAllowed(stage, { stageId: 'stage99' })).toBe(false)
  })
  it('allows account deletion of own null entries while rejecting deletion of another account', () => {
    for (const node of [global, stage]) {
      expect(writeAllowed(node, { deleting: true })).toBe(true)
      expect(writeAllowed(node, { deleting: true, authUid: 'other' })).toBe(false)
      expect(writeAllowed(node, { deleting: true, authUid: null })).toBe(false)
    }
    expect(writeAllowed(stage, { deleting: true, window: 'daily', season: 'season-001', period: '2026-10-14' })).toBe(true)
    expect(writeAllowed(stage, { deleting: true, stageId: 'stage99' })).toBe(false)
  })

  it('keeps guest profiles private and nickname values restricted to strings of 2–12 characters', () => {
    const profile = JSON.parse(readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8')).rules.rankingService.v1.guestProfiles.$uid
    for (const operation of ['.read', '.write']) {
      const allowed = Function('auth', '$uid', `return (${profile[operation]})`)
      expect(allowed({ uid: 'me' }, 'me')).toBe(true)
      expect(allowed({ uid: 'other' }, 'me')).toBe(false)
      expect(allowed(null, 'me')).toBe(false)
    }
    const valid = (value) => Function('newData', `return (${profile.nickname['.validate']})`)({ isString: () => typeof value === 'string', val: () => value })
    expect(valid('새닉네임')).toBe(true)
    expect(valid('a')).toBe(false)
    expect(valid('a'.repeat(13))).toBe(false)
    expect(valid(123)).toBe(false)
    expect(profile.$other['.validate']).toBe(false)
  })
})
