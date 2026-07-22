// @vitest-environment jsdom
import React from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import TitleScreen from './TitleScreen.jsx'
import { WEAPON_CATALOG, isStarter } from '../lib/weaponCatalog.js'
import { STORAGE_KEY as WEAPON_UNLOCKS_KEY, getAllUnlocked, _resetForTests as resetWeaponUnlocks } from '../lib/weaponUnlocks.js'
import { STORAGE_KEY as PASSIVE_STORAGE_KEY, purchase as purchasePassiveStorage } from '../lib/passiveUpgrades.js'
import { STORAGE_KEY as NICKNAME_STORAGE_KEY, getSavedNickname, saveNicknameForUser } from '../lib/userNickname.js'
import { resetAdminConfig, saveAdminConfig } from '../lib/adminConfig.js'
import { SETTINGS_STORAGE_KEY, loadTitleSettings, saveTitleSettings } from '../lib/titleSettings.js'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { load as loadPlayerRecords } from '../lib/playerRecords.js'
import { useAuthStore, _resetAuthStoreForTests } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, className, style }) => (
    <div data-testid="mock-canvas" className={className} style={style}>{children}</div>
  ),
}))

vi.mock('./TitleScene3D.jsx', () => ({
  default: ({ reducedEffects }) => (
    <div data-testid="mock-title-scene" data-reduced-effects={String(reducedEffects)} />
  ),
}))

beforeEach(() => {
  _seedHydratedFirebaseProgressForTests()
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
  resetAdminConfig()
  localStorage.removeItem(SETTINGS_STORAGE_KEY)
  resetWeaponUnlocks()
  _resetAuthStoreForTests()
  useGameStore.getState().resetPassiveUpgrades()
  delete document.documentElement.dataset.reducedEffects
  vi.unstubAllGlobals()
})

describe('TitleScreen lobby entry', () => {
  it('slams the title letters, sends the zombie, then gathers the 3D scene', () => {
    const { container, cleanup } = renderTitleScreen()
    const title = container.querySelector('h1[aria-label="탈출! 좀비학교"]')
    const letters = Array.from(title.querySelectorAll('[data-title-char]'))
    const emojis = Array.from(title.querySelectorAll('[data-title-emoji]'))
    const scene = container.querySelector('[data-testid="mock-canvas"]')

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
    expect(emojis.map((node) => node.textContent).join('')).toBe('🏫🧟‍♀️❤️')
    expect(emojis.every((node) => node.classList.contains('title-intro-zombie'))).toBe(true)
    expect(emojis.every((node) => node.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(emojis.every((node) => parseFloat(node.style.animationDelay) > (
      Math.max(...letters.map((letter) => parseFloat(letter.style.animationDelay))) + 520
    ))).toBe(true)
    expect(scene.classList.contains('title-intro-scene')).toBe(true)
    expect(parseFloat(scene.style.animationDelay)).toBeGreaterThanOrEqual(
      Math.max(...emojis.map((node) => parseFloat(node.style.animationDelay))) + 900,
    )
    expect(container.querySelector('[data-title-service-name]').getAttribute('aria-hidden')).toBe('true')

    const motionCss = container.querySelector('style[data-title-intro-css]').textContent
    expect(motionCss).toContain('@keyframes titleLetterSlam')
    expect(motionCss).toContain('scale(1.16)')
    expect(motionCss).toContain('scale(0.92)')
    expect(motionCss).toContain('@keyframes titleZombieScurry')
    expect(motionCss).toContain('@keyframes titleSceneGather')
    expect(motionCss).toContain('0% { opacity: 0; transform: translate3d(0, 105vh, 0); }')
    expect(motionCss).toContain('.title-intro-scene')
    expect(motionCss).not.toContain('@media (prefers-reduced-motion: reduce)')
    expect(motionCss).not.toContain(':root[data-reduced-effects]')

    cleanup()
  })

  it('keeps title effects enabled and restores the saved reduced-effects setting on exit', () => {
    const user = { uid: 'title-settings-user', displayName: 'Settings Tester' }
    _seedHydratedFirebaseProgressForTests(user)
    useAuthStore.setState({ status: 'signedIn', user, initialized: true })
    saveTitleSettings({ reducedEffects: true })
    const { container, cleanup } = renderTitleScreen()

    expect(container.querySelector('[data-testid="mock-title-scene"]')?.dataset.reducedEffects).toBe('false')
    expect(container.querySelectorAll('.title-intro-letter')).toHaveLength(7)
    expect(container.querySelector('.title-intro-zombie')).not.toBeNull()
    expect(container.querySelectorAll('[data-title-char]')).toHaveLength(7)
    expect(container.querySelector('[data-title-emoji]')).not.toBeNull()
    expect(document.documentElement.dataset.reducedEffects).toBeUndefined()
    expect(container.querySelector('h1').style.textShadow).not.toBe('none')
    expect(Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '게임 시작')?.style.fontSize).toBe('21px')

    cleanup()
    expect(document.documentElement.dataset.reducedEffects).toBe('true')
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
    expect(getSavedNickname({ uid: 'uid-1' })).toBe('교실 생존자')

    cleanup()
  })

  it('enters the lobby immediately when the signed-in user already has a nickname', () => {
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'uid-2', displayName: 'Returner', email: 'r@example.com', photoURL: '' },
      initialized: true,
    })
    saveNicknameForUser({ uid: 'uid-2' }, '복도반장')

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
      await Promise.resolve()
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

    const unlocks = getAllUnlocked()
    const nonStarterIds = Object.keys(WEAPON_CATALOG).filter((id) => !isStarter(id))

    for (const id of nonStarterIds) {
      expect(unlocks.has(id), id).toBe(true)
    }

    cleanup()
  })

  it('unlocks every stage from the cheat modal and persists the Stage 4 entry override', () => {
    const onUnlockAllStages = vi.fn()
    const { container, cleanup } = renderTitleScreen(() => {}, true, onUnlockAllStages)

    openCheatMenu(container)
    clickButtonByText(container, '모든 스테이지 해금')

    const records = loadPlayerRecords()
    expect(records.stage1Clears).toBeGreaterThanOrEqual(1)
    expect(records.stage2Clears).toBeGreaterThanOrEqual(1)
    expect(records.stage3Clears).toBeGreaterThanOrEqual(1)
    expect(loadTitleSettings().unlockAllStagesCheat).toBe(true)
    expect(onUnlockAllStages).toHaveBeenCalledTimes(1)

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

function renderTitleScreen(onEnterLobby = () => {}, initialDevCheatsVisible = true, onUnlockAllStages = () => {}) {
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
        onUnlockAllStages={onUnlockAllStages}
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
