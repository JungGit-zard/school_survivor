// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import TitleScreen from './TitleScreen.jsx'
import source from './TitleScreen.jsx?raw'
import { ZOMBIE_BOARD_COPY } from './zombieBoardCopy.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const state = vi.hoisted(() => ({ locale: 'ko' }))
vi.mock('../lib/i18n.js', () => ({ useLocale: () => state.locale, useT: () => (key) => key, t: (key) => key }))
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: (selector) => selector({ user: null }) }))
vi.mock('./GoogleAccountPanel.jsx', () => ({ default: () => <div className="google-account-panel" /> }))
vi.mock('./TitleSceneCanvas.jsx', () => ({ default: () => <div data-testid="original-title-scene" /> }))
vi.mock('howler', () => ({ Howl: vi.fn(function () { return { load: vi.fn(), play: () => 1, pause: vi.fn(), unload: vi.fn() } }) }))
vi.mock('../lib/firebaseProgress.js', () => ({ isFirebaseProgressHydrated: () => false, requestCloudProgressSave: vi.fn() }))
vi.mock('../lib/adminConfig.js', () => ({ getAdminOperationsConfig: () => ({ cheatMenuButtonVisible: true }) }))
let root, container
afterEach(() => { if (root) act(() => root.unmount()); root = null; container?.remove(); state.locale = 'ko' })

it('adds a six-language safe-area top-right 44px contact link without changing original controls or graphics', () => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  for (const [locale, copy] of Object.entries(ZOMBIE_BOARD_COPY)) {
    state.locale = locale
    act(() => root.render(<TitleScreen />))
    // 문의하기는 홈페이지 문의(글쓰기) 입력란 포커스 진입점으로 간다 — 게임 언어를 그대로 넘긴다.
    const contact = container.querySelector(`a[href="/landing?lang=${locale}#inquiry"]`)
    expect(contact?.textContent).toBe(copy.contact)
    expect(contact.style.position).toBe('absolute')
    expect(contact.style.minHeight).toBe('44px')
    // jsdom discards env()/max() inline values; inspect their authored CSS contract.
    expect(source).toContain("right: 'max(12px, calc(env(safe-area-inset-right, 0px) + 8px))'")
    expect(source).toContain("top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 8px))'")
    expect(contact.style.width).toBe('72px')
    expect(container.querySelector('.google-account-panel')).not.toBeNull()
    expect(container.querySelector('[data-testid="original-title-scene"]')).not.toBeNull()
    expect(container.querySelector('a[href="/landing"]')).not.toBeNull()
    // 로자리의 방은 로그인 전용 진입점이다 — 이 테스트의 auth 목은 게스트이므로 없어야 한다.
    expect([...container.querySelectorAll('button')].some((b) => b.textContent === '로자리의 방')).toBe(false)
  }
  act(() => root.render(<TitleScreen devCheatsVisible />))
  expect(source).toContain("cheatMenuButtonVisible ? { top: 'max(66px, calc(env(safe-area-inset-top, 0px) + 60px))' }")
})
