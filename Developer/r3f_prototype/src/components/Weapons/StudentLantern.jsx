import { useRef } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos, playerFacing } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { applyForwardBoxDamage } from '../../lib/weaponTargeting.js'

// 학생용 랜턴 (신무기 2026-07-04, 스탯 정본: weaponCatalog.studentLantern)
// 점등하면 durationMs 동안 전방 빛 상자(lightLength × lightWidth)를 비추고,
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

  usePlayingFrame(({ clock }, delta) => {
    if (!w?.active) return
    const now = clock.elapsedTime * 1000
    const durationMs = w.durationMs ?? 3000
    const intervalMs = w.hitIntervalMs ?? 1000
    const length = w.lightLength ?? 1.9
    const width = w.lightWidth ?? 1.9

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
      emitSfx({ id: 'stunGunFire' }) // ponytail: 전용 sfx 생기기 전까지 전기 계열 재사용
    }

    litAgeRef.current += delta
    if (litAgeRef.current * 1000 >= durationMs) {
      litRef.current = false
      if (groupRef.current) groupRef.current.visible = false
      return
    }

    // 빛을 플레이어 위치·시선에 정렬
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

    // hitIntervalMs마다 빛 상자 안 전원 타격
    tickTimerRef.current += delta * 1000
    if (tickTimerRef.current >= intervalMs) {
      tickTimerRef.current -= intervalMs
      applyForwardBoxDamage({
        originX: playerPos.x, originZ: playerPos.z,
        dirX: playerFacing.x, dirZ: playerFacing.z,
        length, width, damage: w.damage ?? 9,
      })
    }
  })

  if (!w?.active) return null
  const length = w.lightLength ?? 1.9
  const width = w.lightWidth ?? 1.9

  return (
    <group ref={groupRef} visible={false}>
      {/* 빛 상자 — 따뜻한 랜턴 노랑, 바닥에 깔리는 사각 광폭 */}
      <mesh ref={beamRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, length / 2]} renderOrder={3}>
        <planeGeometry args={[width, length]} />
        <meshBasicMaterial color={0xffd964} transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 근접부 코어 — 랜턴 바로 앞이 더 밝게 */}
      <mesh ref={coreRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, length * 0.28]} renderOrder={4}>
        <planeGeometry args={[width * 0.6, length * 0.5]} />
        <meshBasicMaterial color={0xfff0b0} transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
