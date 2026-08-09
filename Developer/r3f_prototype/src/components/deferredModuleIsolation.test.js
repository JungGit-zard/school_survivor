import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(path) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

describe('initial-screen deferred module isolation', () => {
  it('keeps lobby and gameplay modules out of the App and title static import paths', () => {
    const app = source('../App.jsx')
    const readyGame = source('./ReadyGameApp.jsx')
    const title = source('./TitleScreen.jsx')

    expect(app).toContain("const ReadyGameApp = lazy(() => import('./components/ReadyGameApp.jsx'))")
    expect(app).not.toContain("import ReadyGameApp from './components/ReadyGameApp.jsx'")
    expect(readyGame).toContain("const Lobby = lazy(() => import('./Lobby.jsx'))")
    expect(readyGame).toContain("const GameplayScreen = lazy(() => import('./GameplayScreen.jsx'))")
    expect(readyGame).not.toContain("from '../store/useGameStore.js'")
    expect(title).toContain("import TitleSceneCanvas from './TitleSceneCanvas.jsx'")
    expect(title).not.toContain("from '../store/useGameStore.js'")
  })

  it('keeps title 3D in the initial title module while stage props use direct imports', () => {
    const canvas = source('./TitleSceneCanvas.jsx')
    const scene = source('./TitleScene3D.jsx')

    expect(canvas).toContain("import TitleScene3D from './TitleScene3D.jsx'")
    expect(canvas).not.toContain("lazy(() => import('./TitleScene3D.jsx'))")
    expect(canvas).not.toContain('<Suspense fallback={null}>')
    expect(scene).not.toContain("from './StageObjects/index.js'")
    expect(scene).toContain("import ClassroomDesk from './StageObjects/ClassroomDesk.jsx'")
  })
})
