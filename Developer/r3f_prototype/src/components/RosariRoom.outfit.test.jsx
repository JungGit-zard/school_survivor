// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

const scene = vi.hoisted(() => ({ props: null }))
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => { scene.props = children.props.children.props; return null },
  useFrame: vi.fn(), useThree: vi.fn(),
}))
vi.mock('@react-three/drei', () => ({ Html: ({ children }) => children, useGLTF: Object.assign(vi.fn(), { preload: vi.fn(), clear: vi.fn() }) }))
import RosariRoom, { mountRosariModel } from './RosariRoom.jsx'
import { ROSARI_OUTFIT_TORSO_NODE } from '../lib/rosariOutfits.js'

describe('Rosari wardrobe outfit selection', () => {
  let container, root
  const buttonByText = (text) => [...container.querySelectorAll('button')].find((node) => node.textContent === text)
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    container = document.createElement('div'); document.body.append(container)
    root = createRoot(container)
    act(() => root.render(<RosariRoom onBack={vi.fn()} />))
  })
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })

  it('starts in the default school uniform and switches the room model to 동복 from the wardrobe', () => {
    expect(scene.props.outfitId).toBe('default')
    act(() => scene.props.onNearWardrobeChange(true))
    act(() => buttonByText('옷장 열기').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog.textContent).toContain('현재 착용: 학교 교복')
    const group = dialog.querySelector('[role="group"][aria-label="의상 선택"]')
    const options = [...group.querySelectorAll('button')]
    expect(options.map((node) => node.textContent)).toEqual(['학교 교복', '동복'])
    expect(options[0].getAttribute('aria-pressed')).toBe('true')
    for (const option of options) expect(option.style.minHeight).toBe('44px')

    act(() => buttonByText('동복').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(scene.props.outfitId).toBe('winter')
    expect(dialog.textContent).toContain('현재 착용: 동복')
    expect(buttonByText('동복').getAttribute('aria-pressed')).toBe('true')
    expect(buttonByText('학교 교복').getAttribute('aria-pressed')).toBe('false')

    act(() => buttonByText('학교 교복').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(scene.props.outfitId).toBe('default')
  })
})

describe('mountRosariModel outfit lifecycle', () => {
  function fixture() {
    const source = new THREE.Group()
    // Same extent as the GLB torso exterior: x -0.40..0.43, y 1.233..1.959, z -0.22..0.326.
    const geometry = new THREE.BoxGeometry(0.83, 0.726, 0.546).translate(0.015, 1.596, 0.053)
    const material = new THREE.MeshStandardMaterial({ name: 'jacket.002', color: '#de4a5c' })
    const torso = new THREE.Mesh(geometry, material)
    torso.name = ROSARI_OUTFIT_TORSO_NODE
    source.add(torso)
    const cachedDisposed = vi.fn()
    geometry.addEventListener('dispose', cachedDisposed)
    material.addEventListener('dispose', cachedDisposed)
    return { source, torso, material, cachedDisposed, gl: { getSize: (v) => v.set(390, 844) } }
  }

  it('winter accessories get toon stencil + outline hulls and are fully disposed on cleanup without touching cached GLB resources', () => {
    const f = fixture()
    const parent = new THREE.Group()
    const cleanup = mountRosariModel(parent, f.source, {}, f.gl, 'winter')
    const clone = parent.children[0]
    const torso = clone.getObjectByName(ROSARI_OUTFIT_TORSO_NODE)
    const accessories = torso.children.filter((node) => node.name.startsWith('outfit_winter_'))
    expect(accessories).toHaveLength(3)
    const disposed = new Set()
    const owned = []
    for (const accessory of accessories) {
      expect(accessory.material).toBeInstanceOf(THREE.MeshToonMaterial)
      expect(accessory.material.stencilWrite).toBe(true)
      expect(accessory.children.some((child) => child.userData.isOutline)).toBe(true)
      for (const resource of [accessory.geometry, accessory.material]) {
        owned.push(resource)
        resource.addEventListener('dispose', () => disposed.add(resource))
      }
    }
    expect(f.source.getObjectByName(ROSARI_OUTFIT_TORSO_NODE).children).toHaveLength(0)
    expect(`#${f.material.color.getHexString()}`).toBe('#de4a5c')
    cleanup()
    expect(parent.children).toHaveLength(0)
    expect(owned.every((resource) => disposed.has(resource))).toBe(true)
    expect(f.cachedDisposed).not.toHaveBeenCalled()
  })

  it('outfit choice does not change the approved room character scale', () => {
    const scales = ['default', 'winter'].map((outfitId) => {
      const f = fixture()
      const parent = new THREE.Group()
      const cleanup = mountRosariModel(parent, f.source, {}, f.gl, outfitId)
      const scale = parent.scale.y
      cleanup()
      return scale
    })
    expect(scales[1]).toBeCloseTo(scales[0], 6)
  })
})
