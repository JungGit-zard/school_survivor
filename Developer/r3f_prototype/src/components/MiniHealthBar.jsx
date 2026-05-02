import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}

export default function MiniHealthBar({
  current,
  max,
  width = 0.371,
  height = 0.124,
  y = 0.9,
}) {
  const { camera } = useThree()
  const groupRef = useRef(null)
  const fillRef = useRef(null)
  const trailRef = useRef(null)
  const trailRatioRef = useRef(clamp01(current / max))
  const lastRatioRef = useRef(clamp01(current / max))
  const flashRef = useRef(0)

  const borderMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    depthTest: false,
  }), [])
  const bgMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xd72832,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    depthTest: false,
  }), [])
  const trailMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    depthTest: false,
  }), [])
  const fillMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffd23c,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
  }), [])

  useFrame(({ clock }, delta) => {
    const ratio = clamp01(current / max)

    if (ratio < lastRatioRef.current) {
      trailRatioRef.current = Math.max(trailRatioRef.current, lastRatioRef.current)
      flashRef.current = 1
    } else if (ratio > lastRatioRef.current) {
      trailRatioRef.current = ratio
    }
    lastRatioRef.current = ratio

    trailRatioRef.current = THREE.MathUtils.damp(trailRatioRef.current, ratio, 4.2, delta)
    flashRef.current = Math.max(0, flashRef.current - delta * 2.2)

    if (groupRef.current) groupRef.current.quaternion.copy(camera.quaternion)
    if (fillRef.current) {
      fillRef.current.scale.x = Math.max(0.001, ratio)
      fillRef.current.position.x = -(width * (1 - ratio)) / 2
    }
    if (trailRef.current) {
      const trailRatio = Math.max(ratio, trailRatioRef.current)
      const hasTrail = trailRatio - ratio > 0.006
      const blink = Math.sin(clock.elapsedTime * 58) > 0 ? 1 : 0
      trailRef.current.scale.x = Math.max(0.001, trailRatio)
      trailRef.current.position.x = -(width * (1 - trailRatio)) / 2
      trailRef.current.material.opacity = hasTrail ? 0.18 + flashRef.current * (blink ? 0.82 : 0.05) : 0
    }
  })

  return (
    <group ref={groupRef} position={[0, y, 0]} renderOrder={20}>
      <mesh position={[0, 0, -0.003]} renderOrder={20}>
        <planeGeometry args={[width + 0.008, height + 0.008]} />
        <primitive object={borderMat} attach="material" />
      </mesh>
      <mesh position={[0, 0, -0.002]} renderOrder={21}>
        <planeGeometry args={[width, height]} />
        <primitive object={bgMat} attach="material" />
      </mesh>
      <mesh ref={trailRef} position={[0, 0, -0.001]} renderOrder={22}>
        <planeGeometry args={[width, height]} />
        <primitive object={trailMat} attach="material" />
      </mesh>
      <mesh ref={fillRef} position={[0, 0, 0]} renderOrder={23}>
        <planeGeometry args={[width, height]} />
        <primitive object={fillMat} attach="material" />
      </mesh>
    </group>
  )
}
