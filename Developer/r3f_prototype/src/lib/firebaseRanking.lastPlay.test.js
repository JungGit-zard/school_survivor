import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('./adminConfig.js', () => ({ getAdminRankingSeasonConfig: () => ({}) }))
import { submitRun, _setFirebaseRankingClientForTests } from './firebaseRanking.js'

beforeEach(() => vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://qa.invalid'))
afterEach(() => { vi.unstubAllEnvs(); _setFirebaseRankingClientForTests(null) })

function client() {
  const rows = new Map()
  const mod = { ref: (_, path) => path,
    runTransaction: vi.fn(async (path, updater) => {
      const value = updater(rows.get(path) ?? null)
      if (value) rows.set(path, structuredClone(value))
      return { committed: value !== undefined }
    }) }
  _setFirebaseRankingClientForTests({ db: {}, mod })
  return { rows, mod }
}

it('updates actual play time after lower and zero scores while preserving all best metrics', async () => {
  const { rows } = client()
  const user = { uid: 'actual' }
  await submitRun(user, { stageId: 'stage1', score: 500, timeMs: 400000, cleared: true, lastPlayedAt: 1000 })
  await submitRun(user, { stageId: 'stage1', score: 0, timeMs: 0, lastPlayedAt: 2000 })
  for (const entry of rows.values()) expect(entry).toMatchObject({ score: 500, timeMs: 400000, cleared: true, lastPlayedAt: 2000 })
})

it('retries idempotently and never replaces a newer event timestamp with an old request', async () => {
  const { rows, mod } = client()
  const user = { uid: 'actual' }
  const run = { stageId: 'stage1', score: 1, timeMs: 1000, lastPlayedAt: 2000 }
  await submitRun(user, run)
  const initial = JSON.stringify([...rows])
  const result = await submitRun(user, run)
  expect(result.skipped).toHaveLength(6)
  await submitRun(user, { ...run, lastPlayedAt: 1000 })
  expect(JSON.stringify([...rows])).toBe(initial)
  expect(mod.runTransaction).toHaveBeenCalledTimes(18)
})

it('serializes overlapping signed-in submissions and atomically retains best plus latest play', async () => {
  const { rows } = client()
  await Promise.all([
    submitRun({ uid: 'actual' }, { stageId: 'stage1', score: 9, timeMs: 9000, lastPlayedAt: 1000 }),
    submitRun({ uid: 'actual' }, { stageId: 'stage1', score: 1, timeMs: 1000, lastPlayedAt: 3000 }),
  ])
  for (const entry of rows.values()) expect(entry).toMatchObject({ score: 9, timeMs: 9000, lastPlayedAt: 3000 })
})
