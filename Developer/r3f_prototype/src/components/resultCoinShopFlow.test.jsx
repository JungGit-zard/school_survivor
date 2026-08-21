// @vitest-environment jsdom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import Lobby from './Lobby.jsx'
import HUD from './HUD.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { useAuthStore } from '../store/useAuthStore.js'

vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="mock-canvas" />,
}))

vi.mock('./TitleScene3D.jsx', () => ({
  default: () => <div data-testid="mock-title-scene" />,
}))

beforeEach(() => {
  _seedHydratedFirebaseProgressForTests({ uid: 'coin-shop-user' })
  // 로비 스테이지 카드는 로그인 + 진행도 hydrate가 끝나야 그려진다(그 전엔 lobby-records-pending).
  useAuthStore.setState({
    status: 'signedIn',
    user: { uid: 'coin-shop-user', displayName: 'Coin Shop Tester' },
    initialized: true,
    progressStatus: 'ready',
  })
})

afterEach(() => {
  vi.useRealTimers()
  useGameStore.getState().resetGame()
})

describe('coin shop entry flow', () => {
  it('lobby exposes stage, coin shop, and ranking entries', () => {
    // zustand v4의 SSR 스냅샷(getInitialState)은 setState를 반영하지 않아
    // renderToStaticMarkup으로는 로비의 로그인/진행도 게이트를 통과할 수 없다 — 클라이언트 렌더로 검증한다.
    const html = renderLobbyHtml()

    expect(html).toContain('입장하기')
    expect(html).toContain('상점')
    expect(html).toContain('랭킹')
  })

  it('game over result exposes the coin shop entry', () => {
    vi.useFakeTimers()
    useGameStore.setState({ phase: 'gameover', goldSession: 12, goldTotal: 30 })

    const html = renderHud({ advanceMs: 1000 })

    expect(html).toContain('GAME OVER')
    expect(html).toContain('코인상점')
    expect(html).toContain('획득 골드: 12')
  })

  it('stage clear result exposes the coin shop entry', () => {
    useGameStore.setState({ phase: 'cleared', goldSession: 32, goldTotal: 60 })

    const html = renderHud()

    expect(html).toContain('STAGE CLEAR!')
    expect(html).toContain('코인상점')
    expect(html).toContain('획득 골드: 32')
  })
})

function renderLobbyHtml() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<Lobby onStartStage={() => {}} onOpenCoinShop={() => {}} onOpenRanking={() => {}} />)
  })
  const html = container.innerHTML
  act(() => {
    root.unmount()
  })
  container.remove()
  return html
}

function renderHud({ advanceMs = 0 } = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<HUD onOpenCoinShop={() => {}} />)
  })
  if (advanceMs > 0) {
    act(() => {
      vi.advanceTimersByTime(advanceMs)
    })
  }
  const html = container.innerHTML
  act(() => {
    root.unmount()
  })
  container.remove()
  return html
}
