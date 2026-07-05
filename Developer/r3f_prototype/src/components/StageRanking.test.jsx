// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StageRanking from './StageRanking.jsx'
import { fetchStageRanking } from '../lib/firebaseRanking.js'

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
  }
})

describe('StageRanking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a stage daily ranking screen without a weekly tab', async () => {
    const view = await renderStageRanking()

    expect(view.container.textContent).toContain('스테이지 랭킹')
    expect(view.container.textContent).toContain('오늘 1위')
    expect(view.container.textContent).toContain('한국시간 당일 00:00:01 - 23:59:59')
    expect(view.container.textContent).toContain('일일왕')
    expect(fetchStageRanking).toHaveBeenCalledWith('stage1', 'daily', { limit: 100 })
    expect(fetchStageRanking).not.toHaveBeenCalledWith('stage1', 'weekly', { limit: 100 })
    expect(view.container.textContent).not.toContain('주간랭킹')
    expect(view.container.textContent).not.toContain('주간왕')

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

  return {
    container,
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}
