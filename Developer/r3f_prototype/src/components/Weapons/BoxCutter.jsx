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

function CutterTrail({ facing, startMs, duration, range }) {
  const meshRef = useRef(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xdaf5ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), [])
  const trailShape = useMemo(() => {
    const length = range * 1.16
    const baseWidth = Math.max(0.42, range * 0.58)
    const shape = new THREE.Shape()
    shape.moveTo(0, length * 0.58)
    shape.lineTo(baseWidth * 0.5, -length * 0.42)
    shape.lineTo(-baseWidth * 0.5, -length * 0.42)
    shape.closePath()
    return shape
  }, [range])
  const dir = normalizePlanarFacing(facing)
  const yaw = Math.atan2(dir.x, dir.z)

  useFrame(({ clock }) => {
    const progress = Math.min(1, ((clock.elapsedTime * 1000) - startMs) / duration)
    const pull = Math.max(0, (progress - 0.46) / 0.54)
    if (meshRef.current) {
      meshRef.current.position.set(
        playerPos.x + dir.x * range * 0.48 + dir.z * pull * 0.16,
        0.07,
        playerPos.z + dir.z * range * 0.48 - dir.x * pull * 0.16,
      )
      meshRef.current.scale.set(1 + pull * 0.8, 1, 1)
      meshRef.current.material.opacity = Math.max(0, Math.sin(progress * Math.PI) * 0.72)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[playerPos.x + dir.x * range * 0.48, 0.07, playerPos.z + dir.z * range * 0.48]}
      rotation={[-Math.PI / 2, Math.PI + yaw, 0]}
      renderOrder={4}
    >
      <shapeGeometry args={[trailShape]} />
      <primitive object={mat} attach="material" />
    </mesh>
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
      const forward = THREE.MathUtils.lerp(0.26, w.range ?? 0.85, stab) - pull * 0.12
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
      range: w.range ?? 0.85,
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
    setStrike({ startMs: now, facing })
  })

  if (!weapons.boxCutter?.active || !strike) return null

  return (
    <>
      <CutterTrail facing={strike.facing} startMs={strike.startMs} duration={weapons.boxCutter.slashMs ?? 240} range={weapons.boxCutter.range ?? 0.85} />
      <group ref={visualRef} position={[playerPos.x, playerPos.y + 0.22, playerPos.z]}>
        <BoxCutterModel />
      </group>
    </>
  )
}
