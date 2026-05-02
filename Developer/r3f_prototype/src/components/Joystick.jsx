import { useRef, useState } from 'react'
import { joystickDir } from '../lib/joystick.js'
import { useGameStore } from '../store/useGameStore.js'

const BASE_R = 60
const KNOB_R = 26
const MAX_R  = 48

export default function Joystick() {
  const phase   = useGameStore((s) => s.phase)
  const tidRef  = useRef(null)
  const origRef = useRef({ x: 0, y: 0 })

  const [show, setShow] = useState(false)
  const [ox, setOx]     = useState(0)
  const [oy, setOy]     = useState(0)
  const [kx, setKx]     = useState(0)
  const [ky, setKy]     = useState(0)

  function onTouchStart(e) {
    if (tidRef.current !== null) return
    const t = e.changedTouches[0]
    tidRef.current = t.identifier
    origRef.current = { x: t.clientX, y: t.clientY }
    setOx(t.clientX)
    setOy(t.clientY)
    setKx(0); setKy(0)
    setShow(true)
  }

  function onTouchMove(e) {
    if (tidRef.current === null) return
    let t = null
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === tidRef.current) {
        t = e.changedTouches[i]; break
      }
    }
    if (!t) return
    const dx = t.clientX - origRef.current.x
    const dy = t.clientY - origRef.current.y
    const d  = Math.hypot(dx, dy)
    const r  = Math.min(d, MAX_R)
    const nx = d > 0 ? dx / d : 0
    const ny = d > 0 ? dy / d : 0
    setKx(nx * r)
    setKy(ny * r)
    joystickDir.x = d > 5 ? nx : 0
    joystickDir.z = d > 5 ? ny : 0
  }

  function onTouchEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === tidRef.current) {
        tidRef.current = null
        setShow(false)
        setKx(0); setKy(0)
        joystickDir.x = 0
        joystickDir.z = 0
        break
      }
    }
  }

  return (
    <>
      {/* 터치 수신 오버레이 — 투명, 전체 화면 */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 9999,
          touchAction: 'none',
          pointerEvents: phase === 'playing' ? 'auto' : 'none',
        }}
      />

      {/* 조이스틱 UI — 터치한 위치에 고정 렌더 */}
      {show && (
        <div style={{
          position: 'fixed',
          left: ox - BASE_R,
          top:  oy - BASE_R,
          width:  BASE_R * 2,
          height: BASE_R * 2,
          borderRadius: '50%',
          border: '2.5px solid rgba(255,255,255,0.55)',
          background: 'rgba(0,0,0,0.22)',
          zIndex: 10000,
          pointerEvents: 'none',
          touchAction: 'none',
        }}>
          <div style={{
            position: 'absolute',
            left:   BASE_R + kx - KNOB_R,
            top:    BASE_R + ky - KNOB_R,
            width:  KNOB_R * 2,
            height: KNOB_R * 2,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            border: '2px solid rgba(255,255,255,0.95)',
          }} />
        </div>
      )}
    </>
  )
}
