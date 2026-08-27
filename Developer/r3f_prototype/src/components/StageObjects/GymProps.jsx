import { getStagePropToonMaterial, STAGE_PROP_SURFACE_RENDERING } from './propRendering.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

function PropBox({ position = [0, 0, 0], rotation = [0, 0, 0], size = [1, 1, 1], material }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_SURFACE_RENDERING} material={material} scale={size}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  )
}

function PropCylinder({ position = [0, 0, 0], rotation = [0, 0, 0], args, material }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_SURFACE_RENDERING} material={material}>
        <cylinderGeometry args={args} />
      </mesh>
    </group>
  )
}

function LowPolyBall({ position = [0, 0, 0], radius = 0.18, material, seamMaterial }) {
  return (
    <group position={position}>
      <mesh {...STAGE_PROP_SURFACE_RENDERING} material={material}>
        <icosahedronGeometry args={[radius, 1]} />
      </mesh>
      <PropBox position={[0, radius * 0.05, 0]} size={[radius * 1.72, radius * 0.08, radius * 0.16]} material={seamMaterial} />
      <PropBox position={[0, radius * 0.05, 0]} size={[radius * 0.16, radius * 0.08, radius * 1.72]} material={seamMaterial} />
    </group>
  )
}

function HoopRim({ position = [0, 0, 0], damaged = false, orange, net }) {
  const rimSegments = [
    { key: 'front', position: [0, 0, 0.24], size: [0.74, 0.08, 0.08] },
    { key: 'back', position: [0, 0, -0.24], size: [0.74, 0.08, 0.08] },
    { key: 'left', position: [-0.38, 0, 0], size: [0.08, 0.08, 0.48] },
    { key: 'right', position: [0.38, 0, 0], size: [0.08, 0.08, 0.48] },
    { key: 'front-left', position: [-0.28, 0, 0.17], rotation: [0, -0.7, 0], size: [0.28, 0.08, 0.07] },
    { key: 'front-right', position: [0.28, 0, 0.17], rotation: [0, 0.7, 0], size: [0.28, 0.08, 0.07] },
    { key: 'back-left', position: [-0.28, 0, -0.17], rotation: [0, 0.7, 0], size: [0.28, 0.08, 0.07] },
    { key: 'back-right', position: [0.28, 0, -0.17], rotation: [0, -0.7, 0], size: [0.28, 0.08, 0.07] },
  ]

  return (
    <group position={position} rotation={damaged ? [0.12, 0, -0.22] : [0, 0, 0]}>
      {damaged ? rimSegments.map((part) => <PropBox key={part.key} {...part} material={orange} />) : (
        <mesh {...STAGE_PROP_SURFACE_RENDERING} material={orange} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.38, 0.045, 6, 18]} />
        </mesh>
      )}
      {[-0.3, -0.18, -0.06, 0.06, 0.18, 0.3].map((x) => (
        <PropBox key={x} position={[x, -0.25, 0.19]} rotation={[0.16, 0, x * 0.34]} size={[0.04, 0.48, 0.04]} material={net} />
      ))}
    </group>
  )
}

export function BasketballHoop({ damaged = false, playful = false, ...props }) {
  const blue = getStagePropToonMaterial(playful ? 0x2f6eb9 : 0x2457a6, playful ? 0.12 : 0.08)
  const orange = getStagePropToonMaterial(playful ? 0xf27a1a : 0xb53625, playful ? 0.16 : 0.1)
  const redPad = getStagePropToonMaterial(0xef5142, 0.12)
  const metal = getStagePropToonMaterial(playful ? 0x426a86 : 0x44484d, 0.04)
  const white = getStagePropToonMaterial(0xf7f0df, 0.06)
  const glass = getStagePropToonMaterial(playful ? 0xfff7df : 0xdfe7ec, 0.04)
  const crack = getStagePropToonMaterial(0x1e2428, 0)
  const net = getStagePropToonMaterial(0xf3ead8, 0.05)
  const wood = getStagePropToonMaterial(0xd59b4c, 0.08)
  const seam = getStagePropToonMaterial(0x2b2119, 0)

  return (
    <group {...props} name={playful ? 'gym-basketball-hoop-playful' : damaged ? 'gym-basketball-hoop-damaged' : 'gym-basketball-hoop'}>
      <StudioTunedGroup itemId="stage-object-gym-basketball-hoop">
        <PropBox position={[0, 0.06, 0]} size={[1.82, 0.12, 1.08]} material={wood} />
        <PropBox position={[0, 0.36, 0]} size={[0.86, 0.6, 0.62]} material={playful ? redPad : blue} />
        <PropBox position={[0, 0.72, 0.32]} size={[0.56, 0.08, 0.08]} material={white} />
        <PropBox position={[0, 1.2, -0.18]} rotation={damaged ? [0, 0, -0.18] : [0, 0, 0]} size={[0.18, 1.28, 0.18]} material={playful ? blue : metal} />
        <PropBox position={[0, 1.74, 0.15]} rotation={damaged ? [0.1, 0, -0.24] : [-0.22, 0, 0]} size={[0.18, 0.98, 0.16]} material={playful ? blue : metal} />
        <PropBox position={[0, 1.86, 0.04]} rotation={damaged ? [0.1, 0, -0.24] : [0, 0, 0]} size={[0.96, 0.12, 0.14]} material={playful ? blue : metal} />
        <group position={[0, 2.32, 0.40]} rotation={damaged ? [0.04, 0, 0.08] : [0, 0, 0]}>
          <PropBox size={[1.82, 1.12, 0.08]} material={playful ? blue : glass} />
          <PropBox position={[0, 0, 0.055]} size={[1.5, 0.8, 0.035]} material={playful ? glass : white} />
          <PropBox position={[0, -0.12, 0.08]} size={[0.56, 0.38, 0.04]} material={playful ? blue : orange} />
          <PropBox position={[0, -0.12, 0.115]} size={[0.42, 0.24, 0.04]} material={white} />
          {damaged && (
            <>
              <PropBox position={[-0.33, 0.24, 0.12]} rotation={[0, 0, 0.55]} size={[0.52, 0.035, 0.035]} material={crack} />
              <PropBox position={[0.24, 0.18, 0.12]} rotation={[0, 0, -0.75]} size={[0.46, 0.035, 0.035]} material={crack} />
              <PropBox position={[0.46, -0.16, 0.12]} rotation={[0, 0, 0.28]} size={[0.32, 0.035, 0.035]} material={crack} />
            </>
          )}
        </group>
        <HoopRim position={[0, 1.94, 0.98]} damaged={damaged} orange={orange} net={net} />
        {playful && (
          <>
            <LowPolyBall position={[-0.48, 0.22, 0.68]} radius={0.22} material={orange} seamMaterial={seam} />
            <LowPolyBall position={[0.42, 0.2, 0.86]} radius={0.2} material={orange} seamMaterial={seam} />
          </>
        )}
        {damaged && [-0.46, -0.24, 0.34].map((x, index) => (
          <PropBox key={x} position={[x, 0.14, 0.72 + index * 0.12]} rotation={[0, index * 0.2, 0]} size={[0.22, 0.16, 0.18]} material={metal} />
        ))}
      </StudioTunedGroup>
    </group>
  )
}

export function BallCart({ ...props }) {
  const frame = getStagePropToonMaterial(0x4c5558, 0.04)
  const dark = getStagePropToonMaterial(0x1f2528, 0.02)
  const orange = getStagePropToonMaterial(0xd97424, 0.12)
  const seam = getStagePropToonMaterial(0x2b2119, 0)

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
  const orange = getStagePropToonMaterial(0xd97424, 0.12)
  const seam = getStagePropToonMaterial(0x2b2119, 0)
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
  const wood = getStagePropToonMaterial(0xa66b38, 0.06)
  const metal = getStagePropToonMaterial(0x3f4a50, 0.03)
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
  const orange = getStagePropToonMaterial(0xe36f1e, 0.13)
  const white = getStagePropToonMaterial(0xf2eee4, 0.04)
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
  const blue = getStagePropToonMaterial(0x3169bf, 0.08)
  const green = getStagePropToonMaterial(0x3f8c4d, 0.08)
  const red = getStagePropToonMaterial(0xc7493f, 0.08)
  const yellow = getStagePropToonMaterial(0xd9b747, 0.1)
  const strap = getStagePropToonMaterial(0x2f363b, 0.02)
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
  const body = getStagePropToonMaterial(0x202326, 0.02)
  const trim = getStagePropToonMaterial(0x3a4147, 0.04)
  const green = getStagePropToonMaterial(0x72e05d, 0.4)
  const red = getStagePropToonMaterial(0xff503e, 0.35)
  const yellow = getStagePropToonMaterial(0xffc846, 0.4)
  const label = getStagePropToonMaterial(0xf0efe9, 0.08)

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
  const cloth = getStagePropToonMaterial(0xf1dfbd, 0.06)
  const red = getStagePropToonMaterial(0xc84035, 0.12)
  const blue = getStagePropToonMaterial(0x2f6eb9, 0.1)
  const green = getStagePropToonMaterial(0x4d9a5d, 0.1)
  const rope = getStagePropToonMaterial(0x7b5b39, 0.04)

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
  const door = getStagePropToonMaterial(0x5c7f83, 0.04)
  const green = getStagePropToonMaterial(0x3da36a, 0.2)
  const white = getStagePropToonMaterial(0xeef4e6, 0.08)
  const metal = getStagePropToonMaterial(0x2d373c, 0.03)

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
  const cooler = getStagePropToonMaterial(0xe8e1d0, 0.04)
  const blue = getStagePropToonMaterial(0x80b6d4, 0.08)
  const water = getStagePropToonMaterial(0x7fcbe6, 0.18)
  const box = getStagePropToonMaterial(0x68a85d, 0.08)
  const orange = getStagePropToonMaterial(0xe07a22, 0.12)
  const whistle = getStagePropToonMaterial(0xaeb6bb, 0.05)
  const cord = getStagePropToonMaterial(0xc73f32, 0.06)

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
