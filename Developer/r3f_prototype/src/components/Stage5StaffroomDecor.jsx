// Stage 5 교무실 벽 비주얼(스펙 Part B §3-3 · §12-1). 콜라이더 없음 — 물리 벽은 Floor.jsx의
// 투명 RigidBody가 맡는다. 실시간 광원 없음(조명은 바닥 lightMap 굽기).
//
// - 북벽: 가운데 현관 개구부(문짝·간판은 staffroomEntranceDoor 프랍), 개구부 뒤 바깥 풍경 판.
// - 동벽: 창문 4칸 — 창밖 운동장 모래색 + 하늘.
// - 서벽: 게시판 2장.
// - 남벽: 카메라(+Z 쪽, 45°) 앞을 가리지 않게 낮은 벽(걸레받이 높이 + 0.4)만 둔다.
// 벽 안쪽 면이 정확히 맵 경계(±halfX / ±halfZ)에 오도록 벽 중심을 두께 절반만큼 바깥에 둔다.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getStageBounds } from '../lib/stageConfig.js'
import {
  getPropOutlineScale,
  getStagePropDepthWritingToonMaterial,
  getStagePropOutlineMaterial,
  getStagePropOutlineUserData,
  STAGE_PROP_SHARED_OUTLINE_RENDERING,
  STAGE_PROP_SHARED_SURFACE_RENDERING,
  STAGE_PROP_UNIT_BOX_GEOMETRY,
} from './StageObjects/propRendering.js'

export const STAGE5_STAFFROOM_DECOR = Object.freeze({
  wall: 0xe8e1d0,
  baseboard: 0x6b7a66,
  windowFrame: 0xf4f1e8,
  sand: '#D9C08A',
  sky: '#BFE3F5',
  cork: 0xb98a55,
  corkFrame: 0x6b4a2e,
  wallHeight: 3.0,
  southWallHeight: 0.55,
  wallThickness: 0.4,
  baseboardHeight: 0.18,
  doorOpeningHalfWidth: 1.72,
  doorOpeningHeight: 2.43,
  eastWindowZs: Object.freeze([-10, -4, 2, 8]),
  westBoardZs: Object.freeze([-7, 9.5]),
})

function Box({ position, scale, material, outline = false, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_SHARED_SURFACE_RENDERING} geometry={STAGE_PROP_UNIT_BOX_GEOMETRY} material={material} scale={scale} />
      {outline && (
        <mesh
          {...STAGE_PROP_SHARED_OUTLINE_RENDERING}
          userData={getStagePropOutlineUserData()}
          geometry={STAGE_PROP_UNIT_BOX_GEOMETRY}
          material={getStagePropOutlineMaterial(0.96, 0x050209)}
          scale={getPropOutlineScale(scale)}
        />
      )}
    </group>
  )
}

function Plane({ position, rotation, size, material }) {
  return (
    <mesh position={position} rotation={rotation} material={material} renderOrder={1}>
      <planeGeometry args={size} />
    </mesh>
  )
}

// 바깥 풍경 판(하늘 위 + 운동장 모래 아래). 북벽 개구부 뒤와 동벽 창 안쪽에 쓴다.
function OutsideView({ position, rotation = [0, 0, 0], width, height, sandRatio = 0.38, sky, sand }) {
  const sandHeight = height * sandRatio
  const skyHeight = height - sandHeight
  return (
    <group position={position} rotation={rotation}>
      <Plane position={[0, sandHeight + skyHeight / 2, 0]} size={[width, skyHeight]} material={sky} />
      <Plane position={[0, sandHeight / 2, 0.001]} size={[width, sandHeight]} material={sand} />
    </group>
  )
}

export default function Stage5StaffroomDecor() {
  const ref = useRef(null)
  const { halfX, halfZ } = getStageBounds('stage5')
  const D = STAGE5_STAFFROOM_DECOR
  const t = D.wallThickness
  const wall = getStagePropDepthWritingToonMaterial(D.wall, 0.05)
  const baseboard = getStagePropDepthWritingToonMaterial(D.baseboard, 0.04)
  const frame = getStagePropDepthWritingToonMaterial(D.windowFrame, 0.06)
  const cork = getStagePropDepthWritingToonMaterial(D.cork, 0.05)
  const corkFrame = getStagePropDepthWritingToonMaterial(D.corkFrame, 0.04)
  const paperA = getStagePropDepthWritingToonMaterial(0xf4f1e8, 0.06)
  const paperB = getStagePropDepthWritingToonMaterial(0xf2d96b, 0.06)
  const paperC = getStagePropDepthWritingToonMaterial(0xf2b8c6, 0.06)
  // 창밖 풍경은 조명과 무관한 색이어야 해서 unlit MeshBasicMaterial을 이 컴포넌트가 소유한다.
  const sky = useMemo(() => new THREE.MeshBasicMaterial({ color: D.sky, side: THREE.DoubleSide, toneMapped: false }), [D.sky])
  const sand = useMemo(() => new THREE.MeshBasicMaterial({ color: D.sand, side: THREE.DoubleSide, toneMapped: false }), [D.sand])
  useEffect(() => () => { sky.dispose(); sand.dispose() }, [sky, sand])

  useLayoutEffect(() => {
    ref.current?.traverse((object) => {
      object.matrixAutoUpdate = false
      object.updateMatrix()
    })
  })

  const H = D.wallHeight
  const northZ = -halfZ - t / 2
  const southZ = halfZ + t / 2
  const eastX = halfX + t / 2
  const westX = -halfX - t / 2
  const outerX = halfX + t
  const doorHalf = D.doorOpeningHalfWidth
  const sideSegment = outerX - doorHalf
  const bb = D.baseboardHeight

  return (
    <group ref={ref} name="stage5-staffroom-decor">
      {/* ── 북벽(현관 개구부) ── */}
      <Box position={[-(doorHalf + sideSegment / 2), H / 2, northZ]} scale={[sideSegment, H, t]} material={wall} outline />
      <Box position={[doorHalf + sideSegment / 2, H / 2, northZ]} scale={[sideSegment, H, t]} material={wall} outline />
      <Box position={[0, (D.doorOpeningHeight + H) / 2, northZ]} scale={[doorHalf * 2, H - D.doorOpeningHeight, t]} material={wall} />
      <Box position={[-(doorHalf + sideSegment / 2), bb / 2, -halfZ + 0.015]} scale={[sideSegment, bb, 0.03]} material={baseboard} />
      <Box position={[doorHalf + sideSegment / 2, bb / 2, -halfZ + 0.015]} scale={[sideSegment, bb, 0.03]} material={baseboard} />
      <OutsideView position={[0, 0, northZ - t / 2 - 0.05]} width={doorHalf * 2 + 0.4} height={D.doorOpeningHeight + 0.2} sky={sky} sand={sand} />

      {/* ── 동벽 + 창문 4칸(창밖 운동장) ── */}
      <Box position={[eastX, H / 2, 0]} scale={[t, H, halfZ * 2 + t * 2]} material={wall} outline />
      <Box position={[halfX - 0.015, bb / 2, 0]} scale={[0.03, bb, halfZ * 2]} material={baseboard} />
      {D.eastWindowZs.map((z) => (
        <group key={`east-window:${z}`} name="stage5-east-window" position={[halfX - 0.02, 0, z]}>
          <OutsideView position={[-0.005, 0.95, 0]} rotation={[0, -Math.PI / 2, 0]} width={2.5} height={1.35} sandRatio={0.4} sky={sky} sand={sand} />
          <Box position={[-0.03, 0.9, 0]} scale={[0.08, 0.1, 2.7]} material={frame} />
          <Box position={[-0.03, 2.35, 0]} scale={[0.08, 0.1, 2.7]} material={frame} />
          <Box position={[-0.03, 1.62, -1.3]} scale={[0.08, 1.45, 0.1]} material={frame} />
          <Box position={[-0.03, 1.62, 1.3]} scale={[0.08, 1.45, 0.1]} material={frame} />
          <Box position={[-0.03, 1.62, 0]} scale={[0.06, 1.45, 0.06]} material={frame} />
        </group>
      ))}

      {/* ── 서벽 + 게시판 2장 ── */}
      <Box position={[westX, H / 2, 0]} scale={[t, H, halfZ * 2 + t * 2]} material={wall} outline />
      <Box position={[-halfX + 0.015, bb / 2, 0]} scale={[0.03, bb, halfZ * 2]} material={baseboard} />
      {D.westBoardZs.map((z) => (
        <group key={`west-board:${z}`} name="stage5-west-board" position={[-halfX + 0.03, 0, z]}>
          <Box position={[0.02, 1.55, 0]} scale={[0.06, 1.1, 2.0]} material={corkFrame} outline />
          <Box position={[0.04, 1.55, 0]} scale={[0.04, 0.96, 1.86]} material={cork} />
          <Box position={[0.07, 1.72, -0.55]} rotation={[0.06, 0, 0]} scale={[0.01, 0.4, 0.3]} material={paperA} />
          <Box position={[0.07, 1.48, 0.1]} rotation={[-0.05, 0, 0]} scale={[0.01, 0.34, 0.42]} material={paperB} />
          <Box position={[0.07, 1.7, 0.62]} rotation={[0.1, 0, 0]} scale={[0.01, 0.3, 0.28]} material={paperC} />
          <Box position={[0.07, 1.3, -0.4]} rotation={[-0.08, 0, 0]} scale={[0.01, 0.26, 0.34]} material={paperA} />
        </group>
      ))}

      {/* ── 남벽(낮은 벽) ── */}
      <Box position={[0, D.southWallHeight / 2, southZ]} scale={[outerX * 2, D.southWallHeight, t]} material={wall} outline />
      <Box position={[0, bb / 2, halfZ - 0.015]} scale={[halfX * 2, bb, 0.03]} material={baseboard} />
    </group>
  )
}
