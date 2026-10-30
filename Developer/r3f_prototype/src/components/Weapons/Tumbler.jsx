import { useRef, useMemo, useEffect } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { applyEnemyHit, isEnemyHitLive } from '../../lib/weaponCollision.js'
import { createWeaponTargetScratch, resolveWeaponTarget, scanOrbitEnemiesInto } from '../../lib/weaponTargeting.js'
import { tumblerHitMultiplier } from '../../lib/tumblerFalloff.js'
import { consumeTumblerDurability } from '../../lib/tumblerDurability.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

export function TumblerModel() {
  const bodyMat = useMemo(() => toonMat(0x68d8ee, 0.15), [])
  const capMat = useMemo(() => toonMat(0xf4fbff, 0.08), [])
  const outMat = useMemo(() => outlineMat(0.92), [])
  const handleMat = useMemo(() => toonMat(0x83eadc, 0.14), [])
  const strawMat = useMemo(() => toonMat(0x83eadc, 0.12), [])

  return (
    <StudioTunedGroup itemId="weapon-tumbler">
      <group rotation={[0, 0, Math.PI / 2]} scale={[0.6375, 0.6375, 0.6375]}>
      <mesh material={outMat} scale={inflateScale([1.12, 1.12, 1.08])}>
        <cylinderGeometry args={[0.15, 0.20, 0.58, 10]} />
      </mesh>
      <mesh material={bodyMat}>
        <cylinderGeometry args={[0.15, 0.20, 0.58, 10]} />
      </mesh>
      <mesh material={capMat} position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.10, 10]} />
      </mesh>
      {/* 손잡이 (C자 루프) — 바디 +X 측, 개구부가 바디를 향함 */}
      <mesh material={outMat} position={[0.29, 0, 0]} rotation={[0, 0, -Math.PI * 0.7]} scale={inflateScale([1.13, 1.13, 1.13])}>
        <torusGeometry args={[0.20, 0.035, 8, 24, Math.PI * 1.4]} />
      </mesh>
      <mesh material={handleMat} position={[0.29, 0, 0]} rotation={[0, 0, -Math.PI * 0.7]}>
        <torusGeometry args={[0.20, 0.035, 8, 24, Math.PI * 1.4]} />
      </mesh>
      {/* 빨대 — 뚜껑 위로 비스듬히, 손잡이 반대(-X)로 기울임 */}
      <mesh material={outMat} position={[-0.05, 0.56, 0]} rotation={[0, 0, Math.PI * 0.12]} scale={inflateScale([1.16, 1.16, 1.16])}>
        <cylinderGeometry args={[0.028, 0.028, 0.42, 8]} />
      </mesh>
      <mesh material={strawMat} position={[-0.05, 0.56, 0]} rotation={[0, 0, Math.PI * 0.12]}>
        <cylinderGeometry args={[0.028, 0.028, 0.42, 8]} />
      </mesh>
      </group>
    </StudioTunedGroup>
  )
}

export function TumblerOrbit() {
  const visualRefs = useRef([])
  const lastHitRef = useRef({ times: new Float64Array(200), generations: new Uint16Array(200), special: new Array(3), specialTimes: new Float64Array(3) })
  const targetScratchRef = useRef(createWeaponTargetScratch())
  // 텀블러 전역 타격 순번. 적별이 아니라 "때린 순서"라서 ref 하나면 된다.
  // 실제로 피해가 들어간 타격만 센다(applyEnemyHit이 true를 준 경우).
  const hitSeqRef = useRef(0)
  const impactRef = useRef({ knockback: 3, knockbackMs: 220, source: { x: 0, z: 0 }, critChance: 0, critMultiplier: 1 })
  const orbitXRef = useRef(new Float32Array(3))
  const orbitZRef = useRef(new Float32Array(3))
  // 내구력(2026-10-30, lib/tumblerDurability.js). 텀블러별로 "다시 생긴 뒤 쓴 횟수"와 재생 시각을 든다.
  // 깨진 텀블러는 오리요강처럼 살아 있는 궤도체 배열에서 빼고 스캔한다.
  const liveXRef = useRef(new Float32Array(3))
  const liveZRef = useRef(new Float32Array(3))
  const durabilityUsedRef = useRef(new Uint16Array(3))
  const brokenUntilRef = useRef(new Float64Array(3))
  const wasActiveRef = useRef(false)
  const weapons = useGameStore((s) => s.weapons)

  usePlayingFrame(({ clock }) => {
    const w = weapons.tumbler
    if (!w?.active) return

    const nowSec = clock.elapsedTime
    const count = Math.max(1, Math.min(3, w.count ?? 1))
    const radius = w.radius
    const y = playerPos.y + 0.16
    const nowMs = nowSec * 1000
    const brokenUntil = brokenUntilRef.current

    // 깨진 텀블러도 궤도 좌표는 계속 돈다 — 다시 생길 때 다른 텀블러와 간격이 유지된다.
    let liveCount = 0
    for (let i = 0; i < count; i += 1) {
      const angle = nowSec * w.orbitSpeed + (Math.PI * 2 * i) / count
      const x = playerPos.x + Math.sin(angle) * radius
      const z = playerPos.z + Math.cos(angle) * radius
      orbitXRef.current[i] = x
      orbitZRef.current[i] = z
      if (brokenUntil[i] > 0 && brokenUntil[i] <= nowMs) {
        // 재생 완료: 내구력 가득. 해금 때 쓰는 tumblerFire를 작게 다시 울려 복귀를 알린다.
        brokenUntil[i] = 0
        durabilityUsedRef.current[i] = 0
        emitSfx({ id: 'tumblerFire', volume: 0.55 })
      }
      const alive = brokenUntil[i] === 0
      if (alive) {
        liveXRef.current[liveCount] = x
        liveZRef.current[liveCount] = z
        liveCount += 1
      }
      if (visualRefs.current[i]) {
        visualRefs.current[i].visible = alive
        visualRefs.current[i].position.set(x, y, z)
        visualRefs.current[i].rotation.set(0.2, angle, nowSec * 8 + i * 0.8)
      }
    }
    if (liveCount === 0) return

    const interval = 1000 / w.hitsPerSecond
    const hitRadius = w.hitRadius ?? 0.46
    const scratch = targetScratchRef.current
    const targetCount = scanOrbitEnemiesInto(scratch, liveXRef.current, liveZRef.current, liveCount, hitRadius)
    for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
      const special = scratch.special[targetIndex]
      const index = scratch.indices[targetIndex]
      const generation = special ? (scratch.generations[targetIndex] || null) : scratch.generations[targetIndex]
      const rb = special ?? resolveWeaponTarget(index, generation, null)
      if (!isEnemyHitLive(rb, generation)) continue
      // 이 적을 때린 텀블러 = 가장 가까운 살아 있는 텀블러. 이번 프레임에 깨진 텀블러는 여기서 빠진다.
      const t = rb.translation()
      let cup = -1
      let bestDistSq = Infinity
      for (let i = 0; i < count; i += 1) {
        if (brokenUntil[i] > 0) continue
        const dx = t.x - orbitXRef.current[i]
        const dz = t.z - orbitZRef.current[i]
        const distSq = dx * dx + dz * dz
        if (distSq < bestDistSq) { bestDistSq = distSq; cup = i }
      }
      if (cup < 0) break
      let lastHit = 0
      let specialSlot = -1
      if (special) {
        for (let slot = 0; slot < 3; slot += 1) {
          if (lastHitRef.current.special[slot] === special || lastHitRef.current.special[slot] === undefined) {
            if (lastHitRef.current.special[slot] === undefined) lastHitRef.current.special[slot] = special
            specialSlot = slot
            lastHit = lastHitRef.current.specialTimes[slot]
            break
          }
        }
      } else {
        if (lastHitRef.current.generations[index] !== generation) {
          lastHitRef.current.generations[index] = generation
          lastHitRef.current.times[index] = 0
        }
        lastHit = lastHitRef.current.times[index]
      }
      if (nowMs - lastHit < interval) continue
      const impact = impactRef.current
      impact.source.x = playerPos.x; impact.source.z = playerPos.z
      impact.critChance = w.critChance; impact.critMultiplier = w.critMultiplier
      // 연속 타격 감쇠: 5타 주기로 1.00 → 0.60 → 다시 1.00 (lib/tumblerFalloff.js).
      const falloffDamage = w.damage * tumblerHitMultiplier(hitSeqRef.current)
      if (!applyEnemyHit(rb, generation, falloffDamage, impact)) continue
      hitSeqRef.current += 1
      useGameStore.getState().recordMissionEvent({ type: 'weapon_hit', weaponKey: 'tumbler' })
      if (special) {
        if (specialSlot >= 0) lastHitRef.current.specialTimes[specialSlot] = nowMs
      } else lastHitRef.current.times[index] = nowMs
      // 플레이어를 source로 줘서 오로지 바깥쪽(반경 방향)으로만 밀려나게 하고,
      // 우산 폭발과 동일한 세기(knockback 3.0, knockbackMs 220)로 뒤로 밀어낸다.
      emitSfx({
        id: 'tumblerHit',
        volume: 0.70 + Math.random() * 0.20,
        rate: 0.90 + Math.random() * 0.15,
      })
      const wear = consumeTumblerDurability({
        used: durabilityUsedRef.current[cup],
        durability: w.durability,
        rechargeMs: w.rechargeMs,
        nowMs,
      })
      durabilityUsedRef.current[cup] = wear.used
      if (wear.broken && wear.brokenUntilMs > nowMs) {
        // 깨짐: 새 에셋 없이 기존 tumblerHit을 낮은 피치로 한 번 더 — 둔탁하게 "퍽".
        brokenUntil[cup] = wear.brokenUntilMs
        emitSfx({ id: 'tumblerHit', volume: 0.95, rate: 0.62 })
      }
    }
  })

  // ponytail: 텀블러는 항상 활성, fire 이벤트 없으므로 활성화 시점에 1회 emit
  // ref는 런이 바뀌어도 살아남으므로 활성화될 때 내구력 상태를 비운다(오리요강과 같은 이유).
  useEffect(() => {
    const active = !!weapons.tumbler?.active
    if (active && !wasActiveRef.current) {
      emitSfx({ id: 'tumblerFire' })
      durabilityUsedRef.current.fill(0)
      brokenUntilRef.current.fill(0)
    }
    wasActiveRef.current = active
  }, [weapons.tumbler?.active])

  if (!weapons.tumbler?.active) return null
  const tumblerCount = Math.max(1, Math.min(3, weapons.tumbler.count ?? 1))

  return (
    <>
      {Array.from({ length: tumblerCount }, (_, idx) => (
        <group key={`tumbler-visual-${idx}`} ref={(node) => { visualRefs.current[idx] = node }}>
          <TumblerModel />
        </group>
      ))}
    </>
  )
}
