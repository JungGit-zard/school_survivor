import { useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import stage1TileUrl from '../assets/background_floor/tile_stage01.webp'
import stage2TileUrl from '../assets/background_floor/tile_stage02_corridor.webp'
import stage2EndWallUrl from '../assets/background_floor/stage02_corridor_end_wall.webp'
import stage4TileUrl from '../assets/background_floor/tile_stage04_cafeteria.webp'
import { getStage2CorridorWallDisplay } from '../lib/stage2CorridorWall.js'
import { getStageBounds } from '../lib/stageConfig.js'
import Stage2CorridorDecor from './Stage2CorridorDecor.jsx'

const FLOOR_SIZE = 200
const STAGE1_TILE_WORLD_SIZE = 6.9
const STAGE2_TILE_WORLD_SIZE = 30
const STAGE2_TILE_DENSITY_MULTIPLIER = 10
// 급식실 타일 이미지는 체커 8칸이 한 장이다. 원화(st4_concept.png) 기준 한 칸이
// 약 2.06 유닛이라 한 장 = 16.5 유닛. stage1 값(6.9)을 쓰면 한 칸 0.86 유닛이 되어
// 주방 바닥이 아니라 욕실 모자이크로 읽힌다.
const STAGE4_TILE_WORLD_SIZE = 16.5
const STAGE1_BOUNDS = getStageBounds('stage1')
export const STAGE1_FLOOR_WIDTH = STAGE1_BOUNDS.halfX * 2
export const STAGE1_FLOOR_DEPTH = STAGE1_BOUNDS.halfZ * 2

export const FLOOR_TILE = {
  src: stage1TileUrl,
  // Stage 1 is the actual 5 × 7.2 block (20 × 28.8 unit) classroom.  Keep
  // the existing ~6.9-unit tile density independently on each rectangle axis.
  repeatX: STAGE1_FLOOR_WIDTH / STAGE1_TILE_WORLD_SIZE,
  repeatZ: STAGE1_FLOOR_DEPTH / STAGE1_TILE_WORLD_SIZE,
  floorWidth: STAGE1_FLOOR_WIDTH,
  floorDepth: STAGE1_FLOOR_DEPTH,
}

export const STAGE_FLOOR_TILES = {
  stage1: FLOOR_TILE,
  stage2: {
    src: stage2TileUrl,
    repeat: Math.round(FLOOR_SIZE / STAGE2_TILE_WORLD_SIZE) * STAGE2_TILE_DENSITY_MULTIPLIER,
    floorSize: FLOOR_SIZE,
  },
  stage4: {
    src: stage4TileUrl,
    repeat: Math.round(FLOOR_SIZE / STAGE4_TILE_WORLD_SIZE),
    floorSize: FLOOR_SIZE,
  },
}

export const STAGE2_CORRIDOR_END = {
  src: stage2EndWallUrl,
  ...getStage2CorridorWallDisplay(),
}

export const STAGE2_CORRIDOR_LANES = {
  laneCount: 3,
  laneWidth: 6,
  safeLaneColor: '#4e725f',
}

// Stage 3 = 개방형 아레나(체육관 나무마루 코트). 절차적 텍스처/라인이라
// 별도 바이너리 에셋 의존이 없다. 코트 라인은 맵 경계(getStageBounds)에 맞춰 그린다.
export const STAGE3_ARENA = {
  // 나무마루 텍스처 반복 수. FLOOR_SIZE(200) / repeat 로 판자 한 폭의 월드 크기가 정해진다.
  woodRepeat: 25, // 200 / 25 = 8 world units per canvas tile (판자 약 2유닛)
  woodBase: '#c79a5b',
  woodLight: '#d4a866',
  woodDark: '#b6873f',
  courtLineColor: '#f4f1e8',
  keyPaintColor: '#c1533b', // 센터/키 페인트 (코트 대비색)
  wallColor: '#e3e7ee',
  wallStripeColor: '#3b6ea5',
  wallHeight: 2.6,
  wallThickness: 0.4,
  wallStripeHeight: 0.55,
}

// 체육관 나무마루 캔버스 텍스처를 절차적으로 생성한다(바이너리 에셋 불필요).
function buildStage3WoodTexture() {
  if (typeof document === 'undefined') return null
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = STAGE3_ARENA.woodBase
  ctx.fillRect(0, 0, size, size)

  // 세로 판자: 4장을 한 타일에 담아 반복. 판자마다 밝기 교차 + 나뭇결 스트리크.
  const planks = 4
  const plankW = size / planks
  for (let i = 0; i < planks; i += 1) {
    const x = i * plankW
    ctx.fillStyle = i % 2 === 0 ? STAGE3_ARENA.woodLight : STAGE3_ARENA.woodDark
    ctx.globalAlpha = 0.35
    ctx.fillRect(x, 0, plankW, size)
    ctx.globalAlpha = 1

    // 판자 경계 이음선
    ctx.strokeStyle = 'rgba(90, 60, 25, 0.55)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)
    ctx.stroke()

    // 나뭇결 스트리크
    ctx.strokeStyle = 'rgba(120, 82, 40, 0.18)'
    ctx.lineWidth = 1
    for (let g = 0; g < 5; g += 1) {
      const gx = x + plankW * (0.15 + 0.7 * ((g * 37) % 100) / 100)
      ctx.beginPath()
      ctx.moveTo(gx, 0)
      ctx.bezierCurveTo(gx + 4, size * 0.33, gx - 4, size * 0.66, gx + 2, size)
      ctx.stroke()
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(STAGE3_ARENA.woodRepeat, STAGE3_ARENA.woodRepeat)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function buildRepeatingTexture(tile) {
  const tex = tile
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(tile.userData.floorRepeatX, tile.userData.floorRepeatZ)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

function buildEndWallTexture(config) {
  const tex = config
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function TexturedFloor({ floorTile }) {
  const texture = useLoader(THREE.TextureLoader, floorTile.src)
  // The R3F loader cache owns the image/texture.  Repeating parameters are
  // stage-specific and are set once when the stage floor mounts.
  texture.userData.floorRepeatX = floorTile.repeatX ?? floorTile.repeat
  texture.userData.floorRepeatZ = floorTile.repeatZ ?? floorTile.repeat
  const floorTex = useMemo(() => buildRepeatingTexture(texture), [texture])
  const floorMat = useMemo(() => new THREE.MeshLambertMaterial({ map: floorTex }), [floorTex])
  useEffect(() => () => floorMat.dispose(), [floorMat])

  return (
    <FloorPlane
      material={floorMat}
      width={floorTile.floorWidth ?? floorTile.floorSize}
      depth={floorTile.floorDepth ?? floorTile.floorSize}
    />
  )
}

function Stage2EndWall() {
  const texture = useLoader(THREE.TextureLoader, STAGE2_CORRIDOR_END.src)
  const endWallTex = useMemo(() => buildEndWallTexture(texture), [texture])
  const endWallMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: endWallTex, side: THREE.DoubleSide, transparent: true, depthWrite: false }),
    [endWallTex],
  )
  useEffect(() => () => endWallMat.dispose(), [endWallMat])

  return (
    <group position={[0, 0.012, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[26, FLOOR_SIZE]} />
        <meshBasicMaterial color={0x2f3942} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[5.2, FLOOR_SIZE]} />
        <meshBasicMaterial color={0x4e725f} transparent opacity={0.07} depthWrite={false} />
      </mesh>
      {Array.from({ length: STAGE2_CORRIDOR_END.repeatX }, (_, i) => {
        const centerOffset = i - (STAGE2_CORRIDOR_END.repeatX - 1) / 2
        return (
          <mesh
            key={i}
            position={[centerOffset * STAGE2_CORRIDOR_END.displayWidth, 0.018, STAGE2_CORRIDOR_END.positionZ]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={3}
            material={endWallMat}
          >
            <planeGeometry args={[STAGE2_CORRIDOR_END.displayWidth, STAGE2_CORRIDOR_END.displayHeight]} />
          </mesh>
        )
      })}
    </group>
  )
}

function FloorPlane({ material, width = FLOOR_SIZE, depth = FLOOR_SIZE }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={0}>
      <planeGeometry args={[width, depth]} />
      <primitive object={material} />
    </mesh>
  )
}

export default function ClassroomFloor({ stageId = 'stage1' }) {
  // STAGE_FLOOR_TILES 값은 모듈 수준 상수 객체다 — stageId로 키를 선택해야
  // 실제 의존이 stageId에 걸리게 된다. floorTile을 dep으로 쓰면 항상 같은
  // 참조라 memo가 재실행되지 않아 stageId 전환 시 텍스처가 갱신되지 않는다.
  const floorTile = STAGE_FLOOR_TILES[stageId] ?? STAGE_FLOOR_TILES.stage1
  const stage3Texture = useMemo(() => (stageId === 'stage3' ? buildStage3WoodTexture() : null), [stageId])
  const stage3Material = useMemo(
    () => (stage3Texture ? new THREE.MeshLambertMaterial({ map: stage3Texture }) : null),
    [stage3Texture],
  )
  useEffect(() => () => {
    // Stage 3 owns this procedural CanvasTexture.  Do not dispose R3F loader
    // cache textures used by stages 1/2 or the Stage 2 end-wall.
    stage3Material?.dispose()
    stage3Texture?.dispose()
  }, [stage3Material, stage3Texture])

  return (
    <group>
      {stageId === 'stage3'
        ? <FloorPlane material={stage3Material} />
        : <TexturedFloor floorTile={floorTile} />}

      {stageId === 'stage2' && (
        <Stage2EndWall />
      )}

      {stageId === 'stage2' && <Stage2CorridorDecor />}

      {stageId === 'stage3' && <Stage3Arena stageId={stageId} />}
    </group>
  )
}

// 개방형 아레나(체육관 코트) — 코트 라인 + 사방 경계 벽.
// 맵 경계(getStageBounds)에 라인/벽을 정렬해 "사방 포위"가 성립하는 개방 정사각 공간.
function Stage3Arena({ stageId = 'stage3' }) {
  const { halfX, halfZ } = getStageBounds(stageId)
  const A = STAGE3_ARENA
  // 코트 라인/페인트는 반드시 "바닥에 그려진" 것으로 보여야 한다(정본: 사용자 지시 2026-07-13).
  // 이전 transparent+depthWrite:false+renderOrder 조합은 투명 패스에서 캐릭터 위에 덮여
  // 라인이 허리높이에 떠 보였다. 불투명+깊이기록으로 캐릭터가 라인을 정상 가리게 하고,
  // polygonOffset으로 바닥면과의 z-파이팅만 방지한다.
  const lineMat = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: A.courtLineColor,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }),
    [],
  )
  const paintMat = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: A.keyPaintColor, transparent: true, opacity: 0.22,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }),
    [],
  )
  const wallMat = useMemo(() => new THREE.MeshLambertMaterial({ color: A.wallColor }), [])
  const stripeMat = useMemo(() => new THREE.MeshLambertMaterial({ color: A.wallStripeColor }), [])

  const lineW = 0.28 // 코트 라인 폭
  const circleR = Math.min(halfX, halfZ) * 0.3

  // 코트 라인: 경계 사각형(4변) + 센터 라인(z=0, X축) + 센터 서클.
  const lineStrips = [
    // 경계 상/하 (z = ±halfZ), X 폭 전체
    { pos: [0, 0.02, halfZ], size: [halfX * 2, lineW] },
    { pos: [0, 0.02, -halfZ], size: [halfX * 2, lineW] },
    // 경계 좌/우 (x = ±halfX), Z 깊이 전체
    { pos: [halfX, 0.02, 0], size: [lineW, halfZ * 2] },
    { pos: [-halfX, 0.02, 0], size: [lineW, halfZ * 2] },
    // 센터 라인
    { pos: [0, 0.02, 0], size: [halfX * 2, lineW] },
  ]

  const walls = [
    // 앞/뒤 벽 (z = ±halfZ)
    { pos: [0, A.wallHeight / 2, halfZ], size: [halfX * 2 + A.wallThickness, A.wallHeight, A.wallThickness] },
    { pos: [0, A.wallHeight / 2, -halfZ], size: [halfX * 2 + A.wallThickness, A.wallHeight, A.wallThickness] },
    // 좌/우 벽 (x = ±halfX)
    { pos: [halfX, A.wallHeight / 2, 0], size: [A.wallThickness, A.wallHeight, halfZ * 2 + A.wallThickness] },
    { pos: [-halfX, A.wallHeight / 2, 0], size: [A.wallThickness, A.wallHeight, halfZ * 2 + A.wallThickness] },
  ]

  return (
    <group>
      {/* 센터 서클 페인트(채움) — 코트 대비색 */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} material={paintMat}>
        <circleGeometry args={[circleR, 48]} />
      </mesh>
      {/* 센터 서클 라인(링) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} material={lineMat}>
        <ringGeometry args={[circleR - lineW / 2, circleR + lineW / 2, 48]} />
      </mesh>
      {/* 코트 라인 스트립 */}
      {lineStrips.map(({ pos, size }, i) => (
        <mesh key={i} position={pos} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} material={lineMat}>
          <planeGeometry args={size} />
        </mesh>
      ))}
      {/* 사방 경계 벽 + 하단 스포츠 스트라이프 */}
      {walls.map(({ pos, size }, i) => (
        <group key={i}>
          <mesh position={pos} material={wallMat} castShadow receiveShadow>
            <boxGeometry args={size} />
          </mesh>
          <mesh
            position={[pos[0], A.wallStripeHeight / 2, pos[2]]}
            material={stripeMat}
          >
            <boxGeometry args={[size[0] + 0.02, A.wallStripeHeight, size[2] + 0.02]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
