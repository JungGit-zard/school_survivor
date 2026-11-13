// @vitest-environment jsdom
// Wardrobe view mode: opening the wardrobe frames Rosari close up, she turns on the spot
// (앞 / 3/4 / 옆 / 뒤, drag, ←/→), and closing puts the room camera and her facing back exactly.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

const scene = vi.hoisted(() => ({ props: null, resize: null }))
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => { scene.props = children.props.children.props; return null },
  useFrame: vi.fn(), useThree: vi.fn(),
}))
vi.mock('@react-three/drei', () => ({ Html: ({ children }) => children, useGLTF: Object.assign(vi.fn(), { preload: vi.fn(), clear: vi.fn() }) }))
import RosariRoom, {
  ROSARI_VIEW_ANGLES,
  ROSARI_VIEW_DRAG_RAD_PER_PX,
  ROSARI_VIEW_KEY_STEP,
  enterRosariWardrobeView,
  getRosariCameraLayout,
  getRosariRoomLayout,
  getRosariWardrobeViewInsets,
  getRosariWardrobeViewLayout,
  updateRosariViewFacing,
} from './RosariRoom.jsx'
import { _resetGuestOutfitUnlocksForTests, grantOutfitUnlocksFromRecords } from '../lib/outfitUnlocks.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'

let container, root
const buttonByText = (text) => [...container.querySelectorAll('button')].find((node) => node.textContent === text)
const angleButton = (name) => container.querySelector(`[data-view-angle="${name}"]`)
const yaw = () => scene.props.viewYawRef.current
const fire = (target, type, data = {}) => act(() => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, data)
  target.dispatchEvent(event)
})
const key = (target, value) => act(() => target.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })))
const openWardrobe = () => {
  act(() => scene.props.onNearWardrobeChange(true))
  act(() => buttonByText('옷장 열기').dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  _resetFirebaseProgressForTests()
  _resetGuestOutfitUnlocksForTests()
  grantOutfitUnlocksFromRecords({ stage1Clears: 1 })
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { scene.resize = callback }
    observe() {} disconnect() {}
  })
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container)
  act(() => root.render(<RosariRoom onBack={vi.fn()} />))
})
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); _resetGuestOutfitUnlocksForTests(); _seedHydratedFirebaseProgressForTests() })

describe('wardrobe view mode controls', () => {
  it('enters view mode facing front with 44px angle buttons, and leaves it reset with the room camera toggle back', () => {
    expect(container.querySelector('[data-view-angle]')).toBeNull()
    expect(buttonByText('방 전체 보기')).toBeTruthy()
    openWardrobe()
    expect(scene.props.wardrobeOpen).toBe(true)
    expect(yaw()).toBe(0)
    const bar = container.querySelector('[role="group"][aria-label="보는 각도"]')
    const buttons = [...bar.querySelectorAll('button')]
    expect(buttons.map((node) => node.textContent)).toEqual(['앞', '3/4', '옆', '뒤'])
    for (const node of buttons) expect(node.style.minHeight).toBe('44px')
    expect(angleButton('front').getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('[data-wardrobe-rotate-surface]')).not.toBeNull()
    // The room camera toggle would fight the view-mode camera, so it is out while the wardrobe is open.
    expect(buttonByText('방 전체 보기')).toBeUndefined()

    fire(angleButton('back'), 'click')
    expect(yaw()).toBeCloseTo(Math.PI)
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(scene.props.wardrobeOpen).toBe(false)
    expect(yaw()).toBe(0)
    expect(container.querySelector('[data-view-angle]')).toBeNull()
    expect(container.querySelector('[data-wardrobe-rotate-surface]')).toBeNull()
    expect(buttonByText('방 전체 보기')).toBeTruthy()

    openWardrobe()
    expect(yaw()).toBe(0)
    expect(angleButton('front').getAttribute('aria-pressed')).toBe('true')
  })

  it('angle buttons set front / 3/4 / side / back and turn the short way', () => {
    openWardrobe()
    fire(angleButton('threeQuarter'), 'click')
    expect(yaw()).toBeCloseTo(ROSARI_VIEW_ANGLES.threeQuarter)
    expect(angleButton('threeQuarter').getAttribute('aria-pressed')).toBe('true')
    expect(angleButton('front').getAttribute('aria-pressed')).toBe('false')
    fire(angleButton('side'), 'click')
    expect(yaw()).toBeCloseTo(Math.PI / 2)
    fire(angleButton('back'), 'click')
    expect(yaw()).toBeCloseTo(Math.PI)
    fire(angleButton('front'), 'click')
    // Front is 0 or 2π; either is a half turn from π, never more.
    expect(Math.abs(yaw() - Math.PI)).toBeCloseTo(Math.PI)
    expect(Math.cos(yaw())).toBeCloseTo(1)
    // After several full drags the target stays within half a turn of where she already is.
    scene.props.viewYawRef.current = 7 * Math.PI / 2 + 0.1
    fire(angleButton('side'), 'click')
    expect(Math.abs(yaw() - (7 * Math.PI / 2 + 0.1))).toBeLessThanOrEqual(Math.PI)
    expect(Math.sin(yaw())).toBeCloseTo(1)
  })

  it('←/→ turn Rosari while open (window or inside the wardrobe, no double step) and never walk her', () => {
    openWardrobe()
    key(window, 'ArrowRight')
    expect(yaw()).toBeCloseTo(ROSARI_VIEW_KEY_STEP)
    expect(angleButton('front').getAttribute('aria-pressed')).toBe('false')
    // Focus starts on the wardrobe close button: the key goes through the dialog's handler once.
    const closeButton = container.querySelector('[aria-label="옷장 닫기"]')
    key(closeButton, 'ArrowLeft')
    key(closeButton, 'ArrowLeft')
    expect(yaw()).toBeCloseTo(-ROSARI_VIEW_KEY_STEP)
    expect(scene.props.keyboardKeysRef.current).toEqual({ up: false, down: false, left: false, right: false })
    // Up/down still do nothing while the wardrobe is open.
    key(window, 'ArrowUp')
    expect(yaw()).toBeCloseTo(-ROSARI_VIEW_KEY_STEP)
    expect(scene.props.keyboardKeysRef.current.up).toBe(false)
  })

  it('arrow keys do not turn Rosari while the outfit table is on top', () => {
    openWardrobe()
    fire(container.querySelector('[data-outfit-table-open]'), 'click')
    key(window, 'ArrowRight')
    expect(yaw()).toBe(0)
  })

  it('drag / swipe on the scene turns Rosari by horizontal distance, one pointer at a time', () => {
    openWardrobe()
    const surface = container.querySelector('[data-wardrobe-rotate-surface]')
    expect(surface.style.touchAction).toBe('none')
    fire(surface, 'pointerdown', { pointerId: 7, button: 0, clientX: 100 })
    fire(surface, 'pointermove', { pointerId: 7, clientX: 150 })
    expect(yaw()).toBeCloseTo(50 * ROSARI_VIEW_DRAG_RAD_PER_PX)
    // A second finger does not take over or add rotation.
    fire(surface, 'pointerdown', { pointerId: 8, button: 0, clientX: 300 })
    fire(surface, 'pointermove', { pointerId: 8, clientX: 400 })
    expect(yaw()).toBeCloseTo(50 * ROSARI_VIEW_DRAG_RAD_PER_PX)
    fire(surface, 'pointermove', { pointerId: 7, clientX: 120 })
    expect(yaw()).toBeCloseTo(20 * ROSARI_VIEW_DRAG_RAD_PER_PX)
    expect(container.querySelector('[data-view-angle][aria-pressed="true"]')).toBeNull()
    fire(surface, 'pointerup', { pointerId: 7, clientX: 120 })
    fire(surface, 'pointermove', { pointerId: 7, clientX: 500 })
    expect(yaw()).toBeCloseTo(20 * ROSARI_VIEW_DRAG_RAD_PER_PX)
  })
})

describe('wardrobe sheet layout', () => {
  it('portrait rooms use a bottom sheet capped at 40%; landscape and desktop use the side panel', () => {
    expect(getRosariRoomLayout({ width: 390, height: 844 }).wardrobeSheet).toBe('bottom')
    expect(getRosariRoomLayout({ width: 1280, height: 800 }).wardrobeSheet).toBe('side')
    expect(getRosariRoomLayout({ width: 844, height: 390 }).wardrobeSheet).toBe('side')

    act(() => scene.resize([{ contentRect: { width: 390, height: 844 } }]))
    openWardrobe()
    let dialog = container.querySelector('[role="dialog"][aria-label="로자리 옷장"]')
    expect(dialog.dataset.wardrobeSheet).toBe('bottom')
    expect(dialog.style.maxHeight).toBe('40%')
    expect(dialog.style.bottom).toBe('4px')
    expect(dialog.style.left).toBe('4px')
    expect(dialog.style.right).toBe('4px')
    expect(dialog.style.top).toBe('')
    expect(scene.props.wardrobeSheet).toBe('bottom')
    // The angle bar sits at the top of the stage, above Rosari, never under the sheet.
    expect(container.querySelector('[data-wardrobe-angle-bar]').style.top).toBe('6px')

    act(() => scene.resize([{ contentRect: { width: 1280, height: 800 } }]))
    dialog = container.querySelector('[role="dialog"][aria-label="로자리 옷장"]')
    expect(dialog.dataset.wardrobeSheet).toBe('side')
    expect(dialog.style.top).toBe('4px')
    expect(dialog.style.right).toBe('4px')
    expect(dialog.style.bottom).toBe('')
    expect(dialog.style.maxHeight).not.toBe('40%')
    expect(scene.props.wardrobeSheet).toBe('side')
    // Existing behaviour is untouched: outfit choice still works in the side panel.
    fire(dialog.querySelector('[data-outfit-id="winter"]'), 'click')
    expect(scene.props.outfitId).toBe('winter')
  })
})

// Projects Rosari's silhouette corners through the real camera (incl. view offset) into stage pixels.
function projectRosari(size, layout, position) {
  const camera = new THREE.PerspectiveCamera(50, size.width / size.height, 0.1, 1000)
  const restore = enterRosariWardrobeView(camera, layout)
  camera.updateMatrixWorld()
  const points = []
  for (const x of [-0.5, 0.5]) for (const y of [0, 1.55]) for (const z of [-0.3, 0.3]) {
    const ndc = new THREE.Vector3(position.x + x, y, position.z + z).project(camera)
    points.push({ x: (ndc.x + 1) / 2 * size.width, y: (1 - ndc.y) / 2 * size.height, y3: y })
  }
  restore()
  return points
}

describe('wardrobe view camera', () => {
  it.each([
    [{ width: 374, height: 650 }, 'bottom'],
    [{ width: 219, height: 300 }, 'bottom'],
    [{ width: 1100, height: 640 }, 'side'],
    [{ width: 670, height: 330 }, 'side'],
  ])('frames Rosari full-body, large and centred in the free part of a %o stage (%s)', (size, sheet) => {
    for (const position of [{ x: 0, z: 0.65 }, { x: -2.6, z: -0.3 }]) {
      const layout = getRosariWardrobeViewLayout(size, { position, sheet })
      const insets = getRosariWardrobeViewInsets(size, sheet)
      const points = projectRosari(size, layout, position)
      const free = { left: insets.left, right: size.width - insets.right, top: insets.top, bottom: size.height - insets.bottom }
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(free.left - 0.5)
        expect(point.x).toBeLessThanOrEqual(free.right + 0.5)
        expect(point.y).toBeGreaterThanOrEqual(free.top - 0.5)
        expect(point.y).toBeLessThanOrEqual(free.bottom + 0.5)
      }
      const heights = points.map((point) => point.y)
      const bodyHeight = Math.max(...heights) - Math.min(...heights)
      // Close up: Rosari fills most of the free height or (narrow stages) most of the free width.
      const widths = points.map((point) => point.x)
      const bodyWidth = Math.max(...widths) - Math.min(...widths)
      expect(Math.max(bodyHeight / (free.bottom - free.top), bodyWidth / (free.right - free.left))).toBeGreaterThan(0.6)
      const centreX = (Math.max(...widths) + Math.min(...widths)) / 2
      expect(Math.abs(centreX - (free.left + free.right) / 2)).toBeLessThan((free.right - free.left) * 0.1)
      // The near plane sits in front of her, so nothing between the camera and Rosari can cover her.
      const camera = new THREE.Vector3(...layout.position)
      const distance = camera.distanceTo(new THREE.Vector3(...layout.target))
      expect(layout.near).toBeLessThan(distance - 0.5)
      expect(layout.near).toBeGreaterThan(0.1)
    }
  })

  it('restores the exact previous room camera on exit', () => {
    const size = { width: 374, height: 650 }
    const position = { x: -2.6, z: -0.3 }
    const camera = new THREE.PerspectiveCamera(50, size.width / size.height, 0.1, 1000)
    const room = getRosariCameraLayout(size, { overview: false, position })
    camera.position.set(...room.position)
    camera.fov = room.fov
    camera.lookAt(...room.target)
    camera.updateProjectionMatrix()
    const before = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov, near: camera.near, projection: camera.projectionMatrix.clone() }

    const restore = enterRosariWardrobeView(camera, getRosariWardrobeViewLayout(size, { position, sheet: 'bottom' }))
    expect(camera.position.equals(before.position)).toBe(false)
    expect(camera.view?.enabled).toBe(true)
    expect(camera.near).toBeGreaterThan(before.near)
    restore()
    expect(camera.position.equals(before.position)).toBe(true)
    expect(camera.quaternion.equals(before.quaternion)).toBe(true)
    expect(camera.fov).toBe(before.fov)
    expect(camera.near).toBe(before.near)
    expect(camera.view === null || camera.view.enabled === false).toBe(true)
    expect(camera.projectionMatrix.equals(before.projection)).toBe(true)
  })

  it('turns Rosari smoothly toward the chosen angle and restores her previous facing exactly on exit', () => {
    const rosari = new THREE.Group()
    rosari.rotation.y = 2.4
    rosari.position.set(-1.2, 0, 0.3)
    const state = { savedFacing: null, displayYaw: 0 }
    const frame = (wardrobeOpen, targetYaw) => updateRosariViewFacing(rosari, state, { wardrobeOpen, targetYaw, delta: 1 / 60 })
    frame(true, 0)
    // First frame starts from where she faced: a smooth turn, not a snap.
    expect(rosari.rotation.y).toBeLessThan(2.4)
    expect(rosari.rotation.y).toBeGreaterThan(1.9)
    for (let i = 0; i < 90; i += 1) frame(true, 0)
    expect(rosari.rotation.y).toBeCloseTo(0, 3)
    for (let i = 0; i < 90; i += 1) frame(true, Math.PI)
    expect(rosari.rotation.y).toBeCloseTo(Math.PI, 3)
    frame(false, Math.PI)
    expect(rosari.rotation.y).toBe(2.4)
    expect(rosari.position.toArray()).toEqual([-1.2, 0, 0.3])
    // Closed frames leave her facing to the room movement code.
    rosari.rotation.y = -1
    frame(false, 0)
    expect(rosari.rotation.y).toBe(-1)
    // Reopening snapshots the new facing.
    frame(true, 0)
    frame(false, 0)
    expect(rosari.rotation.y).toBe(-1)
  })
})
