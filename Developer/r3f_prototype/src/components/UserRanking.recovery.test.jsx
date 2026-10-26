// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ subscriptions: [], user: null, status: 'checking' }))
vi.mock('../store/useAuthStore.js', async () => {
  const { create } = await import('zustand')
  return { useAuthStore: create(() => ({ user: null, status: 'checking', progressStatus: 'loading' })) }
})
vi.mock('../store/useGameStore.js', () => ({ useGameStore: selector => selector({ rankingSubmission: null }) }))
vi.mock('../lib/firebaseProgress.js', () => ({ isFirebaseProgressHydrated: () => false }))
vi.mock('../lib/userNickname.js', () => ({ getSavedNickname: () => '', displayNickname: (value) => value }))
vi.mock('../lib/playerRecords.js', () => ({ load: () => ({}) }))
vi.mock('../lib/adminConfig.js', () => ({ getAdminBalanceConfig: () => ({}), getAdminRankingSeasonConfig: () => ({ rewardTiers: [], seasonName: 'Synthetic' }) }))
vi.mock('../lib/firebaseRanking.js', () => ({
  isFirebaseRankingConfigured: () => true,
  subscribeGlobalRanking: vi.fn((window, rows, options) => {
    const sub = { window, rows, error: options.onError, stop: vi.fn() }
    state.subscriptions.push(sub)
    return sub.stop
  }),
}))
vi.mock('firebase/app', () => { throw Error('SDK forbidden') })
vi.mock('firebase/auth', () => { throw Error('Auth forbidden') })
vi.mock('firebase/database', () => { throw Error('Database forbidden') })
import UserRanking from './UserRanking.jsx'
import { useAuthStore } from '../store/useAuthStore.js'
let root, container
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', vi.fn(() => { throw Error('Network forbidden') }))
  state.subscriptions = []
  useAuthStore.setState({ user: null, status: 'checking', progressStatus: 'loading' })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  act(() => root.render(<UserRanking onBack={() => {}} />))
})
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })
const allTime = () => state.subscriptions.filter(s => s.window === 'allTime').at(-1)
const fail = () => act(() => allTime().error(Error('synthetic stale auth transport cancellation')))
it('restarts a cancelled public read when pending authentication settles', () => {
  const old = allTime(); fail()
  expect(container.querySelector('[role="alert"]')).not.toBeNull()
  act(() => useAuthStore.setState({ user: { uid: 'synthetic-account' }, status: 'signedIn' }))
  expect(old.stop).toHaveBeenCalledOnce()
  expect(state.subscriptions).toHaveLength(6)
  expect(container.querySelector('[role="alert"]')).toBeNull()
  expect(container.querySelector('ol')).toBeNull()
  act(() => allTime().rows([{ uid: 'fresh', displayName: 'Fresh survivor', score: 10, timeMs: 10000 }]))
  expect(container.textContent).toContain('Fresh survivor')
})
it('retry resets the read to loading and ignores late data/errors from disposed subscriptions', () => {
  const old = allTime(); fail()
  act(() => container.querySelector('[role="alert"] button').click())
  expect(container.querySelector('[role="alert"]')).toBeNull()
  expect(container.querySelector('ol')).toBeNull()
  act(() => allTime().rows([{ uid: 'fresh', displayName: 'Fresh survivor', score: 10, timeMs: 10000 }]))
  act(() => { old.error(Error('obsolete')); old.rows([{ uid: 'old', displayName: 'Obsolete survivor', score: 100 }]) })
  expect(container.querySelector('[role="alert"]')).toBeNull()
  expect(container.textContent).toContain('Fresh survivor')
  expect(container.textContent).not.toContain('Obsolete survivor')
  expect(fetch).not.toHaveBeenCalled()
})
