// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ROSARI_ROOM_BOUNDS,
  isRosariTextEntryTarget,
  moveRosariRoomPosition,
  resolveRosariMoveVector,
} from '../lib/rosariRoom.js'
import { joystickDir } from '../lib/refs.js'

const scene = vi.hoisted(() => ({ props: null }))
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => { scene.props = children.props.children.props; return <canvas data-testid="room-canvas" /> },
  useFrame: vi.fn(), useThree: vi.fn(),
}))
vi.mock('@react-three/drei', () => ({ Html: ({ children }) => children, useGLTF: Object.assign(vi.fn(), { preload: vi.fn(), clear: vi.fn() }) }))
import RosariRoom from './RosariRoom.jsx'

const NO_KEYS = { up: false, down: false, left: false, right: false }
const IDLE_STICK = { x: 0, z: 0, active: false }
// Mirrors the useFrame step: resolve the vector, then move with collision/bounds.
function walk(start, keys, joystick, seconds, speed = 1.85, dt = 1 / 60) {
  let position = start
  const out = { x: 0, z: 0 }
  for (let t = 0; t < seconds; t += dt) {
    const v = resolveRosariMoveVector(keys, joystick, out)
    position = moveRosariRoomPosition(position, { x: v.x * speed * dt, z: v.z * speed * dt })
  }
  return position
}

describe('Rosari room movement vector', () => {
  it('moves forward (up = -z) while W is held and stays still when released', () => {
    const start = { x: 0, z: 0.65 }
    const moved = walk(start, { ...NO_KEYS, up: true }, IDLE_STICK, 0.5)
    expect(moved.z).toBeLessThan(start.z - 0.5)
    expect(moved.x).toBeCloseTo(0)
    expect(walk(start, NO_KEYS, IDLE_STICK, 0.5)).toEqual(start)
  })

  it('normalizes diagonals so W+D is not faster than W', () => {
    const v = resolveRosariMoveVector({ ...NO_KEYS, up: true, right: true }, IDLE_STICK)
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(1)
    expect(v.x).toBeGreaterThan(0)
    expect(v.z).toBeLessThan(0)
  })

  it('lets an active drag joystick override keys and caps its magnitude at 1', () => {
    expect(resolveRosariMoveVector({ ...NO_KEYS, up: true }, { x: 0.5, z: 0, active: true })).toEqual({ x: 0.5, z: 0 })
    const capped = resolveRosariMoveVector(NO_KEYS, { x: 3, z: 4, active: true })
    expect(Math.hypot(capped.x, capped.z)).toBeCloseTo(1)
    expect(resolveRosariMoveVector({ ...NO_KEYS, left: true }, { x: 0, z: 0, active: true })).toEqual({ x: -1, z: 0 })
  })

  it('clamps at the room boundary no matter how long a key is held', () => {
    const end = walk({ x: 0, z: 0.65 }, { ...NO_KEYS, down: true }, IDLE_STICK, 10)
    expect(end.z).toBe(ROSARI_ROOM_BOUNDS.maxZ)
    const right = walk({ x: 0, z: 0.65 }, { ...NO_KEYS, right: true }, IDLE_STICK, 10)
    expect(right.x).toBe(ROSARI_ROOM_BOUNDS.maxX)
  })

  it('treats inputs, textareas and contenteditable as text entry targets', () => {
    expect(isRosariTextEntryTarget(document.createElement('input'))).toBe(true)
    expect(isRosariTextEntryTarget(document.createElement('textarea'))).toBe(true)
    expect(isRosariTextEntryTarget({ isContentEditable: true })).toBe(true)
    expect(isRosariTextEntryTarget(document.createElement('button'))).toBe(false)
    expect(isRosariTextEntryTarget(window)).toBe(false)
  })
})

describe('Rosari room input wiring', () => {
  let container, root
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    container = document.createElement('div'); document.body.append(container)
    root = createRoot(container)
    act(() => root.render(<RosariRoom onBack={vi.fn()} />))
  })
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })

  const keyboard = () => scene.props.keyboardKeysRef.current
  const key = (type, k, code, target = window) => act(() => {
    target.dispatchEvent(new KeyboardEvent(type, { key: k, code, bubbles: true, cancelable: true }))
  })

  it('holds W / ArrowRight as up / right and releases on keyup', () => {
    key('keydown', 'w', 'KeyW')
    key('keydown', 'ArrowRight', 'ArrowRight')
    expect(keyboard()).toMatchObject({ up: true, right: true })
    key('keyup', 'w', 'KeyW')
    key('keyup', 'ArrowRight', 'ArrowRight')
    expect(keyboard()).toEqual(NO_KEYS)
  })

  it('ignores movement keys typed into a text field', () => {
    const input = document.createElement('input'); document.body.append(input)
    key('keydown', 'w', 'KeyW', input)
    expect(keyboard().up).toBe(false)
    input.remove()
  })

  it('drives the shared joystick from a canvas drag and stops on release; unmount resets it', () => {
    const stage = container.querySelector('[aria-label="로자리 방 3D 장면"]')
    stage.getBoundingClientRect = () => ({ left: 0, top: 0, right: 390, bottom: 600, width: 390, height: 600 })
    const canvas = container.querySelector('[data-testid="room-canvas"]')
    const touch = (type, x, y, target = canvas) => act(() => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      event.changedTouches = [{ identifier: 7, clientX: x, clientY: y }]
      target.dispatchEvent(event)
    })
    touch('touchstart', 200, 300)
    expect(joystickDir.active).toBe(true)
    touch('touchmove', 260, 300)
    expect(joystickDir.x).toBeGreaterThan(0.9)
    expect(joystickDir.z).toBeCloseTo(0)
    touch('touchend', 260, 300)
    expect(joystickDir).toMatchObject({ x: 0, z: 0, active: false })

    // A touch on an HTML button (wardrobe/camera) must not start the joystick.
    touch('touchstart', 20, 580, container.querySelector('button'))
    expect(joystickDir.active).toBe(false)

    touch('touchstart', 200, 300)
    expect(joystickDir.active).toBe(true)
    act(() => root.unmount())
    expect(joystickDir.active).toBe(false)
    root = createRoot(container)
  })
})
