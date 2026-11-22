// Wave role ground rings (2026-11-22, Terry wave standard step 2): every wave special stands on a ring coloured
// by its job (lib/waveRoleMarker.js) so "that one charges, that one shoots" reads at a glance. Fodder and every
// zombie without a wave role (stages 7-10, chiefs, bosses, crews) gets nothing.
//
// 2026-11-22 Terry "모든 좀비 발밑의 원형 시각표시 효과에 대하여 외곽선을 빼라": the ring is the coloured band
// only. The dark backing band (cartoon outline) is gone — never add an outline/edge band back under a zombie.
//
// Cost: one InstancedMesh for the whole crowd = 1 draw call, one material created once, colour per instance.
// No per-enemy mesh, material or draw call. Reads the pool only.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyPool, playerPos, screenBounds } from '../lib/refs.js'
import { WAVE_ROLE_COLORS, WAVE_ROLE_COUNT } from '../lib/waveRoleMarker.js'
import { isProjectileZombieHidden } from '../lib/projectileZombieBehavior.js'
import { isDisguisedMimic } from './ZombieInstanceLayer.jsx'
import { ENEMY_RENDER_CULLED, ENEMY_VISUAL_WORLD_SCALE, POOLED_ENEMY_CAPACITY, SPAWN_REVEAL_MS, getPooledEnemyRenderTier } from './PooledEnemyVisuals.js'

// Outer radius in body-local units (× visualScale × 0.333): just outside the arms (±0.5) and the blob shadow.
export const WAVE_ROLE_RING_RADIUS = 0.62
export const WAVE_ROLE_RING_INNER = 0.74 // coloured band = 74 %…100 % of the radius
export const WAVE_ROLE_RING_Y = 0.026 // above floor decals (≤ 0.015) and the blob shadow (0.018)
const LIMIT = POOLED_ENEMY_CAPACITY
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const IDENTITY_Q = new THREE.Quaternion()
const p = new THREE.Vector3(); const s = new THREE.Vector3(); const m = new THREE.Matrix4(); const color = new THREE.Color()
const ROLE_COLORS = WAVE_ROLE_COLORS.map((hex) => new THREE.Color(hex))

// Pool slots that get a ring this frame, in slot order. Pure (tests drive it with a fake pool).
// A ring needs: an active slot, a role code, the body past its spawn reveal, the body not hidden (E91 mimic
// disguised as a textbook, ambushers under the floor) and the slot inside the render bounds.
export function collectWaveRoleRingSlots(pool, tiers, bounds, playerX, playerZ, out, hidden = defaultHidden) {
  let count = 0
  if (!pool?.role) return 0
  const max = Math.min(LIMIT - 1, Number.isInteger(pool.highestActive) ? pool.highestActive : LIMIT - 1)
  for (let i = 0; i <= max && count < out.length; i += 1) {
    const role = pool.active[i] === 1 ? pool.role[i] : 0
    if (!role || role >= WAVE_ROLE_COUNT) { tiers[i] = ENEMY_RENDER_CULLED; continue }
    const tier = getPooledEnemyRenderTier(bounds, pool.posX[i], pool.posZ[i], playerX, playerZ, tiers[i])
    tiers[i] = tier
    if (tier === ENEMY_RENDER_CULLED || pool.spawnTimer[i] < SPAWN_REVEAL_MS || hidden(pool, i)) continue
    out[count++] = i
  }
  return count
}
function defaultHidden(pool, i) {
  return isDisguisedMimic(pool, i) || isProjectileZombieHidden(pool, i)
}

function ringMesh(inner, outer, material) {
  const geometry = new THREE.RingGeometry(inner, outer, 32, 1)
  geometry.rotateX(-Math.PI / 2)
  const mesh = new THREE.InstancedMesh(geometry, material, LIMIT)
  mesh.frustumCulled = false
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  for (let i = 0; i < LIMIT; i += 1) mesh.setMatrixAt(i, ZERO)
  mesh.count = 0
  mesh.visible = false
  return mesh
}
function upload(attribute, count, itemSize) {
  attribute.clearUpdateRanges()
  if (count > 0) attribute.addUpdateRange(0, count * itemSize)
  attribute.needsUpdate = true
}

export function createWaveRoleRingMeshes() {
  const ring = ringMesh(WAVE_ROLE_RING_INNER, 1, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false }))
  ring.setColorAt(0, color.setHex(0xffffff)); ring.instanceColor.setUsage(THREE.DynamicDrawUsage)
  ring.name = 'wave-role-ring'
  return { ring }
}

// Writes `count` rings for the given slots. Returns count.
export function writeWaveRoleRings(meshes, pool, slots, count) {
  for (let k = 0; k < count; k += 1) {
    const i = slots[k]
    const radius = (pool.visualScale[i] || 1) * ENEMY_VISUAL_WORLD_SCALE * WAVE_ROLE_RING_RADIUS
    p.set(pool.posX[i], WAVE_ROLE_RING_Y, pool.posZ[i]); s.set(radius, 1, radius)
    m.compose(p, IDENTITY_Q, s)
    meshes.ring.setMatrixAt(k, m)
    meshes.ring.setColorAt(k, ROLE_COLORS[pool.role[i]])
  }
  meshes.ring.count = count; meshes.ring.visible = count > 0
  upload(meshes.ring.instanceMatrix, count, 16)
  upload(meshes.ring.instanceColor, count, 3)
  return count
}

export default function WaveRoleRingLayer({ resetKey }) {
  const meshes = useMemo(() => createWaveRoleRingMeshes(), [])
  const tiers = useRef(new Uint8Array(LIMIT))
  const slots = useRef(new Int16Array(LIMIT))
  useEffect(() => () => { meshes.ring.geometry.dispose(); meshes.ring.material.dispose(); meshes.ring.dispose() }, [meshes])
  useLayoutEffect(() => {
    // Run reset: no ring from the previous run for even one frame.
    tiers.current.fill(0)
    writeWaveRoleRings(meshes, enemyPool, slots.current, 0)
  }, [meshes, resetKey])
  useFrame(() => {
    const count = collectWaveRoleRingSlots(enemyPool, tiers.current, screenBounds, playerPos.x, playerPos.z, slots.current)
    writeWaveRoleRings(meshes, enemyPool, slots.current, count)
  })
  return <primitive object={meshes.ring} renderOrder={1.1} />
}
