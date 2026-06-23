import { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { enemyBodies, playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import { logKill } from '../lib/playtestLogger.js'
import { emitVfx } from '../lib/vfxEvents.js'
import { createEnemyHitSparkEvent, resolveEnemyHitKnockback } from '../lib/enemyHitVfx.js'
import { resolveCollapseIntensity } from '../lib/enemyDeathCollapse.js'
import { canE04FireProjectile } from '../lib/stage2ProjectileRules.js'
import ZombieMesh from './ZombieMesh.jsx'
import MiniHealthBar from './MiniHealthBar.jsx'
import EnemyProjectileVisual from './EnemyProjectileVisual.jsx'

const _dir = new THREE.Vector3()
const _pos = new THREE.Vector3()
const _chargeTarget = new THREE.Vector3()

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

function GoSpeechBubble({ y }) {
  return (
    <Html position={[0, y, 0]} center sprite transform distanceFactor={8} style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'relative',
        padding: '3px 7px',
        borderRadius: 8,
        border: '2px solid #35204c',
        background: '#fff6e5',
        color: '#e8323d',
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1,
        fontFamily: 'Segoe UI, sans-serif',
        textTransform: 'uppercase',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }}>
        go!
        <span style={{
          position: 'absolute',
          left: '50%',
          bottom: -6,
          width: 8,
          height: 8,
          borderRight: '2px solid #35204c',
          borderBottom: '2px solid #35204c',
          background: '#fff6e5',
          transform: 'translateX(-50%) rotate(45deg)',
        }} />
      </div>
    </Html>
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
export function EnemyVisual({ type = 'E01', animPhase = 'normal', hitFlash = false, hp, showHealthBar = true, groupRef = null }) {
  const stats = ENEMY_STATS[type] ?? ENEMY_STATS.E01
  const cs = stats.scale * ENEMY_SIZE_MULTIPLIER
  const currentHp = hp ?? stats.hp

  return (
    <>
      <group ref={groupRef} scale={[cs * 0.333, cs * 0.333, cs * 0.333]}>
        <ZombieMesh type={type} animPhase={animPhase} hitFlash={hitFlash} />
        {stats.charger && animPhase === 'warn' && <GoSpeechBubble y={2.45} />}
      </group>
      {showHealthBar && <MiniHealthBar current={currentHp} max={stats.hp} width={0.32 * cs} height={0.045} y={0.72 * cs} />}
    </>
  )
}

export default function Enemy({ id, type = 'E01', spawnPos, onDeath }) {
  const rb       = useRef()
  const groupRef = useRef()
  const stats    = ENEMY_STATS[type] ?? ENEMY_STATS.E01
  const cs       = stats.scale * ENEMY_SIZE_MULTIPLIER
  const colArgs  = [BASE_COL[0] * cs, BASE_COL[1] * cs, BASE_COL[2] * cs]

  const [hp, setHp]           = useState(stats.hp)
  const [hitFlash, setHitFlash] = useState(false)
  const hpRef                 = useRef(stats.hp)
  const dead                  = useRef(false)
  const knockbackUntilRef     = useRef(0)
  const knockbackDir          = useRef(new THREE.Vector3())
  const knockbackSpeedRef     = useRef(3.8)
  const lastContactDmgRef     = useRef(0)
  const spawnedAtRef          = useRef(performance.now())

  // E05 / B01 돌진 상태 머신
  const [animPhase, setAnimPhase] = useState('normal') // normal|warn|charge|stun
  const chargeState  = useRef('chase')   // chase|warn|charge|stun
  const stateTimer   = useRef(0)
  const chargeDir    = useRef(new THREE.Vector3())

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
      requestAnimationFrame(() => setHitFlash(false))
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
        // 본 런 처치 카운터 + 보스 처치 즉시 누적
        const store = useGameStore.getState()
        store.recordKill()
        if (type === 'B01') store.recordBossKill()
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
        })
      }
    }
    rb.current._enemyId   = id
    rb.current._enemyType = type
    return () => {
      enemyBodies.delete(id)
    }
  }, [id, onDeath, spawnPos, stats.xp, type, cs])

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

    if (performance.now() < knockbackUntilRef.current) {
      rb.current.setLinvel({
        x: knockbackDir.current.x * knockbackSpeedRef.current,
        y: 0,
        z: knockbackDir.current.z * knockbackSpeedRef.current,
      }, true)
      return
    }

    // ── 방향 회전 ──────────────────────────────────────────────────────────
    const updateRotation = (dx, dz, turnRate = 0.12) => {
      if (!groupRef.current) return
      if (Math.hypot(dx, dz) <= 0.0001) return
      const targetY = Math.atan2(dx, dz)
      let diff = targetY - groupRef.current.rotation.y
      while (diff >  Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      groupRef.current.rotation.y += diff * turnRate
    }

    // ── E04: 원거리 감염체 ─────────────────────────────────────────────────
    if (stats.ranged) {
      const now = performance.now()
      // 원하는 거리 유지: 너무 가까우면 후퇴, 너무 멀면 전진
      if (dist < stats.minDist) {
        _dir.normalize()
        rb.current.setLinvel({ x: -_dir.x * stats.speed, y: 0, z: -_dir.z * stats.speed }, true)
      } else if (dist > stats.preferDist) {
        _dir.normalize()
        rb.current.setLinvel({ x: _dir.x * stats.speed, y: 0, z: _dir.z * stats.speed }, true)
      } else {
        rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
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
        const dir = new THREE.Vector3().copy(_dir).normalize()
        setProjectiles((prev) => [...prev, {
          id: ++_projId,
          position: [_pos.x, _pos.y, _pos.z],
          velocity: [dir.x * stats.rangedSpeed, 0, dir.z * stats.rangedSpeed],
          damage: stats.rangedDmg,
        }])
      }
      return
    }

    // ── E05 / B01 돌진 상태 머신 ───────────────────────────────────────────
    if (stats.charger) {
      const now = performance.now()

      if (chargeState.current === 'chase') {
        // 일반 추격
        _dir.normalize()
        rb.current.setLinvel({ x: _dir.x * stats.speed, y: 0, z: _dir.z * stats.speed }, true)
        updateRotation(_dir.x, _dir.z)

        if (dist < stats.warnDist) {
          chargeState.current = 'warn'
          stateTimer.current = now
          chargeDir.current.copy(_dir)
          updateRotation(chargeDir.current.x, chargeDir.current.z, 0.75)
          setAnimPhase('warn')
          rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        }

      } else if (chargeState.current === 'warn') {
        updateRotation(chargeDir.current.x, chargeDir.current.z, 0.45)
        if (now - stateTimer.current >= stats.warnDuration) {
          chargeState.current = 'charge'
          stateTimer.current = now
          setAnimPhase('charge')
          // 돌진 방향 고정
          chargeDir.current.normalize()
          updateRotation(chargeDir.current.x, chargeDir.current.z, 1)
        }

      } else if (chargeState.current === 'charge') {
        const cd = chargeDir.current
        rb.current.setLinvel({ x: cd.x * stats.chargeSpeed, y: 0, z: cd.z * stats.chargeSpeed }, true)
        updateRotation(cd.x, cd.z, 1)

        // 접촉 피해와 타임아웃을 if/else if로 분리 — 같은 프레임 중복 실행 방지
        if (dist < stats.contactDist * ENEMY_SIZE_MULTIPLIER * 1.5) {
          // 플레이어 접촉 → 즉시 스턴
          damagePlayer(stats.damage)
          chargeState.current = 'stun'
          stateTimer.current = now
          setAnimPhase('stun')
          rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        } else if (now - stateTimer.current > (stats.chargeDuration ?? 1200)) {
          // 타임아웃 (놓쳤을 때) — stats.chargeDuration으로 적별 설정 가능
          chargeState.current = 'stun'
          stateTimer.current = now
          setAnimPhase('stun')
          rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        }

      } else if (chargeState.current === 'stun') {
        rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        if (dist > 0.0001) updateRotation(_dir.x / dist, _dir.z / dist, 0.22)
        if (now - stateTimer.current >= stats.stunDuration) {
          chargeState.current = 'chase'
          setAnimPhase('normal')
        }
      }
      return
    }

    // ── 기본 추격 (E01, E02, E03, E06) ────────────────────────────────────
    if (dist < stats.contactDist * ENEMY_SIZE_MULTIPLIER) {
      const now = performance.now()
      if (now - lastContactDmgRef.current >= 500) {
        lastContactDmgRef.current = now
        damagePlayer(stats.damage)
      }
      rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    } else {
      _dir.normalize()
      rb.current.setLinvel({ x: _dir.x * stats.speed, y: 0, z: _dir.z * stats.speed }, true)
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
        <EnemyVisual groupRef={groupRef} type={type} animPhase={animPhase} hitFlash={hitFlash} hp={hp} />
      </RigidBody>

      {/* E04 투사체 */}
      {projectiles.map((p) => (
        <EnemyProjectile key={p.id} {...p} onExpire={expireProjectile} />
      ))}
    </>
  )
}
