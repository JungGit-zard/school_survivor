// 2차 신규 좀비 18종(E89~E106, typeCode 94~111) 몸통 렌더 레이어 — Kenney "Mini Characters 2.0"(CC0). 2026-11-15, threemini.
//
// BlockyZombieLayer와 같은 방식이다: 몸 1벌 = 강체 파트 6개, 파트마다 InstancedMesh 2개(툰 몸통 + 스텐실 뒷면 외곽선),
// 포즈는 절차적(lib/miniZombiePose.js — 블록 좀비 포즈 문법 위에 종별 예고·공격·회복만 덮어쓴다). SkinnedMesh·클립 믹서 없음.
// 블록 좀비와 다른 점: Kenney Mini 캐릭터는 몸마다 지오메트리가 달라서 변형(몸 + 리컬러 + 소품)마다 메시 세트가 따로다.
// 그래서 세트는 그 변형의 개체가 처음 보일 때 만든다(스테이지마다 3종 남짓만 생긴다). 세트가 없거나 그 프레임에 0마리면
// visible=false라 드로콜도 0이다. 텍스처·재질은 전 종 1벌(팔레트 아틀라스 512², 최근접 필터)이라 셰이더 프로그램도 2개뿐이다.
//
// 분업(블록 좀비·E07과 같다):
//  - 시뮬레이션: enemyPool + enemySimulation + novelZombie2Behavior(visualId를 읽지 않는다)
//  - 그림자 / 미니 체력바 / 스폰 연기: ZombieInstanceLayer(2차 좀비는 파트 0개로 그린다 — 배선 시 바꿀 곳)
//  - 몸통·소품: 이 레이어. 표: lib/miniZombieRoster.js(visualId → 몸), 지오메트리: lib/miniZombieGeometry.js
// 툰 규칙: MeshToonMaterial(공용 5단 그라디언트) + 스텐실 뒷면 외곽선(#050209, .96) — BlockyZombieLayer와 같은 값.
// Studio 아이템은 블록·투사체 좀비처럼 아직 없다(튜닝 대상 아님).
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import ErrorBoundary from './ErrorBoundary.jsx'
import miniZombiesUrl from '../assets/models/kenney_mini/mini_zombies_kenney.glb?url'
import { enemyPool, enemySimulationRuntime, playerPos, screenBounds } from '../lib/refs.js'
import { getToonGradient } from '../lib/toon.js'
import { createOutlineGeometry } from '../lib/projectileZombieShotGeometry.js'
import { NOVEL2_FIRST_TYPE_CODE, NOVEL2_LAST_TYPE_CODE, NOVEL2_ROWS, novel2IdFromCode } from '../lib/novelZombie2Content.js'
import { MINI_MODEL_HEIGHT, MINI_ZOMBIE_VISUALS, miniDefaultVariantIndex } from '../lib/miniZombieRoster.js'
import { getMiniZombieAssets } from '../lib/miniZombieGeometry.js'
import { MINI_POSE_BOB, MINI_POSE_LIFT, MINI_POSE_OFFSET, MINI_POSE_PROP_LIFT, MINI_POSE_PROP_SPIN, MINI_POSE_ROOT_ROLL, MINI_POSE_ROOT_YAW, createMiniPose, fillMiniZombiePose } from '../lib/miniZombiePose.js'
import { phase as pooledPhase } from './ZombieInstanceLayer.jsx'
import { ENEMY_RENDER_CULLED, ENEMY_VISUAL_WORLD_SCALE, POOLED_ENEMY_CAPACITY, SPAWN_REVEAL_MS, getPooledEnemyAnimationTime, getPooledEnemyRenderTier } from './PooledEnemyVisuals.js'

export const MINI_ZOMBIES_URL = miniZombiesUrl
const OUTLINE = 1
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
// Kenney Mini(키 0.671, 발바닥 y 0)를 공용 좀비 로컬 높이(발 −0.63 ~ 머리 1.06, 키 1.69)에 맞춘다 — BlockyZombieLayer와 같은 키.
export const MINI_MODEL_FIT = 1.69 / MINI_MODEL_HEIGHT
export const MINI_MODEL_FOOT_Y = -0.63
const FLASH_GAIN = 2.6
const CHIEF_CAPACITY = 8

// typeCode → visualId(행 표가 정본: NOVEL2_ROWS[id].visualId). Kenney 몸이 없는 visualId는 0으로 둔다.
const VISUAL_BY_CODE = new Array(NOVEL2_LAST_TYPE_CODE + 1).fill(null)
for (let code = NOVEL2_FIRST_TYPE_CODE; code <= NOVEL2_LAST_TYPE_CODE; code += 1) {
  const visualId = NOVEL2_ROWS[novel2IdFromCode(code)]?.visualId
  if (MINI_ZOMBIE_VISUALS[visualId]) VISUAL_BY_CODE[code] = visualId
}
export function miniZombieVisualIdForCode(typeCode) { return VISUAL_BY_CODE[typeCode] ?? null }

function makeBodyMaterial(atlas) {
  const material = new THREE.MeshToonMaterial({ color: 0xffffff, map: atlas, emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: 0.16, gradientMap: getToonGradient() })
  material.name = 'mini-zombie-toon'
  material.stencilWrite = true; material.stencilRef = OUTLINE; material.stencilFunc = THREE.AlwaysStencilFunc; material.stencilZPass = THREE.ReplaceStencilOp
  return material
}

function makeOutlineMaterial() {
  const material = new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: 0.96, depthWrite: false })
  material.name = 'mini-zombie-outline'
  material.stencilWrite = true; material.stencilRef = OUTLINE; material.stencilFunc = THREE.NotEqualStencilFunc
  return material
}

function instanced(geometry, material, capacity, withColor) {
  const mesh = new THREE.InstancedMesh(geometry, material, capacity)
  mesh.frustumCulled = false
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  for (let i = 0; i < capacity; i += 1) mesh.setMatrixAt(i, ZERO)
  if (withColor) { mesh.setColorAt(0, new THREE.Color(1, 1, 1)); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage) }
  mesh.count = 0
  return mesh
}

// 변형 1개의 메시 세트: 파트(+loose 소품)마다 [몸통, 외곽선].
function createVariantSet(built, materials, capacity, name) {
  const group = new THREE.Group(); group.name = name
  const entries = []
  for (const part of built.parts) {
    const body = instanced(part.geometry, materials.body, capacity, true); body.renderOrder = 2
    const outline = instanced(part.outlineGeometry, materials.outline, capacity, false); outline.renderOrder = 1
    group.add(body, outline)
    entries.push({ part, body, outline })
  }
  const loose = built.loose.map((item) => {
    const body = instanced(item.geometry, materials.body, capacity, true); body.renderOrder = 2
    const outline = instanced(item.outlineGeometry, materials.outline, capacity, false); outline.renderOrder = 1
    group.add(body, outline)
    return { item, body, outline }
  })
  return { group, entries, loose, capacity, count: 0, torsoIndex: built.parts.findIndex((p) => p.key === 'torso') }
}

const base = new THREE.Matrix4(); const fit = new THREE.Matrix4(); const torsoMat = new THREE.Matrix4(); const partMat = new THREE.Matrix4()
const tmp = new THREE.Matrix4(); const rot = new THREE.Matrix4(); const euler = new THREE.Euler(0, 0, 0, 'XYZ')
const pos = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scl = new THREE.Vector3(); const color = new THREE.Color()
fit.makeTranslation(0, MINI_MODEL_FOOT_Y, 0).multiply(new THREE.Matrix4().makeScale(MINI_MODEL_FIT, MINI_MODEL_FIT, MINI_MODEL_FIT))

function composePart(out, parent, part, pose) {
  const offset = MINI_POSE_OFFSET[part.key]
  euler.set(pose[offset], pose[offset + 1], pose[offset + 2])
  rot.makeRotationFromEuler(euler)
  return out.copy(parent).multiply(tmp.makeTranslation(part.pivot[0], part.pivot[1], part.pivot[2])).multiply(rot)
}

function finish(mesh, count, itemSize, attribute) {
  attribute.clearUpdateRanges(); attribute.addUpdateRange(0, count * itemSize); attribute.needsUpdate = true
}

const DEFAULT_PROP_SCALE = () => 1

// 같은 typeCode 안에서 몸 고르기. E105 2인3각은 행동 런타임의 짝 정보(novelZombie2Behavior.partner)로 짝 두 몸이
// 반드시 서로 다른 몸이 되게 한다(behavior의 side 규칙 index < partner와 같은 기준). 짝이 아직 없으면 기본 규칙.
export function pickMiniVariant(pool, index, visualId, count, runtime = enemySimulationRuntime) {
  const visual = MINI_ZOMBIE_VISUALS[visualId]
  if (visual?.pick === 'pair' && visualId === 'n2-three-legged') {
    const partner = runtime?.novel2?.partner?.[index] ?? -1
    if (partner >= 0) return index < partner ? 0 : 1
  }
  return miniDefaultVariantIndex(visual?.pick, index, count)
}

/**
 * @param resetKey     판 재시작 키(GameCanvas gameKey)
 * @param pickVariant  (pool, index, visualId, variantCount) => 몸 번호. 생략하면 pickMiniVariant(E105는 행동 런타임 짝 정보,
 *                     나머지는 짝·홀/4슬롯 규칙). 개체(슬롯·세대)마다 처음 고른 몸을 끝까지 쓴다.
 *                     E105 2인3각은 behavior의 partner 정보(index < partner ? 0 : 1)로, E106은 기수/말 역할로 바꿔 끼운다.
 * @param propScale    (hook, pool, index) => 배율(0 = 숨김). 'bagScale'(E90 캐리어가 책마다 +8%), 'ballHeld'(E104 큰 공을 들고 있음).
 */
function MiniZombieLayerInner({ resetKey, pickVariant, propScale = DEFAULT_PROP_SCALE }) {
  const gltf = useGLTF(MINI_ZOMBIES_URL, false, true)
  const tiers = useRef(new Uint8Array(POOLED_ENEMY_CAPACITY))
  // 개체마다 처음 그릴 때 고른 몸을 (슬롯, 세대)로 기억한다 — 짝이 죽어 짝 정보가 사라져도 몸이 바뀌지 않는다.
  const chosen = useRef({ variant: new Int8Array(POOLED_ENEMY_CAPACITY).fill(-1), generation: new Int32Array(POOLED_ENEMY_CAPACITY).fill(-1) })
  const pose = useRef(createMiniPose())
  const state = useMemo(() => {
    const assets = getMiniZombieAssets(gltf?.scene, createOutlineGeometry)
    const atlas = assets?.map ?? null
    if (atlas) {
      atlas.colorSpace = THREE.SRGBColorSpace
      atlas.flipY = false
      atlas.magFilter = THREE.NearestFilter
      atlas.minFilter = THREE.NearestFilter
      atlas.generateMipmaps = false
      atlas.needsUpdate = true
    }
    const materials = { body: makeBodyMaterial(atlas), outline: makeOutlineMaterial() }
    const root = new THREE.Group(); root.name = 'mini-zombie-layer'
    // 컴파일 프리웜용(compileAsync는 visible만 돈다): 같은 재질·같은 속성 구성의 빈 인스턴스 메시 한 쌍.
    const warmGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.01)
    const warmBody = instanced(warmGeometry, materials.body, 1, true); const warmOutline = instanced(warmGeometry, materials.outline, 1, false)
    root.add(warmBody, warmOutline)
    return { assets, materials, root, warmGeometry, sets: new Map(), frame: 0 }
  }, [gltf])

  useEffect(() => () => {
    for (const set of state.sets.values()) for (const e of [...set.entries, ...set.loose]) { e.body.dispose(); e.outline.dispose() }
    state.warmGeometry.dispose(); state.materials.body.dispose(); state.materials.outline.dispose()
  }, [state])

  useLayoutEffect(() => {
    for (const set of state.sets.values()) {
      set.count = 0
      for (const e of [...set.entries, ...set.loose]) { e.body.count = 0; e.outline.count = 0; e.body.visible = false; e.outline.visible = false }
    }
    tiers.current.fill(0)
    chosen.current.variant.fill(-1); chosen.current.generation.fill(-1)
  }, [state, resetKey])

  function getSet(visualId, variantIndex) {
    const key = `${visualId}#${variantIndex}`
    let set = state.sets.get(key)
    if (set) return set
    const visual = MINI_ZOMBIE_VISUALS[visualId]
    const variant = visual.variants[variantIndex]
    const built = state.assets.variant(visualId, variantIndex, variant)
    set = createVariantSet(built, state.materials, visual.chief ? CHIEF_CAPACITY : POOLED_ENEMY_CAPACITY, `mini-${visualId}-${variantIndex}`)
    set.style = variant.style ?? visual.style
    set.fast = Boolean(visual.fast)
    state.sets.set(key, set)
    state.root.add(set.group)
    return set
  }

  useFrame(() => {
    const pool = enemyPool
    if (!state.assets) return
    state.frame += 1
    if (state.frame === 2) { state.root.children[0].visible = false; state.root.children[1].visible = false }
    for (const set of state.sets.values()) set.count = 0
    if (pool) {
      const max = Math.min(POOLED_ENEMY_CAPACITY - 1, Number.isInteger(pool.highestActive) ? pool.highestActive : POOLED_ENEMY_CAPACITY - 1)
      const out = pose.current
      for (let i = 0; i <= max; i += 1) {
        if (pool.active[i] !== 1) { tiers.current[i] = 0; continue }
        const visualId = VISUAL_BY_CODE[pool.type[i]]
        if (!visualId) continue
        const tier = getPooledEnemyRenderTier(screenBounds, pool.posX[i], pool.posZ[i], playerPos.x, playerPos.z, tiers.current[i])
        tiers.current[i] = tier
        const timer = pool.spawnTimer[i]
        if (tier === ENEMY_RENDER_CULLED || timer < SPAWN_REVEAL_MS) continue
        const visual = MINI_ZOMBIE_VISUALS[visualId]
        const count = visual.variants.length
        const memo = chosen.current
        const generation = pool.generation ? pool.generation[i] : 0
        let pick = memo.generation[i] === generation ? memo.variant[i] : -1
        if (pick < 0) {
          pick = (pickVariant ?? pickMiniVariant)(pool, i, visualId, count)
          memo.variant[i] = pick; memo.generation[i] = generation
        }
        const set = getSet(visualId, Math.min(count - 1, Math.max(0, pick | 0)))
        if (set.count >= set.capacity) continue
        const slot = set.count++
        const time = getPooledEnemyAnimationTime(timer, tier)
        fillMiniZombiePose(out, set.style, pooledPhase(pool, i), time, set.fast, (i * 0.6180339887) % 1)
        const scale = (pool.visualScale[i] || 1) * ENEMY_VISUAL_WORLD_SCALE
        pos.set(pool.posX[i], pool.posY[i] + out[MINI_POSE_BOB] * scale, pool.posZ[i])
        euler.set(0, pool.yaw[i] + out[MINI_POSE_ROOT_YAW], 0); quat.setFromEuler(euler); scl.set(scale, scale, scale)
        base.compose(pos, quat, scl)
        if (out[MINI_POSE_ROOT_ROLL]) base.multiply(rot.makeRotationZ(out[MINI_POSE_ROOT_ROLL]))
        base.multiply(fit)
        if (out[MINI_POSE_LIFT]) base.multiply(tmp.makeTranslation(0, out[MINI_POSE_LIFT], 0))
        const flashing = pool.hitFlashTimer[i] > 0
        color.setRGB(flashing ? FLASH_GAIN : 1, flashing ? FLASH_GAIN : 1, flashing ? FLASH_GAIN : 1)
        if (set.torsoIndex >= 0) composePart(torsoMat, base, set.entries[set.torsoIndex].part, out)
        for (let k = 0; k < set.entries.length; k += 1) {
          const entry = set.entries[k]
          if (k === set.torsoIndex) partMat.copy(torsoMat)
          else composePart(partMat, entry.part.parentIsTorso ? torsoMat : base, entry.part, out)
          entry.body.setMatrixAt(slot, partMat); entry.outline.setMatrixAt(slot, partMat); entry.body.setColorAt(slot, color)
        }
        for (const entry of set.loose) {
          const { item } = entry
          const hookScale = item.spec.hook ? propScale(item.spec.hook, pool, i) : 1
          const worldPerModel = scale * MINI_MODEL_FIT
          const s = (item.spec.worldSize ? item.spec.worldSize / (item.maxDimension * worldPerModel) : 1) * hookScale
          const o = item.spec.offset ?? [0, 0, 0]
          const k = item.spec.worldSize ? 1 / worldPerModel : 1
          partMat.copy(base).multiply(tmp.makeTranslation(item.anchor[0] + o[0] * k, item.anchor[1] + o[1] * k + (item.spec.lift ? out[MINI_POSE_PROP_LIFT] : 0), item.anchor[2] + o[2] * k))
          if (item.spec.spin) partMat.multiply(rot.makeRotationX(out[MINI_POSE_PROP_SPIN]))
          partMat.multiply(tmp.makeScale(s, s, s))
          entry.body.setMatrixAt(slot, s > 0 ? partMat : ZERO); entry.outline.setMatrixAt(slot, s > 0 ? partMat : ZERO); entry.body.setColorAt(slot, color)
        }
      }
    }
    for (const set of state.sets.values()) {
      const count = set.count
      for (const e of [...set.entries, ...set.loose]) {
        e.body.count = count; e.outline.count = count
        e.body.visible = count > 0; e.outline.visible = count > 0
        if (count > 0) { finish(e.body, count, 16, e.body.instanceMatrix); finish(e.body, count, 3, e.body.instanceColor); finish(e.outline, count, 16, e.outline.instanceMatrix) }
      }
    }
  })

  return <primitive object={state.root} />
}

// GLB(≈95 KB)를 기다리는 동안·실패해도 다른 장면 요소는 기다리지 않는다(KaykitBoundary와 같은 경계).
export default function MiniZombieLayer(props) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <MiniZombieLayerInner {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}

useGLTF.preload(MINI_ZOMBIES_URL, false, true)
