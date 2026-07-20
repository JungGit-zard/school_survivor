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
  studioSubscribe: vi.fn(),
  canonicalHydrate: vi.fn(() => Promise.resolve({ status: 'missing-remote' })),
  canonicalPublish: vi.fn(() => Promise.resolve({ status: 'forbidden' })),
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
  hydrateCanonicalTitlePlayer: mocks.canonicalHydrate,
  publishCanonicalTitlePlayer: mocks.canonicalPublish,
  setFirebaseStudioUser: vi.fn(),
  subscribeFirebaseStudio: mocks.studioSubscribe,
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

vi.mock('./components/AdminPage.jsx', () => ({
  default: () => <main data-testid="admin-page">최고관리자 도구</main>,
}))

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
    mocks.studioSubscribe.mockReset().mockResolvedValue({
      status: 'subscribed',
      unsubscribe: vi.fn(),
    })
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the original title runtime while signed out instead of forcing a second login bootstrap', async () => {
    const view = await renderApp()

    expect(view.container.querySelector('[data-testid="ready-game-app"]')).not.toBe(null)
    view.unmount()
  })

  it('keeps the title runtime mounted while signed-in Firebase progress is loading', async () => {
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'firebase-user' }
    mocks.authState.progressStatus = 'loading'

    const view = await renderApp()

    expect(view.container.querySelector('[data-testid="ready-game-app"]')).not.toBe(null)
    view.unmount()
  })

  it('keeps the title runtime mounted when the signed-in Firebase progress read fails', async () => {
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'firebase-user' }
    mocks.authState.progressStatus = 'error'
    mocks.authState.progressError = 'permission denied'

    const view = await renderApp()

    expect(view.container.querySelector('[data-testid="ready-game-app"]')).not.toBe(null)
    view.unmount()
  })

  it.each(['checking', 'error', 'unconfigured'])(
    'mounts the title runtime even when auth status is %s',
    async (status) => {
      mocks.authState.status = status

      const view = await renderApp()

      expect(view.container.querySelector('[data-testid="ready-game-app"]')).not.toBe(null)
      view.unmount()
    },
  )

  it('keeps the title runtime mounted after the signed-in Firebase snapshot is hydrated', async () => {
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'firebase-user' }
    mocks.authState.progressStatus = 'ready'
    mocks.progressHydrated = true

    const view = await renderApp()

    expect(view.container.querySelector('[data-testid="ready-game-app"]')).not.toBe(null)
    view.unmount()
  })

  it('uses the same Google login panel for a signed-out admin route without requiring player progress', async () => {
    window.history.replaceState({}, '', '/admin')
    const view = await renderApp()

    expect(view.container.textContent).toContain('Google 로그인')
    expect(view.container.textContent).toContain('관리 도구는 기존 Google 로그인으로만 접근할 수 있습니다')
    expect(mocks.readyGameModuleLoaded).not.toHaveBeenCalled()
    view.unmount()
  })

  it('explicitly denies a signed-in non-master on the admin route', async () => {
    window.history.replaceState({}, '', '/admin')
    mocks.authState.status = 'signedIn'
    mocks.authState.user = {
      uid: 'ordinary-user',
      email: 'ordinary@example.com',
      emailVerified: true,
      providerIds: ['google.com'],
    }
    const view = await renderApp()

    expect(view.container.querySelector('[role="alertdialog"]')?.textContent).toContain('최고관리자 권한이 없습니다')
    view.unmount()
  })

  it('renders admin for the verified exact Google master without waiting for player progress', async () => {
    window.history.replaceState({}, '', '/admin')
    mocks.authState.status = 'signedIn'
    mocks.authState.user = {
      uid: 'master-user',
      email: 'zard5388@gmail.com',
      emailVerified: true,
      providerIds: ['google.com'],
    }
    mocks.authState.progressStatus = 'loading'
    const view = await renderApp()

    await vi.waitFor(() => expect(view.container.querySelector('[data-testid="admin-page"]')).not.toBe(null))
    view.unmount()
  })
})
