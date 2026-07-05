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

  it('renders a stage ranking screen with daily and weekly tabs', async () => {
    const view = await renderStageRanking()

    expect(view.container.textContent).toContain('스테이지 랭킹')
    expect(view.container.textContent).toContain('일일 1위')
    expect(view.container.textContent).toContain('주간 1위')
    expect(view.container.textContent).toContain('일일랭킹')
    expect(view.container.textContent).toContain('주간랭킹')
    expect(view.container.textContent).toContain('일일왕')
    expect(fetchStageRanking).toHaveBeenCalledWith('stage1', 'daily', { limit: 100 })
    expect(fetchStageRanking).toHaveBeenCalledWith('stage1', 'weekly', { limit: 100 })

    await clickButtonByText(view.container, '주간랭킹')
    expect(view.container.textContent).toContain('주간왕')

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

async function clickButtonByText(container, text) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent.includes(text))
  if (!button) throw new Error(`Missing button: ${text}`)
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}
