import { useMemo } from 'react'
import { toonMat } from '../../lib/toon.js'
import { STAGE_PROP_MESH_RENDERING } from './propRendering.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

// Stage 4(급식실/주방) 저폴리 툰 프랍.
// 원화: Graphic_designer/graphic_asset/background_floor/4stage/st4_prop.png
// 스타일 정본은 GymProps.jsx — 박스/6각 실린더 프리미티브 + toonMat, 별도 아웃라인 메쉬 없음.
// 스테인리스는 단색으로 뭉개면 툰 렌더에서 형태가 사라지므로
// 밝은 상판(top) / 중간 패널(panel) / 어두운 프레임(frame) / 깊은 음영(dark) 4톤으로 분리한다.

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

// 쓰레기 봉투처럼 각진 덩어리. 저폴리 유지를 위해 detail 0 정20면체를 눌러 쓴다.
function PropBlob({ position = [0, 0, 0], rotation = [0, 0, 0], radius = 0.24, scale = [1, 1, 1], material }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_MESH_RENDERING} material={material} scale={scale}>
        <icosahedronGeometry args={[radius, 0]} />
      </mesh>
    </group>
  )
}

// GN 팬(급식 트레이). 얕은 스테인리스 통 + 선택적 음식 레이어.
// 테두리는 통짜 슬래브가 아니라 네 변 바로 만든다 — 슬래브로 덮으면 음식이 가려져 흰 판으로만 읽힌다.
function GnPan({ position = [0, 0, 0], rotation = [0, 0, 0], width = 0.5, depth = 0.34, steel, rim, food = null }) {
  const halfX = width / 2
  const halfZ = depth / 2

  return (
    <group position={position} rotation={rotation}>
      <PropBox position={[0, 0.04, 0]} size={[width, 0.08, depth]} material={steel} />
      {food && <PropBox position={[0, 0.095, 0]} size={[width - 0.07, 0.05, depth - 0.07]} material={food} />}
      {[-1, 1].map((side) => (
        <PropBox key={`x${side}`} position={[side * (halfX + 0.012), 0.085, 0]} size={[0.05, 0.06, depth + 0.05]} material={rim} />
      ))}
      {[-1, 1].map((side) => (
        <PropBox key={`z${side}`} position={[0, 0.085, side * (halfZ + 0.012)]} size={[width + 0.05, 0.06, 0.05]} material={rim} />
      ))}
    </group>
  )
}

// 냄비/양동이. 6각 실린더 몸통 + 테두리 링, 선택적 손잡이.
function Pot({ position = [0, 0, 0], radius = 0.17, height = 0.26, body, rim, handle = 'none' }) {
  return (
    <group position={position}>
      <PropCylinder position={[0, height / 2, 0]} args={[radius, radius * 0.9, height, 6]} material={body} />
      <PropCylinder position={[0, height + 0.015, 0]} args={[radius + 0.02, radius + 0.02, 0.035, 6]} material={rim} />
      {handle === 'long' && (
        <PropBox position={[radius + 0.19, height * 0.78, 0]} size={[0.38, 0.045, 0.05]} material={rim} />
      )}
      {handle === 'ears' && [-1, 1].map((side) => (
        <PropBox key={side} position={[side * (radius + 0.06), height * 0.82, 0]} size={[0.11, 0.04, 0.14]} material={rim} />
      ))}
    </group>
  )
}

function Caster({ position = [0, 0, 0], material }) {
  return <PropCylinder position={position} rotation={[Math.PI / 2, 0, 0]} args={[0.065, 0.065, 0.05, 6]} material={material} />
}

export const KITCHEN_PREP_TABLE_VARIANTS = Object.freeze(['bare', 'pans', 'cutting', 'side'])
export const KITCHEN_TRASH_BIN_VARIANTS = Object.freeze(['wheelie', 'round'])
export const KITCHEN_CLUTTER_VARIANTS = Object.freeze(['pots', 'bags', 'trays'])

function pickVariant(list, value, fallback) {
  return list.includes(value) ? value : fallback
}

export function KitchenPrepTable({ variant = 'bare', ...props }) {
  const top = useMemo(() => toonMat(0xc2cad1, 0.06), [])
  const panel = useMemo(() => toonMat(0x99a3ab, 0.04), [])
  const frame = useMemo(() => toonMat(0x5e676e, 0.03), [])
  const dark = useMemo(() => toonMat(0x2f363b, 0.02), [])
  const slime = useMemo(() => toonMat(0x6f8442, 0.05), [])
  const rust = useMemo(() => toonMat(0x8a5533, 0.04), [])
  const wood = useMemo(() => toonMat(0xb98a52, 0.04), [])
  const crate = useMemo(() => toonMat(0x4f7a45, 0.05), [])
  const stew = useMemo(() => toonMat(0xc98a3a, 0.08), [])

  const mode = pickVariant(KITCHEN_PREP_TABLE_VARIANTS, variant, 'bare')

  if (mode === 'side') {
    return (
      <group {...props} name="kitchen-prep-table">
        <StudioTunedGroup itemId="stage-object-kitchen-prep-table">
          <PropBox position={[0, 0.9, 0]} size={[1.7, 0.1, 0.9]} material={top} />
          <PropBox position={[0, 0.82, 0]} size={[1.74, 0.06, 0.94]} material={panel} />
          <PropBox position={[-0.28, 0.48, 0]} size={[1.06, 0.7, 0.82]} material={panel} />
          {[-0.56, -0.16].map((x) => (
            <group key={x}>
              <PropBox position={[x, 0.5, 0.43]} size={[0.36, 0.6, 0.04]} material={top} />
              <PropBox position={[x + 0.15, 0.5, 0.46]} size={[0.035, 0.3, 0.035]} material={dark} />
            </group>
          ))}
          <PropBox position={[0.52, 0.48, -0.38]} size={[0.62, 0.7, 0.06]} material={frame} />
          {[0.22, 0.82].map((x) => (
            <PropBox key={x} position={[x, 0.48, 0]} size={[0.04, 0.7, 0.82]} material={panel} />
          ))}
          {[0.3, 0.6].map((y) => (
            <PropBox key={y} position={[0.52, y, 0]} size={[0.58, 0.04, 0.8]} material={frame} />
          ))}
          <GnPan position={[0.5, 0.62, 0.14]} width={0.4} depth={0.28} steel={panel} rim={top} food={stew} />
          <GnPan position={[0.5, 0.32, -0.12]} width={0.4} depth={0.28} steel={panel} rim={top} />
          <PropBox position={[0.42, 1.13, 0]} size={[0.62, 0.36, 0.46]} material={panel} />
          <PropBox position={[0.42, 1.11, 0.24]} size={[0.46, 0.22, 0.03]} material={dark} />
          <PropBox position={[0.42, 1.31, 0.2]} size={[0.5, 0.05, 0.06]} material={frame} />
          <PropCylinder position={[0.7, 1.11, 0.25]} rotation={[Math.PI / 2, 0, 0]} args={[0.04, 0.04, 0.05, 6]} material={dark} />
          <PropBox position={[-0.44, 0.965, -0.02]} rotation={[0, 0.06, 0]} size={[0.66, 0.045, 0.46]} material={wood} />
          <PropBox position={[-0.44, 0.99, -0.02]} rotation={[0, 0.06, 0]} size={[0.3, 0.012, 0.2]} material={rust} />
          <PropCylinder position={[-0.02, 1.05, 0.16]} args={[0.055, 0.06, 0.22, 6]} material={crate} />
          {[-0.78, 0.78].flatMap((x) => [-0.36, 0.36].map((z) => (
            <PropBox key={`${x}:${z}`} position={[x, 0.07, z]} size={[0.1, 0.14, 0.1]} material={frame} />
          )))}
          <PropBox position={[0.16, 0.955, -0.24]} size={[0.34, 0.012, 0.24]} material={slime} />
          <PropBox position={[-0.66, 0.955, 0.26]} size={[0.2, 0.012, 0.16]} material={rust} />
        </StudioTunedGroup>
      </group>
    )
  }

  return (
    <group {...props} name="kitchen-prep-table">
      <StudioTunedGroup itemId="stage-object-kitchen-prep-table">
        <PropBox position={[0, 0.9, 0]} size={[2.2, 0.1, 1.05]} material={top} />
        <PropBox position={[0, 0.82, 0]} size={[2.24, 0.06, 1.09]} material={panel} />
        <PropBox position={[0.02, 0.955, 0]} size={[0.03, 0.014, 1.02]} material={frame} />
        <PropBox position={[0, 0.26, 0]} size={[2.06, 0.06, 0.9]} material={panel} />
        {[-1.0, 1.0].flatMap((x) => [-0.44, 0.44].map((z) => (
          <group key={`${x}:${z}`}>
            <PropBox position={[x, 0.44, z]} size={[0.09, 0.82, 0.09]} material={frame} />
            <PropBox position={[x, 0.025, z]} size={[0.14, 0.05, 0.14]} material={dark} />
          </group>
        )))}
        <Pot position={[-0.72, 0.29, 0.04]} radius={0.17} height={0.26} body={frame} rim={panel} handle="ears" />
        <Pot position={[-0.32, 0.29, -0.06]} radius={0.14} height={0.2} body={dark} rim={panel} />
        {mode === 'pans' && (
          <>
            <GnPan position={[-0.42, 0.9, 0.06]} width={0.54} depth={0.36} steel={dark} rim={top} food={stew} />
            <GnPan position={[0.52, 0.9, -0.12]} rotation={[0, 0.08, 0]} width={0.48} depth={0.34} steel={dark} rim={top} food={slime} />
          </>
        )}
        {mode === 'cutting' && (
          <>
            <PropBox position={[0.2, 0.975, 0.02]} rotation={[0, 0.1, 0]} size={[0.88, 0.05, 0.58]} material={wood} />
            <PropBox position={[0.2, 1.002, 0.02]} rotation={[0, 0.1, 0]} size={[0.36, 0.012, 0.26]} material={rust} />
            <PropBox position={[0.46, 1.02, -0.16]} rotation={[0, -0.5, 0]} size={[0.34, 0.02, 0.07]} material={top} />
            <PropBox position={[0.66, 1.02, -0.24]} rotation={[0, -0.5, 0]} size={[0.13, 0.03, 0.05]} material={dark} />
            <PropBox position={[0.56, 0.44, 0.0]} rotation={[0, 0.12, 0]} size={[0.62, 0.32, 0.44]} material={wood} />
            {[-0.1, 0.1].map((y) => (
              <PropBox key={y} position={[0.56, 0.44 + y, 0.23]} rotation={[0, 0.12, 0]} size={[0.6, 0.06, 0.02]} material={crate} />
            ))}
          </>
        )}
        {mode === 'bare' && <Pot position={[0.62, 0.29, 0.08]} radius={0.16} height={0.22} body={frame} rim={panel} />}
        <PropBox position={[-0.5, 0.955, -0.26]} size={[0.42, 0.014, 0.3]} material={slime} />
        <PropBox position={[0.86, 0.955, 0.3]} size={[0.26, 0.014, 0.2]} material={rust} />
        <PropBox position={[1.0, 0.6, 0.44]} size={[0.1, 0.22, 0.1]} material={rust} />
      </StudioTunedGroup>
    </group>
  )
}

export function KitchenCookLine({ ...props }) {
  const top = useMemo(() => toonMat(0xc2cad1, 0.06), [])
  const panel = useMemo(() => toonMat(0x99a3ab, 0.04), [])
  const frame = useMemo(() => toonMat(0x5e676e, 0.03), [])
  const dark = useMemo(() => toonMat(0x282e33, 0.02), [])
  const grate = useMemo(() => toonMat(0x1b1f22, 0), [])
  const knob = useMemo(() => toonMat(0xb0443a, 0.1), [])
  const slime = useMemo(() => toonMat(0x6f8442, 0.05), [])
  const rust = useMemo(() => toonMat(0x8a5533, 0.04), [])

  const burnerX = [-1.05, -0.7, -0.35]
  const burnerZ = [-0.2, 0.2]

  return (
    <group {...props} name="kitchen-cook-line">
      <StudioTunedGroup itemId="stage-object-kitchen-cook-line">
        <PropBox position={[0, 0.5, 0]} size={[2.55, 0.72, 0.95]} material={panel} />
        <PropBox position={[0, 0.9, 0]} size={[2.6, 0.08, 0.98]} material={top} />
        {[-1.16, 1.16].flatMap((x) => [-0.38, 0.38].map((z) => (
          <PropBox key={`${x}:${z}`} position={[x, 0.07, z]} size={[0.11, 0.14, 0.11]} material={frame} />
        )))}
        {burnerX.flatMap((x) => burnerZ.map((z) => (
          <group key={`${x}:${z}`} position={[x, 0.94, z]}>
            <PropCylinder position={[0, 0.02, 0]} args={[0.09, 0.11, 0.05, 6]} material={dark} />
            <PropBox position={[0, 0.05, 0]} size={[0.32, 0.035, 0.32]} material={grate} />
            <PropBox position={[0, 0.07, 0]} size={[0.3, 0.03, 0.05]} material={grate} />
            <PropBox position={[0, 0.07, 0]} size={[0.05, 0.03, 0.3]} material={grate} />
          </group>
        )))}
        <PropBox position={[0.3, 0.955, 0]} size={[0.6, 0.04, 0.82]} material={frame} />
        <PropBox position={[0.98, 0.955, 0]} size={[0.62, 0.04, 0.82]} material={dark} />
        <PropBox position={[-0.72, 0.42, 0.49]} size={[0.72, 0.44, 0.05]} material={frame} />
        <PropBox position={[-0.72, 0.42, 0.53]} size={[0.5, 0.24, 0.02]} material={dark} />
        <PropBox position={[-0.72, 0.62, 0.53]} size={[0.62, 0.05, 0.05]} material={top} />
        <PropBox position={[0.3, 0.42, 0.49]} size={[0.78, 0.44, 0.05]} material={frame} />
        <PropBox position={[0.3, 0.62, 0.53]} size={[0.66, 0.05, 0.05]} material={top} />
        <PropBox position={[1.0, 0.42, 0.49]} size={[0.58, 0.44, 0.05]} material={frame} />
        <PropBox position={[1.0, 0.62, 0.53]} size={[0.46, 0.05, 0.05]} material={top} />
        {[-1.14, -0.86, -0.58, -0.3, -0.02].map((x) => (
          <PropCylinder key={x} position={[x, 0.79, 0.5]} rotation={[Math.PI / 2, 0, 0]} args={[0.045, 0.045, 0.06, 6]} material={knob} />
        ))}
        <PropBox position={[0, 1.24, -0.44]} size={[2.6, 0.62, 0.1]} material={panel} />
        <PropBox position={[0, 1.56, -0.28]} size={[2.46, 0.06, 0.28]} material={frame} />
        {[-0.9, 0.9].map((x) => (
          <PropBox key={x} position={[x, 1.42, -0.3]} size={[0.06, 0.34, 0.06]} material={frame} />
        ))}
        <PropBox position={[0, 1.86, -0.55]} size={[2.75, 0.72, 0.08]} material={panel} />
        {/* 후드는 뒤로 물려 둔다 — 상판을 다 덮으면 탑다운 카메라에서 화구가 안 보인다. */}
        <PropBox position={[0, 2.05, -0.14]} size={[2.75, 0.3, 0.98]} material={top} />
        <PropBox position={[0, 1.88, 0.38]} rotation={[0.55, 0, 0]} size={[2.75, 0.3, 0.08]} material={panel} />
        {[-0.82, 0, 0.82].map((x) => (
          <PropBox key={x} position={[x, 1.92, 0.16]} rotation={[0.34, 0, 0]} size={[0.76, 0.22, 0.04]} material={frame} />
        ))}
        <PropBox position={[-0.98, 2.06, -0.2]} size={[0.34, 0.34, 0.3]} material={frame} />
        <PropBox position={[0.62, 2.06, -0.18]} size={[0.22, 0.2, 0.24]} material={frame} />
        <Pot position={[-0.7, 1.0, 0]} radius={0.21} height={0.3} body={frame} rim={top} handle="ears" />
        <PropCylinder position={[-0.7, 1.32, 0]} args={[0.2, 0.2, 0.04, 6]} material={top} />
        <PropBox position={[0.62, 0.98, 0.16]} size={[0.34, 0.014, 0.24]} material={slime} />
        <PropBox position={[-1.18, 1.3, -0.4]} size={[0.28, 0.34, 0.014]} material={slime} />
        <PropBox position={[0.9, 1.16, -0.4]} size={[0.2, 0.22, 0.014]} material={rust} />
      </StudioTunedGroup>
    </group>
  )
}

export function KitchenSinkCounter({ ...props }) {
  const top = useMemo(() => toonMat(0xc2cad1, 0.06), [])
  const panel = useMemo(() => toonMat(0x99a3ab, 0.04), [])
  const frame = useMemo(() => toonMat(0x5e676e, 0.03), [])
  const dark = useMemo(() => toonMat(0x2b3237, 0.02), [])
  const slime = useMemo(() => toonMat(0x6f8442, 0.05), [])
  const rust = useMemo(() => toonMat(0x8a5533, 0.04), [])
  const cardboard = useMemo(() => toonMat(0xbf9d6d, 0.04), [])
  const bottle = useMemo(() => toonMat(0x4b7a3f, 0.06), [])

  return (
    <group {...props} name="kitchen-sink-counter">
      <StudioTunedGroup itemId="stage-object-kitchen-sink-counter">
        <PropBox position={[0, 0.88, 0]} size={[2.3, 0.1, 0.95]} material={top} />
        <PropBox position={[0, 0.8, 0]} size={[2.34, 0.06, 0.99]} material={panel} />
        <PropBox position={[0, 1.1, -0.44]} size={[2.3, 0.36, 0.08]} material={panel} />
        <PropBox position={[0, 1.28, -0.44]} size={[2.34, 0.05, 0.14]} material={top} />
        {[-0.62, 0.02].map((x) => (
          <group key={x}>
            <PropBox position={[x, 0.925, 0.02]} size={[0.56, 0.03, 0.62]} material={dark} />
            <PropBox position={[x, 0.72, 0.02]} size={[0.5, 0.28, 0.56]} material={frame} />
          </group>
        ))}
        {[-0.24, 0.72, 0.98].map((x) => (
          <PropBox key={x} position={[x, 0.945, 0.02]} size={[0.03, 0.02, 0.6]} material={frame} />
        ))}
        <PropBox position={[0.86, 0.95, 0.05]} size={[0.5, 0.03, 0.56]} material={panel} />
        <PropCylinder position={[-0.3, 0.9, -0.3]} args={[0.07, 0.08, 0.06, 6]} material={frame} />
        <PropCylinder position={[-0.3, 1.16, -0.3]} args={[0.035, 0.035, 0.48, 6]} material={frame} />
        <PropCylinder position={[-0.3, 1.39, -0.16]} rotation={[Math.PI / 2, 0, 0]} args={[0.035, 0.035, 0.3, 6]} material={frame} />
        <PropCylinder position={[-0.3, 1.31, -0.02]} args={[0.03, 0.03, 0.16, 6]} material={frame} />
        {[-0.46, -0.14].map((x) => (
          <PropBox key={x} position={[x, 0.98, -0.3]} rotation={[0, 0, 0.3]} size={[0.16, 0.035, 0.035]} material={top} />
        ))}
        <PropCylinder position={[-1.0, 1.0, -0.34]} args={[0.05, 0.055, 0.24, 6]} material={bottle} />
        <PropCylinder position={[-1.0, 1.15, -0.34]} args={[0.025, 0.025, 0.07, 6]} material={dark} />
        <PropCylinder position={[-0.86, 0.99, -0.36]} args={[0.045, 0.05, 0.2, 6]} material={rust} />
        <PropBox position={[0.92, 1.0, -0.3]} size={[0.24, 0.14, 0.18]} material={top} />
        {[-1.05, 1.05].flatMap((x) => [-0.4, 0.4].map((z) => (
          <group key={`${x}:${z}`}>
            <PropBox position={[x, 0.42, z]} size={[0.09, 0.78, 0.09]} material={frame} />
            <PropBox position={[x, 0.025, z]} size={[0.14, 0.05, 0.14]} material={dark} />
          </group>
        )))}
        <PropBox position={[0, 0.24, 0]} size={[2.16, 0.05, 0.84]} material={panel} />
        <Pot position={[-0.78, 0.27, 0.02]} radius={0.18} height={0.28} body={frame} rim={panel} handle="ears" />
        <Pot position={[-0.32, 0.27, 0.0]} radius={0.17} height={0.26} body={dark} rim={panel} handle="ears" />
        <Pot position={[0.1, 0.27, 0.02]} radius={0.16} height={0.3} body={frame} rim={panel} />
        <PropCylinder position={[0.42, 0.4, -0.02]} args={[0.055, 0.06, 0.26, 6]} material={bottle} />
        <PropBox position={[0.86, 0.42, 0.02]} rotation={[0, 0.16, 0]} size={[0.56, 0.32, 0.42]} material={cardboard} />
        <PropBox position={[0.86, 0.42, 0.24]} rotation={[0, 0.16, 0]} size={[0.5, 0.05, 0.02]} material={rust} />
        <PropBox position={[0.4, 0.935, -0.2]} size={[0.3, 0.014, 0.22]} material={slime} />
        <PropBox position={[-1.02, 0.6, 0.4]} size={[0.1, 0.26, 0.014]} material={rust} />
        <PropBox position={[0.5, 1.1, -0.39]} size={[0.34, 0.24, 0.014]} material={slime} />
      </StudioTunedGroup>
    </group>
  )
}

export function KitchenRefrigerator({ open = false, ...props }) {
  const top = useMemo(() => toonMat(0xc2cad1, 0.06), [])
  const panel = useMemo(() => toonMat(0x99a3ab, 0.04), [])
  const frame = useMemo(() => toonMat(0x5e676e, 0.03), [])
  const dark = useMemo(() => toonMat(0x23292e, 0.01), [])
  const inner = useMemo(() => toonMat(0x141a1e, 0), [])
  const slime = useMemo(() => toonMat(0x6f8442, 0.05), [])
  const rust = useMemo(() => toonMat(0x8a5533, 0.04), [])
  const paper = useMemo(() => toonMat(0xe3d9bc, 0.03), [])

  // 경첩이 오른쪽 모서리(x=+0.59)라 양수 회전이어야 문이 앞(+z)으로 열린다. 음수면 뒤로 접힌다.
  const doorSwing = open ? 1.78 : 0

  return (
    <group {...props} name="kitchen-refrigerator">
      <StudioTunedGroup itemId="stage-object-kitchen-refrigerator">
        {/* 박스 프리미티브로는 본체를 파낼 수 없다. 문을 열면 오른쪽 칸을 뒷벽만 남기고 실제로 비운다. */}
        {open ? (
          <>
            <PropBox position={[-0.3, 0.94, 0]} size={[0.62, 1.64, 0.82]} material={panel} />
            <PropBox position={[0.3, 0.94, -0.29]} size={[0.62, 1.64, 0.24]} material={panel} />
          </>
        ) : (
          <PropBox position={[0, 0.94, 0]} size={[1.22, 1.64, 0.82]} material={panel} />
        )}
        <PropBox position={[0, 1.86, 0]} size={[1.0, 0.2, 0.7]} material={top} />
        <PropBox position={[0, 1.95, 0]} size={[1.04, 0.04, 0.74]} material={frame} />
        <PropBox position={[-0.28, 1.86, 0.36]} size={[0.34, 0.14, 0.03]} material={dark} />
        {[-0.04, 0, 0.04].map((y) => (
          <PropBox key={y} position={[-0.28, 1.86 + y, 0.375]} size={[0.32, 0.014, 0.02]} material={frame} />
        ))}
        <PropBox position={[0.22, 1.88, 0.36]} size={[0.3, 0.08, 0.03]} material={top} />
        <PropBox position={[0, 1.74, 0]} size={[1.26, 0.06, 0.86]} material={frame} />
        <PropBox position={[0, 0.16, 0]} size={[1.26, 0.1, 0.86]} material={frame} />
        {[-0.52, 0.52].flatMap((x) => [-0.32, 0.32].map((z) => (
          <PropBox key={`${x}:${z}`} position={[x, 0.06, z]} size={[0.14, 0.12, 0.14]} material={dark} />
        )))}
        {open && (
          <>
            <PropBox position={[0.3, 0.94, -0.15]} size={[0.6, 1.5, 0.04]} material={inner} />
            {[0.02, 0.58].map((x) => (
              <PropBox key={x} position={[x, 0.94, 0.06]} size={[0.05, 1.5, 0.58]} material={inner} />
            ))}
            <PropBox position={[0.3, 0.2, 0.06]} size={[0.62, 0.07, 0.58]} material={inner} />
            <PropBox position={[0.3, 1.7, 0.06]} size={[0.62, 0.07, 0.58]} material={inner} />
            {[0.5, 0.92, 1.34].map((y) => (
              <PropBox key={y} position={[0.3, y, 0.08]} size={[0.52, 0.04, 0.52]} material={frame} />
            ))}
            <GnPan position={[0.3, 0.94, 0.08]} width={0.44} depth={0.34} steel={frame} rim={panel} food={slime} />
            <Pot position={[0.3, 1.36, 0.08]} radius={0.12} height={0.16} body={frame} rim={panel} />
          </>
        )}
        <PropBox position={[-0.3, 0.96, 0.44]} size={[0.58, 1.5, 0.06]} material={top} />
        <PropBox position={[-0.3, 0.96, 0.46]} size={[0.48, 1.36, 0.02]} material={panel} />
        <PropBox position={[-0.1, 0.98, 0.5]} size={[0.05, 0.66, 0.07]} material={dark} />
        <PropBox position={[-0.42, 1.38, 0.475]} rotation={[0, 0, 0.06]} size={[0.22, 0.3, 0.02]} material={paper} />
        <PropBox position={[-0.46, 0.5, 0.475]} size={[0.2, 0.26, 0.014]} material={slime} />
        <group position={[0.59, 0.96, 0.44]} rotation={[0, doorSwing, 0]}>
          <PropBox position={[-0.29, 0, 0]} size={[0.58, 1.5, 0.06]} material={top} />
          <PropBox position={[-0.29, 0, 0.02]} size={[0.48, 1.36, 0.02]} material={panel} />
          <PropBox position={[-0.51, 0.02, 0.06]} size={[0.05, 0.66, 0.07]} material={dark} />
          <PropBox position={[-0.24, -0.4, 0.035]} size={[0.24, 0.3, 0.014]} material={rust} />
        </group>
        <PropBox position={[0.3, 1.62, 0.44]} size={[0.3, 0.24, 0.014]} material={slime} />
        <PropBox position={[-0.62, 1.2, 0.0]} size={[0.014, 0.4, 0.3]} material={rust} />
      </StudioTunedGroup>
    </group>
  )
}

export function KitchenTrayRack({ ...props }) {
  const top = useMemo(() => toonMat(0xc2cad1, 0.06), [])
  const panel = useMemo(() => toonMat(0x99a3ab, 0.04), [])
  const frame = useMemo(() => toonMat(0x5e676e, 0.03), [])
  const dark = useMemo(() => toonMat(0x2b3237, 0.02), [])
  const tire = useMemo(() => toonMat(0x1c2023, 0), [])
  const stew = useMemo(() => toonMat(0xc98a3a, 0.08), [])
  const slime = useMemo(() => toonMat(0x6f8442, 0.05), [])
  const rust = useMemo(() => toonMat(0x8a5533, 0.04), [])

  const shelfFoods = [stew, slime, stew, null, slime, null]

  return (
    <group {...props} name="kitchen-tray-rack">
      <StudioTunedGroup itemId="stage-object-kitchen-tray-rack">
        {[-0.32, 0.32].flatMap((x) => [-0.28, 0.28].map((z) => (
          <group key={`${x}:${z}`}>
            <PropBox position={[x, 0.8, z]} size={[0.07, 1.46, 0.07]} material={frame} />
            <Caster position={[x, 0.06, z]} material={tire} />
          </group>
        )))}
        {[-0.28, 0.28].map((z) => (
          <PropBox key={`top-x-${z}`} position={[0, 1.55, z]} size={[0.72, 0.06, 0.06]} material={panel} />
        ))}
        {[-0.32, 0.32].map((x) => (
          <PropBox key={`top-z-${x}`} position={[x, 1.55, 0]} size={[0.06, 0.06, 0.62]} material={panel} />
        ))}
        {[-0.32, 0.32].map((x) => (
          <PropBox key={`base-${x}`} position={[x, 0.14, 0]} size={[0.07, 0.06, 0.6]} material={frame} />
        ))}
        {shelfFoods.map((food, index) => {
          const y = 0.36 + index * 0.21
          const pulled = index === 2
          return (
            <group key={index}>
              {[-0.31, 0.31].map((x) => (
                <PropBox key={x} position={[x, y, 0]} size={[0.06, 0.03, 0.58]} material={panel} />
              ))}
              <PropBox position={[0, y - 0.02, -0.28]} size={[0.58, 0.03, 0.05]} material={frame} />
              {food && (
                <GnPan
                  position={[0, y, pulled ? 0.14 : 0]}
                  rotation={[0, pulled ? 0.06 : 0, 0]}
                  width={0.56}
                  depth={0.48}
                  steel={dark}
                  rim={top}
                  food={food}
                />
              )}
            </group>
          )
        })}
        {[-0.32, 0.32].map((x) => (
          <PropBox key={`handle-${x}`} position={[x, 1.63, -0.28]} size={[0.05, 0.16, 0.05]} material={frame} />
        ))}
        <PropBox position={[0, 1.7, -0.28]} size={[0.72, 0.05, 0.05]} material={panel} />
        <PropBox position={[0.34, 0.9, 0.29]} size={[0.014, 0.3, 0.16]} material={rust} />
        <PropBox position={[-0.34, 0.5, -0.29]} size={[0.014, 0.22, 0.2]} material={slime} />
      </StudioTunedGroup>
    </group>
  )
}

export function KitchenShelfCart({ ...props }) {
  const top = useMemo(() => toonMat(0xc2cad1, 0.06), [])
  const panel = useMemo(() => toonMat(0x99a3ab, 0.04), [])
  const frame = useMemo(() => toonMat(0x5e676e, 0.03), [])
  const dark = useMemo(() => toonMat(0x2b3237, 0.02), [])
  const tire = useMemo(() => toonMat(0x1c2023, 0), [])
  const canGreen = useMemo(() => toonMat(0x5c7a3c, 0.05), [])
  const canRust = useMemo(() => toonMat(0x8a5533, 0.05), [])
  const label = useMemo(() => toonMat(0xd8cba6, 0.03), [])

  const cans = [
    { x: -0.36, z: -0.12, material: canRust, height: 0.22, radius: 0.08 },
    { x: -0.16, z: 0.1, material: canGreen, height: 0.18, radius: 0.075 },
    { x: 0.06, z: -0.08, material: panel, height: 0.24, radius: 0.085 },
    { x: 0.26, z: 0.12, material: canGreen, height: 0.2, radius: 0.08 },
    { x: 0.4, z: -0.1, material: canRust, height: 0.16, radius: 0.07 },
  ]

  return (
    <group {...props} name="kitchen-shelf-cart">
      <StudioTunedGroup itemId="stage-object-kitchen-shelf-cart">
        {[0.28, 0.62, 0.96].map((y, index) => (
          <PropBox key={y} position={[0, y, 0]} size={[0.98, 0.05, 0.56]} material={index === 2 ? top : panel} />
        ))}
        {[-0.45, 0.45].flatMap((x) => [-0.24, 0.24].map((z) => (
          <group key={`${x}:${z}`}>
            <PropBox position={[x, 0.56, z]} size={[0.06, 0.92, 0.06]} material={frame} />
            <Caster position={[x, 0.06, z]} material={tire} />
          </group>
        )))}
        <PropBox position={[0, 1.02, -0.24]} size={[1.0, 0.05, 0.05]} material={panel} />
        {[-0.45, 0.45].map((x) => (
          <PropBox key={x} position={[x, 1.0, -0.24]} size={[0.06, 0.1, 0.06]} material={frame} />
        ))}
        {cans.map((can) => (
          <group key={`${can.x}:${can.z}`}>
            <PropCylinder position={[can.x, 0.985 + can.height / 2, can.z]} args={[can.radius, can.radius, can.height, 6]} material={can.material} />
            <PropCylinder position={[can.x, 0.985 + can.height / 2, can.z]} args={[can.radius + 0.004, can.radius + 0.004, can.height * 0.4, 6]} material={label} />
            <PropCylinder position={[can.x, 0.985 + can.height, can.z]} args={[can.radius + 0.008, can.radius + 0.008, 0.025, 6]} material={panel} />
          </group>
        ))}
        <Pot position={[-0.3, 0.645, 0.02]} radius={0.13} height={0.19} body={frame} rim={panel} />
        <Pot position={[0.02, 0.645, -0.04]} radius={0.11} height={0.15} body={dark} rim={panel} />
        <Pot position={[0.32, 0.645, 0.06]} radius={0.14} height={0.2} body={frame} rim={panel} handle="ears" />
        {[-0.3, 0.0, 0.32].map((x, index) => (
          <PropBox key={x} position={[x, 0.42, index === 1 ? 0.06 : -0.04]} rotation={[0, index * 0.14, 0]} size={[0.26, 0.22, 0.24]} material={index === 1 ? canGreen : canRust} />
        ))}
      </StudioTunedGroup>
    </group>
  )
}

export function KitchenTrashBins({ variant = 'wheelie', ...props }) {
  const bin = useMemo(() => toonMat(0x5f7a44, 0.05), [])
  const binDark = useMemo(() => toonMat(0x445a31, 0.03), [])
  const steel = useMemo(() => toonMat(0x9aa3ab, 0.04), [])
  const steelDark = useMemo(() => toonMat(0x5e676e, 0.03), [])
  const tire = useMemo(() => toonMat(0x1c2023, 0), [])
  const rust = useMemo(() => toonMat(0x8a5533, 0.04), [])
  const slime = useMemo(() => toonMat(0x6f8442, 0.05), [])

  const mode = pickVariant(KITCHEN_TRASH_BIN_VARIANTS, variant, 'wheelie')

  if (mode === 'round') {
    return (
      <group {...props} name="kitchen-trash-bins">
        <StudioTunedGroup itemId="stage-object-kitchen-trash-bins">
          <PropCylinder position={[0, 0.36, 0]} args={[0.3, 0.26, 0.68, 8]} material={steel} />
          {[0.16, 0.36, 0.56].map((y) => {
            // 몸통이 아래로 좁아지므로 각 높이의 실제 반지름에 맞춰 골판 링을 얹는다.
            const bodyRadius = 0.26 + 0.04 * ((y - 0.02) / 0.68)
            return (
              <PropCylinder key={y} position={[0, y, 0]} args={[bodyRadius + 0.014, bodyRadius + 0.008, 0.035, 8]} material={steelDark} />
            )
          })}
          <PropCylinder position={[0, 0.72, 0]} args={[0.33, 0.31, 0.06, 8]} material={steelDark} />
          <PropCylinder position={[0, 0.78, 0]} args={[0.2, 0.3, 0.08, 8]} material={bin} />
          <PropCylinder position={[0, 0.85, 0]} args={[0.055, 0.055, 0.07, 6]} material={steelDark} />
          {[-1, 1].map((side) => (
            <PropBox key={side} position={[side * 0.31, 0.5, 0]} size={[0.06, 0.14, 0.05]} material={steelDark} />
          ))}
          <PropBox position={[0.18, 0.32, 0.24]} size={[0.16, 0.24, 0.014]} material={slime} />
          <PropBox position={[-0.2, 0.5, 0.2]} size={[0.14, 0.18, 0.014]} material={rust} />
        </StudioTunedGroup>
      </group>
    )
  }

  return (
    <group {...props} name="kitchen-trash-bins">
      <StudioTunedGroup itemId="stage-object-kitchen-trash-bins">
        <PropBox position={[0, 0.54, 0]} size={[0.66, 0.82, 0.6]} material={bin} />
        <PropBox position={[0, 0.28, 0.31]} rotation={[0.06, 0, 0]} size={[0.6, 0.3, 0.03]} material={binDark} />
        <PropBox position={[0, 0.7, 0.31]} size={[0.6, 0.34, 0.03]} material={binDark} />
        <PropBox position={[0, 0.99, 0]} size={[0.7, 0.1, 0.66]} material={binDark} />
        <PropBox position={[0, 0.94, 0.33]} size={[0.7, 0.08, 0.06]} material={bin} />
        <PropBox position={[0, 1.04, 0.2]} size={[0.34, 0.05, 0.06]} material={bin} />
        <PropBox position={[0, 0.2, 0.32]} size={[0.5, 0.07, 0.05]} material={binDark} />
        <PropBox position={[0, 0.9, -0.32]} size={[0.5, 0.16, 0.05]} material={binDark} />
        {[-0.28, 0.28].map((x) => (
          <PropCylinder key={x} position={[x, 0.11, -0.2]} rotation={[0, 0, Math.PI / 2]} args={[0.11, 0.11, 0.07, 6]} material={tire} />
        ))}
        {[-0.3, 0.3].map((x) => (
          <PropBox key={`foot-${x}`} position={[x, 0.06, 0.24]} size={[0.1, 0.12, 0.1]} material={binDark} />
        ))}
        <PropBox position={[0.16, 0.5, 0.31]} size={[0.2, 0.3, 0.014]} material={rust} />
        <PropBox position={[-0.2, 0.72, 0.31]} size={[0.16, 0.2, 0.014]} material={slime} />
        <PropBox position={[0.34, 0.6, 0.0]} size={[0.014, 0.34, 0.24]} material={slime} />
      </StudioTunedGroup>
    </group>
  )
}

export function KitchenCrateStack({ count = 3, ...props }) {
  const crateGreen = useMemo(() => toonMat(0x4f7a45, 0.05), [])
  const crateGreenDark = useMemo(() => toonMat(0x35552f, 0.03), [])
  const wood = useMemo(() => toonMat(0xa97742, 0.04), [])
  const woodDark = useMemo(() => toonMat(0x7c5730, 0.03), [])
  const cardboard = useMemo(() => toonMat(0xc2a273, 0.04), [])
  const cardboardDark = useMemo(() => toonMat(0x9b7c50, 0.03), [])
  const tape = useMemo(() => toonMat(0xd9cba7, 0.03), [])
  const stamp = useMemo(() => toonMat(0xb0443a, 0.08), [])
  const slime = useMemo(() => toonMat(0x6f8442, 0.05), [])

  const layers = Math.min(6, Math.max(1, Math.round(Number(count) || 1)))
  const kinds = ['plastic', 'wood', 'cardboard', 'cardboardStamped', 'plastic', 'wood']

  return (
    <group {...props} name="kitchen-crate-stack">
      <StudioTunedGroup itemId="stage-object-kitchen-crate-stack">
        {Array.from({ length: layers }, (_, index) => {
          const y = 0.17 + index * 0.34
          const spin = (index % 2 === 0 ? 1 : -1) * (0.05 + index * 0.03)
          const kind = kinds[index % kinds.length]

          if (kind === 'plastic') {
            return (
              <group key={index} position={[index * 0.02, y, index * -0.015]} rotation={[0, spin, 0]}>
                <PropBox size={[0.62, 0.3, 0.44]} material={crateGreen} />
                <PropBox position={[0, 0.15, 0]} size={[0.66, 0.045, 0.48]} material={crateGreenDark} />
                {[-0.08, 0.04].map((sy) => (
                  <PropBox key={sy} position={[0, sy, 0.225]} size={[0.5, 0.045, 0.02]} material={crateGreenDark} />
                ))}
                {[-0.18, 0.18].map((sx) => (
                  <PropBox key={sx} position={[sx, -0.02, 0.225]} size={[0.04, 0.2, 0.02]} material={crateGreenDark} />
                ))}
              </group>
            )
          }

          if (kind === 'wood') {
            return (
              <group key={index} position={[index * -0.02, y, index * 0.015]} rotation={[0, spin, 0]}>
                <PropBox size={[0.6, 0.32, 0.44]} material={wood} />
                {[-0.1, 0.02, 0.13].map((sy) => (
                  <PropBox key={sy} position={[0, sy, 0.226]} size={[0.6, 0.07, 0.014]} material={woodDark} />
                ))}
                {[-0.28, 0.28].map((sx) => (
                  <PropBox key={sx} position={[sx, 0, 0.226]} size={[0.06, 0.32, 0.02]} material={woodDark} />
                ))}
                <PropBox position={[0, 0.16, 0]} size={[0.64, 0.035, 0.48]} material={woodDark} />
              </group>
            )
          }

          return (
            <group key={index} position={[index * 0.015, y, index * 0.02]} rotation={[0, spin, 0]}>
              <PropBox size={[0.62, 0.34, 0.46]} material={cardboard} />
              <PropBox position={[0, 0.17, 0]} size={[0.62, 0.02, 0.1]} material={tape} />
              <PropBox position={[0, 0.0, 0.235]} size={[0.62, 0.02, 0.01]} material={cardboardDark} />
              {kind === 'cardboardStamped' && (
                <PropBox position={[0.02, 0.05, 0.236]} size={[0.3, 0.09, 0.012]} material={stamp} />
              )}
            </group>
          )
        })}
        <PropBox position={[0.24, 0.02, 0.26]} size={[0.3, 0.02, 0.22]} material={slime} />
      </StudioTunedGroup>
    </group>
  )
}

export function KitchenClutter({ variant = 'pots', ...props }) {
  const steel = useMemo(() => toonMat(0xb4bcc3, 0.05), [])
  const steelMid = useMemo(() => toonMat(0x8d969d, 0.04), [])
  const steelDark = useMemo(() => toonMat(0x565f66, 0.03), [])
  const dark = useMemo(() => toonMat(0x23292e, 0.01), [])
  const bag = useMemo(() => toonMat(0x1a1d21, 0), [])
  const slime = useMemo(() => toonMat(0x6f8442, 0.05), [])
  const stew = useMemo(() => toonMat(0xc98a3a, 0.08), [])
  const ketchup = useMemo(() => toonMat(0xb03a30, 0.1), [])
  const canGreen = useMemo(() => toonMat(0x5c7a3c, 0.05), [])
  const paper = useMemo(() => toonMat(0xe3d9bc, 0.03), [])

  const mode = pickVariant(KITCHEN_CLUTTER_VARIANTS, variant, 'pots')

  return (
    <group {...props} name="kitchen-clutter">
      <StudioTunedGroup itemId="stage-object-kitchen-clutter">
        {mode === 'pots' && (
          <>
            <Pot position={[-0.44, 0, -0.12]} radius={0.2} height={0.34} body={steelDark} rim={steel} handle="ears" />
            <Pot position={[0.1, 0, 0.24]} radius={0.14} height={0.18} body={steelMid} rim={dark} handle="long" />
            <PropCylinder position={[0.56, 0.09, -0.2]} args={[0.24, 0.16, 0.18, 8]} material={steelMid} />
            <PropCylinder position={[0.56, 0.175, -0.2]} args={[0.205, 0.205, 0.02, 8]} material={dark} />
            <PropCylinder position={[0.56, 0.02, -0.2]} args={[0.12, 0.1, 0.04, 8]} material={steelDark} />
            <PropCylinder position={[-0.06, 0.07, -0.5]} args={[0.19, 0.13, 0.14, 8]} material={steelDark} />
            <PropCylinder position={[-0.06, 0.14, -0.5]} args={[0.16, 0.16, 0.025, 8]} material={slime} />
            <PropCylinder position={[-0.62, 0.048, 0.36]} rotation={[0, 0, 0.12]} args={[0.19, 0.19, 0.035, 8]} material={steel} />
            <PropCylinder position={[-0.62, 0.078, 0.36]} args={[0.045, 0.045, 0.05, 6]} material={steelDark} />
            <PropBox position={[0.2, 0.008, -0.6]} size={[0.34, 0.016, 0.26]} material={slime} />
          </>
        )}
        {mode === 'bags' && (
          <>
            <PropBlob position={[-0.4, 0.26, -0.06]} radius={0.3} scale={[1.0, 0.9, 0.95]} rotation={[0.1, 0.4, 0]} material={bag} />
            <PropBox position={[-0.4, 0.5, -0.06]} rotation={[0, 0.4, 0.2]} size={[0.09, 0.14, 0.09]} material={bag} />
            <PropBlob position={[0.18, 0.22, 0.3]} radius={0.26} scale={[1.05, 0.85, 1.0]} rotation={[0, -0.5, 0.08]} material={bag} />
            <PropBox position={[0.18, 0.42, 0.3]} rotation={[0, -0.5, -0.25]} size={[0.08, 0.12, 0.08]} material={bag} />
            <PropCylinder position={[0.56, 0.07, -0.18]} rotation={[Math.PI / 2, 0, 0.4]} args={[0.07, 0.07, 0.14, 6]} material={canGreen} />
            <PropCylinder position={[0.34, 0.09, -0.4]} args={[0.075, 0.075, 0.18, 6]} material={steelMid} />
            <PropCylinder position={[0.34, 0.185, -0.4]} args={[0.078, 0.078, 0.02, 6]} material={steelDark} />
            <PropCylinder position={[-0.72, 0.13, 0.32]} args={[0.05, 0.055, 0.26, 6]} material={ketchup} />
            <PropCylinder position={[-0.72, 0.29, 0.32]} args={[0.028, 0.028, 0.07, 6]} material={dark} />
            <PropBox position={[-0.1, 0.012, 0.6]} rotation={[0, 0.3, 0]} size={[0.3, 0.024, 0.24]} material={paper} />
            <PropBox position={[0.62, 0.01, 0.44]} size={[0.28, 0.02, 0.2]} material={slime} />
          </>
        )}
        {mode === 'trays' && (
          <>
            <GnPan position={[-0.42, 0, -0.1]} rotation={[0, 0.22, 0]} width={0.56} depth={0.4} steel={steelMid} rim={steel} food={stew} />
            <GnPan position={[-0.4, 0.13, -0.08]} rotation={[0, 0.12, 0]} width={0.56} depth={0.4} steel={steelMid} rim={steel} food={slime} />
            <GnPan position={[0.24, 0, 0.28]} rotation={[0, -0.42, 0]} width={0.5} depth={0.36} steel={steelDark} rim={steel} />
            <group position={[0.5, 0.13, -0.34]} rotation={[0.5, 0.3, 0]}>
              <PropBox position={[0, 0.05, 0]} size={[0.48, 0.1, 0.34]} material={steelMid} />
              <PropBox position={[0, 0.105, 0]} size={[0.53, 0.03, 0.39]} material={steel} />
            </group>
            {[0, 1, 2].map((index) => (
              <PropCylinder key={index} position={[-0.7, 0.02 + index * 0.035, 0.42]} args={[0.16, 0.16, 0.03, 8]} material={paper} />
            ))}
            <PropBox position={[0.02, 0.01, -0.5]} rotation={[0, 0.4, 0]} size={[0.42, 0.02, 0.3]} material={slime} />
            <PropBox position={[0.12, 0.012, 0.62]} size={[0.26, 0.02, 0.2]} material={stew} />
          </>
        )}
      </StudioTunedGroup>
    </group>
  )
}
