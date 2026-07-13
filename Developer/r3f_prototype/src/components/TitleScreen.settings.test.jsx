// @vitest-environment jsdom
import React from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import TitleScreen from './TitleScreen.jsx'
import { WEAPON_CATALOG, isStarter } from '../lib/weaponCatalog.js'
import { STORAGE_KEY as WEAPON_UNLOCKS_KEY, _resetForTests as resetWeaponUnlocks } from '../lib/weaponUnlocks.js'
import { STORAGE_KEY as PASSIVE_STORAGE_KEY, purchase as purchasePassiveStorage } from '../lib/passiveUpgrades.js'
import { STORAGE_KEY as NICKNAME_STORAGE_KEY } from '../lib/userNickname.js'
import { ADMIN_CONFIG_STORAGE_KEY, saveAdminConfig } from '../lib/adminConfig.js'
import { SETTINGS_STORAGE_KEY } from '../lib/titleSettings.js'
import { useAuthStore, _resetAuthStoreForTests } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="mock-canvas">{children}</div>,
}))

vi.mock('./TitleScene3D.jsx', () => ({
  default: ({ reducedEffects }) => (
    <div data-testid="mock-title-scene" data-reduced-effects={String(reducedEffects)} />
  ),
}))

beforeEach(() => {
  vi.stubGlobal('Audio', vi.fn(function AudioMock() {
    return {
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      src: '',
    }
  }))
})

afterEach(() => {
  localStorage.removeItem(PASSIVE_STORAGE_KEY)
  localStorage.removeItem(NICKNAME_STORAGE_KEY)
  localStorage.removeItem(ADMIN_CONFIG_STORAGE_KEY)
  localStorage.removeItem(SETTINGS_STORAGE_KEY)
  resetWeaponUnlocks()
  _resetAuthStoreForTests()
  useGameStore.getState().resetPassiveUpgrades()
  vi.unstubAllGlobals()
})

describe('TitleScreen lobby entry', () => {
  it('slams the title letters in the requested order and sends the zombie last', () => {
    const { container, cleanup } = renderTitleScreen()
    const title = container.querySelector('h1[aria-label="탈출! 좀비학교"]')
    const letters = Array.from(title.querySelectorAll('[data-title-char]'))
    const emoji = title.querySelector('[data-title-emoji]')

    expect(letters.map((node) => node.textContent).join('')).toBe('탈출!좀비학교')
    expect(letters
      .toSorted((left, right) => parseFloat(left.style.animationDelay) - parseFloat(right.style.animationDelay))
      .map((node) => node.textContent)
      .join('')).toBe('탈출좀비학교!')
    expect(letters.every((node) => node.classList.contains('title-intro-letter'))).toBe(true)
    expect(letters.every((node) => node.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(letters.every((node) => {
      const x = node.style.getPropertyValue('--title-enter-x')
      const y = node.style.getPropertyValue('--title-enter-y')
      return (x.endsWith('vw') && Math.abs(parseFloat(x)) >= 50)
        || (y.endsWith('vh') && Math.abs(parseFloat(y)) >= 50)
    })).toBe(true)
    expect(emoji.textContent).toBe('🧟‍♀️')
    expect(emoji.classList.contains('title-intro-zombie')).toBe(true)
    expect(emoji.getAttribute('aria-hidden')).toBe('true')
    expect(parseFloat(emoji.style.animationDelay)).toBeGreaterThan(
      Math.max(...letters.map((node) => parseFloat(node.style.animationDelay))) + 520,
    )
    expect(container.querySelector('[data-title-service-name]').getAttribute('aria-hidden')).toBe('true')

    const motionCss = container.querySelector('style[data-title-intro-css]').textContent
    expect(motionCss).toContain('@keyframes titleLetterSlam')
    expect(motionCss).toContain('scale(1.16)')
    expect(motionCss).toContain('scale(0.92)')
    expect(motionCss).toContain('@keyframes titleZombieScurry')
    expect(motionCss).toContain('@media (prefers-reduced-motion: reduce)')
    expect(motionCss).toContain('.title-intro-letter, .title-intro-zombie { animation: none !important; opacity: 1 !important; transform: none !important; }')

    cleanup()
  })

  it('passes the saved reduced-effects setting to the title scene', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ reducedEffects: true }))
    const { container, cleanup } = renderTitleScreen()

    expect(container.querySelector('[data-testid="mock-title-scene"]')?.dataset.reducedEffects).toBe('true')
    expect(container.querySelectorAll('.title-intro-letter')).toHaveLength(0)
    expect(container.querySelector('.title-intro-zombie')).toBeNull()
    expect(container.querySelectorAll('[data-title-char]')).toHaveLength(7)
    expect(container.querySelector('[data-title-emoji]')).not.toBeNull()

    cleanup()
  })

  it('keeps the hero title larger without the thin black stroke line', () => {
    const { container, cleanup } = renderTitleScreen()

    const title = Array.from(container.querySelectorAll('h1'))
      .find((node) => node.textContent.includes('좀비학교'))
    const [accent] = title.querySelectorAll('span')

    expect(title.style.getPropertyValue('-webkit-text-fill-color')).toBe('rgb(248, 247, 242)')
    expect(accent.style.getPropertyValue('-webkit-text-fill-color')).toBe('rgb(255, 138, 55)')
    expect(title.style.getPropertyValue('-webkit-text-stroke')).toBe('')
    expect(readFileSync('src/components/TitleScreen.jsx', 'utf8'))
      .toContain("fontSize: 'clamp(46.8px, 14.04vw, 65px)'")

    cleanup()
  })

  it('asks for a nickname before entering the lobby and saves it for the Google user', () => {
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'uid-1', displayName: 'Tester', email: 'tester@example.com', photoURL: '' },
      initialized: true,
    })
    const onEnterLobby = vi.fn()
    const { container, cleanup } = renderTitleScreen(onEnterLobby)

    clickButtonByText(container, '게임 시작')

    expect(onEnterLobby).not.toHaveBeenCalled()
    expect(container.textContent).toContain('닉네임 설정')

    setInputValue(container.querySelector('#title-nickname-input'), '  교실 생존자  ')
    clickButtonByText(container, '저장하고 시작')

    expect(onEnterLobby).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem(NICKNAME_STORAGE_KEY))).toEqual({
      'uid-1': '교실 생존자',
    })

    cleanup()
  })

  it('enters the lobby immediately when the signed-in user already has a nickname', () => {
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'uid-2', displayName: 'Returner', email: 'r@example.com', photoURL: '' },
      initialized: true,
    })
    localStorage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify({ 'uid-2': '복도반장' }))

    const onEnterLobby = vi.fn()
    const { container, cleanup } = renderTitleScreen(onEnterLobby)

    clickButtonByText(container, '게임 시작')

    expect(onEnterLobby).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toContain('닉네임 설정')

    cleanup()
  })

  it('starts Google login from the start button when Google is signed out', async () => {
    const googleUser = { uid: 'uid-login', displayName: 'Login Tester', email: 'login@example.com', photoURL: '' }
    const signInWithGoogle = vi.fn(async () => googleUser)
    useAuthStore.setState({
      status: 'signedOut',
      user: null,
      initialized: true,
      signInWithGoogle,
    })
    const onEnterLobby = vi.fn()
    const { container, cleanup } = renderTitleScreen(onEnterLobby)

    await act(async () => {
      clickButtonByTextRaw(container, '게임 시작')
    })

    expect(signInWithGoogle).toHaveBeenCalledTimes(1)
    expect(onEnterLobby).not.toHaveBeenCalled()
    expect(container.querySelector('#title-nickname-input')).not.toBeNull()

    cleanup()
  })

  it('hides the top cheat menu button when admin operations disable it', () => {
    saveAdminConfig({
      operations: {
        cheatMenuButtonVisible: false,
      },
    })

    const { container, cleanup } = renderTitleScreen()

    expect(container.querySelector('[aria-label="치트 메뉴 열기"]')).toBeNull()

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

  it('reveals cheat controls when typing the title command sequence', () => {
    const { container, cleanup } = renderTitleScreen(() => {}, false)

    expect(container.querySelector('[aria-label="치트 메뉴 열기"]')).toBeNull()

    revealCheats()

    expect(container.textContent).toContain('치트키가 보입니다')
    expect(container.querySelector('[aria-label="치트 메뉴 열기"]')).not.toBeNull()

    cleanup()
  })
})

function renderTitleScreen(onEnterLobby = () => {}, initialDevCheatsVisible = true) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  function Harness() {
    const [devCheatsVisible, setDevCheatsVisible] = React.useState(initialDevCheatsVisible)
    return (
      <TitleScreen
        onEnterLobby={onEnterLobby}
        devCheatsVisible={devCheatsVisible}
        onRevealDevCheats={() => setDevCheatsVisible(true)}
      />
    )
  }

  act(() => {
    root.render(<Harness />)
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
  revealCheats()
  clickButtonByText(container, '치트')
}

function revealCheats() {
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowUp', 'ArrowDown', 'a', 's', 'd']
  act(() => {
    for (const key of keys) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    }
  })
}

function clickButtonByText(container, text) {
  act(() => {
    clickButtonByTextRaw(container, text)
  })
}

function clickButtonByTextRaw(container, text) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent.includes(text))
  if (!button) throw new Error(`Missing button: ${text}`)
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function setInputValue(input, value) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
