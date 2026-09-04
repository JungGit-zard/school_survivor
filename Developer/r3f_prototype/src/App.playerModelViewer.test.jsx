// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authState: {
    status: 'signedOut',
    user: null,
    progressStatus: 'idle',
    initializeAuth: vi.fn(),
  },
  canonicalHydrate: vi.fn(() => Promise.resolve({ status: 'remote-applied', revision: 1 })),
  inspectionSubscribe: vi.fn(),
  playerStorageGuard: vi.fn(),
  readyGameModuleLoaded: vi.fn(),
}))

vi.mock('./store/useAuthStore.js', () => {
  const useAuthStore = (selector) => selector(mocks.authState)
  return { useAuthStore }
})

vi.mock('./lib/firebaseProgress.js', () => ({
  installPlayerStorageFatalGuard: mocks.playerStorageGuard,
}))

vi.mock('./lib/firebaseStudio.js', () => ({
  applyFirebaseStudioDatasets: vi.fn(),
  hydrateFirebaseStudio: vi.fn(),
  initializeFirebaseStudioIfMissing: vi.fn(),
  hydrateCanonicalTitlePlayer: mocks.canonicalHydrate,
  setFirebaseStudioUser: vi.fn(),
  subscribeFirebaseStudio: vi.fn(),
}))

vi.mock('./lib/studioRuntimeState.js', () => ({
  isFirebaseStudioRuntimeReady: vi.fn(() => false),
}))

vi.mock('./lib/firebaseInspectionMode.js', () => ({
  subscribeInspectionMode: mocks.inspectionSubscribe,
  getInspectionPhase: () => 'inactive',
}))

vi.mock('./components/ReadyGameApp.jsx', () => {
  mocks.readyGameModuleLoaded()
  return { default: () => <main data-testid="ready-game-app">game</main> }
})

vi.mock('./components/PlayerModelViewer.jsx', () => ({
  default: () => <main data-testid="player-model-viewer">viewer</main>,
}))

vi.mock('./components/GraphicsStudio.jsx', () => ({
  default: () => <main data-testid="graphics-studio">studio</main>,
}))

vi.mock('./components/AdminPage.jsx', () => ({
  default: () => <main data-testid="admin-page">admin</main>,
}))

vi.mock('./components/InspectionModeScreen.jsx', () => ({
  default: () => <main data-testid="inspection-mode-screen">inspection</main>,
}))

vi.mock('./components/GoogleAccountPanel.jsx', () => ({
  default: () => <button type="button">Google login</button>,
}))

window.history.replaceState({}, '', '/player-model-viewer')
const { default: App } = await import('./App.jsx')
const viewerRouteImportStorageGuardCalls = mocks.playerStorageGuard.mock.calls.length

async function renderAppAt(pathname) {
  window.history.replaceState({}, '', pathname)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<App />)
    await Promise.resolve()
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

describe('public local player model viewer route', () => {
  beforeEach(() => {
    mocks.authState.initializeAuth.mockClear()
    mocks.canonicalHydrate.mockClear()
    mocks.inspectionSubscribe.mockClear()
    mocks.readyGameModuleLoaded.mockClear()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    window.history.replaceState({}, '', '/')
  })

  it('does not install player localStorage guard while importing the public viewer route', () => {
    expect(viewerRouteImportStorageGuardCalls).toBe(0)
  })

  it('renders /player-model-viewer without starting game auth, Firebase canonical hydrate, or inspection hooks', async () => {
    const view = await renderAppAt('/player-model-viewer')

    expect(view.container.querySelector('[data-testid="player-model-viewer"]')).not.toBe(null)
    expect(view.container.querySelector('[data-testid="ready-game-app"]')).toBe(null)
    expect(mocks.authState.initializeAuth).not.toHaveBeenCalled()
    expect(mocks.canonicalHydrate).not.toHaveBeenCalled()
    expect(mocks.inspectionSubscribe).not.toHaveBeenCalled()
    expect(mocks.readyGameModuleLoaded).not.toHaveBeenCalled()
    view.unmount()
  })
})
