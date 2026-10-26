// @vitest-environment jsdom
// 글로벌 보드도 상위 30개만 그린다. 본인 엔트리가 잘려도 "내 기록" 줄로 보여야 한다(2026-10-26 Terry 보고).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

vi.mock('../lib/guestRankingIdentity.js', () => ({ getRankingUser: async (user) => user ?? { uid: 'anon-me', isAnonymous: true }, getGuestRankingNicknameForUid: () => '' }))
vi.mock('../lib/firebaseRanking.js', async (importOriginal) => ({
  ...(await importOriginal()),
  isFirebaseRankingConfigured: vi.fn(() => true),
  subscribeGlobalRanking: vi.fn((window, onRows) => {
    onRows(Array.from({ length: 30 }, (_, i) => ({ uid: `top-${i}`, displayName: `Top${i}`, score: 100 - i, timeMs: 1000, stageId: 'stage1', cleared: false })))
    return () => {}
  }),
  fetchMyRankingEntry: vi.fn(async () => null),
}))
import UserRanking from './UserRanking.jsx'
import { fetchMyRankingEntry } from '../lib/firebaseRanking.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'

let root
let host
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useAuthStore.setState({ user: null, progressStatus: 'idle' })
  useGameStore.setState({ rankingSubmission: null })
  vi.mocked(fetchMyRankingEntry).mockReset().mockResolvedValue(null)
})
afterEach(() => {
  if (root) act(() => root.unmount())
  host?.remove()
  root = null
})

async function render() {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(<UserRanking onBack={() => {}} />))
  await act(async () => {})
}

it('shows my own 0-point global entry outside the top 30', async () => {
  vi.mocked(fetchMyRankingEntry).mockResolvedValue({ uid: 'anon-me', displayName: '생존자-me', score: 0, timeMs: 0, stageId: 'stage1', cleared: false })
  await render()

  expect(fetchMyRankingEntry).toHaveBeenCalledWith(expect.objectContaining({ uid: 'anon-me' }), 'allTime', null)
  const mine = host.querySelector('[data-testid="ranking-my-row"]')
  expect(mine).not.toBeNull()
  expect(mine.textContent).toContain('내 기록')
  expect(mine.textContent).toContain('생존자-me')
  expect(mine.textContent).toContain('0점')
})

it('does not duplicate my row when I am on the board', async () => {
  vi.mocked(fetchMyRankingEntry).mockResolvedValue({ uid: 'top-0', displayName: 'Top0', score: 100, timeMs: 1000, stageId: 'stage1', cleared: false })
  await render()

  expect(host.querySelector('[data-testid="ranking-my-row"]')).toBeNull()
})
