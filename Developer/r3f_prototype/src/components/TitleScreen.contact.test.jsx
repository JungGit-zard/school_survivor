// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import TitleScreen from './TitleScreen.jsx'
import source from './TitleScreen.jsx?raw'
import { ZOMBIE_BOARD_COPY } from './zombieBoardCopy.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const state = vi.hoisted(() => ({ locale: 'ko' }))
vi.mock('../lib/i18n.js', () => ({ useLocale: () => state.locale, useT: () => (key) => key, t: (key) => key, LOCALE_OPTIONS: [{ id: 'ko', label: '한국어' }, { id: 'en', label: 'English' }, { id: 'ja', label: '日本語' }] }))
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: (selector) => selector({ user: null }) }))
vi.mock('./GoogleAccountPanel.jsx', () => ({ default: () => <div className="google-account-panel" /> }))
vi.mock('./TitleSceneCanvas.jsx', () => ({ default: () => <div data-testid="original-title-scene" /> }))
vi.mock('howler', () => ({ Howl: vi.fn(function () { return { load: vi.fn(), play: () => 1, pause: vi.fn(), unload: vi.fn() } }) }))
vi.mock('../lib/firebaseProgress.js', () => ({ isFirebaseProgressHydrated: () => false, requestCloudProgressSave: vi.fn() }))
vi.mock('../lib/adminConfig.js', () => ({ getAdminOperationsConfig: () => ({ cheatMenuButtonVisible: true }) }))
let root, container
afterEach(() => { if (root) act(() => root.unmount()); root = null; container?.remove(); state.locale = 'ko' })

// 2026-11-08 타이틀 정리 1단계: 문의하기·홈페이지는 첫 화면에서 빠져 ≡ 시트 안의 52px 행으로 간다.
it('moves contact and homepage off the first screen into the ≡ sheet, in all six board languages', () => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  for (const [locale, copy] of Object.entries(ZOMBIE_BOARD_COPY)) {
    state.locale = locale
    act(() => root.render(<TitleScreen />))
    expect(container.querySelector('a[href*="/landing"]')).toBeNull()
    expect(container.querySelector('a[data-title-homepage]')).toBeNull()
    expect(container.querySelector('.google-account-panel')).not.toBeNull()
    expect(container.querySelector('[data-testid="original-title-scene"]')).not.toBeNull()

    const more = container.querySelector('[data-title-more-button]')
    expect(more.getAttribute('aria-label')).toBe('title.more')
    expect(more.style.width).toBe('44px')
    expect(more.style.height).toBe('44px')
    act(() => more.click())

    const sheet = container.querySelector('[data-title-more-sheet]')
    expect(sheet.getAttribute('role')).toBe('dialog')
    // 문의하기는 홈페이지 문의(글쓰기) 입력란 포커스 진입점으로 간다 — 게임 언어를 그대로 넘긴다.
    const contact = sheet.querySelector(`a[href="/landing?lang=${locale}#inquiry"]`)
    expect(contact?.textContent).toBe(copy.contact)
    expect(contact.style.minHeight).toBe('52px')
    expect(contact.style.fontSize).toBe('16px')
    const homepage = sheet.querySelector(`a[data-title-homepage][href="/landing?lang=${locale}"]`)
    expect(homepage?.textContent).toBe('title.homepage')
    expect(homepage.style.minHeight).toBe('52px')
    // 열리면 첫 항목에 포커스, Escape로 닫히면 포커스가 ≡로 돌아온다.
    expect(document.activeElement).toBe(homepage)
    // 게스트에게는 로그아웃 항목이 없다.
    expect(sheet.querySelector('[data-title-more-item="logout"]')).toBeNull()

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(container.querySelector('[data-title-more-sheet]')).toBeNull()
    expect(document.activeElement).toBe(more)

    // 스크림 탭으로도 닫힌다.
    act(() => more.click())
    act(() => container.querySelector('[data-title-more-layer] > button').click())
    expect(container.querySelector('[data-title-more-sheet]')).toBeNull()
    // 로자리의 방은 로그인 전용 진입점이다 — 이 테스트의 auth 목은 게스트이므로 없어야 한다.
    expect([...container.querySelectorAll('button')].some((b) => b.textContent === '로자리의 방')).toBe(false)
  }
})

it('lays the top row out as one 44px flex line with 8px gaps inside the safe area', () => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  act(() => root.render(<TitleScreen devCheatsVisible />))
  const topBar = container.querySelector('[data-title-topbar]')
  expect(topBar.style.display).toBe('flex')
  expect(topBar.style.height).toBe('44px')
  expect(topBar.style.gap).toBe('8px')
  // jsdom discards env()/max() inline values; inspect their authored CSS contract.
  expect(source).toContain("top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 8px))'")
  expect(source).toContain("right: 'max(12px, calc(env(safe-area-inset-right, 0px) + 8px))'")
  // DOM(=포커스) 순서: 로그인 → 🌐 → ≡ → START. 개발용 치트 버튼은 원래 자리(우상단)에 그대로 두고 상단 줄이 비켜 간다.
  const focusables = [...container.querySelectorAll('.google-account-panel, button[aria-haspopup], button.title-main-action')]
  const order = focusables.map((node) => (
    node.classList.contains('google-account-panel') ? 'login'
      : node.hasAttribute('data-title-more-button') ? 'more'
        : node.classList.contains('title-language-action') ? 'language'
          : node.classList.contains('title-main-action') ? 'start' : 'cheat'
  ))
  expect(order).toEqual(['login', 'language', 'more', 'cheat', 'start'])
  expect(topBar.contains(container.querySelector('[aria-label="title.cheatOpenAria"]'))).toBe(false)
  expect(source).toContain("right: 'max(72px, calc(env(safe-area-inset-right, 0px) + 68px))'")
  // 지구본은 아이콘만, 현재 언어는 접근성 이름으로 알린다.
  const globe = container.querySelector('button.title-language-action')
  expect(globe.textContent).toBe('')
  expect(globe.getAttribute('aria-label')).toBe('title.languageCurrent')
  expect(globe.style.width).toBe('44px')
  expect(globe.style.height).toBe('44px')
})
