import { useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { getBellSonicRingConfigs } from '../../lib/bell.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'
import { scaleEffectVisual } from '../../lib/effectVisualScale.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'

let _bellPulseId = 0

export function BellModel() {
  const bellMat = useMemo(() => toonMat(0xffd040, 0.2), [])
  const rimMat = useMemo(() => toonMat(0xf0a820, 0.16), [])
  const handleMat = useMemo(() => toonMat(0x8a4a18, 0.08), [])
  const outMat = useMemo(() => outlineMat(0.94), [])

  return (
    <group scale={[0.36, 0.36, 0.36]}>
      <mesh material={outMat} scale={inflateScale([1.12, 1.1, 1.12])} position={[0, -0.05, 0]}>
        <coneGeometry args={[0.34, 0.48, 12]} />
      </mesh>
      <mesh material={bellMat} position={[0, -0.05, 0]}>
        <coneGeometry args={[0.34, 0.48, 12]} />
      </mesh>
      <mesh material={rimMat} position={[0, -0.31, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.08, 12]} />
      </mesh>
      <mesh material={outMat} scale={inflateScale([1.12, 1.12, 1.12])} position={[0, 0.24, 0]}>
        <torusGeometry args={[0.13, 0.035, 6, 14]} />
      </mesh>
      <mesh material={handleMat} position={[0, 0.24, 0]}>
        <torusGeometry args={[0.13, 0.035, 6, 14]} />
      </mesh>
      <mesh material={outMat} position={[0, -0.42, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
      </mesh>
    </group>
  )
}

function BellPulse({ id, startMs, radius, onDone }) {
  const ringRefs = useRef([])
  const ringConfigs = useMemo(() => getBellSonicRingConfigs(), [])

  usePlayingFrame(({ clock }) => {
    const age = clock.elapsedTime * 1000 - startMs
    const t = Math.min(1, age / 520)
    const ease = 1 - Math.pow(1 - t, 3)

    ringRefs.current.forEach((ring, idx) => {
      if (!ring) return
      const config = ringConfigs[idx]
      const waveProgress = Math.min(1, ease + config.scaleOffset)
      const scale = scaleEffectVisual(0.2 + radius * 2 * waveProgress)
      const opacity = 0.55 * (1 - t) * config.opacityMult
      ring.position.set(playerPos.x, 0.075 + idx * 0.003, playerPos.z)
      ring.scale.setScalar(scale)
      ring.material.opacity = opacity
    })
    if (t >= 1) onDone(id)
  })

  return (
    <>
      {ringConfigs.map((config, idx) => (
        <mesh
          key={`${config.shape}-${idx}`}
          ref={(node) => { ringRefs.current[idx] = node }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[playerPos.x, 0.075 + idx * 0.003, playerPos.z]}
          renderOrder={5}
        >
          <torusGeometry args={[0.48, 0.035, 8, 96]} />
          <meshBasicMaterial color={0xffdf5a} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

export function BellShockwave() {
  const bellRef = useRef(null)
  const lastFireRef = useRef(0)
  const [pulses, setPulses] = useState([])
  const weapons = useGameStore((s) => s.weapons)

  const removePulse = useCallback((id) => {
    setPulses((prev) => prev.filter((pulse) => pulse.id !== id))
  }, [])

  usePlayingFrame(({ clock }) => {
    const w = weapons.bell
    if (!w?.active) return

    const nowSec = clock.elapsedTime
    const nowMs = nowSec * 1000
    const floatAngle = nowSec * 2.3
    if (bellRef.current) {
      bellRef.current.position.set(
        playerPos.x + 0.58 + Math.sin(floatAngle) * 0.05,
        playerPos.y + 0.74 + Math.sin(nowSec * 4.4) * 0.045,
        playerPos.z - 0.32,
      )
      const ringShake = nowMs - lastFireRef.current < 360
        ? Math.sin(nowSec * 52) * 0.28
        : Math.sin(nowSec * 2.2) * 0.08
      bellRef.current.rotation.set(0.15, 0.28, ringShake)
    }

    if (nowMs - lastFireRef.current < w.cooldown) return
    lastFireRef.current = nowMs

    const radius = w.radius ?? 1.7
    applyRadialDamage({
      x: playerPos.x, z: playerPos.z, radius, damage: w.damage,
      knockback: 4.8, knockbackMs: 180,
    })

    setPulses((prev) => [...prev, { id: ++_bellPulseId, startMs: nowMs, radius }])
  })

  if (!weapons.bell?.active) return null

  return (
    <>
      <group ref={bellRef}>
        <BellModel />
      </group>
      {pulses.map((pulse) => (
        <BellPulse key={pulse.id} {...pulse} onDone={removePulse} />
      ))}
    </>
  )
}
