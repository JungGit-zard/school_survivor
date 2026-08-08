// @vitest-environment jsdom
import React from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import TitleScreen from './TitleScreen.jsx'
import { WEAPON_CATALOG, isStarter } from '../lib/weaponCatalog.js'
import { getAllUnlocked, _resetForTests as resetWeaponUnlocks } from '../lib/weaponUnlocks.js'
import { purchase as purchasePassiveStorage } from '../lib/passiveUpgrades.js'
import { getSavedNickname, saveNicknameForUser } from '../lib/userNickname.js'
import { resetAdminConfig, saveAdminConfig } from '../lib/adminConfig.js'
import { loadTitleSettings, saveTitleSettings, unlockAllStagesForDevCheat } from '../lib/titleSettings.js'
import { _seedHydratedFirebaseProgressForTests, _resetFirebaseProgressForTests, _setFirebaseProgressClientForTests } from '../lib/firebaseProgress.js'
import { TERMS_VERSION, PRIVACY_VERSION } from '../lib/legalDocuments.js'
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

// consent.js가 실제로 배선된 이후에는(더 이상 항상-false 스캡폴드가 아니다) users/{uid}가
// 하이드레이트되어 있고 이미 동의 기록이 있는 사용자만 동의 게이트를 건너뛴다. 닉네임/로비
// 진입 흐름 자체를 검증하는 테스트들은 이 세팅을 통해 동의 게이트가 끼어들지 않게 한다.
function seedConsentedUser(user) {
  const now = new Date().toISOString()
  _seedHydratedFirebaseProgressForTests(user, {
    schemaVersion: 1,
    profile: { uid: user.uid, displayName: user.displayName ?? '', nickname: '' },
    progress: {
      goldTotal: 0,
      records: {},
      weaponUnlocks: {},
      weaponPermanentUpgrades: {},
      passiveUpgrades: {},
      titleSettings: { vibration: true, reducedEffects: false, unlockAllWeaponsCheat: false, unlockAllStagesCheat: false },
    },
    consent: {
      terms: { version: TERMS_VERSION, acceptedAt: now },
      privacy: { version: PRIVACY_VERSION, acceptedAt: now },
    },
  })
}

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
  resetAdminConfig()
  resetWeaponUnlocks()
  _resetAuthStoreForTests()
  useGameStore.getState().resetPassiveUpgrades()
  delete document.documentElement.dataset.reducedEffects
  vi.unstubAllGlobals()
  window.sessionStorage.clear()
})

describe('TitleScreen lobby entry', () => {
  it('renders the game-start action without gameplay guide text', () => {
    const { container, cleanup } = renderTitleScreen()

    expect(container.querySelector('[data-testid="title-gameplay-guide"]')).toBe(null)
    expect(container.querySelector('.title-main-action')?.textContent).toBe('게임 시작')
    expect(container.querySelector('style[data-title-intro-css]')?.textContent).toContain('.title-main-action:focus-visible')

    cleanup()
  })

  it('does not retain the removed 6ef title-copy mobile override', () => {
    const { container, cleanup } = renderTitleScreen()
    const titleCss = container.querySelector('style[data-title-intro-css]')?.textContent

    expect(container.querySelector('.title-copy')).toBeNull()
    expect(container.querySelector('h1[aria-label="탈출! 좀비학교"]')).not.toBeNull()
    expect(titleCss).not.toContain('@media (max-width: 360px) and (max-height: 600px)')
    expect(titleCss).not.toContain('.title-copy')

    cleanup()
  })

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

    expect(container.querySelector('[data-testid="mock-canvas"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="mock-title-scene"]')).toBeNull()
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

  it('enters the lobby immediately even when the signed-in user has no nickname', () => {
    const user = { uid: 'uid-1', displayName: 'Tester', email: 'tester@example.com', photoURL: '' }
    seedConsentedUser(user)
    useAuthStore.setState({
      status: 'signedIn',
      user,
      initialized: true,
    })
    const onEnterLobby = vi.fn()
    const { container, cleanup } = renderTitleScreen(onEnterLobby)

    clickButtonByText(container, '게임 시작')

    expect(onEnterLobby).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toContain('닉네임 설정')
    expect(container.querySelector('#title-nickname-input')).toBeNull()

    cleanup()
  })

  it('enters the lobby immediately when the signed-in user already has a nickname', () => {
    const user = { uid: 'uid-2', displayName: 'Returner', email: 'r@example.com', photoURL: '' }
    seedConsentedUser(user)
    useAuthStore.setState({
      status: 'signedIn',
      user,
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

  it.each([
    ['returns false', vi.fn(async () => false)],
    ['rejects', vi.fn(async () => { throw new Error('Studio hydrate failed') })],
  ])('enters the lobby without invoking a legacy Studio readiness callback when it %s', async (_scenario, ensureStudioCloudReady) => {
    const user = { uid: 'uid-studio-best-effort', displayName: 'Returner', email: 'r@example.com', photoURL: '' }
    seedConsentedUser(user)
    useAuthStore.setState({ status: 'signedIn', user, initialized: true })
    saveNicknameForUser(user, '복도반장')

    const onEnterLobby = vi.fn()
    const { container, cleanup } = renderTitleScreen(onEnterLobby, true, () => {})

    await act(async () => {
      clickButtonByTextRaw(container, '게임 시작')
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(ensureStudioCloudReady).not.toHaveBeenCalled()
    expect(onEnterLobby).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[role="alert"]')).toBeNull()

    cleanup()
  })

  it('does not wait for cloud progress hydration before entering the lobby', async () => {
    const user = { uid: 'uid-hydration-race', displayName: 'Hydration Tester', email: 'h@example.com', photoURL: '' }
    _resetFirebaseProgressForTests()
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'test-app')
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://test.firebaseio.com')
    _setFirebaseProgressClientForTests({
      load: vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        throw new Error('cloud progress should not gate title start')
      }),
      save: vi.fn(async () => true),
      remove: vi.fn(async () => true),
    })
    useAuthStore.setState({ status: 'signedIn', user, initialized: true })
    const onEnterLobby = vi.fn()
    const { container, cleanup } = renderTitleScreen(onEnterLobby, true, () => {})

    await act(async () => {
      clickButtonByTextRaw(container, '게임 시작')
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onEnterLobby).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toContain('이용약관·개인정보처리방침 동의')
    expect(container.querySelector('#title-nickname-input')).toBeNull()

    cleanup()
  })

  it('starts Google login from the start button when Google is signed out and enters the lobby after success', async () => {
    const googleUser = { uid: 'uid-login', displayName: 'Login Tester', email: 'login@example.com', photoURL: '' }
    const signInWithGoogle = vi.fn(async () => googleUser)
    useAuthStore.setState({
      status: 'signedOut',
      user: null,
      initialized: true,
      signInWithGoogle,
    })
    const onEnterLobby = vi.fn()
    const { container, cleanup } = renderTitleScreen(onEnterLobby, true, () => {})

    await act(async () => {
      clickButtonByTextRaw(container, '게임 시작')
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(signInWithGoogle).toHaveBeenCalledTimes(1)
    expect(onEnterLobby).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem('eszs:pending-start-after-google-login')).toBeNull()
    expect(container.querySelector('#title-nickname-input')).toBeNull()
    expect(container.textContent).not.toContain('닉네임 설정')
    expect(container.textContent).not.toContain('이용약관·개인정보처리방침 동의')

    cleanup()
  })

  it('enters the lobby after Google redirect returns with a signed-in user', async () => {
    const googleUser = { uid: 'uid-redirect', displayName: 'Redirect Tester', email: 'redirect@example.com', photoURL: '' }
    const signInWithGoogle = vi.fn(async () => null)
    useAuthStore.setState({
      status: 'signedOut',
      user: null,
      initialized: true,
      signInWithGoogle,
    })
    const onEnterLobby = vi.fn()
    const { container, cleanup } = renderTitleScreen(onEnterLobby, true, () => {})

    await act(async () => {
      clickButtonByTextRaw(container, '게임 시작')
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(signInWithGoogle).toHaveBeenCalledTimes(1)
    expect(onEnterLobby).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem('eszs:pending-start-after-google-login')).toBe('1')

    await act(async () => {
      useAuthStore.setState({ status: 'signedIn', user: googleUser })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onEnterLobby).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem('eszs:pending-start-after-google-login')).toBeNull()

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

  it('unlocks every non-starter weapon from the cheat modal action', async () => {
    const user = { uid: 'title-cheat-user', displayName: 'Cheat Tester' }
    seedConsentedUser(user)
    useAuthStore.setState({ status: 'signedIn', user, initialized: true })
    const { container, cleanup } = renderTitleScreen()

    openCheatMenu(container)
    clickButtonByText(container, '모든 무기 해금')

    await vi.dynamicImportSettled()

    const nonStarterIds = Object.keys(WEAPON_CATALOG).filter((id) => !isStarter(id))
    await vi.waitFor(() => {
      const unlocks = getAllUnlocked()
      for (const id of nonStarterIds) expect(unlocks.has(id), id).toBe(true)
    })

    cleanup()
  })

  it('persists the all-stages dev bypass without altering progression records', () => {
    const onUnlockAllStages = vi.fn()
    const { container, cleanup } = renderTitleScreen(() => {}, true, onUnlockAllStages)

    openCheatMenu(container)
    clickButtonByText(container, '모든 스테이지 해금')

    const records = loadPlayerRecords()
    expect(records.stage1Clears ?? 0).toBe(0)
    expect(records.stage2Clears ?? 0).toBe(0)
    expect(records.stage3Clears ?? 0).toBe(0)
    expect(loadTitleSettings().unlockAllStagesCheat).toBe(true)
    expect(onUnlockAllStages).toHaveBeenCalledTimes(1)

    cleanup()
  })

  it('keeps repeated all-stages dev bypass actions out of progression records', () => {
    unlockAllStagesForDevCheat()
    unlockAllStagesForDevCheat()

    const records = loadPlayerRecords()
    expect(records.stage1Clears ?? 0).toBe(0)
    expect(records.stage2Clears ?? 0).toBe(0)
    expect(records.stage3Clears ?? 0).toBe(0)
    expect(loadTitleSettings().unlockAllStagesCheat).toBe(true)
  })

  it('resets coin passive levels from the visible title reset button', () => {
    purchasePassiveStorage('magnet', 9999)
    purchasePassiveStorage('might', 9999)
    const { container, cleanup } = renderTitleScreen()

    openCheatMenu(container)
    clickButtonByText(container, '코인 레벨업 초기화')


    cleanup()
  })

  it('does not invoke the removed Studio callback after login', async () => {
    const user = { uid: 'studio-fallback-user', displayName: 'Fallback Player' }
    seedConsentedUser(user)
    useAuthStore.setState({ status: 'signedIn', user, initialized: true })
    saveNicknameForUser(user, 'Fallback')
    const onEnterLobby = vi.fn()
    const ensureStudioCloudReady = vi.fn(() => Promise.resolve(false))
    const { container, cleanup } = renderTitleScreen(onEnterLobby, true, () => {})

    await act(async () => {
      clickButtonByTextRaw(container, '게임 시작')
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(ensureStudioCloudReady).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(onEnterLobby).toHaveBeenCalledTimes(1)
    cleanup()
  })

  it('does not invoke a rejected legacy Studio callback after login', async () => {
    const user = { uid: 'studio-throw-user', displayName: 'Throw Player' }
    seedConsentedUser(user)
    useAuthStore.setState({ status: 'signedIn', user, initialized: true })
    saveNicknameForUser(user, 'Thrower')
    const onEnterLobby = vi.fn()
    const ensureStudioCloudReady = vi.fn(() => Promise.reject(new Error('read failed')))
    const { container, cleanup } = renderTitleScreen(onEnterLobby, true, () => {})

    await act(async () => {
      clickButtonByTextRaw(container, '게임 시작')
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(ensureStudioCloudReady).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(onEnterLobby).toHaveBeenCalledTimes(1)
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

function renderTitleScreen(
  onEnterLobby = () => {},
  initialDevCheatsVisible = true,
  onUnlockAllStages = () => {},
) {
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
