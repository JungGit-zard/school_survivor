import { useEffect, useRef, useState } from 'react'
import { joystickDir } from '../lib/refs.js'

const OUTER_R = 52
const KNOB_R = 22
const DEAD_ZONE = 0.08

const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select, [role="button"]'

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.(INTERACTIVE_SELECTOR))
}

function isCanvasTarget(target) {
  return target?.tagName?.toLowerCase?.() === 'canvas'
}

function isPointInsideRect(x, y, rect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function resetJoystickInput() {
  joystickDir.x = 0
  joystickDir.z = 0
  joystickDir.active = false
}

export default function VirtualJoystick({ enabled = false, phase = 'playing', playAreaRef = null }) {
  const stateRef = useRef({ active: false, touchId: null, cx: 0, cy: 0 })
  const viewRef = useRef({ visible: false, cx: 0, cy: 0, knobX: 0, knobY: 0 })
  const frameRef = useRef(null)
  const [view, setView] = useState({ visible: false, cx: 0, cy: 0, knobX: 0, knobY: 0 })

  useEffect(() => {
    function cancelScheduledView() {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }

    function publishView(nextView, immediate = false) {
      viewRef.current = nextView
      if (immediate) {
        cancelScheduledView()
        setView(nextView)
        return
      }
      if (frameRef.current !== null) return
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        setView(viewRef.current)
      })
    }

    function hideJoystick() {
      cancelScheduledView()
      publishView({ visible: false, cx: 0, cy: 0, knobX: 0, knobY: 0 }, true)
    }

    if (!enabled || phase !== 'playing') {
      stateRef.current.active = false
      stateRef.current.touchId = null
      resetJoystickInput()
      hideJoystick()
      return undefined
    }

    function canStartFromTouch(event, touch) {
      if (isInteractiveTarget(event.target) || !isCanvasTarget(event.target)) return false
      const playArea = playAreaRef?.current
      if (!playArea) return false
      const rect = playArea.getBoundingClientRect()
      return isPointInsideRect(touch.clientX, touch.clientY, rect)
    }

    function getLocalTouchPoint(touch) {
      const rect = playAreaRef.current.getBoundingClientRect()
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }

    function onStart(event) {
      const state = stateRef.current
      if (state.active) return

      const touch = event.changedTouches[0]
      if (!touch) return
      if (!canStartFromTouch(event, touch)) return

      event.preventDefault()
      state.active = true
      state.touchId = touch.identifier
      state.cx = touch.clientX
      state.cy = touch.clientY
      const local = getLocalTouchPoint(touch)
      joystickDir.active = true
      publishView({ visible: true, cx: local.x, cy: local.y, knobX: 0, knobY: 0 }, true)
    }

    function onMove(event) {
      const state = stateRef.current
      if (!state.active) return

      const touch = Array.from(event.changedTouches).find((item) => item.identifier === state.touchId)
      if (!touch) return

      event.preventDefault()
      const rawX = touch.clientX - state.cx
      const rawY = touch.clientY - state.cy
      const distance = Math.hypot(rawX, rawY)
      const clamped = Math.min(distance, OUTER_R)
      const nx = distance > 0 ? rawX / distance : 0
      const ny = distance > 0 ? rawY / distance : 0
      const ratio = clamped / OUTER_R

      publishView({ ...viewRef.current, knobX: nx * clamped, knobY: ny * clamped })

      if (ratio > DEAD_ZONE) {
        joystickDir.x = nx * ratio
        joystickDir.z = ny * ratio
      } else {
        joystickDir.x = 0
        joystickDir.z = 0
      }
    }

    function onEnd(event) {
      const state = stateRef.current
      const released = Array.from(event.changedTouches).some((item) => item.identifier === state.touchId)
      if (!released) return

      state.active = false
      state.touchId = null
      resetJoystickInput()
      hideJoystick()
    }

    window.addEventListener('touchstart', onStart, { passive: false })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: false })
    window.addEventListener('touchcancel', onEnd, { passive: false })

    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
      cancelScheduledView()
      resetJoystickInput()
    }
  }, [enabled, phase, playAreaRef])

  if (!view.visible) return null

  return (
    <div style={{ ...styles.wrap, left: view.cx, top: view.cy }}>
      <div style={{ ...styles.outer, width: OUTER_R * 2, height: OUTER_R * 2, borderRadius: OUTER_R }}>
        <div
          style={{
            ...styles.knob,
            width: KNOB_R * 2,
            height: KNOB_R * 2,
            borderRadius: KNOB_R,
            transform: `translate(calc(-50% + ${view.knobX}px), calc(-50% + ${view.knobY}px))`,
          }}
        />
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    position: 'absolute',
    zIndex: 100,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translate(-50%, -50%)',
  },
  outer: {
    pointerEvents: 'none',
    position: 'relative',
    background: 'rgba(255,255,255,0.12)',
    border: '2.5px solid rgba(255,255,255,0.35)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    background: 'rgba(255,210,60,0.82)',
    border: '2px solid rgba(255,255,255,0.6)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    pointerEvents: 'none',
  },
}
