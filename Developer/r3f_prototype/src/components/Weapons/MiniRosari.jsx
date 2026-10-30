import { useRef, useState, useCallback, useEffect } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { findClosestEnemy } from '../../lib/weaponTargeting.js'
import { applyEnemyHit, isEnemyHitLive } from '../../lib/weaponCollision.js'
import { pickNextOnigiriTarget } from '../../lib/onigiri.js'
import PlayerMesh from '../PlayerMesh.jsx'
import PlayerV9Model from '../PlayerV9Model.jsx'
import PlayerRosariModel from '../PlayerRosariModel.jsx'
import { loadSavedPlayerAppearance, resolvePlayerAppearance } from '../Player.jsx'
import { loadPlayerOutfit } from '../../lib/titleSettings.js'

// 꼬마 로자리(miniRosari) — 2026-10-30 Terry: "작은 로자리가 나가는 아이디어가 너무 좋다 다른 무기로 구현해".
// 2026-10-28(b3fada83)에 오니기리 발사체를 주인공 미니 분신으로 바꿨던 구현을 오니기리에서 떼어 내
// 독립 무기로 옮겼다. 오니기리는 다시 주먹밥을 던진다.
// 동작: 가장 가까운 적에게 주인공(같은 모델·같은 Studio 튜닝·저장된 외형/의상)의 절반 크기 분신이
// 깡충깡충 뛰어가 부딪히고, bounceRange 안의 다음 적으로 튕겨 간다(오니기리와 같은 바운스 규칙).
// 수치는 전부 weaponCatalog.js의 miniRosari.base 한 곳에서 조정한다.
//
// 한 번에 분신 1개만 날리므로(projRef 게이트) 분신도 무기 장착 동안 1개만 상주시키고,
// 발사할 때마다 모델을 다시 복제하지 않고 위치·표시만 바꾼다.
export const MINI_ROSARI_SCALE = 0.5
// 주인공 모델 원점은 몸통 중심(발바닥 = -0.32). 분신 발이 바닥에 닿는 높이 = 0.32 × 축척.
const MINI_ROSARI_FOOT_OFFSET = 0.32 * MINI_ROSARI_SCALE
const MINI_ROSARI_HOP_HEIGHT = 0.22
// 이동 속도(units/s). 2026-10-28 오니기리 분신 시절 값 11/8 그대로.
const MINI_ROSARI_SPEED = 11 / 8

let _miniRosariId = 0

function MiniRosariModel({ animateRef }) {
  const movingRef = useRef(true)
  // 외형·의상은 장착 시점의 저장값으로 고정한다(런 도중 바뀌지 않는다).
  const [look] = useState(() => ({
    appearance: resolvePlayerAppearance(loadSavedPlayerAppearance()),
    outfit: loadPlayerOutfit(),
  }))
  return (
    <group scale={[MINI_ROSARI_SCALE, MINI_ROSARI_SCALE, MINI_ROSARI_SCALE]}>
      {look.appearance === 'legacy'
        ? <PlayerMesh movingRef={movingRef} outfit={look.outfit} />
        : look.appearance === 'rosari'
          ? <PlayerRosariModel movingRef={movingRef} animateRef={animateRef} gameplay />
          : <PlayerV9Model movingRef={movingRef} animateRef={animateRef} gameplay outfit={look.outfit} />}
    </group>
  )
}

function MiniRosariProjectile({ id, start, initialTarget, maxBounces, damage, bounceRange, critChance, critMultiplier, onDone, visualRef }) {
  const groupRef   = visualRef
  const posRef     = useRef({ x: start[0], y: start[1], z: start[2] })
  const targetRef  = useRef(initialTarget)
  const bouncesRef = useRef(maxBounces)
  const hitSetRef  = useRef(new Set([initialTarget.enemyId]))
  const hopPhaseRef = useRef(0)
  const doneRef    = useRef(false)

  usePlayingFrame((_, delta) => {
    if (doneRef.current || !groupRef.current) return

    hopPhaseRef.current += delta * 15

    const target = targetRef.current
    if (!isEnemyHitLive(target.rb, target.generation)) {
      const next = pickNextOnigiriTarget({
        from: posRef.current,
        hitSet: hitSetRef.current,
      })
      if (!next) {
        doneRef.current = true; onDone(id); return
      }
      hitSetRef.current.add(next.enemyId)
      targetRef.current = next
      return
    }

    const t  = target.rb.translation()
    const p  = posRef.current
    const dx = t.x - p.x
    const dz = t.z - p.z
    const dist = Math.hypot(dx, dz)

    if (dist < 0.30) {
      const hitIndex = maxBounces - bouncesRef.current
      const hit = applyEnemyHit(target.rb, target.generation, damage, {
        source: { x: p.x, z: p.z },
        knockback: 3.2, knockbackMs: 90,
        critChance,
        critMultiplier,
      })
      if (hit) {
        // 전용 효과음이 없어 오니기리 타격음을 공유한다(soundmini 검토 대상).
        emitSfx({
          id: 'onigiriHit',
          volume: 0.50,
          rate: 0.96 + Math.min(hitIndex, 2) * 0.06,
        })
      }
      bouncesRef.current--
      p.x = t.x; p.z = t.z

      const next = pickNextOnigiriTarget({
        from: { x: t.x, z: t.z },
        hitSet: hitSetRef.current,
        range: bounceRange,
      })

      if (bouncesRef.current <= 0 || !next) {
        doneRef.current = true; onDone(id); return
      }
      hitSetRef.current.add(next.enemyId)
      targetRef.current = next
      return
    }

    p.x += (dx / dist) * MINI_ROSARI_SPEED * delta
    p.z += (dz / dist) * MINI_ROSARI_SPEED * delta
    // 분신은 표적을 바라보며 깡충깡충 뛰어간다.
    const hop = Math.abs(Math.sin(hopPhaseRef.current * 0.45)) * MINI_ROSARI_HOP_HEIGHT
    p.y  = start[1] - 0.32 + MINI_ROSARI_FOOT_OFFSET + hop

    groupRef.current.visible = true
    groupRef.current.position.set(p.x, p.y, p.z)
    groupRef.current.rotation.set(0.18, Math.atan2(dx, dz), 0, 'YXZ')
  })

  useEffect(() => () => {
    if (groupRef.current) groupRef.current.visible = false
  }, [groupRef])

  return null
}

export function MiniRosariWeapon() {
  const [projectiles, setProjectiles] = useState([])
  const projRef      = useRef([])
  const miniRef      = useRef(null)
  // 분신이 뛰어가는 동안만 true — 숨겨진 분신의 포즈 계산을 멈춘다(모바일 CPU 절약, 3c0bcbe8).
  const miniActiveRef = useRef(false)
  const lastFireRef  = useRef(0)
  const phase   = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const expire = useCallback((id) => {
    projRef.current = projRef.current.filter((p) => p.id !== id)
    miniActiveRef.current = projRef.current.length > 0
    setProjectiles([...projRef.current])
  }, [])

  usePlayingFrame(({ clock }) => {
    const w = weapons.miniRosari
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return
    if (projRef.current.length > 0) return

    const target = findClosestEnemy(w.range ?? 18)
    if (!target) return
    lastFireRef.current = now
    emitSfx({ id: 'onigiriFire' })

    const p = {
      id:             ++_miniRosariId,
      start:          [playerPos.x, playerPos.y, playerPos.z],
      initialTarget:  target,
      maxBounces:     w.bounces ?? 2,
      damage:         w.damage,
      bounceRange:    w.bounceRange ?? 4.5,
      critChance:     w.critChance,
      critMultiplier: w.critMultiplier,
    }
    projRef.current = [p]
    miniActiveRef.current = true
    setProjectiles([p])
  })

  if (!weapons.miniRosari?.active) return null

  return (
    <>
      <group ref={miniRef} visible={false}>
        <MiniRosariModel animateRef={miniActiveRef} />
      </group>
      {projectiles.map((p) => (
        <MiniRosariProjectile key={p.id} {...p} visualRef={miniRef} onDone={expire} />
      ))}
    </>
  )
}
