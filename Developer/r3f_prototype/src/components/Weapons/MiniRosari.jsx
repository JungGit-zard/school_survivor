import { createRef, useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { findClosestEnemy } from '../../lib/weaponTargeting.js'
import { applyEnemyHit } from '../../lib/weaponCollision.js'
import { FLIGHT_DONE, createOnigiriFlight, planOnigiriFrame, stepOnigiriFlight } from '../../lib/onigiri.js'
import { FLIGHT_HOVERING } from '../../lib/onigiri.js'
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
// 분신 모델은 슬롯 풀로 재사용한다: 빈 슬롯이 없을 때만 슬롯을 하나 늘리고(줄이지 않음),
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

function MiniRosariProjectile({ id, start, initialTarget, hitIds, maxBounces, damage, bounceRange, critChance, critMultiplier, onDone, visualRef, animateRef }) {
  const groupRef   = visualRef
  // 오니기리와 같은 공용 진행기(2026-11-02 Terry 확정): 바운스가 남은 분신은 사라지지 않고, 맞힌 자리·
  // 표적을 잃은 자리에서 bounceRange 안 다음 적을 찾고, 없으면 제자리에서 깡충거리며 기다린다.
  const flightRef  = useRef(null)
  if (flightRef.current === null) {
    flightRef.current = createOnigiriFlight({ start, initialTarget, hitIds, maxBounces, bounceRange })
  }
  const hopPhaseRef = useRef(0)
  const doneRef    = useRef(false)

  usePlayingFrame(({ camera }, delta) => {
    if (doneRef.current || !groupRef.current) return

    hopPhaseRef.current += delta * 15
    const flight = flightRef.current
    const state = stepOnigiriFlight(flight, delta, MINI_ROSARI_SPEED)

    if (flight.hitTarget) {
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

    if (state === FLIGHT_DONE) {
      doneRef.current = true; hideMiniRosariClone(groupRef.current, id); onDone(id); return
    }

    // 분신은 표적을 바라보며 깡충깡충 뛰어간다. 표적이 없으면 수평 이동 없이 제자리에서 깡충거린다.
    const hop = Math.abs(Math.sin(hopPhaseRef.current * 0.45)) * MINI_ROSARI_HOP_HEIGHT
    const group = groupRef.current
    if (!group.userData.miniRosariShadowsOff && disableMiniRosariCloneShadows(group) > 0) {
      group.userData.miniRosariShadowsOff = true
    }
    const y = start[1] - 0.32 + MINI_ROSARI_FOOT_OFFSET + hop
    // 위의 탐색·피격은 보이든 안 보이든 매 프레임 돈다. 여기서는 그리기와 포즈 계산만 끄고 켠다.
    const shown = shouldRenderMiniRosariClone(state, camera, flight.x, y, flight.z)
    group.userData.miniRosariOwnerId = id
    group.visible = shown
    if (animateRef) animateRef.current = shown
    group.position.set(flight.x, y, flight.z)
    group.rotation.set(0.18, Math.atan2(flight.dirX, flight.dirZ), 0, 'YXZ')
  })

  // 안전망: 제거될 때도 숨긴다. 단, 이미 다음 분신이 차지한 뒤 늦게 도는 정리는 새 분신을 끄지 않는다.
  useEffect(() => () => {
    hideMiniRosariClone(groupRef.current, id)
  }, [groupRef, id])

  return null
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

export function MiniRosariWeapon() {
  const [projectiles, setProjectiles] = useState([])
  const projRef      = useRef([])
  // 분신 슬롯 풀. 슬롯의 activeRef는 그 분신이 살아 있는 동안만 true — 숨겨진 분신의 포즈 계산을 멈춘다.
  const slotsRef     = useRef([])
  const lastFireRef  = useRef(0)
  const phase   = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const expire = useCallback((id) => {
    projRef.current = projRef.current.filter((p) => p.id !== id)
    releaseMiniRosariSlot(slotsRef.current, id)
    setProjectiles([...projRef.current])
  }, [])

  // balanceqa F1 (2026-11-02): 교체 카드로 무기가 빠지는 순간 떠 있던 분신은 끝난다. 발사 목록과 분신 슬롯을
  // 비우지 않으면 같은 판에서 다시 얻었을 때 옛 분신이 처음 던진 자리에서 바운스가 꽉 찬 채 되살아난다.
  // 슬롯 모델도 무기가 빠질 때 함께 내려가므로 풀째 비운다(다시 얻으면 빈 풀에서 시작).
  const active = !!weapons.miniRosari?.active
  useEffect(() => {
    if (active) return
    slotsRef.current = []
    if (projRef.current.length > 0) {
      projRef.current = []
      setProjectiles([])
    }
  }, [active])

  usePlayingFrame(({ clock }) => {
    const w = weapons.miniRosari
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    // 쿨다운 전에는 아무것도 만들지 않는다(balanceqa F3: 매 프레임 할당 없음).
    if (now - lastFireRef.current < w.cooldown) return

    // 이미 뛰어가거나 기다리는 분신 수로 새 투척을 막거나 늦추지 않는다. 새 분신은 언제나 이번 프레임의
    // 주인공 몸(playerPos)에서 출발한다 — 오니기리와 같은 공용 판단(planOnigiriFrame).
    const launch = planOnigiriFrame({
      now,
      lastFireAt: lastFireRef.current,
      weapon: w,
      origin: playerPos,
      findFreshTarget: findClosestEnemy,
      nextId: nextMiniRosariId,
    })
    if (!launch) return
    lastFireRef.current = now
    emitSfx({ id: 'onigiriFire' })
    projRef.current = [...projRef.current, { ...launch, slotIndex: claimMiniRosariSlot(slotsRef.current, launch.id) }]
    setProjectiles([...projRef.current])
  })

  if (!weapons.miniRosari?.active) return null

  return (
    <>
      {/* 풀이 커지면 같은 프레임의 setProjectiles 재렌더가 새 슬롯을 그린다. */}
      {slotsRef.current.map((slot, index) => (
        <group key={index} ref={slot.ref} visible={false}>
          <MiniRosariModel animateRef={slot.activeRef} />
        </group>
      ))}
      {projectiles.map((p) => (
        <MiniRosariProjectile key={p.id} {...p} visualRef={slotsRef.current[p.slotIndex].ref} animateRef={slotsRef.current[p.slotIndex].activeRef} onDone={expire} />
      ))}
    </>
  )
}
