// Bounded E04 projectile renderer.  Integration ownership stays with Enemies;
// this component is intentionally exported as a ready-to-mount layer.
//
// kind 0 = E04 기본 청록 구체(정본, 색·크기·거동 변경 금지).
// kind 1..4 = B04 주방장 보스가 던지는 주방 재료(당근·양파·감자·식칼). kind별로
// InstancedMesh 한 쌍(body + BackSide 외곽선)만 쓰고 count를 kind별로 따로 센다.
// kind 16..30 = 투사체 좀비 15종(E46~E60) 탄, 31..35 = 바닥 표식·지대(lib/projectileZombieShotPool.js).
// 탄은 외형(lib/projectileZombieShotGeometry.js SHOT_VISUALS)마다 InstancedMesh 한 쌍(body + 외곽선 헐),
// 표식은 ring/markerFill/puddleFill/line 4개, 매복 소품(E58 줄 똬리·E60 배수구)은 소품마다 한 쌍.
// count 0인 메시는 visible=false라 드로콜이 없다 — 화면에 실제로 보이는 외형 수만큼만 그린다.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyPool, enemyProjectilePool, playerPos, projectileZombieShotPool, screenBounds } from '../lib/refs.js'
import { MAX_PROJECTILE_ZOMBIE_SHOTS, SHOT_KIND_INFO, SHOT_MOTION } from '../lib/projectileZombieShotPool.js'
import { PZ_STATE, isProjectileZombieHidden } from '../lib/projectileZombieBehavior.js'
import { MAX_ENEMIES } from '../lib/enemyEntityPool.js'
import {
  DECAL_VISUAL, composeShotQuaternion, createAmbushPropGeometries, createDecalGeometries, createOutlineGeometry,
  createShotGeometries, getAmbushPropIndex, getDecalVisuals, getShotHeading, getShotVisualIndex,
} from '../lib/projectileZombieShotGeometry.js'
import { ENEMY_PROJECTILE_KIND_COUNT, MAX_ENEMY_PROJECTILES } from '../lib/enemyProjectilePool.js'
import { createChefIngredientGeometries } from '../lib/chefIngredientGeometry.js'
import { applyChefIngredientSpin } from '../lib/chefIngredientSpin.js'
import { getToonGradient } from '../lib/toon.js'
import { getFirebaseStudioRuntimeState } from '../lib/studioRuntimeState.js'
import { GRAPHICS_STUDIO_TUNING_EVENT, loadStudioTunings } from '../lib/graphicsStudioConfig.js'
import { getStudioTransformProps } from './StudioTunedGroup.jsx'
import { getPooledEnemyRenderTier } from './PooledEnemyVisuals.js'
import { markInstancedMeshFullUpdate, markInstancedMeshPrefixUpdate } from './ZombieInstanceLayer.jsx'

const CHEF_INGREDIENT_VISUAL_SCALE = 3
const OUTLINE_SCALE_MULTIPLIER = 1.22
const zero = new THREE.Matrix4().makeScale(0, 0, 0)
const matrix = new THREE.Matrix4(); const position = new THREE.Vector3(); const quaternion = new THREE.Quaternion(); const scale = new THREE.Vector3(1, 1, 1)

// E04 탄(kind 0)의 Studio 루트 변환. 프리뷰(EnemyProjectileVisual)와 같은 아이템 id를 쓰고,
// ZombieInstanceLayer와 같은 규칙으로 Firebase 런타임 상태가 준비되면 갱신한다.
export const E04_PROJECTILE_STUDIO_ITEM_ID = 'enemy-projectile-e04'
const outlineScaleMatrix = new THREE.Matrix4().makeScale(OUTLINE_SCALE_MULTIPLIER, OUTLINE_SCALE_MULTIPLIER, OUTLINE_SCALE_MULTIPLIER)
const studioEuler = new THREE.Euler(); const studioQuaternion = new THREE.Quaternion(); const studioPosition = new THREE.Vector3(); const studioScale = new THREE.Vector3()
export function composeE04ProjectileStudioRoot(out, tuning) {
  const transform = getStudioTransformProps(tuning)
  studioPosition.set(transform.position[0], transform.position[1], transform.position[2])
  studioQuaternion.setFromEuler(studioEuler.set(transform.rotation[0], transform.rotation[1], transform.rotation[2]))
  studioScale.set(transform.scale[0], transform.scale[1], transform.scale[2])
  return out.compose(studioPosition, studioQuaternion, studioScale)
}

const shotColor = new THREE.Color()
const shotEuler = new THREE.Euler()
const heading = { x: 0, z: 1 }
const SPAWN_REVEAL_MS = 300
const FUSE_FLASH = 0xff5a3c

function mesh(geometry, material, capacity = MAX_ENEMY_PROJECTILES) {
  const result = new THREE.InstancedMesh(geometry, material, capacity)
  result.frustumCulled = false
  result.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  for (let i = 0; i < capacity; i += 1) result.setMatrixAt(i, zero)
  result.count = 0
  result.visible = false
  return result
}

// 표식 재질 불투명도: ring(경고 테두리) / markerFill(옅은 경고 원) / puddleFill(웅덩이) / line(조준선).
export const DECAL_OPACITY = Object.freeze([0.85, 0.22, 0.5, 0.6])

/** 투사체 좀비 탄·표식·매복 소품 InstancedMesh 묶음. 재질은 호출자가 넘긴다(테스트는 canvas 없이 만든다). */
export function createProjectileZombieShotMeshes({ bodyMat, outMat, decalMats }) {
  const shotGeometries = createShotGeometries()
  const shotOutlineGeometries = shotGeometries.map((g) => createOutlineGeometry(g, 0.013))
  const propGeometries = createAmbushPropGeometries()
  const propOutlineGeometries = propGeometries.map((g) => createOutlineGeometry(g, 0.014))
  const decalGeometries = createDecalGeometries()
  const shotBodies = shotGeometries.map((g) => mesh(g, bodyMat, MAX_PROJECTILE_ZOMBIE_SHOTS))
  const shotOutlines = shotOutlineGeometries.map((g) => mesh(g, outMat, MAX_PROJECTILE_ZOMBIE_SHOTS))
  for (const body of shotBodies) for (let i = 0; i < MAX_PROJECTILE_ZOMBIE_SHOTS; i += 1) body.setColorAt(i, shotColor.setHex(0xffffff))
  const decals = decalGeometries.map((g, v) => mesh(g, decalMats[v], MAX_PROJECTILE_ZOMBIE_SHOTS))
  for (const decal of decals) for (let i = 0; i < MAX_PROJECTILE_ZOMBIE_SHOTS; i += 1) decal.setColorAt(i, shotColor.setHex(0xffffff))
  const propBodies = propGeometries.map((g) => mesh(g, bodyMat, MAX_ENEMIES))
  const propOutlines = propOutlineGeometries.map((g) => mesh(g, outMat, MAX_ENEMIES))
  return {
    shotBodies, shotOutlines, decals, propBodies, propOutlines,
    all: [...shotBodies, ...shotOutlines, ...decals, ...propBodies, ...propOutlines],
    shotCounts: new Uint8Array(shotBodies.length),
    decalCounts: new Uint8Array(decals.length),
    propCounts: new Uint8Array(propBodies.length),
    propTiers: new Uint8Array(MAX_ENEMIES),
    geometries: [...shotGeometries, ...shotOutlineGeometries, ...propGeometries, ...propOutlineGeometries, ...decalGeometries],
    materials: [bodyMat, outMat, ...decalMats],
  }
}

/** 한 프레임: 탄은 외형별, 표식은 데칼별, 매복 소품은 소품별로 앞에서부터 촘촘히 채운다. */
export function writeProjectileZombieShotFrame(shots, pool, enemies, bounds, player) {
  const { shotBodies, shotOutlines, decals, shotCounts, decalCounts } = shots
  shotCounts.fill(0)
  decalCounts.fill(0)
  for (let i = 0; i < pool.capacity; i += 1) {
    if (!pool.active[i]) continue
    const kind = pool.kind[i]
    const info = SHOT_KIND_INFO[kind]
    const color = info ? info.color : 0xffffff
    const motion = pool.motion[i]
    if (motion === SHOT_MOTION.DECAL || motion === SHOT_MOTION.ZONE) {
      const radius = pool.p0[i]
      const length = motion === SHOT_MOTION.DECAL ? pool.p1[i] : 0
      // 표식은 살짝 맥동한다(확정됐다는 신호). 지대는 맥동하지 않는다.
      const pulse = motion === SHOT_MOTION.DECAL ? 0.92 + 0.08 * Math.sin(pool.ageMs[i] * 0.025) : 1
      const visuals = getDecalVisuals(kind, motion, length)
      for (let v = 0; v < visuals.length; v += 1) {
        const visual = visuals[v]
        position.set(pool.posX[i], 0.03 + v * 0.004, pool.posZ[i])
        if (visual === DECAL_VISUAL.LINE) {
          shotEuler.set(0, pool.p2[i], 0)
          quaternion.setFromEuler(shotEuler)
          scale.set(Math.max(0.06, radius * 2) * pulse, 1, length)
        } else {
          // 웅덩이는 슬롯마다 방향을 달리해 같은 윤곽이 반복돼 보이지 않게 한다.
          if (visual === DECAL_VISUAL.PUDDLE_FILL) { shotEuler.set(0, i * 1.3, 0); quaternion.setFromEuler(shotEuler) } else quaternion.identity()
          scale.set(radius * pulse, 1, radius * pulse)
        }
        matrix.compose(position, quaternion, scale)
        const slot = decalCounts[visual]
        decals[visual].setMatrixAt(slot, matrix)
        decals[visual].setColorAt(slot, shotColor.setHex(color))
        decalCounts[visual] = slot + 1
      }
      continue
    }
    // 멈춘 우유갑(퓨즈)은 빠르게 깜빡이며 커진다.
    const fuse = motion === SHOT_MOTION.FUSE && pool.velX[i] === 0 && pool.velZ[i] === 0
    const size = (info ? info.size : 1) * (fuse ? 1.15 + 0.25 * Math.abs(Math.sin(pool.ageMs[i] * 0.02)) : 1)
    const visual = getShotVisualIndex(kind, motion)
    getShotHeading(pool, i, heading)
    position.set(pool.posX[i], pool.posY[i], pool.posZ[i])
    composeShotQuaternion(quaternion, visual, heading.x, heading.z, fuse ? 0 : pool.ageMs[i], i)
    scale.setScalar(size)
    matrix.compose(position, quaternion, scale)
    const slot = shotCounts[visual]
    shotBodies[visual].setMatrixAt(slot, matrix)
    shotOutlines[visual].setMatrixAt(slot, matrix)
    shotBodies[visual].setColorAt(slot, shotColor.setHex(fuse && Math.sin(pool.ageMs[i] * 0.04) > 0 ? FUSE_FLASH : 0xffffff))
    shotCounts[visual] = slot + 1
  }
  scale.set(1, 1, 1)
  for (let v = 0; v < shotBodies.length; v += 1) {
    shotBodies[v].count = shotCounts[v]
    shotOutlines[v].count = shotCounts[v]
    markInstancedMeshPrefixUpdate(shotBodies[v], shotCounts[v], { matrix: true, color: true })
    markInstancedMeshPrefixUpdate(shotOutlines[v], shotCounts[v], { matrix: true })
  }
  for (let v = 0; v < decals.length; v += 1) {
    decals[v].count = decalCounts[v]
    markInstancedMeshPrefixUpdate(decals[v], decalCounts[v], { matrix: true, color: true })
  }
  // 매복형(E58·E60)이 반쯤 가라앉은 동안 발밑 소품: 구멍이 몸이 바닥을 뚫는 단면을 덮어
  // "바닥에 박힌" 게 아니라 "숨은" 자세로 읽히게 한다. E60 배수구는 솟아오르는 예고 동안에도 남는다.
  const { propBodies, propOutlines, propCounts, propTiers } = shots
  propCounts.fill(0)
  const last = enemies ? Math.min(MAX_ENEMIES - 1, Number.isInteger(enemies.highestActive) ? enemies.highestActive : MAX_ENEMIES - 1) : -1
  for (let i = 0; i <= last; i += 1) {
    if (enemies.active[i] !== 1) { propTiers[i] = 0; continue }
    const prop = getAmbushPropIndex(enemies.type[i])
    if (prop < 0 || enemies.spawnTimer[i] < SPAWN_REVEAL_MS) continue
    const shown = isProjectileZombieHidden(enemies, i) || (prop === 1 && enemies.state[i] === PZ_STATE.TELEGRAPH)
    if (!shown) continue
    const tier = getPooledEnemyRenderTier(bounds, enemies.posX[i], enemies.posZ[i], player.x, player.z, propTiers[i])
    propTiers[i] = tier
    if (!tier) continue
    position.set(enemies.posX[i], enemies.lastContactY[i], enemies.posZ[i])
    shotEuler.set(0, (i * 2.399) % (Math.PI * 2), 0)
    quaternion.setFromEuler(shotEuler)
    scale.setScalar(enemies.visualScale[i] || 1)
    matrix.compose(position, quaternion, scale)
    const slot = propCounts[prop]
    propBodies[prop].setMatrixAt(slot, matrix)
    propOutlines[prop].setMatrixAt(slot, matrix)
    propCounts[prop] = slot + 1
  }
  scale.set(1, 1, 1)
  for (let v = 0; v < propBodies.length; v += 1) {
    propBodies[v].count = propCounts[v]
    propOutlines[v].count = propCounts[v]
    markInstancedMeshPrefixUpdate(propBodies[v], propCounts[v], { matrix: true })
    markInstancedMeshPrefixUpdate(propOutlines[v], propCounts[v], { matrix: true })
  }
  return shots
}

export default function PooledEnemyProjectileLayer({ resetKey }) {
  const { bodies, outlines, geometries, materials, tiers, counts } = useMemo(() => {
    const toon = new THREE.MeshToonMaterial({ color: 0x34d6b8, emissive: 0x34d6b8, emissiveIntensity: .45, gradientMap: getToonGradient() })
    const ingredient = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getToonGradient() })
    // transparent(opacity 1): depthWrite가 꺼진 외곽선 헐을 투명 패스로 보내, 뒤에 그려지는 불투명
    // 좀비 몸통이 헐을 지우지 못하게 한다(lib/toon.js outlineMat과 같은 패턴).
    const out = new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: 1, depthWrite: false })
    const geos = [new THREE.SphereGeometry(.09, 8, 8), ...createChefIngredientGeometries()]
    return {
      bodies: geos.map((geometry, kind) => mesh(geometry, kind === 0 ? toon : ingredient)),
      outlines: geos.map((geometry) => mesh(geometry, out)),
      geometries: geos,
      materials: [toon, ingredient, out],
      tiers: new Uint8Array(MAX_ENEMY_PROJECTILES),
      counts: new Uint8Array(ENEMY_PROJECTILE_KIND_COUNT),
    }
  }, [])
  const shots = useMemo(() => {
    const gradientMap = getToonGradient()
    return createProjectileZombieShotMeshes({
      bodyMat: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap, emissive: 0x161616 }),
      outMat: new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: 1, depthWrite: false }),
      decalMats: DECAL_OPACITY.map((opacity) => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })),
    })
  }, [])
  useEffect(() => () => {
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    shots.geometries.forEach((geometry) => geometry.dispose())
    shots.materials.forEach((material) => material.dispose())
  }, [geometries, materials, shots])
  const e04StudioRoot = useRef(new THREE.Matrix4())
  useEffect(() => {
    const refresh = () => {
      const state = getFirebaseStudioRuntimeState()
      if (!state?.datasets || !Number.isInteger(state.revision)) return
      composeE04ProjectileStudioRoot(e04StudioRoot.current, loadStudioTunings()[E04_PROJECTILE_STUDIO_ITEM_ID])
    }
    refresh()
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, refresh)
    return () => window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, refresh)
  }, [])
  useLayoutEffect(() => {
    for (let kind = 0; kind < bodies.length; kind += 1) {
      for (let i = 0; i < MAX_ENEMY_PROJECTILES; i += 1) {
        bodies[kind].setMatrixAt(i, zero)
        outlines[kind].setMatrixAt(i, zero)
      }
      bodies[kind].count = 0
      outlines[kind].count = 0
      markInstancedMeshFullUpdate(bodies[kind], { matrix: true })
      markInstancedMeshFullUpdate(outlines[kind], { matrix: true })
    }
    tiers.fill(0)
    counts.fill(0)
    for (const object of shots.all) {
      for (let i = 0; i < object.instanceMatrix.count; i += 1) object.setMatrixAt(i, zero)
      object.count = 0
      markInstancedMeshFullUpdate(object, { matrix: true })
    }
    shots.propTiers.fill(0)
  }, [bodies, outlines, resetKey, tiers, counts, shots])
  useFrame(() => {
    counts.fill(0)
    for (let i = 0; i < MAX_ENEMY_PROJECTILES; i += 1) {
      if (!enemyProjectilePool.active[i]) { tiers[i] = 0; continue }
      const tier = getPooledEnemyRenderTier(screenBounds, enemyProjectilePool.posX[i], enemyProjectilePool.posZ[i], playerPos.x, playerPos.z, tiers[i])
      tiers[i] = tier
      if (!tier) continue
      const kind = enemyProjectilePool.kind[i] < bodies.length ? enemyProjectilePool.kind[i] : 0
      position.set(enemyProjectilePool.posX[i], enemyProjectilePool.posY[i], enemyProjectilePool.posZ[i])
      if (kind === 0) quaternion.identity()
      else applyChefIngredientSpin(quaternion, i, enemyProjectilePool.ageMs[i])
      const slot = counts[kind]
      if (kind === 0) {
        // StudioTunedGroup 순서: 월드 위치 → Studio 루트(T·R·S) → 자식(몸통 1, 외곽선 1.22).
        matrix.makeTranslation(position.x, position.y, position.z).multiply(e04StudioRoot.current)
        bodies[0].setMatrixAt(slot, matrix)
        matrix.multiply(outlineScaleMatrix)
        outlines[0].setMatrixAt(slot, matrix)
        counts[0] = slot + 1
        continue
      }
      scale.setScalar(kind === 0 ? 1 : CHEF_INGREDIENT_VISUAL_SCALE)
      matrix.compose(position, quaternion, scale)
      bodies[kind].setMatrixAt(slot, matrix)
      scale.setScalar((kind === 0 ? 1 : CHEF_INGREDIENT_VISUAL_SCALE) * OUTLINE_SCALE_MULTIPLIER)
      matrix.compose(position, quaternion, scale)
      outlines[kind].setMatrixAt(slot, matrix)
      scale.set(1, 1, 1)
      counts[kind] = slot + 1
    }
    for (let kind = 0; kind < bodies.length; kind += 1) {
      bodies[kind].count = counts[kind]
      outlines[kind].count = counts[kind]
      markInstancedMeshPrefixUpdate(bodies[kind], counts[kind], { matrix: true })
      markInstancedMeshPrefixUpdate(outlines[kind], counts[kind], { matrix: true })
    }
    writeProjectileZombieShotFrame(shots, projectileZombieShotPool, enemyPool, screenBounds, playerPos)
  })
  return (
    <>
      {outlines.map((object, kind) => <primitive key={`outline-${kind}`} object={object} renderOrder={1} />)}
      {bodies.map((object, kind) => <primitive key={`body-${kind}`} object={object} renderOrder={2} />)}
      {shots.decals.map((object, v) => <primitive key={`decal-${v}`} object={object} renderOrder={v === DECAL_VISUAL.RING ? 0.2 : 0} />)}
      {shots.propOutlines.map((object, v) => <primitive key={`prop-outline-${v}`} object={object} renderOrder={1} />)}
      {shots.propBodies.map((object, v) => <primitive key={`prop-body-${v}`} object={object} renderOrder={2} />)}
      {shots.shotOutlines.map((object, v) => <primitive key={`shot-outline-${v}`} object={object} renderOrder={1} />)}
      {shots.shotBodies.map((object, v) => <primitive key={`shot-body-${v}`} object={object} renderOrder={2} />)}
    </>
  )
}
