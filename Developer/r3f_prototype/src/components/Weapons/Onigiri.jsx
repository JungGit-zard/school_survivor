import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { findClosestEnemy } from '../../lib/weaponTargeting.js'
import { applyEnemyHit } from '../../lib/weaponCollision.js'
import { FLIGHT_DONE, createOnigiriBurstGrains, createOnigiriFlight, planOnigiriFrame, stepOnigiriFlight } from '../../lib/onigiri.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

let _onigiiriId  = 0
const nextOnigiriId = () => ++_onigiiriId

export function OnigiiriModel() {
  const riceMat = useMemo(() => toonMat(0xfcf8f0, 0.06), [])
  const noriMat = useMemo(() => toonMat(0x192e13, 0.04), [])
  const noriHiMat = useMemo(() => toonMat(0x36542c, 0.08), [])
  const bumpMat = useMemo(() => toonMat(0xe5e3d0, 0.08), [])
  const outMat  = useMemo(() => outlineMat(0.97), [])

  const bumps = [
    [0,     0.26,  0.29],
    [-0.15, 0.12,  0.26],
    [ 0.15, 0.12,  0.26],
    [0,     0.00,  0.30],
    [-0.13,-0.10,  0.27],
    [ 0.13,-0.10,  0.27],
  ]

  return (
    <StudioTunedGroup itemId="weapon-onigiri">
      <group scale={[0.42, 0.42, 0.42]}>
      <mesh renderOrder={1} material={outMat} scale={inflateScale([1.15, 1.10, 1.15])}>
        <cylinderGeometry args={[0.26, 0.50, 0.74, 3]} />
      </mesh>
      <mesh renderOrder={2} material={riceMat}>
        <cylinderGeometry args={[0.26, 0.50, 0.74, 3]} />
      </mesh>
      {bumps.map(([x, y, z], i) => (
        <mesh key={i} renderOrder={3} material={bumpMat} position={[x, y, z]}>
          <sphereGeometry args={[0.095, 7, 5]} />
        </mesh>
      ))}
      <mesh renderOrder={3} material={outMat} position={[0, -0.23, 0.36]} scale={inflateScale([1.08, 1.08, 1.08])}>
        <boxGeometry args={[0.46, 0.36, 0.08]} />
      </mesh>
      <mesh renderOrder={4} material={noriMat} position={[0, -0.23, 0.405]}>
        <boxGeometry args={[0.42, 0.32, 0.065]} />
      </mesh>
      <mesh renderOrder={5} material={noriHiMat} position={[-0.10, -0.12, 0.442]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.18, 0.035, 0.018]} />
      </mesh>
      <mesh renderOrder={5} material={noriHiMat} position={[0.11, -0.28, 0.442]} rotation={[0, 0, 0.42]}>
        <boxGeometry args={[0.16, 0.032, 0.018]} />
      </mesh>
      </group>
    </StudioTunedGroup>
  )
}

function OnigiriBurstGrain({ grain, startMs }) {
  const groupRef = useRef(null)
  const riceRef = useRef(null)
  const riceMat = useMemo(() => {
    const mat = toonMat(0xfffbef, 0.2)
    mat.transparent = true
    mat.opacity = 1
    mat.depthWrite = false
    mat.toneMapped = false
    return mat
  }, [])

  usePlayingFrame(({ clock }) => {
    const age = clock.elapsedTime * 1000 - startMs - grain.delayMs
    if (age < 0 || !groupRef.current) return

    const t = Math.min(1, age / 360)
    const pop = Math.sin(t * Math.PI)
    const dist = grain.speed * t
    const fade = Math.max(0, 1 - t)

    groupRef.current.position.set(
      grain.x + Math.cos(grain.angle) * dist,
      0.12 + pop * grain.lift,
      grain.z + Math.sin(grain.angle) * dist,
    )
    groupRef.current.rotation.set(t * grain.spin, grain.angle, t * grain.spin * 0.6)
    groupRef.current.scale.setScalar(1 + pop * 0.35)
    if (riceRef.current) riceRef.current.material.opacity = fade
  })

  return (
    <group ref={groupRef} position={[grain.x, 0.12, grain.z]}>
      <mesh ref={riceRef} material={riceMat} scale={[grain.size * 1.65, grain.size * 0.9, grain.size]} renderOrder={7}>
        <sphereGeometry args={[1, 8, 5]} />
      </mesh>
    </group>
  )
}

function OnigiriBurst({ id, x, z, startMs, onDone }) {
  const doneRef = useRef(false)
  const grains = useMemo(() => createOnigiriBurstGrains({ id, x, z, count: 16 }), [id, x, z])

  usePlayingFrame(({ clock }) => {
    if (doneRef.current) return
    if (clock.elapsedTime * 1000 - startMs >= 430) {
      doneRef.current = true
      onDone(id)
    }
  })

  return (
    <group>
      {grains.map((grain) => (
        <OnigiriBurstGrain key={grain.key} grain={grain} startMs={startMs} />
      ))}
    </group>
  )
}

function OnigiiriProjectile({ id, start, initialTarget, hitIds, maxBounces, damage, bounceRange, critChance, critMultiplier, onDone, onBurst }) {
  const groupRef   = useRef()
  // 비행 상태는 공용 진행기(stepOnigiriFlight)가 소유한다. 바운스가 남아 있으면 사라지지 않고,
  // 맞힌 자리·표적을 잃은 자리에서 bounceRange 안 다음 적을 찾고, 없으면 제자리에 떠서 기다린다.
  const flightRef  = useRef(null)
  if (flightRef.current === null) {
    flightRef.current = createOnigiriFlight({ start, initialTarget, hitIds, maxBounces, bounceRange })
  }
  const spinRef    = useRef(0)
  const doneRef    = useRef(false)
  const SPEED      = 11 / 8

  usePlayingFrame(({ clock }, delta) => {
    if (doneRef.current || !groupRef.current) return

    spinRef.current += delta * 15
    const flight = flightRef.current
    const state = stepOnigiriFlight(flight, delta, SPEED)

    if (flight.hitTarget) {
      const hitIndex = maxBounces - flight.bouncesLeft - 1
      const hit = applyEnemyHit(flight.hitTarget.rb, flight.hitTarget.generation, damage, {
        source: { x: flight.hitFromX, z: flight.hitFromZ },
        knockback: 3.2, knockbackMs: 90,
        critChance,
        critMultiplier,
      })
      if (hit) {
        emitSfx({
          id: 'onigiriHit',
          volume: 0.50,
          rate: 0.96 + Math.min(hitIndex, 2) * 0.06,
        })
      }
    }

    if (state === FLIGHT_DONE) {
      onBurst(flight.x, flight.z, clock.elapsedTime * 1000)
      doneRef.current = true; onDone(id); return
    }

    // 표적이 없으면(FLIGHT_HOVERING) 수평 위치는 그대로 두고 제자리에서 통통 튀며 돈다.
    groupRef.current.position.set(
      flight.x,
      start[1] + 0.25 + Math.abs(Math.sin(spinRef.current * 0.45)) * 0.22,
      flight.z,
    )
    groupRef.current.rotation.y  = spinRef.current
    groupRef.current.rotation.x  = Math.sin(spinRef.current * 0.8) * 0.35
    groupRef.current.rotation.z  = Math.cos(spinRef.current * 0.6) * 0.25
  })

  return (
    <group ref={groupRef} position={[start[0], start[1] + 0.25, start[2]]}>
      <OnigiiriModel />
    </group>
  )
}

export function OnigiiriWeapon() {
  const [projectiles, setProjectiles] = useState([])
  const [bursts, setBursts]           = useState([])
  const projRef      = useRef([])
  const lastFireRef  = useRef(0)
  const burstIdRef   = useRef(0)
  const phase   = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const expire = useCallback((id) => {
    projRef.current = projRef.current.filter((p) => p.id !== id)
    setProjectiles([...projRef.current])
  }, [])

  const addBurst = useCallback((x, z, startMs) => {
    setBursts((prev) => [...prev, { id: ++burstIdRef.current, x, z, startMs }])
  }, [])

  const removeBurst = useCallback((id) => {
    setBursts((prev) => prev.filter((burst) => burst.id !== id))
  }, [])

  // balanceqa F1 (2026-11-02): 교체 카드로 무기가 빠지는 순간 떠 있던 주먹밥과 쌀알 연출은 끝난다.
  // 목록을 비우지 않으면 같은 판에서 다시 얻었을 때 옛 주먹밥이 처음 던진 자리에서 바운스가 꽉 찬 채 되살아난다.
  const active = !!weapons.onigiri?.active
  useEffect(() => {
    if (active) return
    if (projRef.current.length > 0) {
      projRef.current = []
      setProjectiles([])
    }
    setBursts((prev) => (prev.length > 0 ? [] : prev))
  }, [active])

  usePlayingFrame(({ clock }) => {
    const w = weapons.onigiri
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    // 쿨다운 전에는 아무것도 만들지 않는다(balanceqa F3: 매 프레임 할당 없음).
    if (now - lastFireRef.current < w.cooldown) return

    // 2026-11-02 Terry: "화면상 오니기리가 몇 개 있더라도 늘려" — 이미 날거나 떠 있는 주먹밥 수로
    // 새 투척을 막거나 늦추지 않는다. 새 투척은 언제나 이번 프레임의 주인공 몸(playerPos)에서 출발한다.
    const launch = planOnigiriFrame({
      now,
      lastFireAt: lastFireRef.current,
      weapon: w,
      origin: playerPos,
      findFreshTarget: findClosestEnemy,
      nextId: nextOnigiriId,
    })
    if (!launch) return
    lastFireRef.current = now
    emitSfx({ id: 'onigiriFire' })
    projRef.current = [...projRef.current, launch]
    setProjectiles([...projRef.current])
  })

  if (!weapons.onigiri?.active) return null

  return (
    <>
      {projectiles.map((p) => (
        <OnigiiriProjectile key={p.id} {...p} onDone={expire} onBurst={addBurst} />
      ))}
      {bursts.map((burst) => (
        <OnigiriBurst key={burst.id} {...burst} onDone={removeBurst} />
      ))}
    </>
  )
}
