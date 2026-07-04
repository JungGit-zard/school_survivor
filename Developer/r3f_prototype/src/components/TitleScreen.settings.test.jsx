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
import { ADMIN_CONFIG_STORAGE_KEY, saveAdminConfig } from '../lib/adminConfig.js'
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
  localStorage.removeItem(ADMIN_CONFIG_STORAGE_KEY)
  resetWeaponUnlocks()
  _resetAuthStoreForTests()
  document.documentElement.removeAttribute('data-reduced-effects')
})

describe('TitleScreen settings modal', () => {
  it('keeps the hero title fill explicit under WebKit text stroke', () => {
    const { container, cleanup } = renderTitleScreen()

    const title = Array.from(container.querySelectorAll('h1'))
      .find((node) => node.textContent.includes('zombie school'))
    const [accent] = title.querySelectorAll('span')

    expect(title.style.getPropertyValue('-webkit-text-fill-color')).toBe('rgb(248, 247, 242)')
    expect(accent.style.getPropertyValue('-webkit-text-fill-color')).toBe('rgb(255, 138, 55)')

    cleanup()
  })

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

  it('keeps development controls behind the title command and top cheat menu button', () => {
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

  it('hides the top cheat menu button when admin operations disable it', () => {
    saveAdminConfig({
      operations: {
        cheatMenuButtonVisible: false,
      },
    })

    const { container, cleanup } = renderTitleScreen()

    expect(container.textContent).not.toContain('移섑듃')

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

  it('starts Google login from the start button when Google is signed out', async () => {
    const googleUser = { uid: 'uid-login', displayName: 'Login Tester', email: 'login@example.com', photoURL: '' }
    const signInWithGoogle = vi.fn(async () => googleUser)
    useAuthStore.setState({
      status: 'signedOut',
      user: null,
      initialized: true,
      signInWithGoogle,
    })
    localStorage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify({ local: 'Local Player' }))
    const onStart = vi.fn()
    const { container, cleanup } = renderTitleScreen(onStart)

    await clickButtonAtAsync(container, 3)

    expect(signInWithGoogle).toHaveBeenCalledTimes(1)
    expect(onStart).not.toHaveBeenCalled()
    expect(container.querySelector('#title-nickname-input')).not.toBeNull()
    expect(JSON.parse(localStorage.getItem(NICKNAME_STORAGE_KEY))).toEqual({ local: 'Local Player' })

    cleanup()
  })

  it('skips nickname modal and starts immediately when nickname already saved', () => {
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'uid-2', displayName: 'Returner', email: 'r@example.com', photoURL: '' },
      initialized: true,
    })
    localStorage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify({ 'uid-2': '재방문자' }))

    const onStart = vi.fn()
    const { container, cleanup } = renderTitleScreen(onStart)

    clickButtonByText(container, '게임 시작')

    expect(onStart).toHaveBeenCalledWith('stage1')
    expect(container.textContent).not.toContain('닉네임 설정')

    cleanup()
  })

  it('allows changing nickname from settings without starting the game', () => {
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'uid-3', displayName: 'Changer', email: 'c@example.com', photoURL: '' },
      initialized: true,
    })
    localStorage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify({ 'uid-3': '기존닉네임' }))

    const onStart = vi.fn()
    const { container, cleanup } = renderTitleScreen(onStart)

    // 설정 열기
    act(() => {
      container.querySelector('[aria-label="설정 열기"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.textContent).toContain('기존닉네임')

    // 닉네임 버튼 클릭
    clickButtonByText(container, '기존닉네임')

    expect(container.textContent).toContain('닉네임 변경')

    // 새 닉네임 입력 후 저장
    setInputValue(container.querySelector('[aria-label="유저 닉네임"]'), '새닉네임')
    clickButtonByText(container, '저장')

    // 게임 시작 되면 안 됨
    expect(onStart).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem(NICKNAME_STORAGE_KEY))['uid-3']).toBe('새닉네임')

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
    const { container, cleanup } = renderTitleScreen(() => {}, () => {}, false)

    expect(container.querySelector('[aria-label="치트 메뉴 열기"]')).toBeNull()

    revealCheats()

    expect(container.textContent).toContain('치트키가 보입니다')
    expect(container.querySelector('[aria-label="치트 메뉴 열기"]')).not.toBeNull()

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
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'uid-stage-2', displayName: 'Stage Tester', email: 'stage@example.com', photoURL: '' },
      initialized: true,
    })
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

function renderTitleScreen(onStart = () => {}, onOpenRanking = () => {}, initialDevCheatsVisible = true) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  function Harness() {
    const [devCheatsVisible, setDevCheatsVisible] = React.useState(initialDevCheatsVisible)
    return (
      <TitleScreen
        onStart={onStart}
        onOpenRanking={onOpenRanking}
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
  act(() => {
    container.querySelector('[aria-label="치트 메뉴 열기"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
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
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes(text))
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function clickButtonAtAsync(container, index) {
  await act(async () => {
    container.querySelectorAll('button')[index]
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function clickButtonAt(container, index) {
  act(() => {
    container.querySelectorAll('button')[index]
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
