import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import spawnSmokeUrl from '../assets/effects/spawn_smoke_puff.png'
import { enemyBodies, playerPos } from '../lib/refs.js'
import { getCachedBoxGeo, getCachedToonMat, getSharedOutlineMat, getFlashMat, inflateScale, outlineMat, toonMat } from '../lib/toon.js'
import { useGameStore } from '../store/useGameStore.js'
import { logKill, logPlaytestEvent } from '../lib/playtestLogger.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { emitVfx } from '../lib/vfxEvents.js'
import { emitDamageNumber, DAMAGE_NUMBER_COLORS } from '../lib/damageNumbers.js'
import { createEnemyHitSparkEvent, resolveEnemyHitKnockback } from '../lib/enemyHitVfx.js'
import { resolveCollapseIntensity } from '../lib/enemyDeathCollapse.js'
import { canE04FireProjectile } from '../lib/stage2ProjectileRules.js'
import { getStageBounds, getStageConfig } from '../lib/stageConfig.js'
import { getStageObjectSightObstacles, isStageObjectSightBlocked } from './StageObjects/stageObjectColliders.js'
import { isPlayerWeaponSightBlocked } from '../lib/weaponTargeting.js'
import ZombieMesh from './ZombieMesh.jsx'
import MiniHealthBar from './MiniHealthBar.jsx'
import EnemyProjectileVisual from './EnemyProjectileVisual.jsx'
import { zombieVisualRegistry } from '../lib/zombieVisualRegistry.js'
import {
  MATH_TEACHER_SWING_RADIUS,
  MATH_TEACHER_SWING_RECOVERY_MS,
  MATH_TEACHER_SWING_WINDUP_MS,
  applyMathTeacherSwing,
  getMathTeacherPlayerDamage,
} from '../lib/mathTeacherSpecial.js'

// "효과 없이는 스폰 없음" — 첫 스폰에서 텍스처 로딩 지연으로 연기가 스킵되지 않도록
// 모듈 로드 시점에 스폰 연기 텍스처를 미리 로드해 캐시에 올려둔다.
// 비브라우저(테스트) 환경에서는 로더가 실패할 수 있어 방어적으로 감싼다.
// 프리로드가 실패하더라도 스폰 리빌 딜레이는 그대로 유지되므로 연기 없는 스폰은 발생하지 않는다.
if (typeof document !== 'undefined' && import.meta.env?.MODE !== 'test') {
  try {
    useLoader.preload(THREE.TextureLoader, spawnSmokeUrl)
  } catch {
    /* ignore preload failure */
  }
}

const _dir = new THREE.Vector3()
const _pos = new THREE.Vector3()
const _chargeTarget = new THREE.Vector3()
const _fireDir = new THREE.Vector3()
// setLinvel???꾨떖?섎뒗 ?ъ궗??媛앹껜 ??留??꾨젅???몃씪??媛앹껜 ?앹꽦 諛⑹?
const _vel = { x: 0, y: 0, z: 0 }

// 諛⑺뼢 ?뚯쟾 ?ы띁 ??useFrame ???⑥닔 ?ъ깮??諛⑹?瑜??꾪빐 紐⑤뱢 ?덈꺼
function _applyRotation(groupRef, dx, dz, turnRate = 0.12) {
  if (!groupRef.current) return
  if (Math.hypot(dx, dz) <= 0.0001) return
  const targetY = Math.atan2(dx, dz)
  let diff = targetY - groupRef.current.rotation.y
  while (diff >  Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  groupRef.current.rotation.y += diff * turnRate
}

export const ENEMY_SIZE_MULTIPLIER = 4 / 3
const BASE_COL = [0.14, 0.26, 0.10]
const PLAYER_CONTACT_HALF_EXTENT = 0.136
// 최우선 연출 스펙(정본): 좀비 스폰 요청 시 "펑 연기가 먼저" 300ms 동안 완벽하게
// 보인 뒤 좀비가 등장한다. 연기는 앞 300ms 불투명(opacity 1.0) 유지 후 페이드아웃.
export const ENEMY_SPAWN_REVEAL_DELAY_MS = 300
export const SPAWN_SMOKE_DURATION_MS = 800
// 앞 구간 불투명 유지 시간 = 리빌 딜레이. 이 시점까지 연기가 100% 보인 뒤 좀비가 뜬다.
export const SPAWN_SMOKE_OPAQUE_MS = ENEMY_SPAWN_REVEAL_DELAY_MS
// 줌아웃 45° 카메라에서 좀비보다 큼직하게 — 기존(0.62→1.12) 대비 2배 이상 확대.
export const SPAWN_SMOKE_START_SCALE = 1.7
export const SPAWN_SMOKE_END_SCALE = 3.1

// 경과 시간(ms) → 연기 불투명도. 앞 SPAWN_SMOKE_OPAQUE_MS 동안 1.0 유지 후 선형 페이드아웃.
export function getSpawnSmokeOpacity(elapsedMs) {
  if (elapsedMs <= SPAWN_SMOKE_OPAQUE_MS) return 1
  const fadeSpan = SPAWN_SMOKE_DURATION_MS - SPAWN_SMOKE_OPAQUE_MS
  if (fadeSpan <= 0) return 0
  return Math.max(0, 1 - (elapsedMs - SPAWN_SMOKE_OPAQUE_MS) / fadeSpan)
}
export const ENEMY_SPAWN_SFX_COOLDOWN_MS = 110
// Wall half-thickness (0.5) + Matilda's widest collider half-extent (0.56),
// with a small physics tolerance so a wall collision cannot stall the loop.
export const MATILDA_EDGE_INSET = 1.2
export const MATILDA_LAUGH_DURATION_MS = 900
export const MATILDA_CHARGE_STALL_REVERSE_MS = 70
export const MATILDA_CHARGE_STALL_MOVE_RATIO = 0.18

export function hasMatildaReachedStageEdge(position, bounds, inset = MATILDA_EDGE_INSET) {
  return Math.abs(position.x) >= bounds.halfX - inset
    || Math.abs(position.z) >= bounds.halfZ - inset
}

export function isMatildaChargingOutward(position, direction, bounds, inset = MATILDA_EDGE_INSET) {
  return (position.x >= bounds.halfX - inset && direction.x > 0)
    || (position.x <= -bounds.halfX + inset && direction.x < 0)
    || (position.z >= bounds.halfZ - inset && direction.z > 0)
    || (position.z <= -bounds.halfZ + inset && direction.z < 0)
}

export function isMatildaChargeBlockedFrame({
  movedAlong,
  expectedMove,
  distanceToPlayer,
  hitDistance,
  moveRatio = MATILDA_CHARGE_STALL_MOVE_RATIO,
}) {
  if (expectedMove <= 0.0001) return false
  if (distanceToPlayer <= hitDistance + 0.08) return false
  return movedAlong < expectedMove * moveRatio
}

export function shouldReverseMatildaChargeOnObstacle({
  movedAlong,
  expectedMove,
  distanceToPlayer,
  hitDistance,
  stalledMs,
}) {
  return isMatildaChargeBlockedFrame({ movedAlong, expectedMove, distanceToPlayer, hitDistance })
    && stalledMs >= MATILDA_CHARGE_STALL_REVERSE_MS
}

export function advanceEnemySpawnTimer(elapsedMs, deltaSec, phase) {
  return phase === 'playing' ? elapsedMs + deltaSec * 1000 : elapsedMs
}

function stableEnemyHash(enemyId) {
  let hash = 0
  for (const char of String(enemyId)) hash = ((hash * 31) + char.charCodeAt(0)) | 0
  return hash >>> 0
}

function stableEnemySide(enemyId) {
  return (stableEnemyHash(enemyId) & 1) === 0 ? 1 : -1
}

export function resolveSightBlockedEnemyVelocity({ blocked, enemyId, dirX, dirZ, speed }) {
  if (!blocked) return null
  const length = Math.hypot(dirX, dirZ)
  if (length <= 1e-8) return { x: 0, z: 0 }
  const side = stableEnemySide(enemyId)
  const wanderSpeed = speed * 0.55
  return {
    x: (-dirZ / length) * side * wanderSpeed,
    z: (dirX / length) * side * wanderSpeed,
  }
}

let _lastEnemySpawnSfxAt = Number.NEGATIVE_INFINITY

export function resetEnemySpawnSfxGateForTest() {
  _lastEnemySpawnSfxAt = Number.NEGATIVE_INFINITY
}

export function getEnemySpawnSfx(type, isMatilda = false) {
  if (isMatilda) return { id: 'matildaSpawn', volume: 0.72 }
  if (type === 'B01' || type === 'B02' || type === 'B03') return { id: 'bossSpawn', volume: 0.78 }
  return { id: 'zombieSpawn', volume: 0.42 }
}

function emitEnemySpawnSfx(type, isMatilda = false) {
  const now = performance.now()
  const sfx = getEnemySpawnSfx(type, isMatilda)
  const isBossLike = isMatilda || type === 'B01' || type === 'B02' || type === 'B03'
  if (!isBossLike && now - _lastEnemySpawnSfxAt < ENEMY_SPAWN_SFX_COOLDOWN_MS) return
  _lastEnemySpawnSfxAt = now
  emitSfx({ id: sfx.id, volume: sfx.volume })
}

export function getBodyContactDistance(stats) {
  const enemyHalfExtent = Math.max(BASE_COL[0], BASE_COL[2]) * (stats.scale ?? 1) * ENEMY_SIZE_MULTIPLIER
  return enemyHalfExtent + PLAYER_CONTACT_HALF_EXTENT
}

export function getChargeHitDistance(stats, isMatilda = false) {
  return isMatilda
    ? getBodyContactDistance(stats)
    : stats.contactDist * ENEMY_SIZE_MULTIPLIER * 1.5
}

// XP 媛믪? 援먭낵??30% ?쒕엻瑜좎쓣 蹂댁젙????3.3諛곕줈 梨낆젙 (Planner/B.寃뚯엫湲고쉷,諛몃윴??援ы쁽/B-1 罹먮┃???깆옣,?λ젰移??낃렇?덉씠??援ъ“ 援ы쁽/Rewards_Drops/dual_drop_system_2026-05-08.md 짠7-2).
export const ENEMY_STATS = {
  E01: { hp: 8,    speed: 0.475, damage: 8,  scale: 1.00, xp: 6,  contactDist: 0.28 },
  E02: { hp: 70,   speed: 0.385, damage: 14, scale: 1.40, xp: 15, contactDist: 0.36 },
  E03: { hp: 14,   speed: 1.1,  damage: 6,  scale: 0.75, xp: 5,  contactDist: 0.22 },
  E04: { hp: 32,   speed: 0.45, damage: 8,  scale: 0.90, xp: 10, contactDist: 0.26,
         ranged: true, rangedCooldown: 2200, rangedDmg: 8, rangedSpeed: 1.9,
         preferDist: 5.5, minDist: 3.5 },
  E05: { hp: 70,   speed: 0.5,  damage: 16, scale: 1.15, xp: 15, contactDist: 0.32,
         charger: true, chargeSpeed: 1.7, warnDist: 4.5, warnDuration: 700, stunDuration: 1000, chargeDuration: 1200 },
  E06: { hp: 320,  speed: 0.6,  damage: 20, scale: 1.60, xp: 56, contactDist: 0.42 },
  // Stage 3 Run Zombie crew: screen-crossing melee swarm, not a boss.
  RZL: { hp: 90,   speed: 2.45, damage: 14, scale: 1.08, xp: 12, contactDist: 0.28, runCrew: true },
  RZC: { hp: 28,   speed: 2.18, damage: 7,  scale: 0.78, xp: 5,  contactDist: 0.22, runCrew: true },
  // B01 1?ㅽ뀒?댁?: 遺梨꾧섦 ?ъ궗泥??⑦꽩 ?쒓굅. 異붽꺽/?뚯쭊留??ъ슜 (Bang_Rules 2026-05-09 遺濡?.
  // contactDist 0.36: regular charge keeps the 1.5x grace distance; Matilda charge uses exact body contact only.
  // ?댁쟾 0.80? ?묒큺 諛섍꼍??~1.6?대씪 蹂몄껜 ?명삎蹂대떎 ?⑥뵮 而ㅼ꽌 "???우븘???쇨꺽"?섎뒗 臾몄젣媛 ?덉뿀??
  B01: { hp: 1150, speed: 0.475, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         charger: true, mathTeacherSpecial: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
  B02: { hp: 1150, speed: 0.475, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
  B03: { hp: 1150, speed: 0.475, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
  B04: { hp: 1150, speed: 0.475, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36 },
}

// 肄쒕씪?대뜑 湲곕낯 諛섑겕湲?(scale=1 湲곗?)
export function resolveRangedEnemyVelocity({ dirX, dirZ, dist, minDist, preferDist, speed, strafeSign = 1 }) {
  const len = Math.hypot(dirX, dirZ) || 1
  const nx = dirX / len
  const nz = dirZ / len
  if (dist < minDist) return { x: -nx * speed, z: -nz * speed }
  if (dist > preferDist) return { x: nx * speed, z: nz * speed }
  const side = strafeSign >= 0 ? 1 : -1
  return { x: -nz * speed * 0.75 * side, z: nx * speed * 0.75 * side }
}

function deathSfxId(type, isMatilda) {
  if (isMatilda) return 'matildaDeath'
  if (type === 'B01' || type === 'B02' || type === 'B03') return 'bossDeath'
  if (type === 'E06' || type === 'E02') return 'zombieHeavyDeath'
  return 'zombieDeath'
}

export const CHARGE_CUE_LABEL = 'GO!'

export const CHARGE_CUE_LAYOUT = {
  y: 1.75,
  pulseScale: 0.08,
  billboard: true,
  parts: {
    bubble: { size: [1.05, 0.46, 0.08], position: [0, 0.07, 0], outlineScale: 1.08 },
    tail: { size: [0.22, 0.18, 0.08], position: [-0.28, -0.25, 0], rotation: [0, 0, 0.72], outlineScale: 1.08 },
    gVertical: { size: [0.08, 0.27, 0.06], position: [-0.36, 0.08, 0.08], outlineScale: 1.04 },
    gTop: { size: [0.22, 0.07, 0.06], position: [-0.26, 0.20, 0.08], outlineScale: 1.04 },
    gBottom: { size: [0.22, 0.07, 0.06], position: [-0.26, -0.04, 0.08], outlineScale: 1.04 },
    gMiddle: { size: [0.15, 0.07, 0.06], position: [-0.20, 0.06, 0.08], outlineScale: 1.04 },
    oLeft: { size: [0.08, 0.27, 0.06], position: [0.02, 0.08, 0.08], outlineScale: 1.04 },
    oRight: { size: [0.08, 0.27, 0.06], position: [0.22, 0.08, 0.08], outlineScale: 1.04 },
    oTop: { size: [0.20, 0.07, 0.06], position: [0.12, 0.20, 0.08], outlineScale: 1.04 },
    oBottom: { size: [0.20, 0.07, 0.06], position: [0.12, -0.04, 0.08], outlineScale: 1.04 },
    bang: { size: [0.07, 0.25, 0.06], position: [0.42, 0.10, 0.08], outlineScale: 1.04 },
    bangDot: { radius: 0.045, position: [0.42, -0.08, 0.08], outlineScale: 1.05 },
  },
}

// outlineMat(0.92) for charge cue ??zombie outline is 0.96, charge cue uses slightly lighter
let _chargeCueOutlineMat = null
const getChargeCueOutlineMat = () => {
  if (!_chargeCueOutlineMat) _chargeCueOutlineMat = outlineMat(0.92)
  return _chargeCueOutlineMat
}

function ChargeCueBlock({ size, position, rotation = [0, 0, 0], color, emissive = 0.22, outlineScale = 1.12 }) {
  const geo    = getCachedBoxGeo(...size)
  const outMat = getChargeCueOutlineMat()
  const mat    = getCachedToonMat(color, emissive)
  const os     = inflateScale(outlineScale)

  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={3} geometry={geo} material={outMat} scale={[os, os, os]} />
      <mesh renderOrder={4} geometry={geo} material={mat} />
    </group>
  )
}

function ChargeCueDot({ radius, position, color, emissive = 0.26, outlineScale = 1.18 }) {
  const mat    = getCachedToonMat(color, emissive)
  const outMat = getChargeCueOutlineMat()
  const geo    = useMemo(() => new THREE.SphereGeometry(radius, 12, 8), [radius])
  const os = inflateScale(outlineScale)

  return (
    <group position={position}>
      <mesh renderOrder={3} geometry={geo} material={outMat} scale={[os, os, os]} />
      <mesh renderOrder={4} geometry={geo} material={mat} />
    </group>
  )
}

function ChargeToonCue({ y }) {
  const ref = useRef()

  useFrame((state) => {
    if (!ref.current) return
    const t = performance.now() * 0.001
    const pulse = 1 + Math.sin(t * 12) * CHARGE_CUE_LAYOUT.pulseScale
    ref.current.scale.set(pulse, pulse, pulse)
    ref.current.lookAt(state.camera.position)
  })

  const { parts } = CHARGE_CUE_LAYOUT
  return (
    <group ref={ref} position={[0, y, 0]}>
      <ChargeCueBlock {...parts.bubble} color={0xfff4d8} emissive={0.10} />
      <ChargeCueBlock {...parts.tail} color={0xfff4d8} emissive={0.10} />
      <ChargeCueBlock {...parts.gVertical} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.gTop} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.gBottom} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.gMiddle} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.oLeft} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.oRight} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.oTop} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.oBottom} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.bang} color={0xff392e} emissive={0.28} />
      <ChargeCueDot {...parts.bangDot} color={0xff392e} emissive={0.32} />
    </group>
  )
}

// ?? ???ъ궗泥?(E04 ?먭굅由??꾩슜. B01 遺梨꾧섦 ?⑦꽩? 2026-05-09 ?먭린) ??????????????
let _projId = 0
const _activeE04ProjectileIds = new Set()

export function getActiveE04ProjectileCount() {
  return _activeE04ProjectileIds.size
}

export function resetActiveE04ProjectileCountForTest() {
  _activeE04ProjectileIds.clear()
}

function registerE04Projectile(id) {
  _activeE04ProjectileIds.add(id)
}

function unregisterE04Projectile(id) {
  _activeE04ProjectileIds.delete(id)
}

function EnemyProjectile({ id, position, velocity, damage, onExpire }) {
  const rb      = useRef()
  const ageRef  = useRef(0)
  const hitRef  = useRef(false)

  useFrame((_, delta) => {
    if (!rb.current) return
    ageRef.current += delta
    if (ageRef.current > 3.2) onExpire(id)
  })

  return (
    <RigidBody
      ref={rb}
      type="dynamic"
      position={position}
      linearVelocity={velocity}
      lockRotations
      colliders={false}
      gravityScale={0}
      sensor
      onIntersectionEnter={({ other }) => {
        if (hitRef.current) return
        if (other.rigidBody?._playerHit) {
          hitRef.current = true
          other.rigidBody._playerHit(damage)
          onExpire(id)
        }
      }}
    >
      <CuboidCollider args={[0.09, 0.09, 0.09]} sensor />
      <EnemyProjectileVisual />
    </RigidBody>
  )
}

// ?? HP 諛?????????????????????????????????????????????????????????????????????
// ?? 硫붿씤 Enemy 而댄룷?뚰듃 ???????????????????????????????????????????????????????
// E01-E06 standard zombies render via ZombieInstanceLayer (instanced). B01 + Matilda use React mesh.
const INSTANCED_TYPES = new Set(['E01', 'E02', 'E03', 'E04', 'E05', 'E06'])

export function EnemyVisual({ type = 'E01', animPhase = 'normal', hitFlash = false, hp, showHealthBar = true, groupRef = null, isMatilda = false, forceMesh = false }) {
  const stats = ENEMY_STATS[type] ?? ENEMY_STATS.E01
  const cs = stats.scale * ENEMY_SIZE_MULTIPLIER
  const useInstanced = !forceMesh && !isMatilda && INSTANCED_TYPES.has(type)
  const currentHp = hp ?? stats.hp

  return (
    <>
      <group ref={groupRef} scale={[cs * 0.333, cs * 0.333, cs * 0.333]}>
        {/* E01-E06: rendered imperatively by ZombieInstanceLayer ??no mesh here */}
        {!useInstanced && <ZombieMesh type={type} animPhase={animPhase} hitFlash={hitFlash} isMatilda={isMatilda} />}
        {stats.charger && animPhase === 'warn' && <ChargeToonCue y={CHARGE_CUE_LAYOUT.y} />}
      </group>
      {showHealthBar && <MiniHealthBar current={currentHp} max={stats.hp} width={0.32 * cs} height={0.045} y={0.72 * cs} />}
    </>
  )
}

export function SpawnSmokeEffect({ position, visualScale, frozen = false }) {
  const billboardRef = useRef()
  const materialRef = useRef()
  const elapsedMsRef = useRef(0)
  const [done, setDone] = useState(false)
  const phase = useGameStore((s) => s.phase)
  const texture = useLoader(THREE.TextureLoader, spawnSmokeUrl)
  texture.colorSpace = THREE.SRGBColorSpace

  useFrame((_, delta) => {
    const billboard = billboardRef.current
    const material = materialRef.current
    if (!billboard || !material) return
    if (!frozen) elapsedMsRef.current = advanceEnemySpawnTimer(elapsedMsRef.current, delta, phase)
    const elapsed = elapsedMsRef.current
    const t = Math.min(1, elapsed / SPAWN_SMOKE_DURATION_MS)
    const ease = 1 - (1 - t) * (1 - t)
    const size = visualScale * (
      SPAWN_SMOKE_START_SCALE + ease * (SPAWN_SMOKE_END_SCALE - SPAWN_SMOKE_START_SCALE)
    )
    billboard.scale.set(size, size, 1)
    billboard.position.y = position[1] + visualScale * (1.0 + t * 0.32)
    // 앞 300ms(리빌 딜레이) 동안 opacity 1.0 유지 후 페이드아웃
    material.opacity = getSpawnSmokeOpacity(elapsed)
    if (t >= 1) setDone(true)
  })

  if (done) return null

  const startSize = visualScale * SPAWN_SMOKE_START_SCALE
  return (
    <Billboard
      ref={billboardRef}
      follow
      position={[position[0], position[1] + visualScale, position[2]]}
      scale={[startSize, startSize, 1]}
    >
      <mesh renderOrder={100}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          opacity={1}
          alphaTest={0.01}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  )
}

export default function Enemy({ id, type = 'E01', spawnPos, onDeath, statOverride, isMatilda = false, runCrewDir = null }) {
  const rb       = useRef()
  const groupRef = useRef()
  const stats    = { ...(ENEMY_STATS[type] ?? ENEMY_STATS.E01), ...statOverride }
  const cs       = stats.scale * ENEMY_SIZE_MULTIPLIER
  const colArgs  = [BASE_COL[0] * cs, BASE_COL[1] * cs, BASE_COL[2] * cs]

  const [hp, setHp]           = useState(stats.hp)
  const [hitFlash, setHitFlash] = useState(false)
  const [spawnRevealed, setSpawnRevealed] = useState(false)
  const hitFlashRef           = useRef(false)  // ref mirror for instanced renderer
  const hpRef                 = useRef(stats.hp)
  const useInstanced = !isMatilda && INSTANCED_TYPES.has(type)
  const dead                  = useRef(false)
  const knockbackUntilRef     = useRef(0)
  const knockbackDir          = useRef(new THREE.Vector3())
  const knockbackSpeedRef     = useRef(3.8)
  const lastContactDmgRef     = useRef(0)
  const spawnedAtRef          = useRef(performance.now())
  const spawnRevealElapsedRef = useRef(0)

  // E05 / B01 ?뚯쭊 ?곹깭 癒몄떊
  const [animPhase, setAnimPhase] = useState('normal') // normal|warn|charge|special|stun|retreat
  const chargeState  = useRef(isMatilda ? 'matildaAim' : 'chase')
  const stateTimer   = useRef(0)
  const matildaLaughRemainingRef = useRef(0)
  const matildaLaughCuePendingRef = useRef(false)
  const matildaChargeStallMsRef = useRef(0)
  const matildaPreviousChargePosRef = useRef({ x: spawnPos[0], z: spawnPos[2] })
  const chargeDir    = useRef(new THREE.Vector3())

  // E04 / B01 ?ъ궗泥?
  const [projectiles, setProjectiles] = useState([])
  const projectilesRef = useRef([])
  const lastFireRef = useRef(0)

  const damagePlayer = useGameStore((s) => s.damagePlayer)
  const phase        = useGameStore((s) => s.phase)
  const currentStageId = useGameStore((s) => s.currentStageId)
  const sightObstacles = useMemo(() => getStageObjectSightObstacles(currentStageId), [currentStageId])
  const sightBlockedRef = useRef(false)
  const nextSightCheckRef = useRef(0)

  useEffect(() => {
    setSpawnRevealed(false)
    spawnRevealElapsedRef.current = 0
    spawnedAtRef.current = performance.now()
    chargeState.current = isMatilda ? 'matildaLaugh' : 'chase'
    matildaLaughRemainingRef.current = isMatilda ? MATILDA_LAUGH_DURATION_MS : 0
    matildaLaughCuePendingRef.current = isMatilda
    matildaChargeStallMsRef.current = 0
    matildaPreviousChargePosRef.current.x = spawnPos[0]
    matildaPreviousChargePosRef.current.z = spawnPos[2]
    sightBlockedRef.current = false
    nextSightCheckRef.current = useGameStore.getState().elapsedMs + (stableEnemyHash(id) % 90)
    setAnimPhase(isMatilda ? 'stun' : 'normal')
    emitEnemySpawnSfx(type, isMatilda)
  }, [id, type, isMatilda])

  useEffect(() => {
    projectilesRef.current = projectiles
  }, [projectiles])

  useEffect(() => () => {
    if (type !== 'E04') return
    projectilesRef.current.forEach((projectile) => unregisterE04Projectile(projectile.id))
  }, [type])

  useEffect(() => {
    if (!spawnRevealed) return
    // Registry registration must happen regardless of rb.current — the visual
    // layer only needs spawn pos/type, not the physics body.
    if (useInstanced) {
      zombieVisualRegistry.register(id, { x: spawnPos[0], y: spawnPos[1], z: spawnPos[2], yaw: 0, type, phase: 'chase', wt: 0, vs: cs * 0.333, hitFlash: false })
    }
    if (!rb.current) return
    enemyBodies.set(id, rb.current)
    rb.current._enemyHit = (dmg, impact = {}) => {
      if (dead.current) return
      const hitPos = rb.current.translation()
      if (!impact.ignoreSightBlock && isPlayerWeaponSightBlocked(hitPos, useGameStore.getState().currentStageId)) return
      emitVfx(createEnemyHitSparkEvent({
        x: hitPos.x,
        y: Math.max(0.34, 0.42 * cs),
        z: hitPos.z,
      }))
      // 모든 무기가 이 지점(_enemyHit)을 공통으로 지난다 → 여기서 데미지 숫자 1회 emit하면 무기별 누락이 없다.
      emitDamageNumber({
        x: hitPos.x,
        y: Math.max(0.8, 0.95 * cs),
        z: hitPos.z,
        amount: dmg,
        colorHex: DAMAGE_NUMBER_COLORS.enemy,
      })
      setHitFlash(true)
      hitFlashRef.current = true
      requestAnimationFrame(() => { setHitFlash(false); hitFlashRef.current = false })
      if (impact?.sfxId) emitSfx({ id: impact.sfxId, volume: 0.6 })
      const knockback = resolveEnemyHitKnockback(impact)
      if (knockback.speed > 0) {
        const t = hitPos
        const sx = knockback.source?.x ?? playerPos.x
        const sz = knockback.source?.z ?? playerPos.z
        const dx = t.x - sx
        const dz = t.z - sz
        const len = Math.hypot(dx, dz) || 1
        knockbackDir.current.set(dx / len, 0, dz / len)
        knockbackSpeedRef.current = knockback.speed
        knockbackUntilRef.current = performance.now() + knockback.durationMs
        rb.current.setLinvel({
          x: knockbackDir.current.x * knockback.speed,
          y: 0,
          z: knockbackDir.current.z * knockback.speed,
        }, true)
      }
      hpRef.current -= dmg
      setHp(hpRef.current)
      if (hpRef.current <= 0) {
        dead.current = true
        rb.current._enemyDead = true
        rb.current._enemyHit = null
        enemyBodies.delete(id)
        // 죽는 즉시 제거 — useEffect cleanup은 React 커밋 후라서 늦음
        if (useInstanced) zombieVisualRegistry.unregister(id)
        // 蹂???泥섏튂 移댁슫??+ 蹂댁뒪 泥섏튂 利됱떆 ?꾩쟻
        const store = useGameStore.getState()
        store.recordKill()
        emitSfx({ id: deathSfxId(type, isMatilda) })
        // 留덊떥?ㅻ뒗 B01 鍮꾩＜?쇱쓣 ?곗?留??대━??泥섎━?섏? ?딅뒗??
        if ((type === 'B01' || type === 'B02' || type === 'B03') && !isMatilda) {
          store.recordBossKill()
          store.clearStageWithBossBonus()
        }
        logKill(type)
        const t = rb.current?.translation()
        // 留됲? ?꾨젰?쇰줈 諛뺤궡 媛뺣룄(??以?媛? 寃곗젙. impact.knockback? 臾닿린 ?먯쿇 ?됰갚(?놁쑝硫?0).
        const intensity = resolveCollapseIntensity({
          killingDamage: dmg,
          maxHp: stats.hp,
          knockback: impact.knockback ?? 0,
        })
        onDeath?.(id, {
          pos: t ? [t.x, t.y, t.z] : [...spawnPos],
          xp: stats.xp,
          type,
          visualScale: cs * 0.333,
          intensity,
          styleOverride: impact.deathStyleOverride,
          facingY: groupRef.current?.rotation.y ?? 0,
        })
      }
    }
    rb.current._enemyId   = id
    rb.current._enemyType = type
    return () => {
      enemyBodies.delete(id)
      if (useInstanced) zombieVisualRegistry.unregister(id)
    }
  }, [id, onDeath, spawnPos, stats.xp, type, cs, useInstanced, spawnRevealed])

  const expireProjectile = useCallback((pid) => {
    if (type === 'E04') unregisterE04Projectile(pid)
    setProjectiles((prev) => prev.filter((p) => p.id !== pid))
  }, [type])

  useFrame((_, delta) => {
    if (!spawnRevealed) {
      spawnRevealElapsedRef.current = advanceEnemySpawnTimer(spawnRevealElapsedRef.current, delta, phase)
      if (spawnRevealElapsedRef.current >= ENEMY_SPAWN_REVEAL_DELAY_MS) {
        spawnedAtRef.current = performance.now()
        setSpawnRevealed(true)
      }
      return
    }
    if (!rb.current || dead.current || phase !== 'playing') return

    const t = rb.current.translation()
    _pos.set(t.x, t.y, t.z)
    _dir.copy(playerPos).sub(_pos)
    _dir.y = 0
    const dist = _dir.length()

    // Update visual registry immediately — before any early return (knockback/ranged/charger)
    if (useInstanced) {
      zombieVisualRegistry.update(id, {
        x: t.x, y: t.y, z: t.z,
        yaw: groupRef.current?.rotation.y ?? 0,
        type,
        phase: chargeState.current,
        wt: performance.now() * 0.001,
        vs: cs * 0.333,
        hitFlash: hitFlashRef.current,
      })
    }

    const now = performance.now()

    if (stats.runCrew) {
      const dirX = runCrewDir?.x ?? 0.72
      const dirZ = runCrewDir?.z ?? 0.72
      const len = Math.hypot(dirX, dirZ) || 1
      const nx = dirX / len
      const nz = dirZ / len
      _vel.x = nx * stats.speed
      _vel.y = 0
      _vel.z = nz * stats.speed
      rb.current.setLinvel(_vel, true)
      _applyRotation(groupRef, nx, nz, 0.9)

      if (dist < stats.contactDist * ENEMY_SIZE_MULTIPLIER && now - lastContactDmgRef.current >= 500) {
        lastContactDmgRef.current = now
        damagePlayer(stats.damage)
      }

      const bounds = getStageBounds(currentStageId)
      const outPad = 6.0
      if (Math.abs(t.x) > bounds.halfX + outPad || Math.abs(t.z) > bounds.halfZ + outPad) {
        dead.current = true
        rb.current._enemyDead = true
        rb.current._enemyHit = null
        enemyBodies.delete(id)
        onDeath?.(id, null)
      }
      return
    }

    if (now < knockbackUntilRef.current) {
      _vel.x = knockbackDir.current.x * knockbackSpeedRef.current
      _vel.y = 0
      _vel.z = knockbackDir.current.z * knockbackSpeedRef.current
      rb.current.setLinvel(_vel, true)
      return
    }

    const elapsedMs = useGameStore.getState().elapsedMs
    if (!isMatilda && elapsedMs >= nextSightCheckRef.current) {
      sightBlockedRef.current = isStageObjectSightBlocked(t, playerPos, sightObstacles)
      nextSightCheckRef.current = elapsedMs + 90 + (stableEnemyHash(id) % 31)
    }
    const sightBlockedVelocity = resolveSightBlockedEnemyVelocity({
      blocked: sightBlockedRef.current,
      enemyId: id,
      dirX: _dir.x,
      dirZ: _dir.z,
      speed: stats.speed,
    })
    if (sightBlockedVelocity) {
      _vel.x = sightBlockedVelocity.x
      _vel.y = 0
      _vel.z = sightBlockedVelocity.z
      rb.current.setLinvel(_vel, true)
      _applyRotation(groupRef, _vel.x, _vel.z)
      return
    }

    const updateRotation = (dx, dz, tr) => _applyRotation(groupRef, dx, dz, tr)


    // ?? E04: ?먭굅由?媛먯뿼泥??????????????????????????????????????????????????
    if (stats.ranged) {
      const now = performance.now()
      // ?먰븯??嫄곕━ ?좎?: ?덈Т 媛源뚯슦硫??꾪눜, ?덈Т 硫硫??꾩쭊
      _vel.y = 0
      const rangedVelocity = resolveRangedEnemyVelocity({
        dirX: _dir.x,
        dirZ: _dir.z,
        dist,
        minDist: stats.minDist,
        preferDist: stats.preferDist,
        speed: stats.speed,
        strafeSign: Number(id) % 2 === 0 ? 1 : -1,
      })
      _vel.x = rangedVelocity.x
      _vel.z = rangedVelocity.z
      rb.current.setLinvel(_vel, true)
      if (_dir.length() > 0) updateRotation(_dir.x / _dir.length(), _dir.z / _dir.length())

      const elapsedSec = useGameStore.getState().elapsedMs / 1000
      const stageConfig = getStageConfig(currentStageId)
      const bossPressureStartSec = stageConfig.bossWarningSec ?? 120
      const bossPressureEndSec = stageConfig.escapePortalSec ?? 150
      const canFire = (currentStageId === 'stage2' || currentStageId === 'stage3') && canE04FireProjectile({
        elapsedSec,
        ageMs: now - spawnedAtRef.current,
        activeProjectileCount: type === 'E04' ? getActiveE04ProjectileCount() : projectiles.length,
        distanceToPlayer: dist,
        lastFireElapsedMs: lastFireRef.current,
        nowMs: now,
        cooldownMs: stats.rangedCooldown,
        bossPressure: elapsedSec >= bossPressureStartSec && elapsedSec < bossPressureEndSec,
      })

      // ?ъ궗泥?諛쒖궗
      if (canFire) {
        lastFireRef.current = now
        _fireDir.copy(_dir).normalize()
        const projectileId = ++_projId
        if (type === 'E04') registerE04Projectile(projectileId)
        setProjectiles((prev) => [...prev, {
          id: projectileId,
          position: [_pos.x, _pos.y, _pos.z],
          velocity: [_fireDir.x * stats.rangedSpeed, 0, _fireDir.z * stats.rangedSpeed],
          damage: stats.rangedDmg,
        }])
      }
      return
    }

    // ?? E05 / B01 ?뚯쭊 ?곹깭 癒몄떊 ???????????????????????????????????????????
    if (stats.charger) {
      const now = performance.now()

      _vel.y = 0
      if (isMatilda) {
        if (chargeState.current === 'matildaAim') {
          if (dist > 0.0001) {
            chargeDir.current.copy(_dir).normalize()
          } else {
            chargeDir.current.set(-t.x, 0, -t.z).normalize()
          }
          matildaPreviousChargePosRef.current.x = t.x
          matildaPreviousChargePosRef.current.z = t.z
          matildaChargeStallMsRef.current = 0
          chargeState.current = 'charge'
          setAnimPhase('charge')
          updateRotation(chargeDir.current.x, chargeDir.current.z, 1)
          emitSfx({ id: 'matildaDash', volume: 0.76 })
        } else if (chargeState.current === 'charge') {
          const cd = chargeDir.current
          const previous = matildaPreviousChargePosRef.current
          const movedAlong = (t.x - previous.x) * cd.x + (t.z - previous.z) * cd.z
          const expectedMove = stats.chargeSpeed * delta
          const hitDistance = getChargeHitDistance(stats, true)
          const blockedFrame = isMatildaChargeBlockedFrame({
            movedAlong,
            expectedMove,
            distanceToPlayer: dist,
            hitDistance,
          })
          matildaChargeStallMsRef.current = blockedFrame
            ? matildaChargeStallMsRef.current + delta * 1000
            : 0
          if (shouldReverseMatildaChargeOnObstacle({
            movedAlong,
            expectedMove,
            distanceToPlayer: dist,
            hitDistance,
            stalledMs: matildaChargeStallMsRef.current,
          })) {
            cd.multiplyScalar(-1)
            matildaChargeStallMsRef.current = 0
            emitSfx({ id: 'matildaDash', volume: 0.52, rate: 0.88 })
          }
          previous.x = t.x
          previous.z = t.z
          _vel.x = cd.x * stats.chargeSpeed
          _vel.z = cd.z * stats.chargeSpeed
          rb.current.setLinvel(_vel, true)
          updateRotation(cd.x, cd.z, 1)

          if (dist < getChargeHitDistance(stats, true) && now - lastContactDmgRef.current >= 500) {
            lastContactDmgRef.current = now
            damagePlayer(stats.damage)
          }

          if (isMatildaChargingOutward(t, cd, getStageBounds(currentStageId))) {
            chargeState.current = 'matildaLaugh'
            matildaLaughRemainingRef.current = MATILDA_LAUGH_DURATION_MS
            matildaChargeStallMsRef.current = 0
            setAnimPhase('stun')
            _vel.x = 0
            _vel.z = 0
            rb.current.setLinvel(_vel, true)
            emitSfx({ id: 'matildaLaugh', volume: 0.82 })
          }
        } else if (chargeState.current === 'matildaLaugh') {
          _vel.x = 0
          _vel.z = 0
          rb.current.setLinvel(_vel, true)
          if (dist > 0.0001) updateRotation(_dir.x / dist, _dir.z / dist, 0.22)
          if (matildaLaughCuePendingRef.current) {
            matildaLaughCuePendingRef.current = false
            emitSfx({ id: 'matildaLaugh', volume: 0.82 })
          }
          matildaLaughRemainingRef.current -= delta * 1000
          if (matildaLaughRemainingRef.current <= 0) {
            chargeState.current = 'matildaAim'
          }
        }
        return
      }

      if (chargeState.current === 'chase') {
        // ?쇰컲 異붽꺽
        _dir.normalize()
        _vel.x = _dir.x * stats.speed; _vel.z = _dir.z * stats.speed
        rb.current.setLinvel(_vel, true)
        updateRotation(_dir.x, _dir.z)

        if (dist < stats.warnDist) {
          chargeState.current = 'warn'
          stateTimer.current = now
          chargeDir.current.copy(_dir)
          updateRotation(chargeDir.current.x, chargeDir.current.z, 0.75)
          setAnimPhase('warn')
          _vel.x = 0; _vel.z = 0
          rb.current.setLinvel(_vel, true)
        }

      } else if (chargeState.current === 'warn') {
        updateRotation(chargeDir.current.x, chargeDir.current.z, 0.45)
        if (now - stateTimer.current >= stats.warnDuration) {
          chargeState.current = 'charge'
          stateTimer.current = now
          setAnimPhase('charge')
          chargeDir.current.normalize()
          updateRotation(chargeDir.current.x, chargeDir.current.z, 1)
        }

      } else if (chargeState.current === 'charge') {
        const cd = chargeDir.current
        _vel.x = cd.x * stats.chargeSpeed; _vel.z = cd.z * stats.chargeSpeed
        rb.current.setLinvel(_vel, true)
        updateRotation(cd.x, cd.z, 1)

        const hitPlayer = dist < getChargeHitDistance(stats, isMatilda)
        const chargeExpired = now - stateTimer.current > (stats.chargeDuration ?? 1200)
        if (hitPlayer || chargeExpired) {
          if (hitPlayer) damagePlayer(stats.damage)
          chargeState.current = stats.mathTeacherSpecial ? 'mathSwingWindup' : 'stun'
          stateTimer.current = now
          setAnimPhase(stats.mathTeacherSpecial ? 'special' : 'stun')
          if (stats.mathTeacherSpecial) {
            logPlaytestEvent('b01-math-special-start', {
              bossId: id,
              trigger: hitPlayer ? 'charge-hit' : 'charge-timeout',
            })
          }
          _vel.x = 0; _vel.z = 0
          rb.current.setLinvel(_vel, true)
        }

      } else if (chargeState.current === 'mathSwingWindup') {
        _vel.x = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        if (dist > 0.0001) updateRotation(_dir.x / dist, _dir.z / dist, 0.30)
        if (now - stateTimer.current >= MATH_TEACHER_SWING_WINDUP_MS) {
          const pushedZombies = applyMathTeacherSwing({
            bodies: enemyBodies,
            bossId: id,
            origin: { x: t.x, z: t.z },
          })
          let playerDamage = 0
          if (dist <= MATH_TEACHER_SWING_RADIUS) {
            const store = useGameStore.getState()
            playerDamage = getMathTeacherPlayerDamage(store.player.hp)
            store.damagePlayer(playerDamage, { ignoreInvulnerability: true })
          }
          logPlaytestEvent('b01-math-special-impact', {
            bossId: id,
            pushedZombies,
            playerHit: playerDamage > 0,
            playerDamage,
            playerHpAfter: useGameStore.getState().player.hp,
          })
          chargeState.current = 'mathSwingRecover'
          stateTimer.current = now
        }

      } else if (chargeState.current === 'mathSwingRecover') {
        _vel.x = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        if (now - stateTimer.current >= MATH_TEACHER_SWING_RECOVERY_MS) {
          chargeState.current = 'stun'
          stateTimer.current = now
          setAnimPhase('stun')
          logPlaytestEvent('b01-math-special-end', { bossId: id })
        }

      } else if (chargeState.current === 'stun') {
        _vel.x = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        if (dist > 0.0001) updateRotation(_dir.x / dist, _dir.z / dist, 0.22)
        if (now - stateTimer.current >= stats.stunDuration) {
          chargeState.current = 'chase'
          setAnimPhase('normal')
        }
      }
      return
    }

    // ?? 湲곕낯 異붽꺽 (E01, E02, E03, E06) ????????????????????????????????????
    _vel.y = 0
    if (dist < stats.contactDist * ENEMY_SIZE_MULTIPLIER) {
      const now = performance.now()
      if (now - lastContactDmgRef.current >= 500) {
        lastContactDmgRef.current = now
        damagePlayer(stats.damage)
      }
      _vel.x = 0; _vel.z = 0
      rb.current.setLinvel(_vel, true)
    } else {
      _dir.normalize()
      _vel.x = _dir.x * stats.speed; _vel.z = _dir.z * stats.speed
      rb.current.setLinvel(_vel, true)
      updateRotation(_dir.x, _dir.z)
    }


  })

  if (dead.current) return null

  return (
    <>
      <SpawnSmokeEffect position={spawnPos} visualScale={cs * 0.333} />
      {spawnRevealed && (
        <RigidBody
          ref={rb}
          type="dynamic"
          position={spawnPos}
          lockRotations
          linearDamping={8}
          colliders={false}
        >
          <CuboidCollider args={colArgs} />
          <EnemyVisual groupRef={groupRef} type={type} animPhase={animPhase} hitFlash={hitFlash} hp={hp} isMatilda={isMatilda} />
        </RigidBody>
      )}

      {/* E04 ?ъ궗泥?*/}
      {spawnRevealed && projectiles.map((p) => (
        <EnemyProjectile key={p.id} {...p} onExpire={expireProjectile} />
      ))}
    </>
  )
}
