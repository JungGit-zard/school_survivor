import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('./adminConfig.js', () => ({ getAdminRankingSeasonConfig: () => ({}) }))
import { submitRun, _setFirebaseRankingClientForTests } from './firebaseRanking.js'

beforeEach(() => vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://qa.invalid'))
afterEach(() => { vi.unstubAllEnvs(); _setFirebaseRankingClientForTests(null) })

function client() {
  const rows = new Map()
  const mod = { ref: (_, path) => path,
    get: vi.fn(async path => ({exists:()=>rows.has(path),val:()=>structuredClone(rows.get(path))})),
    update: vi.fn(async (root, patch) => {
      expect(root).toBeUndefined()
      for (const [path, value] of Object.entries(patch)) rows.set(path, structuredClone(value))
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
  // One read per bucket for the session, one coalesced write; the unchanged repeats send nothing.
  expect(mod.get).toHaveBeenCalledTimes(6)
  expect(mod.update).toHaveBeenCalledTimes(1)
})

it('serializes overlapping signed-in submissions and atomically retains best plus latest play', async () => {
  const { rows } = client()
  await Promise.all([
    submitRun({ uid: 'actual' }, { stageId: 'stage1', score: 9, timeMs: 9000, lastPlayedAt: 1000 }),
    submitRun({ uid: 'actual' }, { stageId: 'stage1', score: 1, timeMs: 1000, lastPlayedAt: 3000 }),
  ])
  for (const entry of rows.values()) expect(entry).toMatchObject({ score: 9, timeMs: 9000, lastPlayedAt: 3000 })
})

it('a multi-stage run goes out as ONE update: each stage board gets its own entry, the global board keeps the run total', async () => {
  const { rows, mod } = client()
  const user = { uid: 'multi' }
  const result = await submitRun(user, [
    { stageId: 'stage1', score: 300, stageScore: 300, timeMs: 240000, globalTimeMs: 240000, cleared: true, lastPlayedAt: 1000 },
    { stageId: 'stage2', score: 420, stageScore: 120, timeMs: 60000, globalTimeMs: 300000, cleared: false, lastPlayedAt: 1000 },
  ])
  expect(mod.update).toHaveBeenCalledTimes(1)
  expect(result.failed).toHaveLength(0)
  const stage1 = [...rows].filter(([path]) => path.includes('/stage/stage1/'))
  const stage2 = [...rows].filter(([path]) => path.includes('/stage/stage2/'))
  const global = [...rows].filter(([path]) => !path.includes('/stage/'))
  expect(stage1.length).toBeGreaterThan(0)
  expect(stage2.length).toBe(stage1.length)
  for (const [, entry] of stage1) expect(entry).toMatchObject({ stageId: 'stage1', score: 300, cleared: true })
  for (const [, entry] of stage2) expect(entry).toMatchObject({ stageId: 'stage2', score: 120, cleared: false })
  for (const [, entry] of global) expect(entry).toMatchObject({ score: 420, timeMs: 300000 })
})
