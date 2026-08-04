// @vitest-environment jsdom
// 설정의 언어 선택이 실제로 화면 문구를 바꾸는지 확인한다.
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LobbySettingsModal from './LobbySettingsModal.jsx'
import TitleScreen from './TitleScreen.jsx'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useLocaleStore } from '../lib/i18n.js'
import { loadTitleSettings } from '../lib/titleSettings.js'

vi.mock('../lib/accountDeletion.js', () => ({
  deleteAccountAndData: vi.fn(async () => ({ ok: true })),
  reauthenticateForDeletion: vi.fn(async () => true),
}))
vi.mock('./TitleSceneCanvas.jsx', () => ({ default: () => null }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('language setting', () => {
  beforeEach(() => {
    _seedHydratedFirebaseProgressForTests()
    useLocaleStore.setState({ locale: 'ko' })
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'lang-user', displayName: 'Lang Tester' },
      signOutOfGoogle: vi.fn(async () => {}),
    })
  })

  afterEach(() => {
    useLocaleStore.setState({ locale: 'ko' })
  })

  it('renders a language row with the three locales and retranslates the modal on tap', async () => {
    const view = render(<LobbySettingsModal onClose={() => {}} />)

    expect(view.container.textContent).toContain('설정')
    expect(view.container.textContent).toContain('언어')

    await clickButtonByText(view.container, 'English')
    expect(view.container.textContent).toContain('Settings')
    expect(view.container.textContent).toContain('Delete account')
    expect(view.container.textContent).not.toContain('계정 삭제')
    expect(loadTitleSettings().language).toBe('en')

    await clickButtonByText(view.container, '日本語')
    expect(view.container.textContent).toContain('設定')
    expect(view.container.textContent).toContain('アカウント削除')
    expect(loadTitleSettings().language).toBe('ja')

    await clickButtonByText(view.container, '한국어')
    expect(view.container.textContent).toContain('계정 삭제')

    view.unmount()
  })

  it('renders the title screen copy and logo lettering in the selected language', async () => {
    const koView = render(<TitleScreen onEnterLobby={() => {}} />)
    expect(koView.container.textContent).toContain('게임 시작')
    expect(titleChars(koView.container)).toBe('탈출!좀비학교')
    koView.unmount()

    await act(async () => { useLocaleStore.getState().setLocale('en') })
    const enView = render(<TitleScreen onEnterLobby={() => {}} />)
    expect(enView.container.textContent).toContain('START GAME')
    expect(titleChars(enView.container)).toBe('ESCAPE!ZOMBIE SCHOOL')
    enView.unmount()

    await act(async () => { useLocaleStore.getState().setLocale('ja') })
    const jaView = render(<TitleScreen onEnterLobby={() => {}} />)
    expect(jaView.container.textContent).toContain('ゲーム開始')
    expect(titleChars(jaView.container)).toBe('脱出！ゾンビ学校')
    jaView.unmount()
  })
})

function titleChars(container) {
  return Array.from(container.querySelectorAll('[data-title-char]'))
    .map((node) => node.getAttribute('data-title-char'))
    .join('')
}

function render(element) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => { root.render(element) })
  return {
    container,
    unmount() {
      act(() => { root.unmount() })
      container.remove()
    },
  }
}

async function clickButtonByText(container, text) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent.trim() === text)
  if (!button) throw new Error(`Missing button: ${text}`)
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}
