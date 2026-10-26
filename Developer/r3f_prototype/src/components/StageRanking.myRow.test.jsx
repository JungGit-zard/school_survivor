// @vitest-environment jsdom
// 2026-10-26 Terry: "랭킹에 내 기록이 보존이 안됨". 실제 all-time 보드는 엔트리 161개 중 150개 이상이
// 0점(입장 등록)이고 화면은 상위 30개만 그린다. 0점·저점 플레이어는 자기 엔트리가 저장돼 있어도
// 보드에서 영영 안 보였다. 보드 밖이어도 본인 엔트리를 "내 기록" 줄로 항상 보여준다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ auth: { user: null } }))
vi.mock('../lib/guestRankingIdentity.js', () => ({ getRankingUser: async (user) => user ?? { uid: 'anon-me', isAnonymous: true } }))
vi.mock('../store/useAuthStore.js', () => {
  const useAuthStore = (selector) => selector(state.auth)
  useAuthStore.getState = () => state.auth
  return { useAuthStore }
})
vi.mock('../store/useGameStore.js', () => ({ useGameStore: (selector) => selector({ rankingSubmission: null }) }))
vi.mock('../lib/firebaseRanking.js', () => ({
  getActiveSeason: () => ({ seasonId: 'season-001', name: 'S1', active: true, endsAt: null }),
  subscribeStageRanking: vi.fn((stageId, window, onRows) => {
    onRows(Array.from({ length: 30 }, (_, i) => ({ uid: `top-${i}`, displayName: `Top${i}`, score: 100 - i, timeMs: 1000, cleared: false })))
    return () => {}
  }),
  fetchMyRankingEntry: vi.fn(async () => null),
}))
import StageRanking from './StageRanking.jsx'
import { fetchMyRankingEntry } from '../lib/firebaseRanking.js'

let root
let host
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  state.auth = { user: null }
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
  await act(async () => root.render(<StageRanking stageId="stage1" onBack={() => {}} />))
  await act(async () => {})
}

it('shows my own 0-point entry even when it is outside the top 30', async () => {
  vi.mocked(fetchMyRankingEntry).mockResolvedValue({ uid: 'anon-me', displayName: '생존자-me', score: 0, timeMs: 0, cleared: false, lastPlayedAt: 1 })
  await render()

  expect(fetchMyRankingEntry).toHaveBeenCalledWith(expect.objectContaining({ uid: 'anon-me' }), 'allTime', 'stage1')
  const mine = host.querySelector('[data-testid="ranking-my-row"]')
  expect(mine).not.toBeNull()
  expect(mine.textContent).toContain('내 기록')
  expect(mine.textContent).toContain('생존자-me')
  expect(mine.textContent).toContain('0')
})

it('reads the signed-in uid, not a guest one', async () => {
  state.auth = { user: { uid: 'google-me' } }
  vi.mocked(fetchMyRankingEntry).mockResolvedValue({ uid: 'google-me', displayName: '정실장', score: 12, timeMs: 12000, cleared: false })
  await render()

  expect(fetchMyRankingEntry).toHaveBeenCalledWith(expect.objectContaining({ uid: 'google-me' }), 'allTime', 'stage1')
  expect(host.querySelector('[data-testid="ranking-my-row"]').textContent).toContain('정실장')
})

it('does not duplicate my row when I am already on the visible board', async () => {
  vi.mocked(fetchMyRankingEntry).mockResolvedValue({ uid: 'top-3', displayName: 'Top3', score: 97, timeMs: 1000, cleared: false })
  await render()

  expect(host.querySelector('[data-testid="ranking-my-row"]')).toBeNull()
})
