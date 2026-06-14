// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import TitleScreen from './TitleScreen.jsx'
import HUD from './HUD.jsx'
import { useGameStore } from '../store/useGameStore.js'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="mock-canvas">{children}</div>,
}))

vi.mock('./TitleScene3D.jsx', () => ({
  default: () => <div data-testid="mock-title-scene" />,
}))

describe('coin shop entry flow', () => {
  it('title screen exposes the coin shop entry', () => {
    const html = renderToStaticMarkup(<TitleScreen onStart={() => {}} />)

    expect(html).toContain('게임 시작')
    expect(html).toContain('코인상점')
  })

  it('game over result exposes the coin shop entry', () => {
    useGameStore.setState({ phase: 'gameover', goldSession: 12, goldTotal: 30 })

    const html = renderHud()

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

function renderHud() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<HUD onOpenCoinShop={() => {}} />)
  })
  const html = container.innerHTML
  act(() => {
    root.unmount()
  })
  container.remove()
  return html
}
