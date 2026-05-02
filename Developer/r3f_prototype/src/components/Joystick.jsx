import { useEffect, useRef, useState } from 'react'
import { joystickDir } from '../lib/joystick.js'
import { useGameStore } from '../store/useGameStore.js'

const MAX_R = 52
const BASE_R = 70
const KNOB_R = 32

export default function Joystick() {
  const phase      = useGameStore((s) => s.phase)
  const containerRef = useRef(null)
  const touchIdRef   = useRef(null)
  const originRef    = useRef({ x: 0, y: 0 })
  const phaseRef     = useRef(phase)

  const [visible, setVisible] = useState(false)
  const [origin,  setOrigin]  = useState({ x: 0, y: 0 })
  const [knob,    setKnob]    = useState({ x: 0, y: 0 })

  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    function onTouchStart(e) {
      if (phaseRef.current !== 'playing') return
      if (touchIdRef.current !== null) return
      const t = e.changedTouches[0]
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const ox = t.clientX - rect.left
      const oy = t.clientY - rect.top
      if (ox < 0 || oy < 0 || ox > rect.width || oy > rect.height) return

      touchIdRef.current = t.identifier
      originRef.current  = { x: ox, y: oy }
      setOrigin({ x: ox, y: oy })
      setKnob({ x: 0, y: 0 })
      setVisible(true)
    }

    function onTouchMove(e) {
      if (touchIdRef.current === null) return
      let t = null
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) { t = e.changedTouches[i]; break }
      }
      if (!t) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const dx = (t.clientX - rect.left) - originRef.current.x
      const dy = (t.clientY - rect.top)  - originRef.current.y
      const dist = Math.hypot(dx, dy)
      const clamp = Math.min(dist, MAX_R)
      const nx = dist > 0 ? dx / dist : 0
      const ny = dist > 0 ? dy / dist : 0
      setKnob({ x: nx * clamp, y: ny * clamp })
      joystickDir.x = dist > 4 ? nx : 0
      joystickDir.z = dist > 4 ? ny : 0
    }

    function onTouchEnd(e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          touchIdRef.current = null
          setVisible(false)
          setKnob({ x: 0, y: 0 })
          joystickDir.x = 0
          joystickDir.z = 0
          break
        }
      }
    }

    // capture: true → Canvas보다 먼저 이벤트 수신
    document.addEventListener('touchstart',  onTouchStart, { capture: true, passive: true })
    document.addEventListener('touchmove',   onTouchMove,  { capture: true, passive: true })
    document.addEventListener('touchend',    onTouchEnd,   { capture: true, passive: true })
    document.addEventListener('touchcancel', onTouchEnd,   { capture: true, passive: true })
    return () => {
      document.removeEventListener('touchstart',  onTouchStart, true)
      document.removeEventListener('touchmove',   onTouchMove,  true)
      document.removeEventListener('touchend',    onTouchEnd,   true)
      document.removeEventListener('touchcancel', onTouchEnd,   true)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}
    >
      {visible && (
        <div
          style={{
            position: 'absolute',
            left:   origin.x - BASE_R,
            top:    origin.y - BASE_R,
            width:  BASE_R * 2,
            height: BASE_R * 2,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(255,255,255,0.40)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left:   BASE_R + knob.x - KNOB_R,
              top:    BASE_R + knob.y - KNOB_R,
              width:  KNOB_R * 2,
              height: KNOB_R * 2,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.45)',
              border: '2px solid rgba(255,255,255,0.75)',
            }}
          />
        </div>
      )}
    </div>
  )
}
