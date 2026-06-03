// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import TitleScreen from './TitleScreen.jsx'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="mock-canvas">{children}</div>,
}))

vi.mock('./TitleScene3D.jsx', () => ({
  default: () => <div data-testid="mock-title-scene" />,
}))

const SETTINGS_KEY = 'school_survivor:titleSettings'

afterEach(() => {
  localStorage.removeItem(SETTINGS_KEY)
  document.documentElement.removeAttribute('data-reduced-effects')
})

describe('TitleScreen settings modal', () => {
  it('opens a floating settings modal from the gear button', () => {
    const { container, cleanup } = renderTitleScreen()

    expect(container.textContent).not.toContain('조작법 보기')

    act(() => {
      container.querySelector('[aria-label="설정 열기"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('설정')
    expect(container.textContent).toContain('진동')
    expect(container.textContent).toContain('연출 줄이기')
    expect(container.textContent).toContain('조작법 보기')

    cleanup()
  })

  it('persists vibration and reduced-effect choices', () => {
    const { container, cleanup } = renderTitleScreen()

    act(() => {
      container.querySelector('[aria-label="설정 열기"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    act(() => {
      container.querySelector('[aria-label="진동 끄기"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      container.querySelector('[aria-label="연출 줄이기 켜기"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY))

    expect(saved).toEqual({ vibration: false, reducedEffects: true })
    expect(document.documentElement.dataset.reducedEffects).toBe('true')

    cleanup()
  })
})

function renderTitleScreen() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<TitleScreen onStart={() => {}} />)
  })

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}
