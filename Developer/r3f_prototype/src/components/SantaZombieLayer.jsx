// Body layer for the pooled Christmas Santa zombies (XSG gift-sack Santa, XSL Rudolph sleigh).
//
// Same split as ProceduralFaceZombieLayer (E07):
//  - simulation (movement, flee, contact, HP, death)   : enemyPool + enemySimulation (levelmini)
//  - health bar / spawn "poof" smoke                    : ZombieInstanceLayer (santa codes = 0 instanced parts)
//  - body + soft ground shadow                          : this layer
//
// Only one of each type is alive at a time (santaEvent.js skips a spawn while one lives),
// so each type gets two fixed slots (headroom for a death/spawn overlap frame).
// Facing comes from the slot's own position deltas (pool.yaw as the first-frame fallback),
// and XSG's flee gait reads pool.state (6 = COIN_FLEE) with measured speed as backup.
import { createRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { enemyPool, screenBounds } from '../lib/refs.js'
import { enemyTypeToCode } from '../lib/enemyEntityPool.js'
import { SPAWN_REVEAL_MS } from './PooledEnemyVisuals.js'
import SantaZombieMesh, { SANTA_SACK_ZOMBIE_TYPE, SANTA_SLEIGH_ZOMBIE_TYPE } from './SantaZombieMeshes.jsx'

const MAX_POOL_SLOTS = 200
export const SANTA_LAYER_SLOTS_PER_TYPE = 2
const POOL_STATE_COIN_FLEE = 6
const POOL_STATE_COIN_LURE = 5
// The sleigh is long: keep drawing it while its centre is up to this far outside the
// gameplay rectangle so Rudolph can enter before the entity centre does.
const OFFSCREEN_MARGIN = 3.2
// Shadow ellipse (model units before the per-entity scale): sack Santa ~ round, sleigh long.
const SHADOW_SIZE = Object.freeze({ XSG: [1.25, 1.05], XSL: [1.25, 3.7] })
const SHADOW_OFFSET_Z = Object.freeze({ XSG: -0.12, XSL: 0 })

export function getSantaLayerTypeCodes() {
  return { XSG: enemyTypeToCode(SANTA_SACK_ZOMBIE_TYPE), XSL: enemyTypeToCode(SANTA_SLEIGH_ZOMBIE_TYPE) }
}

export function isSantaLayerCandidate(pool, index, code, bounds = screenBounds) {
  if (!code || pool.active[index] !== 1 || pool.type[index] !== code || pool.spawnTimer[index] < SPAWN_REVEAL_MS) return false
  const x = pool.posX[index]; const z = pool.posZ[index]
  return !!bounds && x >= bounds.minX - OFFSCREEN_MARGIN && x <= bounds.maxX + OFFSCREEN_MARGIN
    && z >= bounds.minZ - OFFSCREEN_MARGIN && z <= bounds.maxZ + OFFSCREEN_MARGIN
}

// Pool flee hint for the sack Santa: explicit COIN states win, anything else -> undefined
// (the mesh then decides from measured speed).
export function santaSackFleeHint(poolState) {
  if (poolState === POOL_STATE_COIN_FLEE) return true
  if (poolState === POOL_STATE_COIN_LURE) return false
  return undefined
}

let _shadowGeometry = null
let _shadowMaterial = null
function shadowGeometry() {
  if (!_shadowGeometry) _shadowGeometry = new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2)
  return _shadowGeometry
}
function shadowMaterial() {
  if (!_shadowMaterial) _shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
  return _shadowMaterial
}

function makeSlots(type) {
  return Array.from({ length: SANTA_LAYER_SLOTS_PER_TYPE }, () => ({
    type,
    group: createRef(),
    turn: createRef(),
    shadow: createRef(),
    state: { current: { flash: false, fleeing: undefined } },
    track: { index: -1, generation: -1, x: 0, z: 0, yaw: 0 },
  }))
}

function driveSlot(slot, pool, index, delta) {
  const group = slot.group.current; const turn = slot.turn.current; const shadow = slot.shadow.current
  if (!group || !turn) return
  const track = slot.track
  const x = pool.posX[index]; const z = pool.posZ[index]
  const fresh = track.index !== index || track.generation !== pool.generation[index]
  if (fresh) {
    track.index = index; track.generation = pool.generation[index]
    track.yaw = Number.isFinite(pool.yaw[index]) ? pool.yaw[index] : 0
  } else {
    const dx = x - track.x; const dz = z - track.z
    if (dx * dx + dz * dz > 1e-8) {
      const target = Math.atan2(dx, dz)
      let diff = target - track.yaw
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      track.yaw += diff * Math.min(1, (delta || 0.016) * 10)
    }
  }
  track.x = x; track.z = z
  const scale = (pool.visualScale[index] || 1) * 0.333
  group.position.set(x, pool.posY[index], z)
  group.scale.setScalar(scale)
  group.visible = true
  turn.rotation.y = track.yaw
  if (shadow) {
    // ground shadow: flat at the floor, oriented with the body. No outline under the feet.
    shadow.position.set(0, (0.018 - pool.posY[index]) / scale, SHADOW_OFFSET_Z[slot.type])
    shadow.visible = true
  }
  slot.state.current.flash = pool.hitFlashTimer[index] > 0
  slot.state.current.fleeing = slot.type === SANTA_SACK_ZOMBIE_TYPE ? santaSackFleeHint(pool.state[index]) : undefined
}

function hideSlot(slot) {
  const group = slot.group.current
  if (group) group.visible = false
  slot.track.index = -1
  slot.state.current.flash = false
}

export default function SantaZombieLayer() {
  const slots = useMemo(() => ({ XSG: makeSlots(SANTA_SACK_ZOMBIE_TYPE), XSL: makeSlots(SANTA_SLEIGH_ZOMBIE_TYPE) }), [])
  const codes = useMemo(() => getSantaLayerTypeCodes(), [])

  useFrame((_, delta) => {
    const pool = enemyPool
    const used = { XSG: 0, XSL: 0 }
    if (pool && (codes.XSG || codes.XSL)) {
      const max = Math.min(MAX_POOL_SLOTS - 1, Number.isInteger(pool.highestActive) ? pool.highestActive : MAX_POOL_SLOTS - 1)
      for (let index = 0; index <= max; index += 1) {
        const type = isSantaLayerCandidate(pool, index, codes.XSG) ? 'XSG' : isSantaLayerCandidate(pool, index, codes.XSL) ? 'XSL' : null
        if (!type || used[type] >= SANTA_LAYER_SLOTS_PER_TYPE) continue
        driveSlot(slots[type][used[type]], pool, index, delta)
        used[type] += 1
      }
    }
    for (const type of ['XSG', 'XSL']) for (let n = used[type]; n < SANTA_LAYER_SLOTS_PER_TYPE; n += 1) hideSlot(slots[type][n])
  })

  return (
    <>
      {['XSG', 'XSL'].flatMap((type) => slots[type].map((slot, n) => (
        <group key={`${type}${n}`} ref={slot.group} visible={false} name={`santa-layer-${type}-${n}`}>
          <group ref={slot.turn}>
            <mesh ref={slot.shadow} geometry={shadowGeometry()} material={shadowMaterial()} scale={[SHADOW_SIZE[type][0], 1, SHADOW_SIZE[type][1]]} renderOrder={1} raycast={() => null} />
            <SantaZombieMesh type={type} stateRef={slot.state} />
          </group>
        </group>
      )))}
    </>
  )
}
