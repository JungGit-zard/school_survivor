import {
  getStagePropDepthWritingToonMaterial,
  getStagePropOutlineMaterial,
  getStagePropOutlineUserData,
  STAGE_PROP_OUTLINE_RENDERING,
  STAGE_PROP_SURFACE_RENDERING,
  STAGE_PROP_UNIT_BOX_GEOMETRY,
} from './propRendering.js'
import { getCachedCylinderGeo } from '../../lib/toon.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

const OUTLINE_SCALE = 1.035
export const PRESSURE_CAULDRON_BASE_SCALE = 0.2

function scaleToBaseScale(scale) {
  const source = Array.isArray(scale) ? scale : [scale ?? 1, scale ?? 1, scale ?? 1]
  return source.map((value) => value * PRESSURE_CAULDRON_BASE_SCALE)
}

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

function Cylinder({ position = [0, 0, 0], rotation = [0, 0, 0], args, material, outlined = false }) {
  const geometry = getCachedCylinderGeo(...args)
  const outline = outlined ? getStagePropOutlineMaterial(0.96, 0x050209) : null
  return (
    <mesh {...STAGE_PROP_SURFACE_RENDERING} position={position} rotation={rotation} geometry={geometry} material={material}>
      {outline && (
        <mesh {...STAGE_PROP_OUTLINE_RENDERING} userData={getStagePropOutlineUserData()} geometry={geometry} material={outline} scale={[OUTLINE_SCALE, OUTLINE_SCALE, OUTLINE_SCALE]} />
      )}
    </mesh>
  )
}

function GaugeTicks({ dark }) {
  return [0, 1, 2, 3, 4, 5].map((index) => {
    const angle = -0.9 + index * 0.36
    return (
      <Box
        key={index}
        position={[Math.sin(angle) * 0.22, Math.cos(angle) * 0.22, 0.13]}
        rotation={[0, 0, -angle]}
        scale={[0.035, 0.11, 0.02]}
        material={dark}
      />
    )
  })
}

function Latch({ position, dark, yellow, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <Box scale={[0.46, 0.34, 0.26]} material={dark} />
      <Box position={[0, 0.01, 0.15]} scale={[0.24, 0.14, 0.08]} material={yellow} />
    </group>
  )
}

// The runtime and Studio preview both render this exact component. Keep this
// shared base-scale seam inside the model, while placement and Studio/Firebase
// tuning stay on their existing canonical paths.
export default function PressureCauldron({ scale, ...props }) {
  const white = getStagePropDepthWritingToonMaterial(0xf3f4ef, 0.04)
  const whiteShade = getStagePropDepthWritingToonMaterial(0xd7dcd8, 0.04)
  const dark = getStagePropDepthWritingToonMaterial(0x262b30, 0.02)
  const darkEdge = getStagePropDepthWritingToonMaterial(0x101316, 0.01)
  const yellow = getStagePropDepthWritingToonMaterial(0xf0c432, 0.12)
  const red = getStagePropDepthWritingToonMaterial(0xc8382d, 0.12)
  const gauge = getStagePropDepthWritingToonMaterial(0xf7f7ef, 0.02)
  const gray = getStagePropDepthWritingToonMaterial(0x697078, 0.04)

  return (
    <group {...props} name="pressure-cauldron" scale={scaleToBaseScale(scale)}>
      {/* Only this fixed 0.2 model uses parent-base inverse position compensation. */}
      <StudioTunedGroup itemId="stage-object-pressure-cauldron" transformPositionMultiplier={1 / PRESSURE_CAULDRON_BASE_SCALE}>
        <group name="pressure-cauldron-dark-industrial-base">
          <Cylinder position={[0, 0.24, 0]} args={[3.34, 3.48, 0.48, 10]} material={dark} outlined />
          <Cylinder position={[0, 0.52, 0]} args={[3.16, 3.30, 0.16, 10]} material={darkEdge} outlined />
          <Box position={[-2.50, 0.28, 0]} scale={[0.44, 0.38, 1.40]} material={dark} />
          <Box position={[2.50, 0.28, 0]} scale={[0.44, 0.38, 1.40]} material={dark} />
        </group>

        <group name="pressure-cauldron-faceted-white-vessel">
          <Cylinder position={[0, 1.64, 0]} args={[3.18, 2.86, 2.34, 10]} material={white} outlined />
          <Cylinder position={[0, 2.88, 0]} args={[3.22, 3.18, 0.18, 10]} material={whiteShade} outlined />
          <Cylinder position={[0, 3.06, 0]} args={[3.18, 2.78, 0.26, 10]} material={white} outlined />
          <Cylinder position={[0, 3.25, 0]} args={[2.76, 2.42, 0.16, 10]} material={white} outlined />
          <Cylinder position={[0, 3.33, 0]} args={[2.46, 2.40, 0.09, 10]} material={dark} outlined />
          <group name="pressure-cauldron-white-safety-valve" position={[-0.88, 3.52, 0.08]}>
            <Cylinder args={[0.13, 0.13, 0.20, 8]} material={dark} />
            <Cylinder position={[0, 0.18, 0]} args={[0.27, 0.27, 0.18, 10]} material={white} outlined />
            <Cylinder position={[0, 0.31, 0]} args={[0.07, 0.07, 0.09, 8]} material={red} />
          </group>
          <group name="pressure-cauldron-lid-latches-and-hinges">
            <Latch position={[-1.55, 2.77, 2.48]} dark={dark} yellow={yellow} rotation={[0, -0.28, 0]} />
            <Latch position={[0, 2.77, 2.64]} dark={dark} yellow={yellow} />
            <Latch position={[1.55, 2.77, 2.48]} dark={dark} yellow={yellow} rotation={[0, 0.28, 0]} />
            <Latch position={[-2.95, 2.74, 0.52]} dark={dark} yellow={yellow} rotation={[0, Math.PI / 2, 0]} />
            <Latch position={[2.95, 2.74, 0.52]} dark={dark} yellow={yellow} rotation={[0, Math.PI / 2, 0]} />
            {[-1.30, 1.30].map((x) => <Box key={x} position={[x, 2.78, -2.52]} scale={[0.48, 0.36, 0.30]} material={dark} />)}
          </group>
        </group>

        <group name="pressure-cauldron-yellow-top-handle">
          <Box position={[0, 3.67, -0.04]} scale={[1.72, 0.28, 0.42]} material={yellow} outlined />
          <Box position={[-0.74, 3.47, -0.04]} rotation={[0, 0, -0.40]} scale={[0.28, 0.58, 0.42]} material={yellow} outlined />
          <Box position={[0.74, 3.47, -0.04]} rotation={[0, 0, 0.40]} scale={[0.28, 0.58, 0.42]} material={yellow} outlined />
          {[-0.74, 0.74].map((x) => <Box key={x} position={[x, 3.23, -0.04]} scale={[0.44, 0.18, 0.52]} material={dark} />)}
        </group>

        <group name="pressure-cauldron-gauge-and-red-indicator" position={[1.16, 3.46, 0.28]}>
          <Cylinder rotation={[Math.PI / 2, 0, 0]} args={[0.43, 0.43, 0.18, 10]} material={dark} outlined />
          <Cylinder position={[0, 0, 0.105]} rotation={[Math.PI / 2, 0, 0]} args={[0.33, 0.33, 0.035, 10]} material={gauge} outlined />
          <Box position={[0.02, 0.08, 0.155]} rotation={[0, 0, -0.58]} scale={[0.045, 0.23, 0.035]} material={red} />
          <Cylinder position={[0.76, -0.02, 0.07]} rotation={[Math.PI / 2, 0, 0]} args={[0.17, 0.17, 0.14, 8]} material={red} />
          <group name="pressure-cauldron-gauge-ticks-and-needle">
            <GaugeTicks dark={dark} />
            <Cylinder position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]} args={[0.06, 0.06, 0.035, 8]} material={dark} />
          </group>
        </group>

        <group name="pressure-cauldron-red-side-handwheel" position={[3.18, 1.18, 2.04]} rotation={[0, 0, Math.PI / 2]}>
          <Cylinder args={[0.68, 0.68, 0.20, 10]} material={red} outlined />
          <Cylinder position={[0, 0.11, 0]} args={[0.20, 0.20, 0.26, 8]} material={dark} />
          <Box position={[0, 0.18, 0]} scale={[1.30, 0.09, 0.09]} material={red} />
          <Box position={[0, 0.18, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1.30, 0.09, 0.09]} material={red} />
          <group name="pressure-cauldron-right-front-red-handwheel">
            <Cylinder position={[0, -0.34, 0]} args={[0.16, 0.16, 0.42, 8]} material={dark} />
          </group>
        </group>

        <group name="pressure-cauldron-front-step-and-pipe">
          <Box position={[-0.76, 0.28, 3.38]} scale={[1.10, 0.34, 0.76]} material={dark} outlined />
          <Box position={[-0.76, 0.51, 3.79]} scale={[1.10, 0.12, 0.10]} material={yellow} />
          <Cylinder position={[-1.26, 0.62, 3.08]} rotation={[0, Math.PI / 2, 0]} args={[0.14, 0.14, 0.82, 8]} material={dark} />
          <group name="pressure-cauldron-front-twin-steps-and-pipes">
            <Box position={[0.76, 0.28, 3.38]} scale={[1.10, 0.34, 0.76]} material={dark} outlined />
            <Box position={[0.76, 0.51, 3.79]} scale={[1.10, 0.12, 0.10]} material={yellow} />
            <Cylinder position={[1.26, 0.62, 3.08]} rotation={[0, Math.PI / 2, 0]} args={[0.14, 0.14, 0.82, 8]} material={dark} />
          </group>
        </group>

        <group name="pressure-cauldron-side-control-housings">
          <Box position={[-3.46, 1.45, 0.18]} scale={[0.78, 2.18, 1.18]} material={gray} outlined />
          <Box position={[-2.98, 1.07, 0.84]} scale={[0.16, 0.32, 0.06]} material={yellow} />
          <Box position={[3.38, 0.92, -0.16]} scale={[1.24, 1.38, 1.58]} material={white} outlined />
          <group name="pressure-cauldron-left-gray-control-cabinet">
            <Box position={[-3.46, 2.63, 0.18]} scale={[0.86, 0.18, 1.26]} material={dark} />
            <Box position={[-3.06, 1.55, 0.80]} scale={[0.52, 0.62, 0.05]} material={dark} />
            {[1.78, 1.56, 1.34].map((y) => <Box key={y} position={[-3.02, y, 0.84]} scale={[0.44, 0.07, 0.04]} material={whiteShade} />)}
            {[[ -3.24, 1.17 ], [ -2.88, 1.17 ], [ -3.24, 1.93 ], [ -2.88, 1.93 ]].map(([x, y]) => <Box key={`${x}-${y}`} position={[x, y, 0.85]} scale={[0.10, 0.10, 0.04]} material={darkEdge} />)}
          </group>
          <group name="pressure-cauldron-right-white-auxiliary-housing">
            <Box position={[3.38, 1.68, -0.16]} scale={[0.96, 0.16, 1.08]} material={dark} />
            {[-0.35, 0.35].map((z) => <Cylinder key={z} position={[2.75, 1.02, z]} rotation={[0, 0, Math.PI / 2]} args={[0.16, 0.16, 0.18, 8]} material={dark} />)}
          </group>
        </group>
      </StudioTunedGroup>
    </group>
  )
}
