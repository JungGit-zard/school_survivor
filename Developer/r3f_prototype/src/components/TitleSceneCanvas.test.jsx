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
const { isFirebaseStudioRuntimeReady } = await import('../lib/studioRuntimeState.js')

describe('TitleSceneCanvas is fully detached from Firebase', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mounts TitleScene3D unconditionally, with no Studio readiness prop left in the title path', async () => {
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
    expect(canvasSource).toContain('applyFrozenStudioSnapshot()')

    // 동결 스냅샷을 임포트 시점에 적용하므로 로그인·네트워크 없이 런타임이 준비된다.
    expect(isFirebaseStudioRuntimeReady()).toBe(true)

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<TitleSceneCanvas />)
      await vi.dynamicImportSettled()
    })
    expect(container.querySelector('[data-testid="title-canvas"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="title-scene-3d"]')).not.toBeNull()

    act(() => root.unmount())
  })
})
