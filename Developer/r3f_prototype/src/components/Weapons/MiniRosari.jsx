import { createRef, useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { findClosestEnemy } from '../../lib/weaponTargeting.js'
import { applyEnemyHit } from '../../lib/weaponCollision.js'
import {
  FLIGHT_FADING, FLIGHT_HOVERING, MINI_ROSARI_HOVER_TIMEOUT_MS, MINI_ROSARI_MAX_ALIVE, addSwarmProjectile,
  clearProjectileSwarm, countFadingProjectiles, countHoveringProjectiles, createProjectileSwarm, maxHoverMs,
  planOnigiriFrame, projectileFadeProgress, stepProjectileSwarm,
} from '../../lib/onigiri.js'
import PlayerMesh from '../PlayerMesh.jsx'
import PlayerV9Model from '../PlayerV9Model.jsx'
import PlayerRosariModel from '../PlayerRosariModel.jsx'
import { loadSavedPlayerAppearance, resolvePlayerAppearance } from '../Player.jsx'

// 꼬마 로자리(miniRosari) — 2026-10-30 Terry: "작은 로자리가 나가는 아이디어가 너무 좋다 다른 무기로 구현해".
// 2026-10-28(b3fada83)에 오니기리 발사체를 주인공 미니 분신으로 바꿨던 구현을 오니기리에서 떼어 내
// 독립 무기로 옮겼다. 오니기리는 다시 주먹밥을 던진다.
// 동작: 가장 가까운 적에게 주인공(같은 모델·같은 Studio 튜닝·저장된 외형/의상)의 절반 크기 분신이
// 깡충깡충 뛰어가 부딪히고, bounceRange 안의 다음 적으로 튕겨 간다(오니기리와 같은 바운스 규칙).
// 수치는 전부 weaponCatalog.js의 miniRosari.base 한 곳에서 조정한다.
//
// 2026-11-22 Terry "주먹밥, 미니로자리를 정리하자": 화면에 분신은 최대 MINI_ROSARI_MAX_ALIVE(3)명 — 3명이
// 살아 있으면 쿨다운이 차도 기다렸다가 하나가 사라지는 다음 프레임에 던진다(예전 11-02 "상한 없음"을 대체).
// 분신 모델은 슬롯 풀로 재사용한다: 무기를 얻는 순간 3명분을 미리 만들어 두고, 빈 슬롯이 없을 때만 하나
// 늘린다(상한 때문에 실제로는 늘지 않는다). 풀은 줄이지 않는다(쓰지 않는 분신은 숨김). 발사할 때마다 모델을
// 다시 복제하지 않고 위치·표시만 바꾼다(3c0bcbe8 모바일 CPU 절약 유지).
export const MINI_ROSARI_SCALE = 0.5
// 주인공 모델 원점은 몸통 중심(발바닥 = -0.32). 분신 발이 바닥에 닿는 높이 = 0.32 × 축척.
const MINI_ROSARI_FOOT_OFFSET = 0.32 * MINI_ROSARI_SCALE
const MINI_ROSARI_HOP_HEIGHT = 0.22
// 이동 속도(units/s). 2026-10-28 오니기리 분신 시절 값 11/8 그대로.
const MINI_ROSARI_SPEED = 11 / 8

let _miniRosariId = 0
const nextMiniRosariId = () => ++_miniRosariId

function MiniRosariModel({ animateRef }) {
  const movingRef = useRef(true)
  // 외형·의상은 장착 시점의 저장값으로 고정한다(런 도중 바뀌지 않는다).
  const [look] = useState(() => ({
    appearance: resolvePlayerAppearance(loadSavedPlayerAppearance()),
    // 본체와 같은 판 고정 옷(store.runOutfitId). 저장값이 아직 없는 옷이면 default를 입는다.
    outfit: useGameStore.getState().runOutfitId,
  }))
  return (
    <group scale={[MINI_ROSARI_SCALE, MINI_ROSARI_SCALE, MINI_ROSARI_SCALE]}>
      {look.appearance === 'legacy'
        ? <PlayerMesh movingRef={movingRef} outfit={look.outfit} />
        : look.appearance === 'rosari'
          ? <PlayerRosariModel movingRef={movingRef} animateRef={animateRef} gameplay />
          : <PlayerV9Model movingRef={movingRef} animateRef={animateRef} gameplay outfit={look.outfit} sharedClone />}
    </group>
  )
}

// 분신은 무기당 1개를 공유한다. 끝나는 그 프레임에 바로 숨겨 공중에 멈춘 채 남지 않게 하고,
// 지금 분신을 차지한 발사체(ownerId)만 숨길 수 있다.
export function hideMiniRosariClone(group, id) {
  if (!group || group.userData.miniRosariOwnerId !== id) return
  group.visible = false
  // 숨은 분신(메시 약 86개)은 매 프레임 행렬 갱신도 건너뛴다. 다시 보일 때 writeMiniRosariPose가 켠다.
  group.matrixWorldAutoUpdate = false
  group.userData.miniRosariOwnerId = null
}

// ── 렌더 비용 완화(balanceqa F2, 2026-11-02) — 게임플레이(탐색·피격)는 건드리지 않는다 ──
// 분신 1개 = 주인공 전체 모델 복제(메시 31~43개 + 외곽선 헐). 기다리는 분신은 상한 없이 쌓일 수 있다.
// 1) 분신은 그림자를 드리우지 않는다. 복제 함수(clonePlayer*Scene)는 본체·타이틀과 공유라 손대지 않고,
//    슬롯 그룹 아래 메시만 끈다(슬롯마다 1번). 반환값 = 끈 메시 수(아직 모델이 안 붙었으면 0).
export function disableMiniRosariCloneShadows(root) {
  let count = 0
  if (typeof root?.traverse !== 'function') return 0
  root.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = false
    count += 1
  })
  return count
}

// 2) 기다리는(FLIGHT_HOVERING) 분신이 카메라 밖이면 숨기고 포즈 계산도 건너뛴다. 뛰어가는 분신과 화면 안의
//    분신은 그대로 그린다. 복제 메시는 frustumCulled = false라 숨기지 않으면 화면 밖에서도 전부 그려진다.
//    반지름은 반 크기 분신(키 약 0.45) + 깡충 높이보다 넉넉하게 잡아 화면 가장자리에서 툭 튀어나오지 않게 한다.
export const MINI_ROSARI_CULL_RADIUS = 0.6
const _cullFrustum = new THREE.Frustum()
const _cullMatrix = new THREE.Matrix4()
const _cullSphere = new THREE.Sphere()

export function isMiniRosariCloneOnScreen(camera, x, y, z) {
  if (!camera?.projectionMatrix || !camera.matrixWorldInverse) return true
  _cullMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  _cullFrustum.setFromProjectionMatrix(_cullMatrix)
  _cullSphere.center.set(x, y, z)
  _cullSphere.radius = MINI_ROSARI_CULL_RADIUS
  return _cullFrustum.intersectsSphere(_cullSphere)
}

export function shouldRenderMiniRosariClone(flightState, camera, x, y, z) {
  if (flightState !== FLIGHT_HOVERING) return true
  return isMiniRosariCloneOnScreen(camera, x, y, z)
}

// 2026-11-22 Terry "공격대상을 찾지 못하고 3초가 지나면 그 자리에서 스르륵 사라진다": 표적 없이
// MINI_ROSARI_HOVER_TIMEOUT_MS(3초) 떠 있던 분신은 PROJECTILE_FADE_MS(0.4초) 동안 그 자리에서 부드럽게 작아지며
// 살짝 가라앉아 사라진다(11-13의 180ms "펑"을 대체). 새 이펙트 없이 슬롯 group 축척만 바꾸는 싼 연출이다.
// 사라지는 동안에는 탐색·피격이 없고, 화면 3명에는 센다. 시간은 게임 시간.
const MINI_ROSARI_FADE_SINK = 0.12

export function miniRosariFadeScale(fade) {
  const t = Math.min(1, Math.max(0, fade))
  return 1 - t * t * (3 - 2 * t)
}

// 분신 1개의 이번 프레임 모습: 표적을 바라보며 깡충깡충. 기다리는 분신이 화면 밖이면 숨기고 포즈 계산도 끈다.
// fade(0~1): 스르륵 사라지는 진행도 — 제자리에서 작아지며 살짝 가라앉는다.
function writeMiniRosariPose(entry, slot, camera, fade = 0) {
  const group = slot?.ref.current
  if (!group) return
  const { flight, start, id } = entry
  const hop = fade > 0 ? 0 : Math.abs(Math.sin(entry.hopPhase * 0.45)) * MINI_ROSARI_HOP_HEIGHT
  if (!group.userData.miniRosariShadowsOff && disableMiniRosariCloneShadows(group) > 0) {
    group.userData.miniRosariShadowsOff = true
  }
  const y = start[1] - 0.32 + MINI_ROSARI_FOOT_OFFSET + hop - fade * MINI_ROSARI_FADE_SINK
  // 탐색·피격은 보이든 안 보이든 매 스텝 돈다. 여기서는 그리기와 포즈 계산만 끄고 켠다.
  const shown = shouldRenderMiniRosariClone(entry.state, camera, flight.x, y, flight.z)
  const s = miniRosariFadeScale(fade)
  group.scale.set(s, s, s)
  group.userData.miniRosariOwnerId = id
  group.visible = shown
  group.matrixWorldAutoUpdate = shown
  slot.activeRef.current = shown
  group.position.set(flight.x, y, flight.z)
  group.rotation.set(0.18, Math.atan2(flight.dirX, flight.dirZ), 0, 'YXZ')
  entry.lastY = y
}

function hitMiniRosariTarget(entry) {
  const { flight, maxBounces, damage, critChance, critMultiplier } = entry
  const hitIndex = maxBounces - flight.bouncesLeft - 1
  const hit = applyEnemyHit(flight.hitTarget.rb, flight.hitTarget.generation, damage, {
    source: { x: flight.hitFromX, z: flight.hitFromZ },
    knockback: 3.2, knockbackMs: 90,
    critChance,
    critMultiplier,
    vfxKey: 'miniRosari',
  })
  if (hit) {
    // 전용 효과음이 없어 오니기리 타격음을 공유한다(soundmini 검토 대상).
    emitSfx({
      id: 'onigiriHit',
      volume: 0.50,
      rate: 0.96 + Math.min(hitIndex, 2) * 0.06,
    })
  }
}

function createMiniRosariSlot() {
  return { ref: createRef(), activeRef: { current: false }, ownerId: null }
}

// 빈 슬롯을 하나 빌린다. 없으면 새 슬롯을 만들어 풀에 더한다(동시 분신 수 상한 없음).
export function claimMiniRosariSlot(slots, ownerId) {
  let index = slots.findIndex((slot) => slot.ownerId === null)
  if (index < 0) {
    slots.push(createMiniRosariSlot())
    index = slots.length - 1
  }
  slots[index].ownerId = ownerId
  slots[index].activeRef.current = true
  return index
}

export function releaseMiniRosariSlot(slots, ownerId) {
  const slot = slots.find((s) => s.ownerId === ownerId)
  if (!slot) return
  slot.ownerId = null
  slot.activeRef.current = false
}

// 2026-11-17 끊김 수정: 예전에는 4초 동안 안 쓴 끝 슬롯을 내려놓았다가(분신 1개 = 주인공 모델 복제 1벌, 메시 약 86개)
// 다음 투척 때 다시 복제해 그 프레임이 멈췄다. 이제 무기를 얻는 순간 화면 상한(3명)만큼 미리 만들고 줄이지 않는다.
// 반환값 = 새로 만든 슬롯 수.
export const MINI_ROSARI_PREBUILT_SLOTS = MINI_ROSARI_MAX_ALIVE

export function prefillMiniRosariSlots(slots, count = MINI_ROSARI_PREBUILT_SLOTS) {
  let added = 0
  while (slots.length < count) {
    slots.push(createMiniRosariSlot())
    added += 1
  }
  return added
}

// 테스트·진단용: 지금 마운트된 꼬마 로자리 무기의 풀 크기(없으면 null).
let _live = null
export function getMiniRosariWeaponStats() {
  if (!_live) return null
  const { swarm, slotsRef } = _live
  return {
    projectiles: swarm.entries.length,
    hovering: countHoveringProjectiles(swarm),
    fading: countFadingProjectiles(swarm),
    maxHoverMs: maxHoverMs(swarm),
    slots: slotsRef.current.length,
    ownedSlots: slotsRef.current.filter((slot) => slot.ownerId !== null).length,
  }
}

export function MiniRosariWeapon() {
  // 분신 슬롯 풀. 슬롯의 activeRef는 그 분신이 살아 있는 동안만 true — 숨겨진 분신의 포즈 계산을 멈춘다.
  const slotsRef     = useRef([])
  const lastFireRef  = useRef(0)
  // 슬롯 수가 바뀔 때만 다시 그린다(미리 만들기 / 무기가 빠질 때).
  const [, setSlotVersion] = useState(0)
  const swarmRef = useRef(null)
  if (swarmRef.current === null) {
    swarmRef.current = createProjectileSwarm({ speed: MINI_ROSARI_SPEED, hoverTimeoutMs: MINI_ROSARI_HOVER_TIMEOUT_MS, maxAlive: MINI_ROSARI_MAX_ALIVE })
  }
  const phase   = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const gameKey = useGameStore((s) => s.gameKey)

  // 끝난 분신(바운스 소진 = 그 프레임에 바로, balanceqa M1 / 3초 대기 = 스르륵 사라짐이 끝난 프레임):
  // 축척을 되돌리고 숨긴 뒤 슬롯을 놓는다.
  const retireRef = useRef(null)
  if (retireRef.current === null) {
    retireRef.current = (entry) => {
      const group = slotsRef.current[entry.slotIndex]?.ref.current
      if (group) group.scale.set(1, 1, 1)
      hideMiniRosariClone(group, entry.id)
      releaseMiniRosariSlot(slotsRef.current, entry.id)
    }
  }

  // 남은 분신·슬롯 주인·대기 시간을 전부 비운다(무기 해제·교체, 판 리셋·스테이지 이동·사망 후 재시작).
  // 미리 만든 분신 모델은 숨긴 채 남긴다. 무기가 빠질 때만 풀째 내려놓는다(아래 active 효과).
  const resetAll = useCallback(() => {
    clearProjectileSwarm(swarmRef.current, (entry) => {
      const group = slotsRef.current[entry.slotIndex]?.ref.current
      if (group) group.scale.set(1, 1, 1)
      hideMiniRosariClone(group, entry.id)
    })
    for (const slot of slotsRef.current) {
      slot.ownerId = null
      slot.activeRef.current = false
    }
  }, [])

  useEffect(() => {
    const live = { swarm: swarmRef.current, slotsRef }
    _live = live
    return () => {
      if (_live === live) _live = null
    }
  }, [])

  // balanceqa F1 (2026-11-02): 교체 카드로 무기가 빠지는 순간 떠 있던 분신은 끝난다. 발사 목록과 분신 슬롯을
  // 비우지 않으면 같은 판에서 다시 얻었을 때 옛 분신이 처음 던진 자리에서 바운스가 꽉 찬 채 되살아난다.
  // 무기를 얻는 순간 분신을 대기 상한만큼 미리 만든다(투척 때 복제하지 않는다). 빠지면 풀째 내려놓는다.
  const active = !!weapons.miniRosari?.active
  useEffect(() => {
    if (!active) {
      resetAll()
      if (slotsRef.current.length > 0) {
        slotsRef.current = []
        setSlotVersion((v) => v + 1)
      }
      return
    }
    if (prefillMiniRosariSlots(slotsRef.current) > 0) setSlotVersion((v) => v + 1)
  }, [active, resetAll])
  // 판이 새로 시작되면(gameKey) 쿨다운·분신·슬롯을 모두 처음 상태로.
  useEffect(() => {
    resetAll()
    lastFireRef.current = 0
  }, [gameKey, resetAll])

  usePlayingFrame(({ clock, camera }, delta) => {
    const w = weapons.miniRosari
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    const swarm = swarmRef.current
    const slots = slotsRef.current

    // 쿨다운이 차면 1명(balanceqa F3: 쿨다운 전에는 아무것도 만들지 않는다).
    // 2026-11-22 Terry: 화면에 최대 3명 — 3명이 살아 있으면(사라지는 중 포함) 기다리고, 하나가 사라지는 바로
    // 다음 프레임에 던진다. 새 분신은 언제나 이번 프레임의 주인공 몸(playerPos)에서 출발한다 — 오니기리와 같은
    // 공용 판단(planOnigiriFrame).
    if (now - lastFireRef.current >= w.cooldown) {
      const launch = planOnigiriFrame({
        now,
        lastFireAt: lastFireRef.current,
        weapon: w,
        origin: playerPos,
        findFreshTarget: findClosestEnemy,
        nextId: nextMiniRosariId,
        aliveCount: swarm.entries.length,
        maxAlive: swarm.maxAlive,
      })
      const entry = launch && addSwarmProjectile(swarm, launch, { slotIndex: -1, hopPhase: 0 })
      if (entry) {
        lastFireRef.current = now
        emitSfx({ id: 'onigiriFire' })
        const before = slots.length
        entry.slotIndex = claimMiniRosariSlot(slots, launch.id)
        // 풀이 커지면 다시 그려 새 슬롯을 그린다.
        if (slots.length !== before) setSlotVersion((v) => v + 1)
      }
    }

    stepProjectileSwarm(swarm, delta, { onHit: hitMiniRosariTarget, onRetire: retireRef.current })
    for (let i = 0; i < swarm.entries.length; i += 1) {
      const entry = swarm.entries[i]
      if (entry.state === null) continue // 이번 스텝에 막 던졌다
      const fading = entry.state === FLIGHT_FADING
      if (!fading) entry.hopPhase += delta * 15
      writeMiniRosariPose(entry, slots[entry.slotIndex], camera, fading ? projectileFadeProgress(swarm, entry) : 0)
    }
  })

  if (!weapons.miniRosari?.active) return null

  return (
    <>
      {/* 분신 슬롯마다 모델 1벌(재사용). 발사체는 컴포넌트가 없고 무기 루프가 슬롯 group을 움직인다. */}
      {slotsRef.current.map((slot, index) => (
        <group key={index} ref={slot.ref} visible={false} matrixWorldAutoUpdate={false}>
          <MiniRosariModel animateRef={slot.activeRef} />
        </group>
      ))}
    </>
  )
}
