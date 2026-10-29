import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useGameStore } from '../store/useGameStore.js'
import { playerFacing, playerPos, joystickDir } from '../lib/refs.js'
import { moveKeys } from '../lib/keyboardInput.js'
import { clampPlayerPosition } from '../lib/playerMovementBounds.js'
import { getPlayerStartPosition } from '../lib/playerStartPosition.js'
import { createGameplayFixedStepClock, runGameplayFixedSteps } from '../lib/gameplayFrameTime.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { isFirebaseProgressHydrated } from '../lib/firebaseProgress.js'
import { loadGuestSessionSettings, loadTitleSettings } from '../lib/titleSettings.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { resolvePlayerOutfitId } from '../lib/playerV9Outfits.js'
import { DEFAULT_PLAYER_APPEARANCE, isPlayerAppearance } from '../lib/playerAppearance.js'
import PlayerV9Model from './PlayerV9Model.jsx'
import PlayerRosariModel from './PlayerRosariModel.jsx'
import PlayerMesh from './PlayerMesh.jsx'
import MiniHealthBar from './MiniHealthBar.jsx'

// 저장 가능한 외형 값과 기본값의 정본은 lib/playerAppearance.js다 — 여기서 다시 적지 않는다.
// 이 파일이 더하는 것은 F8 비교 토글의 순환 순서와 DEV 배지 라벨뿐이다.
export const PLAYER_APPEARANCE_CYCLE = Object.freeze(['legacy', 'v9', 'rosari'])
export const PLAYER_APPEARANCE_LABELS = Object.freeze({
  legacy: '이전 모델',
  v9: '이번 V9',
  rosari: '로자리',
})

// 모르는 값을 조용히 V9로 떨어뜨리면 "Studio에서 조정했는데 게임이 안 바뀐다"가 된다.
// 렌더는 계속하되(그래픽을 숨기지 않는다) DEV에서 원인을 바로 알 수 있게 경고한다.
export function resolvePlayerAppearance(value) {
  if (isPlayerAppearance(value)) return value
  if (import.meta.env.DEV && value != null) {
    console.warn(`[Player] 알 수 없는 주인공 외형 "${value}" — ${DEFAULT_PLAYER_APPEARANCE}로 렌더한다. lib/playerAppearance.js의 PLAYER_APPEARANCE_VALUES에 없는 값이다.`)
  }
  return DEFAULT_PLAYER_APPEARANCE
}

// 저장된 주인공 외형. 계정 진행도가 오면 계정 설정, 게스트는 이번 접속 메모리, 로그인했지만 아직
// 계정 진행도가 오기 전이면 기본값. 주인공과 그 미니 분신(오니기리 발사체)이 같은 규칙을 쓴다.
export function loadSavedPlayerAppearance() {
  return isFirebaseProgressHydrated()
    ? (loadTitleSettings().playerAppearance ?? DEFAULT_PLAYER_APPEARANCE)
    : (useAuthStore.getState().user?.uid
        ? DEFAULT_PLAYER_APPEARANCE
        : (loadGuestSessionSettings().playerAppearance ?? DEFAULT_PLAYER_APPEARANCE))
}

export function nextPlayerAppearance(current) {
  const index = PLAYER_APPEARANCE_CYCLE.indexOf(resolvePlayerAppearance(current))
  return PLAYER_APPEARANCE_CYCLE[(index + 1) % PLAYER_APPEARANCE_CYCLE.length]
}

const _v = { x: 0, y: 0, z: 0 }
const INV_DURATION = 520
const TURN_SPEED = 14
const PLAYER_HIT_KNOCKBACK_SPEED = 4
const PLAYER_HIT_KNOCKBACK_MS = 160
// 2026-10-28 Terry 모바일 피드백: "회복 시각효과가 지나치다". 흡혈·랜턴처럼 회복이 잦아져도
// 화면을 덮지 않도록 작게·짧게·옅게 줄이고, 재생 중이거나 직전 재생 직후의 회복 토큰은 새로
// 재생하지 않는다(동시 이펙트 최대 1개, 최소 재생 간격). 그래도 한 번의 회복은 분명히 보인다.
export const HEAL_EFFECT_DURATION_MS = 480
export const HEAL_EFFECT_MIN_INTERVAL_MS = 1200
export const HEAL_EFFECT_MAX_OPACITY = 0.6
export const HEAL_EFFECT_RING_RADIUS = 0.34
export const HEAL_EFFECT_RING_TUBE_RADIUS = 0.022
export const HEAL_EFFECT_SPARK_RADIUS = 0.05
export const HEAL_EFFECT_CORE_SCALE = 1
const HEAL_EFFECT_SPARK_POSITIONS = Object.freeze([[0, 0.6, 0], [0.24, 0.46, 0.12], [-0.24, 0.46, -0.12]])

// 새 회복 토큰을 재생할지. 이전 재생이 끝났고 마지막 재생 시작에서 최소 간격이 지났을 때만 true.
export function shouldStartHealEffect(nowMs, lastStartMs) {
  return !(nowMs - lastStartMs < Math.max(HEAL_EFFECT_DURATION_MS, HEAL_EFFECT_MIN_INTERVAL_MS))
}
export const MATILDA_FAINTED_POSE_ROTATION_Z = -Math.PI / 2
export const MATILDA_FAINTED_POSE_Y_OFFSET = 0.18
const PLAYER_UPRIGHT_POSE = Object.freeze({ rotation: Object.freeze([0, 0, 0]), position: Object.freeze([0, 0, 0]) })
const PLAYER_MATILDA_FAINTED_POSE = Object.freeze({
  rotation: Object.freeze([0, 0, MATILDA_FAINTED_POSE_ROTATION_Z]),
  position: Object.freeze([0, MATILDA_FAINTED_POSE_Y_OFFSET, 0]),
})

export function getPlayerVisualPoseTransform({ phase, deathCause }) {
  return phase === 'gameover' && deathCause === 'matilda'
    ? PLAYER_MATILDA_FAINTED_POSE
    : PLAYER_UPRIGHT_POSE
}

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
  const lastStartMsRef = useRef(-Infinity)

  useFrame((_, delta) => {
    if (token !== lastTokenRef.current) {
      lastTokenRef.current = token
      const nowMs = performance.now()
      // 잦은 소량 회복은 진행 중인 이펙트를 다시 시작하지 않고 흡수한다(깜빡임 누적 방지).
      if (shouldStartHealEffect(nowMs, lastStartMsRef.current)) {
        lastStartMsRef.current = nowMs
        elapsedMsRef.current = 0
        if (groupRef.current) groupRef.current.visible = true
      }
    }

    const group = groupRef.current
    if (!group) return
    if (elapsedMsRef.current >= HEAL_EFFECT_DURATION_MS) {
      if (group.visible) group.visible = false
      return
    }
    elapsedMsRef.current += delta * 1000
    const t = Math.min(1, elapsedMsRef.current / HEAL_EFFECT_DURATION_MS)
    if (t >= 1) {
      group.visible = false
      return
    }

    const rise = t * 0.3
    const pulse = Math.sin(t * Math.PI)
    // 빠르게 떠올랐다가(앞 20%) 부드럽게 사라진다. 최고 불투명도는 HEAL_EFFECT_MAX_OPACITY.
    const opacity = HEAL_EFFECT_MAX_OPACITY * (t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8)
    group.position.y = 0.2 + rise
    group.scale.setScalar(HEAL_EFFECT_CORE_SCALE + pulse * 0.16)
    setHealEffectOpacity(group, opacity)
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 3.8
      ringRef.current.scale.setScalar(0.9 + t * 0.4)
    }
  })

  return (
    <group ref={groupRef} visible={false} position={[0, 0.2, 0]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[HEAL_EFFECT_RING_RADIUS, HEAL_EFFECT_RING_TUBE_RADIUS, 8, 36]} />
        <meshBasicMaterial color="#bdffcf" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      {HEAL_EFFECT_SPARK_POSITIONS.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, i * 0.55, 0]} scale={i === 0 ? 1 : 0.8}>
          <mesh position={[-0.034, 0.016, 0]}>
            <sphereGeometry args={[HEAL_EFFECT_SPARK_RADIUS, 8, 8]} />
            <meshBasicMaterial color="#bdffcf" transparent opacity={0} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0.034, 0.016, 0]}>
            <sphereGeometry args={[HEAL_EFFECT_SPARK_RADIUS, 8, 8]} />
            <meshBasicMaterial color="#bdffcf" transparent opacity={0} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.028, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.08, 0.08, 0.016]} />
            <meshBasicMaterial color="#bdffcf" transparent opacity={0} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.045, 0.2, 0.016]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.2, 0.045, 0.016]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function PlayerVisual({ meshGroup, movingRef, hp, maxHp, hitFlashToken = 0, healFlashToken = 0, showHealthBar = true, previewArmAction = null, visualPose = PLAYER_UPRIGHT_POSE, comparisonModel = null, gameplay = false, outfit = 'default' }) {
  const appearance = resolvePlayerAppearance(comparisonModel ?? DEFAULT_PLAYER_APPEARANCE)
  return (
    <>
      <group position={visualPose.position} rotation={visualPose.rotation}>
        <group ref={meshGroup}>
          {appearance === 'legacy'
            ? <PlayerMesh movingRef={movingRef} hitFlashToken={hitFlashToken} previewArmAction={previewArmAction} outfit={outfit} />
            : appearance === 'rosari'
              ? <PlayerRosariModel movingRef={movingRef} hitFlashToken={hitFlashToken} previewArmAction={previewArmAction} gameplay={gameplay} outfit={outfit} />
              : <PlayerV9Model movingRef={movingRef} hitFlashToken={hitFlashToken} previewArmAction={previewArmAction} gameplay={gameplay} outfit={outfit} />}
        </group>
      </group>
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
  const [comparisonModel, setComparisonModel] = useState(null)
  // 게스트는 이번 접속 메모리의 선택을 쓴다. 로그인했지만 아직 계정 진행도가 오기 전이면 기본값.
  const savedAppearance = loadSavedPlayerAppearance()
  // 동복 등 의상 선택(titleSettings.playerOutfit). 없으면 'default'.
  // 세 외형 전부가 의상을 입는다 — 팔레트 정본은 lib/rosariOutfits.js 하나이고,
  // v9는 playerV9Outfits.js, 단순(PlayerMesh)는 playerMeshOutfits.js가 거기서 리맵한다.
  const savedOutfit = resolvePlayerOutfitId(isFirebaseProgressHydrated()
    ? loadTitleSettings().playerOutfit
    : (useAuthStore.getState().user?.uid ? undefined : loadGuestSessionSettings().playerOutfit))
  const invTimer  = useRef(0)
  const lastVisibleHitFlashToken = useRef(0)
  const hitFlashVisibleFrames = useRef(0)
  const knockbackRemainingMs = useRef(0)
  const knockbackVel = useRef(null) // 외부 주입 넉백 속도({x,z}); null이면 facing 기준 피격 넉백
  const stepState = useRef({ distance: PLAYER_STEP_STRIDE })
  const speed           = useGameStore((s) => s.player.speed)
  const phase           = useGameStore((s) => s.phase)
  const deathCause = useGameStore((s) => s.deathCause)
  const hp              = useGameStore((s) => s.player.hp)
  const maxHp           = useGameStore((s) => s.player.maxHp)
  const hitFlashToken   = useGameStore((s) => s.player.hitFlashToken)
  const healFlashToken  = useGameStore((s) => s.player.healFlashToken)
  const lastKnockbackHitToken = useRef(hitFlashToken)
  const endInvulnerable = useGameStore((s) => s.endInvulnerable)
  const damagePlayer    = useGameStore((s) => s.damagePlayer)
  const currentStageId  = useGameStore((s) => s.currentStageId)
  const visualPose = getPlayerVisualPoseTransform({ phase, deathCause })
  if (gameplayClockRef.current === null) gameplayClockRef.current = createGameplayFixedStepClock()

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    const onKeyDown = (event) => {
      if (event.code !== 'F8' || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return
      if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      setComparisonModel((current) => nextPlayerAppearance(current ?? savedAppearance))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [savedAppearance])

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
    if (phase !== 'playing') { movingRef.current = false; rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true); return }
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
      <PlayerVisual meshGroup={meshGroup} movingRef={movingRef} hp={hp} maxHp={maxHp} hitFlashToken={hitFlashToken} healFlashToken={healFlashToken} visualPose={visualPose} comparisonModel={comparisonModel ?? savedAppearance} outfit={savedOutfit} gameplay />
      {import.meta.env.DEV && comparisonModel && (
        <Html position={[0, 1.12, 0]} center style={{ pointerEvents: 'none', whiteSpace: 'nowrap', fontSize: 12, color: '#fff', background: '#111c', padding: '3px 6px', borderRadius: 4 }}>
          F8 · {PLAYER_APPEARANCE_LABELS[resolvePlayerAppearance(comparisonModel)]}
        </Html>
      )}
    </RigidBody>
  )
}
