import { useRef, useState } from 'react'
import { joystickDir } from '../lib/joystick.js'
import { useGameStore } from '../store/useGameStore.js'

const BASE_R = 60   // 바깥 원 반지름 px
const KNOB_R = 26   // 노브 반지름 px
const MAX_R  = 48   // 노브 최대 이동 거리 px

export default function Joystick() {
  const phase    = useGameStore((s) => s.phase)
  const active   = useRef(false)
  const pid      = useRef(null)
  const origin   = useRef({ x: 0, y: 0 })
  const [pos,  setPos]  = useState({ ox: 0, oy: 0, kx: 0, ky: 0 })
  const [show, setShow] = useState(false)

  function down(e) {
    if (pid.current !== null) return
    pid.current = e.pointerId
    active.current = true
    origin.current = { x: e.clientX, y: e.clientY }
    setPos({ ox: e.clientX, oy: e.clientY, kx: 0, ky: 0 })
    setShow(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function move(e) {
    if (!active.current || e.pointerId !== pid.current) return
    const dx = e.clientX - origin.current.x
    const dy = e.clientY - origin.current.y
    const d  = Math.hypot(dx, dy)
    const r  = Math.min(d, MAX_R)
    const nx = d > 0 ? dx / d : 0
    const ny = d > 0 ? dy / d : 0
    setPos(p => ({ ...p, kx: nx * r, ky: ny * r }))
    joystickDir.x = d > 5 ? nx : 0
    joystickDir.z = d > 5 ? ny : 0
  }

  function up(e) {
    if (e.pointerId !== pid.current) return
    pid.current = null
    active.current = false
    joystickDir.x = 0
    joystickDir.z = 0
    setShow(false)
  }

  return (
    <div
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{
        position: 'fixed', inset: 0,
        zIndex: 9999,
        touchAction: 'none',
        pointerEvents: phase === 'playing' ? 'auto' : 'none',
        // 디버그용으로 배경 없음 (투명)
        background: 'transparent',
      }}
    >
      {show && (
        <div
          style={{
            position: 'absolute',
            left: pos.ox - BASE_R,
            top:  pos.oy - BASE_R,
            width:  BASE_R * 2,
            height: BASE_R * 2,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.5)',
            background: 'rgba(0,0,0,0.25)',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            position: 'absolute',
            left:   BASE_R + pos.kx - KNOB_R,
            top:    BASE_R + pos.ky - KNOB_R,
            width:  KNOB_R * 2,
            height: KNOB_R * 2,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.55)',
            border: '2px solid rgba(255,255,255,0.9)',
            pointerEvents: 'none',
          }} />
        </div>
      )}
    </div>
  )
}
