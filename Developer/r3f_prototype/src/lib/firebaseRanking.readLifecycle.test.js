import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const settings = vi.hoisted(() => ({ seasonId: 'synthetic-first' }))
vi.mock('./adminConfig.js', () => ({ getAdminRankingSeasonConfig: () => ({ seasonId: settings.seasonId }) }))
vi.mock('./userNickname.js', () => ({ getSavedNickname: () => '' }))
vi.mock('firebase/app', () => { throw Error('Real SDK forbidden') })
vi.mock('firebase/database', () => { throw Error('Real SDK forbidden') })
import { _setFirebaseRankingClientForTests, subscribeStageRanking } from './firebaseRanking.js'
let listeners, stop, mod, close
const snapshot = name => ({ exists: () => true, forEach: fn => fn({ key: name, val: () => ({ displayName: name, score: 10 }) }) })
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-21T14:59:59Z'))
  vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://synthetic.invalid')
  settings.seasonId = 'synthetic-first'; listeners = []; stop = vi.fn()
  mod = { ref: (_, path) => path, query: path => path, orderByChild: () => null, limitToLast: () => null,
    onValue: vi.fn((path, rows, error) => { listeners.push({ path, rows, error }); return stop }) }
  _setFirebaseRankingClientForTests({ db: {}, mod })
})
afterEach(() => { close?.(); close = null; _setFirebaseRankingClientForTests(null); vi.useRealTimers(); vi.unstubAllEnvs() })
it('resolves pending client initialization into the current season and KST day', async () => {
  close = subscribeStageRanking('stage1', 'daily', vi.fn())
  settings.seasonId = 'synthetic-next'
  vi.setSystemTime(new Date('2026-10-21T15:00:01Z'))
  await Promise.resolve(); await Promise.resolve()
  expect(listeners[0].path).toContain('/synthetic-next/stage/stage1/daily/2026-10-22/')
})
it('ignores old transport callbacks after a daily boundary replaces the subscription', async () => {
  const rows = vi.fn(), errors = vi.fn()
  close = subscribeStageRanking('stage1', 'daily', rows, { onError: errors })
  await Promise.resolve(); await Promise.resolve()
  const old = listeners[0]
  await vi.advanceTimersByTimeAsync(1100)
  expect(listeners).toHaveLength(2)
  listeners[1].rows(snapshot('fresh'))
  old.rows(snapshot('stale')); old.error(Error('late cancellation'))
  expect(rows).toHaveBeenCalledTimes(1)
  expect(rows.mock.calls[0][0][0].displayName).toBe('fresh')
  expect(errors).not.toHaveBeenCalled()
  expect(stop).toHaveBeenCalledOnce()
})
