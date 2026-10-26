// 2026-10-26 실측: 같은 엔트리의 submittedAt(17:37:42.4)과 lastPlayedAt(17:37:47.4)이 약 5초 차이.
// 원인 추적 결과 이중 제출 버그가 아니다 — 플레이 중 체크포인트(최고점 갱신 시점) 1회 + 일시정지 메뉴에서
// 머문 뒤 "로비로 돌아가기" 확인 시점의 런 종료 제출 1회다. 두 번째 제출은 점수가 같아 best는 그대로
// 두고(submittedAt 유지) lastPlayedAt만 종료 시각으로 올린다(mergeRankingPlay). 5초는 타이머가 아니라
// 플레이어가 일시정지 메뉴에 머문 시간이다. 이 테스트는 그 계약과 "런 종료 제출은 정확히 1회"를 고정한다.
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

it('pause → 로비로 돌아가기 submits the run end exactly once after the in-play checkpoint', async () => {
  const store = useGameStore.getState()
  store.resetGame('stage1')
  await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledTimes(1)) // 입장 등록(0점)

  vi.setSystemTime(new Date('2026-10-26T08:37:42.416Z'))
  useGameStore.getState().recordKill() // 최고점 갱신 → 체크포인트 제출
  await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledTimes(2))
  const checkpoint = ranking.submit.mock.calls[1][1]

  useGameStore.getState().pauseGame('manual')
  vi.setSystemTime(new Date('2026-10-26T08:37:47.416Z')) // 일시정지 메뉴에서 5초 머묾
  expect(useGameStore.getState().quitPausedRun()).toBe(true)
  expect(useGameStore.getState().quitPausedRun()).toBe(false) // 확인 버튼 연타도 재제출하지 않는다
  await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledTimes(3))
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(ranking.submit).toHaveBeenCalledTimes(3)

  const final = ranking.submit.mock.calls[2][1]
  expect(final.score).toBe(checkpoint.score)
  expect(final.lastPlayedAt - checkpoint.submittedAt).toBe(5000)
})
