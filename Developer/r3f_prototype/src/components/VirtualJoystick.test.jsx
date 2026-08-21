// @vitest-environment jsdom
import React, { act, createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import VirtualJoystick from './VirtualJoystick.jsx'
import { joystickDir } from '../lib/refs.js'

function resetRuntimeInput() {
  joystickDir.x = 0
  joystickDir.z = 0
  joystickDir.active = false
}

function makeTouchEvent(type, touch, target) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'changedTouches', { value: [touch] })
  Object.defineProperty(event, 'target', { value: target })
  return event
}

function renderJoystick({ enabled = true, phase = 'playing' } = {}) {
  const container = document.createElement('div')
  const playArea = document.createElement('div')
  const canvas = document.createElement('canvas')
  const playAreaRef = createRef()
  let currentEnabled = enabled
  let currentPhase = phase

  document.body.appendChild(container)
  playArea.appendChild(canvas)
  document.body.appendChild(playArea)
  playAreaRef.current = playArea
  playArea.getBoundingClientRect = () => ({
    left: 10,
    top: 20,
    right: 310,
    bottom: 620,
    width: 300,
    height: 600,
  })

  const root = createRoot(container)
  function rerender() {
    act(() => {
      root.render(<VirtualJoystick enabled={currentEnabled} phase={currentPhase} playAreaRef={playAreaRef} />)
    })
  }

  rerender()

  return {
    canvas,
    container,
    playArea,
    root,
    startAt(x, y, target = canvas) {
      act(() => {
        window.dispatchEvent(makeTouchEvent('touchstart', { identifier: 1, clientX: x, clientY: y }, target))
      })
    },
    moveTo(x, y, target = canvas) {
      act(() => {
        window.dispatchEvent(makeTouchEvent('touchmove', { identifier: 1, clientX: x, clientY: y }, target))
      })
    },
    endAt(x, y, target = canvas) {
      act(() => {
        window.dispatchEvent(makeTouchEvent('touchend', { identifier: 1, clientX: x, clientY: y }, target))
      })
    },
    cancelAt(x, y, target = canvas) {
      act(() => {
        window.dispatchEvent(makeTouchEvent('touchcancel', { identifier: 1, clientX: x, clientY: y }, target))
      })
    },
    setPhase(nextPhase) {
      currentPhase = nextPhase
      rerender()
    },
    unmount() {
      act(() => root.unmount())
      container.remove()
      playArea.remove()
    },
  }
}

afterEach(() => {
  resetRuntimeInput()
})

describe('VirtualJoystick mobile-only behavior', () => {
  it('does not activate when disabled for desktop/web environments', () => {
    const view = renderJoystick({ enabled: false })

    view.startAt(120, 180)

    expect(view.container.innerHTML).toBe('')
    expect(joystickDir.active).toBe(false)
    view.unmount()
  })

  it('appears at the mobile touch point only when the game canvas is touched during play', () => {
    const view = renderJoystick({ enabled: true, phase: 'playing' })

    view.startAt(120, 180)
    view.moveTo(172, 180)

    expect(view.container.innerHTML).not.toBe('')
    expect(view.container.innerHTML).toContain('left: 110px')
    expect(view.container.innerHTML).toContain('top: 160px')
    expect(view.container.querySelector('[data-testid="cat-paw-joystick-thumb"]')).not.toBeNull()
    expect(joystickDir.active).toBe(true)
    expect(joystickDir.x).toBeGreaterThan(0)

    view.endAt(172, 180)
    expect(view.container.innerHTML).toBe('')
    expect(joystickDir.active).toBe(false)
    view.unmount()
  })

  it('ignores touches outside the play area and touches on HUD/UI elements', () => {
    const view = renderJoystick({ enabled: true, phase: 'playing' })
    const hudButton = document.createElement('button')
    document.body.appendChild(hudButton)

    view.startAt(5, 5)
    expect(view.container.innerHTML).toBe('')
    expect(joystickDir.active).toBe(false)

    view.startAt(120, 180, hudButton)
    expect(view.container.innerHTML).toBe('')
    expect(joystickDir.active).toBe(false)

    hudButton.remove()
    view.unmount()
  })

  it('stays hidden and resets input outside the playing phase', () => {
    const view = renderJoystick({ enabled: true, phase: 'paused' })

    view.startAt(120, 180)

    expect(view.container.innerHTML).toBe('')
    expect(joystickDir.active).toBe(false)
    view.unmount()
  })

  it('resets active input when the game leaves the playing phase', () => {
    const view = renderJoystick({ enabled: true, phase: 'playing' })

    view.startAt(120, 180)
    view.moveTo(172, 180)
    expect(joystickDir.active).toBe(true)

    view.setPhase('paused')

    expect(view.container.innerHTML).toBe('')
    expect(joystickDir).toEqual({ x: 0, z: 0, active: false })
    view.unmount()
  })

  it('resets active input on touchcancel', () => {
    const view = renderJoystick({ enabled: true, phase: 'playing' })

    view.startAt(120, 180)
    view.moveTo(172, 180)
    expect(joystickDir.active).toBe(true)

    view.cancelAt(172, 180)

    expect(view.container.innerHTML).toBe('')
    expect(joystickDir).toEqual({ x: 0, z: 0, active: false })
    view.unmount()
  })

  it('removes touch listeners after unmount', () => {
    const view = renderJoystick({ enabled: true, phase: 'playing' })
    const canvas = view.canvas

    view.unmount()

    act(() => {
      window.dispatchEvent(makeTouchEvent('touchstart', { identifier: 1, clientX: 120, clientY: 180 }, canvas))
    })

    expect(joystickDir.active).toBe(false)
  })
})
