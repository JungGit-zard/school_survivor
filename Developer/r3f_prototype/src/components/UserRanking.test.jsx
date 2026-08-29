// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import UserRanking from './UserRanking.jsx'
import { saveAdminConfig } from '../lib/adminConfig.js'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'
import { isFirebaseRankingConfigured, subscribeGlobalRanking } from '../lib/firebaseRanking.js'

// 원본을 펼친 뒤 두 개만 갈아끼운다. UserRanking이 useGameStore를 읽게 되면서 스토어가
// import하는 submitRun/describeSubmission도 이 모듈에 살아 있어야 한다 — 좁은 팩토리로
// 두면 "No export is defined on the mock"으로 컴포넌트 import 자체가 죽는다.
vi.mock('../lib/firebaseRanking.js', async (importOriginal) => ({
  ...(await importOriginal()),
  isFirebaseRankingConfigured: vi.fn(() => false),
  subscribeGlobalRanking: vi.fn(() => vi.fn()),
}))

describe('UserRanking', () => {
  beforeEach(() => {
    _seedHydratedFirebaseProgressForTests()
    useAuthStore.setState({ user: null })
    useGameStore.setState({ rankingSubmission: null })
    isFirebaseRankingConfigured.mockReturnValue(false)
    subscribeGlobalRanking.mockReset()
    subscribeGlobalRanking.mockReturnValue(vi.fn())
  })

  it('renders ranking rows from 1st through 30th place', () => {
    const html = renderToStaticMarkup(
      <UserRanking
        onBack={() => {}}
        entries={[{ displayName: '지안', survivalSeconds: 240, stageId: 'stage2', cleared: true }]}
      />,
    )

    expect(html).toContain('통합 랭킹')
    expect(html).toContain('일일랭킹')
    expect(html).toContain('주간랭킹')
    expect(html).toContain('한국시간 당일 00:00:01 - 23:59:59')
    expect(html).toContain('1위')
    expect(html).toContain('30위')
    expect(html).not.toContain('31위')
    expect(html.match(/<li/g)).toHaveLength(30)
    expect(html).toContain('지안')
    expect(html).toContain('345점')
    expect(html).toContain('4:00')
    expect(html).toContain('기록 없음')
  })

  it('renders the configured ranking season and reward summary', () => {
    saveAdminConfig({
      rankingSeason: {
        seasonName: '방학 생존 시즌',
        rewardTiers: [
          { rankTo: 1, label: '1위', gold: 777, badge: '방학왕' },
        ],
      },
    })

    const html = renderToStaticMarkup(<UserRanking onBack={() => {}} entries={[]} />)

    expect(html).toContain('방학 생존 시즌')
    expect(html).toContain('1위 777G')
  })

  it('shows cumulative play and season best at the top of the ranking screen', () => {
    _seedHydratedFirebaseProgressForTests({ uid: 'ranking-user' }, {
      schemaVersion: 1,
      profile: { uid: 'ranking-user', displayName: '', nickname: '' },
      progress: {
        records: {
          totalRuns: 411,
          bestSurvivalSeconds: 796,
        },
      },
    })

    const html = renderToStaticMarkup(<UserRanking onBack={() => {}} entries={[]} />)

    expect(html).toContain('내 누적플레이')
    expect(html).toContain('411')
    expect(html).toContain('내 시즌최고점')
    expect(html).toContain('796')
  })

  it('keeps the bottom back button above mobile system UI safe areas', () => {
    const html = renderToStaticMarkup(<UserRanking onBack={() => {}} entries={[]} />)

    expect(html).toContain('env(safe-area-inset-bottom, 0px)')
  })

  it('returns to the title screen from the back button', () => {
    const onBack = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(<UserRanking onBack={onBack} entries={[]} />)
    })
    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('돌아가기'))
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onBack).toHaveBeenCalledTimes(1)

    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('switches the integrated board between daily and weekly entries', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <UserRanking
          onBack={() => {}}
          entries={{
            daily: [{ displayName: '오늘왕', score: 300, survivalSeconds: 300, stageId: 'stage1' }],
            weekly: [{ displayName: '주간왕', score: 900, survivalSeconds: 900, stageId: 'stage2' }],
          }}
        />,
      )
    })

    expect(container.textContent).toContain('오늘왕')
    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('주간랭킹'))
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('주간왕')
    expect(container.textContent).toContain('한국시간 월요일 00:00:01 - 일요일 23:59:59')

    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('uses an arrived cloud board as the period ranking instead of adding a local lifetime record', () => {
    _seedHydratedFirebaseProgressForTests({ uid: 'local-user' }, {
      schemaVersion: 1,
      profile: { uid: 'local-user', displayName: 'Local lifetime', nickname: '' },
      progress: { records: { bestSurvivalSeconds: 999 } },
    })
    useAuthStore.setState({ user: { uid: 'local-user', displayName: 'Local lifetime' } })
    isFirebaseRankingConfigured.mockReturnValue(true)
    const unsubscribers = { daily: vi.fn(), weekly: vi.fn() }
    subscribeGlobalRanking.mockImplementation((window, onRows) => {
      onRows([{
        uid: `cloud-${window}`,
        displayName: `Cloud ${window}`,
        score: 100,
        timeMs: 120000,
        cleared: false,
      }])
      return unsubscribers[window]
    })
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(<UserRanking onBack={() => {}} />)
    })

    expect(container.textContent).toContain('Cloud daily')
    expect(container.textContent).not.toContain('Local lifetime')
    expect(subscribeGlobalRanking).toHaveBeenCalledWith('daily', expect.any(Function), { limit: 30 })
    expect(subscribeGlobalRanking).toHaveBeenCalledWith('weekly', expect.any(Function), { limit: 30 })

    act(() => {
      root.unmount()
    })
    expect(unsubscribers.daily).toHaveBeenCalledTimes(1)
    expect(unsubscribers.weekly).toHaveBeenCalledTimes(1)
    container.remove()
  })
})

// 2026-08-29 사용자 신고의 핵심: "기록을 갱신했는데 랭킹 보드가 아예 비어 있다."
// 비어 있는 보드는 두 가지를 동시에 의미할 수 있는데 화면은 그중 하나도 말해주지 않았다.
//   (a) 아직 아무도 기록이 없다 — 정상
//   (b) 내 기록이 서버에 올라가지 않았다 — 사고
// 이 배너가 (a)와 (b)를 가르는 유일한 장치다.
//
// 여기서는 renderToStaticMarkup을 쓸 수 없다. zustand의 서버 스냅샷은 store의 "초기" 상태라
// SSR 렌더는 setState를 영원히 못 본다(phase조차 initial 값으로 나온다). 클라이언트 렌더로만
// 검증한다 — 실제 앱도 Vite SPA라 클라이언트 렌더가 정본 경로다.
describe('UserRanking 랭킹 제출 안내', () => {
  beforeEach(() => {
    _seedHydratedFirebaseProgressForTests()
    useAuthStore.setState({ user: null })
    useGameStore.setState({ rankingSubmission: null })
    isFirebaseRankingConfigured.mockReturnValue(false)
    subscribeGlobalRanking.mockReset()
    subscribeGlobalRanking.mockReturnValue(vi.fn())
  })

  function mountWith(rankingSubmission, extraState = {}) {
    useGameStore.setState({ rankingSubmission, ...extraState })
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => { root.render(<UserRanking onBack={() => {}} entries={[]} />) })
    return {
      container,
      close: () => { act(() => { root.unmount() }); container.remove() },
    }
  }

  function textOf(rankingSubmission) {
    const { container, close } = mountWith(rankingSubmission)
    const text = container.textContent
    const alert = !!container.querySelector('[role="alert"]')
    const retry = [...container.querySelectorAll('button')].some((el) => el.textContent === '다시 올리기')
    close()
    return { text, alert, retry }
  }

  it('제출 상태가 없으면 배너를 띄우지 않는다 — 빈 보드는 그냥 빈 보드다', () => {
    const { text, alert } = textOf(null)
    expect(text).not.toContain('랭킹에 올리는 중')
    expect(text).not.toContain('랭킹에 반영')
    expect(alert).toBe(false)
    expect(text).toContain('기록 없음')
  })

  it('제출이 왕복 중이면 보드가 비어 있어도 "올리는 중"이라고 말한다', () => {
    const { text, alert } = textOf({ status: 'pending', stageId: 'stage1', score: 415 })
    expect(text).toContain('이번 판 기록을 랭킹에 올리는 중')
    expect(alert).toBe(false) // 아직 사고가 아니다
  })

  it('새 최고점이 기록되면 반영됐다고 알린다', () => {
    expect(textOf({ status: 'recorded', stageId: 'stage1', score: 415 }).text)
      .toContain('이번 판 최고기록이 랭킹에 반영됐습니다')
  })

  it('기존 최고점이 더 높은 정상 스킵은 실패처럼 보이지 않는다', () => {
    const { text, alert } = textOf({ status: 'notBest', stageId: 'stage1', score: 10 })
    expect(text).toContain('순위가 그대로입니다')
    expect(text).not.toContain('올라가지 않았습니다')
    expect(alert).toBe(false)
  })

  it('규칙 거부는 화면에 드러나고 재시도 버튼은 주지 않는다 — 같은 점수는 또 거부된다', () => {
    const { text, alert, retry } = textOf({ status: 'failed', reason: 'rejected', stageId: 'stage1', score: 415 })
    expect(text).toContain('서버가 이번 기록을 거부했습니다')
    expect(alert).toBe(true)
    expect(retry).toBe(false)
  })

  it('네트워크 실패는 재시도 버튼과 함께 드러난다', () => {
    const { text, alert, retry } = textOf({ status: 'failed', reason: 'network', stageId: 'stage1', score: 415 })
    expect(text).toContain('네트워크 문제로 이번 기록을 올리지 못했습니다')
    expect(alert).toBe(true)
    expect(retry).toBe(true)
  })

  it('seasonOff·signedOut·unconfigured·progressUnavailable을 각각 다른 문구로 구분한다', () => {
    const copy = {
      seasonOff: '시즌 기간이 아니라',
      signedOut: '로그인하지 않아',
      unconfigured: '랭킹 서버가 연결되지 않아',
      progressUnavailable: '진행도를 불러오지 못해',
    }
    const seen = new Set()
    for (const [reason, phrase] of Object.entries(copy)) {
      const { text, alert } = textOf({ status: 'notSubmitted', reason, stageId: 'stage1', score: 415 })
      expect(text).toContain(phrase)
      expect(alert).toBe(true)
      expect(seen.has(phrase)).toBe(false) // 서로 다른 문구여야 한다
      seen.add(phrase)
    }
  })

  it('재시도 버튼은 스토어의 retryRankingSubmission을 호출한다', () => {
    const realRetry = useGameStore.getState().retryRankingSubmission
    const retry = vi.fn(() => Promise.resolve(true))
    const { container, close } = mountWith(
      { status: 'failed', reason: 'network', stageId: 'stage1', score: 415 },
      { retryRankingSubmission: retry },
    )

    const button = [...container.querySelectorAll('button')].find((el) => el.textContent === '다시 올리기')
    expect(button).toBeTruthy()
    act(() => { button.click() })
    expect(retry).toHaveBeenCalledTimes(1)

    close()
    useGameStore.setState({ retryRankingSubmission: realRetry })
  })
})
