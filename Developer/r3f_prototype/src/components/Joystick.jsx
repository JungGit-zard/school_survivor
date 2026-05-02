import { useEffect, useRef, useState } from 'react'
import { joystickDir } from '../lib/joystick.js'

const MAX_R = 52   // 조이스틱 최대 이동 반경 (px)
const BASE_R = 70  // 베이스 원 반지름 (px)
const KNOB_R = 32  // 노브 반지름 (px)

export default function Joystick() {
  const containerRef = useRef(null)
  const touchIdRef   = useRef(null)
  const originRef    = useRef({ x: 0, y: 0 })

  const [visible, setVisible]  = useState(false)
  const [origin,  setOrigin]   = useState({ x: 0, y: 0 })
  const [knob,    setKnob]     = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e) {
      // 이미 추적 중인 터치가 있으면 무시
      if (touchIdRef.current !== null) return

      const t = e.changedTouches[0]
      const rect = el.getBoundingClientRect()
      const ox = t.clientX - rect.left
      const oy = t.clientY - rect.top

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
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          t = e.changedTouches[i]; break
        }
      }
      if (!t) return

      const rect = el.getBoundingClientRect()
      const dx = (t.clientX - rect.left) - originRef.current.x
      const dy = (t.clientY - rect.top)  - originRef.current.y
      const dist = Math.hypot(dx, dy)
      const clamp = Math.min(dist, MAX_R)
      const nx = dist > 0 ? dx / dist : 0
      const ny = dist > 0 ? dy / dist : 0

      setKnob({ x: nx * clamp, y: ny * clamp })

      // 게임 이동 방향 (z가 화면 아래 = 맵 앞)
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

    el.addEventListener('touchstart',  onTouchStart,  { passive: true })
    el.addEventListener('touchmove',   onTouchMove,   { passive: true })
    el.addEventListener('touchend',    onTouchEnd,    { passive: true })
    el.addEventListener('touchcancel', onTouchEnd,    { passive: true })
    return () => {
      el.removeEventListener('touchstart',  onTouchStart)
      el.removeEventListener('touchmove',   onTouchMove)
      el.removeEventListener('touchend',    onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
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
            background: 'rgba(255,255,255,0.10)',
            border: '2px solid rgba(255,255,255,0.35)',
            pointerEvents: 'none',
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
              background: 'rgba(255,255,255,0.40)',
              border: '2px solid rgba(255,255,255,0.70)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}
    </div>
  )
}
