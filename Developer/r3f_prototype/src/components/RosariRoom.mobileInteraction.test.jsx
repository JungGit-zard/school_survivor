// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'

const scene = vi.hoisted(() => ({ props: null, resize: null }))
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => { scene.props = children.props.children.props; return null },
  useFrame: vi.fn(), useThree: vi.fn(),
}))
vi.mock('@react-three/drei', () => ({ Html: ({ children }) => children, useGLTF: Object.assign(vi.fn(), { preload: vi.fn(), clear: vi.fn() }) }))
import RosariRoom, { RosariModel, RoomErrorBoundary, getRosariCameraLayout, getRosariRoomLayout } from './RosariRoom.jsx'

let container, root
const button = (label) => container.querySelector(`[aria-label="${label}"]`)
const fire = (target, type, data = {}) => act(() => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, data)
  target.dispatchEvent(event)
})
const mobile = () => scene.props.mobileKeysRef.current
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { scene.resize = callback }
    observe() {} disconnect() {}
  })
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container)
  act(() => root.render(<RosariRoom onBack={vi.fn()} />))
})
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })

describe('Rosari actual room container layout', () => {
  it('starts in readable follow view and keeps the whole room available without moving the model', () => {
    expect(scene.props.overview).toBe(false)
    const toggle = [...container.querySelectorAll('button')].find(node => node.textContent === '방 전체 보기')
    expect(toggle.style.minHeight).toBe('44px')
    fire(toggle, 'click')
    expect(scene.props.overview).toBe(true)
    fire(toggle, 'click')
    expect(scene.props.overview).toBe(false)
  })
  it.each([[219,220],[320,569],[844,292]])('keeps the approved character readable in the %sx%s follow view', (width,height) => {
    const position = { x: -2.6, z: -0.3 }
    const layout = getRosariCameraLayout({width,height}, {overview:false,position})
    const camera = new THREE.PerspectiveCamera(layout.fov,width/height,0.1,1000)
    camera.position.set(...layout.position); camera.lookAt(...layout.target); camera.updateMatrixWorld()
    const foot = new THREE.Vector3(position.x,0,position.z).project(camera)
    const head = new THREE.Vector3(position.x,1.32,position.z).project(camera)
    expect(Math.abs(head.y-foot.y)*height/2).toBeGreaterThan(60)
    expect(Math.abs(head.x)).toBeLessThan(0.95)
    expect(Math.abs(head.y)).toBeLessThan(0.95)
    expect(Math.abs(foot.y)).toBeLessThan(0.95)
    expect(layout.target).toEqual([position.x,0.66,position.z])
  })
  it('uses a compact single-line heading without the tall subtitle in a 219x390 parent', () => {
    act(() => scene.resize([{ contentRect: { width: 219, height: 390 } }]))
    expect(container.querySelector('h1').style.fontSize).toBe('16px')
    expect(container.querySelector('h1 + p').hidden).toBe(true)
    expect(button('이동: 위').style.minHeight).toBe('44px')
    act(() => scene.resize([{ contentRect: { width: 390, height: 844 } }]))
    expect(container.querySelector('h1 + p').hidden).toBe(false)
  })
  it('uses a side rail for a wide short room, not the enclosing viewport', () => {
    expect(getRosariRoomLayout({ width: 844, height: 390 }).sideRail).toBe(true)
    expect(getRosariRoomLayout({ width: 219, height: 390 }).sideRail).toBe(false)
    act(() => scene.resize([{ contentRect: { width: 844, height: 390 } }]))
    expect(container.querySelector('main').style.gridTemplateColumns).toContain('158px')
    act(() => scene.resize([{ contentRect: { width: 219, height: 390 } }]))
    expect(container.querySelector('main').style.gridTemplateColumns).toBe('minmax(0, 1fr)')
    expect(button('이동: 위').style.minWidth).toBe('44px')
    expect(container.querySelector('h1').style.whiteSpace).not.toBe('nowrap')
  })

  it.each([[219, 220], [219, 390], [320, 569], [360, 457], [390, 557], [640, 280], [844, 292]])('fits every authored room corner into %sx%s canvas', (width, height) => {
    const layout = getRosariCameraLayout({ width, height })
    const camera = new THREE.PerspectiveCamera(layout.fov, width / height, 0.1, 1000)
    camera.position.set(...layout.position); camera.lookAt(...layout.target); camera.updateMatrixWorld()
    for (const x of [-4.2, 4.2]) for (const y of [-0.07, 3.025]) for (const z of [-3.15, 3.15]) {
      const projected = new THREE.Vector3(x, y, z).project(camera)
      expect(Math.abs(projected.x)).toBeLessThanOrEqual(0.95)
      expect(Math.abs(projected.y)).toBeLessThanOrEqual(0.95)
      expect(projected.z).toBeGreaterThan(-1)
      expect(projected.z).toBeLessThan(1)
    }
  })
})

describe('movement release behavior', () => {
  it('keeps a focused pad held while either Space or Enter is still down', () => {
    const up = button('이동: 위')
    fire(up, 'keydown', { key: ' ', code: 'Space' })
    fire(up, 'keydown', { key: 'Enter', code: 'Enter' })
    fire(up, 'keyup', { key: ' ', code: 'Space' })
    expect(mobile().up).toBe(true)
    fire(up, 'keyup', { key: 'Enter', code: 'Enter' })
    expect(mobile().up).toBe(false)
  })
  it('does not return to title on the repeated Escape that just closed the wardrobe', () => {
    const onBack = vi.fn()
    act(() => root.render(<RosariRoom onBack={onBack} />))
    act(() => scene.props.onWardrobeToggle())
    fire(window, 'keydown', { key: 'Escape', repeat: false })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    fire(window, 'keydown', { key: 'Escape', repeat: true })
    expect(onBack).not.toHaveBeenCalled()
    fire(window, 'keyup', { key: 'Escape' })
    fire(window, 'keydown', { key: 'Escape', repeat: false })
    expect(onBack).toHaveBeenCalledTimes(1)
  })
  it('keeps movement held until both physical keyboard aliases are released', () => {
    fire(window, 'keydown', { key: 'w', code: 'KeyW' })
    fire(window, 'keydown', { key: 'ArrowUp', code: 'ArrowUp' })
    fire(window, 'keyup', { key: 'w', code: 'KeyW' })
    expect(scene.props.keyboardKeysRef.current.up).toBe(true)
    fire(window, 'keyup', { key: 'ArrowUp', code: 'ArrowUp' })
    expect(scene.props.keyboardKeysRef.current.up).toBe(false)
  })
  it('releases the physical key even if Shift changes its key value before keyup', () => {
    fire(window, 'keydown', { key: 'w', code: 'KeyW' })
    fire(window, 'keyup', { key: 'W', code: 'KeyW' })
    expect(scene.props.keyboardKeysRef.current.up).toBe(false)
  })
  it('clears captured pointers and held keys on unmount', () => {
    const up = button('이동: 위')
    up.setPointerCapture = vi.fn(); up.hasPointerCapture = () => true; up.releasePointerCapture = vi.fn()
    fire(up, 'pointerdown', { pointerId: 7, button: 0 })
    fire(window, 'keydown', { key: 'w' })
    const props = scene.props
    act(() => root.render(null))
    expect(up.releasePointerCapture).toHaveBeenCalledWith(7)
    expect(Object.values(props.mobileKeysRef.current).some(Boolean)).toBe(false)
    expect(Object.values(props.keyboardKeysRef.current).some(Boolean)).toBe(false)
  })
  it.each(['pointerup', 'pointercancel', 'lostpointercapture', 'focusout'])('clears a held direction on %s', (type) => {
    const up = button('이동: 위')
    up.setPointerCapture = vi.fn(); up.hasPointerCapture = () => true; up.releasePointerCapture = vi.fn()
    fire(up, 'pointerdown', { pointerId: 4, button: 0 })
    expect(mobile().up).toBe(true)
    expect(up.getAttribute('aria-pressed')).toBe('true')
    expect(up.setPointerCapture).toHaveBeenCalledWith(4)
    fire(up, type, { pointerId: 4 })
    expect(mobile().up).toBe(false)
    expect(up.getAttribute('aria-pressed')).toBe('false')
    if (type === 'pointerup' || type === 'pointercancel') expect(up.releasePointerCapture).toHaveBeenCalledWith(4)
  })
  it('does not release another pointer still holding the same direction', () => {
    const up = button('이동: 위')
    fire(up, 'pointerdown', { pointerId: 4, button: 0 })
    fire(up, 'pointerdown', { pointerId: 5, button: 0 })
    fire(up, 'pointerup', { pointerId: 4 })
    expect(mobile().up).toBe(true)
    fire(up, 'pointercancel', { pointerId: 5 })
    expect(mobile().up).toBe(false)
  })
  it.each([' ', 'Enter'])('holds focused dpad with %s and stops on keyup', (key) => {
    const up = button('이동: 위')
    fire(up, 'keydown', { key }); expect(mobile().up).toBe(true)
    fire(up, 'keyup', { key }); expect(mobile().up).toBe(false)
  })
  it('clears keyboard and touch movement on blur and document hide', () => {
    fire(window, 'keydown', { key: 'w' }); fire(button('이동: 오른쪽'), 'pointerdown', { pointerId: 3, button: 0 })
    expect(scene.props.keyboardKeysRef.current.up).toBe(true)
    fire(window, 'blur')
    expect(Object.values(mobile()).some(Boolean)).toBe(false)
    expect(Object.values(scene.props.keyboardKeysRef.current).some(Boolean)).toBe(false)
    fire(button('이동: 위'), 'pointerdown', { pointerId: 1, button: 0 })
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fire(document, 'visibilitychange')
    expect(Object.values(mobile()).some(Boolean)).toBe(false)
    vi.restoreAllMocks()
  })
})

describe('wardrobe close and scrolling', () => {
  it('clears a cached rejected room GLB before retry and remounts without evicting successful loads', () => {
    const errors = vi.spyOn(console,'error').mockImplementation(() => {})
    const rejected = new Error('cached room asset rejected')
    let failed = true
    useThree.mockReturnValue({gl:{getSize: target => target.set(219,220)}})
    useGLTF.mockImplementation(() => { if(failed) throw rejected; return {scene:new THREE.Group()} })
    useGLTF.clear.mockImplementation(() => { failed=false })
    try {
      act(() => root.render(<RoomErrorBoundary><RosariModel refObject={{current:null}} limbRefs={{current:{}}} /></RoomErrorBoundary>))
      expect(container.querySelector('[role="alert"]')).not.toBeNull()
      fire(container.querySelector('button'),'click')
      expect(useGLTF.clear).toHaveBeenCalledExactlyOnceWith('/assets/rosari-room/PLAYER_wholebody_refined_t_efe49b7c.glb')
      expect(container.querySelector('[role="alert"]')).toBeNull()
    } finally { errors.mockRestore(); useGLTF.mockReset(); useGLTF.clear.mockReset() }
  })
  it('keeps room-scoped error feedback and can retry without changing the title lifecycle', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let fail = true
    function Content() { if (fail) throw new Error('room load rejected'); return <p>room ready</p> }
    try {
      act(() => root.render(<RoomErrorBoundary><Content /></RoomErrorBoundary>))
      expect(container.querySelector('[role="alert"]').textContent).toContain('방을 불러오지 못했어요')
      fail = false
      fire(container.querySelector('button'), 'click')
      expect(container.textContent).toBe('room ready')
    } finally { errors.mockRestore() }
  })
  it('clears held movement when opening and refuses keyboard/touch movement until closed', () => {
    fire(button('이동: 위'), 'pointerdown', { pointerId: 2, button: 0 })
    fire(window, 'keydown', { key: 'd' })
    act(() => scene.props.onWardrobeToggle())
    expect(Object.values(mobile()).some(Boolean)).toBe(false)
    expect(Object.values(scene.props.keyboardKeysRef.current).some(Boolean)).toBe(false)
    expect(button('이동: 위').disabled).toBe(true)
    fire(window, 'keydown', { key: 'w' })
    fire(button('이동: 위'), 'pointerdown', { pointerId: 3, button: 0 })
    expect(Object.values(mobile()).some(Boolean)).toBe(false)
    expect(Object.values(scene.props.keyboardKeysRef.current).some(Boolean)).toBe(false)
    fire(button('옷장 닫기'), 'click')
    expect(button('이동: 위').disabled).toBe(false)
  })
  it('keeps its own close enabled when far, border-box bounded and header outside the scroll body', () => {
    const toggle = () => [...container.querySelectorAll('button')].find((node) => node.textContent === '옷장 열기')
    expect(toggle().disabled).toBe(true)
    act(() => scene.props.onNearWardrobeChange(true))
    fire(toggle(), 'click')
    act(() => scene.props.onNearWardrobeChange(false))
    const dialog = container.querySelector('[role="dialog"]')
    const close = button('옷장 닫기')
    expect(close.disabled).toBe(false)
    expect(close.style.minHeight).toBe('44px')
    expect(close.style.flexShrink).toBe('0')
    expect(dialog.style.boxSizing).toBe('border-box')
    expect(dialog.style.touchAction).toBe('pan-y')
    expect(container.querySelector('main').style.touchAction).not.toBe('none')
    expect(dialog.querySelector('[data-wardrobe-scroll]').style.overflowY).toBe('auto')
    expect(dialog.querySelector('[data-wardrobe-scroll]').contains(close)).toBe(false)
    fire(close, 'click')
    expect(container.querySelector('[role="dialog"]')).toBe(null)
    expect(toggle().disabled).toBe(true)
  })
  it('returns keyboard focus to the wardrobe action after closing with Escape', () => {
    act(() => scene.props.onNearWardrobeChange(true))
    const toggle = [...container.querySelectorAll('button')].find((node) => node.textContent === '옷장 열기')
    fire(toggle, 'click')
    expect(document.activeElement).toBe(button('옷장 닫기'))
    fire(button('옷장 닫기'), 'keydown', { key: 'Escape' })
    expect(container.querySelector('[role="dialog"]')).toBe(null)
    expect(document.activeElement).toBe(toggle)
  })
})
