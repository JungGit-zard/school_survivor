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
import {
  DOGE_DANCE_HOLD_MS,
  DOGE_ESCAPE_SPEED,
  dogeHasEscaped,
  dogeKnockbackVelocity,
  DOGE_KNOCKBACK_MS,
  DOGE_KNOCKBACK_COOLDOWN_MS,
} from '../lib/dogeEscape.js'

// ── 이벤트 몬스터 "춤추는 도지" (2026-07-14) ─────────────────────────────────
// 뱀서 "황금고블린" 역할. 스테이지 중앙에 주인공 2배 크기로 1회 등장, 잠깐 제자리 춤을
// 춘 뒤(DOGE_DANCE_HOLD_MS) 가장 가까운 맵 경계를 향해 느릿느릿 춤추며 도망간다.
// 추격/공격은 없고 플레이어 무기로만 피격/처치된다. 경계 밖 도달 = 도주 성공 → 펑 연기와
// 함께 보상 없이 소멸(onEscape). 도주 중 처치하면 그 자리에 상자 드랍(onDeath).
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
// 도주 성공(경계 이탈) 시 펑 연기 소멸 연출 길이 — SpawnSmokeEffect 전체 수명과 동일하게
// 두어 연기가 끝까지 재생된 뒤 onEscape로 제거를 위임한다.
const ESCAPE_POOF_MS = 850

export default function DancingDogeEvent({
  id, position, scale = 1, hp = 200,
  escapeDir = [1, 0], bounds = { halfX: 10, halfZ: 10 },
  onDeath, onEscape,
}) {
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
  // 도주 이동 상태 — posRef가 현재 월드 좌표의 단일 정본(콜라이더/연기/조준이 모두 따라감).
  const posRef = useRef([...position])
  const holdElapsedRef = useRef(0)
  const waddleRef = useRef()                      // 이동 방향 기울임/뒤뚱 그룹
  const waddleTRef = useRef(0)
  const [escaping, setEscaping] = useState(false) // 도주 성공 펑 연출 재생 중
  const escapeElapsedRef = useRef(0)
  const lastKnockbackAtRef = useRef(-Infinity) // 넉백 쿨다운(연속 접촉 스팸 방지)
  const escapePosRef = useRef([...position])
  const phase = useGameStore((s) => s.phase)

  // 스폰 리빌 타이머 — 연기가 앞 300ms 완전히 보인 뒤 도지가 등장(정본 스폰 연출).
  useFrame((_, delta) => {
    if (revealed) return
    revealElapsedRef.current = advanceEnemySpawnTimer(revealElapsedRef.current, delta, phase)
    if (revealElapsedRef.current >= ENEMY_SPAWN_REVEAL_DELAY_MS) setRevealed(true)
  })

  // 도주 이동 — 제자리 춤(DOGE_DANCE_HOLD_MS) 후 경계 방향으로 느릿느릿 선형 이동.
  // 물리 이동 불필요: kinematic 바디 위치만 동기화해 enemyBodies.translation() 계약 유지
  // (무기 조준이 도주 중에도 도지를 계속 추적한다).
  useFrame((_, delta) => {
    if (!revealed || dying || finished || escaping || dead.current) return
    if (phase !== 'playing') return
    holdElapsedRef.current += delta * 1000
    if (holdElapsedRef.current < DOGE_DANCE_HOLD_MS) return
    const p = posRef.current
    p[0] += escapeDir[0] * DOGE_ESCAPE_SPEED * delta
    p[2] += escapeDir[1] * DOGE_ESCAPE_SPEED * delta
    rb.current?.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] })
    // 뒤뚱뒤뚱 — 이동 방향을 바라보며 좌우로 코믹하게 흔들린다(기존 디스코 모션 위에 얹힘).
    waddleTRef.current += delta
    const w = waddleRef.current
    if (w) {
      w.rotation.y = Math.atan2(escapeDir[0], escapeDir[1])
      w.rotation.z = Math.sin(waddleTRef.current * 7) * 0.09
    }
    if (dogeHasEscaped(p, bounds)) {
      // 도주 성공 — 타겟팅 해제 후 펑 연기 연출로 전환(보상 없음).
      enemyBodies.delete(id)
      if (rb.current) rb.current._enemyHit = null
      escapePosRef.current = [p[0], p[1], p[2]]
      emitSfx({ id: 'dogeEscape', volume: 0.72, rate: 0.95 + Math.random() * 0.1 })
      setEscaping(true)
    }
  })

  // 도주 성공 펑 — 연기가 끝까지 재생된 뒤 onEscape로 제거 위임(놓침이 시각적으로 읽히게).
  useFrame((_, delta) => {
    if (!escaping || finished) return
    if (phase === 'playing') escapeElapsedRef.current += delta * 1000
    if (escapeElapsedRef.current >= ESCAPE_POOF_MS) {
      setFinished(true)
      onEscape?.(id)
    }
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
        // 도지 전용 사망음: 장난감 팝 + 강아지풍 상승 피치.
        emitSfx({ id: 'dogeDeath', volume: 0.78, rate: 0.96 + Math.random() * 0.08 })
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
      {revealed && !dying && !escaping && (
        // kinematicPosition — 도주 이동을 setNextKinematicTranslation으로 구동한다
        // (물리 시뮬 불필요, 렌더/콜라이더/enemyBodies 좌표가 함께 따라간다).
        <RigidBody
          ref={rb}
          type="kinematicPosition"
          position={position}
          colliders={false}
          onIntersectionEnter={({ other }) => {
            // 플레이어 몸통 충돌 — 피해 없이 도지 중심→플레이어 방향으로 확 밀쳐낸다.
            // 플레이어만 밀도록 _applyKnockback 훅 유무로 판별(무기/좀비 오감지 금지).
            const apply = other.rigidBody?._applyKnockback
            if (!apply || dead.current) return
            const now = performance.now()
            if (now - lastKnockbackAtRef.current < DOGE_KNOCKBACK_COOLDOWN_MS) return
            lastKnockbackAtRef.current = now
            const pt = other.rigidBody.translation()
            const kb = dogeKnockbackVelocity(posRef.current, [pt.x, pt.y, pt.z])
            apply(kb.x, kb.z, DOGE_KNOCKBACK_MS)
          }}
        >
          {/* 센서 콜라이더 — 무기 판정은 enemyBodies 좌표 기반이라 몸을 막지 않아도 된다
              (플레이어가 중앙 개체에 끼는 사고 방지). 넉백은 위 onIntersectionEnter가 담당. */}
          <CuboidCollider args={[0.32 * scale, 0.75 * scale, 0.32 * scale]} position={[0, 0.75 * scale, 0]} sensor />
          <group ref={waddleRef}>
            <DancingDoge position={[0, 0, 0]} dance="twist" scale={scale} paused={phase !== 'playing'} />
          </group>
          <MiniHealthBar current={hpState} max={hp} width={0.5 * scale} height={0.06 * scale} y={1.75 * scale} />
        </RigidBody>
      )}
      {escaping && (
        // 도주 성공 — 나간 자리에서 작은 펑 연기(놓쳤다는 신호). 보상 없음.
        <SpawnSmokeEffect position={escapePosRef.current} visualScale={scale * 0.8} />
      )}
      {dying && (
        // 사망 팝 — 물리 바디 없이 도지 포즈를 그대로 두고 그룹 스케일만 팝→소멸시킨다.
        // 위치는 사망 순간의 좌표(deathPosRef) — 도주 중 처치돼도 그 자리에서 터진다.
        <group ref={deathGroupRef} position={deathPosRef.current} scale={scale}>
          <DancingDoge position={[0, 0, 0]} dance="twist" scale={1} paused />
        </group>
      )}
    </>
  )
}
