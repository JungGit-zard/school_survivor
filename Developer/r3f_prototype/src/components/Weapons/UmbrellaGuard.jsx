import { useRef, useState, useMemo, useCallback } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import * as THREE from 'three'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

const OPEN_DURATION_MS = 420
const DEFAULT_SPIN_DURATION_MS = 1200
const EXPLOSION_DURATION_MS = 420
const UMBRELLA_COLORS = {
  cottonCandyPink: 0xff8fc4,
  babyBlue: 0x86c8ff,
  lime: 0x78ff62,
  mintCream: 0x94f9b7,
  vanillaWhite: 0xffe4a8,
}

let _umbrellaId = 0

export function UmbrellaModel({ openProgress, spin = 0 }) {
  const panelMats = useMemo(() => [
    toonMat(UMBRELLA_COLORS.cottonCandyPink, 0.16),
    toonMat(UMBRELLA_COLORS.babyBlue, 0.14),
    toonMat(UMBRELLA_COLORS.cottonCandyPink, 0.16),
    toonMat(UMBRELLA_COLORS.lime, 0.18),
    toonMat(UMBRELLA_COLORS.babyBlue, 0.14),
    toonMat(UMBRELLA_COLORS.cottonCandyPink, 0.16),
    toonMat(UMBRELLA_COLORS.mintCream, 0.10),
    toonMat(UMBRELLA_COLORS.vanillaWhite, 0.12),
  ], [])
  const rimMats = useMemo(() => [
    toonMat(UMBRELLA_COLORS.vanillaWhite, 0.14),
    toonMat(UMBRELLA_COLORS.lime, 0.16),
    toonMat(UMBRELLA_COLORS.vanillaWhite, 0.14),
    toonMat(UMBRELLA_COLORS.lime, 0.16),
  ], [])
  const ribMat = useMemo(() => toonMat(UMBRELLA_COLORS.mintCream, 0.04), [])
  const shaftMat = useMemo(() => toonMat(0xc8d0d0, 0.08), [])
  const gripMat = useMemo(() => toonMat(UMBRELLA_COLORS.cottonCandyPink, 0.20), [])
  const outMat = useMemo(() => outlineMat(0.94), [])

  const open = 0.18 + openProgress * 0.82
  const canopyScale = [1.08 * open, 0.34 + openProgress * 0.06, 1.08 * open]
  const ribLength = 1.52 * open
  const ribAngles = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4)
  const panelArc = (Math.PI * 2) / panelMats.length

  return (
    <StudioTunedGroup itemId="weapon-umbrella">
      <group scale={[0.52, 0.52, 0.52]} rotation={[0.12, spin, -0.08]}>
      <mesh material={outMat} position={[0, 0.24, 0]} scale={inflateScale(canopyScale)}>
        <sphereGeometry args={[0.78, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {panelMats.map((mat, index) => (
        <mesh key={index} material={mat} position={[0, 0.245, 0]} scale={canopyScale}>
          <sphereGeometry args={[0.782, 8, 5, index * panelArc, panelArc + 0.018, 0, Math.PI / 2]} />
        </mesh>
      ))}

      {ribAngles.map((angle) => (
        <mesh key={angle} material={ribMat} position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, angle]}>
          <cylinderGeometry args={[0.012, 0.012, ribLength, 6]} />
        </mesh>
      ))}

      {rimMats.map((mat, index) => {
        const angle = (index * Math.PI) / 2 + Math.PI / 4
        return (
          <mesh
            key={index}
            material={mat}
            position={[Math.sin(angle) * 0.52 * open, 0.17, Math.cos(angle) * 0.52 * open]}
            rotation={[0, angle, 0]}
            scale={[0.32 * open, 0.055, 0.1]}
          >
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        )
      })}

      <mesh material={outMat} position={[0, -0.24, 0]} rotation={[0.48, 0, 0]} scale={inflateScale([1.18, 1.05, 1.18])}>
        <cylinderGeometry args={[0.035, 0.035, 0.86, 8]} />
      </mesh>
      <mesh material={shaftMat} position={[0, -0.24, 0]} rotation={[0.48, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.86, 8]} />
      </mesh>

      <mesh material={outMat} position={[0, -0.72, 0.22]} rotation={[Math.PI / 2, 0, 0]} scale={inflateScale([1.1, 1.1, 1.1])}>
        <torusGeometry args={[0.12, 0.028, 8, 16, Math.PI * 1.25]} />
      </mesh>
      <mesh material={gripMat} position={[0, -0.72, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.028, 8, 16, Math.PI * 1.25]} />
      </mesh>
      </group>
    </StudioTunedGroup>
  )
}

function UmbrellaExplosion({ id, x, z, radius, onDone }) {
  const groupRef = useRef(null)
  const ageRef = useRef(0)
  const burstMats = useMemo(() => [
    new THREE.MeshBasicMaterial({ color: UMBRELLA_COLORS.cottonCandyPink, transparent: true, opacity: 0.88, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: UMBRELLA_COLORS.babyBlue, transparent: true, opacity: 0.88, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: UMBRELLA_COLORS.lime, transparent: true, opacity: 0.88, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: UMBRELLA_COLORS.vanillaWhite, transparent: true, opacity: 0.88, depthWrite: false }),
  ], [])
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: UMBRELLA_COLORS.vanillaWhite,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [])

  usePlayingFrame((_, delta) => {
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / (EXPLOSION_DURATION_MS / 1000))
    if (groupRef.current) {
      groupRef.current.scale.setScalar(0.15 + radius * 1.85 * t)
      groupRef.current.rotation.y += delta * 3.6
      groupRef.current.children.forEach((child) => {
        if (child.material) child.material.opacity = Math.max(0, 0.9 * (1 - t))
      })
    }
    if (t >= 1) onDone(id)
  })

  return (
    <group ref={groupRef} position={[x, 0.1, z]} renderOrder={5}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.48, 48]} />
        <primitive object={ringMat} attach="material" />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index * Math.PI * 2) / 12
        return (
          <mesh
            key={index}
            material={burstMats[index % burstMats.length]}
            position={[Math.sin(angle) * 0.48, 0.04, Math.cos(angle) * 0.48]}
            rotation={[0, angle, 0.35]}
            scale={[0.12, 0.045, 0.22]}
          >
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        )
      })}
    </group>
  )
}

function UmbrellaPulse({ id, x, z, damage, radius, spinDurationMs, knockbackMs, onExplode }) {
  const groupRef = useRef(null)
  const ageRef = useRef(0)
  const explodedRef = useRef(false)
  const [visual, setVisual] = useState({ openProgress: 0, spin: 0 })
  const totalMs = OPEN_DURATION_MS + spinDurationMs

  usePlayingFrame((_, delta) => {
    if (!groupRef.current || explodedRef.current) return
    ageRef.current += delta * 1000
    const openProgress = Math.min(1, ageRef.current / OPEN_DURATION_MS)
    const spinT = Math.max(0, ageRef.current - OPEN_DURATION_MS) / spinDurationMs
    setVisual({ openProgress, spin: spinT * Math.PI * 2 * 0.72 })

    if (ageRef.current >= totalMs) {
      explodedRef.current = true
      onExplode(id, { x, z, damage, radius, knockbackMs })
    }
  })

  return (
    <group ref={groupRef} position={[x, playerPos.y + 0.52, z]}>
      <UmbrellaModel openProgress={visual.openProgress} spin={visual.spin} />
    </group>
  )
}

export function UmbrellaGuardWeapon() {
  const lastFireRef = useRef(-Infinity)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const [pulses, setPulses] = useState([])
  const [explosions, setExplosions] = useState([])
  const activePulsesRef = useRef([])

  const removeExplosion = useCallback((id) => {
    setExplosions((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const explode = useCallback((id, blast) => {
    activePulsesRef.current = activePulsesRef.current.filter((item) => item.id !== id)
    setPulses([...activePulsesRef.current])

    emitSfx({ id: 'umbrellaHit', volume: 0.62 })
    applyRadialDamage({
      x: blast.x, z: blast.z, radius: blast.radius, damage: blast.damage,
      knockback: 3.0, knockbackMs: blast.knockbackMs ?? 220,
    })

    setExplosions((prev) => [...prev, { id, x: blast.x, z: blast.z, radius: blast.radius }])
  }, [])

  usePlayingFrame(({ clock }) => {
    const w = weapons.umbrellaGuard
    if (phase !== 'playing' || !w?.active) return

    const now = clock.elapsedTime * 1000

    if (now - lastFireRef.current >= w.cooldown) {
      lastFireRef.current = now
      emitSfx({ id: 'umbrellaFire' })
      const next = {
        id: ++_umbrellaId,
        x: playerPos.x,
        z: playerPos.z,
        radius: w.radius ?? 1.25,
        damage: w.damage ?? 12,
        spinDurationMs: w.spinDurationMs ?? DEFAULT_SPIN_DURATION_MS,
        knockbackMs: w.knockbackMs ?? 220,
      }
      activePulsesRef.current = [next]
      setPulses([next])
    }
  })

  if (!weapons.umbrellaGuard?.active) return null

  return (
    <>
      {pulses.map((pulse) => (
        <UmbrellaPulse key={pulse.id} {...pulse} onExplode={explode} />
      ))}
      {explosions.map((explosion) => (
        <UmbrellaExplosion key={explosion.id} {...explosion} onDone={removeExplosion} />
      ))}
    </>
  )
}
