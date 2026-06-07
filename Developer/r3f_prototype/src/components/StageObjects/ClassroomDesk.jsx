import { useMemo } from 'react'
import * as THREE from 'three'
import { inflateScale, outlineMat, toonMat } from '../../lib/toon.js'

export const CLASSROOM_DESK_VARIANTS = {
  upright: {
    modelPosition: [0, 0, 0],
    modelRotation: [0, 0, 0],
    shadowScale: [1, 1, 1],
    shadowOpacity: 0.18,
  },
  abandoned: {
    modelPosition: [0, 0.02, 0],
    modelRotation: [0.03, 0, -0.1],
    shadowScale: [1.08, 0.92, 1],
    shadowOpacity: 0.2,
  },
  tilted: {
    modelPosition: [0, 0.08, 0],
    modelRotation: [0.1, 0, 0.18],
    shadowScale: [1.16, 0.86, 1],
    shadowOpacity: 0.2,
  },
  overturned: {
    modelPosition: [0, 0.92, 0],
    modelRotation: [0, 0, Math.PI],
    shadowScale: [1.22, 0.82, 1],
    shadowOpacity: 0.22,
  },
}

function DeskBox({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  geometryArgs = [1, 1, 1],
  material,
  outline,
}) {
  const outlineScale = useMemo(() => inflateScale(scale), [scale])

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow scale={scale} material={material}>
        <boxGeometry args={geometryArgs} />
      </mesh>
      <mesh scale={outlineScale} material={outline}>
        <boxGeometry args={geometryArgs} />
      </mesh>
    </group>
  )
}

export default function ClassroomDesk({ variant = 'upright', ...props }) {
  const variantConfig = CLASSROOM_DESK_VARIANTS[variant] ?? CLASSROOM_DESK_VARIANTS.upright
  const topMat = useMemo(() => toonMat(0xd9b27a, 0.08), [])
  const topHighlightMat = useMemo(() => toonMat(0xe6c697, 0.12), [])
  const frameMat = useMemo(() => toonMat(0xb0b0b0, 0.03), [])
  const storageMat = useMemo(() => toonMat(0x7a7a7a, 0.02), [])
  const capMat = useMemo(() => toonMat(0x333333, 0), [])
  const outline = useMemo(() => outlineMat(0.9, 0x24170f), [])
  const shadowMat = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: 0x150f12,
      transparent: true,
      opacity: variantConfig.shadowOpacity,
      depthWrite: false,
    }),
    [variantConfig.shadowOpacity]
  )

  return (
    <group {...props}>
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={variantConfig.shadowScale}
        material={shadowMat}
        renderOrder={1}
      >
        <circleGeometry args={[0.98, 20]} />
      </mesh>

      <group position={variantConfig.modelPosition} rotation={variantConfig.modelRotation}>
        <DeskBox position={[0, 0.78, 0]} scale={[1.76, 0.12, 1.04]} material={topMat} outline={outline} />
        <DeskBox position={[0, 0.845, 0]} scale={[1.56, 0.03, 0.86]} material={topHighlightMat} outline={outline} />

        <DeskBox position={[0, 0.53, 0.18]} scale={[1.24, 0.18, 0.56]} material={storageMat} outline={outline} />
        <DeskBox position={[0, 0.62, -0.38]} scale={[1.3, 0.05, 0.08]} material={frameMat} outline={outline} />
        <DeskBox position={[0, 0.62, 0.4]} scale={[1.3, 0.05, 0.08]} material={frameMat} outline={outline} />

        {[
          [-0.68, 0.36, -0.36],
          [0.68, 0.36, -0.36],
          [-0.68, 0.36, 0.36],
          [0.68, 0.36, 0.36],
        ].map(([x, y, z]) => (
          <group key={`${x}:${z}`} position={[x, y, z]}>
            <DeskBox scale={[0.08, 0.72, 0.08]} material={frameMat} outline={outline} />
            <DeskBox position={[0, -0.39, 0]} scale={[0.13, 0.06, 0.13]} material={capMat} outline={outline} />
          </group>
        ))}
      </group>
    </group>
  )
}
