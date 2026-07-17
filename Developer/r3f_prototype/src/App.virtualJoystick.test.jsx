// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App, { handleStudioGameSyncMessage } from './App.jsx'
import { loadStageBossPreview, loadStudioTunings, loadTextureDecals, saveStudioTunings } from './lib/graphicsStudioConfig.js'
import { loadSfxTunings } from './lib/sfxRegistry.js'
import { loadStagePropPlacements, resetStagePropPlacementsCache, saveStagePropPlacements } from './lib/stagePropPlacements.js'

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

function renderAppAndStart() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<App />)
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
  it('applies studio sync messages into the current game origin storage', () => {
    localStorage.clear()
    resetStagePropPlacementsCache()
    saveStudioTunings({ stale: { scale: 1.3 } })
    saveStagePropPlacements({
      stage1: [{ id: 'stale-desk', type: 'classroomDesk', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }],
    })

    const handled = handleStudioGameSyncMessage({
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
    expect(loadStudioTunings().player.scale).toBe(1.7)
    expect(loadStudioTunings()).not.toHaveProperty('stale')
    expect(loadSfxTunings().pencilFire.volume).toBe(0.4)
    expect(loadStageBossPreview()).toEqual({ zoom: 133, panX: 0.35, panY: -0.25 })
    expect(loadTextureDecals()['zombie-e01'][0]).toMatchObject({ partId: 'sample-head', faceAxis: '+z' })
    expect(loadStagePropPlacements().stage1).toBeNull()
    expect(loadStagePropPlacements().stage2[0].id).toBe('cloud-board')
  })

  it('rejects malformed Studio datasets without wiping current local state', () => {
    localStorage.clear()
    resetStagePropPlacementsCache()
    saveStudioTunings({ player: { scale: 1.63 } })
    saveStagePropPlacements({
      stage1: [{ id: 'safe-desk', type: 'classroomDesk', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }],
    })
    const beforeTunings = JSON.stringify(loadStudioTunings())
    const beforeProps = JSON.stringify(loadStagePropPlacements())

    expect(handleStudioGameSyncMessage({
      origin: 'http://localhost:5173',
      data: {
        type: 'escape-zombie-school.studioGameSync.v1',
        tunings: 7,
        sfxTunings: {},
        stageBossPreview: {},
        decals: {},
        propPlacements: {},
      },
    })).toBe(false)

    expect(JSON.stringify(loadStudioTunings())).toBe(beforeTunings)
    expect(JSON.stringify(loadStagePropPlacements())).toBe(beforeProps)
  })

  it('rejects Studio messages that do not come from the exact opener window', () => {
    const previousOpener = window.opener
    const opener = {}
    Object.defineProperty(window, 'opener', { configurable: true, value: opener })
    try {
      expect(handleStudioGameSyncMessage({
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

  it('uses the full viewport width so narrow iPhone SE screens are not pillarboxed', () => {
    setInputEnvironment({
      maxTouchPoints: 5,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
      coarse: true,
    })

    const view = renderAppAndStart()
    const viewport = view.container.firstElementChild
    const phoneFrame = viewport.firstElementChild

    expect(phoneFrame.style.width).toBe('100vw')
    expect(phoneFrame.style.height).toBe('100vh')
    expect(phoneFrame.style.aspectRatio).toBe('')
    view.unmount()
  })

  it('does not mount the virtual joystick on desktop web environments', () => {
    setInputEnvironment({
      maxTouchPoints: 0,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      coarse: false,
    })

    const view = renderAppAndStart()

    expect(view.container.querySelector('[data-testid="virtual-joystick-mounted"]')).toBe(null)
    view.unmount()
  })

  it('mounts the virtual joystick on mobile touch environments during the game screen', () => {
    setInputEnvironment({
      maxTouchPoints: 5,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
      coarse: true,
    })

    const view = renderAppAndStart()

    expect(view.container.querySelector('[data-testid="virtual-joystick-mounted"]')).not.toBe(null)
    view.unmount()
  })
})
