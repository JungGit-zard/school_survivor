import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { inflateScale, outlineMat, toonMat } from '../lib/toon.js'
import PlayerMesh from './PlayerMesh.jsx'

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
    zombieStudents: 5,
    largeZombieSilhouette: 1,
  },
}

function TitleCameraRig() {
  const { camera } = useThree()
  useFrame(() => {
    camera.lookAt(0.1, 0.48, -1.35)
  })
  return null
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

function TitlePlayer() {
  const ref = useRef()
  // base y 0.95: PlayerMesh 발이 바닥 평면 위에 서도록 올린다(이전 0.04는 다리가 바닥 밑에 잠겼음).
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.x = 0.48 + Math.sin(t * 4.2) * 0.04
    ref.current.position.y = 0.88 + Math.sin(t * 8.4) * 0.055
    ref.current.position.z = 0.08 + Math.sin(t * 3.2) * 0.045
    ref.current.rotation.x = -0.12 + Math.sin(t * 4.4) * 0.018
    ref.current.rotation.y = Math.PI - 0.48 + Math.sin(t * 2.2) * 0.055
    ref.current.rotation.z = 0.05 + Math.sin(t * 7.8) * 0.025
  })

  // 인게임 플레이어 모델(PlayerMesh)을 그대로 사용. PlayerMesh가 내부 스케일(0.2664)을
  // 가지므로 타이틀에서 보이도록 바깥 그룹에서 키운다. (movingRef 없음 → idle 포즈)
  return (
    <group ref={ref} position={[0.48, 0.88, 0.08]} rotation={[-0.12, Math.PI - 0.48, 0.05]} scale={2}>
      <PlayerMesh />
    </group>
  )
}

function TitleZombie({ position, delay = 0, scale = 1 }) {
  const ref = useRef()
  const armL = useRef()
  const armR = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + delay
    ref.current.position.x = position[0] + Math.sin(t * 1.2) * 0.07
    ref.current.position.y = position[1] + Math.sin(t * 2.1) * 0.035
    ref.current.rotation.z = Math.sin(t * 1.5) * 0.055
    // 주인공(+z) 쪽으로 약간 기운 추격 자세
    ref.current.rotation.x = 0.14 + Math.sin(t * 1.8) * 0.04
    // 앞으로 뻗은 팔이 늘어지듯 까딱까딱 (좌우 위상차)
    if (armL.current) armL.current.rotation.x = 1.9 + Math.sin(t * 2.6) * 0.12
    if (armR.current) armR.current.rotation.x = 1.9 + Math.sin(t * 2.6 + 0.7) * 0.12
  })

  return (
    <group ref={ref} position={position} scale={scale}>
      <ToonBox position={[0, 0.42, 0]} scale={[0.46, 0.62, 0.26]} color={0x41745a} />
      <ToonBox position={[0, 0.91, 0]} scale={[0.34, 0.34, 0.32]} color={0x95bf91} />
      <ToonBox position={[-0.1, 1.0, 0.23]} scale={[0.08, 0.06, 0.04]} color={0xff8bb6} emissive={0.2} />
      <ToonBox position={[0.1, 1.0, 0.23]} scale={[0.08, 0.06, 0.04]} color={0xff8bb6} emissive={0.2} />
      {/* 앞으로 뻗어 늘어진 팔 (주인공 추격) — 어깨 피벗에서 +z로 뻗고 약간 처짐 */}
      <group ref={armL} position={[-0.28, 0.6, 0.07]} rotation={[1.9, 0, 0.05]}>
        <ToonBox position={[0, 0.27, 0]} scale={[0.14, 0.54, 0.15]} color={0x78a470} />
        <ToonBox position={[0, 0.56, 0]} scale={[0.15, 0.13, 0.16]} color={0x95bf91} />
      </group>
      <group ref={armR} position={[0.28, 0.6, 0.07]} rotation={[1.9, 0, -0.05]}>
        <ToonBox position={[0, 0.27, 0]} scale={[0.14, 0.54, 0.15]} color={0x78a470} />
        <ToonBox position={[0, 0.56, 0]} scale={[0.15, 0.13, 0.16]} color={0x95bf91} />
      </group>
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

function ZombieHeadSilhouette({ position, delay = 0, scale = 1 }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + delay
    ref.current.position.x = position[0] + Math.sin(t * 0.9) * 0.045
    ref.current.position.y = position[1] + Math.sin(t * 1.7) * 0.025
    ref.current.rotation.z = Math.sin(t * 1.3) * 0.04
  })
  return (
    <group ref={ref} position={position} scale={scale}>
      <ToonBox position={[0, 0.62, 0]} scale={[0.42, 0.5, 0.24]} color={0x26352e} emissive={0.02} />
      <ToonBox position={[-0.12, 0.72, 0.18]} scale={[0.08, 0.055, 0.035]} color={0xff8bb6} emissive={0.2} />
      <ToonBox position={[0.12, 0.72, 0.18]} scale={[0.08, 0.055, 0.035]} color={0xff8bb6} emissive={0.2} />
    </group>
  )
}

function SpeedStreak({ position, scale, delay = 0 }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xfff3ba,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), [])
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + delay
    ref.current.material.opacity = 0.12 + Math.sin(t * 4.5) * 0.07
    ref.current.position.z = position[2] + Math.sin(t * 2.2) * 0.08
  })
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={2}>
      <planeGeometry args={scale} />
    </mesh>
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
      <TitleCameraRig />
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
        <SpeedStreak position={[-0.98, 0.055, 1.9]} scale={[0.11, 1.8]} delay={0.3} />
        <SpeedStreak position={[0.02, 0.055, 1.3]} scale={[0.09, 2.25]} delay={1.0} />
        <SpeedStreak position={[1.06, 0.055, 0.98]} scale={[0.1, 1.75]} delay={1.7} />
        <WarningLight position={[-2.3, 0.03, -1.5]} delay={0} />
        <WarningLight position={[2.15, 0.03, 1.3]} delay={1.4} />

        <LargeZombieSilhouette />
        <ZombieHeadSilhouette position={[-2.25, 0.58, -3.42]} delay={0.4} scale={0.82} />
        <ZombieHeadSilhouette position={[2.0, 0.54, -3.18]} delay={1.6} scale={0.74} />
        <TitleZombie position={[-1.95, 0.42, -1.55]} delay={0.2} scale={0.98} />
        <TitleZombie position={[1.56, 0.38, -2.08]} delay={1.0} scale={0.84} />
        <TitleZombie position={[-0.42, 0.32, -2.72]} delay={2.1} scale={0.68} />
        <TitlePlayer />
      </group>
    </>
  )
}
