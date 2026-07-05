import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import spawnSmokeUrl from '../assets/effects/spawn_smoke_puff.svg'
import { enemyBodies, playerPos } from '../lib/refs.js'
import { getCachedBoxGeo, getCachedToonMat, getSharedOutlineMat, getFlashMat, inflateScale, outlineMat, toonMat } from '../lib/toon.js'
import { useGameStore } from '../store/useGameStore.js'
import { logKill } from '../lib/playtestLogger.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { emitVfx } from '../lib/vfxEvents.js'
import { createEnemyHitSparkEvent, resolveEnemyHitKnockback } from '../lib/enemyHitVfx.js'
import { resolveCollapseIntensity } from '../lib/enemyDeathCollapse.js'
import { canE04FireProjectile } from '../lib/stage2ProjectileRules.js'
import ZombieMesh from './ZombieMesh.jsx'
import MiniHealthBar from './MiniHealthBar.jsx'
import EnemyProjectileVisual from './EnemyProjectileVisual.jsx'
import { zombieVisualRegistry } from '../lib/zombieVisualRegistry.js'

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
const SPAWN_SMOKE_DURATION_MS = 420

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
  E02: { hp: 70,   speed: 0.55, damage: 14, scale: 1.40, xp: 15, contactDist: 0.36 },
  E03: { hp: 14,   speed: 1.1,  damage: 6,  scale: 0.75, xp: 5,  contactDist: 0.22 },
  E04: { hp: 32,   speed: 0.45, damage: 8,  scale: 0.90, xp: 10, contactDist: 0.26,
         ranged: true, rangedCooldown: 2200, rangedDmg: 8, rangedSpeed: 1.9,
         preferDist: 5.5, minDist: 3.5 },
  E05: { hp: 70,   speed: 0.5,  damage: 16, scale: 1.15, xp: 15, contactDist: 0.32,
         charger: true, chargeSpeed: 1.7, warnDist: 4.5, warnDuration: 700, stunDuration: 1000, chargeDuration: 1200 },
  E06: { hp: 320,  speed: 0.6,  damage: 20, scale: 1.60, xp: 56, contactDist: 0.42 },
  // B01 1?ㅽ뀒?댁?: 遺梨꾧섦 ?ъ궗泥??⑦꽩 ?쒓굅. 異붽꺽/?뚯쭊留??ъ슜 (Bang_Rules 2026-05-09 遺濡?.
  // contactDist 0.36: regular charge keeps the 1.5x grace distance; Matilda charge uses exact body contact only.
  // ?댁쟾 0.80? ?묒큺 諛섍꼍??~1.6?대씪 蹂몄껜 ?명삎蹂대떎 ?⑥뵮 而ㅼ꽌 "???우븘???쇨꺽"?섎뒗 臾몄젣媛 ?덉뿀??
  B01: { hp: 1150, speed: 0.475, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
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
  if (type === 'B01') return 'bossDeath'
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

function SpawnSmokeEffect({ position, visualScale }) {
  const spriteRef = useRef()
  const bornAtRef = useRef(performance.now())
  const [done, setDone] = useState(false)
  const texture = useLoader(THREE.TextureLoader, spawnSmokeUrl)
  const material = useMemo(() => new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    depthTest: true,
    depthWrite: false,
  }), [texture])

  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const sprite = spriteRef.current
    if (!sprite) return
    const t = Math.min(1, (performance.now() - bornAtRef.current) / SPAWN_SMOKE_DURATION_MS)
    const ease = 1 - (1 - t) * (1 - t)
    const size = visualScale * (1.1 + ease * 1.25)
    sprite.scale.set(size, size, 1)
    sprite.position.y = position[1] + visualScale * (1.0 + t * 0.32)
    material.opacity = 1 - t
    if (t >= 1) setDone(true)
  })

  if (done) return null

  return (
    <sprite
      ref={spriteRef}
      material={material}
      position={[position[0], position[1] + visualScale, position[2]]}
      renderOrder={6}
    />
  )
}

export default function Enemy({ id, type = 'E01', spawnPos, onDeath, statOverride, isMatilda = false }) {
  const rb       = useRef()
  const groupRef = useRef()
  const stats    = { ...(ENEMY_STATS[type] ?? ENEMY_STATS.E01), ...statOverride }
  const cs       = stats.scale * ENEMY_SIZE_MULTIPLIER
  const colArgs  = [BASE_COL[0] * cs, BASE_COL[1] * cs, BASE_COL[2] * cs]

  const [hp, setHp]           = useState(stats.hp)
  const [hitFlash, setHitFlash] = useState(false)
  const hitFlashRef           = useRef(false)  // ref mirror for instanced renderer
  const hpRef                 = useRef(stats.hp)
  const useInstanced = !isMatilda && INSTANCED_TYPES.has(type)
  const dead                  = useRef(false)
  const knockbackUntilRef     = useRef(0)
  const knockbackDir          = useRef(new THREE.Vector3())
  const knockbackSpeedRef     = useRef(3.8)
  const lastContactDmgRef     = useRef(0)
  const spawnedAtRef          = useRef(performance.now())

  // E05 / B01 ?뚯쭊 ?곹깭 癒몄떊
  const [animPhase, setAnimPhase] = useState('normal') // normal|warn|charge|stun|retreat
  const chargeState  = useRef('chase')   // chase|warn|charge|stun
  const stateTimer   = useRef(0)
  const chargeDir    = useRef(new THREE.Vector3())

  // E04 / B01 ?ъ궗泥?
  const [projectiles, setProjectiles] = useState([])
  const lastFireRef = useRef(0)

  const damagePlayer = useGameStore((s) => s.damagePlayer)
  const phase        = useGameStore((s) => s.phase)
  const currentStageId = useGameStore((s) => s.currentStageId)

  useEffect(() => {
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
      emitVfx(createEnemyHitSparkEvent({
        x: hitPos.x,
        y: Math.max(0.34, 0.42 * cs),
        z: hitPos.z,
      }))
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
        if (type === 'B01' && !isMatilda) {
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
  }, [id, onDeath, spawnPos, stats.xp, type, cs, useInstanced])

  const expireProjectile = useCallback((pid) => {
    setProjectiles((prev) => prev.filter((p) => p.id !== pid))
  }, [])

  useFrame((_, delta) => {
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

    if (now < knockbackUntilRef.current) {
      _vel.x = knockbackDir.current.x * knockbackSpeedRef.current
      _vel.y = 0
      _vel.z = knockbackDir.current.z * knockbackSpeedRef.current
      rb.current.setLinvel(_vel, true)
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
      const canFire = currentStageId === 'stage2' && canE04FireProjectile({
        elapsedSec,
        ageMs: now - spawnedAtRef.current,
        activeProjectileCount: projectiles.length,
        distanceToPlayer: dist,
        lastFireElapsedMs: lastFireRef.current,
        nowMs: now,
        cooldownMs: stats.rangedCooldown,
        bossPressure: elapsedSec >= 190 && elapsedSec < 200,
      })

      // ?ъ궗泥?諛쒖궗
      if (canFire) {
        lastFireRef.current = now
        _fireDir.copy(_dir).normalize()
        setProjectiles((prev) => [...prev, {
          id: ++_projId,
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

        if (dist < getChargeHitDistance(stats, isMatilda)) {
          damagePlayer(stats.damage)
          chargeState.current = 'stun'
          stateTimer.current = now
          setAnimPhase('stun')
          _vel.x = 0; _vel.z = 0
          rb.current.setLinvel(_vel, true)
        } else if (now - stateTimer.current > (stats.chargeDuration ?? 1200)) {
          chargeState.current = 'stun'
          stateTimer.current = now
          setAnimPhase('stun')
          _vel.x = 0; _vel.z = 0
          rb.current.setLinvel(_vel, true)
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
      <SpawnSmokeEffect position={spawnPos} visualScale={cs * 0.333} />

      {/* E04 ?ъ궗泥?*/}
      {projectiles.map((p) => (
        <EnemyProjectile key={p.id} {...p} onExpire={expireProjectile} />
      ))}
    </>
  )
}
