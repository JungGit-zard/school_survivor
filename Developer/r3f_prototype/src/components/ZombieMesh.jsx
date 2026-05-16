import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { outlineMat, toonMat, inflateScale } from '../lib/toon.js'

// 타입별 색상 팔레트
export const ZOMBIE_PALETTE = {
  E01: { body: 0x4a7a2c, skin: 0x8ab060, eye: 0xff2020 },
  E02: { body: 0x7a28b8, skin: 0xb870d8, eye: 0xff8020 },
  E03: { body: 0x253e18, skin: 0x425e30, eye: 0xff2020 },
  E04: { body: 0xb05010, skin: 0xd08840, eye: 0xffcc00 },
  E05: { body: 0x9a1818, skin: 0xc84030, eye: 0xff0000 },
  E06: { body: 0x520808, skin: 0x801818, eye: 0xff4400 },
  B01: { body: 0x100808, skin: 0x281010, eye: 0xff0000 },
}

function ZBlock({ size, position, rotation, color, emissive = 0.12, outlineScale = 1.08, flash = false }) {
  const displayColor = flash ? 0xffffff : color
  const displayEmissive = flash ? 1.0 : emissive
  const mat = useMemo(() => toonMat(displayColor, displayEmissive), [displayColor, displayEmissive])
  const outMat = useMemo(() => outlineMat(0.96), [])
  const geo = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])
  const os = inflateScale(outlineScale)
  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={1} geometry={geo} material={outMat} scale={[os, os, os]} />
      <mesh renderOrder={2} geometry={geo} material={mat} />
    </group>
  )
}

function OutlineBlock({ size, position, rotation, scale = 1.08 }) {
  const mat = useMemo(() => outlineMat(0.96), [])
  const geo = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])
  const s = inflateScale(scale)
  return <mesh renderOrder={0} geometry={geo} material={mat} position={position} rotation={rotation} scale={[s, s, s]} />
}

function ZombieOuterOutline() {
  return (
    <group>
      <OutlineBlock size={[0.62, 0.58, 0.54]} position={[0, 0.82, 0]} />
      <OutlineBlock size={[0.66, 0.68, 0.48]} position={[0, 0.28, 0]} />
      <OutlineBlock size={[0.24, 0.70, 0.24]} position={[-0.44, 0.26, 0.08]} rotation={[-1.05, 0, 0.12]} scale={1.07} />
      <OutlineBlock size={[0.24, 0.70, 0.24]} position={[0.44, 0.26, 0.08]} rotation={[-1.05, 0, -0.12]} scale={1.07} />
      <OutlineBlock size={[0.26, 0.66, 0.32]} position={[-0.15, -0.28, 0.02]} scale={1.07} />
      <OutlineBlock size={[0.26, 0.66, 0.32]} position={[0.15, -0.28, 0.02]} scale={1.07} />
    </group>
  )
}

// animPhase: 'normal' | 'warn' | 'charge' | 'stun'
export default function ZombieMesh({ type = 'E01', animPhase = 'normal', hitFlash = false }) {
  const p    = useRef({})
  const reg  = (k) => (el) => { if (el) p.current[k] = el }
  const pal  = ZOMBIE_PALETTE[type] ?? ZOMBIE_PALETTE.E01

  useFrame((_, delta) => {
    const pt = p.current
    if (!pt.legL) return
    const t   = performance.now() * 0.001

    // warn: 몸통 빠른 진동 (돌진 예고)
    if (animPhase === 'warn') {
      const fl = Math.floor(t * 14) % 2
      if (pt.body) pt.body.scale.setScalar(fl ? 1.06 : 0.96)
      return
    }
    if (pt.body) pt.body.scale.setScalar(1)

    // charge: 앞으로 기울임
    const bodyTiltX = animPhase === 'charge' ? 0.45 : 0
    if (pt.body) pt.body.rotation.x += (bodyTiltX - pt.body.rotation.x) * Math.min(1, delta * 12)

    // stun: 멈춤
    if (animPhase === 'stun') {
      p.current.legL.rotation.x *= 0.85
      p.current.legR.rotation.x *= 0.85
      return
    }

    // 걷기 사이클 (타입별 속도 차이)
    const freq = type === 'E02' ? 9.0 : type === 'E03' ? 5.0 : 7.0
    const amp  = animPhase === 'charge' ? 0.55 : 0.38
    const sw   = Math.sin(t * freq) * amp
    pt.legL.rotation.x =  sw
    pt.legR.rotation.x = -sw

    // 좀비 팔: 항상 앞으로 뻗은 상태에서 소폭 흔들림
    const armBase = -1.15
    pt.armL.rotation.x = armBase + Math.sin(t * 2.8) * 0.06
    pt.armR.rotation.x = armBase + Math.sin(t * 2.8 + Math.PI) * 0.06

    // 머리 흔들림
    if (pt.head) pt.head.rotation.z = Math.sin(t * 1.6) * 0.07
  })

  return (
    <group>
      {/* ── 머리 ── */}
      <group ref={reg('head')} position={[0, 0.82, 0]}>
        <ZBlock size={[0.52, 0.48, 0.46]} position={[0, 0, 0]}       color={pal.skin} emissive={0.08} outlineScale={1.08} flash={hitFlash} />
        {/* 눈 (빨갛게 빛남) */}
        <ZBlock size={[0.10, 0.09, 0.06]} position={[-0.12, 0.04, 0.24]} color={pal.eye} emissive={0.9} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.10, 0.09, 0.06]} position={[ 0.12, 0.04, 0.24]} color={pal.eye} emissive={0.9} outlineScale={1.0} flash={hitFlash} />
      </group>

      {/* ── 몸통 ── */}
      <group ref={reg('body')} position={[0, 0.28, 0]}>
        <ZBlock size={[0.56, 0.58, 0.40]} position={[0, 0, 0]}       color={pal.body} emissive={0.14} outlineScale={1.09} flash={hitFlash} />
      </group>

      {/* ── 왼팔 (어깨 pivot, 앞으로 뻗음) ── */}
      <group ref={reg('armL')} position={[-0.40, 0.52, 0]} rotation={[-1.15, 0, 0.12]}>
        <ZBlock size={[0.20, 0.50, 0.20]} position={[0, -0.25, 0]}   color={pal.body} emissive={0.10} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.18, 0.16, 0.18]} position={[0, -0.55, 0]}   color={pal.skin} emissive={0.07} outlineScale={1.03} flash={hitFlash} />
      </group>

      {/* ── 오른팔 (어깨 pivot, 앞으로 뻗음) ── */}
      <group ref={reg('armR')} position={[ 0.40, 0.52, 0]} rotation={[-1.15, 0, -0.12]}>
        <ZBlock size={[0.20, 0.50, 0.20]} position={[0, -0.25, 0]}   color={pal.body} emissive={0.10} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.18, 0.16, 0.18]} position={[0, -0.55, 0]}   color={pal.skin} emissive={0.07} outlineScale={1.03} flash={hitFlash} />
      </group>

      {/* ── 왼다리 (힙 pivot, 신발 포함) ── */}
      <group ref={reg('legL')} position={[-0.15, 0.00, 0]}>
        <ZBlock size={[0.22, 0.52, 0.26]} position={[0, -0.26, 0]}   color={pal.body} emissive={0.10} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.24, 0.12, 0.34]} position={[0, -0.57, 0.05]} color={0x1a1a1a} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
      </group>

      {/* ── 오른다리 (힙 pivot, 신발 포함) ── */}
      <group ref={reg('legR')} position={[ 0.15, 0.00, 0]}>
        <ZBlock size={[0.22, 0.52, 0.26]} position={[0, -0.26, 0]}   color={pal.body} emissive={0.10} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.24, 0.12, 0.34]} position={[0, -0.57, 0.05]} color={0x1a1a1a} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
      </group>
    </group>
  )
}
