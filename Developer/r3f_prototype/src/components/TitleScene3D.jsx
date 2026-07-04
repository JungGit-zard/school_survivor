import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { inflateScale, outlineMat, toonMat } from '../lib/toon.js'
import MatildaMesh from './MatildaMesh.jsx'
import PlayerMesh from './PlayerMesh.jsx'
import ZombieMesh from './ZombieMesh.jsx'
import { ClassroomChair, ClassroomDesk, UnconsciousStudent } from './StageObjects/index.js'

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
    matildaPursuers: 1,
    realForegroundResources: [
      'PlayerMesh',
      'ZombieMesh',
      'MatildaMesh',
      'ClassroomDesk',
      'ClassroomChair',
      'UnconsciousStudent',
    ],
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

function TitlePlayer() {
  const ref = useRef()
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

  return (
    <group ref={ref} position={[0.48, 0.88, 0.08]} rotation={[-0.12, Math.PI - 0.48, 0.05]} scale={2}>
      <PlayerMesh />
    </group>
  )
}

function TitleZombie({ position, delay = 0, scale = 1, type = 'E01' }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + delay
    ref.current.position.x = position[0] + Math.sin(t * 1.2) * 0.07
    ref.current.position.y = position[1] + Math.sin(t * 2.1) * 0.035
    ref.current.rotation.x = 0.14 + Math.sin(t * 1.8) * 0.04
    ref.current.rotation.z = Math.sin(t * 1.5) * 0.055
  })

  return (
    <group ref={ref} position={position} rotation={[0.14, 0, 0]} scale={scale}>
      <ZombieMesh type={type} animPhase="charge" />
    </group>
  )
}

function TitleMatildaPursuer({ position, delay = 0, scale = 1 }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + delay
    ref.current.position.x = position[0] + Math.sin(t * 1.05) * 0.05
    ref.current.position.y = position[1] + Math.sin(t * 1.9) * 0.035
    ref.current.rotation.z = Math.sin(t * 1.35) * 0.045
  })

  return (
    <group ref={ref} position={position} rotation={[0.03, -0.08, 0]} scale={scale}>
      <MatildaMesh movementPose />
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
    <group ref={ref} position={[0.05, 0.18, -4.0]} scale={1.25}>
      <ZombieMesh type="B01" animPhase="charge" />
    </group>
  )
}

function TitleClassroomProps() {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = -0.06 + Math.sin(state.clock.elapsedTime * 0.9) * 0.015
  })

  return (
    <group ref={ref}>
      <group position={[-2.78, 0.02, 0.95]} rotation={[0, 0.42, -0.06]} scale={0.72}>
        <ClassroomDesk variant="overturned" />
      </group>
      <group position={[2.42, 0.02, 0.48]} rotation={[0, -0.36, 0.04]} scale={1.02}>
        <ClassroomChair variant="tilted" />
      </group>
      <group position={[-1.72, 0.02, 0.12]} rotation={[0, 0.9, 0]} scale={0.84}>
        <ClassroomChair variant="overturned" />
      </group>
      <group position={[2.62, 0.05, -1.08]} rotation={[0, -0.78, 0]} scale={0.84}>
        <ClassroomDesk variant="abandoned" />
      </group>
      <group position={[-2.35, 0.02, -1.22]} rotation={[0, 0.58, 0]} scale={0.34}>
        <UnconsciousStudent variant="sideLeft" />
      </group>
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
      <mesh ref={ref} position={[0, 1.35, -4.35]} material={mat}>
        <boxGeometry args={[2.95, 2.3, 0.08]} />
      </mesh>
      <mesh ref={poolRef} position={[0, 0.015, -3.4]} rotation={[-Math.PI / 2, 0, 0]} material={poolMat} renderOrder={1}>
        <circleGeometry args={[2.6, 36]} />
      </mesh>
    </group>
  )
}

export default function TitleScene3D({ studioGroupRef = null, studioTuning = null }) {
  const floorMat = useMemo(() => toonMat(0x4a4054, 0.05), [])
  const wallMat = useMemo(() => toonMat(0x2d2738, 0.05), [])
  const doorMat = useMemo(() => toonMat(0x805947, 0.05), [])
  const studioScale = studioTuning?.scale ?? 1
  const studioRotationY = THREE.MathUtils.degToRad(studioTuning?.rotationY ?? 0)

  return (
    <>
      <TitleCameraRig />
      <fog attach="fog" args={[0x140f1c, 16, 34]} />
      <ambientLight intensity={0.4} color={0x9fb0c4} />
      <directionalLight position={[-5, 10, 6]} intensity={2.35} castShadow />
      <directionalLight position={[2, 4, -5]} intensity={1.35} color={0xfff0bc} />
      <directionalLight position={[5, 4, -4]} intensity={0.7} color={0xffa34f} />
      <pointLight position={[0, 1.1, -3.7]} intensity={5.5} color={0xffdf9a} distance={11} decay={2} />

      <group ref={studioGroupRef} rotation={[0, -0.09 + studioRotationY, 0]} position={[0, -1.15, 0]} scale={studioScale}>
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
        <TitleClassroomProps />
        <SpeedStreak position={[-0.98, 0.055, 1.9]} scale={[0.11, 1.8]} delay={0.3} />
        <SpeedStreak position={[0.02, 0.055, 1.3]} scale={[0.09, 2.25]} delay={1.0} />
        <SpeedStreak position={[1.06, 0.055, 0.98]} scale={[0.1, 1.75]} delay={1.7} />
        <WarningLight position={[-2.3, 0.03, -1.5]} delay={0} />
        <WarningLight position={[2.15, 0.03, 1.3]} delay={1.4} />

        <LargeZombieSilhouette />
        <TitleZombie position={[-2.25, 0.22, -3.42]} delay={0.4} scale={0.58} type="E03" />
        <TitleZombie position={[2.0, 0.2, -3.18]} delay={1.6} scale={0.52} type="E02" />
        <TitleZombie position={[-1.95, 0.22, -1.55]} delay={0.2} scale={0.7} type="E01" />
        <TitleZombie position={[1.56, 0.2, -2.08]} delay={1.0} scale={0.62} type="E02" />
        <TitleZombie position={[-0.42, 0.18, -2.72]} delay={2.1} scale={0.52} type="E03" />
        <TitleMatildaPursuer position={[1.05, 0.36, -2.92]} delay={1.8} scale={1.44} />
        <TitlePlayer />
      </group>
    </>
  )
}
