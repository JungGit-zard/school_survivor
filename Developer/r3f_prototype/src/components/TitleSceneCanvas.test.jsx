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

describe('TitleSceneCanvas Firebase Studio hydration boundary', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('does not mount TitleScene3D before Studio hydration, then mounts it when the existing readiness prop becomes true', async () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')
    const readyGameSource = readFileSync(resolve(process.cwd(), 'src/components/ReadyGameApp.jsx'), 'utf8')
    const titleScreenSource = readFileSync(resolve(process.cwd(), 'src/components/TitleScreen.jsx'), 'utf8')

    expect(appSource).toContain('<ReadyGameApp')
    expect(appSource).toContain('studioVisualsReady={studioReady}')
    expect(readyGameSource).toContain('<TitleScreen')
    expect(readyGameSource).toContain('studioVisualsReady={studioVisualsReady}')
    expect(titleScreenSource).toContain('<TitleSceneCanvas')
    expect(titleScreenSource).toContain('studioVisualsReady={studioVisualsReady}')

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => root.render(<TitleSceneCanvas studioVisualsReady={false} />))
    expect(container.querySelector('[data-testid="title-canvas"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="title-scene-3d"]')).toBeNull()

    await act(async () => {
      root.render(<TitleSceneCanvas studioVisualsReady />)
      await vi.dynamicImportSettled()
    })
    expect(container.querySelector('[data-testid="title-scene-3d"]')).not.toBeNull()

    act(() => root.unmount())
  })
})
