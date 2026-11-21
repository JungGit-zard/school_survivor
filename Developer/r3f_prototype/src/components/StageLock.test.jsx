// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { STAGE_LOCK_STUDIO_ITEM_ID } from '../lib/graphicsStudioConfig.js'
import { STAGE_LOCK_BODY, StageLockModel, StageLockPreview } from './StageLock.jsx'

const fiberState = { invalidate: vi.fn(), gl: { domElement: null } }

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, camera, frameloop, ...rest }) => (
    <div data-testid="stage-lock-preview-canvas" data-camera-position={camera?.position?.join(',')} data-frameloop={frameloop} data-spinning={rest['data-spinning']} data-dpr={JSON.stringify(rest.dpr)}>
      {children}
    </div>
  ),
  useThree: (selector) => selector(fiberState),
}))

vi.mock('./StudioTunedGroup.jsx', () => ({
  default: ({ itemId, children }) => <group data-testid="stage-lock-studio-tuned-group" data-item-id={itemId}>{children}</group>,
}))

vi.mock('../lib/toon.js', () => ({
  getCachedBoxGeo: (...args) => ({ type: 'box', args }),
  getCachedChamferedBoxGeo: (...args) => ({ type: 'roundedBox', args }),
  getCachedCylinderGeo: (...args) => ({ type: 'cylinder', args }),
  getCachedToonMat: (color, emissive) => ({ type: 'toon', color, emissive }),
  getSharedOutlineMat: () => ({ type: 'outline' }),
  inflateScale: (value) => value,
}))

describe('StageLockModel', () => {
  let container
  let root

  afterEach(() => {
    vi.unstubAllGlobals()
    if (root) act(() => root.unmount())
    container?.remove()
    root = null
    container = null
  })

  function render(element) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root.render(element))
    return container
  }

  it('wraps the lock in the shared StudioTunedGroup item id', () => {
    render(<StageLockModel />)

    const tunedGroup = container.querySelector('[data-testid="stage-lock-studio-tuned-group"]')
    expect(tunedGroup).toBeTruthy()
    expect(tunedGroup.dataset.itemId).toBe(STAGE_LOCK_STUDIO_ITEM_ID)
  })

  it('keeps a simple low-poly padlock silhouette with body, shackle, collars, and keyhole parts', () => {
    render(<StageLockModel />)

    expect(container.querySelector('[name="body"]')).toBeTruthy()
    expect(container.querySelector('[name="shackle-left"]')).toBeTruthy()
    expect(container.querySelector('[name="shackle-top"]')).toBeTruthy()
    expect(container.querySelector('[name="shackle-right"]')).toBeTruthy()
    const collars = Array.from(container.querySelectorAll('[name^="collar-"]'))
    expect(collars).toHaveLength(2)
    collars.forEach((collar) => {
      expect(collar.querySelector('cylindergeometry')).toBeNull()
    })
    expect(container.querySelector('[name="keyhole"]')).toBeTruthy()
  })

  it('rotates the circular keyhole face forward toward the +Z camera side', () => {
    render(<StageLockModel />)

    const keyholeCircle = container.querySelector('[name="keyhole"] > mesh:nth-child(2)')
    expect(keyholeCircle).toBeTruthy()
    expect(keyholeCircle.getAttribute('rotation')).toBe(`${Math.PI / 2},0,0`)
    expect(container.querySelector('[name="keyhole"]').getAttribute('rotation')).toBe('0,0,0')
    expect(container.querySelector('[name="keyhole-back"]').getAttribute('rotation')).toBe(`0,${Math.PI},0`)
  })

  it('does not assign stable studioPartId metadata or dashed data props so Studio uses numeric scene-tree part paths', () => {
    render(<StageLockModel />)

    expect(container.innerHTML).not.toContain('studioPartId')
    expect(container.innerHTML).not.toContain('data-stage-lock-part')
  })

  it('exports a lobby-ready preview Canvas without requiring Lobby.jsx changes', () => {
    render(<StageLockPreview />)

    const canvas = container.querySelector('[data-testid="stage-lock-preview-canvas"]')
    expect(canvas).toBeTruthy()
    // 카메라는 세로 회전축(x=0) 위에 있어야 모델이 제자리에서 돈다(흔들림 없음).
    expect(canvas.dataset.cameraPosition.split(',')[0]).toBe('0')
    expect(container.querySelector('[name="body"]')).toBeTruthy()
  })

  it('draws the static lobby lock on demand instead of every frame', () => {
    render(<StageLockPreview />)

    expect(container.querySelector('[data-testid="stage-lock-preview-canvas"]').dataset.frameloop).toBe('demand')
  })

  it('gives the body real depth and rounded edges instead of a flat card', () => {
    render(<StageLockModel />)

    // 옆에서 봐도 덩어리: 깊이가 폭의 절반 이상(예전 0.28/0.82 = 34% 판때기).
    expect(STAGE_LOCK_BODY.d / STAGE_LOCK_BODY.w).toBeGreaterThanOrEqual(0.5)
    // 몸통 = 외곽선 헐 + 툰 메시
    expect(container.querySelector('[name="body"]').children).toHaveLength(2)
  })

  it('uses a round tube shackle (cylinders + half torus) with outlines', () => {
    render(<StageLockModel />)

    for (const name of ['shackle-left', 'shackle-top', 'shackle-right']) {
      const part = container.querySelector(`[name="${name}"]`)
      expect(part, name).toBeTruthy()
      expect(part.children, name).toHaveLength(2)
    }
  })

  it('spins the model itself (not the canvas) and caps the pixel ratio', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    render(<StageLockPreview />)

    const canvas = container.querySelector('[data-testid="stage-lock-preview-canvas"]')
    expect(canvas.dataset.spinning).toBe('true')
    expect(canvas.className || '').not.toContain('stage-lock-spin')
    expect(JSON.parse(canvas.dataset.dpr)).toEqual([1, 1.5])
    expect(container.querySelector('style')).toBeNull()
    expect(container.querySelector('[name="stage-lock-spin"]')).toBeTruthy()
    expect(globalThis.requestAnimationFrame).toHaveBeenCalled()
  })

  it('stays still in a three-quarter view under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => {}, removeEventListener: () => {} }))
    const raf = vi.fn(() => 1)
    vi.stubGlobal('requestAnimationFrame', raf)
    render(<StageLockPreview />)

    const canvas = container.querySelector('[data-testid="stage-lock-preview-canvas"]')
    expect(canvas.dataset.spinning).toBe('false')
    expect(raf).not.toHaveBeenCalled()
    const rotation = container.querySelector('[name="stage-lock-spin"]').getAttribute('rotation').split(',').map(Number)
    expect(rotation[1]).toBeLessThan(-0.3)
    expect(rotation[1]).toBeGreaterThan(-1.2)
  })

  it('frames the mission-center icon tighter than the lobby card', () => {
    render(<StageLockPreview framing="icon" testId="icon" />)
    const iconZ = Number(container.querySelector('[data-testid="stage-lock-preview-canvas"]').dataset.cameraPosition.split(',')[2])
    act(() => root.unmount())
    root = null
    container.remove()
    render(<StageLockPreview />)
    const cardZ = Number(container.querySelector('[data-testid="stage-lock-preview-canvas"]').dataset.cameraPosition.split(',')[2])
    expect(iconZ).toBeLessThan(cardZ)
  })
})
