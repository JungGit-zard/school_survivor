// 블록 좀비 18종(E71~E88, typeCode 76~93) 몸통 렌더 레이어. 2026-11-14.
//
// Kenney "Blocky Characters 2.0"(CC0) 18명은 지오메트리(6파트 강체 박스 143정점/72삼각형)가 전부 같고 텍스처만 다르다.
// 그래서 파트 6개 × (툰 몸통 + 외곽선) = InstancedMesh 12개, 텍스처는 아틀라스 PNG 1장(1176×588, 칸 192px,
// 최근접 필터 — 픽셀 얼굴이 뭉개지지 않게)이고, 인스턴스마다 아틀라스 칸 오프셋(aAtlas)만 다르다. 동시 200기여도 드로콜 12개다.
//
// 분업(E07 웃는얼굴 좀비와 같다):
//  - 시뮬레이션(이동·예고·공격·HP·사망): enemyPool + enemySimulation + projectileZombieBehavior(행동표 76~93)
//  - 그림자 / 미니 체력바 / 스폰 "펑" 연기: ZombieInstanceLayer(블록 타입은 파트 0개로 그린다)
//  - 몸통: 이 레이어. 포즈는 lib/blockyZombiePose.js(게임 고유 절차적 포즈 — GLB 클립을 쓰지 않는다)
//  - 사망: EnemyDeathCollapse(ZOMBIE_PALETTE의 블록 대표색)
//
// 툰 규칙(Graphic_designer 정책): MeshToonMaterial(같은 5단 그라디언트) + 스텐실 뒷면 외곽선(#050209, .96)을
// ZombieInstanceLayer와 똑같이 쓴다. Studio 아이템은 투사체 좀비 E46~E70처럼 아직 없다(튜닝 대상 아님).
// 좀비 처리(채도 −30%·병색 틴트·살색 → 회녹색)는 아틀라스를 구울 때 들어갔다(scripts/build_kenney_blocky_zombies.mjs).
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import atlasUrl from '../assets/models/kenney_blocky/kenney_blocky_zombie_atlas.png'
import { enemyPool, playerPos, screenBounds } from '../lib/refs.js'
import { getToonGradient } from '../lib/toon.js'
import { KENNEY_BLOCKY_ATLAS, KENNEY_BLOCKY_PARTS } from '../lib/kenneyBlockyGeometry.js'
import { BLOCKY_ZOMBIE_TYPES, BLOCKY_ZOMBIE_VISUALS, blockyZombieAtlasCell, blockyZombieIndex } from '../lib/blockyZombieRoster.js'
import { createBlockyPose, fillBlockyZombiePose } from '../lib/blockyZombiePose.js'
import { phase as pooledPhase } from './ZombieInstanceLayer.jsx'
import { ENEMY_RENDER_CULLED, POOLED_ENEMY_CAPACITY, SPAWN_REVEAL_MS, getPooledEnemyAnimationTime, getPooledEnemyRenderTier } from './PooledEnemyVisuals.js'

const OUTLINE = 1
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
// Kenney 모델(키 2.7, 발바닥 y 0)을 공용 박스 좀비 로컬 높이(발 −0.63 ~ 머리 1.06, 키 1.69)에 맞춘다.
// 어깨 폭도 같아진다(Kenney 팔 바깥 ±0.8 × 0.626 = ±0.5 = 공용 팔 바깥).
export const BLOCKY_MODEL_FIT = 1.69 / 2.7
export const BLOCKY_MODEL_FOOT_Y = -0.63
// 몸통을 숙일 때 피벗을 몸통 노드 원점(y 0.7)이 아니라 엉덩이(y 1.0)에 둔다.
const TORSO_LEAN_PIVOT_Y = 0.3
// 외곽선 두께(Kenney 단위). 몸통·머리는 두껍게, 팔다리는 얇게.
const OUTLINE_THICKNESS = Object.freeze({ legL: 0.04, legR: 0.04, torso: 0.06, armL: 0.04, armR: 0.04, head: 0.06 })
const FLASH_GAIN = 2.6
const LIMIT = POOLED_ENEMY_CAPACITY

// 타입별 상수(1-based 블록 인덱스 → 값). 프레임 루프에서 문자열 조회를 하지 않는다.
const STYLE_BY_INDEX = [''].concat(BLOCKY_ZOMBIE_TYPES.map((type) => BLOCKY_ZOMBIE_VISUALS[type].style))
const FAST_BY_INDEX = [false].concat(BLOCKY_ZOMBIE_TYPES.map((type) => BLOCKY_ZOMBIE_VISUALS[type].role === 'fast'))
const ATLAS_OFFSET_BY_INDEX = [[0, 0]].concat(BLOCKY_ZOMBIE_TYPES.map((type) => blockyAtlasOffset(blockyZombieAtlasCell(type))))

export function blockyAtlasOffset(cell) {
  const { cols, cell: size, gutter, width, height } = KENNEY_BLOCKY_ATLAS
  const stride = size + gutter * 2
  return [((cell % cols) * stride) / width, (Math.floor(cell / cols) * stride) / height]
}

// 칸 0 기준 아틀라스 UV. 인스턴스 오프셋(aAtlas)을 셰이더가 더한다.
export function blockyAtlasUv(u, v) {
  const { cell: size, gutter, width, height } = KENNEY_BLOCKY_ATLAS
  return [(gutter + u * size) / width, (gutter + v * size) / height]
}

function buildPartGeometry(part, outlineThickness = 0) {
  const geometry = new THREE.BufferGeometry()
  const position = Float32Array.from(part.position)
  if (outlineThickness > 0) {
    // 박스 중심 기준으로 축마다 같은 두께만큼 부풀린다(파트 원점이 피벗이라 행렬 스케일로는 어긋난다).
    const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < position.length; i += 1) { const a = i % 3; min[a] = Math.min(min[a], position[i]); max[a] = Math.max(max[a], position[i]) }
    for (let i = 0; i < position.length; i += 1) {
      const a = i % 3; const center = (min[a] + max[a]) / 2; const half = Math.max(1e-4, (max[a] - min[a]) / 2)
      position[i] = center + (position[i] - center) * (1 + outlineThickness / half)
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(part.normal), 3))
  const uv = new Float32Array(part.uv.length)
  for (let i = 0; i < part.uv.length; i += 2) { const [u, v] = blockyAtlasUv(part.uv[i], part.uv[i + 1]); uv[i] = u; uv[i + 1] = v }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geometry.setIndex(part.index)
  if (outlineThickness > 0) return geometry
  // Kenney GLB의 법선은 모서리에서 평균된(둥근) 법선이다(원본은 무광 unlit). 툰 셰이딩이 면마다 한 단으로 끊기게
  // 삼각형을 풀어 면 법선으로 다시 계산한다(72삼각형 → 216정점, 블록 느낌 유지).
  const flat = geometry.toNonIndexed()
  geometry.dispose()
  flat.computeVertexNormals()
  return flat
}

function makeBodyMaterial(atlas) {
  const material = new THREE.MeshToonMaterial({ color: 0xffffff, map: atlas, emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: 0.16, gradientMap: getToonGradient() })
  material.stencilWrite = true; material.stencilRef = OUTLINE; material.stencilFunc = THREE.AlwaysStencilFunc; material.stencilZPass = THREE.ReplaceStencilOp
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute vec2 aAtlas;\n${shader.vertexShader}`.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv += aAtlas;\n#endif\n#ifdef USE_EMISSIVEMAP\nvEmissiveMapUv += aAtlas;\n#endif')
  }
  material.customProgramCacheKey = () => 'blocky-zombie-atlas-v1'
  return material
}

function makeOutlineMaterial() {
  const material = new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: 0.96, depthWrite: false })
  material.stencilWrite = true; material.stencilRef = OUTLINE; material.stencilFunc = THREE.NotEqualStencilFunc
  return material
}

// 컴파일 프리웜(compileAsync는 traverseVisible만 돈다)을 위해 visible은 늘 true, count만 0으로 둔다.
function instanced(geometry, material) {
  const mesh = new THREE.InstancedMesh(geometry, material, LIMIT)
  mesh.frustumCulled = false
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  for (let i = 0; i < LIMIT; i += 1) mesh.setMatrixAt(i, ZERO)
  mesh.count = 0
  mesh.visible = true
  return mesh
}

const PARENT_TORSO = KENNEY_BLOCKY_PARTS.map((part) => part.parent === 'torso')
const TORSO_INDEX = KENNEY_BLOCKY_PARTS.findIndex((part) => part.key === 'torso')
const POSE_OFFSET = Object.freeze({ legL: 0, legR: 3, torso: 6, armL: 9, armR: 12, head: 15 })

const base = new THREE.Matrix4(); const fit = new THREE.Matrix4(); const torsoMat = new THREE.Matrix4(); const partMat = new THREE.Matrix4()
const tmp = new THREE.Matrix4(); const rot = new THREE.Matrix4(); const euler = new THREE.Euler(0, 0, 0, 'XYZ')
const pos = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scl = new THREE.Vector3(); const color = new THREE.Color()
fit.makeTranslation(0, BLOCKY_MODEL_FOOT_Y, 0).multiply(new THREE.Matrix4().makeScale(BLOCKY_MODEL_FIT, BLOCKY_MODEL_FIT, BLOCKY_MODEL_FIT))

// 파트 하나의 로컬 행렬: 부모 행렬 × T(피벗) × R(포즈). 몸통은 엉덩이 높이에서 숙인다.
function composePart(out, parent, part, pose, offset) {
  euler.set(pose[offset], pose[offset + 1], pose[offset + 2])
  rot.makeRotationFromEuler(euler)
  out.copy(parent).multiply(tmp.makeTranslation(part.pivot[0], part.pivot[1], part.pivot[2]))
  if (part.key === 'torso') out.multiply(tmp.makeTranslation(0, TORSO_LEAN_PIVOT_Y, 0)).multiply(rot).multiply(tmp.makeTranslation(0, -TORSO_LEAN_PIVOT_Y, 0))
  else out.multiply(rot)
  return out
}

export default function BlockyZombieLayer({ resetKey }) {
  const atlas = useLoader(THREE.TextureLoader, atlasUrl)
  const tiers = useRef(new Uint8Array(LIMIT))
  const pose = useRef(createBlockyPose())
  const all = useMemo(() => {
    atlas.colorSpace = THREE.SRGBColorSpace
    atlas.flipY = false
    atlas.magFilter = THREE.NearestFilter
    atlas.minFilter = THREE.NearestFilter
    atlas.generateMipmaps = false
    atlas.needsUpdate = true
    const bodyMaterial = makeBodyMaterial(atlas)
    const outlineMaterial = makeOutlineMaterial()
    const body = KENNEY_BLOCKY_PARTS.map((part) => {
      const geometry = buildPartGeometry(part)
      const atlasAttr = new THREE.InstancedBufferAttribute(new Float32Array(LIMIT * 2), 2)
      atlasAttr.setUsage(THREE.DynamicDrawUsage)
      geometry.setAttribute('aAtlas', atlasAttr)
      const mesh = instanced(geometry, bodyMaterial)
      mesh.setColorAt(0, color.setRGB(1, 1, 1))
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
      mesh.userData.atlas = atlasAttr
      return mesh
    })
    const outline = KENNEY_BLOCKY_PARTS.map((part) => instanced(buildPartGeometry(part, OUTLINE_THICKNESS[part.key]), outlineMaterial))
    return { body, outline, bodyMaterial, outlineMaterial }
  }, [atlas])
  useEffect(() => () => {
    for (const mesh of all.body) mesh.geometry.dispose()
    for (const mesh of all.outline) mesh.geometry.dispose()
    all.bodyMaterial.dispose(); all.outlineMaterial.dispose()
  }, [all])
  useLayoutEffect(() => {
    // 판 재시작: 이전 판 행렬을 한 프레임도 보이지 않게 비운다(버퍼는 그대로 쓴다).
    for (const mesh of [...all.body, ...all.outline]) { mesh.count = 0; mesh.instanceMatrix.needsUpdate = true }
    tiers.current.fill(0)
  }, [all, resetKey])

  useFrame(() => {
    const pool = enemyPool
    let count = 0
    if (pool) {
      const max = Math.min(LIMIT - 1, Number.isInteger(pool.highestActive) ? pool.highestActive : LIMIT - 1)
      const out = pose.current
      for (let i = 0; i <= max && count < LIMIT; i += 1) {
        if (pool.active[i] !== 1) { tiers.current[i] = 0; continue }
        const index = blockyZombieIndex(pool.type[i])
        if (!index) continue
        const tier = getPooledEnemyRenderTier(screenBounds, pool.posX[i], pool.posZ[i], playerPos.x, playerPos.z, tiers.current[i])
        tiers.current[i] = tier
        const timer = pool.spawnTimer[i]
        if (tier === ENEMY_RENDER_CULLED || timer < SPAWN_REVEAL_MS) continue
        const slot = count++
        const time = getPooledEnemyAnimationTime(timer, tier)
        fillBlockyZombiePose(out, STYLE_BY_INDEX[index], pooledPhase(pool, i), time, FAST_BY_INDEX[index], (i * 0.6180339887) % 1)
        const scale = (pool.visualScale[i] || 1) * 0.333
        pos.set(pool.posX[i], pool.posY[i] + out[19] * scale, pool.posZ[i])
        euler.set(0, pool.yaw[i], 0); quat.setFromEuler(euler); scl.set(scale, scale, scale)
        base.compose(pos, quat, scl)
        if (out[18]) base.multiply(rot.makeRotationZ(out[18]))
        base.multiply(fit)
        composePart(torsoMat, base, KENNEY_BLOCKY_PARTS[TORSO_INDEX], out, POSE_OFFSET.torso)
        const flashing = pool.hitFlashTimer[i] > 0
        const [ox, oz] = ATLAS_OFFSET_BY_INDEX[index]
        for (let k = 0; k < KENNEY_BLOCKY_PARTS.length; k += 1) {
          const part = KENNEY_BLOCKY_PARTS[k]
          if (k === TORSO_INDEX) partMat.copy(torsoMat)
          else composePart(partMat, PARENT_TORSO[k] ? torsoMat : base, part, out, POSE_OFFSET[part.key])
          all.body[k].setMatrixAt(slot, partMat)
          all.outline[k].setMatrixAt(slot, partMat)
          all.body[k].setColorAt(slot, flashing ? color.setRGB(FLASH_GAIN, FLASH_GAIN, FLASH_GAIN) : color.setRGB(1, 1, 1))
          const atlasAttr = all.body[k].userData.atlas.array
          atlasAttr[slot * 2] = ox; atlasAttr[slot * 2 + 1] = oz
        }
      }
    }
    for (let k = 0; k < all.body.length; k += 1) {
      const bodyMesh = all.body[k]; const outlineMesh = all.outline[k]
      bodyMesh.count = count; outlineMesh.count = count
      if (count > 0) {
        bodyMesh.instanceMatrix.clearUpdateRanges(); bodyMesh.instanceMatrix.addUpdateRange(0, count * 16); bodyMesh.instanceMatrix.needsUpdate = true
        bodyMesh.instanceColor.clearUpdateRanges(); bodyMesh.instanceColor.addUpdateRange(0, count * 3); bodyMesh.instanceColor.needsUpdate = true
        const atlasAttr = bodyMesh.userData.atlas; atlasAttr.clearUpdateRanges(); atlasAttr.addUpdateRange(0, count * 2); atlasAttr.needsUpdate = true
        outlineMesh.instanceMatrix.clearUpdateRanges(); outlineMesh.instanceMatrix.addUpdateRange(0, count * 16); outlineMesh.instanceMatrix.needsUpdate = true
      }
    }
  })

  return (
    <>
      {all.body.map((mesh, k) => <primitive key={`bb${k}`} object={mesh} renderOrder={2} />)}
      {all.outline.map((mesh, k) => <primitive key={`bo${k}`} object={mesh} renderOrder={1} />)}
    </>
  )
}
