import { useRef, useMemo, useEffect } from 'react'
import { RigidBody, BallCollider } from '@react-three/rapier'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

export function TumblerModel() {
  const bodyMat = useMemo(() => toonMat(0xff7a3d, 0.16), [])
  const capMat = useMemo(() => toonMat(0xf4f4f4, 0.08), [])
  const outMat = useMemo(() => outlineMat(0.92), [])

  return (
    <StudioTunedGroup itemId="weapon-tumbler">
      <group rotation={[0, 0, Math.PI / 2]} scale={[0.6375, 0.6375, 0.6375]}>
      <mesh material={outMat} scale={inflateScale([1.12, 1.12, 1.08])}>
        <cylinderGeometry args={[0.15, 0.20, 0.58, 10]} />
      </mesh>
      <mesh material={bodyMat}>
        <cylinderGeometry args={[0.15, 0.20, 0.58, 10]} />
      </mesh>
      <mesh material={capMat} position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.10, 10]} />
      </mesh>
      </group>
    </StudioTunedGroup>
  )
}

export function TumblerOrbit() {
  const rbRefs = useRef([])
  const visualRefs = useRef([])
  const enemiesRef = useRef(new Map())
  const overlapCountRef = useRef(new Map())
  const lastHitRef = useRef(new Map())
  const weapons = useGameStore((s) => s.weapons)

  usePlayingFrame(({ clock }) => {
    const w = weapons.tumbler
    if (!w?.active) return

    const nowSec = clock.elapsedTime
    const count = Math.max(1, Math.min(3, w.count ?? 1))
    const radius = w.radius
    const y = playerPos.y + 0.16

    for (let i = 0; i < count; i += 1) {
      const angle = nowSec * w.orbitSpeed + (Math.PI * 2 * i) / count
      const x = playerPos.x + Math.sin(angle) * radius
      const z = playerPos.z + Math.cos(angle) * radius
      rbRefs.current[i]?.setTranslation({ x, y, z }, true)
      if (visualRefs.current[i]) {
        visualRefs.current[i].position.set(x, y, z)
        visualRefs.current[i].rotation.set(0.2, angle, nowSec * 8 + i * 0.8)
      }
    }

    const nowMs = nowSec * 1000
    const interval = 1000 / w.hitsPerSecond
    enemiesRef.current.forEach((rb, enemyId) => {
      // 죽었거나 사라진 적은 추적 맵에서 정리 (onIntersectionExit가 항상 보장되지 않음).
      if (!rb?._enemyHit || rb._enemyDead) {
        enemiesRef.current.delete(enemyId)
        overlapCountRef.current.delete(enemyId)
        lastHitRef.current.delete(enemyId)
        return
      }
      const lastHit = lastHitRef.current.get(enemyId) ?? 0
      if (nowMs - lastHit < interval) return
      lastHitRef.current.set(enemyId, nowMs)
      // 플레이어를 source로 줘서 오로지 바깥쪽(반경 방향)으로만 밀려나게 하고,
      // 우산 폭발과 동일한 세기(knockback 3.0, knockbackMs 220)로 뒤로 밀어낸다.
      rb._enemyHit(w.damage, {
        knockback: 3.0,
        knockbackMs: 220,
        source: { x: playerPos.x, z: playerPos.z },
        critChance: w.critChance,
        critMultiplier: w.critMultiplier,
      })
      emitSfx({
        id: 'tumblerHit',
        volume: 0.35 + Math.random() * 0.10,
        rate: 0.90 + Math.random() * 0.15,
      })
    })
  })

  // ponytail: 텀블러는 항상 활성, fire 이벤트 없으므로 활성화 시점에 1회 emit
  useEffect(() => { if (weapons.tumbler?.active) emitSfx({ id: 'tumblerFire' }) }, [weapons.tumbler?.active])

  if (!weapons.tumbler?.active) return null
  const tumblerCount = Math.max(1, Math.min(3, weapons.tumbler.count ?? 1))

  return (
    <>
      {Array.from({ length: tumblerCount }, (_, idx) => (
        <RigidBody
          key={`tumbler-hit-${idx}`}
          ref={(node) => { rbRefs.current[idx] = node }}
          type="kinematicPosition"
          position={[playerPos.x + weapons.tumbler.radius, playerPos.y + 0.16, playerPos.z]}
          colliders={false}
          sensor
          onIntersectionEnter={({ other }) => {
            const rb = other.rigidBody
            if (!rb?._enemyHit) return
            const nextCount = (overlapCountRef.current.get(rb._enemyId) ?? 0) + 1
            overlapCountRef.current.set(rb._enemyId, nextCount)
            enemiesRef.current.set(rb._enemyId, rb)
          }}
          onIntersectionExit={({ other }) => {
            const rb = other.rigidBody
            if (rb?._enemyId === undefined) return
            const nextCount = (overlapCountRef.current.get(rb._enemyId) ?? 1) - 1
            if (nextCount > 0) {
              overlapCountRef.current.set(rb._enemyId, nextCount)
              return
            }
            overlapCountRef.current.delete(rb._enemyId)
            enemiesRef.current.delete(rb._enemyId)
            lastHitRef.current.delete(rb._enemyId)
          }}
        >
          <BallCollider args={[0.18]} sensor />
        </RigidBody>
      ))}
      {Array.from({ length: tumblerCount }, (_, idx) => (
        <group key={`tumbler-visual-${idx}`} ref={(node) => { visualRefs.current[idx] = node }}>
          <TumblerModel />
        </group>
      ))}
    </>
  )
}
