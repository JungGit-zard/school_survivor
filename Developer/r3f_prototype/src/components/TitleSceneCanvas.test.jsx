// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="title-canvas">{children}</div>,
}))

vi.mock('./TitleScene3D.jsx', () => ({
  default: () => <div data-testid="title-scene-3d" />,
}))

const { default: TitleSceneCanvas } = await import('./TitleSceneCanvas.jsx')

describe('TitleSceneCanvas is fully detached from Firebase', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mounts TitleScene3D synchronously and unconditionally, with no Studio readiness prop left in the title path', async () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')
    const readyGameSource = readFileSync(resolve(process.cwd(), 'src/components/ReadyGameApp.jsx'), 'utf8')
    const titleScreenSource = readFileSync(resolve(process.cwd(), 'src/components/TitleScreen.jsx'), 'utf8')
    const canvasSource = readFileSync(resolve(process.cwd(), 'src/components/TitleSceneCanvas.jsx'), 'utf8')

    expect(appSource).toContain('<ReadyGameApp')
    expect(readyGameSource).toContain('<TitleScreen')
    expect(titleScreenSource).toContain('<TitleSceneCanvas')
    for (const source of [appSource, readyGameSource, titleScreenSource, canvasSource]) {
      expect(source).not.toContain('studioVisualsReady')
    }
    // 게임 주소에서 Firebase 정본을 읽는 경로가 없어야 한다.
    expect(appSource).not.toContain('hydrateGameCanonicalStudio')
    expect(canvasSource).not.toContain('applyFrozenStudioSnapshot')
    expect(canvasSource).not.toContain('studioRuntimeState')
    expect(canvasSource).toContain("import TitleScene3D from './TitleScene3D.jsx'")
    expect(canvasSource).not.toContain("lazy(() => import('./TitleScene3D.jsx'))")
    expect(canvasSource).not.toContain('<Suspense fallback={null}>')

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<TitleSceneCanvas />)
    })
    expect(container.querySelector('[data-testid="title-canvas"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="title-scene-3d"]')).not.toBeNull()

    act(() => root.unmount())
  })
})
