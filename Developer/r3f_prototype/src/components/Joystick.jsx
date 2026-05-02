import { useEffect, useRef } from 'react'
import nipplejs from 'nipplejs'
import { joystickDir } from '../lib/joystick.js'
import { useGameStore } from '../store/useGameStore.js'

export default function Joystick() {
  const phase      = useGameStore((s) => s.phase)
  const zoneRef    = useRef(null)
  const managerRef = useRef(null)
  const phaseRef   = useRef(phase)

  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    const zone = zoneRef.current
    if (!zone) return

    const manager = nipplejs.create({
      zone,
      mode: 'dynamic',       // 손댄 자리에 생성
      dynamicPage: true,
      color: 'white',
      restOpacity: 0,
    })
    managerRef.current = manager

    manager.on('move', (_, data) => {
      if (phaseRef.current !== 'playing') return
      const rad = (data.angle?.radian ?? 0)
      const force = Math.min(data.force ?? 0, 1)
      joystickDir.x =  Math.cos(rad) * force
      joystickDir.z = -Math.sin(rad) * force
    })

    manager.on('end', () => {
      joystickDir.x = 0
      joystickDir.z = 0
    })

    return () => {
      manager.destroy()
      managerRef.current = null
    }
  }, [])

  return (
    <div
      ref={zoneRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        // playing 중에만 터치 수신
        pointerEvents: phase === 'playing' ? 'auto' : 'none',
      }}
    />
  )
}
