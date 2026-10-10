// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import ReadyGameAppSource from './ReadyGameApp.jsx?raw'
import { WEB_BACKGROUND_URLS, selectedWebBackgroundUrl } from '../lib/webBackgroundAssets.js'
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

vi.mock('./TitleScreen.jsx', () => ({
  default: ({ onEnterLobby }) => <button data-testid="title-screen" onClick={onEnterLobby}>enter</button>,
}))
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
      <button type="button" data-testid="open-result-ranking" onClick={props.onGoToRanking}>ranking</button>
      <button type="button" data-testid="open-result-mission" onClick={props.onOpenMissionCenter}>mission</button>
      <button type="button" data-testid="open-weapon-encyclopedia" onClick={() => props.onOpenWeaponEncyclopedia('guidedMissile')}>weapons</button>
    </section>
  ),
}))
vi.mock('./CoinShop.jsx', () => ({
  default: ({ onBack }) => <button type="button" data-testid="coin-shop-back" onClick={onBack}>back</button>,
}))
vi.mock('./UserRanking.jsx', () => ({
  default: ({ onBack }) => <button type="button" data-testid="ranking-back" onClick={onBack}>back</button>,
}))
vi.mock('./MissionCenter.jsx', () => ({
  default: ({ onBack }) => <button type="button" data-testid="mission-center-back" onClick={onBack}>back</button>,
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

async function renderReadyWithoutEntering(props) {
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
  return { container, render, unmount: () => act(() => { root.unmount(); container.remove() }) }
}

describe('ReadyGameApp stage bypass hydration', () => {
  it('applies one external side-gutter background from the /game title screen onward and preserves the phoneFrame contract', async () => {
    const view = await renderReadyWithoutEntering(
      { authUser: { uid: 'first' }, progressStatus: 'ready' },
    )
    const viewport = view.container.firstElementChild

    expect(WEB_BACKGROUND_URLS).toHaveLength(4)
    expect(WEB_BACKGROUND_URLS).toEqual([
      'https://escape-zombie-school-assets.web.app/web-side-gutters/v2/web_game_side_gutters_01.png',
      'https://escape-zombie-school-assets.web.app/web-side-gutters/v1/web_game_side_gutters_02.png',
      'https://escape-zombie-school-assets.web.app/web-side-gutters/v1/web_game_side_gutters_03.png',
      'https://escape-zombie-school-assets.web.app/web-side-gutters/v1/web_game_side_gutters_04.png',
    ])
    expect(WEB_BACKGROUND_URLS).toContain(selectedWebBackgroundUrl)
    expect(ReadyGameAppSource).not.toContain('../assets/backgrounds/web_game_side_gutters_16x9.png')
    expect(ReadyGameAppSource).not.toContain('localStorage')
    expect(ReadyGameAppSource).not.toContain('sessionStorage')
    expect(viewport.style.backgroundColor).toBe('rgb(10, 8, 16)')
    expect(viewport.style.backgroundImage).toContain(selectedWebBackgroundUrl)
    expect(viewport.style.backgroundSize).toBe('cover')
    expect(viewport.style.backgroundPosition).toBe('center center')
    expect(viewport.style.backgroundRepeat).toBe('no-repeat')
    expect(ReadyGameAppSource).toContain("width: 'min(100vw, 720px, 56.25dvh)'")
    expect(ReadyGameAppSource).toContain("aspectRatio: '9 / 16'")
    expect(ReadyGameAppSource).toContain("maxHeight: 'min(100vh, 100dvh, 1280px)'")

    await act(async () => {
      view.container.querySelector('button').click()
      await vi.dynamicImportSettled()
    })

    await act(async () => {
      view.container.querySelector('[data-testid="start-stage"]').click()
      await vi.dynamicImportSettled()
    })

    expect(viewport.style.backgroundImage).toContain(selectedWebBackgroundUrl)
    expect(viewport.style.backgroundColor).toBe('rgb(10, 8, 16)')
    expect(ReadyGameAppSource).toContain("width: 'min(100vw, 720px, 56.25dvh)'")
    expect(ReadyGameAppSource).toContain("aspectRatio: '9 / 16'")
    expect(ReadyGameAppSource).toContain("maxHeight: 'min(100vh, 100dvh, 1280px)'")
    view.unmount()
  })

  afterEach(() => {
    window.sessionStorage.removeItem('eszs:pending-start-after-google-login')
    mocks.hydrated = false
    mocks.titleCheat = false
    mocks.gameStore.phase = 'idle'
    mocks.gameStore.resetGame.mockClear()
    mocks.gameStore.startStage1Intro.mockClear()
  })

  it('does not render the login title for even one frame while a redirect account is restored', async () => {
    window.sessionStorage.setItem('eszs:pending-start-after-google-login', '1')
    const view = await renderReadyWithoutEntering({
      authStatus: 'checking',
      authUser: null,
      progressStatus: 'idle',
    })

    expect(view.container.querySelector('[data-testid="title-screen"]')).toBeNull()
    expect(view.container.querySelector('[data-testid="stage-bypass"]')).toBeNull()

    await view.render({
      authStatus: 'signedIn',
      authUser: { uid: 'redirect-account' },
      progressStatus: 'loading',
    })

    expect(view.container.querySelector('[data-testid="title-screen"]')).toBeNull()
    expect(view.container.querySelector('[data-testid="stage-bypass"]')).not.toBeNull()
    expect(window.sessionStorage.getItem('eszs:pending-start-after-google-login')).toBeNull()
    view.unmount()
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

  it('marks the next game render for immediate result popup after returning from game-over ranking', async () => {
    const view = await renderReady({ authUser: { uid: 'first' }, progressStatus: 'ready' })

    await act(async () => {
      view.container.querySelector('[data-testid="start-stage"]').click()
      await vi.dynamicImportSettled()
    })
    mocks.gameStore.phase = 'gameover'

    await act(async () => {
      view.container.querySelector('[data-testid="open-result-ranking"]').click()
      await vi.dynamicImportSettled()
    })
    await act(async () => {
      view.container.querySelector('[data-testid="ranking-back"]').click()
      await vi.dynamicImportSettled()
    })

    expect(view.container.querySelector('[data-testid="instant-result-prop"]').textContent).toBe('true')
    view.unmount()
  })

  it('marks the next game render for immediate result popup after returning from game-over mission center', async () => {
    const view = await renderReady({ authUser: { uid: 'first' }, progressStatus: 'ready' })

    await act(async () => {
      view.container.querySelector('[data-testid="start-stage"]').click()
      await vi.dynamicImportSettled()
    })
    mocks.gameStore.phase = 'gameover'

    await act(async () => {
      view.container.querySelector('[data-testid="open-result-mission"]').click()
      await vi.dynamicImportSettled()
    })
    await act(async () => {
      view.container.querySelector('[data-testid="mission-center-back"]').click()
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
