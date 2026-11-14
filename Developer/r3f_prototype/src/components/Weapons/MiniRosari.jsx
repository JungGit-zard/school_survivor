import { createRef, useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { findClosestEnemy } from '../../lib/weaponTargeting.js'
import { applyEnemyHit } from '../../lib/weaponCollision.js'
import {
  FLIGHT_HOVERING, MINI_ROSARI_HOVER_CAP, MINI_ROSARI_HOVER_TIMEOUT_MS, RETIRE_DONE, addSwarmProjectile,
  clearProjectileSwarm, countHoveringProjectiles, createProjectileSwarm, maxHoverMs, planOnigiriFrame, stepProjectileSwarm,
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
// 2026-11-02 Terry: "화면상 오니기리가 몇 개 있더라도 늘려" — 동시에 나는 분신 수에 상한이 없다.
// 분신 모델은 슬롯 풀로 재사용한다: 빈 슬롯이 없을 때만 슬롯을 하나 늘리고(오래 빈 끝 슬롯만 줄임),
// 발사할 때마다 모델을 다시 복제하지 않고 위치·표시만 바꾼다(3c0bcbe8 모바일 CPU 절약 유지).
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
          : <PlayerV9Model movingRef={movingRef} animateRef={animateRef} gameplay outfit={look.outfit} />}
    </group>
  )
}

// 분신은 무기당 1개를 공유한다. 끝나는 그 프레임에 바로 숨겨 공중에 멈춘 채 남지 않게 하고,
// 지금 분신을 차지한 발사체(ownerId)만 숨길 수 있다.
export function hideMiniRosariClone(group, id) {
  if (!group || group.userData.miniRosariOwnerId !== id) return
  group.visible = false
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

// 2026-11-13 Terry "대기 시간+안전 상한": 표적 없이 MINI_ROSARI_HOVER_TIMEOUT_MS 떠 있거나 안전 상한
// (MINI_ROSARI_HOVER_CAP)을 넘어 지목된 분신은 작게 줄어들며 "펑" 사라진다 — 새 이펙트 없이 슬롯 group의
// 축척만 줄이는 싼 연출이다. 연출 중에는 탐색·피격이 없고 대기 수에도 세지 않는다. 시간은 게임 시간.
export const MINI_ROSARI_POOF_MS = 180
const MINI_ROSARI_POOF_RISE = 0.12

// 분신 1개의 이번 프레임 모습: 표적을 바라보며 깡충깡충. 기다리는 분신이 화면 밖이면 숨기고 포즈 계산도 끈다.
function writeMiniRosariPose(entry, slot, camera) {
  const group = slot?.ref.current
  if (!group) return
  const { flight, start, id } = entry
  const hop = Math.abs(Math.sin(entry.hopPhase * 0.45)) * MINI_ROSARI_HOP_HEIGHT
  if (!group.userData.miniRosariShadowsOff && disableMiniRosariCloneShadows(group) > 0) {
    group.userData.miniRosariShadowsOff = true
  }
  const y = start[1] - 0.32 + MINI_ROSARI_FOOT_OFFSET + hop
  // 탐색·피격은 보이든 안 보이든 매 스텝 돈다. 여기서는 그리기와 포즈 계산만 끄고 켠다.
  const shown = shouldRenderMiniRosariClone(entry.state, camera, flight.x, y, flight.z)
  group.userData.miniRosariOwnerId = id
  group.visible = shown
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

// 펑 연출 1스텝. 끝나면 true(호출 측이 축척을 되돌리고 숨긴 뒤 슬롯을 놓는다).
export function stepMiniRosariPoof(poof, group, delta) {
  poof.ageMs += delta * 1000
  const p = Math.min(1, poof.ageMs / MINI_ROSARI_POOF_MS)
  if (group) {
    const s = Math.max(0, 1 - p * p)
    group.scale.set(s, s, s)
    group.position.y = poof.y + p * MINI_ROSARI_POOF_RISE
  }
  return p >= 1
}

function createMiniRosariSlot() {
  return { ref: createRef(), activeRef: { current: false }, ownerId: null, freeSince: null }
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
  slots[index].freeSince = null
  return index
}

export function releaseMiniRosariSlot(slots, ownerId) {
  const slot = slots.find((s) => s.ownerId === ownerId)
  if (!slot) return
  slot.ownerId = null
  slot.activeRef.current = false
  slot.freeSince = null // 비어 있기 시작한 시각은 다음 정리(trimIdleMiniRosariSlots)가 찍는다.
}

// 2026-11-13 렌더·메모리 완화: 풀은 늘기만 했다(분신 1개 = 주인공 모델 복제 1벌). 이제 끝난 분신 슬롯이
// MINI_ROSARI_SLOT_IDLE_MS 동안 다시 쓰이지 않으면 풀 **끝에서부터** 내려놓는다. 끝에서만 빼므로 살아 있는
// 분신의 slotIndex는 절대 밀리지 않고, 빈 슬롯은 가장 앞 것부터 재사용되므로(claim) 바쁜 분신은 앞쪽에
// 모여 끝이 자연스럽게 비워진다. 1개는 남겨 다음 투척 때 다시 복제하지 않게 한다.
// 동작(투척 수·상한 없음·대기 분신 유지)은 그대로 — 빈 슬롯만 줄인다. 반환값 = 내려놓은 슬롯 수.
export const MINI_ROSARI_SLOT_IDLE_MS = 4000
export const MINI_ROSARI_WARM_SLOTS = 1

export function trimIdleMiniRosariSlots(slots, now, idleMs = MINI_ROSARI_SLOT_IDLE_MS, keep = MINI_ROSARI_WARM_SLOTS) {
  for (let i = 0; i < slots.length; i += 1) {
    if (slots[i].ownerId === null && slots[i].freeSince === null) slots[i].freeSince = now
  }
  let removed = 0
  while (slots.length > keep) {
    const last = slots[slots.length - 1]
    if (last.ownerId !== null || now - last.freeSince < idleMs) break
    slots.pop()
    removed += 1
  }
  return removed
}

// 테스트·진단용: 지금 마운트된 꼬마 로자리 무기의 풀 크기(없으면 null).
let _live = null
export function getMiniRosariWeaponStats() {
  if (!_live) return null
  const { swarm, slotsRef, poofsRef } = _live
  return {
    projectiles: swarm.entries.length,
    hovering: countHoveringProjectiles(swarm),
    maxHoverMs: maxHoverMs(swarm),
    poofs: poofsRef.current.length,
    slots: slotsRef.current.length,
    ownedSlots: slotsRef.current.filter((slot) => slot.ownerId !== null).length,
  }
}

export function MiniRosariWeapon() {
  // 분신 슬롯 풀. 슬롯의 activeRef는 그 분신이 살아 있는 동안만 true — 숨겨진 분신의 포즈 계산을 멈춘다.
  const slotsRef     = useRef([])
  const lastFireRef  = useRef(0)
  const poofsRef     = useRef([])
  // 슬롯 수가 바뀔 때만 다시 그린다(새 슬롯 모델 마운트 / 오래 빈 슬롯 언마운트).
  const [, setSlotVersion] = useState(0)
  const swarmRef = useRef(null)
  if (swarmRef.current === null) {
    swarmRef.current = createProjectileSwarm({ speed: MINI_ROSARI_SPEED, hoverTimeoutMs: MINI_ROSARI_HOVER_TIMEOUT_MS, hoverCap: MINI_ROSARI_HOVER_CAP })
  }
  const phase   = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const gameKey = useGameStore((s) => s.gameKey)

  // 끝난 분신: 바운스를 다 쓰면 그 프레임에 바로 숨기고 슬롯을 놓는다(balanceqa M1). 대기 시간·상한이면 펑.
  const retireRef = useRef(null)
  if (retireRef.current === null) {
    retireRef.current = (entry, reason) => {
      const slot = slotsRef.current[entry.slotIndex]
      if (reason === RETIRE_DONE) {
        hideMiniRosariClone(slot?.ref.current, entry.id)
        releaseMiniRosariSlot(slotsRef.current, entry.id)
        return
      }
      poofsRef.current.push({ id: entry.id, slotIndex: entry.slotIndex, ageMs: 0, y: entry.lastY ?? 0 })
    }
  }

  // 남은 분신·펑·슬롯 주인·대기 시간을 전부 비운다(무기 해제·교체, 판 리셋·스테이지 이동·사망 후 재시작).
  // 슬롯 모델도 무기가 빠질 때 함께 내려가므로 풀째 비운다(다시 얻으면 빈 풀에서 시작).
  const resetAll = useCallback(() => {
    clearProjectileSwarm(swarmRef.current, (entry) => {
      hideMiniRosariClone(slotsRef.current[entry.slotIndex]?.ref.current, entry.id)
    })
    for (const poof of poofsRef.current) {
      const group = slotsRef.current[poof.slotIndex]?.ref.current
      if (group) group.scale.set(1, 1, 1)
      hideMiniRosariClone(group, poof.id)
    }
    poofsRef.current.length = 0
    if (slotsRef.current.length > 0) {
      slotsRef.current = []
      setSlotVersion((v) => v + 1)
    }
  }, [])

  useEffect(() => {
    const live = { swarm: swarmRef.current, slotsRef, poofsRef }
    _live = live
    return () => {
      if (_live === live) _live = null
    }
  }, [])

  // balanceqa F1 (2026-11-02): 교체 카드로 무기가 빠지는 순간 떠 있던 분신은 끝난다. 발사 목록과 분신 슬롯을
  // 비우지 않으면 같은 판에서 다시 얻었을 때 옛 분신이 처음 던진 자리에서 바운스가 꽉 찬 채 되살아난다.
  const active = !!weapons.miniRosari?.active
  useEffect(() => {
    if (!active) resetAll()
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
    // 오래 빈 끝 슬롯을 내려놓는다(할당 없음). 줄었으면 다시 그려 그 분신 모델을 언마운트한다.
    if (trimIdleMiniRosariSlots(slots, now) > 0) setSlotVersion((v) => v + 1)

    // 쿨다운이 차면 1명(balanceqa F3: 쿨다운 전에는 아무것도 만들지 않는다).
    // 이미 뛰어가거나 기다리는 분신 수로 새 투척을 막거나 늦추지 않는다. 새 분신은 언제나 이번 프레임의
    // 주인공 몸(playerPos)에서 출발한다 — 오니기리와 같은 공용 판단(planOnigiriFrame).
    if (now - lastFireRef.current >= w.cooldown) {
      const launch = planOnigiriFrame({
        now,
        lastFireAt: lastFireRef.current,
        weapon: w,
        origin: playerPos,
        findFreshTarget: findClosestEnemy,
        nextId: nextMiniRosariId,
      })
      if (launch) {
        lastFireRef.current = now
        emitSfx({ id: 'onigiriFire' })
        const before = slots.length
        addSwarmProjectile(swarm, launch, { slotIndex: claimMiniRosariSlot(slots, launch.id), hopPhase: 0 })
        // 풀이 커지면 다시 그려 새 슬롯을 그린다.
        if (slots.length !== before) setSlotVersion((v) => v + 1)
      }
    }

    stepProjectileSwarm(swarm, delta, { onHit: hitMiniRosariTarget, onRetire: retireRef.current })
    for (let i = 0; i < swarm.entries.length; i += 1) {
      const entry = swarm.entries[i]
      if (entry.state === null) continue // 이번 스텝에 막 던졌다
      entry.hopPhase += delta * 15
      writeMiniRosariPose(entry, slots[entry.slotIndex], camera)
    }

    const poofs = poofsRef.current
    let kept = 0
    for (let i = 0; i < poofs.length; i += 1) {
      const poof = poofs[i]
      const group = slots[poof.slotIndex]?.ref.current
      if (stepMiniRosariPoof(poof, group, delta)) {
        if (group) group.scale.set(1, 1, 1)
        hideMiniRosariClone(group, poof.id)
        releaseMiniRosariSlot(slots, poof.id)
        continue
      }
      poofs[kept++] = poof
    }
    poofs.length = kept
  })

  if (!weapons.miniRosari?.active) return null

  return (
    <>
      {/* 분신 슬롯마다 모델 1벌(재사용). 발사체는 컴포넌트가 없고 무기 루프가 슬롯 group을 움직인다. */}
      {slotsRef.current.map((slot, index) => (
        <group key={index} ref={slot.ref} visible={false}>
          <MiniRosariModel animateRef={slot.activeRef} />
        </group>
      ))}
    </>
  )
}
