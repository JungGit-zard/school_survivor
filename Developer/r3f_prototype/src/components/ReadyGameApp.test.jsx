// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hydrated: false,
  titleCheat: false,
  gameStore: {
    gameKey: 0,
    phase: 'idle',
    resetGame: vi.fn(),
    startStage1Intro: vi.fn(),
  },
}))

vi.mock('./TitleScreen.jsx', () => ({ default: ({ onEnterLobby }) => <button onClick={onEnterLobby}>enter</button> }))
vi.mock('./Lobby.jsx', () => ({
  default: ({ devAllStagesUnlocked, onStartStage, weaponEncyclopediaRequest }) => (
    <>
      <output data-testid="stage-bypass">{String(devAllStagesUnlocked)}</output>
      <output data-testid="weapon-encyclopedia-request">{weaponEncyclopediaRequest?.weaponId ?? ''}</output>
      <button type="button" data-testid="start-stage" onClick={() => onStartStage('stage1')}>start</button>
    </>
  ),
}))
vi.mock('./GameplayScreen.jsx', () => ({
  default: (props) => (
    <section data-testid="gameplay-screen">
      <output data-testid="instant-result-prop">{String(props.showGameoverResultImmediately)}</output>
      <button type="button" data-testid="open-result-shop" onClick={props.onOpenCoinShop}>shop</button>
      <button type="button" data-testid="open-weapon-encyclopedia" onClick={() => props.onOpenWeaponEncyclopedia('guidedMissile')}>weapons</button>
    </section>
  ),
}))
vi.mock('./CoinShop.jsx', () => ({
  default: ({ onBack }) => <button type="button" data-testid="coin-shop-back" onClick={onBack}>back</button>,
}))
vi.mock('./SfxLayer.jsx', () => ({ default: () => null }))
vi.mock('./VirtualJoystick.jsx', () => ({ default: () => null }))
vi.mock('./gameCanvasLoader.js', () => ({ loadGameCanvas: async () => ({ default: () => null }) }))
vi.mock('./E2ERuntimePerformanceDiagnostics.jsx', () => ({ default: () => null }))
vi.mock('../lib/playtestLogger.js', () => ({ initPlaytestLogger: vi.fn() }))
vi.mock('../lib/keyboardInput.js', () => ({ initKeyboardInput: vi.fn() }))
vi.mock('../lib/mobileInput.js', () => ({ isMobileJoystickEnvironment: () => false }))
vi.mock('../lib/firebaseProgress.js', () => ({ isFirebaseProgressHydrated: () => mocks.hydrated }))
vi.mock('../lib/titleSettings.js', () => ({
  loadTitleSettings: () => ({ unlockAllStagesCheat: mocks.titleCheat, language: null }),
  applyLanguage: vi.fn(),
}))
vi.mock('../store/useGameStore.js', () => ({
  useGameStore: Object.assign(
    (selector) => selector(mocks.gameStore),
    { getState: () => mocks.gameStore },
  ),
}))

const { default: ReadyGameApp } = await import('./ReadyGameApp.jsx')

async function renderReady(props) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const render = async (nextProps) => {
    await act(async () => {
      root.render(<ReadyGameApp {...nextProps} />)
      await vi.dynamicImportSettled()
    })
  }
  await render(props)
  await act(async () => {
    container.querySelector('button').click()
    await vi.dynamicImportSettled()
  })
  return { container, render, unmount: () => act(() => { root.unmount(); container.remove() }) }
}

describe('ReadyGameApp stage bypass hydration', () => {
  afterEach(() => {
    mocks.hydrated = false
    mocks.titleCheat = false
    mocks.gameStore.phase = 'idle'
    mocks.gameStore.resetGame.mockClear()
    mocks.gameStore.startStage1Intro.mockClear()
  })

  it('restores the saved bypass only after the signed-in user progress becomes ready', async () => {
    const view = await renderReady({ authUser: { uid: 'first' }, progressStatus: 'loading' })
    expect(view.container.querySelector('[data-testid="stage-bypass"]').textContent).toBe('false')

    mocks.hydrated = true
    mocks.titleCheat = true
    await view.render({ authUser: { uid: 'first' }, progressStatus: 'ready' })
    expect(view.container.querySelector('[data-testid="stage-bypass"]').textContent).toBe('true')
    view.unmount()
  })

  it('clears the bypass immediately while switching users or loading their progress', async () => {
    mocks.hydrated = true
    mocks.titleCheat = true
    const view = await renderReady({ authUser: { uid: 'first' }, progressStatus: 'ready' })
    expect(view.container.querySelector('[data-testid="stage-bypass"]').textContent).toBe('true')

    await view.render({ authUser: { uid: 'second' }, progressStatus: 'loading' })
    expect(view.container.querySelector('[data-testid="stage-bypass"]').textContent).toBe('false')

    mocks.titleCheat = false
    await view.render({ authUser: { uid: 'second' }, progressStatus: 'ready' })
    expect(view.container.querySelector('[data-testid="stage-bypass"]').textContent).toBe('false')
    view.unmount()
  })

  it('marks the next game render for immediate result popup after returning from the game result coin shop', async () => {
    const view = await renderReady({ authUser: { uid: 'first' }, progressStatus: 'ready' })

    await act(async () => {
      view.container.querySelector('[data-testid="start-stage"]').click()
      await vi.dynamicImportSettled()
    })
    expect(view.container.querySelector('[data-testid="instant-result-prop"]').textContent).toBe('false')

    mocks.gameStore.phase = 'gameover'
    await act(async () => {
      view.container.querySelector('[data-testid="open-result-shop"]').click()
      await vi.dynamicImportSettled()
    })
    await act(async () => {
      view.container.querySelector('[data-testid="coin-shop-back"]').click()
      await vi.dynamicImportSettled()
    })

    expect(view.container.querySelector('[data-testid="instant-result-prop"]').textContent).toBe('true')
    view.unmount()
  })

  it('does not mark a normal game return as an already-confirmed game over result', async () => {
    const view = await renderReady({ authUser: { uid: 'first' }, progressStatus: 'ready' })

    await act(async () => {
      view.container.querySelector('[data-testid="start-stage"]').click()
      await vi.dynamicImportSettled()
    })
    mocks.gameStore.phase = 'playing'

    await act(async () => {
      view.container.querySelector('[data-testid="open-result-shop"]').click()
      await vi.dynamicImportSettled()
    })
    await act(async () => {
      view.container.querySelector('[data-testid="coin-shop-back"]').click()
      await vi.dynamicImportSettled()
    })

    expect(view.container.querySelector('[data-testid="instant-result-prop"]').textContent).toBe('false')
    view.unmount()
  })

  it('routes a result weapon encyclopedia request to the lobby with its selected weapon', async () => {
    const view = await renderReady({ authUser: { uid: 'first' }, progressStatus: 'ready' })

    await act(async () => {
      view.container.querySelector('[data-testid="start-stage"]').click()
      await vi.dynamicImportSettled()
    })
    await act(async () => {
      view.container.querySelector('[data-testid="open-weapon-encyclopedia"]').click()
      await vi.dynamicImportSettled()
    })

    expect(view.container.querySelector('[data-testid="weapon-encyclopedia-request"]').textContent).toBe('guidedMissile')
    view.unmount()
  })

})
