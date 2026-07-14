import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { enemyBodies } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { emitVfx } from '../lib/vfxEvents.js'
import { createEnemyHitSparkEvent } from '../lib/enemyHitVfx.js'
import { DancingDoge } from './DogeMesh.jsx'
import MiniHealthBar from './MiniHealthBar.jsx'
import {
  SpawnSmokeEffect,
  ENEMY_SPAWN_REVEAL_DELAY_MS,
  advanceEnemySpawnTimer,
} from './Enemy.jsx'

// ── 이벤트 몬스터 "춤추는 도지" (2026-07-14) ─────────────────────────────────
// 스테이지 중앙에 주인공 2배 크기로 1회 등장하는 무해한 잔치 개체. 이동/추격/공격이
// 전혀 없고 제자리에서 춤만 춘다 — 플레이어 무기로만 피격/처치된다(적 AI 미탑재).
//
// 무기 타격은 전역 enemyBodies Map + rb._enemyHit 계약만으로 이뤄지므로(가중치/타겟팅은
// weaponTargeting 참조), 도지는 Enemy의 복잡한 AI 프레임을 타지 않고도 이 계약만 만족하면
// 모든 무기에 정상 피격된다. 스폰은 정본 "펑 연기 → 리빌" 경로(SpawnSmokeEffect +
// ENEMY_SPAWN_REVEAL_DELAY_MS)를 그대로 재사용해 "효과 없이 스폰 없음" 규칙을 지킨다.
//
// 처치 시 onDeath(id, pos)를 호출한다 — 상위 Enemies가 그 위치에 보물상자를 떨어뜨린다.
// 비주얼(춤·피격 플래시·사망 연출)과 전용 효과음 폴리시는 threemini/soundmini가 이어서 담당.
// 사망 "팝" 연출 길이 — 이 구간 동안 도지가 팝(살짝 부풀었다) 사라지고, 끝나면 onDeath로
// 상자 드랍을 넘긴다(부모가 도지를 언마운트하기 전에 연출이 온전히 재생되도록 지연 호출).
const DEATH_POP_MS = 300

export default function DancingDogeEvent({ id, position, scale = 1, hp = 200, onDeath }) {
  const rb = useRef()
  const [revealed, setRevealed] = useState(false)
  const revealElapsedRef = useRef(0)
  const hpRef = useRef(hp)
  const [hpState, setHpState] = useState(hp)
  const dead = useRef(false)
  const [dying, setDying] = useState(false)      // 사망 팝 연출 재생 중
  const [finished, setFinished] = useState(false) // 연출 종료 → 렌더 정지(부모 언마운트 대기)
  const deathPosRef = useRef([0, 0, 0])
  const deathElapsedRef = useRef(0)
  const deathGroupRef = useRef()
  const phase = useGameStore((s) => s.phase)

  // 스폰 리빌 타이머 — 연기가 앞 300ms 완전히 보인 뒤 도지가 등장(정본 스폰 연출).
  useFrame((_, delta) => {
    if (revealed) return
    revealElapsedRef.current = advanceEnemySpawnTimer(revealElapsedRef.current, delta, phase)
    if (revealElapsedRef.current >= ENEMY_SPAWN_REVEAL_DELAY_MS) setRevealed(true)
  })

  // 사망 팝 애니메이션 — dying 동안 도지 그룹을 팝→소멸 스케일로 구동, 끝나면 onDeath 위임.
  useFrame((_, delta) => {
    if (!dying || finished) return
    if (phase === 'playing') deathElapsedRef.current += delta * 1000
    const t = Math.min(1, deathElapsedRef.current / DEATH_POP_MS)
    const pop = 1 + 0.32 * Math.sin(Math.PI * Math.min(t / 0.4, 1)) // 1→1.32→1
    const vanish = t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.55) // 후반부 소멸
    const g = deathGroupRef.current
    if (g) {
      const s = scale * pop * vanish
      g.scale.set(s, s, s)
      g.rotation.y += delta * 6
    }
    if (t >= 1) {
      setFinished(true)
      const p = deathPosRef.current
      onDeath?.(id, [p[0], p[1], p[2]])
    }
  })

  // enemyBodies 등록 + 피격/사망 처리 — 리빌 이후 물리 바디가 생겼을 때만.
  useEffect(() => {
    if (!revealed || !rb.current) return
    const body = rb.current
    enemyBodies.set(id, body)
    body._enemyId = id
    body._enemyType = 'DOGE'
    body._enemyHit = (dmg, impact = {}) => {
      if (dead.current) return
      const t = body.translation()
      emitVfx(createEnemyHitSparkEvent({ x: t.x, y: Math.max(0.34, 0.6 * scale), z: t.z }))
      if (impact?.sfxId) emitSfx({ id: impact.sfxId, volume: 0.6 })
      hpRef.current -= dmg
      setHpState(hpRef.current)
      if (hpRef.current <= 0) {
        dead.current = true
        body._enemyDead = true
        body._enemyHit = null
        enemyBodies.delete(id)
        // 임시 사망음(묵직한 좀비 사망) — soundmini가 도지 전용 사망 SFX로 교체 예정.
        emitSfx({ id: 'zombieHeavyDeath' })
        const p = body.translation()
        deathPosRef.current = [p.x, p.y, p.z]
        // 사망 "팝" 버스트 — 바닥에 금빛 링 + 도지 둘레로 스파크 산개(기존 전역 VFX 재사용).
        emitVfx({ type: 'pickupPop', x: p.x, z: p.z, y: 0.18 * scale, color: 0xffd23c, life: 440 })
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          emitVfx(createEnemyHitSparkEvent({
            x: p.x + Math.cos(a) * 0.4 * scale,
            y: 0.7 * scale,
            z: p.z + Math.sin(a) * 0.4 * scale,
          }))
        }
        // onDeath(상자 드랍)는 팝 연출이 끝난 뒤 useFrame에서 호출한다(즉시 언마운트 방지).
        setDying(true)
      }
    }
    return () => {
      enemyBodies.delete(id)
    }
  }, [revealed, id, scale, onDeath])

  if (finished) return null

  return (
    <>
      <SpawnSmokeEffect position={position} visualScale={scale} />
      {revealed && !dying && (
        <RigidBody ref={rb} type="fixed" position={position} colliders={false}>
          {/* 센서 콜라이더 — 무기 판정은 enemyBodies 좌표 기반이라 몸을 막지 않아도 된다
              (플레이어가 중앙 개체에 끼는 사고 방지). */}
          <CuboidCollider args={[0.32 * scale, 0.75 * scale, 0.32 * scale]} position={[0, 0.75 * scale, 0]} sensor />
          <DancingDoge position={[0, 0, 0]} dance="disco" scale={scale} paused={phase !== 'playing'} />
          <MiniHealthBar current={hpState} max={hp} width={0.5 * scale} height={0.06 * scale} y={1.75 * scale} />
        </RigidBody>
      )}
      {dying && (
        // 사망 팝 — 물리 바디 없이 도지 포즈를 그대로 두고 그룹 스케일만 팝→소멸시킨다.
        <group ref={deathGroupRef} position={position} scale={scale}>
          <DancingDoge position={[0, 0, 0]} dance="disco" scale={1} paused />
        </group>
      )}
    </>
  )
}
