// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import TitleScreen from './TitleScreen.jsx'
import { WEAPON_CATALOG, isStarter } from '../lib/weaponCatalog.js'
import { STORAGE_KEY as WEAPON_UNLOCKS_KEY, _resetForTests as resetWeaponUnlocks } from '../lib/weaponUnlocks.js'
import { STORAGE_KEY as RECORDS_KEY } from '../lib/playerRecords.js'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="mock-canvas">{children}</div>,
}))

vi.mock('./TitleScene3D.jsx', () => ({
  default: () => <div data-testid="mock-title-scene" />,
}))

const SETTINGS_KEY = 'school_survivor:titleSettings'

afterEach(() => {
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem(RECORDS_KEY)
  resetWeaponUnlocks()
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

    expect(saved).toEqual({ vibration: false, reducedEffects: true, unlockAllWeaponsCheat: false })
    expect(document.documentElement.dataset.reducedEffects).toBe('true')

    cleanup()
  })

  it('unlocks every non-starter weapon when the cheat toggle is enabled', () => {
    const { container, cleanup } = renderTitleScreen()

    act(() => {
      container.querySelector('[aria-label="설정 열기"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      container.querySelector('[aria-label="모든 무기 해금 치트 켜기"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const unlocks = JSON.parse(localStorage.getItem(WEAPON_UNLOCKS_KEY))
    const nonStarterIds = Object.keys(WEAPON_CATALOG).filter((id) => !isStarter(id))

    for (const id of nonStarterIds) {
      expect(unlocks[id], id).toBe(1)
    }

    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)).unlockAllWeaponsCheat).toBe(true)

    cleanup()
  })

  it('shows Stage 2 as locked before the unlock condition is met', () => {
    const { container, cleanup } = renderTitleScreen()

    expect(container.textContent).toContain('Stage 2')
    expect(container.textContent).toContain('잠김')
    expect(container.textContent).toContain('180초 생존 3회')

    cleanup()
  })

  it('starts Stage 2 when the record unlock condition is met and selected', () => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify({ stage1Clears: 1 }))
    const onStart = vi.fn()
    const { container, cleanup } = renderTitleScreen(onStart)

    act(() => {
      Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Stage 2')).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('게임 시작')).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onStart).toHaveBeenCalledWith('stage2')

    cleanup()
  })
})

function renderTitleScreen(onStart = () => {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<TitleScreen onStart={onStart} />)
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
