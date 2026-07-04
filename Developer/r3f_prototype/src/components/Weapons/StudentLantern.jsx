import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos, playerFacing, playerArmActionState } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { applyForwardConeDamage } from '../../lib/weaponTargeting.js'
import { startPlayerArmAction } from '../../lib/playerArmAction.js'

// 학생용 랜턴 (신무기 2026-07-04, 스탯 정본: weaponCatalog.studentLantern)
// 점등하면 durationMs 동안 전방으로 퍼지는 빛 콘(lightLength × lightWidth)을 비추고,
// 그 안의 모든 적이 hitIntervalMs마다 피해를 받는다. 점등 즉시 1타 →
// 3초/1초 간격 = 3타 (기획). 빛은 플레이어 이동·회전을 따라간다.

export function StudentLanternWeapon() {
  const litRef = useRef(false)
  const litAgeRef = useRef(0)       // 점등 후 경과(초)
  const tickTimerRef = useRef(0)    // 다음 타격까지 누적(ms). 점등 즉시 1타를 위해 interval로 초기화.
  const lastFireRef = useRef(0)
  const groupRef = useRef(null)
  const beamRef = useRef(null)
  const coreRef = useRef(null)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const w = weapons.studentLantern
  const renderLength = w?.lightLength ?? 2.6
  const renderWidth = w?.lightWidth ?? 1.8
  const renderBaseWidth = w?.lightBaseWidth ?? 0.35
  const beamShape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-renderBaseWidth / 2, 0)
    shape.lineTo(renderBaseWidth / 2, 0)
    shape.lineTo(renderWidth / 2, renderLength)
    shape.lineTo(-renderWidth / 2, renderLength)
    shape.closePath()
    return shape
  }, [renderBaseWidth, renderLength, renderWidth])
  const coreShape = useMemo(() => {
    const coreLength = renderLength * 0.68
    const coreBase = renderBaseWidth * 0.65
    const coreWidth = renderWidth * 0.48
    const shape = new THREE.Shape()
    shape.moveTo(-coreBase / 2, 0)
    shape.lineTo(coreBase / 2, 0)
    shape.lineTo(coreWidth / 2, coreLength)
    shape.lineTo(-coreWidth / 2, coreLength)
    shape.closePath()
    return shape
  }, [renderBaseWidth, renderLength, renderWidth])

  usePlayingFrame(({ clock }, delta) => {
    if (!w?.active) return
    const now = clock.elapsedTime * 1000
    const durationMs = w.durationMs ?? 3000
    const intervalMs = w.hitIntervalMs ?? 1000
    const length = w.lightLength ?? 2.6
    const width = w.lightWidth ?? 1.8
    const baseWidth = w.lightBaseWidth ?? 0.35

    // 소등 상태: 쿨다운(점등 시작 기준) 경과 시 점등
    if (!litRef.current) {
      if (now - lastFireRef.current < (w.cooldown ?? 8000)) {
        if (groupRef.current) groupRef.current.visible = false
        return
      }
      litRef.current = true
      litAgeRef.current = 0
      tickTimerRef.current = intervalMs // 점등 즉시 첫 타격
      lastFireRef.current = now
      emitSfx({ id: 'lanternFire' })
    }

    litAgeRef.current += delta
    if (litAgeRef.current * 1000 >= durationMs) {
      litRef.current = false
      if (groupRef.current) groupRef.current.visible = false
      return
    }

    // 빛을 플레이어 위치·시선에 정렬
    startPlayerArmAction(playerArmActionState, 'lanternAim', now)
    const yaw = Math.atan2(playerFacing.x, playerFacing.z)
    if (groupRef.current) {
      groupRef.current.visible = true
      groupRef.current.position.set(playerPos.x, 0, playerPos.z)
      groupRef.current.rotation.y = yaw
      // 촛불 흔들림 느낌의 밝기 플리커
      const flicker = 0.9 + Math.sin(litAgeRef.current * 17) * 0.08 + Math.sin(litAgeRef.current * 5.3) * 0.05
      if (beamRef.current) beamRef.current.material.opacity = 0.30 * flicker
      if (coreRef.current) coreRef.current.material.opacity = 0.38 * flicker
    }

    // hitIntervalMs마다 빛 콘 안 전원 타격
    tickTimerRef.current += delta * 1000
    if (tickTimerRef.current >= intervalMs) {
      tickTimerRef.current -= intervalMs
      applyForwardConeDamage({
        originX: playerPos.x, originZ: playerPos.z,
        dirX: playerFacing.x, dirZ: playerFacing.z,
        length, width, baseWidth, damage: w.damage ?? 9,
      })
    }
  })

  if (!w?.active) return null

  return (
    <group ref={groupRef} visible={false}>
      {/* 넓어지는 랜턴 콘 - 플레이어 앞에서 시작해 12시 방향으로 퍼진다. */}
      <mesh ref={beamRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} renderOrder={3}>
        <shapeGeometry args={[beamShape]} />
        <meshBasicMaterial color={0xffd964} transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={coreRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.09, 0]} renderOrder={4}>
        <shapeGeometry args={[coreShape]} />
        <meshBasicMaterial color={0xfff0b0} transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
