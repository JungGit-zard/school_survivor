// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <canvas data-testid="mock-canvas">{children}</canvas>,
}))

vi.mock('@react-three/rapier', () => ({
  Physics: ({ children }) => <>{children}</>,
}))

vi.mock('@react-three/drei', () => ({
  KeyboardControls: ({ children }) => <>{children}</>,
}))

vi.mock('./components/Game.jsx', () => ({
  default: () => <div data-testid="mock-game" />,
}))

vi.mock('./components/HUD.jsx', () => ({
  default: () => <div data-testid="mock-hud" />,
}))

vi.mock('./components/TitleScreen.jsx', () => ({
  default: ({ onStart }) => <button type="button" onClick={onStart}>start</button>,
}))

vi.mock('./components/VirtualJoystick.jsx', () => ({
  default: () => <div data-testid="virtual-joystick-mounted" />,
}))

function setInputEnvironment({ maxTouchPoints, userAgent, platform = '', coarse }) {
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: maxTouchPoints })
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent })
  Object.defineProperty(navigator, 'platform', { configurable: true, value: platform })
  window.matchMedia = vi.fn(() => ({
    matches: coarse,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function renderAppAndStart() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<App />)
  })
  act(() => {
    container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  return {
    container,
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('App virtual joystick mounting', () => {
  it('uses the full viewport width so narrow iPhone SE screens are not pillarboxed', () => {
    setInputEnvironment({
      maxTouchPoints: 5,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
      coarse: true,
    })

    const view = renderAppAndStart()
    const viewport = view.container.firstElementChild
    const phoneFrame = viewport.firstElementChild

    expect(phoneFrame.style.width).toBe('100vw')
    expect(phoneFrame.style.height).toBe('100vh')
    expect(phoneFrame.style.aspectRatio).toBe('')
    view.unmount()
  })

  it('does not mount the virtual joystick on desktop web environments', () => {
    setInputEnvironment({
      maxTouchPoints: 0,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      coarse: false,
    })

    const view = renderAppAndStart()

    expect(view.container.querySelector('[data-testid="virtual-joystick-mounted"]')).toBe(null)
    view.unmount()
  })

  it('mounts the virtual joystick on mobile touch environments during the game screen', () => {
    setInputEnvironment({
      maxTouchPoints: 5,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
      coarse: true,
    })

    const view = renderAppAndStart()

    expect(view.container.querySelector('[data-testid="virtual-joystick-mounted"]')).not.toBe(null)
    view.unmount()
  })
})
