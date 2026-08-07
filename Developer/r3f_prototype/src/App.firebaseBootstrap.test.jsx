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
  studioInitialize: vi.fn(),
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
  initializeFirebaseStudioIfMissing: mocks.studioInitialize,
  hydrateCanonicalTitlePlayer: mocks.canonicalHydrate,
  publishCanonicalTitlePlayer: mocks.canonicalPublish,
  setFirebaseStudioUser: vi.fn(),
  subscribeFirebaseStudio: mocks.studioSubscribe,
}))

vi.mock('./lib/studioRuntimeState.js', () => ({
  isFirebaseStudioRuntimeReady: vi.fn(() => mocks.studioRuntimeReady),
}))

vi.mock('./components/GraphicsStudio.jsx', () => ({
  default: () => <main data-testid="graphics-studio">洹몃옒???ㅽ뒠?붿삤</main>,
}))

vi.mock('./components/GoogleAccountPanel.jsx', () => ({
  default: () => <button type="button">Google login</button>,
}))

vi.mock('./components/ReadyGameApp.jsx', () => {
  mocks.readyGameModuleLoaded()
  return {
    default: (props) => {
      mocks.readyGameProps = props
      return <main data-testid="ready-game-app">寃뚯엫 以鍮??꾨즺</main>
    },
  }
})

vi.mock('./components/AdminPage.jsx', () => ({
  default: () => <main data-testid="admin-page">???꾧뎄</main>,
}))

const { default: App, handleStudioGameSyncMessage } = await import('./App.jsx')
const { STUDIO_GAME_SYNC_MESSAGE } = await import('./lib/studioGameBridge.js')

// ?ㅽ뒠?붿삤 寃뚯씠?몃? ?듦낵?????덈뒗 ?좎씪???뺥깭??怨꾩젙 ??projectAdmin.isProjectMaster 湲곗?.
const MASTER_USER = Object.freeze({
  uid: 'master',
  email: 'zard5388@gmail.com',
  emailVerified: true,
  providerIds: ['google.com'],
})

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
    mocks.studioInitialize.mockReset().mockResolvedValue({ status: 'already-exists' })
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

  it('keeps an authenticated ordinary user in the game runtime through 1,000 Studio Firebase failures', async () => {
    const ordinaryUser = {
      uid: 'ordinary-studio-failure-stress',
      email: 'ordinary@example.com',
      emailVerified: true,
      providerIds: ['google.com'],
    }
    mocks.authState.status = 'signedIn'
    mocks.authState.user = ordinaryUser
    mocks.authState.progressStatus = 'ready'
    mocks.studioHydrate.mockResolvedValue({ status: 'read-failed' })
    mocks.canonicalHydrate.mockResolvedValue({ status: 'read-failed' })

    const view = await renderApp()
    expect(view.container.querySelector('[data-testid="ready-game-app"]')).not.toBe(null)

    await vi.waitFor(() => expect(mocks.studioHydrate).toHaveBeenCalledWith({ user: ordinaryUser }))
    expect(mocks.readyGameProps).not.toHaveProperty('ensureStudioCloudReady')
    expect(view.container.querySelector('[data-testid="graphics-studio"]')).toBe(null)
    view.unmount()
  }, 120_000)

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
    expect(mocks.readyGameProps).not.toHaveProperty('ensureStudioCloudReady')
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
    expect(mocks.readyGameProps).not.toHaveProperty('ensureStudioCloudReady')
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

    expect(view.container.textContent).toContain('Google')
    expect(view.container.textContent).toContain('Google login')
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

    expect(view.container.querySelector('[role="alertdialog"]')?.textContent).toContain('신 권한이 없습니다')
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
    // 濡쒓렇????공개 정본 ?섏씠?쒕젅?댄듃媛 ?깃났???고??꾩씠 ready媛 ???곹깭瑜?紐⑥궗.
    mocks.canonicalHydrate.mockResolvedValue({ status: 'remote-applied', revision: 1 })
    mocks.studioRuntimeReady = true

    const view = await renderApp()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    // ?몄쭛湲?GraphicsStudio) ???Google 濡쒓렇??遺?몄뒪?몃옪???좎빞 ?쒕떎 ??誘몃줈洹몄씤 Apply ?ㅽ뙣 諛⑹?.
    expect(view.container.querySelector('[data-testid="graphics-studio"]')).toBe(null)
    expect(view.container.textContent).toContain('Google')
    view.unmount()
  })

  it('initializes an empty canonical workspace for the master and then enters Studio', async () => {
    window.history.replaceState({}, '', '/graphics-studio')
    mocks.authState.status = 'signedIn'
    mocks.authState.user = MASTER_USER
    mocks.studioHydrate
      .mockResolvedValueOnce({ status: 'missing-remote' })
      .mockImplementationOnce(async () => { mocks.studioRuntimeReady = true; return { status: 'remote-applied', revision: 1 } })
    mocks.studioInitialize.mockResolvedValue({ status: 'created', revision: 1 })

    const view = await renderApp()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(mocks.studioInitialize).toHaveBeenCalledWith({ user: MASTER_USER })
    expect(mocks.studioHydrate).toHaveBeenCalledTimes(2)
    expect(view.container.querySelector('[data-testid="graphics-studio"]')).not.toBe(null)
    view.unmount()
  })

  it('shuts the window on a signed-in non-master and never reads the studio workspace', async () => {
    window.history.replaceState({}, '', '/graphics-studio')
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'someone-else', email: 'intruder@example.com', emailVerified: true, providerIds: ['google.com'] }
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})

    const view = await renderApp()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(close).toHaveBeenCalled()
    // close媛 留됲엳??釉뚮씪?곗??먯꽌??Studio쨌遺?몄뒪?몃옪쨌?곗씠?곕? ?뚮뜑?섏? ?딅뒗??
    expect(view.container.querySelector('[data-testid="graphics-studio"]')).toBe(null)
    expect(view.container.textContent).toBe('')
    expect(mocks.studioHydrate).not.toHaveBeenCalled()
    expect(mocks.studioSubscribe).not.toHaveBeenCalled()
    close.mockRestore()
    view.unmount()
  })

  it('recovers the graphics studio route from a transient hydrate failure without a page reload', async () => {
    window.history.replaceState({}, '', '/graphics-studio')
    mocks.authState.status = 'signedIn'
    mocks.authState.user = MASTER_USER
    mocks.studioHydrate.mockResolvedValueOnce({ status: 'read-failed' })

    const view = await renderApp()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(view.container.querySelector('[data-testid="graphics-studio"]')).toBe(null)

    const retry = [...view.container.querySelectorAll('button')]
      .find((button) => button.textContent === '다시 시도')
    expect(retry).toBeTruthy()

    mocks.studioHydrate.mockResolvedValue({ status: 'remote-applied', revision: 2 })
    mocks.studioRuntimeReady = true
    await act(async () => {
      retry.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(mocks.studioHydrate).toHaveBeenCalledTimes(2)
    expect(view.container.querySelector('[data-testid="graphics-studio"]')).not.toBe(null)
    view.unmount()
  })

  it('blocks the E2E user from the graphics studio without any Firebase Studio read, subscribe, or publish', async () => {
    window.history.replaceState({}, '', '/graphics-studio?e2e=1&studio=1')
    mocks.authState.status = 'signedIn'
    mocks.authState.user = { uid: 'e2e-local-test' }
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})

    const view = await renderApp()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(view.container.querySelector('[data-testid="graphics-studio"]')).toBe(null)
    expect(mocks.studioHydrate).not.toHaveBeenCalled()
    expect(mocks.canonicalHydrate).not.toHaveBeenCalled()
    expect(mocks.studioSubscribe).not.toHaveBeenCalled()
    expect(mocks.canonicalPublish).not.toHaveBeenCalled()
    view.unmount()
    close.mockRestore()
  })

  it('refreshes a signed-out game from the canonical Studio path', async () => {
    mocks.authState.user = null
    mocks.canonicalHydrate.mockResolvedValue({ status: 'remote-applied', revision: 8 })

    await expect(handleStudioGameSyncMessage({
      data: { type: STUDIO_GAME_SYNC_MESSAGE },
      origin: 'http://localhost:5173',
      source: null,
    })).resolves.toBe(true)

    expect(mocks.canonicalHydrate).toHaveBeenCalledWith({})
    expect(mocks.studioHydrate).not.toHaveBeenCalled()
  })
})


