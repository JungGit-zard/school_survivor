// 로비 "내 최고기록"의 단일 출처 = 본인 all-time 스테이지 랭킹 엔트리.
// 게스트는 users/{uid} 진행도가 없으므로 playerRecords로는 절대 기록을 볼 수 없다(2026-10-26 실측 버그).
// 정책(Terry): 0점이라도 랭킹에 등록하고, 0점 기록은 '기록 없음'이 아니라 0으로 보인다.
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('./adminConfig.js', () => ({ getAdminRankingSeasonConfig: () => ({}) }))
import { fetchMyRankingEntry, fetchMyStageBests, submitRun, _setFirebaseRankingClientForTests } from './firebaseRanking.js'

const STAGE1_ALL_TIME = 'rankingService/v1/public/all-time/stage/stage1/allTime/all-time/entries'

beforeEach(() => vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://qa.invalid'))
afterEach(() => { vi.unstubAllEnvs(); _setFirebaseRankingClientForTests(null) })

function client({ holdWrites = false } = {}) {
  const rows = new Map()
  const held = []
  const mod = {
    ref: (_, path) => path,
    get: vi.fn(async (path) => ({ exists: () => rows.has(path), val: () => structuredClone(rows.get(path)) })),
    update: vi.fn(async (_root, patch) => {
      if (holdWrites) await new Promise((resolve) => held.push(resolve))
      for (const [path, value] of Object.entries(patch)) rows.set(path, structuredClone(value))
    }),
  }
  _setFirebaseRankingClientForTests({ db: {}, mod })
  return { rows, mod, release: () => held.splice(0).forEach((resolve) => resolve()) }
}

it('reads the guest/anonymous own all-time stage entry that the lobby must show', async () => {
  const { rows } = client()
  rows.set(`${STAGE1_ALL_TIME}/anon-1`, { uid: 'anon-1', score: 21, timeMs: 21050, cleared: false, stageId: 'stage1', submittedAt: 1, lastPlayedAt: 2 })

  const bests = await fetchMyStageBests({ uid: 'anon-1', isAnonymous: true }, ['stage1', 'stage2'])

  expect(bests.stage1).toMatchObject({ score: 21, timeMs: 21050 })
  expect(bests).not.toHaveProperty('stage2')
})

it('keeps a 0-point run as a real record instead of dropping it', async () => {
  client()
  await submitRun({ uid: 'zero' }, { stageId: 'stage1', score: 0, timeMs: 0, lastPlayedAt: 1000 })

  const bests = await fetchMyStageBests({ uid: 'zero' }, ['stage1'])

  expect(bests.stage1).toMatchObject({ score: 0, timeMs: 0 })
})

it('includes an own submission still in flight when the lobby reads right after returning', async () => {
  const { mod, release } = client({ holdWrites: true })
  const submitting = submitRun({ uid: 'racer' }, { stageId: 'stage1', score: 21, timeMs: 21050, lastPlayedAt: 1000 })
  await vi.waitFor(() => expect(mod.update).toHaveBeenCalledTimes(1))

  const bests = await fetchMyStageBests({ uid: 'racer' }, ['stage1'])

  expect(bests.stage1).toMatchObject({ score: 21, timeMs: 21050 })
  release()
  await submitting
})

it('never mixes another uid into my best', async () => {
  client()
  await submitRun({ uid: 'someone-else' }, { stageId: 'stage1', score: 99, timeMs: 99000, lastPlayedAt: 1000 })

  expect(await fetchMyStageBests({ uid: 'me' }, ['stage1'])).toEqual({})
  expect(await fetchMyStageBests(null, ['stage1'])).toEqual({})
})

it('reads my global entry for the ranking "내 기록" row', async () => {
  const { rows } = client()
  rows.set('rankingService/v1/public/all-time/global/allTime/all-time/entries/me', { uid: 'me', score: 0, timeMs: 0, cleared: false, stageId: 'stage1', submittedAt: 1 })

  expect(await fetchMyRankingEntry({ uid: 'me' }, 'allTime', null)).toMatchObject({ uid: 'me', score: 0 })
  expect(await fetchMyRankingEntry({ uid: 'me' }, 'allTime', 'stage1')).toBeNull()
})
