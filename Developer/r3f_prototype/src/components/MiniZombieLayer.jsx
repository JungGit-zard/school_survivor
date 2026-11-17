// 2차 신규 좀비 18종(E89~E106, typeCode 94~111) 몸통 렌더 레이어 — Kenney "Mini Characters 2.0"(CC0). 2026-11-15, threemini.
//
// BlockyZombieLayer와 같은 방식이다: 몸 1벌 = 강체 파트 6개, 파트마다 InstancedMesh 2개(툰 몸통 + 스텐실 뒷면 외곽선),
// 포즈는 절차적(lib/miniZombiePose.js — 블록 좀비 포즈 문법 위에 종별 예고·공격·회복만 덮어쓴다). SkinnedMesh·클립 믹서 없음.
// 블록 좀비와 다른 점: Kenney Mini 캐릭터는 몸마다 지오메트리가 달라서 변형(몸 + 리컬러 + 소품)마다 메시 세트가 따로다.
// 세트는 스테이지 진입·판 시작 때(프레임 루프 밖) 그 스테이지가 낼 수 있는 몸 전부를 미리 만든다(miniZombieStageVariants —
// 스폰 표에서 읽는다, 스테이지마다 3종 남짓). 2026-11-17: 예전에는 첫 개체가 보이는 프레임에 만들어서 종마다 4~34 ms(폰 3~5배)
// 끊겼다(스1 60·108·150·184초). 표에 없는 몸이 혹시 나오면 그때 만드는 예전 경로가 안전망으로 남아 있다.
// 그 프레임에 0마리면 visible=false라 드로콜도 0이다. 텍스처·재질은 전 종 1벌(팔레트 아틀라스 512², 최근접 필터)이라 셰이더 프로그램도 2개뿐이다.
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
import { markInstanceUpload } from '../lib/templateInstanceLayer.js'
import { getBurstEventsForStage } from '../lib/burstEvents.js'
import { useGameStore } from '../store/useGameStore.js'
import { NOVEL2_FIRST_TYPE_CODE, NOVEL2_LAST_TYPE_CODE, NOVEL2_ROWS, novel2IdFromCode } from '../lib/novelZombie2Content.js'
import { MINI_MODEL_HEIGHT, MINI_ZOMBIE_VISUALS, miniBodyWorldScale, miniDefaultVariantIndex } from '../lib/miniZombieRoster.js'
import { getMiniZombieAssets } from '../lib/miniZombieGeometry.js'
import { MINI_POSE_BOB, MINI_POSE_LIFT, MINI_POSE_OFFSET, MINI_POSE_PROP_LIFT, MINI_POSE_PROP_SPIN, MINI_POSE_ROOT_ROLL, MINI_POSE_ROOT_YAW, createMiniPose, fillMiniZombiePose } from '../lib/miniZombiePose.js'
import { createMiniBodyTransform, createMochiDrawMemory, miniBodyTransformInto, miniInstanceTintInto, miniPoseStyleFor, novel2ReducedMotion } from '../lib/novelZombie2Wave3Visuals.js'
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
// 스테이지 진입·판 시작 뒤 프리웜 메시와 미리 만든 세트를 0개인 채로 보이게 두는 렌더 프레임 수
// (셰이더 컴파일 + 지오메트리·인스턴스 버퍼 업로드를 진입 순간에 끝낸다).
const WARM_FRAMES = 2
const NO_OFFSET = Object.freeze([0, 0, 0])

// typeCode → visualId(행 표가 정본: NOVEL2_ROWS[id].visualId). Kenney 몸이 없는 visualId는 0으로 둔다.
const VISUAL_BY_CODE = new Array(NOVEL2_LAST_TYPE_CODE + 1).fill(null)
for (let code = NOVEL2_FIRST_TYPE_CODE; code <= NOVEL2_LAST_TYPE_CODE; code += 1) {
  const visualId = NOVEL2_ROWS[novel2IdFromCode(code)]?.visualId
  if (MINI_ZOMBIE_VISUALS[visualId]) VISUAL_BY_CODE[code] = visualId
}
export function miniZombieVisualIdForCode(typeCode) { return VISUAL_BY_CODE[typeCode] ?? null }

// 스테이지가 낼 수 있는 2차 좀비 몸 [visualId, 몸 번호] 목록 — 프레임 루프 밖에서 미리 만들 대상(하드코딩 없음).
// 출처: 그 스테이지 스폰 표(getBurstEventsForStage의 type·mixedTypes — 로스터 순환·복사기 복사본도 이 표의 종만 낸다)
// + 행 표의 stageId(표 밖 경로로 스폰되는 치프 대비). 같은 몸은 한 번만.
const stageVariantCache = new Map()
export function miniZombieStageVariants(stageId) {
  if (stageVariantCache.has(stageId)) return stageVariantCache.get(stageId)
  const visualIds = new Set()
  const addId = (id) => { const visualId = NOVEL2_ROWS[id]?.visualId; if (MINI_ZOMBIE_VISUALS[visualId]) visualIds.add(visualId) }
  for (const row of Object.values(NOVEL2_ROWS)) if (row.stageId === stageId) addId(row.id)
  for (const evt of getBurstEventsForStage(stageId) ?? []) {
    if (evt?.type) addId(evt.type)
    for (const type of evt?.mixedTypes ?? []) addId(type)
  }
  const out = []
  for (const visualId of visualIds) {
    const count = MINI_ZOMBIE_VISUALS[visualId].variants.length
    for (let k = 0; k < count; k += 1) out.push(Object.freeze([visualId, k]))
  }
  const frozen = Object.freeze(out)
  stageVariantCache.set(stageId, frozen)
  return frozen
}

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

// 이 레이어가 그리는 loose 소품인가(표 drawnBy가 있으면 다른 레이어 몫 — E104 공은 RollingBallLayer). 메시를 만들지 않아 드로콜 0.
export function miniLooseDrawnHere(item) { return !item?.spec?.drawnBy }
/** 변형 1개가 이 레이어에서 쓰는 드로콜 수(파트·이 레이어 loose 소품마다 몸통 + 외곽선 2개). */
export function miniVariantDrawCalls(built) { return (built.parts.length + built.loose.filter(miniLooseDrawnHere).length) * 2 }

// 변형 1개의 메시 세트: 파트(+loose 소품)마다 [몸통, 외곽선].
function createVariantSet(built, materials, capacity, name) {
  const group = new THREE.Group(); group.name = name
  const entries = []
  // 프레임 루프에서 문자열 조회·배열 복사를 하지 않게 포즈 칸 번호와 메시 목록을 여기서 한 번 만든다.
  const meshes = []
  for (const part of built.parts) {
    const body = instanced(part.geometry, materials.body, capacity, true); body.renderOrder = 2
    const outline = instanced(part.outlineGeometry, materials.outline, capacity, false); outline.renderOrder = 1
    group.add(body, outline)
    entries.push({ part, body, outline, offset: MINI_POSE_OFFSET[part.key], isHead: part.key === 'head' })
    meshes.push(body, outline)
  }
  const loose = built.loose.filter(miniLooseDrawnHere).map((item) => {
    const body = instanced(item.geometry, materials.body, capacity, true); body.renderOrder = 2
    const outline = instanced(item.outlineGeometry, materials.outline, capacity, false); outline.renderOrder = 1
    group.add(body, outline)
    meshes.push(body, outline)
    return { item, body, outline }
  })
  return { group, entries, loose, meshes, capacity, count: 0, torsoIndex: built.parts.findIndex((p) => p.key === 'torso') }
}

/** 레이어 상태 1벌(GLB 장면당). 세트는 아직 없다 — prebuildMiniZombieStage / getMiniVariantSet이 만든다. */
export function createMiniZombieLayerState(scene) {
  const assets = getMiniZombieAssets(scene, createOutlineGeometry)
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
  // byVisual: visualId → 몸 번호별 세트(문자열 열쇠를 프레임마다 만들지 않는다). sets: 순회용 배열.
  return { assets, materials, root, warmGeometry, warmMeshes: [warmBody, warmOutline], byVisual: new Map(), sets: [], warmFrames: WARM_FRAMES }
}

/** 변형 세트를 돌려준다. 없으면 만든다 — 스테이지 진입 때 prebuildMiniZombieStage가 미리 부르고, 프레임 경로에서는 표 밖 몸의 안전망이다. */
export function getMiniVariantSet(state, visualId, variantIndex) {
  let list = state.byVisual.get(visualId)
  if (list) { const found = list[variantIndex]; if (found) return found }
  const visual = MINI_ZOMBIE_VISUALS[visualId]
  if (!list) { list = new Array(visual.variants.length).fill(null); state.byVisual.set(visualId, list) }
  const variant = visual.variants[variantIndex]
  const built = state.assets.variant(visualId, variantIndex, variant)
  const set = createVariantSet(built, state.materials, visual.chief ? CHIEF_CAPACITY : POOLED_ENEMY_CAPACITY, `mini-${visualId}-${variantIndex}`)
  set.style = variant.style ?? visual.style
  set.fast = Boolean(visual.fast)
  list[variantIndex] = set
  state.sets.push(set)
  state.root.add(set.group)
  return set
}

/** 스테이지가 낼 수 있는 몸 전부를 지금 만든다(프레임 루프 밖). 만든 세트 수를 돌려준다. 지오메트리는 장면 캐시라 재시작·재진입은 0 ms. */
export function prebuildMiniZombieStage(state, stageId) {
  if (!state?.assets) return 0
  const list = miniZombieStageVariants(stageId)
  let made = 0
  for (let n = 0; n < list.length; n += 1) {
    const before = state.sets.length
    try {
      getMiniVariantSet(state, list[n][0], list[n][1])
    } catch {
      // 미리 만들기 실패는 삼킨다 — 그 몸이 실제로 나오는 프레임의 예전 경로가 같은 오류를 그대로 낸다(동작 불변).
    }
    made += state.sets.length - before
  }
  return made
}

const base = new THREE.Matrix4(); const fit = new THREE.Matrix4(); const torsoMat = new THREE.Matrix4(); const partMat = new THREE.Matrix4()
const tmp = new THREE.Matrix4(); const rot = new THREE.Matrix4(); const euler = new THREE.Euler(0, 0, 0, 'XYZ')
const pos = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scl = new THREE.Vector3(); const color = new THREE.Color()
const tint = new Float32Array(3)
const headMat = new THREE.Matrix4(); const stretch = new THREE.Matrix4()
fit.makeTranslation(0, MINI_MODEL_FOOT_Y, 0).multiply(new THREE.Matrix4().makeScale(MINI_MODEL_FIT, MINI_MODEL_FIT, MINI_MODEL_FIT))

function composePart(out, parent, entry, pose) {
  const { part, offset } = entry
  euler.set(pose[offset], pose[offset + 1], pose[offset + 2])
  rot.makeRotationFromEuler(euler)
  return out.copy(parent).multiply(tmp.makeTranslation(part.pivot[0], part.pivot[1], part.pivot[2])).multiply(rot)
}

const DEFAULT_PROP_SCALE = () => 1

function miniBehaviorClockSec() {
  const ms = enemySimulationRuntime?.novel2?.clockMs
  return Number.isFinite(ms) ? ms * 0.001 : 0
}

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
 *                     E105 2인3각은 behavior의 partner 정보(index < partner ? 0 : 1)로 바꿔 끼운다. E106 기마전은 네 몸이 한 변형이고
 *                     역할(기수/말)은 포즈 문법(miniPoseStyleFor)과 모자 hook(riderCap)으로만 갈린다.
 * @param propScale    (hook, pool, index) => 배율(0 = 숨김). 'bagScale'(E90 캐리어가 책마다 +8%), 'ballHeld'(E104 큰 공을 들고 있음),
 *                     'riderCap'(E106 기수 모자 — 말이면 0).
 */
function MiniZombieLayerInner({ resetKey, pickVariant, propScale = DEFAULT_PROP_SCALE }) {
  const gltf = useGLTF(MINI_ZOMBIES_URL, false, true)
  const tiers = useRef(new Uint8Array(POOLED_ENEMY_CAPACITY))
  // 개체마다 처음 그릴 때 고른 몸을 (슬롯, 세대)로 기억한다 — 짝이 죽어 짝 정보가 사라져도 몸이 바뀌지 않는다.
  const chosen = useRef({ variant: new Int8Array(POOLED_ENEMY_CAPACITY).fill(-1), generation: new Int32Array(POOLED_ENEMY_CAPACITY).fill(-1) })
  const pose = useRef(createMiniPose())
  // wave 3 둘째 묶음: E100 찹쌀떡 몸 변형(웅크림·도약 포물선·매달림·퍼짐)과 떨어지는 순간 미끄러지기용 기억.
  const bodyXf = useRef(createMiniBodyTransform())
  const xfCtx = useRef({ playerX: 0, playerZ: 0, clockSec: 0, reduced: false, memory: createMochiDrawMemory(POOLED_ENEMY_CAPACITY) })
  const state = useMemo(() => createMiniZombieLayerState(gltf?.scene), [gltf])

  useEffect(() => () => {
    for (const set of state.sets) for (const mesh of set.meshes) mesh.dispose()
    state.warmGeometry.dispose(); state.materials.body.dispose(); state.materials.outline.dispose()
  }, [state])

  useLayoutEffect(() => {
    // 스테이지 진입·판 시작(같은 커밋의 StageEntryRuntimeDiagnostics compileAsync보다 먼저 돈다):
    // 1) 이 스테이지가 낼 수 있는 몸을 지금 다 만든다 — 첫 스폰 프레임에 만들지 않는다.
    //    스테이지는 구독하지 않고 여기서 읽는다: startGame이 currentStageId와 gameKey(= resetKey)를 같은 갱신에서 바꾼다.
    prebuildMiniZombieStage(state, useGameStore.getState().currentStageId)
    // 2) 프리웜을 다시 켠다 — 이 레이어는 판마다 다시 마운트되는 Physics 밖이라 첫 판에만 켜면 다음 스테이지(다른 조명)에서
    //    첫 스폰 때 셰이더를 다시 컴파일한다. 미리 만든 세트도 0개인 채로 보여 버퍼 업로드까지 진입 순간에 끝낸다.
    state.warmFrames = WARM_FRAMES
    for (const mesh of state.warmMeshes) mesh.visible = true
    for (const set of state.sets) {
      set.count = 0
      for (const mesh of set.meshes) { mesh.count = 0; mesh.visible = true }
    }
    tiers.current.fill(0)
    chosen.current.variant.fill(-1); chosen.current.generation.fill(-1)
    xfCtx.current.memory.generation.fill(-1)
  }, [state, resetKey])

  useFrame(() => {
    const pool = enemyPool
    if (!state.assets) return
    const warming = state.warmFrames > 0
    if (warming) state.warmFrames -= 1
    for (let n = 0; n < state.warmMeshes.length; n += 1) state.warmMeshes[n].visible = warming
    for (let n = 0; n < state.sets.length; n += 1) state.sets[n].count = 0
    if (pool) {
      const max = Math.min(POOLED_ENEMY_CAPACITY - 1, Number.isInteger(pool.highestActive) ? pool.highestActive : POOLED_ENEMY_CAPACITY - 1)
      const out = pose.current
      const ctx = xfCtx.current
      ctx.playerX = playerPos.x; ctx.playerZ = playerPos.z; ctx.clockSec = miniBehaviorClockSec(); ctx.reduced = novel2ReducedMotion()
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
        const set = getMiniVariantSet(state, visualId, Math.min(count - 1, Math.max(0, pick | 0)))
        if (set.count >= set.capacity) continue
        const slot = set.count++
        const posePhase = pooledPhase(pool, i)
        // 미믹 깡충(stun = 깨어난 추격)은 행동 시계로 박자를 맞춘다 — 움직이는 0.3초에 뛰고, 서 있는 0.2초에 앉는다.
        const time = set.style === 'mimic' && posePhase === 'stun'
          ? miniBehaviorClockSec() : getPooledEnemyAnimationTime(timer, tier)
        // wave 3: 복사기 스캔 예고(모드 1)는 부채꼴 예고와 다른 포즈('copierScan').
        fillMiniZombiePose(out, miniPoseStyleFor(set.style, pool, i, enemySimulationRuntime), posePhase, time, set.fast, (i * 0.6180339887) % 1)
        const poolScale = (pool.visualScale[i] || 1) * ENEMY_VISUAL_WORLD_SCALE
        const scale = miniBodyWorldScale(visual, poolScale)
        // wave 3 둘째 묶음: 몸 변형(E100 찹쌀떡만 — 그릴 자리·방향·높이·발 기준 비균일 배율). 나머지 종은 active=false.
        const xf = miniBodyTransformInto(bodyXf.current, pool, i, enemySimulationRuntime, ctx)
        // 몸 크기를 월드 가로로 고정한 종(미믹)도 발 높이는 pool 배율 기준 그대로 둔다(바닥에 붙어 있게).
        pos.set(xf.active ? xf.x : pool.posX[i], pool.posY[i] + out[MINI_POSE_BOB] * scale + MINI_MODEL_FOOT_Y * (poolScale - scale) + (xf.active ? xf.lift : 0), xf.active ? xf.z : pool.posZ[i])
        euler.set(0, (xf.active ? xf.yaw : pool.yaw[i]) + out[MINI_POSE_ROOT_YAW], 0); quat.setFromEuler(euler); scl.set(scale, scale, scale)
        base.compose(pos, quat, scl)
        if (out[MINI_POSE_ROOT_ROLL]) base.multiply(rot.makeRotationZ(out[MINI_POSE_ROOT_ROLL]))
        base.multiply(fit)
        if (xf.active && (xf.uniform !== 1 || xf.sx !== 1 || xf.sy !== 1 || xf.sz !== 1)) {
          // 발(Kenney y 0)과 몸 앞(pivotZ)을 기준으로 누르고 늘린다 — 매달린 떡은 로사리에 붙은 앞면이 그대로고 뒤로 늘어난다.
          const u = xf.uniform
          base.multiply(tmp.makeTranslation(0, 0, xf.pivotZ)).multiply(stretch.makeScale(xf.sx * u, xf.sy * u, xf.sz * u)).multiply(tmp.makeTranslation(0, 0, -xf.pivotZ))
        }
        if (out[MINI_POSE_LIFT]) base.multiply(tmp.makeTranslation(0, out[MINI_POSE_LIFT], 0))
        const flashing = pool.hitFlashTimer[i] > 0
        color.setRGB(flashing ? FLASH_GAIN : 1, flashing ? FLASH_GAIN : 1, flashing ? FLASH_GAIN : 1)
        // wave 3: E101 용지 걸림 = 빨간 오류 깜박임(피격 플래시가 우선).
        if (!flashing && miniInstanceTintInto(tint, pool, i, miniBehaviorClockSec())) color.setRGB(tint[0], tint[1], tint[2])
        if (set.torsoIndex >= 0) composePart(torsoMat, base, set.entries[set.torsoIndex], out)
        for (let k = 0; k < set.entries.length; k += 1) {
          const entry = set.entries[k]
          if (k === set.torsoIndex) partMat.copy(torsoMat)
          else composePart(partMat, entry.part.parentIsTorso ? torsoMat : base, entry, out)
          entry.body.setMatrixAt(slot, partMat); entry.outline.setMatrixAt(slot, partMat); entry.body.setColorAt(slot, color)
          if (entry.isHead) headMat.copy(partMat)
        }
        for (let j = 0; j < set.loose.length; j += 1) {
          const entry = set.loose[j]
          const { item } = entry
          // part 'head' 소품(E106 기수 모자)은 머리 행렬에 붙는다 — 고개·상체를 돌려도 머리에 붙어 있다.
          const parent = item.part === 'head' ? headMat : base
          const hookScale = item.spec.hook ? propScale(item.spec.hook, pool, i) : 1
          const worldPerModel = scale * MINI_MODEL_FIT
          const s = (item.spec.worldSize ? item.spec.worldSize / (item.maxDimension * worldPerModel) : 1) * hookScale
          const o = item.spec.offset ?? NO_OFFSET
          const k = item.spec.worldSize ? 1 / worldPerModel : 1
          partMat.copy(parent).multiply(tmp.makeTranslation(item.anchor[0] + o[0] * k, item.anchor[1] + o[1] * k + (item.spec.lift ? out[MINI_POSE_PROP_LIFT] : 0), item.anchor[2] + o[2] * k))
          if (item.spec.spin) partMat.multiply(rot.makeRotationX(out[MINI_POSE_PROP_SPIN]))
          partMat.multiply(tmp.makeScale(s, s, s))
          entry.body.setMatrixAt(slot, s > 0 ? partMat : ZERO); entry.outline.setMatrixAt(slot, s > 0 ? partMat : ZERO); entry.body.setColorAt(slot, color)
        }
      }
    }
    for (let n = 0; n < state.sets.length; n += 1) {
      const set = state.sets[n]
      const count = set.count
      // 프리웜 프레임에는 0개인 세트도 보이게 둔다(셰이더·버퍼가 진입 순간에 준비된다 — 0개라 그려지는 것은 없다).
      const shown = count > 0 || warming
      for (let k = 0; k < set.meshes.length; k += 1) {
        const mesh = set.meshes[k]
        mesh.count = count
        mesh.visible = shown
        if (count > 0) {
          markInstanceUpload(mesh.instanceMatrix, count, 16)
          if (mesh.instanceColor) markInstanceUpload(mesh.instanceColor, count, 3)
        }
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
