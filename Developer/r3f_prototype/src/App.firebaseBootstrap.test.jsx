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
  readyGameProps: null,
  studioHydrate: vi.fn(),
  studioSubscribe: vi.fn(),
  canonicalHydrate: vi.fn(() => Promise.resolve({ status: 'missing-remote' })),
  canonicalPublish: vi.fn(() => Promise.resolve({ status: 'forbidden' })),
  studioRuntimeReady: false,
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
  isFirebaseStudioRuntimeReady: vi.fn(() => mocks.studioRuntimeReady),
}))

vi.mock('./components/GraphicsStudio.jsx', () => ({
  default: () => <main data-testid="graphics-studio">그래픽 스튜디오</main>,
}))

vi.mock('./components/GoogleAccountPanel.jsx', () => ({
  default: () => <button type="button">Google 로그인</button>,
}))

vi.mock('./components/ReadyGameApp.jsx', () => {
  mocks.readyGameModuleLoaded()
  return {
    default: (props) => {
      mocks.readyGameProps = props
      return <main data-testid="ready-game-app">게임 준비 완료</main>
    },
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
    mocks.readyGameProps = null
    mocks.readyGameModuleLoaded.mockClear()
    mocks.studioHydrate.mockReset().mockResolvedValue({ status: 'remote-applied', revision: 1 })
    mocks.studioSubscribe.mockReset().mockResolvedValue({
      status: 'subscribed',
      unsubscribe: vi.fn(),
    })
    mocks.canonicalHydrate.mockReset().mockResolvedValue({ status: 'missing-remote' })
    mocks.canonicalPublish.mockReset().mockResolvedValue({ status: 'forbidden' })
    mocks.studioRuntimeReady = false
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

  it('falls back to the public canonical Studio revision for a signed-in player without a personal graphics workspace', async () => {
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'new-player' }
    mocks.studioHydrate.mockResolvedValue({ status: 'missing-remote' })
    mocks.canonicalHydrate.mockResolvedValue({ status: 'remote-applied', revision: 11 })

    const view = await renderApp()

    await vi.waitFor(() => expect(mocks.canonicalHydrate).toHaveBeenCalled())
    expect(await mocks.readyGameProps.ensureStudioCloudReady(mocks.authState.user)).toBe(true)
    expect(mocks.studioSubscribe).not.toHaveBeenCalled()
    view.unmount()
  })

  it('hydrates a signed-in player personal Studio workspace even when canonical visuals were preloaded', async () => {
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'studio-user' }
    mocks.studioRuntimeReady = true
    mocks.canonicalHydrate.mockResolvedValue({ status: 'remote-applied', revision: 11 })
    mocks.studioHydrate.mockResolvedValue({ status: 'remote-applied', revision: 22 })

    const view = await renderApp()

    await vi.waitFor(() => expect(mocks.studioHydrate).toHaveBeenCalledWith({ user: mocks.authState.user }))
    expect(await mocks.readyGameProps.ensureStudioCloudReady(mocks.authState.user)).toBe(true)
    await vi.waitFor(() => expect(mocks.studioSubscribe).toHaveBeenCalledWith(expect.objectContaining({ user: mocks.authState.user })))
    view.unmount()
  })

  it('hydrates only the public canonical Studio revision for the DEV E2E user', async () => {
    window.history.replaceState({}, '', '/?e2e=1')
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'e2e-local-test' }
    mocks.canonicalHydrate.mockResolvedValue({ status: 'remote-applied', revision: 7 })

    const view = await renderApp()

    await vi.waitFor(() => expect(mocks.canonicalHydrate).toHaveBeenCalledTimes(1))
    expect(mocks.studioHydrate).not.toHaveBeenCalled()
    expect(mocks.studioSubscribe).not.toHaveBeenCalled()
    expect(mocks.canonicalPublish).not.toHaveBeenCalled()
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

  it('keeps the graphics studio route behind Google login even when canonical tuning makes studioReady true (no unauthenticated Apply)', async () => {
    window.history.replaceState({}, '', '/graphics-studio')
    mocks.authState.status = 'signedOut'
    mocks.authState.user = null
    // 로그인 전 canonicalTitlePlayer 하이드레이트가 성공해 런타임이 ready가 된 상태를 모사.
    mocks.canonicalHydrate.mockResolvedValue({ status: 'remote-applied', revision: 1 })
    mocks.studioRuntimeReady = true

    const view = await renderApp()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    // 편집기(GraphicsStudio) 대신 Google 로그인 부트스트랩이 떠야 한다 — 미로그인 Apply 실패 방지.
    expect(view.container.querySelector('[data-testid="graphics-studio"]')).toBe(null)
    expect(view.container.textContent).toContain('Google 로그인')
    view.unmount()
  })

  it('keeps the graphics studio route blocked when the signed-in account has no personal graphics workspace', async () => {
    window.history.replaceState({}, '', '/graphics-studio')
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'new-player' }
    mocks.studioHydrate.mockResolvedValue({ status: 'missing-remote' })
    mocks.canonicalHydrate.mockResolvedValue({ status: 'remote-applied', revision: 11 })

    const view = await renderApp()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(view.container.querySelector('[data-testid="graphics-studio"]')).toBe(null)
    expect(view.container.textContent).toContain('Firebase Studio 데이터를 불러오지 못했습니다')
    expect(mocks.canonicalHydrate).not.toHaveBeenCalled()
    view.unmount()
  })

  it('blocks the E2E user from the graphics studio without any Firebase Studio read, subscribe, or publish', async () => {
    window.history.replaceState({}, '', '/graphics-studio?e2e=1')
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'e2e-local-test' }

    const view = await renderApp()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(view.container.querySelector('[data-testid="graphics-studio"]')).toBe(null)
    expect(mocks.studioHydrate).not.toHaveBeenCalled()
    expect(mocks.canonicalHydrate).not.toHaveBeenCalled()
    expect(mocks.studioSubscribe).not.toHaveBeenCalled()
    expect(mocks.canonicalPublish).not.toHaveBeenCalled()
    view.unmount()
  })
})
