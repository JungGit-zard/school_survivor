import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { inflateScale, outlineMat, toonMat } from '../lib/toon.js'

export const TITLE_SCENE_DIRECTION = {
  player: {
    hair: 'pink',
    jacket: 'red',
    shirt: 'white',
    ribbon: 'red',
    skirt: 'blue-check',
    backpack: 'blue',
    pose: 'running-to-exit',
  },
  scene: {
    exitGlow: true,
    infectionStreaks: 2,
    warningLights: 2,
    zombieStudents: 3,
    largeZombieSilhouette: 1,
  },
}

function ToonBox({ position, rotation = [0, 0, 0], scale, color, emissive = 0.08 }) {
  const mat = useMemo(() => toonMat(color, emissive), [color, emissive])
  const outline = useMemo(() => outlineMat(0.95), [])
  const outlineScale = useMemo(() => inflateScale(scale), [scale])
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow scale={scale} material={mat}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh scale={outlineScale} material={outline}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  )
}

function ToonSphere({ position, scale, color, emissive = 0.08 }) {
  const mat = useMemo(() => toonMat(color, emissive), [color, emissive])
  const outline = useMemo(() => outlineMat(0.95), [])
  const outlineScale = useMemo(() => inflateScale(scale), [scale])
  return (
    <group position={position}>
      <mesh castShadow receiveShadow scale={scale} material={mat}>
        <sphereGeometry args={[0.5, 18, 14]} />
      </mesh>
      <mesh scale={outlineScale} material={outline}>
        <sphereGeometry args={[0.5, 18, 14]} />
      </mesh>
    </group>
  )
}

function ToonCylinder({ position, rotation = [0, 0, 0], scale, color, emissive = 0.08 }) {
  const mat = useMemo(() => toonMat(color, emissive), [color, emissive])
  const outline = useMemo(() => outlineMat(0.95), [])
  const outlineScale = useMemo(() => inflateScale(scale), [scale])
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow scale={scale} material={mat}>
        <cylinderGeometry args={[0.5, 0.5, 1, 12]} />
      </mesh>
      <mesh scale={outlineScale} material={outline}>
        <cylinderGeometry args={[0.5, 0.5, 1, 12]} />
      </mesh>
    </group>
  )
}

function CheckStripe({ position, scale }) {
  return <ToonBox position={position} scale={scale} color={0x6ba6ff} emissive={0.1} />
}

function TitlePlayer() {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    ref.current.position.y = 0.04 + Math.sin(state.clock.elapsedTime * 2.4) * 0.045
    ref.current.rotation.y = -0.36 + Math.sin(state.clock.elapsedTime * 1.7) * 0.06
  })

  return (
    <group ref={ref} position={[0.9, 0.58, 2.1]} rotation={[0, -0.16, 0]} scale={1.24}>
      <ToonBox position={[-0.04, 0.58, 0]} scale={[0.5, 0.62, 0.25]} color={0xd32836} emissive={0.1} />
      <ToonBox position={[-0.02, 0.58, 0.03]} scale={[0.34, 0.5, 0.26]} color={0xf8f7f2} emissive={0.12} />
      <ToonBox position={[-0.02, 0.78, 0.18]} scale={[0.36, 0.12, 0.08]} color={0xe42f4d} emissive={0.14} />
      <ToonBox position={[-0.44, 0.58, -0.02]} scale={[0.14, 0.54, 0.16]} color={0xd32836} />
      <ToonBox position={[0.42, 0.64, 0.06]} scale={[0.14, 0.56, 0.16]} color={0xd32836} />
      <ToonBox position={[-0.63, 0.24, 0.05]} rotation={[0.1, 0, -0.42]} scale={[0.13, 0.5, 0.14]} color={0xf3c49b} />
      <ToonBox position={[0.68, 0.37, 0.08]} rotation={[0.12, 0, 0.58]} scale={[0.13, 0.48, 0.14]} color={0xf3c49b} />

      <ToonBox position={[0, 0.16, 0.02]} scale={[0.56, 0.28, 0.32]} color={0x315ca8} emissive={0.08} />
      <CheckStripe position={[0, 0.17, 0.21]} scale={[0.58, 0.035, 0.035]} />
      <CheckStripe position={[-0.2, 0.17, 0.23]} scale={[0.035, 0.27, 0.035]} />
      <CheckStripe position={[0.2, 0.17, 0.23]} scale={[0.035, 0.27, 0.035]} />

      <ToonBox position={[-0.2, -0.24, 0.04]} rotation={[0.1, 0, -0.24]} scale={[0.16, 0.66, 0.18]} color={0xf3c49b} />
      <ToonBox position={[0.28, -0.3, 0.02]} rotation={[-0.16, 0, 0.48]} scale={[0.16, 0.72, 0.18]} color={0xf3c49b} />
      <ToonBox position={[-0.24, -0.66, 0.04]} scale={[0.17, 0.38, 0.17]} color={0x1b244a} />
      <ToonBox position={[0.5, -0.74, 0.02]} rotation={[0.05, 0, 0.25]} scale={[0.18, 0.4, 0.18]} color={0x1b244a} />

      <ToonBox position={[0.43, 0.48, -0.2]} scale={[0.22, 0.62, 0.18]} color={0x2485d1} emissive={0.1} />
      <ToonBox position={[0.22, 0.68, 0.16]} scale={[0.06, 0.76, 0.06]} color={0x0e3e73} emissive={0.08} />

      <ToonSphere position={[0, 1.03, 0.06]} scale={[0.42, 0.42, 0.36]} color={0xf3c49b} />
      <ToonSphere position={[-0.05, 1.22, 0.02]} scale={[0.54, 0.34, 0.38]} color={0xff79a8} emissive={0.12} />
      <ToonSphere position={[-0.4, 1.06, -0.02]} scale={[0.2, 0.38, 0.16]} color={0xff79a8} emissive={0.12} />
      <ToonSphere position={[0.36, 1.04, -0.02]} scale={[0.2, 0.36, 0.16]} color={0xff79a8} emissive={0.12} />
      <ToonBox position={[-0.14, 1.06, 0.42]} scale={[0.1, 0.11, 0.05]} color={0x5b1b44} emissive={0.08} />
      <ToonBox position={[0.14, 1.06, 0.42]} scale={[0.1, 0.11, 0.05]} color={0x5b1b44} emissive={0.08} />
      <ToonBox position={[-0.14, 1.07, 0.46]} scale={[0.045, 0.045, 0.025]} color={0xffd7eb} emissive={0.1} />
      <ToonBox position={[0.14, 1.07, 0.46]} scale={[0.045, 0.045, 0.025]} color={0xffd7eb} emissive={0.1} />
      <ToonBox position={[0, 0.91, 0.44]} scale={[0.2, 0.075, 0.05]} color={0x301422} emissive={0.04} />
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
      <ToonBox position={[0, 1.0, 0.23]} scale={[0.08, 0.06, 0.04]} color={0xff8bb6} emissive={0.2} />
      <ToonBox position={[0.18, 1.0, 0.23]} scale={[0.08, 0.06, 0.04]} color={0xff8bb6} emissive={0.2} />
      <ToonBox position={[-0.33, 0.42, 0.02]} scale={[0.15, 0.52, 0.15]} color={0x78a470} />
      <ToonBox position={[0.33, 0.42, 0.02]} scale={[0.15, 0.52, 0.15]} color={0x78a470} />
      <ToonBox position={[-0.14, -0.08, 0]} scale={[0.15, 0.5, 0.15]} color={0x2d2738} />
      <ToonBox position={[0.14, -0.08, 0]} scale={[0.15, 0.5, 0.15]} color={0x2d2738} />
    </group>
  )
}

function LargeZombieSilhouette() {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    ref.current.position.x = Math.sin(state.clock.elapsedTime * 0.7) * 0.08
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.9) * 0.035
  })
  return (
    <group ref={ref} position={[0.05, 0.6, -4.0]} scale={1.25}>
      <ToonBox position={[0, 0.52, 0]} scale={[0.72, 0.9, 0.32]} color={0x26352e} emissive={0.03} />
      <ToonBox position={[0, 1.25, 0]} scale={[0.52, 0.5, 0.44]} color={0x3c4d40} emissive={0.04} />
      <ToonBox position={[-0.18, 1.3, 0.32]} scale={[0.12, 0.08, 0.06]} color={0xff8bb6} emissive={0.24} />
      <ToonBox position={[0.18, 1.3, 0.32]} scale={[0.12, 0.08, 0.06]} color={0xff8bb6} emissive={0.24} />
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

function ExitGlow() {
  const ref = useRef()
  const poolRef = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xfff3ba, transparent: true, opacity: 0.5, depthWrite: false }), [])
  const poolMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.22, depthWrite: false }), [])
  useFrame((state) => {
    const pulse = Math.sin(state.clock.elapsedTime * 1.6)
    if (ref.current) ref.current.material.opacity = 0.46 + pulse * 0.1
    if (poolRef.current) poolRef.current.material.opacity = 0.2 + pulse * 0.06
  })
  return (
    <group>
      {/* 출구 문틀에서 쏟아지는 빛 */}
      <mesh ref={ref} position={[0, 1.35, -4.35]} material={mat}>
        <boxGeometry args={[2.95, 2.3, 0.08]} />
      </mesh>
      {/* 바닥으로 흘러나오는 따뜻한 빛 웅덩이 */}
      <mesh ref={poolRef} position={[0, 0.015, -3.4]} rotation={[-Math.PI / 2, 0, 0]} material={poolMat} renderOrder={1}>
        <circleGeometry args={[2.6, 36]} />
      </mesh>
    </group>
  )
}

function SchoolSign({ position, textColor = 0xf8f7f2, panel = 0xd32836 }) {
  return (
    <group position={position}>
      <ToonBox position={[0, 0, 0]} scale={[0.56, 0.22, 0.06]} color={panel} emissive={0.08} />
      <ToonBox position={[-0.16, 0.02, 0.04]} scale={[0.08, 0.04, 0.03]} color={textColor} />
      <ToonBox position={[0.02, 0.02, 0.04]} scale={[0.08, 0.04, 0.03]} color={textColor} />
      <ToonBox position={[0.2, 0.02, 0.04]} scale={[0.08, 0.04, 0.03]} color={textColor} />
    </group>
  )
}

export default function TitleScene3D() {
  const floorMat = useMemo(() => toonMat(0x4a4054, 0.05), [])
  const wallMat = useMemo(() => toonMat(0x2d2738, 0.05), [])
  const doorMat = useMemo(() => toonMat(0x805947, 0.05), [])

  return (
    <>
      {/* 어둑한 보라 안개로 뒤쪽 좀비·복도를 머금어 깊이감과 긴장감을 준다 */}
      <fog attach="fog" args={[0x140f1c, 16, 34]} />
      <ambientLight intensity={0.4} color={0x9fb0c4} />
      <directionalLight position={[-5, 10, 6]} intensity={2.35} castShadow />
      <directionalLight position={[2, 4, -5]} intensity={1.35} color={0xfff0bc} />
      <directionalLight position={[5, 4, -4]} intensity={0.7} color={0xffa34f} />
      {/* 교문에서 새어나오는 따뜻한 빛 — 탈출의 희망(플레이어·좀비를 뒤에서 림라이트) */}
      <pointLight position={[0, 1.1, -3.7]} intensity={5.5} color={0xffdf9a} distance={11} decay={2} />

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
        <ExitGlow />
        <ToonBox position={[-1.45, 2.72, -4.25]} scale={[0.18, 0.18, 0.12]} color={0xfff3ba} emissive={0.2} />
        <ToonBox position={[1.45, 2.72, -4.25]} scale={[0.18, 0.18, 0.12]} color={0xfff3ba} emissive={0.2} />
        <SchoolSign position={[-2.88, 1.95, -1.5]} />
        <SchoolSign position={[2.82, 1.7, -0.35]} panel={0xe99039} />

        <ToonBox position={[-2.62, 0.1, 2.1]} scale={[0.16, 0.12, 1.6]} color={0x95bf91} emissive={0.16} />
        <ToonBox position={[2.5, 0.12, 0.7]} scale={[0.16, 0.12, 1.1]} color={0x95bf91} emissive={0.16} />
        <ToonCylinder position={[-1.75, 0.08, 0.45]} rotation={[0, 0, Math.PI / 2]} scale={[0.15, 1.0, 0.15]} color={0x95bf91} emissive={0.14} />
        <WarningLight position={[-2.3, 0.03, -1.5]} delay={0} />
        <WarningLight position={[2.15, 0.03, 1.3]} delay={1.4} />

        <LargeZombieSilhouette />
        <TitleZombie position={[-1.82, 0.42, -2.05]} delay={0.2} scale={0.9} />
        <TitleZombie position={[1.32, 0.38, -2.62]} delay={1.0} scale={0.78} />
        <TitleZombie position={[-0.46, 0.32, -3.05]} delay={2.1} scale={0.66} />
        <TitlePlayer />
      </group>
    </>
  )
}
