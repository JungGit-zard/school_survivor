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
import { isFirebaseRankingConfigured, subscribeGlobalRanking } from '../lib/firebaseRanking.js'

vi.mock('../lib/firebaseRanking.js', () => ({
  isFirebaseRankingConfigured: vi.fn(() => false),
  subscribeGlobalRanking: vi.fn(() => vi.fn()),
}))

describe('UserRanking', () => {
  beforeEach(() => {
    localStorage.clear()
    _seedHydratedFirebaseProgressForTests()
    useAuthStore.setState({ user: null })
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
    expect(html).toContain('330점')
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
    expect(html).toContain('826')
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
