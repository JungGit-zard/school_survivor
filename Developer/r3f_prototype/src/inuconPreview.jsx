import React from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { InuconModel } from './components/Weapons/Inucon.jsx'
import { StudioTuningPreviewProvider } from './components/StudioTunedGroup.jsx'
import { useGameStore } from './store/useGameStore.js'

// 개발 전용 프리뷰. 예전엔 이 파일에 이누콘 모델 사본이 따로 있어서 게임 모델과 어긋났다
// (A포즈 이전의 긴 왼팔·들린 오른팔·옆으로 뻗은 꼬리가 남아 팔이 3~4개로 보였다).
// 이제 게임과 같은 InuconModel 하나만 그린다. 애니메이션은 usePlayingFrame이라 phase를 playing으로 둔다.
useGameStore.setState({ phase: 'playing' })

function BlockPerson({ position, color, scale = 0.65 }) {
  const mat = new THREE.MeshToonMaterial({ color })
  const line = new THREE.MeshBasicMaterial({ color: 0x151018, side: THREE.BackSide })
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.65, 0]} scale={[1.08, 1.08, 1.08]} material={line}><boxGeometry args={[0.5, 0.95, 0.36]} /></mesh>
      <mesh position={[0, 0.65, 0]} material={mat}><boxGeometry args={[0.5, 0.95, 0.36]} /></mesh>
      <mesh position={[0, 1.28, 0]} scale={[1.08, 1.08, 1.08]} material={line}><boxGeometry args={[0.55, 0.45, 0.42]} /></mesh>
      <mesh position={[0, 1.28, 0]} material={mat}><boxGeometry args={[0.55, 0.45, 0.42]} /></mesh>
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.82} />
      <directionalLight position={[4, 7, 5]} intensity={2.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[9, 9]} />
        <meshToonMaterial color="#2fb154" />
      </mesh>
      <BlockPerson position={[0, 0, 0]} color={0x4aa3ff} scale={0.62} />
      <BlockPerson position={[-1.65, 0, -0.65]} color={0x76b852} scale={0.56} />
      <BlockPerson position={[1.55, 0, -0.75]} color={0x76b852} scale={0.56} />
      {/* 발바닥(모델 y -0.51)이 바닥에 닿도록 0.51 × 0.78 만큼 올린다. */}
      <group position={[0.8, 0.4, 1.05]} rotation={[0, -0.18, 0]} scale={[0.78, 0.78, 0.78]}>
        <StudioTuningPreviewProvider>
          <InuconModel />
        </StudioTuningPreviewProvider>
      </group>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <Canvas camera={{ position: [0, 3.0, 5.0], fov: 34 }} gl={{ preserveDrawingBuffer: true }}>
    <Scene />
  </Canvas>,
)
