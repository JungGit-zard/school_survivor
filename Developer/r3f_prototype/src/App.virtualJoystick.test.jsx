// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, { handleStudioGameSyncMessage } from './App.jsx'
import { loadStageBossPreview, loadStudioTunings, loadTextureDecals, saveStudioTunings } from './lib/graphicsStudioConfig.js'
import { loadSfxTunings } from './lib/sfxRegistry.js'
import { loadStagePropPlacements, resetStagePropPlacementsCache, saveStagePropPlacements } from './lib/stagePropPlacements.js'
import { commitFirebaseStudioRuntime } from './lib/studioRuntimeState.js'
import {
  _resetFirebaseProgressForTests,
  _seedHydratedFirebaseProgressForTests,
} from './lib/firebaseProgress.js'

const firebaseStudioMocks = vi.hoisted(() => ({
  hydrate: vi.fn(),
  setUser: vi.fn(),
  subscribe: vi.fn(),
}))

vi.mock('./store/useAuthStore.js', () => {
  const state = {
    status: 'signedIn',
    user: { uid: 'test-user' },
    error: null,
    signingIn: false,
    progressStatus: 'ready',
    progressError: null,
    initializeAuth: vi.fn(),
    signInWithGoogle: vi.fn(),
  }
  const useAuthStore = (selector) => selector(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})

vi.mock('./lib/firebaseStudio.js', async (importOriginal) => ({
  ...(await importOriginal()),
  hydrateFirebaseStudio: firebaseStudioMocks.hydrate,
  setFirebaseStudioUser: firebaseStudioMocks.setUser,
  subscribeFirebaseStudio: firebaseStudioMocks.subscribe,
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <canvas data-testid="mock-canvas">{children}</canvas>,
}))

vi.mock('@react-three/rapier', () => ({
  Physics: ({ children }) => <>{children}</>,
}))

vi.mock('@react-three/drei', () => ({
  KeyboardControls: ({ children }) => <>{children}</>,
}))

vi.mock('./components/Game.jsx', () => ({
  default: () => <div data-testid="mock-game" />,
}))

vi.mock('./components/HUD.jsx', () => ({
  default: () => <div data-testid="mock-hud" />,
}))

vi.mock('./components/TitleScreen.jsx', () => ({
  default: ({ onEnterLobby }) => <button type="button" onClick={onEnterLobby}>start</button>,
}))

vi.mock('./components/Lobby.jsx', () => ({
  default: ({ onStartStage }) => <button type="button" onClick={() => onStartStage('stage1')}>enter stage</button>,
}))

vi.mock('./components/VirtualJoystick.jsx', () => ({
  default: () => <div data-testid="virtual-joystick-mounted" />,
}))

function setInputEnvironment({ maxTouchPoints, userAgent, platform = '', coarse }) {
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: maxTouchPoints })
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent })
  Object.defineProperty(navigator, 'platform', { configurable: true, value: platform })
  window.matchMedia = vi.fn(() => ({
    matches: coarse,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

async function renderAppAndStart() {
  await import('./components/ReadyGameApp.jsx')
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(<App />)
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  await vi.waitFor(() => {
    expect(container.querySelector('button')).not.toBe(null)
  })
  act(() => {
    container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  act(() => {
    container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  return {
    container,
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('App virtual joystick mounting', () => {
  beforeEach(() => {
    _resetFirebaseProgressForTests()
    _seedHydratedFirebaseProgressForTests({ uid: 'test-user' })
    commitFirebaseStudioRuntime({
      tunings: {},
      sfxTunings: {},
      stageBossPreview: {},
      decals: {},
      propPlacements: {},
    }, { revision: 1 })
    firebaseStudioMocks.hydrate.mockReset().mockResolvedValue({ status: 'remote-applied', revision: 2 })
    firebaseStudioMocks.setUser.mockReset()
    firebaseStudioMocks.subscribe.mockReset().mockResolvedValue({
      status: 'subscribed',
      unsubscribe: vi.fn(),
    })
  })

  it('refetches Firebase on an allowed Studio sync message and ignores injected payloads', async () => {
    localStorage.clear()
    resetStagePropPlacementsCache()
    saveStudioTunings({ stale: { scale: 1.3 } })
    saveStagePropPlacements({
      stage1: [{ id: 'stale-desk', type: 'classroomDesk', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }],
    })

    const handled = await handleStudioGameSyncMessage({
      origin: 'http://localhost:5173',
      data: {
        type: 'escape-zombie-school.studioGameSync.v1',
        tunings: { player: { scale: 1.7 } },
        sfxTunings: { pencilFire: { volume: 0.4 } },
        stageBossPreview: { zoom: 133, panX: 0.35, panY: -0.25 },
        decals: {
          'zombie-e01': [
            { partId: 'sample-head', faceAxis: '+z', imageDataUrl: 'data:image/png;base64,AAAA', offset: [0.1, 0], scale: [0.4, 0.4], rotation: 0 },
          ],
        },
        propPlacements: {
          stage1: null,
          stage2: [{
            id: 'cloud-board',
            type: 'corridorLostFoundBoard',
            position: [2, 0, -4],
            rotation: [0, 0.5, 0],
            scale: 1,
          }],
          stage3: null,
        },
      },
    })

    expect(handled).toBe(true)
    expect(firebaseStudioMocks.hydrate).toHaveBeenCalledOnce()
    expect(loadStudioTunings().stale.scale).toBe(1.3)
    expect(loadSfxTunings()).toEqual({})
    expect(loadStageBossPreview().zoom).not.toBe(133)
    expect(loadTextureDecals()).toEqual({})
    expect(loadStagePropPlacements().stage1[0].id).toBe('stale-desk')
  })

  it('does not consume malformed or arbitrary datasets from a Studio message', async () => {
    localStorage.clear()
    resetStagePropPlacementsCache()
    saveStudioTunings({ player: { scale: 1.63 } })
    saveStagePropPlacements({
      stage1: [{ id: 'safe-desk', type: 'classroomDesk', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }],
    })
    const beforeTunings = JSON.stringify(loadStudioTunings())
    const beforeProps = JSON.stringify(loadStagePropPlacements())

    expect(await handleStudioGameSyncMessage({
      origin: 'http://localhost:5173',
      data: {
        type: 'escape-zombie-school.studioGameSync.v1',
        tunings: 7,
        sfxTunings: {},
        stageBossPreview: {},
        decals: {},
        propPlacements: {},
      },
    })).toBe(true)

    expect(JSON.stringify(loadStudioTunings())).toBe(beforeTunings)
    expect(JSON.stringify(loadStagePropPlacements())).toBe(beforeProps)
  })

  it('rejects Studio messages that do not come from the exact opener window', async () => {
    const previousOpener = window.opener
    const opener = {}
    Object.defineProperty(window, 'opener', { configurable: true, value: opener })
    try {
      expect(await handleStudioGameSyncMessage({
        origin: 'http://localhost:5173',
        source: {},
        data: {
          type: 'escape-zombie-school.studioGameSync.v1',
          tunings: {},
          sfxTunings: {},
          stageBossPreview: {},
          decals: {},
          propPlacements: {},
        },
      })).toBe(false)
    } finally {
      Object.defineProperty(window, 'opener', { configurable: true, value: previousOpener })
    }
  })

  it('uses the full viewport width so narrow iPhone SE screens are not pillarboxed', async () => {
    setInputEnvironment({
      maxTouchPoints: 5,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
      coarse: true,
    })

    const view = await renderAppAndStart()
    const viewport = view.container.firstElementChild
    const phoneFrame = viewport.firstElementChild

    expect(phoneFrame.style.width).toBe('100vw')
    expect(phoneFrame.style.height).toBe('100vh')
    expect(phoneFrame.style.aspectRatio).toBe('')
    view.unmount()
  })

  it('does not mount the virtual joystick on desktop web environments', async () => {
    setInputEnvironment({
      maxTouchPoints: 0,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      coarse: false,
    })

    const view = await renderAppAndStart()

    expect(view.container.querySelector('[data-testid="virtual-joystick-mounted"]')).toBe(null)
    view.unmount()
  })

  it('mounts the virtual joystick on mobile touch environments during the game screen', async () => {
    setInputEnvironment({
      maxTouchPoints: 5,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
      coarse: true,
    })

    const view = await renderAppAndStart()

    expect(view.container.querySelector('[data-testid="virtual-joystick-mounted"]')).not.toBe(null)
    view.unmount()
  })
})
