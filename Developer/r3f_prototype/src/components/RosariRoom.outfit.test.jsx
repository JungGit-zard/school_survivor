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
import { _resetGuestOutfitUnlocksForTests, grantOutfitUnlocksFromRecords } from '../lib/outfitUnlocks.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'

describe('Rosari wardrobe outfit selection', () => {
  let container, root
  const buttonByText = (text) => [...container.querySelectorAll('button')].find((node) => node.textContent === text)
  const optionFor = (id) => container.querySelector(`[role="group"] [data-outfit-id="${id}"]`)
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    // Guest session; Stage 1 escaped this session, so 동복 is owned and the other four stay locked.
    _resetFirebaseProgressForTests()
    _resetGuestOutfitUnlocksForTests()
    grantOutfitUnlocksFromRecords({ stage1Clears: 1 })
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    container = document.createElement('div'); document.body.append(container)
    root = createRoot(container)
    act(() => root.render(<RosariRoom onBack={vi.fn()} />))
  })
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); _resetGuestOutfitUnlocksForTests(); _seedHydratedFirebaseProgressForTests() })

  it('starts in the default school uniform and switches the room model to 동복 from the wardrobe', () => {
    expect(scene.props.outfitId).toBe('default')
    act(() => scene.props.onNearWardrobeChange(true))
    act(() => buttonByText('옷장 열기').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog.textContent).toContain('현재 착용: 학교 교복')
    const group = dialog.querySelector('[role="group"][aria-label="의상 선택"]')
    const options = [...group.querySelectorAll('button')]
    expect(options.map((node) => node.dataset.outfitId)).toEqual(['default', 'winter', 'raincoat', 'gym', 'apron', 'grad'])
    expect(options[0].textContent).toBe('학교 교복')
    expect(options[1].textContent).toBe('동복')
    expect(options[0].getAttribute('aria-pressed')).toBe('true')
    for (const option of options) expect(option.style.minHeight).toBe('44px')
    for (const id of ['raincoat', 'gym', 'apron', 'grad']) expect(optionFor(id).getAttribute('aria-disabled')).toBe('true')

    // A locked outfit is never worn, even when pressed.
    act(() => optionFor('gym').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(scene.props.outfitId).toBe('default')

    act(() => optionFor('winter').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(scene.props.outfitId).toBe('winter')
    expect(dialog.textContent).toContain('현재 착용: 동복')
    expect(optionFor('winter').getAttribute('aria-pressed')).toBe('true')
    expect(optionFor('default').getAttribute('aria-pressed')).toBe('false')

    act(() => optionFor('default').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(scene.props.outfitId).toBe('default')
  })

  it('opens the outfit feature table from inside the wardrobe and closes it with Escape before the wardrobe', () => {
    act(() => scene.props.onNearWardrobeChange(true))
    act(() => buttonByText('옷장 열기').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    act(() => container.querySelector('[data-outfit-table-open]').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    const table = container.querySelector('[data-outfit-feature-table]')
    expect(table).not.toBeNull()
    expect(table.querySelectorAll('tbody tr')).toHaveLength(6)
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(container.querySelector('[data-outfit-feature-table]')).toBeNull()
    expect(container.querySelector('[role="dialog"][aria-label="로자리 옷장"]')).not.toBeNull()
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(container.querySelector('[role="dialog"][aria-label="로자리 옷장"]')).toBeNull()
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
    // The bob under its pivot, at the GLB's head height (pivot y 1.88; bob local y 0.08..1.269),
    // so the scale check sees the true top of the head.
    const hairPivot = new THREE.Group()
    hairPivot.name = 'removable_hair_pivot'
    hairPivot.position.set(0, 1.88, 0)
    const bob = new THREE.Mesh(new THREE.BoxGeometry(1.29, 1.189, 1.174).translate(0.0125, 0.6745, -0.002), new THREE.MeshStandardMaterial({ name: 'hair' }))
    bob.name = 'continuous_fitted_reference_bob'
    hairPivot.add(bob)
    source.add(hairPivot)
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
    const ids = ['default', 'winter', 'raincoat', 'gym', 'apron', 'grad']
    const scales = ids.map((outfitId) => {
      const f = fixture()
      const parent = new THREE.Group()
      const cleanup = mountRosariModel(parent, f.source, {}, f.gl, outfitId)
      const scale = parent.scale.y
      cleanup()
      return scale
    })
    // A hood or mortarboard rises above the bob; it must not shrink the character.
    ids.forEach((id, i) => expect(scales[i], id).toBeCloseTo(scales[0], 6))
  })

  it.each([
    ['raincoat', ['removable_hair_pivot']],
    ['gym', [ROSARI_OUTFIT_TORSO_NODE]],
    ['apron', [ROSARI_OUTFIT_TORSO_NODE, 'removable_hair_pivot']],
    ['grad', ['removable_hair_pivot', 'removable_hair_pivot', 'removable_hair_pivot']],
  ])('%s details get toon materials + outline hulls and are fully disposed on cleanup', (outfitId, parents) => {
    const f = fixture()
    const parent = new THREE.Group()
    const cleanup = mountRosariModel(parent, f.source, {}, f.gl, outfitId)
    const details = []
    parent.children[0].traverse((node) => { if (node.name.startsWith(`outfit_${outfitId}_`)) details.push(node) })
    expect(details.map((node) => node.parent.name)).toEqual(parents)
    const disposed = new Set()
    const owned = []
    for (const detail of details) {
      expect(detail.material).toBeInstanceOf(THREE.MeshToonMaterial)
      expect(detail.material.stencilWrite).toBe(true)
      expect(detail.children.some((child) => child.userData.isOutline)).toBe(true)
      for (const resource of [detail.geometry, detail.material]) {
        owned.push(resource)
        resource.addEventListener('dispose', () => disposed.add(resource))
      }
    }
    expect(f.source.getObjectByName('removable_hair_pivot').children).toHaveLength(1)
    cleanup()
    expect(owned.every((resource) => disposed.has(resource))).toBe(true)
    expect(f.cachedDisposed).not.toHaveBeenCalled()
  })
})
