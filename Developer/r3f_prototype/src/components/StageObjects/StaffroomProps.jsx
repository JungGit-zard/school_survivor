// stage5 「교무실 최종 돌파」 프랍 6종 (스펙 Part B §3-4 · §12).
//
// - staffroomDeskIsland: 맞붙은 교사 책상 섬. 12개가 같은 박스 파츠라서 InstancedMesh로 그린다
//   (재질 5종 + 외곽선 1종 = 섬 전체 6 드로우콜). StageObjectLayer가 같은 타입 배치를 모아
//   StaffroomDeskIslandBatch 한 번으로 넘긴다.
// - staffroomViceDesk / staffroomCopier: solid 가구(콜라이더는 stageObjectColliders.js).
// - staffroomEntranceDoor: 중앙 현관 유리 이중문. 탈출구(escapePortalActive)가 열리면 600ms 동안
//   문짝이 바깥(−Z)으로 열린다. 비주얼만 — 콜라이더·시야 차단 없음.
// - staffroomSpeaker: 벽걸이 교내 방송 스피커(y 2.4). 램프 메시에 userData.stage5CallLaneLamp(레인 id)를
//   달아 두어 호출 레인 표시(wave 2)가 해당 레인 스피커를 찾아 칠할 수 있다.
// - staffroomClutter: 바닥 서류·바인더. 통과형.
//
// 재질은 전부 MeshToonMaterial(propRendering의 캐시) + 반전 헐 외곽선(getStagePropOutlineMaterial) 규약.
// 정적 프랍은 마운트 후 행렬을 얼린다(KitchenProps의 freezeMatrices와 같은 효과).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  getPropOutlineScale,
  getStagePropDepthWritingToonMaterial,
  getStagePropOutlineMaterial,
  getStagePropOutlineUserData,
  STAGE_PROP_SHARED_OUTLINE_RENDERING,
  STAGE_PROP_SHARED_SURFACE_RENDERING,
  STAGE_PROP_UNIT_BOX_GEOMETRY,
} from './propRendering.js'
import { getCachedCylinderGeo } from '../../lib/toon.js'
import { useGameStore } from '../../store/useGameStore.js'
import StudioTunedGroup, { applyStudioTuning, composeStudioPartRotation, disposeStudioOwnedMaterials, getStudioTransformProps } from '../StudioTunedGroup.jsx'
import { DEFAULT_STUDIO_TUNING, GRAPHICS_STUDIO_TUNING_EVENT, loadStudioTunings } from '../../lib/graphicsStudioConfig.js'

export const STAFFROOM_DESK_ISLAND_VARIANTS = Object.freeze(['long', 'short'])
export const STAFFROOM_COPIER_VARIANTS = Object.freeze(['normal', 'jammed'])
export const STAFFROOM_CLUTTER_VARIANTS = Object.freeze(['papers', 'binders'])

// §12-1 팔레트.
export const STAFFROOM_PALETTE = Object.freeze({
  deskTop: 0xc8a77a,
  steel: 0x8c9399,
  partition: 0x6f8fa8,
  monitor: 0x2f3439,
  paper: 0xefede6,
  viceWood: 0x7a4e2d,
  viceWoodDark: 0x5a3820,
  nameplate: 0xf2e6c9,
  copierBody: 0xe8e6df,
  copierTop: 0x3a3f45,
  copierJamLamp: 0xd7263d,
  copierOkLamp: 0x5fbf6a,
  speaker: 0x9aa3a8,
  speakerGrille: 0x4a5258,
  speakerLamp: 0x3a4a66,
  stampRed: 0xd7263d,
  binderBlue: 0x2f4f7f,
  binderRed: 0xb94a3e,
  doorFrame: 0x6b7a66,
  doorGlass: 0xbfe3f5,
  doorHandle: 0xc9ccce,
  signBoard: 0x2f4f7f,
})

// Graphics Studio 카탈로그 id(lib/graphicsStudioConfig.js의 stageObject 항목과 문자열 그대로 일치).
export const STAFFROOM_STUDIO_ITEM_IDS = Object.freeze({
  staffroomDeskIsland: 'stage-object-staffroom-desk-island',
  staffroomViceDesk: 'stage-object-staffroom-vice-desk',
  staffroomCopier: 'stage-object-staffroom-copier',
  staffroomEntranceDoor: 'stage-object-staffroom-entrance-door',
  staffroomSpeaker: 'stage-object-staffroom-speaker',
  staffroomClutter: 'stage-object-staffroom-clutter',
})

// 현관 문짝 열림 각도(rad)와 시간(ms). 스펙 §3-6: 210초에 600ms 동안 바깥으로.
export const STAFFROOM_DOOR_OPEN_ANGLE = 1.35
export const STAFFROOM_DOOR_OPEN_MS = 600
// 스피커 장착 높이(스펙 §3-4 y 2.4).
export const STAFFROOM_SPEAKER_MOUNT_Y = 2.4

function pickVariant(variant, validVariants, fallback) {
  return validVariants.includes(variant) ? variant : fallback
}

function toon(color, emissive = 0.06) {
  return getStagePropDepthWritingToonMaterial(color, emissive)
}

function outlineMaterial() {
  return getStagePropOutlineMaterial(0.96, 0x050209)
}

// 정적 프랍: 첫 커밋 뒤 하위 트리 행렬을 얼린다(매 프레임 compose 생략).
function useFrozenMatrices(ref) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    root.traverse((object) => {
      object.matrixAutoUpdate = false
      object.updateMatrix()
    })
  })
}

function PropBox({ name, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], material, outline = false }) {
  return (
    <group name={name} position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_SHARED_SURFACE_RENDERING} geometry={STAGE_PROP_UNIT_BOX_GEOMETRY} material={material} scale={scale} />
      {outline && (
        <mesh
          {...STAGE_PROP_SHARED_OUTLINE_RENDERING}
          userData={getStagePropOutlineUserData()}
          geometry={STAGE_PROP_UNIT_BOX_GEOMETRY}
          material={outlineMaterial()}
          scale={getPropOutlineScale(scale)}
        />
      )}
    </group>
  )
}

function PropCylinder({ position = [0, 0, 0], rotation = [0, 0, 0], args, material }) {
  return <mesh {...STAGE_PROP_SHARED_SURFACE_RENDERING} geometry={getCachedCylinderGeo(...args)} position={position} rotation={rotation} material={material} />
}

// ── 책상 섬(InstancedMesh) ──────────────────────────────────────────────────

// 섬 한 개의 로컬 박스 파츠. 섬은 X 폭 2.0(책상 2열, 가운데 칸막이), Z 길이 long 3.4(2행) / short 2.2(1행).
// 교사는 섬 바깥쪽(±X)에 앉는다 — 서랍·키보드는 바깥, 모니터는 칸막이 쪽.
export function buildStaffroomDeskIslandParts(variant = 'long') {
  const resolved = pickVariant(variant, STAFFROOM_DESK_ISLAND_VARIANTS, 'long')
  const length = resolved === 'short' ? 2.2 : 3.4
  const rows = resolved === 'short' ? [0] : [-0.85, 0.85]
  const deskDepth = length / rows.length
  const parts = []
  const add = (material, position, size, outline = false) => parts.push({ material, position, size, outline })

  for (const cx of [-0.5, 0.5]) {
    const s = Math.sign(cx)
    for (const cz of rows) {
      const half = deskDepth / 2
      add('wood', [cx, 0.73, cz], [0.96, 0.06, deskDepth - 0.06], true)
      // 칸막이 쪽 가림판 + 서랍 받침(바깥 끝) + 반대쪽 다리
      add('steel', [cx - s * 0.44, 0.35, cz], [0.06, 0.66, deskDepth - 0.14])
      add('steel', [cx, 0.35, cz + half - 0.3], [0.86, 0.68, 0.5], true)
      add('steel', [cx + s * 0.42, 0.35, cz - half + 0.07], [0.05, 0.68, 0.05])
      // 서랍 손잡이(바깥 면)
      add('monitor', [cx + s * 0.435, 0.52, cz + half - 0.3], [0.02, 0.03, 0.22])
      add('monitor', [cx + s * 0.435, 0.26, cz + half - 0.3], [0.02, 0.03, 0.22])
      // 모니터(화면은 바깥 교사 쪽을 본다) + 받침
      add('monitor', [cx - s * 0.3, 0.99, cz - deskDepth * 0.12], [0.05, 0.28, 0.42], true)
      add('monitor', [cx - s * 0.33, 0.82, cz - deskDepth * 0.12], [0.04, 0.12, 0.05])
      add('monitor', [cx - s * 0.31, 0.77, cz - deskDepth * 0.12], [0.14, 0.02, 0.16])
      // 키보드 + 서류 더미
      add('monitor', [cx + s * 0.06, 0.768, cz - deskDepth * 0.12], [0.14, 0.016, 0.36])
      add('paper', [cx + s * 0.16, 0.8, cz + deskDepth * 0.2], [0.3, 0.08, 0.22])
    }
  }
  // 가운데 파란 칸막이(상판 위 0.35).
  add('partition', [0, 0.935, 0], [0.04, 0.35, length - 0.1], true)
  return parts
}

const DESK_ISLAND_MATERIAL_KEYS = Object.freeze(['wood', 'steel', 'partition', 'monitor', 'paper'])
const DESK_ISLAND_MATERIAL_COLORS = Object.freeze({
  wood: STAFFROOM_PALETTE.deskTop,
  steel: STAFFROOM_PALETTE.steel,
  partition: STAFFROOM_PALETTE.partition,
  monitor: STAFFROOM_PALETTE.monitor,
  paper: STAFFROOM_PALETTE.paper,
})

function normalizeTriple(value, fallback) {
  if (Array.isArray(value)) return value
  if (Number.isFinite(value)) return [value, value, value]
  return fallback
}

// 배치 목록 → 재질별 인스턴스 행렬 + 외곽선 인스턴스 행렬. 순수 함수(테스트 대상).
// tuning: Studio 루트 튜닝(위치·회전·스케일). 각 섬 배치 안쪽에 같은 로컬 변형으로 굽는다 —
// KitchenProps처럼 배치마다 StudioTunedGroup을 두는 것과 같은 결과다.
export function buildStaffroomDeskIslandInstances(placements = [], tuning = null) {
  const tuned = tuning ? getStudioTransformProps(tuning) : null
  const tuningMatrix = tuned
    ? new THREE.Matrix4().compose(
      new THREE.Vector3(...tuned.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...tuned.rotation)),
      new THREE.Vector3(...tuned.scale),
    )
    : null
  const surface = Object.fromEntries(DESK_ISLAND_MATERIAL_KEYS.map((key) => [key, []]))
  const outline = []
  const root = new THREE.Matrix4()
  const part = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  const identity = new THREE.Quaternion()
  const euler = new THREE.Euler()
  const position = new THREE.Vector3()
  const scale = new THREE.Vector3()

  for (const placement of placements) {
    const rotation = Array.isArray(placement.rotation) ? placement.rotation : [0, placement.rotation ?? 0, 0]
    const [sx, sy, sz] = normalizeTriple(placement.scale, [1, 1, 1])
    root.compose(
      position.set(...(placement.position ?? [0, 0, 0])),
      quaternion.setFromEuler(euler.set(...rotation)),
      scale.set(sx, sy, sz),
    )
    if (tuningMatrix) root.multiply(tuningMatrix)
    for (const item of buildStaffroomDeskIslandParts(placement.props?.variant ?? placement.variant)) {
      part.compose(position.set(...item.position), identity, scale.set(...item.size))
      surface[item.material].push(root.clone().multiply(part))
      if (item.outline) {
        part.compose(position.set(...item.position), identity, scale.set(...getPropOutlineScale(item.size)))
        outline.push(root.clone().multiply(part))
      }
    }
  }
  return { surface, outline }
}

function InstancedUnitBoxes({ name, matrices, material, rendering, userData }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.matrixAutoUpdate = false
    mesh.updateMatrix()
  }, [matrices])
  // 공유 박스 geometry·캐시 재질은 dispose하지 않는다(dispose={null}). instanceMatrix GPU 버퍼만 해제한다.
  useEffect(() => {
    const mesh = ref.current
    return () => { if (typeof mesh?.dispose === 'function') mesh.dispose() }
  }, [])
  if (matrices.length === 0) return null
  return (
    <instancedMesh
      ref={ref}
      name={name}
      args={[STAGE_PROP_UNIT_BOX_GEOMETRY, material, matrices.length]}
      userData={userData}
      {...rendering}
    />
  )
}

// 게임 런타임에서 Firebase Studio 튜닝을 구독한다(StudioTunedGroup과 같은 소스·이벤트).
function useRuntimeStudioTuning(itemId, enabled) {
  const [tuning, setTuning] = useState(() => (enabled ? loadStudioTunings()[itemId] ?? DEFAULT_STUDIO_TUNING : null))
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined
    const update = () => setTuning(loadStudioTunings()[itemId] ?? DEFAULT_STUDIO_TUNING)
    update()
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
    return () => window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
  }, [itemId, enabled])
  return enabled ? tuning : null
}

// 같은 타입 배치 전부를 한 번에 그린다(StageObjectLayer의 배치 묶음 경로).
// studioTuning=false는 단일 배치(Studio 미리보기) 경로 — 바깥 StudioTunedGroup이 튜닝을 맡는다.
export function StaffroomDeskIslandBatch({ placements = [], studioTuning = true }) {
  const groupRef = useRef(null)
  const tuning = useRuntimeStudioTuning(STAFFROOM_STUDIO_ITEM_IDS.staffroomDeskIsland, studioTuning)
  const instances = useMemo(() => buildStaffroomDeskIslandInstances(placements, tuning), [placements, tuning])
  // 재질 튜닝(색·채도·발광)은 표면 인스턴스에만 적용한다. 외곽선 InstancedMesh는 studioNonTunable —
  // 두께 튜닝이 메시 scale을 곱해 묶음 전체를 월드 원점 기준으로 부풀리기 때문이다.
  useLayoutEffect(() => {
    if (tuning && groupRef.current) applyStudioTuning(groupRef.current, tuning)
  }, [tuning, instances])
  useLayoutEffect(() => {
    const group = groupRef.current
    return () => { if (group) disposeStudioOwnedMaterials(group) }
  }, [])
  return (
    <group ref={groupRef} name="staffroom-desk-islands">
      {DESK_ISLAND_MATERIAL_KEYS.map((key) => (
        <InstancedUnitBoxes
          // 인스턴스 수가 바뀌면 InstancedMesh를 새로 만든다(args 고정 버퍼).
          key={`${key}:${instances.surface[key].length}`}
          name={`staffroom-desk-island-${key}`}
          matrices={instances.surface[key]}
          material={toon(DESK_ISLAND_MATERIAL_COLORS[key], key === 'monitor' ? 0.03 : 0.06)}
          rendering={STAGE_PROP_SHARED_SURFACE_RENDERING}
        />
      ))}
      <InstancedUnitBoxes
        key={`outline:${instances.outline.length}`}
        name="staffroom-desk-island-outline"
        matrices={instances.outline}
        material={outlineMaterial()}
        rendering={STAGE_PROP_SHARED_OUTLINE_RENDERING}
        userData={{ ...getStagePropOutlineUserData(), studioNonTunable: true }}
      />
    </group>
  )
}

// 단일 배치용(스튜디오·테스트). 게임 레이어는 묶음 경로를 쓴다.
export function StaffroomDeskIsland({ variant = 'long', position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const placements = useMemo(
    () => [{ position, rotation, scale, props: { variant } }],
    // 배열 prop은 렌더마다 새로 올 수 있어 값으로 비교한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variant, JSON.stringify(position), JSON.stringify(rotation), JSON.stringify(scale)],
  )
  return (
    <StudioTunedGroup itemId="stage-object-staffroom-desk-island" freezeMatrices>
      <StaffroomDeskIslandBatch placements={placements} studioTuning={false} />
    </StudioTunedGroup>
  )
}

// ── 교감 책상 ──────────────────────────────────────────────────────────────

function useLabelTexture(text, { background, foreground, width = 256, height = 96, font = 'bold 56px sans-serif' }) {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext?.('2d')
    if (!ctx || typeof ctx.fillText !== 'function') return null
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = foreground
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, width / 2, height / 2 + 2)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [text, background, foreground, width, height, font])
  useEffect(() => () => texture?.dispose(), [texture])
  return texture
}

function LabelPlane({ texture, position, size, rotation = [0, 0, 0] }) {
  if (!texture) return null
  return (
    <mesh position={position} rotation={rotation} renderOrder={20}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

export function StaffroomViceDesk(props) {
  const pal = STAFFROOM_PALETTE
  const wood = toon(pal.viceWood, 0.05)
  const woodDark = toon(pal.viceWoodDark, 0.04)
  const steel = toon(pal.steel)
  const dark = toon(pal.monitor, 0.03)
  const paper = toon(pal.paper)
  const nameplateTexture = useLabelTexture('교감', { background: '#f2e6c9', foreground: '#3a2414' })

  return (
    <group {...props}>
      <StudioTunedGroup itemId="stage-object-staffroom-vice-desk" freezeMatrices>
      <group name="staffroom-vice-desk">
        {/* 상판 + 양쪽 서랍장 + 앞 가림판(남쪽 = 플레이어 쪽) */}
        <PropBox name="vice-desk-top" position={[0, 0.77, 0]} scale={[3.2, 0.08, 1.4]} material={wood} outline />
        <PropBox name="vice-desk-pedestal-west" position={[-1.18, 0.36, 0]} scale={[0.78, 0.72, 1.28]} material={woodDark} outline />
        <PropBox name="vice-desk-pedestal-east" position={[1.18, 0.36, 0]} scale={[0.78, 0.72, 1.28]} material={woodDark} outline />
        <PropBox name="vice-desk-modesty" position={[0, 0.42, 0.6]} scale={[1.6, 0.6, 0.06]} material={woodDark} />
        {[-1.18, 1.18].flatMap((x) => [0.56, 0.32].map((y) => (
          <PropBox key={`${x}:${y}`} position={[x, y, 0.645]} scale={[0.36, 0.035, 0.02]} material={dark} />
        )))}
        {/* 명패(남쪽 가장자리) */}
        <PropBox name="vice-desk-nameplate" position={[0, 0.87, 0.5]} rotation={[-0.35, 0, 0]} scale={[0.62, 0.14, 0.06]} material={toon(pal.nameplate, 0.08)} outline />
        <LabelPlane texture={nameplateTexture} position={[0, 0.875, 0.536]} rotation={[-0.35, 0, 0]} size={[0.56, 0.12]} />
        {/* 결재판 더미 + 도장함 + 서류 */}
        <PropBox name="vice-desk-approval-stack" position={[-0.85, 0.88, -0.05]} rotation={[0, 0.12, 0]} scale={[0.46, 0.14, 0.34]} material={toon(pal.binderBlue)} outline />
        <PropBox position={[-0.83, 0.98, -0.04]} rotation={[0, -0.08, 0]} scale={[0.44, 0.06, 0.32]} material={toon(pal.binderRed)} />
        <PropBox position={[-0.86, 1.04, -0.05]} rotation={[0, 0.2, 0]} scale={[0.42, 0.05, 0.3]} material={paper} />
        <PropBox name="vice-desk-stamp-case" position={[0.75, 0.86, -0.1]} scale={[0.26, 0.1, 0.18]} material={toon(pal.stampRed, 0.08)} outline />
        <PropBox position={[0.3, 0.83, 0.05]} rotation={[0, -0.3, 0]} scale={[0.34, 0.03, 0.26]} material={paper} />
        {/* 모니터 */}
        <PropBox name="vice-desk-monitor" position={[0.0, 1.06, -0.42]} scale={[0.62, 0.36, 0.05]} material={dark} outline />
        <PropBox position={[0.0, 0.86, -0.44]} scale={[0.06, 0.16, 0.06]} material={steel} />
        {/* 회전의자(북쪽, 비주얼) */}
        <group name="vice-desk-swivel-chair" position={[0, 0, -1.05]} rotation={[0, 0.25, 0]}>
          <PropBox position={[0, 0.48, 0]} scale={[0.62, 0.1, 0.58]} material={toon(0x2b2f36, 0.04)} outline />
          <PropBox position={[0, 0.86, -0.27]} scale={[0.58, 0.66, 0.1]} material={toon(0x2b2f36, 0.04)} outline />
          <PropCylinder position={[0, 0.24, 0]} args={[0.04, 0.04, 0.42, 6]} material={steel} />
          <PropBox position={[0, 0.04, 0]} scale={[0.56, 0.05, 0.08]} material={steel} />
          <PropBox position={[0, 0.04, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.56, 0.05, 0.08]} material={steel} />
        </group>
      </group>
      </StudioTunedGroup>
    </group>
  )
}

// ── 복사기 ─────────────────────────────────────────────────────────────────

export function StaffroomCopier({ variant = 'normal', ...props }) {
  const resolved = pickVariant(variant, STAFFROOM_COPIER_VARIANTS, 'normal')
  const pal = STAFFROOM_PALETTE
  const body = toon(pal.copierBody, 0.06)
  const top = toon(pal.copierTop, 0.04)
  const paper = toon(pal.paper)
  const lamp = toon(resolved === 'jammed' ? pal.copierJamLamp : pal.copierOkLamp, 0.6)

  return (
    <group {...props}>
      <StudioTunedGroup itemId="stage-object-staffroom-copier" freezeMatrices>
      <group name={`staffroom-copier-${resolved}`}>
        <PropBox name="copier-body" position={[0, 0.45, 0]} scale={[1.16, 0.9, 0.86]} material={body} outline />
        <PropBox name="copier-lid" position={[0, 0.96, -0.02]} scale={[1.12, 0.12, 0.8]} material={top} outline />
        {/* 조작 패널(앞 오른쪽) + 경고등 */}
        <PropBox name="copier-panel" position={[0.34, 0.98, 0.38]} rotation={[-0.4, 0, 0]} scale={[0.4, 0.06, 0.18]} material={top} />
        <PropBox name="copier-lamp" position={[0.48, 1.03, 0.4]} scale={[0.06, 0.04, 0.06]} material={lamp} />
        {/* 용지함 서랍 2단 */}
        <PropBox position={[0, 0.5, 0.435]} scale={[1.0, 0.03, 0.02]} material={top} />
        <PropBox position={[0, 0.26, 0.435]} scale={[1.0, 0.03, 0.02]} material={top} />
        {/* 왼쪽 출력 트레이 + 종이 */}
        <PropBox name="copier-output-tray" position={[-0.7, 0.74, 0]} rotation={[0, 0, 0.12]} scale={[0.28, 0.03, 0.6]} material={top} />
        <PropBox position={[-0.7, 0.77, 0]} rotation={[0, 0, 0.12]} scale={[0.24, 0.03, 0.42]} material={paper} />
        {resolved === 'jammed' && (
          <PropBox name="copier-jammed-sheet" position={[-0.4, 0.96, 0.12]} rotation={[0.2, 0.3, -0.5]} scale={[0.3, 0.01, 0.4]} material={paper} />
        )}
      </group>
      </StudioTunedGroup>
    </group>
  )
}

// ── 중앙 현관 이중문 ────────────────────────────────────────────────────────

// 문 열림 진행도(0 닫힘 → 1 열림)를 dt만큼 STAFFROOM_DOOR_OPEN_MS 속도로 목표에 다가가게 한다.
export function stepStaffroomDoorOpenness(current, open, deltaSec) {
  const target = open ? 1 : 0
  const step = (Math.max(0, deltaSec) * 1000) / STAFFROOM_DOOR_OPEN_MS
  if (current < target) return Math.min(target, current + step)
  if (current > target) return Math.max(target, current - step)
  return current
}

export function StaffroomEntranceDoor(props) {
  const frameRef = useRef(null)
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const opennessRef = useRef(0)
  const open = useGameStore((state) => state.escapePortalActive)
  useFrozenMatrices(frameRef)
  const pal = STAFFROOM_PALETTE
  const frame = toon(pal.doorFrame, 0.05)
  const handle = toon(pal.doorHandle, 0.1)
  const glass = useMemo(() => new THREE.MeshToonMaterial({ color: pal.doorGlass, transparent: true, opacity: 0.55, depthWrite: false }), [pal.doorGlass])
  useEffect(() => () => glass.dispose(), [glass])
  const signTexture = useLabelTexture('중앙 현관', { background: '#2f4f7f', foreground: '#f4f1e8', width: 384, height: 96 })

  useFrame((_, delta) => {
    const next = stepStaffroomDoorOpenness(opennessRef.current, open, delta)
    if (next === opennessRef.current && leftRef.current?.userData.doorApplied) return
    opennessRef.current = next
    const angle = next * STAFFROOM_DOOR_OPEN_ANGLE
    // 왼쪽 문짝은 +θ, 오른쪽은 −θ로 돌아야 둘 다 −Z(바깥)로 열린다.
    // 문짝은 StudioTunedGroup 안의 파츠라 원시 대입하면 Studio 회전 오프셋이 지워진다 — 합성 헬퍼로 얹는다.
    if (leftRef.current) {
      leftRef.current.rotation.y = composeStudioPartRotation(leftRef.current, 'y', 0, angle)
      leftRef.current.userData.doorApplied = true
    }
    if (rightRef.current) rightRef.current.rotation.y = composeStudioPartRotation(rightRef.current, 'y', 0, -angle)
  })

  return (
    <group {...props}>
      <StudioTunedGroup itemId="stage-object-staffroom-entrance-door">
      <group name="staffroom-entrance-door">
        <group ref={frameRef} name="staffroom-entrance-door-frame">
          <PropBox name="door-frame-left" position={[-1.66, 1.15, 0]} scale={[0.12, 2.3, 0.3]} material={frame} outline />
          <PropBox name="door-frame-right" position={[1.66, 1.15, 0]} scale={[0.12, 2.3, 0.3]} material={frame} outline />
          <PropBox name="door-frame-top" position={[0, 2.36, 0]} scale={[3.44, 0.14, 0.3]} material={frame} outline />
          <PropBox name="door-threshold" position={[0, 0.015, 0]} scale={[3.2, 0.03, 0.3]} material={frame} />
          {/* "중앙 현관" 간판 */}
          <PropBox name="door-sign" position={[0, 2.68, 0.06]} scale={[1.6, 0.4, 0.06]} material={toon(pal.signBoard, 0.1)} outline />
          <LabelPlane texture={signTexture} position={[0, 2.68, 0.095]} size={[1.5, 0.36]} />
        </group>
        {/* 문짝: 힌지는 바깥 모서리(x ±1.6). */}
        <group ref={leftRef} name="door-leaf-left" position={[-1.6, 0, 0]}>
          <PropBox position={[0.8, 1.13, 0]} scale={[1.56, 2.2, 0.06]} material={glass} />
          <PropBox position={[0.8, 2.2, 0]} scale={[1.56, 0.08, 0.08]} material={frame} outline />
          <PropBox position={[0.8, 0.06, 0]} scale={[1.56, 0.12, 0.08]} material={frame} outline />
          <PropBox position={[1.5, 1.1, 0.06]} scale={[0.04, 0.5, 0.04]} material={handle} />
        </group>
        <group ref={rightRef} name="door-leaf-right" position={[1.6, 0, 0]}>
          <PropBox position={[-0.8, 1.13, 0]} scale={[1.56, 2.2, 0.06]} material={glass} />
          <PropBox position={[-0.8, 2.2, 0]} scale={[1.56, 0.08, 0.08]} material={frame} outline />
          <PropBox position={[-0.8, 0.06, 0]} scale={[1.56, 0.12, 0.08]} material={frame} outline />
          <PropBox position={[-1.5, 1.1, 0.06]} scale={[0.04, 0.5, 0.04]} material={handle} />
        </group>
      </group>
      </StudioTunedGroup>
    </group>
  )
}

// ── 교내 방송 스피커 ────────────────────────────────────────────────────────

// mount 'wall'(북벽) | 'stand'(남쪽 — 남벽은 카메라를 가리지 않게 낮아서 기둥 위에 올린다).
export function StaffroomSpeaker({ lane = 'L1', mount = 'wall', ...props }) {
  const pal = STAFFROOM_PALETTE
  const grille = toon(pal.speakerGrille, 0.03)
  return (
    <group {...props}>
      <StudioTunedGroup itemId="stage-object-staffroom-speaker" freezeMatrices>
      {mount === 'stand' && (
        <group name={`staffroom-speaker-stand-${lane}`}>
          <PropCylinder position={[0, (STAFFROOM_SPEAKER_MOUNT_Y - 0.2) / 2, 0]} args={[0.03, 0.03, STAFFROOM_SPEAKER_MOUNT_Y - 0.2, 6]} material={toon(pal.steel)} />
          <PropBox position={[0, 0.02, 0]} scale={[0.36, 0.04, 0.36]} material={toon(pal.speakerGrille, 0.03)} />
        </group>
      )}
      <group name={`staffroom-speaker-${lane}`} position={[0, STAFFROOM_SPEAKER_MOUNT_Y, 0]} rotation={[-0.32, 0, 0]}>
        <PropBox name="speaker-box" position={[0, 0, 0.1]} scale={[0.56, 0.36, 0.2]} material={toon(pal.speaker)} outline />
        {[-0.09, -0.03, 0.03, 0.09].map((y) => (
          <PropBox key={y} position={[0, y, 0.205]} scale={[0.44, 0.022, 0.012]} material={grille} />
        ))}
        {/* 호출 레인 점멸 램프 — wave 2 바닥 표시가 userData로 찾아 칠한다. */}
        <mesh
          {...STAGE_PROP_SHARED_SURFACE_RENDERING}
          name={`stage5-speaker-lamp-${lane}`}
          userData={{ stage5CallLaneLamp: lane }}
          geometry={STAGE_PROP_UNIT_BOX_GEOMETRY}
          material={toon(pal.speakerLamp, 0.2)}
          position={[0.22, 0.13, 0.205]}
          scale={[0.06, 0.06, 0.014]}
        />
      </group>
      </StudioTunedGroup>
    </group>
  )
}

// ── 바닥 서류·바인더(통과형) ─────────────────────────────────────────────────

export function StaffroomClutter({ variant = 'papers', ...props }) {
  const resolved = pickVariant(variant, STAFFROOM_CLUTTER_VARIANTS, 'papers')
  const pal = STAFFROOM_PALETTE
  const paper = toon(pal.paper)
  const red = toon(pal.stampRed, 0.1)
  return (
    <group {...props}>
      <StudioTunedGroup itemId="stage-object-staffroom-clutter" freezeMatrices>
      <group name={`staffroom-clutter-${resolved}`}>
        {resolved === 'papers' ? (
          <>
            <PropBox position={[-0.22, 0.008, 0.05]} rotation={[0, 0.4, 0]} scale={[0.3, 0.012, 0.4]} material={paper} />
            <PropBox position={[0.12, 0.012, -0.1]} rotation={[0, -0.25, 0]} scale={[0.3, 0.012, 0.4]} material={paper} />
            <PropBox position={[0.3, 0.008, 0.22]} rotation={[0, 0.9, 0]} scale={[0.3, 0.012, 0.4]} material={paper} />
            <PropBox position={[-0.02, 0.02, 0.18]} rotation={[0, 0.1, 0]} scale={[0.32, 0.02, 0.42]} material={toon(pal.binderBlue)} />
            {/* 결재 도장 자국 */}
            <PropBox position={[0.14, 0.02, -0.04]} rotation={[0, -0.25, 0]} scale={[0.07, 0.004, 0.07]} material={red} />
          </>
        ) : (
          <>
            <PropBox position={[-0.25, 0.07, 0]} rotation={[0, 0.2, 0]} scale={[0.36, 0.14, 0.46]} material={toon(pal.binderBlue)} />
            <PropBox position={[0.14, 0.04, 0.1]} rotation={[0, -0.6, Math.PI / 2 - 0.1]} scale={[0.08, 0.36, 0.46]} material={toon(pal.binderRed)} />
            <PropBox position={[0.36, 0.025, -0.2]} rotation={[0, 0.7, 0]} scale={[0.32, 0.05, 0.42]} material={toon(0x3c7a4a)} />
            <PropBox position={[-0.05, 0.01, -0.3]} rotation={[0, -0.3, 0]} scale={[0.3, 0.012, 0.4]} material={paper} />
          </>
        )}
      </group>
      </StudioTunedGroup>
    </group>
  )
}
