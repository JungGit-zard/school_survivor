import { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { enemyBodies, playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import ZombieMesh from './ZombieMesh.jsx'
import MiniHealthBar from './MiniHealthBar.jsx'

const _dir = new THREE.Vector3()
const _pos = new THREE.Vector3()
const _chargeTarget = new THREE.Vector3()

function updateRotation(groupRef, dx, dz) {
  if (!groupRef.current) return
  const targetY = Math.atan2(dx, dz)
  let diff = targetY - groupRef.current.rotation.y
  while (diff >  Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  groupRef.current.rotation.y += diff * 0.12
}

export const ENEMY_SIZE_MULTIPLIER = 4 / 3

// ── 몬스터 스펙 (시나리오 문서 기준) ──────────────────────────────────────────
export const ENEMY_STATS = {
  E01: { hp: 18,   speed: 0.95, damage: 8,  scale: 1.00, xp: 1,  contactDist: 0.28 },
  E02: { hp: 55,   speed: 0.55, damage: 14, scale: 1.40, xp: 2,  contactDist: 0.36 },
  E03: { hp: 10,   speed: 1.1,  damage: 6,  scale: 0.75, xp: 1,  contactDist: 0.22 },
  E04: { hp: 35,   speed: 0.45, damage: 8,  scale: 0.90, xp: 2,  contactDist: 0.26,
         ranged: true, rangedCooldown: 2200, rangedDmg: 8, rangedSpeed: 3.8,
         preferDist: 5.5, minDist: 3.5 },
  E05: { hp: 70,   speed: 0.5,  damage: 16, scale: 1.15, xp: 3,  contactDist: 0.32,
         charger: true, chargeSpeed: 1.7, warnDist: 4.5, warnDuration: 700, stunDuration: 1000 },
  E06: { hp: 240,  speed: 0.6,  damage: 20, scale: 1.60, xp: 10, contactDist: 0.42 },
  B01: { hp: 1200, speed: 0.475, damage: 22, scale: 3.00, xp: 0,  contactDist: 0.80,
         boss: true,
         // 패턴2: 부채꼴 5발 투사체
         fanCooldown: 3000, fanDmg: 12, fanSpeed: 4.2, fanCount: 5,
         // 패턴3: 돌진
         charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200 },
}

// 콜라이더 기본 반크기 (scale=1 기준)
const BASE_COL = [0.14, 0.26, 0.10]

// ── 적 투사체 (E04 원거리 / B01 부채꼴) ──────────────────────────────────────
let _projId = 0

function EnemyProjectile({ id, position, velocity, damage, onExpire }) {
  const rb     = useRef()
  const ageRef = useRef(0)
  const hitRef = useRef(false)

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
      <mesh>
        <sphereGeometry args={[0.09, 6, 6]} />
        <meshBasicMaterial color={0xff6600} />
      </mesh>
    </RigidBody>
  )
}

// ── HP 바 ────────────────────────────────────────────────────────────────────
// ── 메인 Enemy 컴포넌트 ───────────────────────────────────────────────────────
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

  useEffect(() => {
    if (!rb.current) return
    enemyBodies.set(id, rb.current)
    rb.current._enemyHit = (dmg, impact = {}) => {
      if (dead.current) return
      setHitFlash(true)
      requestAnimationFrame(() => setHitFlash(false))
      if (impact.knockback) {
        const t = rb.current.translation()
        const sx = impact.source?.x ?? playerPos.x
        const sz = impact.source?.z ?? playerPos.z
        const dx = t.x - sx
        const dz = t.z - sz
        const len = Math.hypot(dx, dz) || 1
        knockbackDir.current.set(dx / len, 0, dz / len)
        knockbackSpeedRef.current = impact.knockback
        knockbackUntilRef.current = performance.now() + (impact.knockbackMs ?? 120)
        rb.current.setLinvel({
          x: knockbackDir.current.x * impact.knockback,
          y: 0,
          z: knockbackDir.current.z * impact.knockback,
        }, true)
      }
      hpRef.current -= dmg
      setHp(hpRef.current)
      if (hpRef.current <= 0) {
        dead.current = true
        rb.current._enemyDead = true
        rb.current._enemyHit = null
        enemyBodies.delete(id)
        const t = rb.current?.translation()
        onDeath?.(id, {
          pos: t ? [t.x, t.y, t.z] : [...spawnPos],
          xp: stats.xp,
          type,
          visualScale: cs * 0.333,
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
      if (_dir.length() > 0) updateRotation(groupRef, _dir.x / _dir.length(), _dir.z / _dir.length())

      // 투사체 발사
      if (now - lastFireRef.current >= stats.rangedCooldown) {
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
        updateRotation(groupRef, _dir.x, _dir.z)

        if (dist < stats.warnDist) {
          chargeState.current = 'warn'
          stateTimer.current = now
          chargeDir.current.copy(_dir)
          setAnimPhase('warn')
          rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        }

        // B01 부채꼴 투사체
        if (stats.boss && now - lastFireRef.current >= stats.fanCooldown) {
          lastFireRef.current = now
          const baseAngle = Math.atan2(_dir.x, _dir.z)
          const spread = (Math.PI / 180) * 25
          const newProjs = []
          for (let i = 0; i < stats.fanCount; i++) {
            const angle = baseAngle + spread * (i - Math.floor(stats.fanCount / 2))
            newProjs.push({
              id: ++_projId,
              position: [_pos.x, _pos.y, _pos.z],
              velocity: [Math.sin(angle) * stats.fanSpeed, 0, Math.cos(angle) * stats.fanSpeed],
              damage: stats.fanDmg,
            })
          }
          setProjectiles((prev) => [...prev, ...newProjs])
        }

      } else if (chargeState.current === 'warn') {
        if (now - stateTimer.current >= stats.warnDuration) {
          chargeState.current = 'charge'
          stateTimer.current = now
          setAnimPhase('charge')
          // 돌진 방향 고정
          chargeDir.current.normalize()
        }

      } else if (chargeState.current === 'charge') {
        const cd = chargeDir.current
        rb.current.setLinvel({ x: cd.x * stats.chargeSpeed, y: 0, z: cd.z * stats.chargeSpeed }, true)

        // 플레이어 접촉 피해
        if (dist < stats.contactDist * ENEMY_SIZE_MULTIPLIER * 1.5) {
          damagePlayer(stats.damage)
          chargeState.current = 'stun'
          stateTimer.current = now
          setAnimPhase('stun')
          rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        }
        // 타임아웃 (놓쳤을 때)
        if (now - stateTimer.current > 1200) {
          chargeState.current = 'stun'
          stateTimer.current = now
          setAnimPhase('stun')
          rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        }

      } else if (chargeState.current === 'stun') {
        rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
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
      updateRotation(groupRef, _dir.x, _dir.z)
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
        <group ref={groupRef} scale={[cs * 0.333, cs * 0.333, cs * 0.333]}>
          <ZombieMesh type={type} animPhase={animPhase} hitFlash={hitFlash} />
        </group>
        <MiniHealthBar current={hp} max={stats.hp} width={0.32 * cs} height={0.045} y={0.72 * cs} />
      </RigidBody>

      {/* E04 / B01 투사체 */}
      {projectiles.map((p) => (
        <EnemyProjectile key={p.id} {...p} onExpire={expireProjectile} />
      ))}
    </>
  )
}
