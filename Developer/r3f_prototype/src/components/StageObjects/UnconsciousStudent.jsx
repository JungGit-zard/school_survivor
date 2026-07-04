import { useMemo } from 'react'
import { outlineMat, toonMat } from '../../lib/toon.js'
import { getPropOutlineScale, STAGE_PROP_MESH_RENDERING } from './propRendering.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

export const UNCONSCIOUS_STUDENT_VARIANTS = {
  faceUp: {
    modelPosition: [0, 0.34, 0],
    modelRotation: [Math.PI / 2, 0, 0],
    bodyRotation: [0, 0, 0],
  },
  faceUpFlipped: {
    modelPosition: [0, 0.34, 0],
    modelRotation: [-Math.PI / 2, 0, 0],
    bodyRotation: [0, 0, 0],
  },
  sideLeft: {
    modelPosition: [0, 0.36, 0],
    modelRotation: [Math.PI / 2, 0, -0.24],
    bodyRotation: [0, 0.2, 0],
  },
  sideLeftFlipped: {
    modelPosition: [0, 0.36, 0],
    modelRotation: [-Math.PI / 2, 0, -0.24],
    bodyRotation: [0, 0.2, 0],
  },
  sideRight: {
    modelPosition: [0, 0.36, 0],
    modelRotation: [Math.PI / 2, 0, 0.22],
    bodyRotation: [0, -0.18, 0],
  },
  sideRightFlipped: {
    modelPosition: [0, 0.36, 0],
    modelRotation: [-Math.PI / 2, 0, 0.22],
    bodyRotation: [0, -0.18, 0],
  },
}

function StudentBox({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  material,
  outline,
}) {
  const outlineScale = useMemo(() => getPropOutlineScale(scale), [scale])

  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_MESH_RENDERING} scale={scale} material={material}>
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
  // 색·발광은 어두운 마루 바닥 대비 가독성 기준으로 책정 — 45° 탑다운에서 누운 자세는
  // 화면 점유가 작아, 어두운 남색/회색이면 잔해처럼 보인다 (2026-06-13 인게임 검증).
  const skinMat = useMemo(() => toonMat(0xf2cba3, 0.12), [])
  const hairMat = useMemo(() => toonMat(0x55402c, 0.06), [])
  const uniformMat = useMemo(() => toonMat(0x3f5fa8, 0.12), [])
  const pantsMat = useMemo(() => toonMat(0x9aa1ad, 0.06), [])
  const shoeMat = useMemo(() => toonMat(0x2a2a30, 0.02), [])
  const tieMat = useMemo(() => toonMat(0xc23535, 0.08), [])
  const badgeMat = useMemo(() => toonMat(0xf2c14e, 0.12), [])
  const outline = useMemo(() => outlineMat(0.96, 0x130d0d), [])

  return (
    <group {...props}>
      <StudioTunedGroup itemId="stage-object-unconscious-student">
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
      </StudioTunedGroup>
    </group>
  )
}
