// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TitleScreen from './TitleScreen.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const state = vi.hoisted(() => ({ auth: { user: null, error: null, signingIn: false, signInWithGoogle: () => {} } }))
vi.mock('../lib/i18n.js', () => ({ useLocale: () => 'ko', useT: () => (key) => key, t: (key) => key }))
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: (selector) => selector(state.auth) }))
vi.mock('./GoogleAccountPanel.jsx', () => ({ default: () => <div className="google-account-panel" /> }))
vi.mock('./TitleSceneCanvas.jsx', () => ({ default: () => <div data-testid="original-title-scene" /> }))
vi.mock('howler', () => ({ Howl: vi.fn(function () { return { load: vi.fn(), play: () => 1, pause: vi.fn(), unload: vi.fn() } }) }))
vi.mock('../lib/firebaseProgress.js', () => ({ isFirebaseProgressHydrated: () => false, requestCloudProgressSave: vi.fn() }))
vi.mock('../lib/adminConfig.js', () => ({ getAdminOperationsConfig: () => ({ cheatMenuButtonVisible: true }) }))

let root, container
const findRosariButton = () => [...container.querySelectorAll('button')].find((b) => b.textContent === '로자리의 방')
const render = () => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root.render(<TitleScreen />))
}
afterEach(() => {
  if (root) act(() => root.unmount())
  root = null
  container?.remove()
  state.auth = { user: null, error: null, signingIn: false, signInWithGoogle: () => {} }
})

describe('Rosari room title entry wiring', () => {
  it('keeps the title button text exact and lazy-loads the room from ReadyGameApp', () => {
    const titleSource = readFileSync(resolve(process.cwd(), 'src/components/TitleScreen.jsx'), 'utf8')
    const readySource = readFileSync(resolve(process.cwd(), 'src/components/ReadyGameApp.jsx'), 'utf8')

    expect(titleSource).toContain('로자리의 방')
    expect(titleSource).toContain('onOpenRosariRoom')
    expect(readySource).toContain("const RosariRoom = lazy(() => import('./RosariRoom.jsx'))")
    expect(readySource).toContain("screen === 'rosariRoom'")
  })

  it('shows the entry button once signed in', () => {
    state.auth = { ...state.auth, user: { uid: 'u-1' } }
    render()
    expect(findRosariButton()).not.toBeUndefined()
  })

  it('hides the entry button from guests', () => {
    render()
    expect(findRosariButton()).toBeUndefined()
  })

  it('stays hidden while a signed-in session is still being restored', () => {
    state.auth = { ...state.auth, user: null, signingIn: true }
    render()
    expect(findRosariButton()).toBeUndefined()
  })
})
