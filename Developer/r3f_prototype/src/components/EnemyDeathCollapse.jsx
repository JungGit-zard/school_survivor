import { useEffect, useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
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

function seededNoise(seed) {
  const x = Math.sin(seed * 999.13) * 43758.5453
  return x - Math.floor(x)
}

function CollapsePart({ part, index, origin, visualScale, palette }) {
  const color = palette[part.color] ?? palette.body
  const debrisColor = useMemo(() => new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.18).getHex(), [color])
  const mat = useMemo(() => {
    const material = toonMat(debrisColor, 0.85)
    material.depthWrite = false
    material.depthTest = true
    material.toneMapped = false
    return material
  }, [debrisColor])
  const outMat = useMemo(() => {
    const material = outlineMat(0.52)
    material.depthTest = true
    return material
  }, [])
  const size = part.size.map((v) => v * visualScale)

  const seed = origin[0] * 17.1 + origin[2] * 31.7 + index * 13.37
  const angle = seededNoise(seed) * Math.PI * 2
  const speed = 1.2 + seededNoise(seed + 1) * 2.2
  const lift = 0.5 + seededNoise(seed + 2) * 1.2
  const spin = 2.2 + seededNoise(seed + 3) * 5.8
  const x = origin[0] + part.offset[0] * visualScale
  const y = origin[1] + part.offset[1] * visualScale
  const z = origin[2] + part.offset[2] * visualScale

  return (
    <RigidBody
      type="dynamic"
      position={[x, y, z]}
      rotation={[
        seededNoise(seed + 4) * 0.8,
        seededNoise(seed + 5) * Math.PI * 2,
        seededNoise(seed + 6) * 0.8,
      ]}
      linearVelocity={[Math.sin(angle) * speed, lift, Math.cos(angle) * speed]}
      angularVelocity={[
        (seededNoise(seed + 7) - 0.5) * spin,
        (seededNoise(seed + 8) - 0.5) * spin,
        (seededNoise(seed + 9) - 0.5) * spin,
      ]}
      linearDamping={2.2}
      angularDamping={1.4}
      colliders={false}
      gravityScale={0}
      mass={part.mass}
    >
      <mesh renderOrder={1} material={outMat} scale={[1.04, 1.04, 1.04]}>
        <boxGeometry args={size} />
      </mesh>
      <mesh renderOrder={2} material={mat}>
        <boxGeometry args={size} />
      </mesh>
    </RigidBody>
  )
}

export default function EnemyDeathCollapse({ id, type, position, visualScale, onDone }) {
  const palette = ZOMBIE_PALETTE[type] ?? ZOMBIE_PALETTE.E01

  useEffect(() => {
    const timer = window.setTimeout(() => onDone?.(id), 1000)
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
        />
      ))}
    </group>
  )
}
