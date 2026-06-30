import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { inflateScale, getCachedBoxGeo, getCachedToonMat, getSharedOutlineMat, getFlashMat } from '../lib/toon.js'
import MatildaMesh from './MatildaMesh.jsx'

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

export const B01_BOSS_VISUAL_PALETTE = {
  skin: 0x9fb87a,
  skinShadow: 0x6e8758,
  jacket: 0x1d2732,
  jacketShadow: 0x121820,
  shirt: 0xd8d0b8,
  tie: 0x9f2222,
  pants: 0x5a351d,
  shoe: 0x111317,
  hair: 0x2f281f,
  eye: 0xe4e8d6,
  pupil: 0x141414,
  mouth: 0x3a1210,
  teeth: 0xefe8c9,
}

export const B01_BOSS_VISUAL_PARTS = [
  'blockHead',
  'raggedHair',
  'simplifiedFace',
  'suitJacket',
  'whiteShirt',
  'redTie',
  'brownPants',
  'blackShoes',
  'forwardArms',
  'raggedTears',
]

export const B01_BOSS_FACE_LAYOUT = {
  leftEye: { size: [0.12, 0.09, 0.035], position: [-0.14, 0.05, 0.265], color: 'dark' },
  rightEye: { size: [0.14, 0.105, 0.035], position: [0.14, 0.05, 0.265], color: 'light' },
  rightPupil: { size: [0.045, 0.045, 0.02], position: [0.14, 0.045, 0.292] },
  mouth: { size: [0.18, 0.105, 0.04], position: [0.01, -0.16, 0.27] },
  tooth: { size: [0.055, 0.04, 0.035], position: [-0.005, -0.125, 0.295] },
  cheekShadow: { size: [0.07, 0.16, 0.035], position: [0.275, -0.02, 0.20] },
}

function ZBlock({ size, position, rotation, color, emissive = 0.12, outlineScale = 1.08, flash = false }) {
  const geo    = getCachedBoxGeo(...size)
  const outMat = getSharedOutlineMat()
  const mat    = flash ? getFlashMat() : getCachedToonMat(color, emissive)
  const os     = inflateScale(outlineScale)
  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={1} geometry={geo} material={outMat} scale={[os, os, os]} />
      <mesh renderOrder={2} geometry={geo} material={mat} />
    </group>
  )
}

function B01BossZombieMesh({ hitFlash, reg }) {
  const pal = B01_BOSS_VISUAL_PALETTE
  const face = B01_BOSS_FACE_LAYOUT

  return (
    <group>
      <group ref={reg('head')} position={[0, 0.88, 0]}>
        <ZBlock size={[0.58, 0.50, 0.48]} position={[0, 0, 0]} color={pal.skin} emissive={0.08} outlineScale={1.08} flash={hitFlash} />
        <ZBlock size={[0.60, 0.18, 0.46]} position={[-0.02, 0.25, -0.02]} rotation={[0.06, 0, -0.08]} color={pal.hair} emissive={0.04} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.24, 0.20, 0.18]} position={[-0.23, 0.12, 0.16]} rotation={[0, 0.18, -0.32]} color={pal.hair} emissive={0.04} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.22, 0.22, 0.18]} position={[0.03, 0.12, 0.18]} rotation={[0, -0.1, 0.22]} color={pal.hair} emissive={0.04} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.24, 0.18, 0.20]} position={[0.24, 0.11, 0.12]} rotation={[0, -0.2, 0.18]} color={pal.hair} emissive={0.04} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={face.leftEye.size} position={face.leftEye.position} color={pal.pupil} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.rightEye.size} position={face.rightEye.position} color={pal.eye} emissive={0.18} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.rightPupil.size} position={face.rightPupil.position} color={pal.pupil} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.mouth.size} position={face.mouth.position} color={pal.mouth} emissive={0.08} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.tooth.size} position={face.tooth.position} color={pal.teeth} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.cheekShadow.size} position={face.cheekShadow.position} color={pal.skinShadow} emissive={0.035} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group ref={reg('body')} position={[0, 0.26, 0]}>
        <ZBlock size={[0.62, 0.62, 0.42]} position={[0, 0, 0]} color={pal.jacket} emissive={0.08} outlineScale={1.09} flash={hitFlash} />
        <ZBlock size={[0.22, 0.54, 0.05]} position={[0, 0.02, 0.235]} color={pal.shirt} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.09, 0.44, 0.06]} position={[0, -0.02, 0.27]} rotation={[0, 0, -0.08]} color={pal.tie} emissive={0.10} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.16, 0.14, 0.055]} position={[0, 0.27, 0.275]} rotation={[0, 0, 0.75]} color={pal.tie} emissive={0.10} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.11, 0.16, 0.055]} position={[-0.22, -0.10, 0.255]} rotation={[0, 0, -0.28]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.09, 0.12, 0.055]} position={[0.24, 0.10, 0.255]} rotation={[0, 0, 0.34]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.18, 0.18, 0.08]} position={[0.25, -0.23, -0.08]} rotation={[0, 0, -0.18]} color={pal.jacketShadow} emissive={0.04} outlineScale={1.02} flash={hitFlash} />
      </group>

      <group ref={reg('armL')} position={[-0.43, 0.54, 0]} rotation={[-1.14, 0, 0.15]}>
        <ZBlock size={[0.23, 0.54, 0.22]} position={[0, -0.27, 0]} color={pal.jacket} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.21, 0.18, 0.20]} position={[0, -0.58, 0]} color={pal.skin} emissive={0.07} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.11, 0.11, 0.05]} position={[0.05, -0.35, 0.12]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group ref={reg('armR')} position={[0.43, 0.54, 0]} rotation={[-1.14, 0, -0.15]}>
        <ZBlock size={[0.23, 0.54, 0.22]} position={[0, -0.27, 0]} color={pal.jacket} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.21, 0.18, 0.20]} position={[0, -0.58, 0]} color={pal.skin} emissive={0.07} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.11, 0.12, 0.05]} position={[-0.05, -0.35, 0.12]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group ref={reg('legL')} position={[-0.16, 0.00, 0]}>
        <ZBlock size={[0.23, 0.52, 0.28]} position={[0, -0.26, 0]} color={pal.pants} emissive={0.07} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.25, 0.12, 0.35]} position={[0, -0.57, 0.05]} color={pal.shoe} emissive={0.04} outlineScale={1.03} flash={hitFlash} />
        <ZBlock size={[0.10, 0.15, 0.05]} position={[-0.08, -0.20, 0.17]} rotation={[0, 0, 0.3]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group ref={reg('legR')} position={[0.16, 0.00, 0]}>
        <ZBlock size={[0.23, 0.52, 0.28]} position={[0, -0.26, 0]} color={pal.pants} emissive={0.07} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.25, 0.12, 0.35]} position={[0, -0.57, 0.05]} color={pal.shoe} emissive={0.04} outlineScale={1.03} flash={hitFlash} />
        <ZBlock size={[0.09, 0.13, 0.05]} position={[0.08, -0.35, 0.17]} rotation={[0, 0, -0.2]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
      </group>
    </group>
  )
}

function OutlineBlock({ size, position, rotation, scale = 1.08 }) {
  const geo = getCachedBoxGeo(...size)
  const mat = getSharedOutlineMat()
  const s   = inflateScale(scale)
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

// animPhase: 'normal' | 'warn' | 'charge' | 'stun' | 'retreat'
export default function ZombieMesh({ type = 'E01', animPhase = 'normal', hitFlash = false, isMatilda = false }) {
  const p    = useRef({})
  const pal  = ZOMBIE_PALETTE[type] ?? ZOMBIE_PALETTE.E01

  // 안정적인 ref 콜백 — 매 렌더마다 새 함수 생성 방지
  const regRef = useRef(null)
  if (!regRef.current) {
    const pc = p
    regRef.current = (k) => {
      let cb = regRef.current._cbs[k]
      if (!cb) { cb = (el) => { if (el) pc.current[k] = el }; regRef.current._cbs[k] = cb }
      return cb
    }
    regRef.current._cbs = {}
  }
  const reg = regRef.current

  useFrame((state, delta) => {
    const pt = p.current
    if (!pt.legL) return
    const t = state.clock.elapsedTime

    // retreat: 역방향 뒷걸음 + 몸통 후방 틸트
    if (animPhase === 'retreat') {
      if (pt.body) {
        pt.body.scale.setScalar(1)
        pt.body.rotation.x += (-0.3 - pt.body.rotation.x) * Math.min(1, delta * 15)
      }
      const freq = type === 'E02' ? 9.0 : type === 'E03' ? 5.0 : 7.0
      const sw = Math.sin(-t * freq * 1.4) * 0.42  // 역방향, 빠른 두 걸음
      pt.legL.rotation.x =  sw
      pt.legR.rotation.x = -sw
      const armBase = -1.15
      pt.armL.rotation.x = armBase + Math.sin(-t * 2.8) * 0.10
      pt.armR.rotation.x = armBase + Math.sin(-t * 2.8 + Math.PI) * 0.10
      if (pt.head) pt.head.rotation.z = Math.sin(t * 1.6) * 0.07
      return
    }

    // warn: 몸통 빠른 진동 (돌진 예고) — retreat 후 틸트 잔존 방지
    if (animPhase === 'warn') {
      const fl = Math.floor(t * 14) % 2
      if (pt.body) {
        pt.body.scale.setScalar(fl ? 1.06 : 0.96)
        pt.body.rotation.x += (0 - pt.body.rotation.x) * Math.min(1, delta * 10)
      }
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

  if (isMatilda) {
    return <MatildaMesh />
  }

  if (type === 'B01') {
    return <B01BossZombieMesh hitFlash={hitFlash} reg={reg} />
  }

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
