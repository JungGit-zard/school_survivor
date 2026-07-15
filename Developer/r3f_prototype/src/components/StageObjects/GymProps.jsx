import { useMemo } from 'react'
import { toonMat } from '../../lib/toon.js'
import { STAGE_PROP_MESH_RENDERING } from './propRendering.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

function PropBox({ position = [0, 0, 0], rotation = [0, 0, 0], size = [1, 1, 1], material }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_MESH_RENDERING} material={material} scale={size}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  )
}

function PropCylinder({ position = [0, 0, 0], rotation = [0, 0, 0], args, material }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_MESH_RENDERING} material={material}>
        <cylinderGeometry args={args} />
      </mesh>
    </group>
  )
}

function LowPolyBall({ position = [0, 0, 0], radius = 0.18, material, seamMaterial }) {
  return (
    <group position={position}>
      <mesh {...STAGE_PROP_MESH_RENDERING} material={material}>
        <icosahedronGeometry args={[radius, 1]} />
      </mesh>
      <PropBox position={[0, radius * 0.05, 0]} size={[radius * 1.72, radius * 0.08, radius * 0.16]} material={seamMaterial} />
      <PropBox position={[0, radius * 0.05, 0]} size={[radius * 0.16, radius * 0.08, radius * 1.72]} material={seamMaterial} />
    </group>
  )
}

function HoopRim({ position = [0, 0, 0], damaged = false, red, net }) {
  const rimSegments = [
    { key: 'front', position: [0, 0, 0.22], size: [0.82, 0.07, 0.08] },
    { key: 'back', position: [0, 0, -0.22], size: [0.82, 0.07, 0.08] },
    { key: 'left', position: [-0.4, 0, 0], size: [0.08, 0.07, 0.46] },
    { key: 'right', position: [0.4, 0, 0], size: [0.08, 0.07, 0.46] },
  ]

  return (
    <group position={position} rotation={damaged ? [0.12, 0, -0.22] : [0, 0, 0]}>
      {rimSegments.map((part) => <PropBox key={part.key} {...part} material={red} />)}
      {[-0.28, -0.1, 0.1, 0.28].map((x) => (
        <PropBox key={x} position={[x, -0.23, 0.23]} rotation={[0.16, 0, x * 0.28]} size={[0.045, 0.44, 0.045]} material={net} />
      ))}
    </group>
  )
}

export function BasketballHoop({ damaged = false, ...props }) {
  const blue = useMemo(() => toonMat(0x2457a6, 0.08), [])
  const red = useMemo(() => toonMat(0xb53625, 0.1), [])
  const metal = useMemo(() => toonMat(0x44484d, 0.04), [])
  const white = useMemo(() => toonMat(0xf2eee4, 0.04), [])
  const glass = useMemo(() => toonMat(0xdfe7ec, 0.02), [])
  const crack = useMemo(() => toonMat(0x1e2428, 0), [])
  const net = useMemo(() => toonMat(0xe8ded0, 0.03), [])
  const wood = useMemo(() => toonMat(0xb9834a, 0.06), [])

  return (
    <group {...props} name={damaged ? 'gym-basketball-hoop-damaged' : 'gym-basketball-hoop'}>
      <StudioTunedGroup itemId="stage-object-gym-basketball-hoop">
        <PropBox position={[0, 0.06, 0]} size={[1.72, 0.12, 1.02]} material={wood} />
        <PropBox position={[0, 0.38, 0]} size={[0.72, 0.62, 0.52]} material={blue} />
        <PropBox position={[0, 0.74, 0.29]} size={[0.46, 0.08, 0.08]} material={white} />
        <PropBox position={[0, 1.26, -0.18]} rotation={damaged ? [0, 0, -0.18] : [0, 0, 0]} size={[0.16, 1.28, 0.16]} material={metal} />
        <PropBox position={[0, 1.86, 0.04]} rotation={damaged ? [0.1, 0, -0.24] : [0, 0, 0]} size={[0.92, 0.12, 0.14]} material={metal} />
        <group position={[0, 2.32, 0.40]} rotation={damaged ? [0.04, 0, 0.08] : [0, 0, 0]}>
          <PropBox size={[1.72, 1.08, 0.08]} material={glass} />
          <PropBox position={[0, 0, 0.055]} size={[1.44, 0.76, 0.035]} material={white} />
          <PropBox position={[0, -0.1, 0.08]} size={[0.54, 0.36, 0.04]} material={red} />
          {damaged && (
            <>
              <PropBox position={[-0.33, 0.24, 0.12]} rotation={[0, 0, 0.55]} size={[0.52, 0.035, 0.035]} material={crack} />
              <PropBox position={[0.24, 0.18, 0.12]} rotation={[0, 0, -0.75]} size={[0.46, 0.035, 0.035]} material={crack} />
              <PropBox position={[0.46, -0.16, 0.12]} rotation={[0, 0, 0.28]} size={[0.32, 0.035, 0.035]} material={crack} />
            </>
          )}
        </group>
        <HoopRim position={[0, 1.94, 0.98]} damaged={damaged} red={red} net={net} />
        {damaged && [-0.46, -0.24, 0.34].map((x, index) => (
          <PropBox key={x} position={[x, 0.14, 0.72 + index * 0.12]} rotation={[0, index * 0.2, 0]} size={[0.22, 0.16, 0.18]} material={metal} />
        ))}
      </StudioTunedGroup>
    </group>
  )
}

export function BallCart({ ...props }) {
  const frame = useMemo(() => toonMat(0x4c5558, 0.04), [])
  const dark = useMemo(() => toonMat(0x1f2528, 0.02), [])
  const orange = useMemo(() => toonMat(0xd97424, 0.12), [])
  const seam = useMemo(() => toonMat(0x2b2119, 0), [])

  return (
    <group {...props} name="gym-ball-cart">
      <StudioTunedGroup itemId="stage-object-gym-ball-cart">
        <PropBox position={[0, 0.58, 0]} size={[1.55, 1.04, 0.95]} material={frame} />
        <PropBox position={[0, 0.62, 0]} size={[1.28, 0.82, 0.74]} material={dark} />
        {[-0.48, 0, 0.48].flatMap((x) => [-0.24, 0.24].map((z) => (
          <LowPolyBall key={`${x}:${z}`} position={[x, 1.16, z]} radius={0.2} material={orange} seamMaterial={seam} />
        )))}
        {[-0.62, 0, 0.62].map((x) => <PropBox key={`bar-x-${x}`} position={[x, 0.63, 0.5]} size={[0.08, 1.0, 0.08]} material={frame} />)}
        {[-0.34, 0.34].map((z) => <PropBox key={`bar-z-${z}`} position={[0, 0.68, z]} size={[1.55, 0.08, 0.08]} material={frame} />)}
        {[-0.58, 0.58].flatMap((x) => [-0.34, 0.34].map((z) => (
          <PropCylinder key={`${x}:${z}`} position={[x, 0.08, z]} rotation={[Math.PI / 2, 0, 0]} args={[0.1, 0.1, 0.08, 6]} material={dark} />
        )))}
      </StudioTunedGroup>
    </group>
  )
}

export function BasketballCluster({ count = 5, ...props }) {
  const orange = useMemo(() => toonMat(0xd97424, 0.12), [])
  const seam = useMemo(() => toonMat(0x2b2119, 0), [])
  const positions = [
    [-0.62, 0.19, -0.22],
    [-0.18, 0.19, 0.24],
    [0.26, 0.19, -0.18],
    [0.68, 0.19, 0.18],
    [0.05, 0.19, 0.66],
    [-0.74, 0.19, 0.52],
  ]

  return (
    <group {...props} name="gym-basketball-cluster">
      <StudioTunedGroup itemId="stage-object-gym-basketballs">
        {positions.slice(0, count).map((position, index) => (
          <LowPolyBall key={index} position={position} radius={0.19} material={orange} seamMaterial={seam} />
        ))}
      </StudioTunedGroup>
    </group>
  )
}

export function GymBench({ knockedOver = false, ...props }) {
  const wood = useMemo(() => toonMat(0xa66b38, 0.06), [])
  const metal = useMemo(() => toonMat(0x3f4a50, 0.03), [])
  const modelRotation = knockedOver ? [0, 0, -Math.PI / 2] : [0, 0, 0]
  const modelPosition = knockedOver ? [0, 0.34, 0] : [0, 0, 0]

  return (
    <group {...props} name={knockedOver ? 'gym-bench-knocked-over' : 'gym-bench'}>
      <StudioTunedGroup itemId="stage-object-gym-bench">
        <group position={modelPosition} rotation={modelRotation}>
          <PropBox position={[0, 0.58, 0]} size={[2.35, 0.18, 0.42]} material={wood} />
          <PropBox position={[0, 0.69, 0]} size={[2.12, 0.04, 0.34]} material={wood} />
          {[-0.82, 0.82].flatMap((x) => [-0.14, 0.14].map((z) => (
            <PropBox key={`${x}:${z}`} position={[x, 0.28, z]} size={[0.1, 0.56, 0.1]} material={metal} />
          )))}
          {[-0.82, 0.82].map((x) => <PropBox key={x} position={[x, 0.1, 0]} size={[0.62, 0.08, 0.52]} material={metal} />)}
        </group>
      </StudioTunedGroup>
    </group>
  )
}

export function TrainingCones({ ...props }) {
  const orange = useMemo(() => toonMat(0xe36f1e, 0.13), [])
  const white = useMemo(() => toonMat(0xf2eee4, 0.04), [])
  const conePositions = [
    [-0.78, 0, -0.44],
    [-0.34, 0, 0.16],
    [0.12, 0, -0.28],
    [0.56, 0, 0.32],
  ]

  return (
    <group {...props} name="gym-training-cones">
      <StudioTunedGroup itemId="stage-object-gym-training-cones">
        {conePositions.map(([x, y, z], index) => (
          <group key={index} position={[x, y, z]}>
            <PropBox position={[0, 0.04, 0]} size={[0.34, 0.08, 0.34]} material={orange} />
            <PropCylinder position={[0, 0.24, 0]} args={[0.08, 0.18, 0.38, 4]} material={orange} />
            <PropBox position={[0, 0.26, 0]} size={[0.22, 0.04, 0.22]} material={white} />
          </group>
        ))}
      </StudioTunedGroup>
    </group>
  )
}

export function GymMats({ ...props }) {
  const blue = useMemo(() => toonMat(0x3169bf, 0.08), [])
  const green = useMemo(() => toonMat(0x3f8c4d, 0.08), [])
  const red = useMemo(() => toonMat(0xc7493f, 0.08), [])
  const yellow = useMemo(() => toonMat(0xd9b747, 0.1), [])
  const strap = useMemo(() => toonMat(0x2f363b, 0.02), [])
  const mats = [yellow, red, green, blue]

  return (
    <group {...props} name="gym-mats-stacked">
      <StudioTunedGroup itemId="stage-object-gym-mats">
        {mats.map((material, index) => (
          <PropBox key={index} position={[0, 0.14 + index * 0.17, 0]} size={[1.65, 0.16, 1.05]} material={material} />
        ))}
        <PropBox position={[-0.55, 0.44, 0]} size={[0.08, 0.72, 1.08]} material={strap} />
        <PropBox position={[0.55, 0.44, 0]} size={[0.08, 0.72, 1.08]} material={strap} />
      </StudioTunedGroup>
    </group>
  )
}

export function GymScoreboard({ ...props }) {
  const body = useMemo(() => toonMat(0x202326, 0.02), [])
  const trim = useMemo(() => toonMat(0x3a4147, 0.04), [])
  const green = useMemo(() => toonMat(0x72e05d, 0.4), [])
  const red = useMemo(() => toonMat(0xff503e, 0.35), [])
  const yellow = useMemo(() => toonMat(0xffc846, 0.4), [])
  const label = useMemo(() => toonMat(0xf0efe9, 0.08), [])

  return (
    <group {...props} name="gym-scoreboard">
      <StudioTunedGroup itemId="stage-object-gym-scoreboard">
        <PropBox position={[0, 1.15, 0]} size={[2.55, 1.2, 0.16]} material={body} />
        <PropBox position={[0, 1.15, 0.09]} size={[2.72, 1.34, 0.06]} material={trim} />
        <PropBox position={[-0.82, 1.33, 0.14]} size={[0.48, 0.22, 0.04]} material={label} />
        <PropBox position={[0.82, 1.33, 0.14]} size={[0.56, 0.22, 0.04]} material={label} />
        <PropBox position={[-0.82, 0.93, 0.14]} size={[0.48, 0.34, 0.04]} material={green} />
        <PropBox position={[0.82, 0.93, 0.14]} size={[0.48, 0.34, 0.04]} material={red} />
        <PropBox position={[0, 1.2, 0.14]} size={[0.52, 0.24, 0.04]} material={yellow} />
        <PropBox position={[0, 0.62, 0.14]} size={[0.82, 0.20, 0.04]} material={red} />
      </StudioTunedGroup>
    </group>
  )
}

export function GymBanner({ ...props }) {
  const cloth = useMemo(() => toonMat(0xf1dfbd, 0.06), [])
  const red = useMemo(() => toonMat(0xc84035, 0.12), [])
  const blue = useMemo(() => toonMat(0x2f6eb9, 0.1), [])
  const green = useMemo(() => toonMat(0x4d9a5d, 0.1), [])
  const rope = useMemo(() => toonMat(0x7b5b39, 0.04), [])

  return (
    <group {...props} name="gym-sports-day-banner">
      <StudioTunedGroup itemId="stage-object-gym-banner">
        <PropBox position={[0, 1.12, 0]} size={[2.45, 0.64, 0.06]} material={cloth} />
        <PropBox position={[-0.62, 1.16, 0.05]} size={[0.34, 0.2, 0.04]} material={blue} />
        <PropBox position={[-0.16, 1.16, 0.05]} size={[0.42, 0.2, 0.04]} material={red} />
        <PropBox position={[0.36, 1.16, 0.05]} size={[0.52, 0.2, 0.04]} material={red} />
        <PropBox position={[0.92, 1.16, 0.05]} size={[0.24, 0.24, 0.04]} material={blue} />
        <PropBox position={[-1.0, 1.18, 0.055]} size={[0.18, 0.24, 0.04]} material={green} />
        <PropBox position={[0, 1.52, 0]} size={[2.64, 0.05, 0.05]} material={rope} />
        {[-1.18, 1.18].map((x) => <PropCylinder key={x} position={[x, 1.52, 0]} args={[0.08, 0.08, 0.05, 6]} material={rope} />)}
      </StudioTunedGroup>
    </group>
  )
}

export function GymExitDoor({ ...props }) {
  const door = useMemo(() => toonMat(0x5c7f83, 0.04), [])
  const green = useMemo(() => toonMat(0x3da36a, 0.2), [])
  const white = useMemo(() => toonMat(0xeef4e6, 0.08), [])
  const metal = useMemo(() => toonMat(0x2d373c, 0.03), [])

  return (
    <group {...props} name="gym-exit-door">
      <StudioTunedGroup itemId="stage-object-gym-exit-door">
        <PropBox position={[0, 1.0, 0]} size={[1.42, 2.0, 0.18]} material={door} />
        <PropBox position={[0, 2.25, 0.06]} size={[1.62, 0.36, 0.12]} material={green} />
        <PropBox position={[-0.22, 2.25, 0.14]} size={[0.34, 0.16, 0.05]} material={white} />
        <PropBox position={[0.36, 2.25, 0.14]} size={[0.36, 0.08, 0.05]} material={white} />
        <PropBox position={[0, 0.88, 0.13]} size={[1.1, 0.08, 0.08]} material={metal} />
        <PropBox position={[0, 1.0, 0.13]} size={[0.08, 1.78, 0.08]} material={metal} />
      </StudioTunedGroup>
    </group>
  )
}

export function GymEquipmentSpill({ ...props }) {
  const cooler = useMemo(() => toonMat(0xe8e1d0, 0.04), [])
  const blue = useMemo(() => toonMat(0x80b6d4, 0.08), [])
  const water = useMemo(() => toonMat(0x7fcbe6, 0.18), [])
  const box = useMemo(() => toonMat(0x68a85d, 0.08), [])
  const orange = useMemo(() => toonMat(0xe07a22, 0.12), [])
  const whistle = useMemo(() => toonMat(0xaeb6bb, 0.05), [])
  const cord = useMemo(() => toonMat(0xc73f32, 0.06), [])

  return (
    <group {...props} name="gym-equipment-spill">
      <StudioTunedGroup itemId="stage-object-gym-equipment-spill">
        <group rotation={[0, 0, Math.PI / 2]} position={[-0.58, 0.26, 0]}>
          <PropBox size={[0.62, 0.74, 0.52]} material={cooler} />
          <PropCylinder position={[0.36, 0, 0]} rotation={[0, 0, Math.PI / 2]} args={[0.26, 0.26, 0.3, 6]} material={blue} />
        </group>
        <PropBox position={[-0.02, 0.03, 0.32]} size={[0.82, 0.035, 0.46]} material={water} />
        <PropBox position={[0.84, 0.24, -0.1]} size={[0.64, 0.42, 0.52]} material={box} />
        {[-0.2, 0.05, 0.28].map((x, index) => (
          <PropCylinder key={x} position={[0.72 + x, 0.58, -0.1 + index * 0.12]} args={[0.07, 0.08, 0.34, 6]} material={orange} />
        ))}
        <PropBox position={[-1.28, 0.08, -0.38]} rotation={[0, 0.25, 0]} size={[0.32, 0.12, 0.18]} material={whistle} />
        <PropBox position={[-1.02, 0.08, -0.26]} rotation={[0, -0.45, 0]} size={[0.52, 0.045, 0.045]} material={cord} />
      </StudioTunedGroup>
    </group>
  )
}
