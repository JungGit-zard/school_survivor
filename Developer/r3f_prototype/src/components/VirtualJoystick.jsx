import { useEffect, useRef } from 'react'
import { joystickDir } from '../lib/refs.js'

const OUTER_R = 52   // px – outer ring radius
const KNOB_R  = 22   // px – knob radius
const DEAD    = 0.08 // normalised dead-zone

export default function VirtualJoystick() {
  const outerRef = useRef(null)
  const knobRef  = useRef(null)
  const stateRef = useRef({ active: false, touchId: null, cx: 0, cy: 0 })

  useEffect(() => {
    const outer = outerRef.current
    const knob  = knobRef.current
    if (!outer || !knob) return

    function setKnob(dx, dy) {
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
    }

    function onStart(e) {
      e.preventDefault()
      const s = stateRef.current
      if (s.active) return
      const touch = e.changedTouches[0]
      const rect  = outer.getBoundingClientRect()
      s.active  = true
      s.touchId = touch.identifier
      s.cx = rect.left + rect.width  / 2
      s.cy = rect.top  + rect.height / 2
      joystickDir.active = true
    }

    function onMove(e) {
      e.preventDefault()
      const s = stateRef.current
      if (!s.active) return
      let touch = null
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === s.touchId) { touch = e.changedTouches[i]; break }
      }
      if (!touch) return
      const rawX = touch.clientX - s.cx
      const rawY = touch.clientY - s.cy
      const dist = Math.hypot(rawX, rawY)
      const clamped = Math.min(dist, OUTER_R)
      const nx = dist > 0 ? rawX / dist : 0
      const ny = dist > 0 ? rawY / dist : 0
      const ratio = clamped / OUTER_R

      setKnob(nx * clamped, ny * clamped)

      if (ratio > DEAD) {
        joystickDir.x = nx * ratio
        joystickDir.z = ny * ratio
      } else {
        joystickDir.x = 0
        joystickDir.z = 0
      }
    }

    function onEnd(e) {
      const s = stateRef.current
      let found = false
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === s.touchId) { found = true; break }
      }
      if (!found) return
      s.active  = false
      s.touchId = null
      joystickDir.x = 0
      joystickDir.z = 0
      joystickDir.active = false
      setKnob(0, 0)
    }

    outer.addEventListener('touchstart',  onStart, { passive: false })
    outer.addEventListener('touchmove',   onMove,  { passive: false })
    outer.addEventListener('touchend',    onEnd,   { passive: false })
    outer.addEventListener('touchcancel', onEnd,   { passive: false })

    return () => {
      outer.removeEventListener('touchstart',  onStart)
      outer.removeEventListener('touchmove',   onMove)
      outer.removeEventListener('touchend',    onEnd)
      outer.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  return (
    <div style={styles.wrap}>
      <div ref={outerRef} style={{ ...styles.outer, width: OUTER_R * 2, height: OUTER_R * 2, borderRadius: OUTER_R }}>
        <div ref={knobRef} style={{ ...styles.knob, width: KNOB_R * 2, height: KNOB_R * 2, borderRadius: KNOB_R }} />
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    position: 'absolute',
    bottom: 36,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    pointerEvents: 'auto',
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
    transform: 'translate(-50%, -50%)',
    background: 'rgba(255,210,60,0.82)',
    border: '2px solid rgba(255,255,255,0.6)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    pointerEvents: 'none',
  },
}
