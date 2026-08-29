// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StageRanking from './StageRanking.jsx'
import { fetchStageRanking, subscribeStageRanking } from '../lib/firebaseRanking.js'

vi.mock('../lib/firebaseRanking.js', async () => {
  const actual = await vi.importActual('../lib/firebaseRanking.js')
  return {
    ...actual,
    getActiveSeason: () => ({ seasonId: 'season-001', name: '첫 생존 시즌', active: true, endsAt: null }),
    fetchStageRanking: vi.fn((stageId, window) => Promise.resolve([
      {
        uid: `${stageId}-${window}-1`,
        displayName: window === 'daily' ? '일일왕' : '주간왕',
        score: window === 'daily' ? 900 : 1200,
        timeMs: 240000,
        cleared: true,
      },
    ])),
    // 창마다 다른 이름을 흘려보내야 "보드가 실제로 갈아끼워졌나"를 판정할 수 있다.
    subscribeStageRanking: vi.fn((stageId, window, onRows) => {
      onRows([{
        uid: `${stageId}-${window}-1`,
        displayName: window === 'daily' ? '실시간 일일왕' : '실시간 주간왕',
        score: window === 'daily' ? 900 : 1200,
        timeMs: 240000,
        cleared: true,
      }])
      return vi.fn()
    }),
  }
})

describe('StageRanking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens on the daily board and offers both period buttons', async () => {
    const view = await renderStageRanking()

    expect(view.container.textContent).toContain('스테이지 랭킹')
    expect(view.container.textContent).toContain('오늘 1위')
    expect(view.container.textContent).toContain('한국시간 당일 00:00:01 - 23:59:59')
    expect(view.container.textContent).toContain('실시간 일일왕')
    // 주간으로 바뀌는 게 아니라 두 버튼이 나란히 있어야 한다.
    expect(view.tabLabels()).toEqual(['일일랭킹', '주간랭킹'])
    expect(subscribeStageRanking).toHaveBeenCalledTimes(1)
    expect(subscribeStageRanking).toHaveBeenCalledWith('stage1', 'daily', expect.any(Function), { limit: 30 })
    expect(fetchStageRanking).not.toHaveBeenCalled()

    view.unmount()
  })

  it('resubscribes to the weekly window and drops the daily subscription when switching', async () => {
    const view = await renderStageRanking()
    const unsubscribeDaily = subscribeStageRanking.mock.results[0].value

    await view.clickTab('주간랭킹')

    expect(subscribeStageRanking).toHaveBeenNthCalledWith(2, 'stage1', 'weekly', expect.any(Function), { limit: 30 })
    // 이전 구독을 정리하지 않으면 두 보드의 행이 서로 덮어쓴다.
    expect(unsubscribeDaily).toHaveBeenCalledTimes(1)
    expect(subscribeStageRanking.mock.results[1].value).not.toHaveBeenCalled()

    expect(view.container.textContent).toContain('실시간 주간왕')
    expect(view.container.textContent).not.toContain('실시간 일일왕')

    view.unmount()
  })

  it('swaps the heading, reset notice and board label to the weekly wording', async () => {
    const view = await renderStageRanking()

    await view.clickTab('주간랭킹')

    expect(view.container.textContent).toContain('이번 주 1위')
    expect(view.container.textContent).toContain('한국시간 월요일 00:00:01 - 일요일 23:59:59')
    // 리셋 주기를 못 읽으면 플레이어는 기록이 사라졌다고 오해한다.
    expect(view.container.textContent).toContain('매주 월요일 초기화')
    expect(view.container.querySelector('ol').getAttribute('aria-label')).toContain('주간랭킹')

    await view.clickTab('일일랭킹')

    expect(view.container.textContent).toContain('오늘 1위')
    expect(view.container.textContent).toContain('매일 자정 초기화')
    expect(view.container.querySelector('ol').getAttribute('aria-label')).toContain('일일랭킹')

    view.unmount()
  })

  it('marks the selected period without relying on colour alone', async () => {
    const view = await renderStageRanking()

    expect(view.tab('일일랭킹').getAttribute('aria-pressed')).toBe('true')
    expect(view.tab('주간랭킹').getAttribute('aria-pressed')).toBe('false')
    // 선택 표시는 배경색 말고도 마커와 밑줄로 한 번 더 드러난다.
    expect(view.tab('일일랭킹').textContent).toContain('●')
    expect(view.tab('주간랭킹').textContent).toContain('○')
    expect(view.tab('일일랭킹').style.textDecoration).toBe('underline')

    await view.clickTab('주간랭킹')

    expect(view.tab('주간랭킹').getAttribute('aria-pressed')).toBe('true')
    expect(view.tab('일일랭킹').getAttribute('aria-pressed')).toBe('false')

    view.unmount()
  })

  it('keeps both period buttons at the mobile touch target minimum', async () => {
    const view = await renderStageRanking()

    for (const label of ['일일랭킹', '주간랭킹']) {
      expect(Number.parseInt(view.tab(label).style.minHeight, 10)).toBeGreaterThanOrEqual(44)
    }

    view.unmount()
  })

  it('shows a period-neutral empty message so the weekly board never reads as "nothing today"', async () => {
    subscribeStageRanking.mockImplementation(() => vi.fn())
    const view = await renderStageRanking()

    await view.clickTab('주간랭킹')

    expect(view.container.querySelector('ol').textContent).toBe('기록 대기 중')
    expect(view.container.querySelector('ol').textContent).not.toContain('오늘')

    view.unmount()
  })
})

async function renderStageRanking(props = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(<StageRanking stageId="stage1" onBack={() => {}} {...props} />)
  })
  await act(async () => {})

  const tabs = () => Array.from(container.querySelectorAll('[role="group"] button'))
  const tab = (label) => tabs().find((button) => button.textContent.includes(label))

  return {
    container,
    tab,
    tabLabels: () => tabs().map((button) => button.textContent.replace(/[●○]/g, '')),
    async clickTab(label) {
      await act(async () => {
        tab(label).dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
    },
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}
