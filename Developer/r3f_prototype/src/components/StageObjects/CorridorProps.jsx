import { useMemo } from 'react'
import { outlineMat, toonMat } from '../../lib/toon.js'
import { getPropOutlineScale, STAGE_PROP_MESH_RENDERING } from './propRendering.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

function PropBox({ position = [0, 0, 0], rotation = [0, 0, 0], size, material, outline }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_MESH_RENDERING} material={outline} scale={getPropOutlineScale(size)}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh {...STAGE_PROP_MESH_RENDERING} material={material} scale={size}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  )
}

function PropCylinder({ position = [0, 0, 0], rotation = [0, 0, 0], args, material, outline }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_MESH_RENDERING} material={outline} scale={[1.05, 1.03, 1.05]}>
        <cylinderGeometry args={args} />
      </mesh>
      <mesh {...STAGE_PROP_MESH_RENDERING} material={material}>
        <cylinderGeometry args={args} />
      </mesh>
    </group>
  )
}

export function CorridorLockerBank(props) {
  const locker = useMemo(() => toonMat(0x7394a0, 0.06), [])
  const dark = useMemo(() => toonMat(0x35454a, 0.03), [])
  const tag = useMemo(() => toonMat(0xc8483c, 0.1), [])
  const metal = useMemo(() => toonMat(0xaebfc1, 0.04), [])
  const outline = useMemo(() => outlineMat(0.92, 0x1a2326), [])

  return (
    <group {...props} name="corridor-locker-bank">
      <StudioTunedGroup itemId="stage-object-corridor-lockers">
        <PropBox position={[0, 0.78, 0]} size={[1.18, 1.56, 0.42]} material={dark} outline={outline} />
        {[-0.29, 0.29].flatMap((x) => [-0.38, 0.38].map((y) => (
          <group key={`${x}:${y}`} position={[x, 0.78 + y, 0.23]}>
            <PropBox size={[0.5, 0.68, 0.045]} material={locker} outline={outline} />
            <PropBox position={[0, 0, 0.035]} size={[0.10, 0.16, 0.035]} material={metal} outline={outline} />
            {[-0.10, 0, 0.10].map((slotY) => (
              <PropBox key={slotY} position={[0, 0.18 + slotY, 0.04]} size={[0.22, 0.018, 0.02]} material={dark} outline={outline} />
            ))}
          </group>
        )))}
        <PropBox position={[0.61, 1.20, 0.14]} rotation={[0, 0.32, 0.14]} size={[0.42, 0.64, 0.045]} material={locker} outline={outline} />
        <PropBox position={[0.70, 0.72, 0.36]} rotation={[0, -0.18, 0]} size={[0.12, 0.27, 0.025]} material={tag} outline={outline} />
      </StudioTunedGroup>
    </group>
  )
}

export function CorridorJanitorCart(props) {
  const frame = useMemo(() => toonMat(0x3c4b50, 0.04), [])
  const bucket = useMemo(() => toonMat(0xe0a72b, 0.12), [])
  const bag = useMemo(() => toonMat(0x1e2a2e, 0.02), [])
  const bottleBlue = useMemo(() => toonMat(0x417fa6, 0.12), [])
  const bottleWhite = useMemo(() => toonMat(0xe9e6d7, 0.03), [])
  const wood = useMemo(() => toonMat(0x9c6a37, 0.03), [])
  const tire = useMemo(() => toonMat(0x202326, 0), [])
  const outline = useMemo(() => outlineMat(0.92, 0x1a1e20), [])

  return (
    <group {...props} name="corridor-janitor-cart">
      <StudioTunedGroup itemId="stage-object-corridor-janitor-cart">
        <PropBox position={[0, 0.18, 0]} size={[1.10, 0.16, 0.58]} material={frame} outline={outline} />
        <PropBox position={[0, 0.78, 0]} size={[0.92, 0.12, 0.50]} material={frame} outline={outline} />
        <PropBox position={[-0.23, 0.42, 0]} size={[0.10, 0.64, 0.10]} material={frame} outline={outline} />
        <PropBox position={[0.23, 0.42, 0]} size={[0.10, 0.64, 0.10]} material={frame} outline={outline} />
        <PropBox position={[0, 0.42, -0.20]} size={[0.70, 0.08, 0.08]} material={frame} outline={outline} />
        <PropBox position={[-0.10, 0.37, 0.07]} size={[0.54, 0.34, 0.38]} material={bucket} outline={outline} />
        <PropBox position={[-0.10, 0.57, 0.07]} size={[0.40, 0.05, 0.27]} material={bucket} outline={outline} />
        <PropCylinder position={[0.38, 1.25, 0.12]} rotation={[0.05, 0, -0.10]} args={[0.035, 0.035, 1.55, 8]} material={wood} outline={outline} />
        <PropCylinder position={[0.38, 2.04, 0.12]} rotation={[0.05, 0, -0.10]} args={[0.065, 0.065, 0.20, 8]} material={frame} outline={outline} />
        <PropCylinder position={[0.18, 0.98, -0.08]} args={[0.075, 0.09, 0.32, 8]} material={bottleBlue} outline={outline} />
        <PropCylinder position={[0.34, 0.94, -0.08]} args={[0.065, 0.08, 0.24, 8]} material={bottleWhite} outline={outline} />
        <mesh {...STAGE_PROP_MESH_RENDERING} position={[0.47, 0.73, 0.08]} material={bag} scale={[0.26, 0.42, 0.22]}>
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
        {[-0.42, 0.42].flatMap((x) => [-0.20, 0.20].map((z) => (
          <PropCylinder key={`${x}:${z}`} position={[x, 0.10, z]} rotation={[Math.PI / 2, 0, 0]} args={[0.105, 0.105, 0.07, 10]} material={tire} outline={outline} />
        )))}
      </StudioTunedGroup>
    </group>
  )
}

export function CorridorLostFoundBoard(props) {
  const frame = useMemo(() => toonMat(0x704a2d, 0.04), [])
  const cork = useMemo(() => toonMat(0xa97445, 0.03), [])
  const paper = useMemo(() => toonMat(0xf0e4c3, 0.02), [])
  const bluePaper = useMemo(() => toonMat(0x8cbcc2, 0.04), [])
  const pinkPaper = useMemo(() => toonMat(0xd99791, 0.04), [])
  const pin = useMemo(() => toonMat(0xbd463f, 0.12), [])
  const umbrella = useMemo(() => toonMat(0x973e3a, 0.05), [])
  const outline = useMemo(() => outlineMat(0.92, 0x2b1b12), [])

  return (
    <group {...props} name="corridor-lost-found-board">
      <StudioTunedGroup itemId="stage-object-corridor-lost-found-board">
        <PropBox position={[0, 1.28, 0]} size={[1.34, 0.92, 0.07]} material={frame} outline={outline} />
        <PropBox position={[0, 1.28, 0.05]} size={[1.16, 0.72, 0.025]} material={cork} outline={outline} />
        <PropBox position={[-0.30, 1.47, 0.075]} rotation={[0, 0, -0.06]} size={[0.33, 0.29, 0.018]} material={paper} outline={outline} />
        <PropBox position={[0.31, 1.43, 0.075]} rotation={[0, 0, 0.04]} size={[0.29, 0.27, 0.018]} material={bluePaper} outline={outline} />
        <PropBox position={[0.02, 1.08, 0.075]} rotation={[0, 0, 0.03]} size={[0.26, 0.23, 0.018]} material={pinkPaper} outline={outline} />
        {[-0.30, 0.31, 0.02].map((x, index) => (
          <PropCylinder key={x} position={[x, index === 2 ? 1.18 : 1.62, 0.10]} args={[0.034, 0.034, 0.04, 8]} material={pin} outline={outline} />
        ))}
        {[-0.42, 0.42].map((x) => <PropCylinder key={x} position={[x, 0.72, 0.03]} rotation={[Math.PI / 2, 0, 0]} args={[0.045, 0.045, 0.07, 8]} material={frame} outline={outline} />)}
        <PropCylinder position={[-0.42, 0.47, 0.05]} args={[0.06, 0.06, 0.42, 8]} material={umbrella} outline={outline} />
        <PropCylinder position={[-0.42, 0.71, 0.05]} args={[0.025, 0.025, 0.28, 8]} material={frame} outline={outline} />
      </StudioTunedGroup>
    </group>
  )
}
