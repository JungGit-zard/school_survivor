import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { inflateScale, outlineMat, toonMat } from '../lib/toon.js'

function ToonBox({ position, scale, color, emissive = 0.08 }) {
  const mat = useMemo(() => toonMat(color, emissive), [color, emissive])
  const outline = useMemo(() => outlineMat(0.95), [])
  const outlineScale = useMemo(() => inflateScale(scale), [scale])
  return (
    <group position={position}>
      <mesh castShadow receiveShadow scale={scale} material={mat}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh scale={outlineScale} material={outline}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  )
}

function TitlePlayer() {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    ref.current.position.y = 0.04 + Math.sin(state.clock.elapsedTime * 2.4) * 0.045
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.7) * 0.08
  })

  return (
    <group ref={ref} position={[1.8, 0.58, 2.7]} rotation={[0, -0.28, 0]}>
      <ToonBox position={[0, 0.48, 0]} scale={[0.48, 0.72, 0.26]} color={0x59c7ff} />
      <ToonBox position={[0, 1.02, 0]} scale={[0.36, 0.36, 0.34]} color={0xf3c49b} />
      <ToonBox position={[-0.36, 0.48, -0.02]} scale={[0.16, 0.55, 0.18]} color={0x2d2738} />
      <ToonBox position={[0.36, 0.48, -0.02]} scale={[0.16, 0.55, 0.18]} color={0x2d2738} />
      <ToonBox position={[0.62, 0.66, 0.08]} scale={[0.12, 0.88, 0.12]} color={0xf8d65b} />
      <ToonBox position={[-0.18, -0.08, 0]} scale={[0.16, 0.58, 0.18]} color={0x3b3350} />
      <ToonBox position={[0.18, -0.08, 0]} scale={[0.16, 0.58, 0.18]} color={0x3b3350} />
    </group>
  )
}

function TitleZombie({ position, delay = 0, scale = 1 }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + delay
    ref.current.position.x = position[0] + Math.sin(t * 1.2) * 0.07
    ref.current.position.y = position[1] + Math.sin(t * 2.1) * 0.035
    ref.current.rotation.z = Math.sin(t * 1.5) * 0.055
  })

  return (
    <group ref={ref} position={position} scale={scale}>
      <ToonBox position={[0, 0.42, 0]} scale={[0.46, 0.62, 0.26]} color={0x41745a} />
      <ToonBox position={[0, 0.91, 0]} scale={[0.34, 0.34, 0.32]} color={0x95bf91} />
      <ToonBox position={[-0.33, 0.42, 0.02]} scale={[0.15, 0.52, 0.15]} color={0x78a470} />
      <ToonBox position={[0.33, 0.42, 0.02]} scale={[0.15, 0.52, 0.15]} color={0x78a470} />
      <ToonBox position={[-0.14, -0.08, 0]} scale={[0.15, 0.5, 0.15]} color={0x2d2738} />
      <ToonBox position={[0.14, -0.08, 0]} scale={[0.15, 0.5, 0.15]} color={0x2d2738} />
    </group>
  )
}

function WarningLight({ position, delay }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xe99039, transparent: true, opacity: 0.7 }), [])
  useFrame((state) => {
    if (!ref.current) return
    ref.current.material.opacity = 0.28 + Math.sin(state.clock.elapsedTime * 4 + delay) * 0.18
  })
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <circleGeometry args={[1.1, 24]} />
    </mesh>
  )
}

export default function TitleScene3D() {
  const floorMat = useMemo(() => toonMat(0x4a4054, 0.05), [])
  const wallMat = useMemo(() => toonMat(0x2d2738, 0.05), [])
  const doorMat = useMemo(() => toonMat(0x805947, 0.05), [])
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x95bf91, transparent: true, opacity: 0.32 }), [])

  return (
    <>
      <ambientLight intensity={0.55} color={0xb8d0c0} />
      <directionalLight position={[-5, 10, 6]} intensity={2.4} castShadow />
      <directionalLight position={[5, 4, -4]} intensity={0.8} color={0xffa34f} />

      <group rotation={[0, -0.09, 0]} position={[0, -1.15, 0]}>
        <mesh receiveShadow position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat}>
          <planeGeometry args={[8.6, 12]} />
        </mesh>
        <mesh receiveShadow position={[-3.15, 1.1, -0.4]} rotation={[0, 0.16, 0]} material={wallMat}>
          <boxGeometry args={[0.32, 3.3, 9.2]} />
        </mesh>
        <mesh receiveShadow position={[3.15, 1.1, -0.4]} rotation={[0, -0.16, 0]} material={wallMat}>
          <boxGeometry args={[0.32, 3.3, 9.2]} />
        </mesh>
        <mesh receiveShadow position={[0, 1.3, -4.62]} material={doorMat}>
          <boxGeometry args={[3.4, 2.6, 0.32]} />
        </mesh>
        <mesh position={[0, 1.32, -4.39]} material={glowMat}>
          <boxGeometry args={[2.75, 2.08, 0.08]} />
        </mesh>

        <ToonBox position={[-2.62, 0.1, 2.1]} scale={[0.16, 0.12, 1.6]} color={0x95bf91} emissive={0.16} />
        <ToonBox position={[2.5, 0.12, 0.7]} scale={[0.16, 0.12, 1.1]} color={0x95bf91} emissive={0.16} />
        <WarningLight position={[-2.3, 0.03, -1.5]} delay={0} />
        <WarningLight position={[2.15, 0.03, 1.3]} delay={1.4} />

        <TitleZombie position={[-1.75, 0.42, -2.25]} delay={0.2} scale={0.92} />
        <TitleZombie position={[1.15, 0.38, -2.85]} delay={1.0} scale={0.78} />
        <TitleZombie position={[-0.35, 0.32, -3.55]} delay={2.1} scale={0.66} />
        <TitlePlayer />
      </group>
    </>
  )
}
