import { useRef, useState } from 'react'
import { joystickDir } from '../lib/joystick.js'
import { useGameStore } from '../store/useGameStore.js'

const MAX_R = 52
const BASE_R = 70
const KNOB_R = 30

export default function Joystick() {
  const phase      = useGameStore((s) => s.phase)
  const ptrIdRef   = useRef(null)
  const originRef  = useRef({ x: 0, y: 0 })

  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  const [knob,   setKnob]   = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  function onPointerDown(e) {
    if (ptrIdRef.current !== null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    ptrIdRef.current = e.pointerId
    originRef.current = { x: e.clientX, y: e.clientY }
    setOrigin({ x: e.clientX, y: e.clientY })
    setKnob({ x: 0, y: 0 })
    setActive(true)
  }

  function onPointerMove(e) {
    if (ptrIdRef.current !== e.pointerId) return
    const dx = e.clientX - originRef.current.x
    const dy = e.clientY - originRef.current.y
    const dist = Math.hypot(dx, dy)
    const r  = Math.min(dist, MAX_R)
    const nx = dist > 0 ? dx / dist : 0
    const ny = dist > 0 ? dy / dist : 0
    setKnob({ x: nx * r, y: ny * r })
    joystickDir.x = dist > 4 ? nx : 0
    joystickDir.z = dist > 4 ? ny : 0
  }

  function onPointerUp(e) {
    if (ptrIdRef.current !== e.pointerId) return
    ptrIdRef.current = null
    setActive(false)
    setKnob({ x: 0, y: 0 })
    joystickDir.x = 0
    joystickDir.z = 0
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        touchAction: 'none',
        pointerEvents: phase === 'playing' ? 'auto' : 'none',
      }}
    >
      {active && (
        <>
          {/* 베이스 원 */}
          <div style={{
            position: 'fixed',
            left: origin.x - BASE_R,
            top:  origin.y - BASE_R,
            width:  BASE_R * 2,
            height: BASE_R * 2,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.10)',
            border: '2.5px solid rgba(255,255,255,0.45)',
            pointerEvents: 'none',
          }}>
            {/* 노브 */}
            <div style={{
              position: 'absolute',
              left:   BASE_R + knob.x - KNOB_R,
              top:    BASE_R + knob.y - KNOB_R,
              width:  KNOB_R * 2,
              height: KNOB_R * 2,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.45)',
              border: '2px solid rgba(255,255,255,0.80)',
              pointerEvents: 'none',
            }} />
          </div>
        </>
      )}
    </div>
  )
}
