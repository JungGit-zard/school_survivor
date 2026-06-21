// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import TitleScreen from './TitleScreen.jsx'
import { WEAPON_CATALOG, isStarter } from '../lib/weaponCatalog.js'
import { STORAGE_KEY as WEAPON_UNLOCKS_KEY, _resetForTests as resetWeaponUnlocks } from '../lib/weaponUnlocks.js'
import { STORAGE_KEY as PASSIVE_STORAGE_KEY, purchase as purchasePassiveStorage } from '../lib/passiveUpgrades.js'
import { STORAGE_KEY as RECORDS_KEY } from '../lib/playerRecords.js'
import { STORAGE_KEY as NICKNAME_STORAGE_KEY } from '../lib/userNickname.js'
import { useAuthStore, _resetAuthStoreForTests } from '../store/useAuthStore.js'

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
  localStorage.removeItem(PASSIVE_STORAGE_KEY)
  localStorage.removeItem(NICKNAME_STORAGE_KEY)
  resetWeaponUnlocks()
  _resetAuthStoreForTests()
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

  it('keeps weapon unlock cheats out of the settings modal', () => {
    const { container, cleanup } = renderTitleScreen()

    act(() => {
      container.querySelector('[aria-label="설정 열기"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('설정')
    expect(container.textContent).not.toContain('모든 무기 해금')
    expect(container.textContent).not.toContain('코인 레벨업 초기화')

    cleanup()
  })

  it('keeps development controls behind the top cheat menu button', () => {
    const { container, cleanup } = renderTitleScreen()

    expect(container.textContent).not.toContain('모든 무기 해금')
    expect(container.textContent).not.toContain('코인 레벨업 초기화')
    expect(container.textContent).not.toContain('시작 스테이지')

    act(() => {
      container.querySelector('[aria-label="치트 메뉴 열기"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('치트 메뉴')
    expect(container.textContent).toContain('시작 스테이지')
    expect(container.textContent).toContain('Stage 1')
    expect(container.textContent).toContain('Stage 2')
    expect(container.textContent).toContain('모든 무기 해금')
    expect(container.textContent).toContain('코인 레벨업 초기화')

    cleanup()
  })

  it('opens the user ranking page from the title action stack', () => {
    const onOpenRanking = vi.fn()
    const { container, cleanup } = renderTitleScreen(() => {}, onOpenRanking)

    clickButtonByText(container, '유저랭킹')

    expect(onOpenRanking).toHaveBeenCalledTimes(1)

    cleanup()
  })

  it('asks for a nickname before starting and saves it for the Google user', () => {
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'uid-1', displayName: 'Tester', email: 'tester@example.com', photoURL: '' },
      initialized: true,
    })
    const onStart = vi.fn()
    const { container, cleanup } = renderTitleScreen(onStart)

    clickButtonByText(container, '게임 시작')

    expect(onStart).not.toHaveBeenCalled()
    expect(container.textContent).toContain('닉네임')

    setInputValue(container.querySelector('[aria-label="유저 닉네임"]'), '  교실 생존자  ')
    clickButtonByText(container, '저장하고 시작')

    expect(onStart).toHaveBeenCalledWith('stage1')
    expect(JSON.parse(localStorage.getItem(NICKNAME_STORAGE_KEY))).toEqual({
      'uid-1': '교실 생존자',
    })

    cleanup()
  })

  it('unlocks every non-starter weapon from the cheat modal action', () => {
    const { container, cleanup } = renderTitleScreen()

    openCheatMenu(container)
    clickButtonByText(container, '모든 무기 해금')

    const unlocks = JSON.parse(localStorage.getItem(WEAPON_UNLOCKS_KEY))
    const nonStarterIds = Object.keys(WEAPON_CATALOG).filter((id) => !isStarter(id))

    for (const id of nonStarterIds) {
      expect(unlocks[id], id).toBe(1)
    }

    cleanup()
  })

  it('resets coin passive levels from the visible title reset button', () => {
    purchasePassiveStorage('magnet', 9999)
    purchasePassiveStorage('might', 9999)
    const { container, cleanup } = renderTitleScreen()

    openCheatMenu(container)
    clickButtonByText(container, '코인 레벨업 초기화')

    expect(localStorage.getItem(PASSIVE_STORAGE_KEY)).toBeNull()

    cleanup()
  })

  it('unlocks every non-starter weapon when typing the title cheat key sequence', () => {
    const { cleanup } = renderTitleScreen()

    act(() => {
      for (const key of 'unlockall') {
        window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
      }
    })

    const unlocks = JSON.parse(localStorage.getItem(WEAPON_UNLOCKS_KEY))
    const nonStarterIds = Object.keys(WEAPON_CATALOG).filter((id) => !isStarter(id))

    for (const id of nonStarterIds) {
      expect(unlocks[id], id).toBe(1)
    }

    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)).unlockAllWeaponsCheat).toBe(true)

    cleanup()
  })

  it('opens Stage selection inside the cheat modal', () => {
    const { container, cleanup } = renderTitleScreen()

    expect(container.textContent).not.toContain('스테이지 선택')
    openCheatMenu(container)

    expect(container.textContent).toContain('시작 스테이지')
    expect(container.textContent).toContain('Stage 1')
    expect(container.textContent).toContain('Stage 2')

    cleanup()
  })

  it('starts Stage 2 when selected from the cheat modal', () => {
    const onStart = vi.fn()
    const { container, cleanup } = renderTitleScreen(onStart)

    openCheatMenu(container)
    clickButtonByText(container, 'Stage 2')
    clickButtonByText(container, '게임 시작')
    setInputValue(container.querySelector('[aria-label="유저 닉네임"]'), '복도 생존자')
    clickButtonByText(container, '저장하고 시작')

    expect(onStart).toHaveBeenCalledWith('stage2')

    cleanup()
  })
})

function renderTitleScreen(onStart = () => {}, onOpenRanking = () => {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<TitleScreen onStart={onStart} onOpenRanking={onOpenRanking} />)
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

function openCheatMenu(container) {
  act(() => {
    container.querySelector('[aria-label="치트 메뉴 열기"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function clickButtonByText(container, text) {
  act(() => {
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes(text))
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function setInputValue(input, value) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
