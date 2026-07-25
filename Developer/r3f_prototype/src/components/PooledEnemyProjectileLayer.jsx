// Bounded E04 projectile renderer.  Integration ownership stays with Enemies;
// this component is intentionally exported as a ready-to-mount layer.
import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyProjectilePool } from '../lib/refs.js'
import { MAX_ENEMY_PROJECTILES } from '../lib/enemyProjectilePool.js'
import { getToonGradient } from '../lib/toon.js'

const zero = new THREE.Matrix4().makeScale(0, 0, 0)
const matrix = new THREE.Matrix4(); const position = new THREE.Vector3(); const quaternion = new THREE.Quaternion(); const scale = new THREE.Vector3(1, 1, 1)

function mesh(material) {
  const result = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 8, 8), material, MAX_ENEMY_PROJECTILES)
  result.frustumCulled = false
  result.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  for (let i = 0; i < MAX_ENEMY_PROJECTILES; i += 1) result.setMatrixAt(i, zero)
  return result
}

export default function PooledEnemyProjectileLayer({ resetKey }) {
  const { body, outline } = useMemo(() => {
    const toon = new THREE.MeshToonMaterial({ color: 0x34d6b8, emissive: 0x34d6b8, emissiveIntensity: .45, gradientMap: getToonGradient() })
    const out = new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, depthWrite: false })
    return { body: mesh(toon), outline: mesh(out) }
  }, [])
  useEffect(() => () => { body.geometry.dispose(); body.material.dispose(); outline.geometry.dispose(); outline.material.dispose() }, [body, outline])
  useLayoutEffect(() => {
    for (let i = 0; i < MAX_ENEMY_PROJECTILES; i += 1) {
      body.setMatrixAt(i, zero)
      outline.setMatrixAt(i, zero)
    }
    body.instanceMatrix.needsUpdate = true
    outline.instanceMatrix.needsUpdate = true
  }, [body, outline, resetKey])
  useFrame(() => {
    for (let i = 0; i < MAX_ENEMY_PROJECTILES; i += 1) {
      if (!enemyProjectilePool.active[i]) { body.setMatrixAt(i, zero); outline.setMatrixAt(i, zero); continue }
      position.set(enemyProjectilePool.posX[i], enemyProjectilePool.posY[i], enemyProjectilePool.posZ[i])
      matrix.compose(position, quaternion.identity(), scale)
      body.setMatrixAt(i, matrix)
      scale.setScalar(1.22); matrix.compose(position, quaternion, scale); outline.setMatrixAt(i, matrix); scale.set(1, 1, 1)
    }
    body.instanceMatrix.needsUpdate = true
    outline.instanceMatrix.needsUpdate = true
  })
  return <><primitive object={outline} renderOrder={1} /><primitive object={body} renderOrder={2} /></>
}
