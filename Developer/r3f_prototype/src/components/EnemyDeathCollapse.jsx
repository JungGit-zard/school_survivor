import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { outlineMat, toonMat } from '../lib/toon.js'
import { ZOMBIE_PALETTE } from './ZombieMesh.jsx'

const BASE_PARTS = [
  { key: 'head', size: [0.52, 0.48, 0.46], offset: [0, 0.82, 0], color: 'skin', mass: 0.75 },
  { key: 'body', size: [0.56, 0.58, 0.40], offset: [0, 0.28, 0], color: 'body', mass: 1.4 },
  { key: 'armL', size: [0.20, 0.50, 0.20], offset: [-0.44, 0.26, 0.08], color: 'body', mass: 0.45 },
  { key: 'armR', size: [0.20, 0.50, 0.20], offset: [0.44, 0.26, 0.08], color: 'body', mass: 0.45 },
  { key: 'legL', size: [0.22, 0.52, 0.26], offset: [-0.15, -0.26, 0.02], color: 'body', mass: 0.55 },
  { key: 'legR', size: [0.22, 0.52, 0.26], offset: [0.15, -0.26, 0.02], color: 'body', mass: 0.55 },
]

const COLLAPSE_LIFETIME_MS = 800
const FADE_START_MS        = 500
const FADE_DURATION_MS     = COLLAPSE_LIFETIME_MS - FADE_START_MS
const SCATTER_SPEED        = 2
const GRAVITY              = 14   // collapse 전용 중력 가속도

function seededNoise(seed) {
  const x = Math.sin(seed * 999.13) * 43758.5453
  return x - Math.floor(x)
}

// ── scatter: 사방으로 튀어나가는 파편 ─────────────────────────────────────────
function makeScatterVel(seed) {
  const angle = seededNoise(seed)     * Math.PI * 2
  const speed = (1.2 + seededNoise(seed + 1) * 2.2) * SCATTER_SPEED
  const lift  = (0.5 + seededNoise(seed + 2) * 1.2) * SCATTER_SPEED
  const spin  = (2.2 + seededNoise(seed + 3) * 5.8) * SCATTER_SPEED
  return {
    x:  Math.sin(angle) * speed,
    y:  lift,
    z:  Math.cos(angle) * speed,
    rx: (seededNoise(seed + 7) - 0.5) * spin,
    ry: (seededNoise(seed + 8) - 0.5) * spin,
    rz: (seededNoise(seed + 9) - 0.5) * spin,
    gravity: 0,
  }
}

// ── crumble: 제자리에서 무너져 내리는 연출 ───────────────────────────────────
function makeCrumbleVel(seed, partIndex) {
  const angle    = seededNoise(seed)     * Math.PI * 2
  const sideDist = 0.15 + seededNoise(seed + 1) * 0.35   // 좁은 수평 퍼짐
  // 위쪽 파트(머리, 몸)는 살짝 위로 튀었다 떨어지고, 아래(팔,다리)는 바로 내려감
  const initialLift = partIndex < 2
    ? 0.6 + seededNoise(seed + 2) * 0.8
    : 0.1 + seededNoise(seed + 2) * 0.3
  const spin = 3.0 + seededNoise(seed + 3) * 5.0

  return {
    x:  Math.sin(angle) * sideDist,
    y:  initialLift,
    z:  Math.cos(angle) * sideDist,
    rx: (seededNoise(seed + 7) - 0.5) * spin,
    ry: (seededNoise(seed + 8) - 0.5) * spin,
    rz: (seededNoise(seed + 9) - 0.5) * spin,
    gravity: GRAVITY,
  }
}

function CollapsePart({ part, index, origin, visualScale, palette, startedAt, style }) {
  const groupRef   = useRef(null)
  const meshRef    = useRef(null)
  const outlineRef = useRef(null)

  const color       = palette[part.color] ?? palette.body
  const debrisColor = useMemo(() => new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.18).getHex(), [color])
  const mat = useMemo(() => {
    const m = toonMat(debrisColor, 0.85)
    m.transparent = true
    m.opacity = 1
    m.depthWrite = false
    m.depthTest = true
    m.toneMapped = false
    return m
  }, [debrisColor])
  const outMat = useMemo(() => {
    const m = outlineMat(0.52)
    m.depthTest = true
    return m
  }, [])

  const size = part.size.map((v) => v * visualScale)
  const seed = origin[0] * 17.1 + origin[2] * 31.7 + index * 13.37

  const vel = useRef(
    style === 'crumble'
      ? makeCrumbleVel(seed, index)
      : makeScatterVel(seed)
  )

  const pos = useRef({
    x:  origin[0] + part.offset[0] * visualScale,
    y:  origin[1] + part.offset[1] * visualScale,
    z:  origin[2] + part.offset[2] * visualScale,
    rx: seededNoise(seed + 4) * 0.8,
    ry: seededNoise(seed + 5) * Math.PI * 2,
    rz: seededNoise(seed + 6) * 0.8,
  })

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const v = vel.current
    const p = pos.current

    // 중력 적용 (crumble만, scatter는 gravity=0)
    v.y -= v.gravity * delta

    // 감속
    const linD = Math.max(0, 1 - (style === 'crumble' ? 2.8 : 1.6) * delta)
    const angD = Math.max(0, 1 - 1.2 * delta)
    v.x *= linD; v.z *= linD
    v.rx *= angD; v.ry *= angD; v.rz *= angD

    // 위치/회전 적분
    p.x += v.x * delta; p.y += v.y * delta; p.z += v.z * delta
    p.rx += v.rx * delta; p.ry += v.ry * delta; p.rz += v.rz * delta

    // 바닥 아래로 뚫리지 않게 (crumble 전용)
    if (style === 'crumble' && p.y < origin[1] - 0.1) {
      p.y = origin[1] - 0.1
      v.y = 0
    }

    groupRef.current.position.set(p.x, p.y, p.z)
    groupRef.current.rotation.set(p.rx, p.ry, p.rz)

    // 페이드아웃
    const elapsed = performance.now() - startedAt
    if (elapsed >= FADE_START_MS) {
      const opacity = Math.max(0, 1 - (elapsed - FADE_START_MS) / FADE_DURATION_MS)
      if (meshRef.current)    meshRef.current.material.opacity    = opacity
      if (outlineRef.current) outlineRef.current.material.opacity = opacity * 0.52
    }
  })

  return (
    <group
      ref={groupRef}
      position={[pos.current.x, pos.current.y, pos.current.z]}
      rotation={[pos.current.rx, pos.current.ry, pos.current.rz]}
    >
      <mesh ref={outlineRef} renderOrder={1} material={outMat} scale={[1.04, 1.04, 1.04]}>
        <boxGeometry args={size} />
      </mesh>
      <mesh ref={meshRef} renderOrder={2} material={mat}>
        <boxGeometry args={size} />
      </mesh>
    </group>
  )
}

export default function EnemyDeathCollapse({ id, type, position, visualScale, onDone }) {
  const palette      = ZOMBIE_PALETTE[type] ?? ZOMBIE_PALETTE.E01
  const startedAtRef = useRef(performance.now())

  // 보스/엘리트는 scatter, 일반 잡몹은 50% 확률로 crumble
  const style = useMemo(() => {
    if (type === 'B01' || type === 'E06') return 'scatter'
    return Math.random() < 0.5 ? 'scatter' : 'crumble'
  }, [type])

  useEffect(() => {
    const timer = window.setTimeout(() => onDone?.(id), COLLAPSE_LIFETIME_MS)
    return () => window.clearTimeout(timer)
  }, [id, onDone])

  return (
    <group>
      {BASE_PARTS.map((part, index) => (
        <CollapsePart
          key={`${id}-${part.key}`}
          part={part}
          index={index}
          origin={position}
          visualScale={visualScale}
          palette={palette}
          startedAt={startedAtRef.current}
          style={style}
        />
      ))}
    </group>
  )
}
