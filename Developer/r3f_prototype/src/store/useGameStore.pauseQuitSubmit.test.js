// 2026-10-26 실측: 같은 엔트리의 submittedAt과 lastPlayedAt이 약 5초 차이였다 — 플레이 중 체크포인트 1회 +
// 일시정지 메뉴에서 "로비로 돌아가기" 확인 시점의 런 종료 제출 1회였다. 2026-10-28 Terry 규칙("점수는
// 스테이지 진행 동안 합산하고, 랭킹 저장은 한 번만")으로 입장 등록·플레이 중 체크포인트를 없앴다.
// 이 테스트는 "일시정지 → 로비로 돌아가기는 런의 유일한 쓰기를 정확히 1회 한다"를 고정한다.
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const ranking = vi.hoisted(() => ({ submit: vi.fn(), identity: vi.fn() }))
vi.mock('../lib/firebaseRanking.js', async (original) => ({ ...(await original()), submitRun: ranking.submit }))
vi.mock('../lib/guestRankingIdentity.js', () => ({ getRankingUser: ranking.identity }))
import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { _resetFirebaseProgressForTests } from '../lib/firebaseProgress.js'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-26T08:37:21.000Z'))
  _resetFirebaseProgressForTests()
  useAuthStore.setState({ user: null })
  ranking.submit.mockReset().mockResolvedValue({ written: ['allTime'], skipped: [], failed: [] })
  ranking.identity.mockReset().mockResolvedValue({ uid: 'guest', isAnonymous: true })
})
afterEach(() => vi.useRealTimers())

it('pause → 로비로 돌아가기 submits the run exactly once, with nothing written during play', async () => {
  const store = useGameStore.getState()
  store.resetGame('stage1')
  vi.setSystemTime(new Date('2026-10-26T08:37:42.416Z'))
  useGameStore.getState().recordKill()
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(ranking.submit).not.toHaveBeenCalled() // 입장·처치로는 쓰지 않는다

  useGameStore.getState().pauseGame('manual')
  vi.setSystemTime(new Date('2026-10-26T08:37:47.416Z')) // 일시정지 메뉴에서 5초 머묾
  expect(useGameStore.getState().quitPausedRun()).toBe(true)
  expect(useGameStore.getState().quitPausedRun()).toBe(false) // 확인 버튼 연타도 재제출하지 않는다
  useGameStore.getState().finishRankingRun('end') // 이어지는 로비 이동도 다시 쓰지 않는다
  await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledTimes(1))
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(ranking.submit).toHaveBeenCalledTimes(1)

  const final = ranking.submit.mock.calls[0][1]
  expect(final).toMatchObject({ stageId: 'stage1', score: 1, cleared: false })
  expect(final.submittedAt).toBe(Date.parse('2026-10-26T08:37:47.416Z'))
  expect(final.lastPlayedAt).toBe(final.submittedAt)
})
