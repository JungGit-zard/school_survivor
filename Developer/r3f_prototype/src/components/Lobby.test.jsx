// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Lobby from './Lobby.jsx'
import { saveStageBossPreview } from '../lib/graphicsStudioConfig.js'
import { STORAGE_KEY as PLAYER_RECORDS_KEY } from '../lib/playerRecords.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'

vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="stage-monster-canvas" />,
}))

vi.mock('../lib/firebaseRanking.js', async () => {
  const actual = await vi.importActual('../lib/firebaseRanking.js')
  return {
    ...actual,
    fetchStageRanking: vi.fn(() => Promise.resolve([])),
  }
})

describe('Lobby', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'lobby-user', displayName: 'Lobby Tester', email: 'lobby@example.com' },
      initialized: true,
    })
    useGameStore.setState({ goldTotal: 12 })
  })

  it('opens stage play, ranking, and coin shop from the lobby', () => {
    vi.useFakeTimers()
    const onStartStage = vi.fn()
    const onOpenCoinShop = vi.fn()
    const onOpenRanking = vi.fn()
    const view = renderLobby({ onStartStage, onOpenCoinShop, onOpenRanking })

    clickButtonByText(view.container, '입장하기')
    act(() => {
      vi.advanceTimersByTime(720)
    })
    expect(onStartStage).toHaveBeenCalledWith('stage1')

    clickButtonByText(view.container, '점수 레코드')
    expect(onOpenRanking).toHaveBeenCalledWith('stage1')

    clickButtonByText(view.container, '상점')
    expect(onOpenCoinShop).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
    view.unmount()
  })

  it('renders the four-button mobile bottom navigator', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const nav = view.container.querySelector('[aria-label="로비 메뉴"]')
    const labels = Array.from(nav.querySelectorAll('button')).map((button) => button.textContent)

    expect(labels).toEqual(['능력치', '무기', '랭킹', '상점'])

    view.unmount()
  })

  it('does not show player cumulative play and season best in the lobby season block', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(view.container.textContent).not.toContain('내 시즌최고점')
    expect(view.container.textContent).not.toContain('내 누적플레이')

    view.unmount()
  })

  it('replaces daily and weekly first-place previews with a stage monster preview', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(view.container.textContent).not.toContain('일일 1위')
    expect(view.container.textContent).not.toContain('주간 1위')
    expect(view.container.querySelector('[aria-label="stage1 보스 3D"]')).toBeTruthy()

    view.unmount()
  })

  it('uses the stage 2 teacher zombie boss in the unlocked stage 2 preview', () => {
    localStorage.setItem(PLAYER_RECORDS_KEY, JSON.stringify({ stage1Clears: 1, bestSurvivalSeconds: 240 }))

    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const previews = Array.from(view.container.querySelectorAll('[data-testid="stage-boss-preview"]'))

    expect(previews[0].dataset.bossType).toBe('B01')
    expect(previews[1].dataset.bossType).toBe('B02')

    view.unmount()
  })

  it('uses the stage title as the card hero without the old square stage badge', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(view.container.textContent).toContain('Stage 1')
    expect(view.container.textContent).toContain('교실 생존')
    expect(view.container.textContent).not.toContain('STAGE')

    view.unmount()
  })

  it('uses the saved studio stage boss preview framing', () => {
    saveStageBossPreview({ zoom: 137, panX: 0.5, panY: -0.25 })

    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const preview = view.container.querySelector('[data-testid="stage-boss-preview"]')

    expect(preview.dataset.zoom).toBe('137')
    expect(preview.dataset.panX).toBe('0.5')
    expect(preview.dataset.panY).toBe('-0.25')

    view.unmount()
  })

  it('injects lobby juice keyframes and marks motion nodes for the reduced-effects gate', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(document.getElementById('lobby-keyframes')).toBeTruthy()
    expect(view.container.querySelector('.lobby-anim')).toBeTruthy()
    expect(view.container.querySelector('[data-testid="lobby-ambient-drift"]').style.transform).toContain('translate3d')

    view.unmount()
  })

  it('overlays the stage text on top of a taller boss preview area', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const previewRow = view.container.querySelector('[data-testid="stage-card-preview-row"]')
    const preview = previewRow.querySelector('[data-testid="stage-boss-preview"]')
    const overlay = previewRow.querySelector('[data-testid="stage-card-preview-overlay"]')

    expect(preview.style.height).toBe('144px')
    expect(previewRow.parentElement.style.padding).toBe('5px')
    expect(previewRow.firstElementChild).toBe(preview)
    expect(overlay.style.position).toBe('absolute')
    expect(overlay.style.textAlign).toBe('right')
    expect(overlay.textContent).toContain('Stage 1')
    expect(overlay.textContent).toContain('교실 생존')
    expect(previewRow.contains(findButtonByText(view.container, '입장하기'))).toBe(true)
    expect(previewRow.contains(findButtonByText(view.container, '점수 레코드'))).toBe(true)

    view.unmount()
  })

  it('places the clear badge at the top-left of the preview after clearing a stage', () => {
    localStorage.setItem(PLAYER_RECORDS_KEY, JSON.stringify({ stage1Clears: 1, bestSurvivalSeconds: 240 }))

    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const previewRow = view.container.querySelector('[data-testid="stage-card-preview-row"]')
    const clearBadge = Array.from(previewRow.querySelectorAll('span')).find((node) => node.textContent === '클리어')

    expect(clearBadge.style.position).toBe('absolute')
    expect(clearBadge.style.top).toBe('9px')
    expect(clearBadge.style.left).toBe('10px')

    const rankingButton = findButtonByText(view.container, '점수 레코드')
    expect(rankingButton.style.position).toBe('absolute')
    expect(rankingButton.style.top).toBe('34px')
    expect(rankingButton.style.left).toBe('10px')

    view.unmount()
  })

  it('keeps the boss preview still until enter queues the reserved motion', () => {
    vi.useFakeTimers()
    const onStartStage = vi.fn()
    const view = renderLobby({ onStartStage, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const previewRow = view.container.querySelector('[data-testid="stage-card-preview-row"]')
    const preview = previewRow.querySelector('[data-testid="stage-boss-preview"]')
    const enterButton = previewRow.querySelectorAll('button')[0]

    expect(preview.dataset.motionActive).toBe('false')

    act(() => {
      enterButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(preview.dataset.motionActive).toBe('true')
    expect(onStartStage).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(720)
    })

    expect(onStartStage).toHaveBeenCalledWith('stage1')

    vi.useRealTimers()
    view.unmount()
  })

  it('starts immediately when reduced effects disables the reserved motion', () => {
    document.documentElement.dataset.reducedEffects = 'true'
    const onStartStage = vi.fn()
    const view = renderLobby({ onStartStage, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const previewRow = view.container.querySelector('[data-testid="stage-card-preview-row"]')
    const enterButton = previewRow.querySelectorAll('button')[0]

    act(() => {
      enterButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onStartStage).toHaveBeenCalledWith('stage1')

    delete document.documentElement.dataset.reducedEffects
    view.unmount()
  })
})

function renderLobby(props) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<Lobby {...props} />)
  })

  return {
    container,
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

function clickButtonByText(container, text) {
  const button = findButtonByText(container, text)
  if (!button) throw new Error(`Missing button: ${text}`)
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function findButtonByText(container, text) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent.includes(text))
  return button
}
