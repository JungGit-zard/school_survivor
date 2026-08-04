// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ hydrated: false, titleCheat: false }))

vi.mock('./TitleScreen.jsx', () => ({ default: ({ onEnterLobby }) => <button onClick={onEnterLobby}>enter</button> }))
vi.mock('./Lobby.jsx', () => ({ default: ({ devAllStagesUnlocked }) => <output data-testid="stage-bypass">{String(devAllStagesUnlocked)}</output> }))
vi.mock('./SfxLayer.jsx', () => ({ default: () => null }))
vi.mock('./VirtualJoystick.jsx', () => ({ default: () => null }))
vi.mock('./gameCanvasLoader.js', () => ({ loadGameCanvas: async () => ({ default: () => null }) }))
vi.mock('./E2ERuntimePerformanceDiagnostics.jsx', () => ({ default: () => null }))
vi.mock('../lib/e2eAuth.js', () => ({ isE2EPerformanceDiagnostics: () => false }))
vi.mock('../lib/playtestLogger.js', () => ({ initPlaytestLogger: vi.fn() }))
vi.mock('../lib/keyboardInput.js', () => ({ initKeyboardInput: vi.fn() }))
vi.mock('../lib/mobileInput.js', () => ({ isMobileJoystickEnvironment: () => false }))
vi.mock('../lib/firebaseProgress.js', () => ({ isFirebaseProgressHydrated: () => mocks.hydrated }))
vi.mock('../lib/titleSettings.js', () => ({
  loadTitleSettings: () => ({ unlockAllStagesCheat: mocks.titleCheat, language: null }),
  applyLanguage: vi.fn(),
}))
vi.mock('../store/useGameStore.js', () => ({
  useGameStore: (selector) => selector({ gameKey: 0, phase: 'idle', resetGame: vi.fn() }),
}))

const { default: ReadyGameApp } = await import('./ReadyGameApp.jsx')

function renderReady(props) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const render = (nextProps) => act(() => root.render(<ReadyGameApp studioVisualsReady={false} ensureStudioCloudReady={vi.fn()} {...nextProps} />))
  render(props)
  act(() => container.querySelector('button').click())
  return { container, render, unmount: () => act(() => { root.unmount(); container.remove() }) }
}

describe('ReadyGameApp stage bypass hydration', () => {
  afterEach(() => { mocks.hydrated = false; mocks.titleCheat = false })

  it('restores the saved bypass only after the signed-in user progress becomes ready', () => {
    const view = renderReady({ authUser: { uid: 'first' }, progressStatus: 'loading' })
    expect(view.container.querySelector('[data-testid="stage-bypass"]').textContent).toBe('false')

    mocks.hydrated = true
    mocks.titleCheat = true
    view.render({ authUser: { uid: 'first' }, progressStatus: 'ready' })
    expect(view.container.querySelector('[data-testid="stage-bypass"]').textContent).toBe('true')
    view.unmount()
  })

  it('clears the bypass immediately while switching users or loading their progress', () => {
    mocks.hydrated = true
    mocks.titleCheat = true
    const view = renderReady({ authUser: { uid: 'first' }, progressStatus: 'ready' })
    expect(view.container.querySelector('[data-testid="stage-bypass"]').textContent).toBe('true')

    view.render({ authUser: { uid: 'second' }, progressStatus: 'loading' })
    expect(view.container.querySelector('[data-testid="stage-bypass"]').textContent).toBe('false')

    mocks.titleCheat = false
    view.render({ authUser: { uid: 'second' }, progressStatus: 'ready' })
    expect(view.container.querySelector('[data-testid="stage-bypass"]').textContent).toBe('false')
    view.unmount()
  })
})
