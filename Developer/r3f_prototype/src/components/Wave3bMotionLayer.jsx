// 2차 신규 좀비 wave 3 둘째 묶음의 몸 밖 그림 2가지 — 각 InstancedMesh 1개 = 드로콜 1개(해당 종이 없으면 visible=false라 0개).
// 2026-11-17, threemini.
//
//  - E102 회전의자 속도선·회전선: 활주(2)·표류(3) 동안 의자 뒤로 흰 줄 3개(길이 ∝ 속도 — 표류하며 줄어든다),
//    회전 예고(1) 동안 의자 둘레에 도는 줄 4개(회전 진행만큼 길어진다). 흰 반투명 평면, 외곽선 없음(VFX 규칙).
//    줄은 바닥 0.1~0.3u 높이·폭 0.045u — 로사리 투사체를 가리지 않는다. 효과 줄이기면 회전선은 그리지 않는다(속도선은 상태 표시라 남긴다).
//  - E106 기마전 엮은 팔: 편대에 묶인 말 셋의 손(기수 쪽 몸 앞) → 말 위 기수의 엉덩이까지 팔 막대 3개. 툰 재질(Mini 아틀라스 피부 칸) +
//    같은 지오메트리에 합친 외곽선 껍질(E104 공과 같은 재질 프로그램 — 프로그램이 늘지 않는다). 기수가 쓰러지면(말이 흩어짐) ·
//    말이 다 쓰러지면(낙마) 사라진다.
// 행동·피해·예고 기하는 여기 없다(읽기 전용 뷰 — lib/novelZombie2Wave3Visuals.js).
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import { MINI_MODEL_FIT, MINI_MODEL_FOOT_Y, MINI_ZOMBIES_URL } from './MiniZombieLayer.jsx'
import { createRollingBallMaterial } from './RollingBallLayer.jsx'
import { ENEMY_VISUAL_WORLD_SCALE, SPAWN_REVEAL_MS } from './PooledEnemyVisuals.js'
import { enemyPool, enemySimulationRuntime } from '../lib/refs.js'
import { getMiniZombieAssets } from '../lib/miniZombieGeometry.js'
import { createOutlineGeometry } from '../lib/projectileZombieShotGeometry.js'
import { miniPaletteSlotRect } from '../lib/miniZombieRoster.js'
import { MINI_RIDER_LIFT } from '../lib/miniZombiePose.js'
import { E102_CHAIR_VISUAL, E106_CAVALRY_VISUAL, cavalryLinkedRider, chairMotionInto, novel2ReducedMotion } from '../lib/novelZombie2Wave3Visuals.js'

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const MAX_SLOTS = 200
const ARM_SLOT = 'zOlive' // 말 몸(male-e) 피부 칸 — 팔 색

function flipWinding(geometry) {
  const index = geometry.index
  if (index) {
    const a = index.array
    for (let t = 0; t < a.length; t += 3) { const k = a[t + 1]; a[t + 1] = a[t + 2]; a[t + 2] = k }
  }
  return geometry
}

/** 팔 막대: 단면 armWidth × armHeight(월드 u), 길이 1(+z, 0..1 — 인스턴스 z 배율 = 길이) + 뒤집힌 외곽선 껍질(aOutline 1). */
export function createCavalryArmGeometry() {
  const V = E106_CAVALRY_VISUAL
  const rect = miniPaletteSlotRect(ARM_SLOT)
  const u = (rect.x + rect.width / 2) / 512; const v = (rect.y + rect.height * 0.5) / 512
  const make = (w, h, z0, z1, outline) => {
    const g = new THREE.BoxGeometry(w, h, z1 - z0)
    g.translate(0, 0, (z0 + z1) / 2)
    const uv = g.attributes.uv
    for (let k = 0; k < uv.count; k += 1) uv.setXY(k, u, v)
    if (outline) flipWinding(g)
    g.setAttribute('aOutline', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(outline ? 1 : 0), 1))
    return g.toNonIndexed()
  }
  const t = 0.012 // 외곽선 두께(월드 u — 몸 외곽선과 비슷)
  const body = make(V.armWidth, V.armHeight, 0, 1, false)
  const hull = make(V.armWidth + t * 2, V.armHeight + t * 2, -0.02, 1.02, true)
  const merged = mergeGeometries([body, hull], false)
  body.dispose(); hull.dispose()
  merged.computeBoundingSphere()
  return merged
}

/** 속도선 한 줄: 바닥에 누운 평면(폭 1 × 길이 1, +z 0..1). */
export function createChairStreakGeometry() {
  const g = new THREE.PlaneGeometry(1, 1)
  g.rotateX(-Math.PI / 2)
  g.translate(0, 0, 0.5)
  return g
}

export function createChairStreakMaterial() {
  const V = E102_CHAIR_VISUAL
  const material = new THREE.MeshBasicMaterial({ color: V.color, transparent: true, opacity: V.opacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
  material.name = 'e102-chair-streak'
  return material
}

const pos = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scl = new THREE.Vector3(); const mat = new THREE.Matrix4()
const from = new THREE.Vector3(); const to = new THREE.Vector3(); const dir = new THREE.Vector3(); const FORWARD = new THREE.Vector3(0, 0, 1)
const euler = new THREE.Euler()
const chair = { phase: 0, speedFrac: 0, dirX: 0, dirZ: 1, spin: 0, speed: 0 }

function finish(mesh, count) {
  mesh.count = count
  mesh.visible = count > 0
  if (count > 0) { mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceMatrix.addUpdateRange(0, count * 16); mesh.instanceMatrix.needsUpdate = true }
  return count
}

function putStreak(mesh, count, x, y, z, yaw, width, length) {
  if (count >= mesh.instanceMatrix.count || !(length > 1e-3)) return count
  pos.set(x, y, z); euler.set(0, yaw, 0); quat.setFromEuler(euler); scl.set(width, 1, length)
  mesh.setMatrixAt(count, mat.compose(pos, quat, scl))
  return count + 1
}

/** 의자 속도선·회전선 인스턴스. 그린 줄 수를 돌려준다. reduced = 효과 줄이기(회전선 없음). */
export function syncChairStreaks(mesh, pool, runtime, reduced = false) {
  if (!mesh) return 0
  const V = E102_CHAIR_VISUAL
  let count = 0
  if (pool) {
    const max = Math.min(MAX_SLOTS - 1, Number.isInteger(pool.highestActive) ? pool.highestActive : MAX_SLOTS - 1)
    for (let i = 0; i <= max; i += 1) {
      if (pool.active[i] !== 1 || !(pool.spawnTimer[i] >= SPAWN_REVEAL_MS)) continue
      if (!chairMotionInto(chair, pool, i, runtime)) continue
      const x = pool.posX[i]; const z = pool.posZ[i]; const ground = pool.posY[i] + MINI_MODEL_FOOT_Y * (pool.visualScale[i] || 1) * ENEMY_VISUAL_WORLD_SCALE
      if ((chair.phase === 2 || chair.phase === 3) && chair.speed >= V.streakMinSpeed) {
        // 뒤로(진행 반대) 뻗는 줄 3개. 길이 ∝ 속도 — 표류하며 감속하면 줄어든다.
        const back = Math.atan2(-chair.dirX, -chair.dirZ)
        const px = chair.dirZ; const pz = -chair.dirX // 옆(진행 방향의 수직)
        const length = V.streakLength * chair.speedFrac
        for (let k = 0; k < V.streakLateral.length; k += 1) {
          const behind = V.streakBehind + V.streakStagger[k]
          count = putStreak(mesh, count, x - chair.dirX * behind + px * V.streakLateral[k], ground + V.streakHeight[k], z - chair.dirZ * behind + pz * V.streakLateral[k], back, V.streakWidth, length)
        }
      } else if (chair.phase === 1 && !reduced) {
        // 회전 예고: 의자 둘레를 도는 줄 4개(의자 yaw를 따라 돈다) — 회전이 진행될수록 길어진다.
        const length = V.whirlLength * (0.3 + 0.7 * chair.spin)
        for (let k = 0; k < V.whirlCount; k += 1) {
          const a = pool.yaw[i] + (k / V.whirlCount) * Math.PI * 2
          const rx = Math.sin(a) * V.whirlRadius; const rz = Math.cos(a) * V.whirlRadius
          // 접선 방향(시계 반대) = 반지름 방향 + 90°
          count = putStreak(mesh, count, x + rx, ground + V.whirlHeight, z + rz, a + Math.PI / 2, V.whirlWidth, length)
        }
      }
    }
  }
  return finish(mesh, count)
}

/** 기마전 엮은 팔 인스턴스: 말마다 1개(손 → 기수 엉덩이). 그린 팔 수를 돌려준다. */
export function syncCavalryLinks(mesh, pool, runtime) {
  if (!mesh) return 0
  const V = E106_CAVALRY_VISUAL
  let count = 0
  if (pool) {
    const max = Math.min(MAX_SLOTS - 1, Number.isInteger(pool.highestActive) ? pool.highestActive : MAX_SLOTS - 1)
    for (let i = 0; i <= max && count < mesh.instanceMatrix.count; i += 1) {
      if (pool.active[i] !== 1 || !(pool.spawnTimer[i] >= SPAWN_REVEAL_MS)) continue
      const rider = cavalryLinkedRider(pool, i, runtime)
      if (rider < 0 || !(pool.spawnTimer[rider] >= SPAWN_REVEAL_MS)) continue
      const hs = (pool.visualScale[i] || 1) * ENEMY_VISUAL_WORLD_SCALE
      const rs = (pool.visualScale[rider] || 1) * ENEMY_VISUAL_WORLD_SCALE
      let ux = pool.posX[rider] - pool.posX[i]; let uz = pool.posZ[rider] - pool.posZ[i]
      const flat = Math.hypot(ux, uz)
      if (flat < V.carrierInset + V.riderInset + 0.02) continue // 몸이 겹쳐 있으면(막 묶인 순간) 팔을 그리지 않는다
      ux /= flat; uz /= flat
      from.set(pool.posX[i] + ux * V.carrierInset, pool.posY[i] + MINI_MODEL_FOOT_Y * hs + V.handY * MINI_MODEL_FIT * hs, pool.posZ[i] + uz * V.carrierInset)
      to.set(pool.posX[rider] - ux * V.riderInset, pool.posY[rider] + MINI_MODEL_FOOT_Y * rs + (V.hipY + MINI_RIDER_LIFT) * MINI_MODEL_FIT * rs, pool.posZ[rider] - uz * V.riderInset)
      dir.subVectors(to, from)
      const length = dir.length()
      if (!(length > 1e-3)) continue
      quat.setFromUnitVectors(FORWARD, dir.multiplyScalar(1 / length))
      scl.set(1, 1, length)
      mesh.setMatrixAt(count, mat.compose(from, quat, scl))
      count += 1
    }
  }
  return finish(mesh, count)
}

function Wave3bMotionLayerInner({ resetKey }) {
  const gltf = useGLTF(MINI_ZOMBIES_URL, false, true)
  const meshes = useMemo(() => {
    // 장면 캐시는 처음 부른 레이어의 외곽선 함수로 변형을 만든다 — 몸 레이어와 같은 함수를 넘긴다.
    const assets = getMiniZombieAssets(gltf?.scene, createOutlineGeometry)
    const atlas = assets?.map ?? null
    if (atlas) {
      // 몸 레이어와 같은 아틀라스 설정(같은 텍스처 객체).
      atlas.colorSpace = THREE.SRGBColorSpace; atlas.flipY = false
      atlas.magFilter = THREE.NearestFilter; atlas.minFilter = THREE.NearestFilter; atlas.generateMipmaps = false
      atlas.needsUpdate = true
    }
    const armMaterial = createRollingBallMaterial(atlas)
    armMaterial.name = 'e106-cavalry-arm-toon'
    const arms = new THREE.InstancedMesh(createCavalryArmGeometry(), armMaterial, E106_CAVALRY_VISUAL.capacity)
    arms.name = 'e106-cavalry-arms'
    const streaks = new THREE.InstancedMesh(createChairStreakGeometry(), createChairStreakMaterial(), E102_CHAIR_VISUAL.capacity)
    streaks.name = 'e102-chair-streaks'
    streaks.renderOrder = 4
    arms.renderOrder = 2
    for (const m of [arms, streaks]) {
      m.frustumCulled = false
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      for (let k = 0; k < m.instanceMatrix.count; k += 1) m.setMatrixAt(k, ZERO)
      m.count = 0
      // 처음 두 프레임은 0개인 채로 보이게 둔다(스테이지 진입 셰이더 프리웜 — RollingBallLayer와 같다).
      m.visible = true
    }
    const root = new THREE.Group(); root.name = 'wave3b-motion-layer'
    root.add(arms, streaks)
    return { root, arms, streaks }
  }, [gltf])
  const frame = useRef(0)
  useEffect(() => () => {
    for (const m of [meshes.arms, meshes.streaks]) { m.geometry.dispose(); m.material.dispose(); m.dispose() }
  }, [meshes])
  useLayoutEffect(() => { meshes.arms.count = 0; meshes.streaks.count = 0; frame.current = 0 }, [meshes, resetKey])
  useFrame(() => {
    frame.current += 1
    const links = syncCavalryLinks(meshes.arms, enemyPool, enemySimulationRuntime)
    const lines = syncChairStreaks(meshes.streaks, enemyPool, enemySimulationRuntime, novel2ReducedMotion())
    if (frame.current <= 2) { if (links === 0) meshes.arms.visible = true; if (lines === 0) meshes.streaks.visible = true }
  })
  return <primitive object={meshes.root} />
}

// GLB를 기다리는 동안·실패해도 다른 장면 요소는 기다리지 않는다(MiniZombieLayer와 같은 경계).
export default function Wave3bMotionLayer(props) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <Wave3bMotionLayerInner {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}
