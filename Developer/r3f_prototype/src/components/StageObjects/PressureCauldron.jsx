import {
  getStagePropDepthWritingToonMaterial,
  getStagePropOutlineMaterial,
  getStagePropOutlineUserData,
  STAGE_PROP_OUTLINE_RENDERING,
  STAGE_PROP_SURFACE_RENDERING,
  STAGE_PROP_UNIT_BOX_GEOMETRY,
} from './propRendering.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

const OUTLINE_SCALE = 1.035

function Box({ position = [0, 0, 0], rotation = [0, 0, 0], scale, material, outlined = false }) {
  const outline = outlined ? getStagePropOutlineMaterial(0.96, 0x050209) : null
  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_SURFACE_RENDERING} geometry={STAGE_PROP_UNIT_BOX_GEOMETRY} material={material} scale={scale} />
      {outline && (
        <mesh {...STAGE_PROP_OUTLINE_RENDERING} userData={getStagePropOutlineUserData()} geometry={STAGE_PROP_UNIT_BOX_GEOMETRY} material={outline} scale={scale.map((value) => value * OUTLINE_SCALE)} />
      )}
    </group>
  )
}

function Cylinder({ position = [0, 0, 0], rotation = [0, 0, 0], args, material }) {
  return (
    <mesh {...STAGE_PROP_SURFACE_RENDERING} position={position} rotation={rotation} material={material}>
      <cylinderGeometry args={args} />
    </mesh>
  )
}

// The runtime and Studio preview both render this exact component.  Keep the
// outer StudioTunedGroup as the only transform authority for this landmark.
export default function PressureCauldron({ ...props }) {
  const white = getStagePropDepthWritingToonMaterial(0xf3f4ef, 0.04)
  const whiteShade = getStagePropDepthWritingToonMaterial(0xd7dcd8, 0.04)
  const dark = getStagePropDepthWritingToonMaterial(0x262b30, 0.02)
  const darkEdge = getStagePropDepthWritingToonMaterial(0x101316, 0.01)
  const yellow = getStagePropDepthWritingToonMaterial(0xf0c432, 0.12)
  const red = getStagePropDepthWritingToonMaterial(0xc8382d, 0.12)
  const gauge = getStagePropDepthWritingToonMaterial(0xf7f7ef, 0.02)

  return (
    <group {...props} name="pressure-cauldron">
      <StudioTunedGroup itemId="stage-object-pressure-cauldron">
        <group name="pressure-cauldron-dark-industrial-base">
          <Cylinder position={[0, 0.22, 0]} args={[3.05, 3.28, 0.44, 10]} material={dark} />
          <Cylinder position={[0, 0.47, 0]} args={[2.90, 3.04, 0.14, 10]} material={darkEdge} />
          {[-2.15, 2.15].map((x) => <Box key={x} position={[x, 0.26, 0]} scale={[0.45, 0.36, 1.35]} material={dark} outlined />)}
        </group>

        <group name="pressure-cauldron-faceted-white-vessel">
          <Cylinder position={[0, 1.78, 0]} args={[2.95, 2.58, 2.72, 10]} material={white} />
          <Cylinder position={[0, 2.93, 0]} args={[2.98, 2.95, 0.20, 10]} material={whiteShade} />
          <Cylinder position={[0, 3.18, 0]} args={[2.74, 2.94, 0.34, 10]} material={white} />
          <Cylinder position={[0, 3.39, 0]} args={[2.35, 2.58, 0.14, 10]} material={dark} />
        </group>

        <group name="pressure-cauldron-yellow-top-handle">
          <Box position={[0, 3.72, 0]} scale={[1.55, 0.25, 0.38]} material={yellow} outlined />
          <Box position={[-0.62, 3.53, 0]} rotation={[0, 0, -0.34]} scale={[0.27, 0.52, 0.38]} material={yellow} outlined />
          <Box position={[0.62, 3.53, 0]} rotation={[0, 0, 0.34]} scale={[0.27, 0.52, 0.38]} material={yellow} outlined />
        </group>

        <group name="pressure-cauldron-gauge-and-red-indicator" position={[0, 3.58, 1.88]}>
          <Cylinder rotation={[Math.PI / 2, 0, 0]} args={[0.38, 0.38, 0.16, 10]} material={dark} />
          <Cylinder position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]} args={[0.29, 0.29, 0.03, 10]} material={gauge} />
          <Box position={[0, 0.06, 0.125]} rotation={[0, 0, -0.58]} scale={[0.035, 0.20, 0.03]} material={red} />
          <Cylinder position={[0.76, -0.02, 0.07]} rotation={[Math.PI / 2, 0, 0]} args={[0.17, 0.17, 0.14, 8]} material={red} />
        </group>

        <group name="pressure-cauldron-red-side-handwheel" position={[3.02, 1.86, 0]} rotation={[0, 0, Math.PI / 2]}>
          <Cylinder args={[0.66, 0.66, 0.18, 10]} material={red} />
          <Cylinder position={[0, 0.14, 0]} args={[0.18, 0.18, 0.36, 8]} material={dark} />
          <Box position={[0, 0.27, 0]} scale={[1.38, 0.10, 0.10]} material={red} />
          <Box position={[0, 0.27, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1.38, 0.10, 0.10]} material={red} />
        </group>

        <group name="pressure-cauldron-front-step-and-pipe">
          <Box position={[0, 0.27, 3.23]} scale={[2.20, 0.32, 0.72]} material={dark} outlined />
          <Box position={[0, 0.57, 2.84]} scale={[1.62, 0.20, 0.26]} material={whiteShade} />
          <Cylinder position={[-1.10, 0.62, 3.05]} rotation={[0, Math.PI / 2, 0]} args={[0.14, 0.14, 0.74, 8]} material={dark} />
        </group>

        <group name="pressure-cauldron-side-control-housings">
          <Box position={[-2.92, 1.40, 0.24]} scale={[0.38, 0.72, 0.72]} material={dark} outlined />
          <Box position={[-3.18, 1.68, 0.24]} scale={[0.12, 0.24, 0.40]} material={yellow} />
          <Box position={[2.80, 1.18, -1.34]} scale={[0.44, 0.58, 0.62]} material={dark} outlined />
        </group>
      </StudioTunedGroup>
    </group>
  )
}
