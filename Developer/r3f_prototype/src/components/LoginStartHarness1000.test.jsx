// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TitleScreen from './TitleScreen.jsx'
import { useAuthStore, _resetAuthStoreForTests } from '../store/useAuthStore.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="mock-canvas">{children}</div>,
}))

vi.mock('./TitleScene3D.jsx', () => ({
  default: () => <div data-testid="mock-title-scene" />,
}))

beforeEach(() => {
  vi.stubGlobal('Audio', vi.fn(function AudioMock() {
    return {
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      src: '',
    }
  }))
  window.sessionStorage.clear()
})

afterEach(() => {
  _resetAuthStoreForTests()
  window.sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe('게임 시작 Google 로그인 강제 하네스', () => {
  it('1,000회 모두 Google 로그인 후 Studio Firebase 실패와 무관하게 로비에 진입한다', async () => {
    const googleUser = { uid: 'uid-login-stress', displayName: 'Login Stress', email: 'stress@example.com', photoURL: '' }
    const signInWithGoogle = vi.fn(async () => googleUser)
    useAuthStore.setState({
      status: 'signedOut',
      user: null,
      initialized: true,
      signInWithGoogle,
    })
    const onEnterLobby = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <TitleScreen
          onEnterLobby={onEnterLobby}
          devCheatsVisible={false}
          onRevealDevCheats={() => {}}
          onUnlockAllStages={() => {}}
        />,
      )
    })

    const start = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.includes('게임 시작'))

    for (let iteration = 0; iteration < 1000; iteration += 1) {
      await act(async () => {
        start.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await Promise.resolve()
        await Promise.resolve()
      })
    }

    expect(signInWithGoogle).toHaveBeenCalledTimes(1000)
    expect(onEnterLobby).toHaveBeenCalledTimes(1000)
    expect(window.sessionStorage.getItem('eszs:pending-start-after-google-login')).toBeNull()

    act(() => root.unmount())
    container.remove()
  }, 120_000)
})
