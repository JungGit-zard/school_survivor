import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// season/E2E 게이트를 결정적으로 제어하기 위한 훅(hoisted — 팩토리가 참조해도 TDZ 안전).
const gates = vi.hoisted(() => ({ seasonConfig: {} }))
vi.mock('./adminConfig.js', () => ({ getAdminRankingSeasonConfig: () => gates.seasonConfig }))

import {
  submitRun,
  describeSubmission,
  subscribeStageRanking,
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
    expect(mod.set).toHaveBeenCalledTimes(4)
    const keys = Object.keys(writes)
    expect(keys).toHaveLength(4)
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

  it('writes when the new score beats the existing entry', async () => {
    const { client, mod } = makeFakeClient({ existingScore: 50 })
    _setFirebaseRankingClientForTests(client)

    await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 100, timeMs: 60000, cleared: false })

    expect(mod.set).toHaveBeenCalledTimes(4)
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

    expect(outcome.failed).toHaveLength(4)
    expect(outcome.written).toHaveLength(0)
    expect(outcome.skipped).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
  })

  it('reports an existing higher score as skipped, and never as failed', async () => {
    const { client } = makeFakeClient({ existingScore: 500 })
    _setFirebaseRankingClientForTests(client)

    const outcome = await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 100, timeMs: 60000, cleared: false })

    expect(outcome.skipped).toHaveLength(4)
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

    expect(outcome.written).toHaveLength(2)
    expect(outcome.written.every((path) => path.includes('/daily/'))).toBe(true)
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

  it('skips submission outside an active season window', async () => {
    gates.seasonConfig = { endsAt: '2000-01-01' } // 과거 종료 → 비활성 시즌
    const { client, mod } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)

    await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 10, timeMs: 1000 })

    expect(mod.set).not.toHaveBeenCalled()
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
    expect(source).not.toContain('mod.update(')
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

  it('시즌 밖 제출은 failed가 아니라 seasonOff로 구분돼 나온다', async () => {
    gates.seasonConfig = { endsAt: '2000-01-01' }
    const { client } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)

    const outcome = await submitRun({ uid: 'me' }, { stageId: 'stage1', score: 500, timeMs: 400000, cleared: true })

    expect(describeSubmission(outcome)).toEqual({ status: 'notSubmitted', reason: 'seasonOff' })
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
})
