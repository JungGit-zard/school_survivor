import { useMemo } from 'react'
import * as THREE from 'three'
import { inflateScale, outlineMat, toonMat } from '../../lib/toon.js'

export const UNCONSCIOUS_STUDENT_VARIANTS = {
  faceUp: {
    modelPosition: [0, 0.34, 0],
    modelRotation: [Math.PI / 2, 0, 0],
    bodyRotation: [0, 0, 0],
    shadowScale: [1.26, 0.66, 1],
    shadowOpacity: 0.22,
  },
  sideLeft: {
    modelPosition: [0, 0.36, 0],
    modelRotation: [Math.PI / 2, 0, -0.24],
    bodyRotation: [0, 0.2, 0],
    shadowScale: [1.2, 0.72, 1],
    shadowOpacity: 0.22,
  },
  sideRight: {
    modelPosition: [0, 0.36, 0],
    modelRotation: [Math.PI / 2, 0, 0.22],
    bodyRotation: [0, -0.18, 0],
    shadowScale: [1.2, 0.72, 1],
    shadowOpacity: 0.22,
  },
}

function StudentBox({
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

function HairBlock({ position, rotation = [0, 0, 0], scale, material, outline }) {
  return <StudentBox position={position} rotation={rotation} scale={scale} material={material} outline={outline} />
}

export default function UnconsciousStudent({ variant = 'faceUp', ...props }) {
  const variantConfig = UNCONSCIOUS_STUDENT_VARIANTS[variant] ?? UNCONSCIOUS_STUDENT_VARIANTS.faceUp
  const skinMat = useMemo(() => toonMat(0xf2cba3, 0.08), [])
  const hairMat = useMemo(() => toonMat(0x3d2e22, 0.03), [])
  const uniformMat = useMemo(() => toonMat(0x1f2d4d, 0.06), [])
  const pantsMat = useMemo(() => toonMat(0x7a7a7a, 0.02), [])
  const shoeMat = useMemo(() => toonMat(0x1c1c1c, 0), [])
  const tieMat = useMemo(() => toonMat(0xa32727, 0.05), [])
  const badgeMat = useMemo(() => toonMat(0xf2c14e, 0.12), [])
  const outline = useMemo(() => outlineMat(0.9, 0x130d0d), [])
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
        <circleGeometry args={[1.04, 24]} />
      </mesh>

      <group position={variantConfig.modelPosition} rotation={variantConfig.modelRotation}>
        <group rotation={variantConfig.bodyRotation}>
          <StudentBox position={[0, 0.48, 0]} scale={[0.62, 0.78, 0.28]} material={uniformMat} outline={outline} />
          <StudentBox position={[0, 0.82, 0.17]} scale={[0.18, 0.36, 0.045]} material={tieMat} outline={outline} />
          <StudentBox position={[0.26, 0.66, 0.18]} scale={[0.09, 0.09, 0.035]} material={badgeMat} outline={outline} />

          <StudentBox position={[-0.56, 0.48, 0]} rotation={[0, 0, -0.72]} scale={[0.18, 0.68, 0.2]} material={uniformMat} outline={outline} />
          <StudentBox position={[0.56, 0.48, 0]} rotation={[0, 0, 0.72]} scale={[0.18, 0.68, 0.2]} material={uniformMat} outline={outline} />
          <StudentBox position={[-0.86, 0.22, 0]} scale={[0.22, 0.22, 0.2]} material={skinMat} outline={outline} />
          <StudentBox position={[0.86, 0.22, 0]} scale={[0.22, 0.22, 0.2]} material={skinMat} outline={outline} />

          <StudentBox position={[-0.2, -0.26, 0]} rotation={[0, 0, 0.16]} scale={[0.24, 0.82, 0.22]} material={pantsMat} outline={outline} />
          <StudentBox position={[0.24, -0.28, 0]} rotation={[0, 0, -0.14]} scale={[0.24, 0.86, 0.22]} material={pantsMat} outline={outline} />
          <StudentBox position={[-0.26, -0.76, 0]} scale={[0.28, 0.2, 0.24]} material={shoeMat} outline={outline} />
          <StudentBox position={[0.32, -0.8, 0]} scale={[0.3, 0.2, 0.24]} material={shoeMat} outline={outline} />

          <StudentBox position={[0, 1.22, 0.02]} scale={[0.5, 0.42, 0.38]} material={skinMat} outline={outline} />
          <HairBlock position={[0, 1.44, 0]} scale={[0.54, 0.18, 0.42]} material={hairMat} outline={outline} />
          <HairBlock position={[-0.28, 1.28, 0.04]} rotation={[0, 0, -0.1]} scale={[0.18, 0.32, 0.18]} material={hairMat} outline={outline} />
          <HairBlock position={[0.28, 1.28, 0.04]} rotation={[0, 0, 0.1]} scale={[0.18, 0.3, 0.18]} material={hairMat} outline={outline} />

          <StudentBox position={[-0.13, 1.24, 0.25]} rotation={[0, 0, 0.72]} scale={[0.13, 0.035, 0.025]} material={shoeMat} outline={outline} />
          <StudentBox position={[-0.13, 1.24, 0.25]} rotation={[0, 0, -0.72]} scale={[0.13, 0.035, 0.025]} material={shoeMat} outline={outline} />
          <StudentBox position={[0.13, 1.24, 0.25]} rotation={[0, 0, 0.72]} scale={[0.13, 0.035, 0.025]} material={shoeMat} outline={outline} />
          <StudentBox position={[0.13, 1.24, 0.25]} rotation={[0, 0, -0.72]} scale={[0.13, 0.035, 0.025]} material={shoeMat} outline={outline} />
          <StudentBox position={[0, 1.08, 0.27]} scale={[0.18, 0.055, 0.03]} material={shoeMat} outline={outline} />
        </group>
      </group>
    </group>
  )
}
