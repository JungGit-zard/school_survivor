import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyBodies, playerFacing, playerPos } from '../../lib/refs.js'
import { pickBoxCutterTargets, normalizePlanarFacing } from '../../lib/boxCutter.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'

function BoxCutterModel() {
  const handleMat = useMemo(() => toonMat(0xffc928, 0.16), [])
  const gripMat = useMemo(() => toonMat(0x2e3747, 0.08), [])
  const bladeMat = useMemo(() => toonMat(0xdce6ee, 0.06), [])
  const edgeMat = useMemo(() => toonMat(0xffffff, 0.12), [])
  const outMat = useMemo(() => outlineMat(0.95), [])

  return (
    <group scale={[0.42, 0.42, 0.42]} rotation={[0.12, 0, -0.08]}>
      <mesh material={outMat} position={[0, 0, -0.12]} scale={inflateScale([1.1, 1.12, 1.08])}>
        <boxGeometry args={[0.22, 0.18, 0.74]} />
      </mesh>
      <mesh material={handleMat} position={[0, 0, -0.12]}>
        <boxGeometry args={[0.22, 0.18, 0.74]} />
      </mesh>
      <mesh material={gripMat} position={[0, 0.095, -0.18]}>
        <boxGeometry args={[0.16, 0.025, 0.46]} />
      </mesh>
      <mesh material={outMat} position={[0, 0.01, 0.42]} scale={inflateScale([1.14, 1.12, 1.08])}>
        <boxGeometry args={[0.13, 0.095, 0.52]} />
      </mesh>
      <mesh material={bladeMat} position={[0, 0.01, 0.42]}>
        <boxGeometry args={[0.13, 0.095, 0.52]} />
      </mesh>
      <mesh material={edgeMat} position={[0.045, 0.062, 0.42]}>
        <boxGeometry args={[0.022, 0.014, 0.48]} />
      </mesh>
    </group>
  )
}

function BoxCutterStrikeEffect({ strike, duration }) {
  const rootRef = useRef(null)
  const thrustRef = useRef(null)
  const leftCutRef = useRef(null)
  const rightCutRef = useRef(null)
  const tipRef = useRef(null)
  const mats = useMemo(() => ({
    thrust: new THREE.MeshBasicMaterial({
      color: 0xf8fbff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    cut: new THREE.MeshBasicMaterial({
      color: 0xfff1a8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    tip: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  }), [])

  useFrame(({ clock }) => {
    if (!strike || !rootRef.current) return

    const elapsed = clock.elapsedTime * 1000 - strike.startMs
    const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1)
    const dir = normalizePlanarFacing(strike.facing)
    const yaw = Math.atan2(dir.x, dir.z)
    const range = strike.range ?? 1.275
    const width = strike.width ?? 0.22
    const stabIn = THREE.MathUtils.clamp(progress / 0.18, 0, 1)
    const stabFade = 1 - THREE.MathUtils.clamp((progress - 0.6) / 0.28, 0, 1)
    const cutIn = THREE.MathUtils.clamp((progress - 0.36) / 0.18, 0, 1)
    const cutFade = 1 - THREE.MathUtils.clamp((progress - 0.7) / 0.24, 0, 1)
    const thrustLength = THREE.MathUtils.lerp(0.22, range * 0.96, stabIn)
    const cutLength = THREE.MathUtils.lerp(0.2, range * 0.34, cutIn)
    const thrustOpacity = 0.8 * stabFade
    const cutOpacity = 0.68 * cutIn * cutFade

    rootRef.current.position.set(playerPos.x, playerPos.y + 0.235, playerPos.z)
    rootRef.current.rotation.set(0, yaw, 0)

    if (thrustRef.current) {
      thrustRef.current.position.set(0, 0.018, thrustLength * 0.5 + 0.08)
      thrustRef.current.scale.set(1, 1, thrustLength)
    }
    if (leftCutRef.current) {
      leftCutRef.current.position.set(-width * 0.72, 0.035, range * 0.76)
      leftCutRef.current.rotation.set(0, -0.52, 0.18)
      leftCutRef.current.scale.set(1, 1, cutLength)
    }
    if (rightCutRef.current) {
      rightCutRef.current.position.set(width * 0.72, 0.035, range * 0.76)
      rightCutRef.current.rotation.set(0, 0.52, -0.18)
      rightCutRef.current.scale.set(1, 1, cutLength)
    }
    if (tipRef.current) {
      const pulse = 1 + Math.sin(progress * Math.PI) * 0.75
      tipRef.current.position.set(0, 0.024, thrustLength + 0.12)
      tipRef.current.scale.setScalar(pulse)
    }

    mats.thrust.opacity = thrustOpacity
    mats.cut.opacity = cutOpacity
    mats.tip.opacity = 0.72 * stabIn * stabFade
  })

  return (
    <group ref={rootRef} renderOrder={20}>
      <mesh ref={thrustRef} material={mats.thrust}>
        <boxGeometry args={[0.028, 0.012, 1]} />
      </mesh>
      <mesh ref={leftCutRef} material={mats.cut}>
        <boxGeometry args={[0.018, 0.01, 1]} />
      </mesh>
      <mesh ref={rightCutRef} material={mats.cut}>
        <boxGeometry args={[0.018, 0.01, 1]} />
      </mesh>
      <mesh ref={tipRef} material={mats.tip}>
        <octahedronGeometry args={[0.055, 0]} />
      </mesh>
    </group>
  )
}

export function BoxCutterWeapon() {
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const [strike, setStrike] = useState(null)
  const visualRef = useRef(null)
  const lastFireRef = useRef(-Infinity)

  useFrame(({ clock }) => {
    const w = weapons.boxCutter
    if (phase !== 'playing' || !w?.active) return

    const now = clock.elapsedTime * 1000
    const duration = w.slashMs ?? 240

    if (strike) {
      const elapsed = now - strike.startMs
      const progress = Math.min(1, elapsed / duration)
      const dir = normalizePlanarFacing(strike.facing)
      const yaw = Math.atan2(dir.x, dir.z)
      const stab = Math.min(1, progress / 0.46)
      const pull = Math.max(0, (progress - 0.46) / 0.54)
      const forward = THREE.MathUtils.lerp(0.26, w.range ?? 1.275, stab) - pull * 0.12
      const side = pull * 0.24

      if (visualRef.current) {
        visualRef.current.position.set(
          playerPos.x + dir.x * forward + dir.z * side,
          playerPos.y + 0.22,
          playerPos.z + dir.z * forward - dir.x * side,
        )
        visualRef.current.rotation.set(-0.25, yaw + Math.PI * 0.02, -0.3 - pull * 0.75)
      }

      if (progress >= 1) setStrike(null)
      return
    }

    if (now - lastFireRef.current < (w.cooldown ?? 1100)) return

    const facing = normalizePlanarFacing(playerFacing)
    const targets = pickBoxCutterTargets({
      enemies: enemyBodies,
      origin: playerPos,
      facing,
      range: w.range ?? 1.275,
      width: w.width ?? 0.22,
    })
    if (targets.length === 0) return

    lastFireRef.current = now
    targets.forEach(({ rb }) => {
      rb._enemyHit(w.damage, {
        source: { x: playerPos.x, z: playerPos.z },
        knockback: w.knockback ?? 1.8,
        knockbackMs: 80,
      })
    })
    setStrike({ startMs: now, facing, range: w.range ?? 1.275, width: w.width ?? 0.22 })
  })

  if (!weapons.boxCutter?.active || !strike) return null

  return (
    <>
      <group ref={visualRef} position={[playerPos.x, playerPos.y + 0.22, playerPos.z]}>
        <BoxCutterModel />
      </group>
      <BoxCutterStrikeEffect strike={strike} duration={weapons.boxCutter.slashMs ?? 240} />
    </>
  )
}
