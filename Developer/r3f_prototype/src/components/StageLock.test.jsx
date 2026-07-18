// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { STAGE_LOCK_STUDIO_ITEM_ID } from '../lib/graphicsStudioConfig.js'
import { StageLockModel, StageLockPreview } from './StageLock.jsx'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, camera }) => (
    <div data-testid="stage-lock-preview-canvas" data-camera-position={camera?.position?.join(',')}>
      {children}
    </div>
  ),
}))

vi.mock('./StudioTunedGroup.jsx', () => ({
  default: ({ itemId, children }) => <group data-testid="stage-lock-studio-tuned-group" data-item-id={itemId}>{children}</group>,
}))

vi.mock('../lib/toon.js', () => ({
  getCachedBoxGeo: (...args) => ({ type: 'box', args }),
  getCachedToonMat: (color, emissive) => ({ type: 'toon', color, emissive }),
  getSharedOutlineMat: () => ({ type: 'outline' }),
  inflateScale: (value) => value,
}))

describe('StageLockModel', () => {
  let container
  let root

  afterEach(() => {
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

    const keyholeCircle = container.querySelector('[name="keyhole"] > mesh:first-child')
    expect(keyholeCircle).toBeTruthy()
    expect(keyholeCircle.getAttribute('rotation')).toBe(`${Math.PI / 2},0,0`)
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
    expect(canvas.dataset.cameraPosition).toBe('1.8,1.55,2.8')
    expect(container.querySelector('[name="body"]')).toBeTruthy()
  })
})
