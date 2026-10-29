// @vitest-environment jsdom
import React from 'react'
vi.mock('../lib/guestRankingIdentity.js',()=>({getRankingUser:async user=>user??{uid:'synthetic-ui-guest',isAnonymous:true},getGuestRankingClient:async()=>{throw new Error('Unexpected external guest client in UI test')},getGuestRankingNicknameForUid:()=>''}))
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import UserRanking from './UserRanking.jsx'
import { saveAdminConfig } from '../lib/adminConfig.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
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
  fetchMyRankingEntry: vi.fn(() => Promise.resolve(null)),
}))

describe('UserRanking', () => {
  it.each([false, true])('renders a guest without account progress hydration (configured=%s)', (configured) => {
    _resetFirebaseProgressForTests()
    isFirebaseRankingConfigured.mockReturnValue(configured)
    expect(() => renderToStaticMarkup(<UserRanking />)).not.toThrow()
    const html = renderToStaticMarkup(<UserRanking entries={[{ uid: 'guest', displayName: 'Guest zero', score: 0, timeMs: 0 }]} />)
    expect(html).toContain('Guest zero')
    expect(html).toContain('0점')
  })
  it('shows full KST time for a zero-score entrant and unknown for old records', () => {
    const html = renderToStaticMarkup(<UserRanking entries={[
      { uid: 'real', displayName: '????', score: 0, timeMs: 0, lastPlayedAt: Date.parse('2026-10-18T01:02:03Z') },
      { uid: 'old', displayName: '????', score: 0, timeMs: 0, submittedAt: Date.now() },
    ]} />)
    expect(html).toContain('2026-10-18 10:02:03 KST')
    expect(html).toContain('시각 기록 없음')
  })
  beforeEach(() => {
    _seedHydratedFirebaseProgressForTests()
    useAuthStore.setState({ user: null })
    useGameStore.setState({ rankingSubmission: null })
    isFirebaseRankingConfigured.mockReturnValue(false)
    subscribeGlobalRanking.mockReset()
    subscribeGlobalRanking.mockReturnValue(vi.fn())
  })

  it.each(['loading', 'error'])('does not disguise unavailable signed-in progress as zero: %s', (progressStatus) => {
    _resetFirebaseProgressForTests()
    useAuthStore.setState({ user: { uid: 'real' }, progressStatus })
    const container = document.createElement('div')
    const root = createRoot(container)
    try {
      act(() => root.render(<UserRanking entries={[]} />))
      expect(container.textContent).toContain(progressStatus === 'error' ? '기록 불러오기 실패' : '불러오는 중')
      expect(container.querySelector('header').textContent).not.toMatch(/누적 플레이\s*0/)
      if (progressStatus === 'error') expect(container.textContent).toContain('다시 시도')
    } finally { act(() => root.unmount()) }
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
    expect(html).toContain('무제한 누적')
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

    expect(html).not.toContain('방학 생존 시즌')
    expect(html).not.toContain('1위 777G')
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
    expect(html).not.toContain('내 시즌최고점')
  })

  // QA 2026-10-27: a guest saw "내 누적플레이 0판" after 2-3 runs because guests have no account records.
  it('shows a guest the runs played this session instead of a fixed 0', () => {
    _resetFirebaseProgressForTests()
    useGameStore.setState({ sessionRunCount: 3 })
    const container = document.createElement('div')
    const root = createRoot(container)
    try {
      act(() => root.render(<UserRanking onBack={() => {}} entries={[]} />))
      expect(container.querySelector('header').textContent).toMatch(/내 누적플레이\s*3\s*판/)
    } finally {
      act(() => root.unmount())
      useGameStore.setState({ sessionRunCount: 0 })
    }
  })

  it('keeps the bottom back button above mobile system UI safe areas', () => {
    const html = renderToStaticMarkup(<UserRanking onBack={() => {}} entries={[]} />)

    expect(html).toContain('env(safe-area-inset-bottom, 0px)')
  })



  it('exposes colorful panel semantic states for season and local-player chips', () => {
    _seedHydratedFirebaseProgressForTests({ uid: 'local-user' }, {
      schemaVersion: 1,
      profile: { uid: 'local-user', displayName: 'Local Player', nickname: '' },
      progress: { records: { bestSurvivalSeconds: 321 } },
    })
    useAuthStore.setState({ user: { uid: 'local-user', displayName: 'Local Player' } })
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(<UserRanking onBack={() => {}} entries={[{ uid: 'local-user', displayName: 'Local Player', score: 321, survivalSeconds: 321, stageId: 'stage1', local: true }]} />)
    })

    expect(container.querySelector('[data-panel-state="special"]')).toBeNull()
    expect(container.querySelector('[data-panel-state="local"]')?.textContent).toBe('ME')

    act(() => root.unmount())
    container.remove()
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
            allTime: [{ uid: 'guest-zero', displayName: '시작왕', score: 0, timeMs: 0, stageId: 'stage1' }],
            daily: [{ displayName: '오늘왕', score: 300, survivalSeconds: 300, stageId: 'stage1' }],
            weekly: [{ displayName: '주간왕', score: 900, survivalSeconds: 900, stageId: 'stage2' }],
          }}
        />,
      )
    })

    expect(container.textContent).toContain('시작왕')
    expect(container.querySelector('ol li').textContent).toContain('0점')
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
    const unsubscribers = { allTime: vi.fn(), daily: vi.fn(), weekly: vi.fn() }
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

    expect(container.textContent).toContain('Cloud allTime')
    expect(container.textContent).not.toContain('Local lifetime')
    expect(subscribeGlobalRanking).toHaveBeenCalledWith('daily', expect.any(Function), { limit: 30, onError: expect.any(Function) })
    expect(subscribeGlobalRanking).toHaveBeenCalledWith('weekly', expect.any(Function), { limit: 30, onError: expect.any(Function) })

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

  it('앱 진입 때의 0점 참가 등록은 "이번 판 반영" 안내를 띄우지 않는다 — 아직 한 판도 안 했다', () => {
    for (const status of ['pending', 'recorded', 'notBest']) {
      const { text } = textOf({ status, entrant: true, stageId: 'stage1', score: 0 })
      expect(text).not.toContain('이번 판')
      expect(text).not.toContain('랭킹에 반영')
    }
    expect(textOf({ status: 'recorded', stageId: 'stage1', score: 415 }).text).toContain('이번 판 최고기록이 랭킹에 반영됐습니다.')
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
    expect(retry).toBe(true)
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

it('shows a read error and retry without empty placeholders until a fresh subscription succeeds',()=>{
 useAuthStore.setState({user:null});useGameStore.setState({rankingSubmission:null})
 isFirebaseRankingConfigured.mockReturnValue(true);subscribeGlobalRanking.mockReset().mockReturnValue(vi.fn())
 const container=document.createElement('div'),root=createRoot(container)
 try{
 act(()=>root.render(<UserRanking/>))
 expect(container.querySelector('ol')).toBeNull()
 act(()=>subscribeGlobalRanking.mock.calls.find(call=>call[0]==='allTime')[2].onError(new Error('injected read failure')))
 expect(container.querySelector('[role="alert"]')).not.toBeNull()
 expect(container.querySelector('ol')).toBeNull()
 const before=subscribeGlobalRanking.mock.calls.length
 const retryButton=[...container.querySelectorAll('button')].find(button=>button.textContent==='\uB2E4\uC2DC \uC2DC\uB3C4')
 expect(retryButton.style.minHeight).toBe('44px')
 expect(retryButton.style.borderRadius).toBe('8px')
 act(()=>retryButton.click())
 expect(subscribeGlobalRanking.mock.calls.length).toBe(before+3)
 act(()=>subscribeGlobalRanking.mock.calls.filter(call=>call[0]==='allTime').at(-1)[1]([]))
 expect(container.querySelector('[role="alert"]')).toBeNull()
 expect(container.querySelector('ol')).not.toBeNull()
 }finally{act(()=>root.unmount())}
})
it('labels partial acknowledgement without claiming that every leaderboard lost the score',()=>{
 isFirebaseRankingConfigured.mockReturnValue(false);useAuthStore.setState({user:null})
 useGameStore.setState({rankingSubmission:{status:'failed',reason:'rejected',partial:true,acknowledgedCount:4,failedCount:2}})
 const container=document.createElement('div'),root=createRoot(container)
 try{act(()=>root.render(<UserRanking entries={[]}/>));const notice=container.querySelector('[role="alert"]');expect(notice.textContent).toContain('\uC77C\uBD80 \uB7AD\uD0B9');expect(notice.textContent).not.toContain('\uC774 \uC810\uC218\uB294 \uB7AD\uD0B9\uC5D0 \uC62C\uB77C\uAC00\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.')}finally{act(()=>root.unmount())}
})
