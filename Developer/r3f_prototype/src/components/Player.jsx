import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useGameStore } from '../store/useGameStore.js'
import { playerFacing, playerPos, joystickDir } from '../lib/refs.js'
import { moveKeys } from '../lib/keyboardInput.js'
import { clampPlayerPosition } from '../lib/playerMovementBounds.js'
import { getPlayerStartPosition } from '../lib/playerStartPosition.js'
import { createGameplayFixedStepClock, runGameplayFixedSteps } from '../lib/gameplayFrameTime.js'
import { emitSfx } from '../lib/sfxEvents.js'
import PlayerMesh from './PlayerMesh.jsx'
import MiniHealthBar from './MiniHealthBar.jsx'

const _v = { x: 0, y: 0, z: 0 }
const INV_DURATION = 520
const TURN_SPEED = 14
const PLAYER_HIT_KNOCKBACK_SPEED = 4
const PLAYER_HIT_KNOCKBACK_MS = 160
const HEAL_EFFECT_DURATION_MS = 760

// 발소리는 '시간'이 아니라 '이동 거리'로 센다. 보폭(1.5 유닛)을 한 번 지날 때마다 한 발이다.
// 기본 이동 속도 3 u/s에서 정확히 초당 2보 — 사람 걸음 속도다. 이동속도 업그레이드를
// 받으면 보폭은 그대로고 걸음만 빨라지므로, 고정 ms 간격보다 다리 움직임과 잘 맞는다.
const PLAYER_STEP_STRIDE = 1.5
// 발소리는 이벤트가 아니라 배경이다. 코드베이스 최저 emit(0.18)보다도 낮게 깔아
// 피격·힐·무기 소리를 절대 덮지 않게 한다.
const PLAYER_STEP_VOLUME = 0.15

// 이동 중이면 보폭을 채울 때마다 true를 돌려준다. 정지·넉백 중에는 울리지 않는다.
// stepState는 useFrame 핫루프에서 매 프레임 새 객체를 만들지 않으려고 ref 객체를 직접 고친다.
export function advancePlayerStep(stepState, moving, speed, dt) {
  if (!moving || !(speed > 0) || !(dt > 0)) {
    // 멈춘 동안 보폭을 채워 둬야 다시 걷는 첫 프레임에 곧바로 한 발이 울린다.
    stepState.distance = PLAYER_STEP_STRIDE
    return false
  }
  stepState.distance += speed * dt
  if (stepState.distance < PLAYER_STEP_STRIDE) return false
  stepState.distance -= PLAYER_STEP_STRIDE
  return true
}

function setHealEffectOpacity(object, opacity) {
  if (!object) return
  if (object.material) object.material.opacity = opacity
  for (const child of object.children ?? []) setHealEffectOpacity(child, opacity)
}

export function resolvePlayerHitKnockback(facing, speed = PLAYER_HIT_KNOCKBACK_SPEED) {
  const len = Math.hypot(facing?.x ?? 0, facing?.z ?? 0)
  const nx = len > 0 ? facing.x / len : 0
  const nz = len > 0 ? facing.z / len : 1
  return { x: nx === 0 ? 0 : -nx * speed, y: 0, z: -nz * speed }
}

function shortestAngleDiff(target, current) {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return diff
}

function PlayerHealEffect({ token = 0 }) {
  const groupRef = useRef(null)
  const ringRef = useRef(null)
  const lastTokenRef = useRef(token)
  const elapsedMsRef = useRef(HEAL_EFFECT_DURATION_MS)

  useFrame((_, delta) => {
    if (token !== lastTokenRef.current) {
      lastTokenRef.current = token
      elapsedMsRef.current = 0
      if (groupRef.current) groupRef.current.visible = true
    }

    const group = groupRef.current
    if (!group) return
    elapsedMsRef.current += delta * 1000
    const t = Math.min(1, elapsedMsRef.current / HEAL_EFFECT_DURATION_MS)
    if (t >= 1) {
      group.visible = false
      return
    }

    const rise = t * 0.36
    const pulse = Math.sin(t * Math.PI)
    const opacity = Math.max(0, 1 - t)
    group.position.y = 0.16 + rise
    group.scale.setScalar(0.82 + pulse * 0.28)
    setHealEffectOpacity(group, opacity)
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 2.2
      ringRef.current.scale.setScalar(0.75 + t * 0.55)
    }
  })

  return (
    <group ref={groupRef} visible={false} position={[0, 0.16, 0]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[0.32, 0.018, 8, 32]} />
        <meshBasicMaterial color="#7dff9d" transparent opacity={0} depthWrite={false} />
      </mesh>
      {[[0, 0.52, 0], [0.21, 0.43, 0.14], [-0.21, 0.43, -0.14]].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, i * 0.55, 0]} scale={i === 0 ? 1 : 0.78}>
          <mesh position={[-0.035, 0.02, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#8cffae" transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh position={[0.035, 0.02, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#8cffae" transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh position={[0, -0.03, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.075, 0.075, 0.018]} />
            <meshBasicMaterial color="#8cffae" transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.045, 0.18, 0.018]} />
        <meshBasicMaterial color="#f0fff4" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.18, 0.045, 0.018]} />
        <meshBasicMaterial color="#f0fff4" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function PlayerVisual({ meshGroup, movingRef, hp, maxHp, hitFlashToken = 0, healFlashToken = 0, showHealthBar = true, previewArmAction = null }) {
  return (
    <>
      <PlayerMesh modelVariant="image2" groupRef={meshGroup} movingRef={movingRef} hitFlashToken={hitFlashToken} previewArmAction={previewArmAction} />
      <PlayerHealEffect token={healFlashToken} />
      {showHealthBar && <MiniHealthBar current={hp} max={maxHp} width={0.38} height={0.052} y={0.75} />}
    </>
  )
}

export default function Player() {
  const rb        = useRef()
  const gameplayClockRef = useRef(null)
  const meshGroup = useRef()
  const movingRef = useRef(false)
  const invTimer  = useRef(0)
  const lastVisibleHitFlashToken = useRef(0)
  const hitFlashVisibleFrames = useRef(0)
  const knockbackRemainingMs = useRef(0)
  const knockbackVel = useRef(null) // 외부 주입 넉백 속도({x,z}); null이면 facing 기준 피격 넉백
  const stepState = useRef({ distance: PLAYER_STEP_STRIDE })
  const speed           = useGameStore((s) => s.player.speed)
  const phase           = useGameStore((s) => s.phase)
  const hp              = useGameStore((s) => s.player.hp)
  const maxHp           = useGameStore((s) => s.player.maxHp)
  const hitFlashToken   = useGameStore((s) => s.player.hitFlashToken)
  const healFlashToken  = useGameStore((s) => s.player.healFlashToken)
  const lastKnockbackHitToken = useRef(hitFlashToken)
  const endInvulnerable = useGameStore((s) => s.endInvulnerable)
  const damagePlayer    = useGameStore((s) => s.damagePlayer)
  const currentStageId  = useGameStore((s) => s.currentStageId)
  if (gameplayClockRef.current === null) gameplayClockRef.current = createGameplayFixedStepClock()

  // 적 투사체가 플레이어를 감지할 수 있도록 RigidBody ref에 핸들러 등록
  useEffect(() => {
    if (!rb.current) return
    rb.current._playerHit = (dmg) => damagePlayer(dmg)
    // 피해 없는 외부 넉백 주입(도지 몸통 등) — 방향 벡터를 그대로 밀림 속도로 쓴다.
    rb.current._applyKnockback = (vx, vz, ms = PLAYER_HIT_KNOCKBACK_MS) => {
      knockbackVel.current = { x: vx, z: vz }
      knockbackRemainingMs.current = ms
    }
  })

  useFrame((_, delta) => {
    if (!rb.current) return
    if (phase !== 'playing') { rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true); return }
    runGameplayFixedSteps(gameplayClockRef.current, delta, (dt) => {

    if (hitFlashToken !== lastKnockbackHitToken.current) {
      lastKnockbackHitToken.current = hitFlashToken
      knockbackRemainingMs.current = PLAYER_HIT_KNOCKBACK_MS
      knockbackVel.current = null // 피격 넉백은 항상 facing 기준
    }

    const { up, down, left, right } = moveKeys
    const beingKnockedBack = knockbackRemainingMs.current > 0

    if (beingKnockedBack) {
      const knockback = knockbackVel.current ?? resolvePlayerHitKnockback(playerFacing)
      _v.x = knockback.x
      _v.z = knockback.z
      movingRef.current = false
      knockbackRemainingMs.current = Math.max(0, knockbackRemainingMs.current - dt * 1000)
    } else if (joystickDir.active) {
      _v.x = joystickDir.x
      _v.z = joystickDir.z
    } else {
      _v.x = (right ? 1 : 0) - (left ? 1 : 0)
      _v.z = (down  ? 1 : 0) - (up   ? 1 : 0)
    }

    const len = Math.hypot(_v.x, _v.z)
    if (!beingKnockedBack) movingRef.current = len > 0
    if (len > 0 && !beingKnockedBack) {
      const nx = _v.x / len
      const nz = _v.z / len
      const targetY = Math.atan2(nx, nz)

      if (meshGroup.current) {
        const turnRatio = Math.min(1, dt * TURN_SPEED)
        meshGroup.current.rotation.y += shortestAngleDiff(targetY, meshGroup.current.rotation.y) * turnRatio
      }

      _v.x = nx * speed
      _v.z = nz * speed
    }

    rb.current.setLinvel({ x: _v.x, y: 0, z: _v.z }, true)

    // 발소리. movingRef는 넉백 중 false로 강제되므로 밀려나는 동안에는 울리지 않는다.
    // 같은 샘플이 정확히 반복되면 기계음으로 들려서 rate를 ±8% 흔든다(좌/우 발 느낌).
    if (advancePlayerStep(stepState.current, movingRef.current, speed, dt)) {
      emitSfx({ id: 'playerStep', volume: PLAYER_STEP_VOLUME, rate: 0.92 + Math.random() * 0.16 })
    }

    // 화면 밖으로 못 나가게 스테이지 맵 경계에서 안쪽 inset만큼 축별로 클램프.
    const stageId = useGameStore.getState().currentStageId
    const t = rb.current.translation()
    const { x: cx, z: cz } = clampPlayerPosition(stageId, t)
    if (cx !== t.x || cz !== t.z) {
      rb.current.setTranslation({ x: cx, y: t.y, z: cz }, true)
    }

    // 전역 위치 동기화
    playerPos.set(cx, t.y, cz)

    // 무적 타이머 (setTimeout 대신 useFrame에서 처리)
    const inv = useGameStore.getState().player.invulnerable
    if (inv) {
      invTimer.current += dt * 1000
      if (invTimer.current >= INV_DURATION) {
        invTimer.current = 0
        endInvulnerable()
      }
    } else {
      invTimer.current = 0
    }

    // 무적 점멸 (80ms 간격)
    if (meshGroup.current) {
      if (hitFlashToken !== lastVisibleHitFlashToken.current) {
        lastVisibleHitFlashToken.current = hitFlashToken
        hitFlashVisibleFrames.current = 1
      }
      meshGroup.current.visible = hitFlashVisibleFrames.current > 0 || !inv || Math.floor(performance.now() / 80) % 2 === 0
      if (hitFlashVisibleFrames.current > 0) hitFlashVisibleFrames.current -= 1
    }

    // 이동 방향으로 메시 회전 (최단경로 보간 — ±π 경계 처리)
    if (meshGroup.current) {
      playerFacing.set(Math.sin(meshGroup.current.rotation.y), 0, Math.cos(meshGroup.current.rotation.y))
    }
    })
  })

  return (
    <RigidBody
      ref={rb}
      type="dynamic"
      lockRotations
      linearDamping={10}
      position={(() => {
        const [x, y, z] = getPlayerStartPosition(currentStageId)
        return [x, y + 0.32, z]
      })()}
      colliders={false}
    >
      <CuboidCollider args={[0.136, 0.32, 0.136]} />
      <PlayerVisual meshGroup={meshGroup} movingRef={movingRef} hp={hp} maxHp={maxHp} hitFlashToken={hitFlashToken} healFlashToken={healFlashToken} />
    </RigidBody>
  )
}
