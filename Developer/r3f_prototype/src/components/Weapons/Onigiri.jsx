import { useRef, useCallback, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { findClosestEnemy } from '../../lib/weaponTargeting.js'
import { applyEnemyHit } from '../../lib/weaponCollision.js'
import {
  ONIGIRI_HOVER_CAP, ONIGIRI_HOVER_TIMEOUT_MS, addSwarmProjectile, clearProjectileSwarm, countHoveringProjectiles, maxHoverMs,
  createOnigiriBurstGrains, createProjectileSwarm, planOnigiriFrame, stepProjectileSwarm,
} from '../../lib/onigiri.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'
import { ONIGIRI_BURST_GRAINS, ONIGIRI_BURST_LIFE_MS, createOnigiriBodyLayer, createOnigiriGrainLayer } from '../../lib/onigiriInstanceLayer.js'

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

// 2026-11-13 렌더 비용 완화 + Terry "대기 시간+안전 상한":
// - 주먹밥·쌀알은 InstancedMesh 층(lib/onigiriInstanceLayer.js)이 한 번에 그린다. 모양은 아래 무기가 1벌만
//   두는 Studio 튜닝 템플릿(<OnigiiriModel />)에서 그대로 가져온다.
// - 무기 1개가 자기 주먹밥 전부를 한 루프(stepProjectileSwarm)로 진행한다: 던진 순서대로 비행·피격 → 이번
//   스텝 최신 대기 상태로 안전 상한(ONIGIRI_HOVER_CAP) → 대기 시간(ONIGIRI_HOVER_TIMEOUT_MS)·상한으로
//   끝난 주먹밥은 바운스를 다 쓴 것과 같은 쌀알 터짐으로 사라진다. 대기 시간은 게임 시간(고정 스텝)이다.
const SPEED = 11 / 8
const _pose = new THREE.Vector3()
const _rot = new THREE.Euler()

// 예전 발사체 group과 같은 자세: 제자리에서 통통 튀며 돈다(표적이 없으면 수평 위치 그대로).
export function writeOnigiriPose(bodyLayer, entry) {
  const spin = entry.spin
  _pose.set(entry.flight.x, entry.start[1] + 0.25 + Math.abs(Math.sin(spin * 0.45)) * 0.22, entry.flight.z)
  _rot.set(Math.sin(spin * 0.8) * 0.35, spin, Math.cos(spin * 0.6) * 0.25)
  bodyLayer.write(entry.slot, _pose, _rot)
}

function hitOnigiriTarget(entry) {
  const { flight, maxBounces, damage, critChance, critMultiplier } = entry
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

// 테스트·진단용: 지금 마운트된 오니기리 무기의 풀 크기(없으면 null).
let _live = null
export function getOnigiriWeaponStats() {
  if (!_live) return null
  const { swarm, layers, bursts } = _live
  return {
    projectiles: swarm.entries.length,
    hovering: countHoveringProjectiles(swarm),
    maxHoverMs: maxHoverMs(swarm),
    bodyLiveSlots: layers.body.liveSlots,
    bodyInstances: layers.body.count,
    bodyCapacity: layers.body.capacity,
    bursts: bursts.length,
    grainInstances: layers.grains.count,
    grainCapacity: layers.grains.capacity,
  }
}

export function OnigiiriWeapon() {
  const lastFireRef  = useRef(0)
  const burstIdRef   = useRef(0)
  const nowRef       = useRef(0)
  // 쌀알 터짐은 React 상태가 아니라 이 목록에 두고, 430ms가 지나면 제자리에서 빼낸다(매 프레임 할당 없음).
  const burstsRef    = useRef([])
  const templateRef  = useRef(null)
  const layersRef    = useRef(null)
  if (layersRef.current === null) {
    layersRef.current = { body: createOnigiriBodyLayer(16), grains: createOnigiriGrainLayer() }
  }
  const swarmRef = useRef(null)
  if (swarmRef.current === null) {
    swarmRef.current = createProjectileSwarm({ speed: SPEED, hoverTimeoutMs: ONIGIRI_HOVER_TIMEOUT_MS, hoverCap: ONIGIRI_HOVER_CAP })
  }
  const layers  = layersRef.current
  const phase   = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const gameKey = useGameStore((s) => s.gameKey)

  const addBurst = useCallback((x, z, startMs) => {
    const id = ++burstIdRef.current
    burstsRef.current.push({ id, x, z, startMs, grains: createOnigiriBurstGrains({ id, x, z, count: ONIGIRI_BURST_GRAINS }) })
    layersRef.current.grains.writeBursts(burstsRef.current, startMs)
  }, [])

  // 끝난 주먹밥(바운스 소진·대기 시간·안전 상한): 그 자리에서 쌀알 터짐 → 인스턴스 슬롯을 놓는다.
  const retireRef = useRef(null)
  if (retireRef.current === null) {
    retireRef.current = (entry) => {
      addBurst(entry.flight.x, entry.flight.z, nowRef.current)
      layersRef.current.body.release(entry.slot)
      entry.slot = -1
    }
  }

  // 남은 주먹밥·쌀알·슬롯·대기 시간을 전부 비운다(무기 해제·교체, 판 리셋·스테이지 이동·사망 후 재시작).
  const resetAll = useCallback(() => {
    const body = layersRef.current.body
    clearProjectileSwarm(swarmRef.current, (entry) => { body.release(entry.slot); entry.slot = -1 })
    if (burstsRef.current.length > 0) {
      burstsRef.current.length = 0
      layersRef.current.grains.writeBursts(burstsRef.current, 0)
    }
  }, [])

  useEffect(() => {
    _live = { swarm: swarmRef.current, layers: layersRef.current, bursts: burstsRef.current }
    return () => {
      if (_live?.swarm === swarmRef.current) _live = null
      resetAll()
      layersRef.current.body.dispose()
      layersRef.current.grains.dispose()
    }
  }, [resetAll])

  // balanceqa F1 (2026-11-02): 교체 카드로 무기가 빠지는 순간 떠 있던 주먹밥과 쌀알 연출은 끝난다.
  // 목록을 비우지 않으면 같은 판에서 다시 얻었을 때 옛 주먹밥이 처음 던진 자리에서 바운스가 꽉 찬 채 되살아난다.
  const active = !!weapons.onigiri?.active
  useEffect(() => {
    if (!active) resetAll()
  }, [active, resetAll])
  // 판이 새로 시작되면(gameKey) 쿨다운·주먹밥·쌀알을 모두 처음 상태로.
  useEffect(() => {
    resetAll()
    lastFireRef.current = 0
  }, [gameKey, resetAll])

  // 템플릿(Studio 튜닝된 주먹밥 1벌)의 모양을 인스턴스 층에 맞춘다. 일시정지 중에도 돈다 — 멈춘 동안 한
  // Studio Apply도 바로 보인다(할당 없음). 아래 게임 루프보다 먼저 등록돼 같은 프레임에서 먼저 돈다.
  useFrame(() => {
    if (weapons.onigiri?.active) layers.body.syncTemplate(templateRef.current)
  })

  usePlayingFrame(({ clock }, delta) => {
    const w = weapons.onigiri
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    nowRef.current = now
    const swarm = swarmRef.current

    const bursts = burstsRef.current
    if (bursts.length > 0) {
      let kept = 0
      for (let i = 0; i < bursts.length; i += 1) {
        if (now - bursts[i].startMs < ONIGIRI_BURST_LIFE_MS) bursts[kept++] = bursts[i]
      }
      bursts.length = kept
      layers.grains.writeBursts(bursts, now)
    }

    // 쿨다운이 차면 1발(balanceqa F3: 쿨다운 전에는 아무것도 만들지 않는다).
    // 2026-11-02 Terry: "화면상 오니기리가 몇 개 있더라도 늘려" — 이미 날거나 떠 있는 주먹밥 수로
    // 새 투척을 막거나 늦추지 않는다. 새 투척은 언제나 이번 프레임의 주인공 몸(playerPos)에서 출발한다.
    if (now - lastFireRef.current >= w.cooldown) {
      const launch = planOnigiriFrame({
        now,
        lastFireAt: lastFireRef.current,
        weapon: w,
        origin: playerPos,
        findFreshTarget: findClosestEnemy,
        nextId: nextOnigiriId,
      })
      if (launch) {
        lastFireRef.current = now
        emitSfx({ id: 'onigiriFire' })
        const entry = addSwarmProjectile(swarm, launch, { slot: layers.body.claim(), spin: 0 })
        _pose.set(launch.start[0], launch.start[1] + 0.25, launch.start[2])
        _rot.set(0, 0, 0)
        layers.body.write(entry.slot, _pose, _rot)
      }
    }

    stepProjectileSwarm(swarm, delta, { onHit: hitOnigiriTarget, onRetire: retireRef.current })
    for (let i = 0; i < swarm.entries.length; i += 1) {
      const entry = swarm.entries[i]
      if (entry.state === null) continue // 이번 스텝에 막 던졌다 — 처음 자세 그대로
      entry.spin += delta * 15
      writeOnigiriPose(layers.body, entry)
    }
  })

  if (!weapons.onigiri?.active) return null

  return (
    <>
      {/* Studio 튜닝 템플릿 1벌 — 보이지 않고, 모든 주먹밥 인스턴스가 이 모양·재질을 그대로 쓴다. */}
      <group ref={templateRef} visible={false}>
        <OnigiiriModel />
      </group>
      <primitive object={layers.body.group} />
      <primitive object={layers.grains.group} />
    </>
  )
}
