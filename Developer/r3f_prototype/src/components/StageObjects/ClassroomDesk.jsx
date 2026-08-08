import {
  getPropOutlineScale,
  getStagePropOutlineUserData,
  getStagePropOutlineMaterial,
  getStagePropDepthWritingToonMaterial,
  STAGE_PROP_SHARED_OUTLINE_RENDERING,
  STAGE_PROP_SHARED_SURFACE_RENDERING,
  STAGE_PROP_UNIT_BOX_GEOMETRY,
} from './propRendering.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

export const CLASSROOM_DESK_VARIANTS = {
  upright: {
    modelPosition: [0, 0, 0],
    modelRotation: [0, 0, 0],
  },
  abandoned: {
    modelPosition: [0, 0.02, 0],
    modelRotation: [0.03, 0, -0.1],
  },
  tilted: {
    modelPosition: [0, 0.08, 0],
    modelRotation: [0.1, 0, 0.18],
  },
  overturned: {
    modelPosition: [0, 0.92, 0],
    modelRotation: [0, 0, Math.PI],
  },
}

function DeskBox({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  material,
  outline,
}) {
  const outlineScale = getPropOutlineScale(scale)

  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_SHARED_SURFACE_RENDERING} scale={scale} material={material} geometry={STAGE_PROP_UNIT_BOX_GEOMETRY} />
      <mesh {...STAGE_PROP_SHARED_OUTLINE_RENDERING} userData={getStagePropOutlineUserData()} scale={outlineScale} material={outline} geometry={STAGE_PROP_UNIT_BOX_GEOMETRY} />
    </group>
  )
}

export default function ClassroomDesk({ variant = 'upright', ...props }) {
  const variantConfig = CLASSROOM_DESK_VARIANTS[variant] ?? CLASSROOM_DESK_VARIANTS.upright
  const topMat = getStagePropDepthWritingToonMaterial(0xd9b27a, 0.08)
  const topHighlightMat = getStagePropDepthWritingToonMaterial(0xe6c697, 0.12)
  const frameMat = getStagePropDepthWritingToonMaterial(0xb0b0b0, 0.03)
  const storageMat = getStagePropDepthWritingToonMaterial(0x7a7a7a, 0.02)
  const capMat = getStagePropDepthWritingToonMaterial(0x333333, 0)
  const outline = getStagePropOutlineMaterial(0.9, 0x24170f)

  return (
    <group {...props}>
      <StudioTunedGroup itemId="stage-object-desk">
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
      </StudioTunedGroup>
    </group>
  )
}
