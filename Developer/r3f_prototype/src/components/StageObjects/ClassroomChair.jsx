import { useMemo } from 'react'
import * as THREE from 'three'
import { inflateScale, outlineMat, toonMat } from '../../lib/toon.js'

export const CLASSROOM_CHAIR_VARIANTS = {
  upright: {
    modelPosition: [0, 0, 0],
    modelRotation: [0, 0, 0],
    shadowScale: [0.78, 0.78, 1],
    shadowOpacity: 0.17,
  },
  abandoned: {
    modelPosition: [0, 0.02, 0],
    modelRotation: [0.02, 0, -0.12],
    shadowScale: [0.86, 0.74, 1],
    shadowOpacity: 0.19,
  },
  tilted: {
    modelPosition: [0, 0.07, 0],
    modelRotation: [0.08, 0, 0.2],
    shadowScale: [0.94, 0.68, 1],
    shadowOpacity: 0.2,
  },
  overturned: {
    modelPosition: [0, 0.74, 0],
    modelRotation: [0, 0, Math.PI],
    shadowScale: [1.02, 0.64, 1],
    shadowOpacity: 0.22,
  },
}

function ChairBox({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  material,
  outline,
}) {
  const outlineScale = useMemo(() => inflateScale(scale), [scale])

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow scale={scale} material={material}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh scale={outlineScale} material={outline}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  )
}

export default function ClassroomChair({ variant = 'upright', ...props }) {
  const variantConfig = CLASSROOM_CHAIR_VARIANTS[variant] ?? CLASSROOM_CHAIR_VARIANTS.upright
  const woodMat = useMemo(() => toonMat(0xd9b27a, 0.08), [])
  const woodHighlightMat = useMemo(() => toonMat(0xe6c697, 0.12), [])
  const frameMat = useMemo(() => toonMat(0xb0b0b0, 0.03), [])
  const boltMat = useMemo(() => toonMat(0x7a7a7a, 0.02), [])
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
        <circleGeometry args={[0.78, 20]} />
      </mesh>

      <group position={variantConfig.modelPosition} rotation={variantConfig.modelRotation}>
        <ChairBox position={[0, 0.54, 0]} scale={[1.02, 0.11, 0.9]} material={woodMat} outline={outline} />
        <ChairBox position={[0, 0.6, 0]} scale={[0.84, 0.025, 0.74]} material={woodHighlightMat} outline={outline} />
        <ChairBox position={[0, 1.18, -0.36]} scale={[1.02, 0.44, 0.1]} material={woodMat} outline={outline} />
        <ChairBox position={[0, 1.25, -0.305]} scale={[0.8, 0.05, 0.025]} material={woodHighlightMat} outline={outline} />

        <ChairBox position={[-0.42, 0.88, -0.36]} scale={[0.08, 0.72, 0.08]} material={frameMat} outline={outline} />
        <ChairBox position={[0.42, 0.88, -0.36]} scale={[0.08, 0.72, 0.08]} material={frameMat} outline={outline} />
        <ChairBox position={[0, 0.54, -0.38]} scale={[0.95, 0.06, 0.08]} material={frameMat} outline={outline} />
        <ChairBox position={[0, 0.33, 0.28]} scale={[0.92, 0.05, 0.07]} material={frameMat} outline={outline} />

        {[
          [-0.42, 0.28, -0.32],
          [0.42, 0.28, -0.32],
          [-0.42, 0.28, 0.34],
          [0.42, 0.28, 0.34],
        ].map(([x, y, z]) => (
          <group key={`${x}:${z}`} position={[x, y, z]}>
            <ChairBox scale={[0.08, 0.56, 0.08]} material={frameMat} outline={outline} />
            <ChairBox position={[0, -0.31, 0]} scale={[0.13, 0.06, 0.13]} material={capMat} outline={outline} />
          </group>
        ))}

        {[
          [-0.36, 1.2, -0.295],
          [0.36, 1.2, -0.295],
          [-0.32, 0.62, 0.38],
          [0.32, 0.62, 0.38],
        ].map(([x, y, z]) => (
          <ChairBox key={`${x}:${y}:${z}`} position={[x, y, z]} scale={[0.055, 0.055, 0.025]} material={boltMat} outline={outline} />
        ))}
      </group>
    </group>
  )
}
