import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// season/E2E 게이트를 결정적으로 제어하기 위한 훅(hoisted — 팩토리가 참조해도 TDZ 안전).
const gates = vi.hoisted(() => ({ seasonConfig: {}, e2eBypass: false }))
vi.mock('./adminConfig.js', () => ({ getAdminRankingSeasonConfig: () => gates.seasonConfig }))
vi.mock('./e2eAuth.js', () => ({ isE2EAuthBypass: () => gates.e2eBypass }))

import { submitRun, _setFirebaseRankingClientForTests } from './firebaseRanking.js'

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
    gates.e2eBypass = false
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

  it('skips submission for E2E-bypass users so real rankings stay uncontaminated', async () => {
    gates.e2eBypass = true
    const { client, mod } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)

    await submitRun({ uid: 'e2e-local-test' }, { stageId: 'stage1', score: 10, timeMs: 1000 })

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
