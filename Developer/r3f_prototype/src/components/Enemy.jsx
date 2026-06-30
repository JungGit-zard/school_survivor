import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
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
// setLinvel에 전달하는 재사용 객체 — 매 프레임 인라인 객체 생성 방지
const _vel = { x: 0, y: 0, z: 0 }

// 방향 회전 헬퍼 — useFrame 내 함수 재생성 방지를 위해 모듈 레벨
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

// XP 값은 교과서 30% 드랍률을 보정해 약 3.3배로 책정 (Planner/B.게임기획,밸런스 구현/B-1 캐릭터 성장,능력치 업그레이드 구조 구현/Rewards_Drops/dual_drop_system_2026-05-08.md §7-2).
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
  // B01 1스테이지: 부채꼴 투사체 패턴 제거. 추격/돌진만 사용 (Bang_Rules 2026-05-09 부록).
  // contactDist 0.36: 돌진 접촉 = 0.36 × 4/3(크기배수) × 1.5 ≈ 0.72 ≈ 본체 반폭(0.14×cs=0.56) + 플레이어 반폭(0.136).
  // 이전 0.80은 접촉 반경이 ~1.6이라 본체 외형보다 훨씬 커서 "안 닿아도 피격"되는 문제가 있었다.
  B01: { hp: 1400, speed: 0.475, damage: 22, scale: 3.00, xp: 0,  contactDist: 0.36,
         charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
}

// 콜라이더 기본 반크기 (scale=1 기준)
const BASE_COL = [0.14, 0.26, 0.10]

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

// outlineMat(0.92) for charge cue — zombie outline is 0.96, charge cue uses slightly lighter
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

// ── 적 투사체 (E04 원거리 전용. B01 부채꼴 패턴은 2026-05-09 폐기) ──────────────
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

// ── HP 바 ────────────────────────────────────────────────────────────────────
// ── 메인 Enemy 컴포넌트 ───────────────────────────────────────────────────────
// E01-E06 standard zombies render via ZombieInstanceLayer (instanced). B01 + Matilda use React mesh.
const INSTANCED_TYPES = new Set(['E01', 'E02', 'E03', 'E04', 'E05', 'E06'])

export function EnemyVisual({ type = 'E01', animPhase = 'normal', hitFlash = false, hp, showHealthBar = true, groupRef = null, isMatilda = false }) {
  const stats = ENEMY_STATS[type] ?? ENEMY_STATS.E01
  const cs = stats.scale * ENEMY_SIZE_MULTIPLIER
  const useInstanced = !isMatilda && INSTANCED_TYPES.has(type)
  const currentHp = hp ?? stats.hp

  return (
    <>
      <group ref={groupRef} scale={[cs * 0.333, cs * 0.333, cs * 0.333]}>
        {/* E01-E06: rendered imperatively by ZombieInstanceLayer — no mesh here */}
        {!useInstanced && <ZombieMesh type={type} animPhase={animPhase} hitFlash={hitFlash} isMatilda={isMatilda} />}
        {stats.charger && animPhase === 'warn' && <ChargeToonCue y={CHARGE_CUE_LAYOUT.y} />}
      </group>
      {showHealthBar && <MiniHealthBar current={currentHp} max={stats.hp} width={0.32 * cs} height={0.045} y={0.72 * cs} />}
    </>
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

  // E05 / B01 돌진 상태 머신
  const [animPhase, setAnimPhase] = useState('normal') // normal|warn|charge|stun|retreat
  const chargeState  = useRef('chase')   // chase|warn|charge|stun
  const stateTimer   = useRef(0)
  const chargeDir    = useRef(new THREE.Vector3())

  // 뒷걸음 상태 (1/50 피격 시)
  const retreatUntilRef = useRef(0)
  const retreatDirRef   = useRef(new THREE.Vector3())

  // E04 / B01 투사체
  const [projectiles, setProjectiles] = useState([])
  const lastFireRef = useRef(0)

  const damagePlayer = useGameStore((s) => s.damagePlayer)
  const phase        = useGameStore((s) => s.phase)
  const currentStageId = useGameStore((s) => s.currentStageId)

  useEffect(() => {
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
      // 1/50 확률 뒷걸음 — E01~E06, charge 중 제외
      if (type !== 'B01' && chargeState.current !== 'charge' && Math.random() < 1 / 50) {
        const dx = hitPos.x - playerPos.x
        const dz = hitPos.z - playerPos.z
        const len = Math.hypot(dx, dz) || 1
        retreatDirRef.current.set(dx / len, 0, dz / len)
        // 넉백이 있으면 그 후부터, 없으면 즉시 시작
        retreatUntilRef.current = Math.max(performance.now(), knockbackUntilRef.current) + 350
      }

      hpRef.current -= dmg
      setHp(hpRef.current)
      if (hpRef.current <= 0) {
        dead.current = true
        rb.current._enemyDead = true
        rb.current._enemyHit = null
        enemyBodies.delete(id)
        // 본 런 처치 카운터 + 보스 처치 즉시 누적
        const store = useGameStore.getState()
        store.recordKill()
        emitSfx({ id: deathSfxId(type, isMatilda) })
        // 마틸다는 B01 비주얼을 쓰지만 클리어 처리하지 않는다
        if (type === 'B01' && !isMatilda) {
          store.recordBossKill()
          store.clearStageWithBossBonus()
        }
        logKill(type)
        const t = rb.current?.translation()
        // 막타 위력으로 박살 강도(약/중/강) 결정. impact.knockback은 무기 원천 넉백(없으면 0).
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
          deathStyleMix: impact.deathStyleMix,
          facingY: groupRef.current?.rotation.y ?? 0,
        })
      }
    }
    rb.current._enemyId   = id
    rb.current._enemyType = type
    if (useInstanced) {
      zombieVisualRegistry.register(id, { x: spawnPos[0], y: spawnPos[1], z: spawnPos[2], yaw: 0, type, phase: 'chase', wt: 0, vs: cs * 0.333, hitFlash: false })
    }
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

    const now = performance.now()

    if (now < knockbackUntilRef.current) {
      _vel.x = knockbackDir.current.x * knockbackSpeedRef.current
      _vel.y = 0
      _vel.z = knockbackDir.current.z * knockbackSpeedRef.current
      rb.current.setLinvel(_vel, true)
      return
    }

    const updateRotation = (dx, dz, tr) => _applyRotation(groupRef, dx, dz, tr)

    // ── 뒷걸음 ───────────────────────────────────────────────────────────────
    if (retreatUntilRef.current > now) {
      if (animPhase !== 'retreat') setAnimPhase('retreat')
      _vel.x = retreatDirRef.current.x * 4.0
      _vel.y = 0
      _vel.z = retreatDirRef.current.z * 4.0
      rb.current.setLinvel(_vel, true)
      // 플레이어를 바라보며 뒷걸음 (뒤통수X, 정면 유지)
      updateRotation(-retreatDirRef.current.x, -retreatDirRef.current.z, 0.5)
      return
    }
    if (animPhase === 'retreat') {
      // retreat 종료 → 이전 상태 복원
      if (stats.charger) {
        setAnimPhase(
          chargeState.current === 'charge' ? 'charge'
          : chargeState.current === 'stun'   ? 'stun'
          : chargeState.current === 'warn'   ? 'warn'
          : 'normal'
        )
      } else {
        setAnimPhase('normal')
      }
    }

    // ── E04: 원거리 감염체 ─────────────────────────────────────────────────
    if (stats.ranged) {
      const now = performance.now()
      // 원하는 거리 유지: 너무 가까우면 후퇴, 너무 멀면 전진
      _vel.y = 0
      if (dist < stats.minDist) {
        _dir.normalize()
        _vel.x = -_dir.x * stats.speed; _vel.z = -_dir.z * stats.speed
        rb.current.setLinvel(_vel, true)
      } else if (dist > stats.preferDist) {
        _dir.normalize()
        _vel.x = _dir.x * stats.speed; _vel.z = _dir.z * stats.speed
        rb.current.setLinvel(_vel, true)
      } else {
        _vel.x = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
      }
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

      // 투사체 발사
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

    // ── E05 / B01 돌진 상태 머신 ───────────────────────────────────────────
    if (stats.charger) {
      const now = performance.now()

      _vel.y = 0
      if (chargeState.current === 'chase') {
        // 일반 추격
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

        if (dist < stats.contactDist * ENEMY_SIZE_MULTIPLIER * 1.5) {
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

    // ── 기본 추격 (E01, E02, E03, E06) ────────────────────────────────────
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

    // Feed visual state to ZombieInstanceLayer
    if (useInstanced) {
      zombieVisualRegistry.update(id, {
        x: t.x, y: t.y, z: t.z,
        yaw: groupRef.current?.rotation.y ?? 0,
        type,
        phase: chargeState.current,
        wt: ageRef.current,
        vs: cs * 0.333,
        hitFlash: hitFlashRef.current,
      })
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

      {/* E04 투사체 */}
      {projectiles.map((p) => (
        <EnemyProjectile key={p.id} {...p} onExpire={expireProjectile} />
      ))}
    </>
  )
}
