// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authState: {
    status: 'signedOut',
    user: null,
    error: null,
    signingIn: false,
    progressStatus: 'idle',
    progressError: null,
    initializeAuth: vi.fn(),
  },
  progressHydrated: false,
  readyGameModuleLoaded: vi.fn(),
  studioHydrate: vi.fn(),
}))

vi.mock('./store/useAuthStore.js', () => {
  const useAuthStore = (selector) => selector(mocks.authState)
  useAuthStore.getState = () => mocks.authState
  return { useAuthStore }
})

vi.mock('./lib/firebaseProgress.js', () => ({
  installPlayerStorageFatalGuard: vi.fn(),
  isFirebaseProgressHydrated: vi.fn(() => mocks.progressHydrated),
}))

vi.mock('./lib/firebaseStudio.js', () => ({
  hydrateFirebaseStudio: mocks.studioHydrate,
  setFirebaseStudioUser: vi.fn(),
}))

vi.mock('./lib/studioRuntimeState.js', () => ({
  isFirebaseStudioRuntimeReady: vi.fn(() => false),
}))

vi.mock('./components/GoogleAccountPanel.jsx', () => ({
  default: () => <button type="button">Google 로그인</button>,
}))

vi.mock('./components/ReadyGameApp.jsx', () => {
  mocks.readyGameModuleLoaded()
  return {
    default: () => <main data-testid="ready-game-app">게임 준비 완료</main>,
  }
})

const { default: App } = await import('./App.jsx')

async function renderApp() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<App />)
    await Promise.resolve()
  })
  return {
    container,
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

describe('App Firebase bootstrap boundary', () => {
  beforeEach(() => {
    mocks.authState.status = 'signedOut'
    mocks.authState.user = null
    mocks.authState.progressStatus = 'idle'
    mocks.authState.progressError = null
    mocks.progressHydrated = false
    mocks.readyGameModuleLoaded.mockClear()
    mocks.studioHydrate.mockReset().mockResolvedValue({ status: 'remote-applied', revision: 1 })
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the existing Google login UI without loading game state while signed out', async () => {
    const view = await renderApp()

    expect(view.container.textContent).toContain('Google 로그인')
    expect(view.container.textContent).toContain('Firebase 계정 데이터를 불러옵니다')
    expect(view.container.firstElementChild).not.toBe(null)
    expect(mocks.readyGameModuleLoaded).not.toHaveBeenCalled()
    view.unmount()
  })

  it('renders an explicit loading surface instead of an empty root before remote hydrate', async () => {
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'firebase-user' }
    mocks.authState.progressStatus = 'loading'

    const view = await renderApp()

    expect(view.container.textContent).toContain('Firebase 계정 데이터를 불러오는 중')
    expect(view.container.firstElementChild).not.toBe(null)
    expect(mocks.readyGameModuleLoaded).not.toHaveBeenCalled()
    view.unmount()
  })

  it('fails closed with an alertdialog when the remote progress read fails', async () => {
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'firebase-user' }
    mocks.authState.progressStatus = 'error'
    mocks.authState.progressError = 'permission denied'

    const view = await renderApp()
    const dialog = view.container.querySelector('[role="alertdialog"]')

    expect(dialog).not.toBe(null)
    expect(dialog.textContent).toContain('Firebase 계정 데이터 연결 오류')
    expect(dialog.textContent).toContain('로컬 데이터로 대체하지 않습니다')
    expect(dialog.textContent).toContain('permission denied')
    expect(mocks.readyGameModuleLoaded).not.toHaveBeenCalled()
    view.unmount()
  })

  it('loads the game runtime only after the signed-in Firebase snapshot is hydrated', async () => {
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'firebase-user' }
    mocks.authState.progressStatus = 'ready'
    mocks.progressHydrated = true

    const view = await renderApp()

    expect(view.container.querySelector('[data-testid="ready-game-app"]')).not.toBe(null)
    expect(mocks.readyGameModuleLoaded).toHaveBeenCalledOnce()
    view.unmount()
  })
})
