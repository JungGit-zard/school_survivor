// @vitest-environment jsdom
import React, { Suspense, act } from 'react'
import { createRoot } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const sceneMock = vi.hoisted(() => ({
  mode: 'ready',
  pending: null,
  invalidate: null,
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, frameloop }) => <div data-testid="title-canvas" data-frameloop={frameloop}>{children}</div>,
  useThree: (selector) => selector({ invalidate: sceneMock.invalidate }),
}))

vi.mock('./TitleScene3D.jsx', () => ({
  default: ({ reducedEffects }) => {
    if (sceneMock.mode === 'suspended') throw sceneMock.pending
    return <div data-testid="title-scene-3d" data-reduced-effects={String(reducedEffects)} />
  },
}))

const { default: TitleSceneCanvas } = await import('./TitleSceneCanvas.jsx')

describe('TitleSceneCanvas is fully detached from Firebase', () => {
  afterEach(() => {
    sceneMock.mode = 'ready'
    sceneMock.pending = null
    sceneMock.invalidate = null
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  // 2026-11-08: 타이틀 "움직임 줄이기"가 3D에도 적용된다(장면 구성은 그대로, 루프만 멈춤).
  it('stops the 3D loop for prefers-reduced-motion and keeps it running otherwise', async () => {
    for (const reduce of [false, true]) {
      vi.stubGlobal('matchMedia', (query) => ({
        matches: reduce && query === '(prefers-reduced-motion: reduce)',
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
      vi.useFakeTimers()
      sceneMock.invalidate = vi.fn()
      const container = document.createElement('div')
      document.body.appendChild(container)
      const root = createRoot(container)
      await act(async () => {
        root.render(<TitleSceneCanvas />)
      })
      const canvas = container.querySelector('[data-testid="title-canvas"]')
      const scene = container.querySelector('[data-testid="title-scene-3d"]')
      expect(scene).not.toBeNull()
      expect(canvas.getAttribute('data-frameloop')).toBe(reduce ? 'demand' : 'always')
      expect(scene.getAttribute('data-reduced-effects')).toBe(String(reduce))
      await act(async () => { vi.advanceTimersByTime(2000) })
      expect(sceneMock.invalidate).toHaveBeenCalledTimes(reduce ? 3 : 0)
      act(() => root.unmount())
      vi.useRealTimers()
      vi.unstubAllGlobals()
    }
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
    expect(canvasSource).toContain('<Suspense fallback={null}>')

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

  it('contains a TitleScene3D texture suspend inside Canvas so the outer title fallback never replaces the committed title', async () => {
    const pendingTexture = new Promise(() => {})
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const render = () => root.render(
      <Suspense fallback={<div data-testid="ready-game-loading">게임 불러오는 중…</div>}>
        <div data-testid="committed-title">
          <TitleSceneCanvas />
        </div>
      </Suspense>,
    )

    await act(async () => {
      render()
    })
    expect(container.querySelector('[data-testid="committed-title"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="title-scene-3d"]')).not.toBeNull()

    sceneMock.mode = 'suspended'
    sceneMock.pending = pendingTexture
    await act(async () => {
      render()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="ready-game-loading"]')).toBeNull()
    expect(container.querySelector('[data-testid="committed-title"]')).not.toBeNull()

    act(() => root.unmount())
  })
})
