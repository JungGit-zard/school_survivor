import { useRef, useState, useCallback, useMemo, useEffect, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { useBeforePhysicsStep } from '@react-three/rapier'
import { emitSfx } from '../../lib/sfxEvents.js'
import * as THREE from 'three'
import { enemyBodies, enemyPool, playerPos, screenBounds } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'
import { isEnemyHitLive } from '../../lib/weaponCollision.js'
import { applyEraserBombImpact } from '../../lib/eraserBombImpact.js'
import { scaleEffectVisual } from '../../lib/effectVisualScale.js'
import { advanceCrashCounter, selectCrashLandingPoint } from '../../lib/starlinkCrash.js'
import { StarlinkCrashSequence } from './StarlinkSatellite.jsx'
import StudioTunedGroup, { composeStudioPartScale } from '../StudioTunedGroup.jsx'

// starlink / 고장난 스타링크
// 역할: 플레이어 주변 strikeCenter 안에서 적이 있는 지점에 무작위 낙뢰.
// strikeCount만큼 번개를 strikeSpacingMs 간격으로 순차 낙하시켜 strikeRadius 안 모든 적에 데미지.

let _strikeId = 0
let _crashId = 0
const STRIKE_DURATION_MS = 480
export const STARLINK_CHEAT_CRASH_EVENT = 'escape-zombie-school:starlink-cheat-crash'
export const STARLINK_CRASH_NO_SIGHT_BLOCK = () => false

export function dispatchStarlinkCheatCrash() {
  window.dispatchEvent(new CustomEvent(STARLINK_CHEAT_CRASH_EVENT))
}

export function createStarlinkCrash({ playerPosition, bodies, bounds, random }) {
  const landing = selectCrashLandingPoint({
    playerPos: playerPosition,
    enemyBodies: bodies,
    screenBounds: bounds,
    random,
  })
  return {
    x: landing.x,
    z: landing.z,
    bossId: landing.bossId,
  }
}

export function applyStarlinkCrashImpact(crash, eraserBomb, applyImpact = applyEraserBombImpact, impactCenter = crash) {
  return applyImpact({
    x: impactCenter.x,
    z: impactCenter.z,
    damage: eraserBomb?.damage,
    radius: eraserBomb?.radius,
    sightBlocker: STARLINK_CRASH_NO_SIGHT_BLOCK,
    ignoreSightBlock: true,
  })
}

export function enqueueStarlinkCrashImpact(queue, crash, impactCenter) {
  if (!Number.isFinite(impactCenter?.x) || !Number.isFinite(impactCenter?.z)) return false

  queue.push({
    crash,
    // The landing callback receives a mutable tracked boss end. Preserve its
    // coordinates now so a later physics step cannot damage a different spot.
    impactCenter: { x: impactCenter.x, z: impactCenter.z },
  })
  return true
}

export function flushStarlinkCrashImpactQueue(queue, eraserBomb, applyImpact = applyStarlinkCrashImpact) {
  for (let index = 0; index < queue.length; index += 1) {
    const { crash, impactCenter } = queue[index]
    applyImpact(crash, eraserBomb, undefined, impactCenter)
  }
  queue.length = 0
}

function isPoolProxy(rb) {
  return Number.isInteger(rb?.index) && rb.index >= 0 && rb.index < enemyPool.proxies.length
    && enemyPool.proxies[rb.index] === rb
}

// 낙뢰 지점 후보를 고른다. 실제 데미지는 applyRadialDamage(x,z 반경 재스캔)로 별도 적용되므로
// 여기서는 위치(x,z)만 있으면 충분하다 — pool+Map을 함께 훑되 rb 참조는 반환하지 않는다.
export function pickStrikeTargets(strikeCenter, strikeCount) {
  // 플레이어 주변 strikeCenter 안 적들을 모은 뒤 무작위로 strikeCount개 선택.
  const candidates = []
  const strikeCenterSq = strikeCenter * strikeCenter
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    const x = enemyPool.posX[index]
    const z = enemyPool.posZ[index]
    const dx = x - playerPos.x
    const dz = z - playerPos.z
    if (dx * dx + dz * dz > strikeCenterSq) continue
    candidates.push({ x, z })
  }
  enemyBodies.forEach((rb) => {
    if (isPoolProxy(rb)) return // 풀 프록시가 Map에 중복 등록되어도 위 루프에서 이미 처리했다.
    if (!isEnemyHitLive(rb)) return
    const t = rb.translation()
    const dx = t.x - playerPos.x
    const dz = t.z - playerPos.z
    if (dx * dx + dz * dz > strikeCenterSq) return
    candidates.push({ x: t.x, z: t.z })
  })
  if (candidates.length === 0) return []

  // 무작위 셔플 후 N개.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  return candidates.slice(0, Math.max(1, Math.floor(strikeCount)))
}

export function createStarlinkStrikeQueue(targets, weapon) {
  const spacingMs = Math.max(0, Number(weapon?.strikeSpacingMs ?? 450))
  return targets.map((target, index) => ({
    ...target,
    damage: weapon?.damage,
    radius: weapon?.strikeRadius ?? 1.2,
    critChance: weapon?.critChance,
    critMultiplier: weapon?.critMultiplier,
    delayMs: index * spacingMs,
  }))
}

// 번개 한 겹의 표시·투명도. Studio 재질 튜닝은 재질을 복제본으로 바꾸므로 JSX 재질이 아니라
// 지금 메시에 붙은 재질에 쓴다. 겹은 항상 마운트해 두고 보이기만 끈다 — 늦게 마운트된 메시는
// Studio 튜닝을 못 받고, 자식 순서가 밀리면 저장된 파츠 경로가 엉뚱한 대상을 가리킨다.
function setStrikeLayer(mesh, opacity) {
  if (!mesh) return
  mesh.visible = opacity > 0
  if (mesh.material) mesh.material.opacity = opacity
}

// 확산 링의 선언 배율은 Studio 미리보기 기본 자세(age 180ms)의 확산 배율이다. 미리보기에서 보던
// 기준 크기를 base로 두고, 애니메이션은 그 base 대비 배율로만 곱한다(Studio 파츠 배율 보존).
const STRIKE_RING_REST_SCALE = 1.4

// fallback base는 선언 배율과 같아야 한다. 미리보기 루트는 이 layout effect 뒤에 base를 잡는데,
// age 180에서는 애니메이션 배율이 정확히 1이라 선언값 그대로 base가 된다.
function setStrikeRingScale(mesh, restScale, flashScale) {
  if (!mesh) return
  const animation = flashScale / STRIKE_RING_REST_SCALE
  mesh.scale.set(
    composeStudioPartScale(mesh, 'x', restScale, animation),
    composeStudioPartScale(mesh, 'y', restScale, animation),
    composeStudioPartScale(mesh, 'z', 1, 1),
  )
}

export function StrikeVisual({ x, z, age = 0, ageRef = null }) {
  const boltOuterRef = useRef(null)
  const boltCoreRef = useRef(null)
  const flashCoreRef = useRef(null)
  const flashYellowRef = useRef(null)
  const ringInnerRef = useRef(null)
  const ringOuterRef = useRef(null)

  // 0..1 진행도. 처음 55%는 번개 줄기, 나머지는 ground flash.
  // 게임은 ageRef로 매 프레임 진행하고(리렌더 없음), Studio 미리보기는 고정 age prop을 쓴다.
  const applyStrike = () => {
    const currentAge = ageRef ? ageRef.current : age
    const t = Math.min(1, currentAge / STRIKE_DURATION_MS)
    const boltOpacity = t < 0.55 ? 1 - t / 0.55 : 0
    const flashOpacity = t >= 0.35 ? Math.max(0, 1 - (t - 0.35) / 0.65) : 0
    const flashScale = 0.5 + t * 2.4
    setStrikeLayer(boltOuterRef.current, boltOpacity * 0.9)
    setStrikeLayer(boltCoreRef.current, boltOpacity)
    setStrikeLayer(flashCoreRef.current, flashOpacity * 0.95)
    setStrikeLayer(flashYellowRef.current, flashOpacity * 0.88)
    setStrikeLayer(ringInnerRef.current, flashOpacity * 0.9)
    setStrikeLayer(ringOuterRef.current, flashOpacity * 0.45)
    setStrikeRingScale(ringInnerRef.current, STRIKE_RING_REST_SCALE, flashScale)
    setStrikeRingScale(ringOuterRef.current, STRIKE_RING_REST_SCALE * 1.6, flashScale)
  }
  // StudioTunedGroup(자식)의 튜닝·재질 복제가 끝난 뒤, 첫 페인트 전에 한 번 적용한다.
  useLayoutEffect(applyStrike)
  useFrame(applyStrike)

  return (
    <group position={[x, 0, z]}>
      <StudioTunedGroup itemId="weapon-starlink">
      {/* 번개 줄기 외곽 — 선명한 청백색 두꺼운 기둥 */}
      <mesh ref={boltOuterRef} position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.14, 0.06, 4.8, 8]} />
        <meshBasicMaterial color={0x44aaff} transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 번개 줄기 코어 — 순백색 날카로운 중심 */}
      <mesh ref={boltCoreRef} position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.045, 0.016, 4.8, 6]} />
        <meshBasicMaterial color={0xffffff} transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 충돌 지점 백색 코어 플래시 */}
      <mesh ref={flashCoreRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} renderOrder={6}>
        <circleGeometry args={[scaleEffectVisual(0.5), 32]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 충돌 지점 노란 플래시 */}
      <mesh ref={flashYellowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={5}>
        <circleGeometry args={[scaleEffectVisual(1.0), 32]} />
        <meshBasicMaterial
          color={0xffee00}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 1차 확산 링 — 청백색 */}
      <mesh ref={ringInnerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} scale={[STRIKE_RING_REST_SCALE, STRIKE_RING_REST_SCALE, 1]} renderOrder={4}>
        <ringGeometry args={[scaleEffectVisual(0.8), scaleEffectVisual(1.05), 32]} />
        <meshBasicMaterial color={0x88ddff} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 2차 확산 링 — 넓게 퍼지는 옅은 황색 외곽 glow */}
      <mesh ref={ringOuterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={[STRIKE_RING_REST_SCALE * 1.6, STRIKE_RING_REST_SCALE * 1.6, 1]} renderOrder={3}>
        <ringGeometry args={[scaleEffectVisual(0.85), scaleEffectVisual(1.15), 32]} />
        <meshBasicMaterial color={0xffff88} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      </StudioTunedGroup>
    </group>
  )
}

function StrikeWrapper({ id, x, z, damage, radius, critChance, critMultiplier, delayMs = 0, onDone }) {
  const ageRef = useRef(0)
  const strikeAgeRef = useRef(0)
  const damageDealtRef = useRef(false)
  // 지연이 끝나는 순간 한 번만 리렌더해 번개를 마운트한다. 이후 진행은 strikeAgeRef로만 전달한다.
  const [started, setStarted] = useState(delayMs <= 0)

  usePlayingFrame((_, delta) => {
    ageRef.current += delta * 1000
    if (ageRef.current < delayMs) return
    if (!started) setStarted(true)
    const strikeAge = ageRef.current - delayMs
    strikeAgeRef.current = strikeAge
    if (strikeAge > STRIKE_DURATION_MS) {
      onDone(id)
      return
    }

    // strike가 떨어진 직후(t≈0.3-0.5 구간)에 1회 데미지 적용.
    if (!damageDealtRef.current && strikeAge >= STRIKE_DURATION_MS * 0.3) {
      damageDealtRef.current = true
      const hitCount = applyRadialDamage({ x, z, radius, damage, knockback: 1.4, knockbackMs: 80, critChance, critMultiplier })
      if (hitCount > 0) emitSfx({ id: 'starlinkHit' })
    }
  })

  if (!started) return null
  return <StrikeVisual x={x} z={z} ageRef={strikeAgeRef} />
}

export function StarlinkWeapon() {
  const [strikes, setStrikes] = useState([])
  const activeStrikesRef = useRef([])
  const lastFireRef = useRef(0)
  // 추락: 15회 발사마다 위성이 지우개 폭탄 위력으로 착지한다.
  const fireCountRef = useRef(0)
  const [crashes, setCrashes] = useState([])
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const phaseRef = useRef(phase)
  const eraserBombRef = useRef(weapons.eraserBomb)
  const pendingCrashImpactsRef = useRef([])
  phaseRef.current = phase
  eraserBombRef.current = weapons.eraserBomb

  const removeStrike = useCallback((sid) => {
    activeStrikesRef.current = activeStrikesRef.current.filter((s) => s.id !== sid)
    setStrikes([...activeStrikesRef.current])
  }, [])

  const removeCrash = useCallback((cid) => {
    setCrashes((cs) => cs.filter((c) => c.id !== cid))
  }, [])

  const appendCrash = useCallback(() => {
    const crash = createStarlinkCrash({
      playerPosition: playerPos,
      bodies: enemyBodies,
      bounds: screenBounds,
    })
    setCrashes((cs) => [...cs, { id: ++_crashId, ...crash }])
  }, [])

  const queueCrashImpact = useCallback((crash, impactCenter) => {
    enqueueStarlinkCrashImpact(pendingCrashImpactsRef.current, crash, impactCenter)
  }, [])

  useBeforePhysicsStep(() => {
    const queue = pendingCrashImpactsRef.current
    if (queue.length === 0) return

    // Do not allow a callback queued at the phase boundary to deal damage
    // after the game has stopped. Dropping it also prevents stale replay hits.
    if (phaseRef.current !== 'playing') {
      queue.length = 0
      return
    }

    flushStarlinkCrashImpactQueue(queue, eraserBombRef.current)
  })

  useEffect(() => {
    if (phase !== 'playing') pendingCrashImpactsRef.current.length = 0
  }, [phase])

  useEffect(() => {
    const triggerCrash = () => appendCrash()
    window.addEventListener(STARLINK_CHEAT_CRASH_EVENT, triggerCrash)
    return () => window.removeEventListener(STARLINK_CHEAT_CRASH_EVENT, triggerCrash)
  }, [appendCrash])

  usePlayingFrame(({ clock }) => {
    const w = weapons.starlink
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return

    const targets = pickStrikeTargets(w.strikeCenter ?? 5, w.strikeCount ?? 1)
    if (targets.length === 0) return

    lastFireRef.current = now
    emitSfx({ id: 'starlinkFire' })
    const nextStrikes = createStarlinkStrikeQueue(targets, w).map((strike) => ({
      id: ++_strikeId,
      ...strike,
    }))
    activeStrikesRef.current = [...activeStrikesRef.current, ...nextStrikes]
    setStrikes([...activeStrikesRef.current])

    // 15회 발사 카운트 — trigger 시 위성 추락을 시작하고 카운터를 리셋한다.
    const adv = advanceCrashCounter(fireCountRef.current)
    fireCountRef.current = adv.count
    if (adv.trigger) {
      appendCrash()
    }
  })

  if (!weapons.starlink?.active && strikes.length === 0 && crashes.length === 0) return null

  return (
    <>
      {strikes.map((s) => (
        <StrikeWrapper key={s.id} {...s} onDone={removeStrike} />
      ))}
      {crashes.map((c) => (
        <StarlinkCrashSequence key={c.id} x={c.x} z={c.z} bossId={c.bossId} onImpact={(impactCenter) => queueCrashImpact(c, impactCenter)} onDone={() => removeCrash(c.id)} />
      ))}
    </>
  )
}
