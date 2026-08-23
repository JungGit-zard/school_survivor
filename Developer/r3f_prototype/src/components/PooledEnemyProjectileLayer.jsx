// Bounded E04 projectile renderer.  Integration ownership stays with Enemies;
// this component is intentionally exported as a ready-to-mount layer.
//
// kind 0 = E04 기본 청록 구체(정본, 색·크기·거동 변경 금지).
// kind 1..4 = B04 주방장 보스가 던지는 주방 재료(당근·양파·감자·식칼). kind별로
// InstancedMesh 한 쌍(body + BackSide 외곽선)만 쓰고 count를 kind별로 따로 센다.
import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyProjectilePool, playerPos, screenBounds } from '../lib/refs.js'
import { ENEMY_PROJECTILE_KIND_COUNT, MAX_ENEMY_PROJECTILES } from '../lib/enemyProjectilePool.js'
import { createChefIngredientGeometries } from '../lib/chefIngredientGeometry.js'
import { applyChefIngredientSpin } from '../lib/chefIngredientSpin.js'
import { getToonGradient } from '../lib/toon.js'
import { getPooledEnemyRenderTier } from './PooledEnemyVisuals.js'

const CHEF_INGREDIENT_VISUAL_SCALE = 3
const OUTLINE_SCALE_MULTIPLIER = 1.22
const zero = new THREE.Matrix4().makeScale(0, 0, 0)
const matrix = new THREE.Matrix4(); const position = new THREE.Vector3(); const quaternion = new THREE.Quaternion(); const scale = new THREE.Vector3(1, 1, 1)

function mesh(geometry, material) {
  const result = new THREE.InstancedMesh(geometry, material, MAX_ENEMY_PROJECTILES)
  result.frustumCulled = false
  result.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  for (let i = 0; i < MAX_ENEMY_PROJECTILES; i += 1) result.setMatrixAt(i, zero)
  result.count = 0
  return result
}

export default function PooledEnemyProjectileLayer({ resetKey }) {
  const { bodies, outlines, geometries, materials, tiers, counts } = useMemo(() => {
    const toon = new THREE.MeshToonMaterial({ color: 0x34d6b8, emissive: 0x34d6b8, emissiveIntensity: .45, gradientMap: getToonGradient() })
    const ingredient = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getToonGradient() })
    const out = new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, depthWrite: false })
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
  useEffect(() => () => {
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
  }, [geometries, materials])
  useLayoutEffect(() => {
    for (let kind = 0; kind < bodies.length; kind += 1) {
      for (let i = 0; i < MAX_ENEMY_PROJECTILES; i += 1) {
        bodies[kind].setMatrixAt(i, zero)
        outlines[kind].setMatrixAt(i, zero)
      }
      bodies[kind].instanceMatrix.needsUpdate = true
      outlines[kind].instanceMatrix.needsUpdate = true
      bodies[kind].count = 0
      outlines[kind].count = 0
    }
    tiers.fill(0)
    counts.fill(0)
  }, [bodies, outlines, resetKey, tiers, counts])
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
      bodies[kind].instanceMatrix.needsUpdate = true
      outlines[kind].instanceMatrix.needsUpdate = true
    }
  })
  return (
    <>
      {outlines.map((object, kind) => <primitive key={`outline-${kind}`} object={object} renderOrder={1} />)}
      {bodies.map((object, kind) => <primitive key={`body-${kind}`} object={object} renderOrder={2} />)}
    </>
  )
}
