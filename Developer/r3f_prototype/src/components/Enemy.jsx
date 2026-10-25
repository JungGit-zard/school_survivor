import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import StudioTunedGroup from './StudioTunedGroup.jsx'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import spawnSmokeUrl from '../assets/effects/spawn_smoke_puff.webp'
import { enemyBodies, playerPos, enemyProjectilePool, enemyHandleScratch } from '../lib/refs.js'
import { getCachedBoxGeo, getCachedToonMat, getSharedOutlineMat, getFlashMat, inflateScale, outlineMat, toonMat } from '../lib/toon.js'
import { useGameStore } from '../store/useGameStore.js'
import { logKill, logPlaytestEvent } from '../lib/playtestLogger.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { emitVfx } from '../lib/vfxEvents.js'
import { emitDamageNumber, DAMAGE_NUMBER_COLORS } from '../lib/damageNumbers.js'
import { resolveCriticalHit } from '../lib/criticalHits.js'
import { emitCriticalHitScreenShake, emitEnemyHitScreenShake } from '../lib/criticalScreenShake.js'
import { createEnemyCriticalHitBurstEvent, createEnemyHitSparkEvent, resolveEnemyHitKnockback } from '../lib/enemyHitVfx.js'
import { resolveCollapseIntensity } from '../lib/enemyDeathCollapse.js'
import { canE04FireProjectile, getE04IntroSec } from '../lib/stage2ProjectileRules.js'
import { ENEMY_PROJECTILE_KIND_SPHERE, chefIngredientKindAt } from '../lib/enemyProjectilePool.js'
import {
  CHEF_PHASE1,
  CHEF_TELEGRAPH,
  CHEF_PHASE2,
  CHEF_ENRAGE_HP_RATIO,
  advanceChefBossPhase,
  resolveChefBossActiveStats,
} from '../lib/chefBossPhase.js'
import { getStageBounds, getStageConfig } from '../lib/stageConfig.js'
import { getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { getMatildaDashSpeed } from '../lib/matildaDashSpeed.js'
import { getSpawnCatchUpOffsetSec } from '../lib/spawnCatchUp.js'
import { isBossType } from '../lib/burstEvents.js'
import { deathSfxId } from '../lib/enemyDeathSfx.js'
import {
  B02_BLOCKADE_LINE_WIDTH,
  advanceB02CorridorBlockade,
  consumeB02CorridorBlockadeHit,
  createB02CorridorBlockadeState,
  getB02CorridorBlockadeLineZs,
  getB02CorridorBlockadeTrigger,
  startB02CorridorBlockade,
} from '../lib/b02CorridorBlockade.js'
import {
  B03_SHUTTLE_LANE_WIDTH,
  advanceB03ShuttleRun,
  consumeB03ShuttleRunPassHit,
  createB03ShuttleRunState,
  getB03ShuttleRunTrigger,
  getB03ShuttleRunFacingX,
  getB03ShuttleRunLaneFromBoss,
  getB03ShuttleRunLaneGeometry,
  getB03ShuttleRunPlayerDamage,
  getB03ShuttleRunX,
  getB03ShuttleTelegraphBlinkFactor,
  startB03ShuttleRun,
} from '../lib/b03ShuttleRun.js'
import {
  advanceB04SoupBlast,
  consumeB04SoupBlastHit,
  createB04SoupBlastState,
  getB04SoupBlastCircles,
  getB04SoupBlastTrigger,
  startB04SoupBlast,
} from '../lib/b04SoupBlast.js'
import { getGameplayFrameDeltaMs } from '../lib/pausableStateTimer.js'
import { getStageObjectSightObstacles, isStageObjectEnemyTrackingBlocked } from './StageObjects/stageObjectColliders.js'
import { isPlayerWeaponSightBlocked } from '../lib/weaponTargeting.js'
import ZombieMesh from './ZombieMesh.jsx'
import { EXPANSION_STATS, isExpansionBoss, isExpansionStage } from '../lib/expansionContent.js'
import { createExpansionAttackState, stepExpansionAttack, cancelExpansionAttack } from '../lib/expansionAttackRuntime.js'
import MiniHealthBar from './MiniHealthBar.jsx'
import {
  MATH_TEACHER_SWING_RADIUS,
  MATH_TEACHER_SWING_RECOVERY_MS,
  MATH_TEACHER_SWING_WINDUP_MS,
  applyMathTeacherSwing,
  getMathTeacherPlayerDamage,
  isInMathTeacherSwingArc,
} from '../lib/mathTeacherSpecial.js'

// "효과 없이는 스폰 없음" — 첫 스폰에서 텍스처 로딩 지연으로 연기가 스킵되지 않도록
// 모듈 로드 시점에 스폰 연기 텍스처를 미리 로드해 캐시에 올려둔다.
// 비브라우저(테스트) 환경에서는 로더가 실패할 수 있어 방어적으로 감싼다.
// 프리로드가 실패하더라도 스폰 리빌 딜레이는 그대로 유지되므로 연기 없는 스폰은 발생하지 않는다.
if (typeof document !== 'undefined' && import.meta.env?.MODE !== 'test') {
  try {
    useLoader.preload(THREE.TextureLoader, spawnSmokeUrl)
  } catch {
    /* ignore preload failure */
  }
}

const _dir = new THREE.Vector3()
const _pos = new THREE.Vector3()
const _chargeTarget = new THREE.Vector3()
const _fireDir = new THREE.Vector3()
// setLinvel???꾨떖?섎뒗 ?ъ궗??媛앹껜 ??留??꾨젅???몃씪??媛앹껜 ?앹꽦 諛⑹?
const _vel = { x: 0, y: 0, z: 0 }
const _sightBlockedVelocity = { x: 0, z: 0 }
const MATILDA_DASH_SFX = Object.freeze({ id: 'matildaDash', volume: 0.76 })
const MATILDA_DASH_REVERSE_SFX = Object.freeze({ id: 'matildaDash', volume: 0.52, rate: 0.88 })
const MATILDA_LAUGH_SFX = Object.freeze({ id: 'matildaLaugh', volume: 0.82 })
// 0 = 몸통에 닿는 그 프레임에 즉사. 유예 없음(2026-08-13 사용자 지시).
// 예전 1000ms 유지 조건은 스쳐 지나가면 안 죽는 구멍이었다.
export const MATILDA_CONTACT_KILL_DELAY_MS = 0
const IGNORE_INVULNERABILITY = Object.freeze({ ignoreInvulnerability: true })

// 諛⑺뼢 ?뚯쟾 ?ы띁 ??useFrame ???⑥닔 ?ъ깮??諛⑹?瑜??꾪빐 紐⑤뱢 ?덈꺼
function _applyRotation(groupRef, dx, dz, turnRate = 0.12) {
  if (!groupRef.current) return
  if (Math.hypot(dx, dz) <= 0.0001) return
  const targetY = Math.atan2(dx, dz)
  let diff = targetY - groupRef.current.rotation.y
  while (diff >  Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  groupRef.current.rotation.y += diff * turnRate
}

export const ENEMY_SIZE_MULTIPLIER = 4 / 3
const BASE_COL = [0.14, 0.26, 0.10]
export const PLAYER_CONTACT_HALF_EXTENT = 0.136
// 마틸다는 표면이 스치는 순간이 아니라 플레이어 반폭의 약 절반만큼 실제로 겹친 뒤 즉사한다.
// "닿자마자" 판정처럼 보였던 가장자리 접촉 억제값이다.
export const MATILDA_CONTACT_PLAYER_OVERLAP_THRESHOLD = PLAYER_CONTACT_HALF_EXTENT * 0.5
// 최우선 연출 스펙(정본): 좀비 스폰 요청 시 "펑 연기가 먼저" 300ms 동안 완벽하게
// 보인 뒤 좀비가 등장한다. 연기는 앞 300ms 불투명(opacity 1.0) 유지 후 페이드아웃.
export const ENEMY_SPAWN_REVEAL_DELAY_MS = 300
export const SPAWN_SMOKE_DURATION_MS = 800
// 앞 구간 불투명 유지 시간 = 리빌 딜레이. 이 시점까지 연기가 100% 보인 뒤 좀비가 뜬다.
export const SPAWN_SMOKE_OPAQUE_MS = ENEMY_SPAWN_REVEAL_DELAY_MS
// 줌아웃 45° 카메라에서 좀비보다 큼직하게 — 기존(0.62→1.12) 대비 2배 이상 확대.
export const SPAWN_SMOKE_START_SCALE = 1.7
export const SPAWN_SMOKE_END_SCALE = 3.1

// 경과 시간(ms) → 연기 불투명도. 앞 SPAWN_SMOKE_OPAQUE_MS 동안 1.0 유지 후 선형 페이드아웃.
export function getSpawnSmokeOpacity(elapsedMs) {
  if (elapsedMs <= SPAWN_SMOKE_OPAQUE_MS) return 1
  const fadeSpan = SPAWN_SMOKE_DURATION_MS - SPAWN_SMOKE_OPAQUE_MS
  if (fadeSpan <= 0) return 0
  return Math.max(0, 1 - (elapsedMs - SPAWN_SMOKE_OPAQUE_MS) / fadeSpan)
}
export const ENEMY_SPAWN_SFX_COOLDOWN_MS = 110
// Wall half-thickness (0.5) + Matilda's widest collider half-extent (0.3733,
// i.e. BASE_COL[0] * B01 scale(2.00) * ENEMY_SIZE_MULTIPLIER -- recomputed after
// B01's scale was rolled back from 3.0 to 2.00), with a generous physics
// tolerance left in place so a wall collision cannot stall the loop.
export const MATILDA_EDGE_INSET = 1.2
export const MATILDA_LAUGH_DURATION_MS = 900
export const MATILDA_CHARGE_STALL_REVERSE_MS = 70
export const MATILDA_CHARGE_STALL_MOVE_RATIO = 0.18

export function hasMatildaReachedStageEdge(position, bounds, inset = MATILDA_EDGE_INSET) {
  return Math.abs(position.x) >= bounds.halfX - inset
    || Math.abs(position.z) >= bounds.halfZ - inset
}

export function isMatildaChargingOutward(position, direction, bounds, inset = MATILDA_EDGE_INSET) {
  return (position.x >= bounds.halfX - inset && direction.x > 0)
    || (position.x <= -bounds.halfX + inset && direction.x < 0)
    || (position.z >= bounds.halfZ - inset && direction.z > 0)
    || (position.z <= -bounds.halfZ + inset && direction.z < 0)
}

export function isMatildaChargeBlockedFrame({
  movedAlong,
  expectedMove,
  distanceToPlayer,
  hitDistance,
  moveRatio = MATILDA_CHARGE_STALL_MOVE_RATIO,
}) {
  return isMatildaChargeBlockedValues(movedAlong, expectedMove, distanceToPlayer, hitDistance, moveRatio)
}

export function isMatildaChargeBlockedValues(movedAlong, expectedMove, distanceToPlayer, hitDistance, moveRatio = MATILDA_CHARGE_STALL_MOVE_RATIO) {
  if (expectedMove <= 0.0001) return false
  if (distanceToPlayer <= hitDistance + 0.08) return false
  return movedAlong < expectedMove * moveRatio
}

export function shouldReverseMatildaChargeOnObstacle({
  movedAlong,
  expectedMove,
  distanceToPlayer,
  hitDistance,
  stalledMs,
}) {
  return shouldReverseMatildaChargeOnObstacleValues(movedAlong, expectedMove, distanceToPlayer, hitDistance, stalledMs)
}

export function shouldReverseMatildaChargeOnObstacleValues(movedAlong, expectedMove, distanceToPlayer, hitDistance, stalledMs) {
  return isMatildaChargeBlockedValues(movedAlong, expectedMove, distanceToPlayer, hitDistance)
    && stalledMs >= MATILDA_CHARGE_STALL_REVERSE_MS
}

export function advanceEnemySpawnTimer(elapsedMs, deltaSec, phase) {
  return phase === 'playing' ? elapsedMs + deltaSec * 1000 : elapsedMs
}

export function createMatildaContactKillCountdown(delayMs = MATILDA_CONTACT_KILL_DELAY_MS) {
  return { delayMs, started: false, fired: false, remainingMs: delayMs }
}

export function advanceMatildaContactKillCountdown(countdown, contact, deltaMs) {
  if (!countdown || countdown.fired) return false
  if (!contact) {
    countdown.started = false
    countdown.remainingMs = countdown.delayMs
    return false
  }
  if (!countdown.started) {
    countdown.started = true
  }
  countdown.remainingMs = Math.max(0, countdown.remainingMs - Math.max(0, deltaMs))
  if (countdown.remainingMs <= 0 && !countdown.fired) {
    countdown.fired = true
    return true
  }
  return false
}

function stableEnemyHash(enemyId) {
  let hash = 0
  for (const char of String(enemyId)) hash = ((hash * 31) + char.charCodeAt(0)) | 0
  return hash >>> 0
}

function stableEnemySide(enemyId) {
  return (stableEnemyHash(enemyId) & 1) === 0 ? 1 : -1
}

export function resolveSightBlockedEnemyVelocity({ blocked, enemyId, dirX, dirZ, speed }) {
  if (!blocked) return null
  const out = { x: 0, z: 0 }
  writeSightBlockedEnemyVelocity(out, blocked, enemyId, dirX, dirZ, speed)
  return out
}

// 보스 프레임 경로는 caller-owned out만 갱신해 방향 객체를 만들지 않는다.
export function writeSightBlockedEnemyVelocity(out, blocked, enemyId, dirX, dirZ, speed) {
  if (!blocked || !out) return false
  const length = Math.hypot(dirX, dirZ)
  if (length <= 1e-8) { out.x = 0; out.z = 0; return true }
  const wanderSpeed = speed * 0.55 * stableEnemySide(enemyId)
  out.x = (-dirZ / length) * wanderSpeed
  out.z = (dirX / length) * wanderSpeed
  return true
}

let _lastEnemySpawnSfxAt = Number.NEGATIVE_INFINITY

export function resetEnemySpawnSfxGateForTest() {
  _lastEnemySpawnSfxAt = Number.NEGATIVE_INFINITY
}

export function getEnemySpawnSfx(type, isMatilda = false) {
  if (isMatilda) return { id: 'matildaSpawn', volume: 0.72 }
  if (isBossType(type)) return { id: 'bossSpawn', volume: 0.78 }
  return { id: 'zombieSpawn', volume: 0.42 }
}

function emitEnemySpawnSfx(type, isMatilda = false) {
  const now = performance.now()
  const sfx = getEnemySpawnSfx(type, isMatilda)
  const isBossLike = isMatilda || isBossType(type)
  if (!isBossLike && now - _lastEnemySpawnSfxAt < ENEMY_SPAWN_SFX_COOLDOWN_MS) return
  _lastEnemySpawnSfxAt = now
  emitSfx({ id: sfx.id, volume: sfx.volume })
}

// 콜라이더(colArgs)와 접촉 판정이 항상 같은 스케일에서 파생되도록 하는 단일 출처.
// stats.scale이 없을 때만 1로 폴백 — 기존 getBodyContactDistance 동작과 동일.
export function getEnemyColliderScale(stats) {
  return (stats.scale ?? 1) * ENEMY_SIZE_MULTIPLIER
}

// CuboidCollider(colArgs)와 정확히 같은 값을 반환한다 — Enemy 컴포넌트의 colArgs도
// 이 함수로 계산해 두 값이 절대 어긋나지 않게 한다.
export function getEnemyColliderHalfExtents(stats) {
  const cs = getEnemyColliderScale(stats)
  return [BASE_COL[0] * cs, BASE_COL[1] * cs, BASE_COL[2] * cs]
}

// Stage 4의 보스/마틸다는 React/Rapier 경로를 사용한다. 풀 적의 enemySimulation
// clamp와 같은 map bound를 실제 콜라이더 반폭까지 포함해 적용한다.
export function writeSpecialEnemyVelocityWithinStageBounds(out, position, velocity, bounds, halfExtents, delta) {
  if (!out || !position || !velocity || !bounds || !halfExtents || !Number.isFinite(delta) || delta <= 0) return false
  out.x = velocity.x
  out.z = velocity.z
  const minX = -bounds.halfX + halfExtents[0]
  const maxX = bounds.halfX - halfExtents[0]
  const minZ = -bounds.halfZ + halfExtents[2]
  const maxZ = bounds.halfZ - halfExtents[2]
  if (out.x > 0 && position.x + out.x * delta > maxX) out.x = Math.max(0, (maxX - position.x) / delta)
  else if (out.x < 0 && position.x + out.x * delta < minX) out.x = Math.min(0, (minX - position.x) / delta)
  if (out.z > 0 && position.z + out.z * delta > maxZ) out.z = Math.max(0, (maxZ - position.z) / delta)
  else if (out.z < 0 && position.z + out.z * delta < minZ) out.z = Math.min(0, (minZ - position.z) / delta)
  return out
}

export function getBodyContactDistance(stats) {
  const enemyHalfExtent = Math.max(BASE_COL[0], BASE_COL[2]) * getEnemyColliderScale(stats)
  return enemyHalfExtent + PLAYER_CONTACT_HALF_EXTENT
}

export function getChargeHitDistance(stats, isMatilda = false) {
  return isMatilda
    ? getBodyContactDistance(stats)
    : stats.contactDist * ENEMY_SIZE_MULTIPLIER * 1.5
}

// 마틸다 몸은 좌우로 넓고 앞뒤로 얇은 직사각형이라, getBodyContactDistance의 스칼라
// 반경(가장 넓은 축 기준)으로 판정하면 정면·배면 접근에서 실제보다 일찍 죽는다.
// 이 함수는 콜라이더와 같은 출처(getEnemyColliderScale)에서 x/z 반extent를 가져온다.
export function getMatildaBodyHalfExtents(stats) {
  const [halfX, , halfZ] = getEnemyColliderHalfExtents(stats)
  return { halfX, halfZ }
}

// 회전 인식 박스 접촉 판정. 마틸다는 돌진 방향으로 회전하므로(groupRef.rotation.y)
// 월드축 기준 스칼라 거리로는 몸통 모양을 맞출 수 없다 — 플레이어 위치를 마틸다의
// 로컬 프레임으로 역회전시켜 축별 반extent와 비교한다.
export function isMatildaBodyContact({ enemyX, enemyZ, yaw = 0, playerX, playerZ, halfX, halfZ }) {
  const wx = playerX - enemyX
  const wz = playerZ - enemyZ
  const cosY = Math.cos(yaw)
  const sinY = Math.sin(yaw)
  // _applyRotation의 world = R(yaw) * local 관계의 역변환.
  const localX = wx * cosY - wz * sinY
  const localZ = wx * sinY + wz * cosY
  const lethalHalfX = Math.max(0, halfX + MATILDA_CONTACT_PLAYER_OVERLAP_THRESHOLD)
  const lethalHalfZ = Math.max(0, halfZ + MATILDA_CONTACT_PLAYER_OVERLAP_THRESHOLD)
  return Math.abs(localX) <= lethalHalfX
    && Math.abs(localZ) <= lethalHalfZ
}

// XP 媛믪? 援먭낵??30% ?쒕엻瑜좎쓣 蹂댁젙????3.3諛곕줈 梨낆젙 (Planner/B.寃뚯엫湲고쉷,諛몃윴??援ы쁽/B-1 罹먮┃???깆옣,?λ젰移??낃렇?덉씠??援ъ“ 援ы쁽/Rewards_Drops/dual_drop_system_2026-05-08.md 짠7-2).
// 이동속도 전 타입 ×1.1 (2026-08-13 사용자 지시 "폰에서 템포가 느리다 / 기본 좀비 이속이 너무 느리다"):
// 잡몹·러너·원거리·차저·런크루·보스까지 예외 없이 chase speed만 정확히 1.1배로 올린다.
// 반올림 규칙: 곱한 뒤 반올림하지 않는다 — 기존 값이 전부 소수 3자리 이하라 ×1.1이 소수 4자리에서
// 딱 떨어진다(예: 0.475→0.5225, 2.18→2.398). 임의 반올림은 E07=E01×2 불변식을 깨므로 금지.
// 돌진(chargeSpeed)·투사체(rangedSpeed)는 이동속도가 아니라 별도 스킬 파라미터라 대상이 아니다.
// Track B 신규 12종(E34~E45, typeCode 37~48). 2026-10-25 승인.
// 행동 루프는 lib/novelZombieBehavior.js가 소유하고, 여기에는 수치만 둔다.
//
// hp는 임의값이 아니라 "대체 대상(host)과 같은 값"으로 못박았다. 12종은 기존 스폰 요청을
// 대체하므로(총량 불변), 밀도 정규화(STAGE_DENSITY_MULTIPLIER)와 구간 부하 곡선이 비트 단위로
// 그대로 유지되려면 버스트 이벤트의 count×hp 합이 변하지 않아야 한다. hp를 host와 다르게 두면
// 그 합이 바뀌어 전 스테이지 밀도 파생값이 움직인다.
//   E34/E36/E37 ← E01(8) · E35/E38/E41/E45 ← E03(10) · E39/E44 ← E07(16) · E40/E42/E43 ← E02·E05(70)
// xp도 같은 host 값을 쓴다(보상 페이싱 불변).
//
// damage는 host보다 높게 잡아도 체감 DPS는 낮다 — 이 12종은 접촉만으로 지속 피해를 주지 않고
// ATTACK 단계의 짧은 창에서만 1회 판정하기 때문이다(예: E34는 2.4초 주기 중 220ms).
//
// 2026-10-25 정정: "DPS가 낮으니 Stage 1이 더 어려워지지 않는다"는 근거는 틀렸다 — 플레이어
// 피격 무적프레임 520ms를 빼먹었다(useGameStore.js:393,413). 무적 때문에 밀집 구간의 중복 접촉은
// 대부분 버려지므로 실효 지표는 DPS가 아니라 1타 피해량이고, 그 기준으로는 E34 9 / E36 10이
// 대체 대상 E01 8보다 1~2 높다. Stage 1이 더 어려워지지 않는 진짜 이유는 "닿는 빈도"다:
// 무적 520ms는 초당 유효 타수를 약 1.92타로 묶고, E01은 접촉만으로 그 상한을 거의 포화시키는
// 반면 12종은 한 주기당 1회(E34는 2.4초 주기 중 220ms)만 판정해 포화를 만들지 못한다.
// 무적을 적용한 실측(적 ring 배치 / 플레이어 정지 / 60초 / 초당 실 HP 손실):
//   24초 E01×9 13.20 → E01×5+E34×4 12.80 · 60초 E01×6 12.53 → E01×3+E36×3 12.50
//   · 72초 E03×2 7.60 → E35×2 6.07 — 세 구간 모두 대체 후가 더 낮다.
//
// ⚠ 이 표를 바꾸면 enemySimulation.js의 NOVEL_RUNTIME_ROWS도 같이 바꿔야 한다
//   (enemySimulation.parity.test.js가 강제한다).
const NOVEL_ZOMBIE_STATS = {
  E34: { hp: 8,  speed: 0.55, damage: 9,  scale: 0.95, xp: 4,  contactDist: 0.26, novel: true },
  E35: { hp: 10, speed: 0.72, damage: 7,  scale: 0.92, xp: 5,  contactDist: 0.24, novel: true },
  E36: { hp: 8,  speed: 0.50, damage: 10, scale: 1.00, xp: 4,  contactDist: 0.26, novel: true },
  E37: { hp: 8,  speed: 0.62, damage: 9,  scale: 0.98, xp: 4,  contactDist: 0.24, novel: true },
  E38: { hp: 10, speed: 0.70, damage: 8,  scale: 0.90, xp: 5,  contactDist: 0.24, novel: true },
  E39: { hp: 16, speed: 0.52, damage: 12, scale: 1.10, xp: 8,  contactDist: 0.30, novel: true },
  E40: { hp: 70, speed: 0.46, damage: 15, scale: 1.30, xp: 15, contactDist: 0.34, novel: true },
  E41: { hp: 10, speed: 0.66, damage: 9,  scale: 1.02, xp: 5,  contactDist: 0.26, novel: true },
  E42: { hp: 70, speed: 0.58, damage: 14, scale: 1.25, xp: 15, contactDist: 0.32, novel: true },
  E43: { hp: 70, speed: 0.44, damage: 16, scale: 1.35, xp: 15, contactDist: 0.36, novel: true },
  E44: { hp: 16, speed: 0.64, damage: 11, scale: 1.05, xp: 8,  contactDist: 0.26, novel: true },
  E45: { hp: 10, speed: 0.60, damage: 10, scale: 1.00, xp: 5,  contactDist: 0.26, novel: true },
}

export const ENEMY_STATS = {
  // E01 xp 6 → 4 (2026-08-08): E01(hp 8)이 더 강한 E03(hp 14, speed 1.1, xp 5)보다
  // 보상이 높은 역전 상태였다. 최약체가 최고 효율이면 강적을 잡을 이유가 없다.
  // 이 값을 바꾸면 enemySimulation.js의 ENEMY_RUNTIME_XP도 같이 바꿔야 한다
  // (enemySimulation.parity.test.js가 강제한다).
  E01: { hp: 8,    speed: 0.5225, damage: 8,  scale: 1.00, xp: 4,  contactDist: 0.28 },
  E02: { hp: 70,   speed: 0.4235, damage: 14, scale: 1.40, xp: 15, contactDist: 0.36 },
  // E03 hp 14 → 10 (2026-08-09): 빠른 러너를 −30% 체력으로 완화. E01(8)보다는 여전히 높다.
  E03: { hp: 10,   speed: 1.21, damage: 6,  scale: 0.75, xp: 5,  contactDist: 0.22 },
  E04: { hp: 32,   speed: 0.495, damage: 8,  scale: 0.90, xp: 10, contactDist: 0.26,
         ranged: true, rangedCooldown: 2200, rangedDmg: 8, rangedSpeed: 1.9,
         preferDist: 5.5, minDist: 3.5 },
  E05: { hp: 70,   speed: 0.55, damage: 16, scale: 1.15, xp: 15, contactDist: 0.32,
         charger: true, chargeSpeed: 1.7, warnDist: 4.5, warnDuration: 700, stunDuration: 1000, chargeDuration: 1200 },
  E06: { hp: 320,  speed: 0.66, damage: 20, scale: 1.60, xp: 56, contactDist: 0.42 },
  // Stage 3 Run Zombie crew: screen-crossing melee swarm, not a boss.
  RZL: { hp: 90,   speed: 2.695, damage: 14, scale: 1.08, xp: 12, contactDist: 0.28, runCrew: true },
  RZC: { hp: 28,   speed: 2.398, damage: 7,  scale: 0.78, xp: 5,  contactDist: 0.22, runCrew: true },
  // Stage 2 guard chase: a faster fleeing trench-coat zombie and six guards.
  RZT: { hp: 140,  speed: 1.4025, damage: 6,  scale: 1.76, xp: 5, contactDist: 0.22, runCrew: true },
  RZG: { hp: 48,   speed: 1.3475, damage: 9,  scale: 0.92, xp: 6, contactDist: 0.24, runCrew: true },
  // E07 웃는얼굴 좀비 (2026-08-09): E01(녹색좀비)의 정확히 2배 hp/damage/speed.
  // scale/contactDist는 E01과 동일하게 두어 히트박스 체감은 녹색좀비와 같게 유지한다.
  // xp 8: hp 16이라 E03(hp 10, xp 5)보다 높고 E04(hp 32, xp 10)보다 낮은 자리.
  // 이 값을 바꾸면 enemySimulation.js의 ENEMY_RUNTIME_* 15번 슬롯도 같이 바꿔야 한다.
  E07: { hp: 16,   speed: 1.045, damage: 16, scale: 1.00, xp: 8,  contactDist: 0.28 },
  // E08 코인 몬스터: 자기 영역을 배회하다가 감지되면 지그재그로 도망치는 보상형 반응 몬스터.
  E08: { hp: 12,   speed: 0.88,  damage: 0,  scale: 0.92, xp: 6,  contactDist: 0.26 },
  // B01 1?ㅽ뀒?댁?: 遺梨꾧섦 ?ъ궗泥??⑦꽩 ?쒓굅. 異붽꺽/?뚯쭊留??ъ슜 (Bang_Rules 2026-05-09 遺濡?.
  // contactDist 0.36: regular charge keeps the 1.5x grace distance; Matilda charge uses exact body contact only.
  // ?댁쟾 0.80? ?묒큺 諛섍꼍??~1.6?대씪 蹂몄껜 ?명삎蹂대떎 ?⑥뵮 而ㅼ꽌 "???우븘???쇨꺽"?섎뒗 臾몄젣媛 ?덉뿀??
  B01: { hp: 1150, speed: 0.5225, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         charger: true, mathTeacherSpecial: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
  B02: { hp: 1150, speed: 0.5225, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
  // B03 체육교사 base 1246은 임의값이 아니라 역산값이다(2026-08-24 사용자 지시:
  // "스테이지 3 보스 hp를 2스테이지 보스보다 1.3배로 맞춰").
  //   목표 stage3 실효 HP = 스2 보스 실효 1,380(= round(1150 × 1.2)) × 1.3 = 1,794.
  //   실효 HP는 sameTypeZombieHpForStage(Enemies.jsx)가 round(base × STAGE_HP_MULTIPLIER)로 내므로
  //   stage3 배수 1.44로 역산 → base 1246, round(1246 × 1.44) = round(1794.24) = 1,794.
  // STAGE_HP_MULTIPLIER.stage3가 바뀌면 이 base도 같은 목표값에서 다시 역산해야 한다.
  B03: { hp: 1246, speed: 0.5225, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
  // B04 주방장: 단일 2페이즈 보스. Phase1(HP100~50%)=원거리 포격, Phase2(HP<=50%)=격노 돌진.
  // hp 1500: 더블보스 합(B02+B03=2300)의 절반보다 두툼하게. 페이즈 전환/텔레그래프는 lib/chefBossPhase.js.
  // chefPhase1: E04(cooldown2200/dmg8/speed1.9)보다 느리고 굵은 포격. 맵 halfX 12라 preferDist 5.0.
  // chefPhase2: B02/B03과 동일 차저 계열. mathTeacherSpecial 없음(→ 돌진 후 stun).
  B04: { hp: 1500, speed: 0.5225, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         chefBoss: true,
         chefPhase1: { ranged: true, rangedCooldown: 2600, rangedDmg: 14, rangedSpeed: 1.6, preferDist: 5.0, minDist: 3.0 },
         chefPhase2: { charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 } },
  ...EXPANSION_STATS,
  ...NOVEL_ZOMBIE_STATS,
}

// 肄쒕씪?대뜑 湲곕낯 諛섑겕湲?(scale=1 湲곗?)
export function resolveRangedEnemyVelocity({ dirX, dirZ, dist, minDist, preferDist, speed, strafeSign = 1 }) {
  const len = Math.hypot(dirX, dirZ) || 1
  const nx = dirX / len
  const nz = dirZ / len
  if (dist < minDist) return { x: -nx * speed, z: -nz * speed }
  if (dist > preferDist) return { x: nx * speed, z: nz * speed }
  const side = strafeSign >= 0 ? 1 : -1
  return { x: -nz * speed * 0.75 * side, z: nx * speed * 0.75 * side }
}

export const CHARGE_CUE_LABEL = 'GO!'

export const CHARGE_CUE_LAYOUT = {
  y: 1.75,
  pulseScale: 0.08,
  billboard: true,
  parts: {
    bubble: { size: [1.05, 0.46, 0.08], position: [0, 0.07, 0], outlineScale: 1.08 },
    tail: { size: [0.22, 0.18, 0.08], position: [-0.28, -0.25, 0], rotation: [0, 0, 0.72], outlineScale: 1.08 },
    gVertical: { size: [0.08, 0.27, 0.06], position: [-0.36, 0.08, 0.08], outlineScale: 1.04 },
    gTop: { size: [0.22, 0.07, 0.06], position: [-0.26, 0.20, 0.08], outlineScale: 1.04 },
    gBottom: { size: [0.22, 0.07, 0.06], position: [-0.26, -0.04, 0.08], outlineScale: 1.04 },
    gMiddle: { size: [0.15, 0.07, 0.06], position: [-0.20, 0.06, 0.08], outlineScale: 1.04 },
    oLeft: { size: [0.08, 0.27, 0.06], position: [0.02, 0.08, 0.08], outlineScale: 1.04 },
    oRight: { size: [0.08, 0.27, 0.06], position: [0.22, 0.08, 0.08], outlineScale: 1.04 },
    oTop: { size: [0.20, 0.07, 0.06], position: [0.12, 0.20, 0.08], outlineScale: 1.04 },
    oBottom: { size: [0.20, 0.07, 0.06], position: [0.12, -0.04, 0.08], outlineScale: 1.04 },
    bang: { size: [0.07, 0.25, 0.06], position: [0.42, 0.10, 0.08], outlineScale: 1.04 },
    bangDot: { radius: 0.045, position: [0.42, -0.08, 0.08], outlineScale: 1.05 },
  },
}

// outlineMat(0.92) for charge cue ??zombie outline is 0.96, charge cue uses slightly lighter
let _chargeCueOutlineMat = null
const getChargeCueOutlineMat = () => {
  if (!_chargeCueOutlineMat) _chargeCueOutlineMat = outlineMat(0.92)
  return _chargeCueOutlineMat
}

function ChargeCueBlock({ size, position, rotation = [0, 0, 0], color, emissive = 0.22, outlineScale = 1.12 }) {
  const geo    = getCachedBoxGeo(...size)
  const outMat = getChargeCueOutlineMat()
  const mat    = getCachedToonMat(color, emissive)
  const os     = inflateScale(outlineScale)

  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={3} geometry={geo} material={outMat} scale={[os, os, os]} />
      <mesh renderOrder={4} geometry={geo} material={mat} />
    </group>
  )
}

function ChargeCueDot({ radius, position, color, emissive = 0.26, outlineScale = 1.18 }) {
  const mat    = getCachedToonMat(color, emissive)
  const outMat = getChargeCueOutlineMat()
  const geo    = useMemo(() => new THREE.SphereGeometry(radius, 12, 8), [radius])
  const os = inflateScale(outlineScale)

  return (
    <group position={position}>
      <mesh renderOrder={3} geometry={geo} material={outMat} scale={[os, os, os]} />
      <mesh renderOrder={4} geometry={geo} material={mat} />
    </group>
  )
}

function ChargeToonCue({ y }) {
  const ref = useRef()

  // STUDIO_OUTER_MOTION_ONLY — 이 useFrame은 StudioTunedGroup의 바깥 그룹만 움직인다.
  // 스튜디오 파츠는 건드리지 않으므로 튜닝을 덮어쓰지 않고 부모 변형으로 곱해질 뿐이다.
  useFrame((state) => {
    if (!ref.current) return
    const t = performance.now() * 0.001
    const pulse = 1 + Math.sin(t * 12) * CHARGE_CUE_LAYOUT.pulseScale
    ref.current.scale.set(pulse, pulse, pulse)
    ref.current.lookAt(state.camera.position)
  })

  const { parts } = CHARGE_CUE_LAYOUT
  return (
    <group ref={ref} position={[0, y, 0]}>
      <ChargeCueBlock {...parts.bubble} color={0xfff4d8} emissive={0.10} />
      <ChargeCueBlock {...parts.tail} color={0xfff4d8} emissive={0.10} />
      <ChargeCueBlock {...parts.gVertical} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.gTop} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.gBottom} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.gMiddle} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.oLeft} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.oRight} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.oTop} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.oBottom} color={0x241426} emissive={0.08} />
      <ChargeCueBlock {...parts.bang} color={0xff392e} emissive={0.28} />
      <ChargeCueDot {...parts.bangDot} color={0xff392e} emissive={0.32} />
    </group>
  )
}

// ?? ???ъ궗泥?(E04 ?먭굅由??꾩슜. B01 遺梨꾧섦 ?⑦꽩? 2026-05-09 ?먭린) ??????????????
export function getActiveE04ProjectileCount() {
  return enemyProjectilePool.activeCount
}

// special boss frame path uses this out-param form so it does not allocate a velocity object.
function writeRangedEnemyVelocity(out, dirX, dirZ, dist, minDist, preferDist, speed, strafeSign = 1) {
  const len = Math.hypot(dirX, dirZ) || 1
  const nx = dirX / len
  const nz = dirZ / len
  if (dist < minDist) { out.x = -nx * speed; out.z = -nz * speed }
  else if (dist > preferDist) { out.x = nx * speed; out.z = nz * speed }
  else {
    const side = strafeSign >= 0 ? 1 : -1
    out.x = -nz * speed * 0.75 * side
    out.z = nx * speed * 0.75 * side
  }
  return out
}

export function resetActiveE04ProjectileCountForTest() {
  enemyProjectilePool.reset()
}

// ?? HP 諛?????????????????????????????????????????????????????????????????????
// ?? 硫붿씤 Enemy 而댄룷?뚰듃 ???????????????????????????????????????????????????????
// E01-E06 standard zombies render via ZombieInstanceLayer (instanced). B01 + Matilda use React mesh.
const INSTANCED_TYPES = new Set(['E01', 'E02', 'E03', 'E04', 'E05', 'E06'])

export function EnemyVisual({ type = 'E01', animPhase = 'normal', hitFlash = false, hp, showHealthBar = true, groupRef = null, isMatilda = false, forceMesh = false, staticPose = false, scale, bossFaceRecipe, isChefPhase2 = false }) {
  const stats = ENEMY_STATS[type] ?? ENEMY_STATS.E01
  // scale prop lets a caller (Enemy) pass the merged statOverride scale (Matilda keeps B01's base scale)
  // so the rendered body matches the physics collider exactly. Falls back to the base
  // ENEMY_STATS scale when omitted -- every other caller (GraphicsStudio preview, StageBossPreview)
  // is unaffected.
  const cs = (scale ?? stats.scale) * ENEMY_SIZE_MULTIPLIER
  const useInstanced = !forceMesh && !isMatilda && INSTANCED_TYPES.has(type)
  const currentHp = hp ?? stats.hp
  const canShowChargeCue = stats.charger || (isChefPhase2 && stats.chefPhase2?.charger)

  return (
    <>
      <group ref={groupRef} scale={[cs * 0.333, cs * 0.333, cs * 0.333]}>
        {/* E01-E06: rendered imperatively by ZombieInstanceLayer ??no mesh here */}
        {!useInstanced && <ZombieMesh type={type} animPhase={animPhase} hitFlash={hitFlash} isMatilda={isMatilda} staticPose={staticPose} bossFaceRecipe={bossFaceRecipe} />}
        {!staticPose && canShowChargeCue && animPhase === 'warn' && <ChargeToonCue y={CHARGE_CUE_LAYOUT.y} />}
      </group>
      {showHealthBar && <MiniHealthBar current={currentHp} max={stats.hp} width={0.32 * cs} height={0.045} y={0.72 * cs} />}
    </>
  )
}

// 이 값 이상이면 빌보드 대신 3D 메시 연기를 쓴다(2026-08-17 사용자 지시).
// visualScale은 호출부에서 stats.scale × ENEMY_SIZE_MULTIPLIER(4/3) × 0.333 = scale × 0.4444로 들어온다.
//   E03 0.333 · E01 0.444 · E05 0.511 · E02 0.622 │ E06 0.711 · RZT 0.782 · B01~B04 0.889
// 0.70은 E02(0.622)와 E06(0.711) 사이의 빈 구간이라 경계에서 흔들리는 몬스터가 없다.
// 타입 목록 대신 크기로 가르는 이유: 새 몬스터가 추가돼도 알아서 맞는 쪽에 붙는다.
export const BIG_SPAWN_SMOKE_MIN_VISUAL_SCALE = 0.70

export function isBigSpawnSmoke(visualScale) {
  return (visualScale ?? 0) >= BIG_SPAWN_SMOKE_MIN_VISUAL_SCALE
}

// 퍼프 좌표·반지름 전체에 걸리는 배율. 스튜디오에서 빌보드와 나란히 띄워 보고 잡은 값이다
// (2026-08-20). 이게 없을 때(=1.0) 구름의 최대 반경이 visualScale의 3.06배까지 부풀어
// 빌보드(1.55배)의 2배가 됐다 — 보스가 자기 등장 연기에 완전히 파묻혔다.
//   최대 반경 = 최대 오프셋(0.78) × spread(1.9) + 최대 반지름(0.62) × (1 + grow 1.55)
// 0.55를 곱하면 1.68배로, 빌보드보다 아주 조금 크다. 부피감은 남고 몬스터는 가려지지 않는다.
export const BIG_SPAWN_SMOKE_SIZE = 0.55

export const B02_CORRIDOR_BLOCKADE_VISUALS = Object.freeze({
  telegraph: Object.freeze({ surface: '#22cbd2', surfaceOpacity: 0.48, outline: '#063b46', outlineOpacity: 0.82, shadow: '#021c24', shadowOpacity: 0.34 }),
  active: Object.freeze({ surface: '#24edf0', surfaceOpacity: 0.9, outline: '#052f39', outlineOpacity: 0.96, shadow: '#021923', shadowOpacity: 0.46 }),
  completed: Object.freeze({ surface: '#0d6570', surfaceOpacity: 0.22, outline: '#063b46', outlineOpacity: 0.5, shadow: '#021923', shadowOpacity: 0.18 }),
})

// 선은 이제 보스를 두르는 고정 경계라 순차 점등이 없다 — 활성 중에는 전부 같은 상태다.
export function getB02CorridorBlockadeLineVisualState({ phase }) {
  if (phase === 'telegraph') return 'telegraph'
  return phase === 'active' ? 'active' : 'completed'
}

export function shouldRenderB02CorridorBlockadeVisual({ phase, lineZs }) {
  return (phase === 'telegraph' || phase === 'active') && lineZs.length > 0
}

export function B02CorridorBlockadeVisual({ phase, lineZs, halfX }) {
  if (!shouldRenderB02CorridorBlockadeVisual({ phase, lineZs })) return null
  return (
    <group name="B02 복도 봉쇄선">
      {lineZs.map((z, index) => {
        const visualState = getB02CorridorBlockadeLineVisualState({ phase })
        const visual = B02_CORRIDOR_BLOCKADE_VISUALS[visualState]
        return (
          <group key={`${index}:${z}`} userData={{ blockadeLineState: visualState }}>
            <mesh position={[0, 0.012, z]}>
              <boxGeometry args={[halfX * 2, 0.016, B02_BLOCKADE_LINE_WIDTH + 0.42]} />
              <meshBasicMaterial color={visual.shadow} transparent opacity={visual.shadowOpacity} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.026, z]}>
              <boxGeometry args={[halfX * 2, 0.028, B02_BLOCKADE_LINE_WIDTH + 0.16]} />
              <meshBasicMaterial color={visual.outline} transparent opacity={visual.outlineOpacity} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.047, z]}>
              <boxGeometry args={[halfX * 2, 0.024, B02_BLOCKADE_LINE_WIDTH]} />
              <meshBasicMaterial color={visual.surface} transparent opacity={visual.surfaceOpacity} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export const B03_SHUTTLE_RUN_VISUALS = Object.freeze({
  telegraph: Object.freeze({ surface: '#f5b83d', surfaceOpacity: 0.44, outline: '#6b4308', outlineOpacity: 0.82 }),
  outbound: Object.freeze({ surface: '#ffd34e', surfaceOpacity: 0.82, outline: '#6b4308', outlineOpacity: 0.96 }),
  returning: Object.freeze({ surface: '#e6a81f', surfaceOpacity: 0.86, outline: '#5d3906', outlineOpacity: 0.98 }),
  stun: Object.freeze({ surface: '#c99a43', surfaceOpacity: 0.2, outline: '#5d451d', outlineOpacity: 0.42 }),
})

export const B04_SOUP_BLAST_VISUALS = Object.freeze({
  telegraph: Object.freeze({ surface: '#f4ad32', surfaceOpacity: 0.46, outline: '#663507', outlineOpacity: 0.86 }),
  explode: Object.freeze({ surface: '#ff6b1f', surfaceOpacity: 0.92, outline: '#751a05', outlineOpacity: 1 }),
})

export function getB04SoupBlastVisualState(phase) {
  return phase === 'explode' ? 'explode' : 'telegraph'
}

// Direct transition-only cues: no timer, playback dependency or duplicate death/clear.
// Existing per-enemy soup/chef/charge refs own deduplication and reset on spawn.
function emitStage4B04Cue(type, id) {
  const state = useGameStore.getState()
  if (type !== 'B04' || state.currentStageId !== 'stage4' || state.phase !== 'playing') return
  try { emitSfx({ id }) } catch { /* Audio listeners must not interrupt combat. */ }
}

export function B04SoupBlastVisual({ phase, circles }) {
  if ((phase !== 'telegraph' && phase !== 'explode') || circles.length === 0) return null
  const visualState = getB04SoupBlastVisualState(phase)
  const visual = B04_SOUP_BLAST_VISUALS[visualState]
  return (
    <group name="B04 국물 대폭발 원형 표식" userData={{ soupBlastState: visualState }}>
      {circles.map((circle, index) => (
        <group key={`${index}:${circle.x}:${circle.z}`} position={[circle.x, 0, circle.z]}>
          {Array.from({ length: 8 }, (_, segment) => (
            <mesh key={segment} name="b04-soup-segment" position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={9}>
              <ringGeometry args={[circle.radius - 0.18, circle.radius, 48, 1, segment * Math.PI / 4, Math.PI / 4 - 0.13]} />
              <meshBasicMaterial color={visual.outline} depthWrite={false} toneMapped={false} />
            </mesh>
          ))}
          <mesh position={[0, 0.047, 0]}>
            <cylinderGeometry args={[circle.radius - 0.22, circle.radius - 0.22, 0.024, 32]} />
            <meshBasicMaterial color={visual.surface} transparent opacity={visual.surfaceOpacity} depthWrite={false} toneMapped={false} />
          </mesh>
          {/* Bowl + rising steam identifies soup without relying on its color. */}
          <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
            <ringGeometry args={[0.32, 0.42, 16, 1, Math.PI, Math.PI]} />
            <meshBasicMaterial color="#fff4d4" depthWrite={false} toneMapped={false} />
          </mesh>
          {[-0.18, 0, 0.18].map((x) => (
            <mesh key={x} position={[x, 0.075, -0.19]} rotation={[0, 0.25, 0]} renderOrder={10}>
              <boxGeometry args={[0.06, 0.02, visualState === 'explode' ? 0.48 : 0.24]} />
              <meshBasicMaterial color="#fff4d4" depthWrite={false} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export function getB03ShuttleRunVisualState({ phase, passIndex }) {
  if (phase === 'telegraph') return 'telegraph'
  if (phase === 'active') return passIndex === 1 ? 'returning' : 'outbound'
  return 'stun'
}

// startX/endX 비교가 빠지면 두 번째 시전(HP 30%)에서 첫 시전 때 그린 선이 그대로 남는다.
export function hasB03ShuttleRunVisualChanged(previous, state) {
  return previous.phase !== state.phase || previous.laneZ !== state.laneZ || previous.passIndex !== state.passIndex
    || previous.startX !== state.startX || previous.endX !== state.endX
}

function B03ShuttleRunVisual({ phase, passIndex, laneZ, startX, endX }) {
  const outlineMatRef = useRef()
  const surfaceMatRef = useRef()
  const telegraphMsRef = useRef(0)
  const visualState = getB03ShuttleRunVisualState({ phase, passIndex })
  const visual = B03_SHUTTLE_RUN_VISUALS[visualState]
  useEffect(() => { telegraphMsRef.current = 0 }, [phase])
  // 깜빡임을 리액트 state로 돌리면 텔레그래프 내내 프레임마다 리렌더가 난다.
  // 머티리얼 opacity만 useFrame에서 직접 흔들고, 리렌더는 phase 전환에서만 일어나게 둔다.
  useFrame((_, delta) => {
    const outlineMaterial = outlineMatRef.current
    const surfaceMaterial = surfaceMatRef.current
    if (!outlineMaterial || !surfaceMaterial) return
    if (phase !== 'telegraph') {
      telegraphMsRef.current = 0
      outlineMaterial.opacity = visual.outlineOpacity
      surfaceMaterial.opacity = visual.surfaceOpacity
      return
    }
    telegraphMsRef.current += delta * 1000
    const blink = getB03ShuttleTelegraphBlinkFactor(telegraphMsRef.current)
    outlineMaterial.opacity = visual.outlineOpacity * blink
    surfaceMaterial.opacity = visual.surfaceOpacity * blink
  })
  if (phase === 'idle') return null
  // 아레나 전폭이 아니라 실제 왕복 코스 [startX, endX]만 덮는다.
  const { centerX, length } = getB03ShuttleRunLaneGeometry(startX, endX)
  return (
    <group name="B03 왕복 오래달리기 레인" userData={{ shuttleRunState: visualState }}>
      <mesh position={[centerX, 0.024, laneZ]}>
        <boxGeometry args={[length + 0.18, 0.028, B03_SHUTTLE_LANE_WIDTH + 0.18]} />
        <meshBasicMaterial ref={outlineMatRef} color={visual.outline} transparent opacity={visual.outlineOpacity} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[centerX, 0.047, laneZ]}>
        <boxGeometry args={[length, 0.024, B03_SHUTTLE_LANE_WIDTH]} />
        <meshBasicMaterial ref={surfaceMatRef} color={visual.surface} transparent opacity={visual.surfaceOpacity} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

// 큰 몬스터용 연기 뭉치. 빌보드 한 장을 크게 늘리면 텍스처가 그대로 확대돼 허접해 보이므로
// 반투명 흰 구 몇 개를 서로 다른 위치·크기로 부풀려 부피감을 낸다.
// 좌표·반지름은 전부 visualScale 배수라 몬스터 크기에 그대로 따라간다.
const BIG_SPAWN_PUFFS = Object.freeze([
  { x: 0.00, y: 0.10, z: 0.00, r: 0.62, grow: 1.55 },
  { x: 0.78, y: -0.10, z: 0.20, r: 0.46, grow: 1.40 },
  { x: -0.70, y: -0.04, z: -0.30, r: 0.50, grow: 1.45 },
  { x: 0.22, y: 0.34, z: -0.74, r: 0.42, grow: 1.35 },
  { x: -0.26, y: 0.30, z: 0.72, r: 0.44, grow: 1.38 },
  { x: 0.04, y: 0.66, z: 0.06, r: 0.38, grow: 1.30 },
])

// 스폰은 자주 일어난다 — 지오메트리는 전 인스턴스가 공유한다(머티리얼만 인스턴스별로 만든다.
// 불투명도가 시간에 따라 움직이므로 공유하면 동시 스폰끼리 서로의 페이드를 덮어쓴다).
const BIG_SPAWN_PUFF_GEOMETRY = new THREE.SphereGeometry(1, 10, 8)

export function BigSpawnSmokeEffect({ position, visualScale, frozen = false }) {
  const groupRef = useRef()
  const puffRefs = useRef([])
  const elapsedMsRef = useRef(0)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)
  const phase = useGameStore((s) => s.phase)
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    toneMapped: false,
  }), [])
  useEffect(() => () => { material.dispose() }, [material])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    if (!frozen) elapsedMsRef.current = advanceEnemySpawnTimer(elapsedMsRef.current, delta, phase)
    const elapsed = elapsedMsRef.current
    const t = Math.min(1, elapsed / SPAWN_SMOKE_DURATION_MS)
    const ease = 1 - (1 - t) * (1 - t)
    // 퍼프 크기·간격·띄움을 한 배율로 묶는다. 따로 놀면 구름만 작아지고 띄움은 그대로라
    // 몬스터 머리 위에 붕 뜬다.
    const size = visualScale * BIG_SPAWN_SMOKE_SIZE

    // 빌보드와 같은 시간축을 탄다 — 앞 300ms 불투명 유지 후 페이드아웃.
    const opacity = getSpawnSmokeOpacity(elapsed)
    material.opacity = opacity
    group.position.y = position[1] + size * (0.9 + t * 0.5)
    group.rotation.y = ease * 0.9

    for (let i = 0; i < BIG_SPAWN_PUFFS.length; i += 1) {
      const puff = puffRefs.current[i]
      if (!puff) continue
      const spread = 1 + ease * 0.9
      puff.position.set(
        BIG_SPAWN_PUFFS[i].x * size * spread,
        BIG_SPAWN_PUFFS[i].y * size * spread,
        BIG_SPAWN_PUFFS[i].z * size * spread,
      )
      puff.scale.setScalar(BIG_SPAWN_PUFFS[i].r * size * (1 + ease * BIG_SPAWN_PUFFS[i].grow))
    }

    if (t >= 1 && !doneRef.current) {
      doneRef.current = true
      requestAnimationFrame(() => setDone(true))
    }
  })

  if (done) return null

  return (
    <StudioTunedGroup itemId="vfx-zombie-spawn-puff">
      <group ref={groupRef} position={[position[0], position[1] + visualScale, position[2]]}>
        {BIG_SPAWN_PUFFS.map((puff, index) => (
          <group
            key={index}
            ref={(node) => { puffRefs.current[index] = node }}
            position={[puff.x * visualScale, puff.y * visualScale, puff.z * visualScale]}
            scale={puff.r * visualScale}
          >
            <mesh geometry={BIG_SPAWN_PUFF_GEOMETRY} material={material} renderOrder={100} />
          </group>
        ))}
      </group>
    </StudioTunedGroup>
  )
}

// 작은 좀비용 원본 빌보드. 작을 땐 이쪽이 더 낫다 — 교체하지 않는다.
function BillboardSpawnSmokeEffect({ position, visualScale, frozen = false }) {
  const billboardRef = useRef()
  const materialRef = useRef()
  const elapsedMsRef = useRef(0)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)
  const phase = useGameStore((s) => s.phase)
  const texture = useLoader(THREE.TextureLoader, spawnSmokeUrl)
  texture.colorSpace = THREE.SRGBColorSpace

  useFrame((_, delta) => {
    const billboard = billboardRef.current
    const material = materialRef.current
    if (!billboard || !material) return
    if (!frozen) elapsedMsRef.current = advanceEnemySpawnTimer(elapsedMsRef.current, delta, phase)
    const elapsed = elapsedMsRef.current
    const t = Math.min(1, elapsed / SPAWN_SMOKE_DURATION_MS)
    const ease = 1 - (1 - t) * (1 - t)
    const size = visualScale * (
      SPAWN_SMOKE_START_SCALE + ease * (SPAWN_SMOKE_END_SCALE - SPAWN_SMOKE_START_SCALE)
    )
    billboard.scale.set(size, size, 1)
    billboard.position.y = position[1] + visualScale * (1.0 + t * 0.32)
    // 앞 300ms(리빌 딜레이) 동안 opacity 1.0 유지 후 페이드아웃
    material.opacity = getSpawnSmokeOpacity(elapsed)
    if (t >= 1 && !doneRef.current) {
      doneRef.current = true
      requestAnimationFrame(() => setDone(true))
    }
  })

  if (done) return null

  const startSize = visualScale * SPAWN_SMOKE_START_SCALE
  return (
    <StudioTunedGroup itemId="vfx-zombie-spawn-puff">
    <Billboard
      ref={billboardRef}
      follow
      position={[position[0], position[1] + visualScale, position[2]]}
      scale={[startSize, startSize, 1]}
    >
      <mesh renderOrder={100}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          opacity={1}
          alphaTest={0.01}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
    </StudioTunedGroup>
  )
}

// 호출부 4곳(Enemy 본체, DancingDogeEvent 등장·도주, 그래픽 스튜디오 프리뷰)이 전부 이걸 쓴다.
// 분기를 여기 두면 호출부는 손댈 필요가 없고, "연기 없는 스폰 경로"가 생길 수도 없다.
// 두 구현 모두 SPAWN_SMOKE_DURATION_MS·getSpawnSmokeOpacity를 그대로 쓰므로
// 펑 선행 → 300ms 불투명 → 좀비 리빌 계약은 어느 쪽으로 갈라져도 동일하다.
export function SpawnSmokeEffect(props) {
  return isBigSpawnSmoke(props.visualScale)
    ? <BigSpawnSmokeEffect {...props} />
    : <BillboardSpawnSmokeEffect {...props} />
}

export default function Enemy({ id, type = 'E01', spawnPos, onDeath, statOverride, isMatilda = false, runCrewDir = null }) {
  const rb       = useRef()
  const groupRef = useRef()
  const stats    = useMemo(() => ({ ...(ENEMY_STATS[type] ?? ENEMY_STATS.E01), ...statOverride }), [type, statOverride])
  // B04의 spread 병합은 렌더/입력 변경 때만 수행한다. 프레임에서는 state에 맞는 안정 참조만 고른다.
  const chefActiveStats = useMemo(() => ({
    phase1: resolveChefBossActiveStats(stats, CHEF_PHASE1),
    phase2: resolveChefBossActiveStats(stats, CHEF_PHASE2),
  }), [stats])
  const cs       = getEnemyColliderScale(stats)
  const colArgs  = getEnemyColliderHalfExtents(stats)
  const matildaHalfExtents = useMemo(() => getMatildaBodyHalfExtents(stats), [stats])

  const [hp, setHp]           = useState(stats.hp)
  const [hitFlash, setHitFlash] = useState(false)
  const [spawnRevealed, setSpawnRevealed] = useState(false)
  const [animPhase, setAnimPhase] = useState('normal') // normal|warn|charge|special|stun|retreat
  const [isChefPhase2, setIsChefPhase2] = useState(false)
  const [b02BlockadeVisual, setB02BlockadeVisual] = useState(() => createB02CorridorBlockadeState())
  const [b03ShuttleVisual, setB03ShuttleVisual] = useState(() => createB03ShuttleRunState())
  const [b04SoupBlastVisual, setB04SoupBlastVisual] = useState(() => createB04SoupBlastState())
  const visualFlushRef       = useRef({ scheduled: false, hp: stats.hp, hitFlash: false, spawnRevealed: false, animPhase: 'normal' })
  const spawnRevealedRef     = useRef(false)
  const queueVisualState = useCallback((key, value) => {
    const pending = visualFlushRef.current
    pending[key] = value
    if (key === 'spawnRevealed') spawnRevealedRef.current = value
    if (pending.scheduled) return
    pending.scheduled = true
    requestAnimationFrame(() => {
      pending.scheduled = false
      setHp(pending.hp)
      setHitFlash(pending.hitFlash)
      setSpawnRevealed(pending.spawnRevealed)
      setAnimPhase(pending.animPhase)
    })
  }, [])
  const hitFlashRef           = useRef(false)  // ref mirror for instanced renderer
  const hpRef                 = useRef(stats.hp)
  const stage4BoundedVelocityRef = useRef({ x: 0, z: 0 })
  const dead                  = useRef(false)
  const expansionAttackRef = useRef(null)
  const expansionArgsRef = useRef({deltaMs:0,playing:true,alive:true,gameKey:0,x:0,z:0,playerX:0,playerZ:0,hpRatio:1})
  useEffect(() => () => cancelExpansionAttack(expansionAttackRef.current), [])
  // 벽시계 기한(performance.now() + 기간)이 아니라 남은 ms다. pause 동안 useFrame이
  // 일찍 return하는데 벽시계는 계속 흘러, 재개 첫 프레임에 넉백 구간이 통째로 소진됐다.
  const knockbackRemainingRef = useRef(0)
  const knockbackDir          = useRef(new THREE.Vector3())
  const knockbackSpeedRef     = useRef(3.8)
  // 접촉 피해 쿨다운 **잔량** ms. 예전에는 마지막 피해의 벽시계 타임스탬프였는데,
  // pause 동안에도 벽시계가 흘러 재개 첫 프레임에 500ms가 이미 지난 것으로 계산됐고
  // 접촉 피해가 즉시 들어갔다. 500ms 값은 그대로, 측정만 게임시간 차감으로 바꾼다.
  // 확장 보스 경로(state.ageMs 기준)와 일반 경로(벽시계)가 서로 다른 시간축을
  // 같은 ref에 쓰던 문제도 이걸로 하나로 합쳐진다.
  const contactDamageCooldownRef = useRef(0)
  // 스폰 공개 이후의 **게임시간** 누적 ms. E04/B04 발사 게이트가 쓰는 시계다.
  const enemyAgeMsRef         = useRef(0)
  const spawnRevealElapsedRef = useRef(0)
  // 프레임마다 재사용하는 스크래치 객체 — 마틸다 박스 접촉 판정 입력용(RULE-0.2: 매 프레임 객체 생성 금지)
  const matildaContactArgsRef = useRef({ enemyX: 0, enemyZ: 0, yaw: 0, playerX: 0, playerZ: 0, halfX: 0, halfZ: 0 })
  const matildaContactKillCountdownRef = useRef(createMatildaContactKillCountdown())

  // E05 / B01 ?뚯쭊 ?곹깭 癒몄떊
  const chargeState  = useRef(isMatilda ? 'matildaAim' : 'chase')
  // 현재 돌진 상태에 머문 **게임시간** 누적 ms. matildaLaughRemainingRef / advanceB04SoupBlast와
  // 같은 방식이다. 예전의 벽시계 타임스탬프(performance.now())는 pause 중에도 흘러서
  // 재개 첫 프레임에 warn 800ms가 전부 지난 것으로 계산됐고, 예고 없이 돌진이 터졌다.
  // 측정 방법만 바뀐다 — warn 800 / charge 2200 / stun 1200 수치는 그대로다.
  // 직전 프레임이 playing이었는지. false→true로 바뀐 프레임의 delta는 정지 길이가
  // 그대로 들어오므로 믿지 않고 고정 스텝 한 칸으로 치환한다(pause 보호).
  const wasPlayingRef = useRef(false)
  const chargeStateElapsedRef = useRef(0)
  const b02BlockadeRef = useRef(createB02CorridorBlockadeState())
  const b03ShuttleRef = useRef(createB03ShuttleRunState())
  const b04SoupBlastRef = useRef(createB04SoupBlastState())
  const matildaLaughRemainingRef = useRef(0)
  const matildaLaughCuePendingRef = useRef(false)
  const matildaChargeStallMsRef = useRef(0)
  const matildaDashCountRef = useRef(0)
  const matildaPreviousChargePosRef = useRef({ x: spawnPos[0], z: spawnPos[2] })
  const chargeDir    = useRef(new THREE.Vector3())

  // B04 주방장 2페이즈 상태
  const chefPhaseRef = useRef(CHEF_PHASE1)
  // 격노 윈드업에 머문 **게임시간** 누적 ms(벽시계 시작 타임스탬프 아님).
  const chefTelegraphElapsedRef = useRef(0)

  // E04/B04 projectile state is the shared fixed projectile pool; no React array is mounted.
  const lastFireRef = useRef(0)
  // B04만 쓰는 재료 투사체 순환 카운터. 비주얼 전용이라 데미지·속도·쿨다운과 무관하다.
  const chefProjectileKindRef = useRef(0)
  // 보스 프레임의 헬퍼 입력·로그 payload는 모두 재사용한다.
  const chefPhaseArgsRef = useRef({ hpRatio: 1, telegraphElapsedMs: 0 })
  const e04FireArgsRef = useRef({ elapsedSec: 0, ageMs: 0, activeProjectileCount: 0, distanceToPlayer: 0, lastFireElapsedMs: 0, nowMs: 0, cooldownMs: 2200, introSec: 72, bossPressure: false })
  const mathSwingArgsRef = useRef({ bodies: enemyBodies, bossId: '', origin: { x: 0, z: 0 }, yaw: 0 })
  const mathSwingArcArgsRef = useRef({ yaw: 0, originX: 0, originZ: 0, targetX: 0, targetZ: 0, radius: MATH_TEACHER_SWING_RADIUS })
  const mathStartLogRef = useRef({ bossId: '', trigger: '' })
  const mathImpactLogRef = useRef({ bossId: '', pushedZombies: 0, playerHit: false, playerDamage: 0, playerHpAfter: 0 })
  const mathEndLogRef = useRef({ bossId: '' })

  const damagePlayer = useGameStore((s) => s.damagePlayer)
  const killPlayer = useGameStore((s) => s.killPlayer)
  const phase        = useGameStore((s) => s.phase)
  const currentStageId = useGameStore((s) => s.currentStageId)
  const bossSpawnSec = useGameStore((s) => s.bossSpawnSec)
  const sightObstacles = useMemo(() => getStageObjectSightObstacles(currentStageId), [currentStageId])
  const stageCombatConfig = useMemo(() => {
    const config = getStageConfig(currentStageId)
    return {
      bossPressureStartSec: bossSpawnSec,
      bossPressureEndSec: config.escapePortalSec ?? 210,
      e04IntroSec: getE04IntroSec(currentStageId),
      bounds: getStageBounds(currentStageId),
    }
  }, [bossSpawnSec, currentStageId])
  const syncB02BlockadeVisual = useCallback((state) => {
    setB02BlockadeVisual((previous) => (
      previous.phase === state.phase
        && previous.lineZs.join(',') === state.lineZs.join(',')
        ? previous
        : { ...state }
    ))
  }, [])
  const syncB03ShuttleVisual = useCallback((state) => {
    setB03ShuttleVisual((previous) => (
      hasB03ShuttleRunVisualChanged(previous, state) ? { ...state } : previous
    ))
  }, [])
  const syncB04SoupBlastVisual = useCallback((state) => {
    setB04SoupBlastVisual((previous) => (
      previous.phase === state.phase
        && previous.circles.map((circle) => `${circle.x}:${circle.z}:${circle.radius}`).join(',') === state.circles.map((circle) => `${circle.x}:${circle.z}:${circle.radius}`).join(',')
        ? previous
        : { ...state }
    ))
  }, [])
  const sightBlockedRef = useRef(false)
  const nextSightCheckRef = useRef(0)

  useEffect(() => {
    spawnRevealedRef.current = false
    queueVisualState('spawnRevealed', false)
    spawnRevealElapsedRef.current = 0
    enemyAgeMsRef.current = 0
    chargeState.current = isMatilda ? 'matildaLaugh' : 'chase'
    // 슬롯 재사용 시 이전 좀비의 상태 경과/넉백 잔량이 넘어오면 안 된다.
    // 잔량형 전환에서 가장 위험한 지점이다 — 하나라도 빠지면 이전 좀비의 쿨다운이
    // 새 좀비를 묶거나(발사 봉쇄) 풀어준다(접촉 피해 즉시 발생).
    wasPlayingRef.current = false
    chargeStateElapsedRef.current = 0
    knockbackRemainingRef.current = 0
    contactDamageCooldownRef.current = 0
    lastFireRef.current = 0
    matildaLaughRemainingRef.current = isMatilda ? MATILDA_LAUGH_DURATION_MS : 0
    matildaLaughCuePendingRef.current = isMatilda
    matildaChargeStallMsRef.current = 0
    matildaDashCountRef.current = 0
    matildaContactKillCountdownRef.current = createMatildaContactKillCountdown()
    matildaPreviousChargePosRef.current.x = spawnPos[0]
    matildaPreviousChargePosRef.current.z = spawnPos[2]
    chefPhaseRef.current = CHEF_PHASE1
    setIsChefPhase2(false)
    chefTelegraphElapsedRef.current = 0
    chefProjectileKindRef.current = 0
    sightBlockedRef.current = false
    nextSightCheckRef.current = getRuntimeElapsedMs(useGameStore.getState().elapsedMs) + (stableEnemyHash(id) % 90)
    b02BlockadeRef.current = createB02CorridorBlockadeState()
    syncB02BlockadeVisual(b02BlockadeRef.current)
    b03ShuttleRef.current = createB03ShuttleRunState()
    syncB03ShuttleVisual(b03ShuttleRef.current)
    b04SoupBlastRef.current = createB04SoupBlastState()
    syncB04SoupBlastVisual(b04SoupBlastRef.current)
    queueVisualState('animPhase', isMatilda ? 'stun' : 'normal')
    emitEnemySpawnSfx(type, isMatilda)
  }, [id, type, isMatilda, syncB02BlockadeVisual, syncB03ShuttleVisual, syncB04SoupBlastVisual])

  useEffect(() => () => {
    b04SoupBlastRef.current = createB04SoupBlastState()
  }, [])

  useEffect(() => {
    if (!spawnRevealed) return
    if (!rb.current) return
    enemyBodies.set(id, rb.current)
    rb.current._enemyHit = (dmg, impact = {}) => {
      if (dead.current) return
      const hitPos = rb.current.translation()
      if (!impact.ignoreSightBlock && isPlayerWeaponSightBlocked(hitPos, useGameStore.getState().currentStageId)) return
      const criticalHit = resolveCriticalHit({
        baseDamage: dmg,
        canCrit: impact.canCrit,
        damageType: impact.damageType,
        attackTags: impact.attackTags,
        critChance: impact.critChance,
        critMultiplier: impact.critMultiplier,
      })
      const finalDamage = criticalHit.damage
      const willKill = hpRef.current <= finalDamage
      const strongCritical = criticalHit.isCritical && ((willKill && isBossType(type)) || (Number.isFinite(stats.hp) && stats.hp > 0 && finalDamage >= stats.hp * 0.25))
      emitVfx(criticalHit.isCritical
        ? createEnemyCriticalHitBurstEvent({ x: hitPos.x, y: Math.max(0.46, 0.52 * cs), z: hitPos.z, strong: strongCritical })
        : createEnemyHitSparkEvent({ x: hitPos.x, y: Math.max(0.34, 0.42 * cs), z: hitPos.z }))
      if (criticalHit.isCritical) emitSfx({ id: 'criticalHit', volume: strongCritical ? 1.8 : 1.52 })
      const screenShake = criticalHit.isCritical ? emitCriticalHitScreenShake : emitEnemyHitScreenShake
      screenShake(
        hitPos.x - playerPos.x,
        hitPos.z - playerPos.z,
        criticalHit.isCritical ? { strong: strongCritical } : undefined,
      )
      // 모든 무기가 이 지점(_enemyHit)을 공통으로 지난다 → 여기서 데미지 숫자 1회 emit하면 무기별 누락이 없다.
      emitDamageNumber({
        x: hitPos.x,
        y: Math.max(0.8, 0.95 * cs),
        z: hitPos.z,
        amount: finalDamage,
        colorHex: criticalHit.isCritical ? DAMAGE_NUMBER_COLORS.critical : DAMAGE_NUMBER_COLORS.enemy,
        isCritical: criticalHit.isCritical,
      })
      queueVisualState('hitFlash', true)
      hitFlashRef.current = true
      requestAnimationFrame(() => { queueVisualState('hitFlash', false); hitFlashRef.current = false })
      if (impact?.sfxId) emitSfx({ id: impact.sfxId, volume: 0.6 })
      const knockback = resolveEnemyHitKnockback(impact)
      if (knockback.speed > 0) {
        const t = hitPos
        const sx = knockback.source?.x ?? playerPos.x
        const sz = knockback.source?.z ?? playerPos.z
        const dx = t.x - sx
        const dz = t.z - sz
        const len = Math.hypot(dx, dz) || 1
        knockbackDir.current.set(dx / len, 0, dz / len)
        knockbackSpeedRef.current = knockback.speed
        knockbackRemainingRef.current = knockback.durationMs
      }
      hpRef.current -= finalDamage
      queueVisualState('hp', hpRef.current)
      if (hpRef.current <= 0) {
        dead.current = true
        cancelExpansionAttack(expansionAttackRef.current)
        if (type === 'B04') {
          b04SoupBlastRef.current = createB04SoupBlastState()
          syncB04SoupBlastVisual(b04SoupBlastRef.current)
        }
        rb.current._enemyDead = true
        rb.current._enemyHit = null
        enemyBodies.delete(id)
        // 죽는 즉시 제거 — useEffect cleanup은 React 커밋 후라서 늦음
        // 蹂???泥섏튂 移댁슫??+ 蹂댁뒪 泥섏튂 利됱떆 ?꾩쟻
        const store = useGameStore.getState()
        store.recordKill()
        emitSfx({ id: deathSfxId(type, isMatilda) })
        // 留덊떥?ㅻ뒗 B01 鍮꾩＜?쇱쓣 ?곗?留??대━??泥섎━?섏? ?딅뒗??
        if (isBossType(type) && !isMatilda) {
          store.recordBossKill(type)
          store.recordBossDefeat(type)
        }
        logKill(type)
        const t = rb.current?.translation()
        // 留됲? ?꾨젰?쇰줈 諛뺤궡 媛뺣룄(??以?媛? 寃곗젙. impact.knockback? 臾닿린 ?먯쿇 ?됰갚(?놁쑝硫?0).
        const intensity = resolveCollapseIntensity({
          killingDamage: finalDamage,
          maxHp: stats.hp,
          knockback: impact.knockback ?? 0,
        })
        onDeath?.(id, {
          pos: t ? [t.x, t.y, t.z] : [...spawnPos],
          xp: stats.xp,
          type,
          visualScale: cs * 0.333,
          intensity,
          styleOverride: impact.deathStyleOverride,
          weaponKey: impact?.weaponKey,
          isMatilda,
          facingY: groupRef.current?.rotation.y ?? 0,
        })
      }
    }
    rb.current._enemyId   = id
    rb.current._enemyType = type
    return () => {
      enemyBodies.delete(id)
    }
  }, [id, onDeath, spawnPos, stats.xp, type, cs, spawnRevealed])

  useFrame((_, delta) => {
    if (!spawnRevealedRef.current) {
      spawnRevealElapsedRef.current = advanceEnemySpawnTimer(spawnRevealElapsedRef.current, delta, phase)
      if (spawnRevealElapsedRef.current >= ENEMY_SPAWN_REVEAL_DELAY_MS) {
        enemyAgeMsRef.current = 0
        queueVisualState('spawnRevealed', true)
      }
      return
    }
    if (!rb.current || dead.current || phase !== 'playing') {
      // 다음에 playing으로 돌아오는 프레임을 '재개 프레임'으로 식별하기 위한 표시.
      if (phase !== 'playing') wasPlayingRef.current = false
      return
    }

    const t = rb.current.translation()
    if (currentStageId === 'stage4' || isExpansionStage(currentStageId)) {
      const { halfX, halfZ } = stageCombatConfig.bounds
      const boundedX = Math.min(halfX - colArgs[0], Math.max(-halfX + colArgs[0], t.x))
      const boundedZ = Math.min(halfZ - colArgs[2], Math.max(-halfZ + colArgs[2], t.z))
      if (boundedX !== t.x || boundedZ !== t.z) {
        rb.current.setTranslation({ x: boundedX, y: t.y, z: boundedZ }, true)
        t.x = boundedX
        t.z = boundedZ
      }
    }
    const applySpecialEnemyVelocity = () => {
      if (currentStageId === 'stage4' || isExpansionStage(currentStageId)) {
        writeSpecialEnemyVelocityWithinStageBounds(stage4BoundedVelocityRef.current, t, _vel, stageCombatConfig.bounds, colArgs, delta)
        _vel.x = stage4BoundedVelocityRef.current.x
        _vel.z = stage4BoundedVelocityRef.current.z
      }
      rb.current.setLinvel(_vel, true)
    }
    _pos.set(t.x, t.y, t.z)
    _dir.copy(playerPos).sub(_pos)
    _dir.y = 0
    const dist = _dir.length()

    // 이 프레임 루프에는 벽시계(performance.now())가 더 이상 없다. 모든 게이트가
    // 게임시간 기준이라 pause가 어떤 구간도 건너뛰지 않는다. 다시 들이지 마라.
    // 재개 첫 프레임만 고정 스텝 한 칸으로 치환하고, 그 외에는 레포 계약 상한(0.5s)까지
    // 실제 delta를 쓴다 — 30fps 미만에서도 공칭 지속(800/2200/1200ms)이 늘어나지 않는다.
    const resumedFrame = !wasPlayingRef.current
    wasPlayingRef.current = true
    const frameDeltaMs = getGameplayFrameDeltaMs(delta, resumedFrame)
    // 나이와 접촉 쿨다운은 어느 분기로 빠지든 똑같이 흘러야 하므로 모든 early return 앞에서 민다.
    enemyAgeMsRef.current += frameDeltaMs
    if (contactDamageCooldownRef.current > 0) contactDamageCooldownRef.current -= frameDeltaMs

    if (isExpansionBoss(type)) {
      const store=useGameStore.getState()
      const state=expansionAttackRef.current ??= createExpansionAttackState(type,id,store.gameKey)
      const a=expansionArgsRef.current
      a.deltaMs=Math.min(delta,1/30)*1000;a.playing=phase==='playing';a.alive=!dead.current;a.gameKey=store.gameKey
      a.x=t.x;a.z=t.z;a.playerX=playerPos.x;a.playerZ=playerPos.z;a.hpRatio=hpRef.current/stats.hp
      const attack=stepExpansionAttack(state,a)
      if(attack.damage>0) damagePlayer(attack.damage)
      const speed=attack.stop?0:stats.speed
      _vel.x=dist>0.001?_dir.x/dist*speed:0;_vel.y=0;_vel.z=dist>0.001?_dir.z/dist*speed:0
      applySpecialEnemyVelocity()
      if(dist>0.001) _applyRotation(groupRef,_dir.x/dist,_dir.z/dist,.22)
      queueVisualState('animPhase',state.enrageRemainingMs>0?'stun':state.snapshot?.phase==='windup'?'warn':'normal')
      if(dist<=stats.contactDist*ENEMY_SIZE_MULTIPLIER && contactDamageCooldownRef.current<=0){damagePlayer(stats.damage);contactDamageCooldownRef.current=500}
      return
    }
    if (knockbackRemainingRef.current > 0) {
      knockbackRemainingRef.current -= frameDeltaMs
      _vel.x = knockbackDir.current.x * knockbackSpeedRef.current
      _vel.y = 0
      _vel.z = knockbackDir.current.z * knockbackSpeedRef.current
      applySpecialEnemyVelocity()
      return
    }

    const elapsedMs = getRuntimeElapsedMs(useGameStore.getState().elapsedMs)
    if (type === 'B02' && currentStageId === 'stage2') {
      const previous = b02BlockadeRef.current
      if (previous.phase !== 'idle') {
        let next = advanceB02CorridorBlockade(previous, delta * 1000)
        const hit = consumeB02CorridorBlockadeHit(next, playerPos.z)
        next = hit.state
        if (hit.damage > 0) damagePlayer(hit.damage)
        b02BlockadeRef.current = next
        syncB02BlockadeVisual(next)
        _vel.x = 0; _vel.y = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        if (dist > 0.0001) _applyRotation(groupRef, _dir.x / dist, _dir.z / dist, 0.22)
        if (next.phase === 'idle') {
          chargeState.current = 'chase'
          queueVisualState('animPhase', 'normal')
        } else {
          queueVisualState('animPhase', next.phase === 'telegraph' ? 'warn' : 'stun')
        }
        return
      }
      const trigger = getB02CorridorBlockadeTrigger({
        hpRatio: hpRef.current / stats.hp,
        chargeState: chargeState.current,
        state: previous,
      })
      if (trigger) {
        const lineZs = getB02CorridorBlockadeLineZs({
          bossZ: t.z,
          halfZ: stageCombatConfig.bounds.halfZ,
        })
        const next = startB02CorridorBlockade(previous, trigger, lineZs)
        logPlaytestEvent('b02-blockade-start', { trigger, hpRatio: hpRef.current / stats.hp, elapsedSec: Math.round(elapsedMs / 100) / 10 })
        b02BlockadeRef.current = next
        syncB02BlockadeVisual(next)
        _vel.x = 0; _vel.y = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        queueVisualState('animPhase', 'warn')
        return
      }
    }
    // 시야 차단 배회는 이 early return보다 뒤에 있는 chefBoss 페이즈 로직과
    // 원거리 발사를 통째로 건너뛴다. B04를 여기 태우면 플레이어가 stage4 중앙
    // 조리대 뒤에 서는 순간 보스가 사격·돌진·페이즈 전환을 전부 멈추고, 플레이어
    // 무기도 같은 장애물에 막혀(weaponTargeting.js) 상호 무피해 교착이 된다.
    // 승리 조건이 240초 생존이라 그 교착은 곧 플레이어 승 — 마틸다와 같은 이유로 면제한다.
    if (type === 'B03' && currentStageId === 'stage3') {
      const previous = b03ShuttleRef.current
      if (previous.phase !== 'idle') {
        let next = advanceB03ShuttleRun(previous, delta * 1000)
        const shuttleX = getB03ShuttleRunX(next)
        const hit = consumeB03ShuttleRunPassHit(next, playerPos.z, playerPos.x, shuttleX)
        next = hit.state
        if (hit.hit) {
          // 비율 피해라 "그 순간" HP를 읽어야 한다. B01 삼각자와 달리 IGNORE_INVULNERABILITY를
          // 쓰지 않고 무적시간을 존중한다 — 왕복 2패스가 연속으로 꽂히면 30%×2 = 51% 손실이라
          // i-frame이 2연타를 걸러주는 쪽이 안전하다.
          const store = useGameStore.getState()
          store.damagePlayer(getB03ShuttleRunPlayerDamage(store.player.hp))
        }
        b03ShuttleRef.current = next
        syncB03ShuttleVisual(next)
        _vel.x = next.phase === 'active' ? (shuttleX - t.x) / Math.max(delta, 0.001) : 0
        _vel.y = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        // 왕복 방향을 실제로 바라보게 돌린다. 이 회전이 없으면 걷기 사이클이 돌아도
        // 보스는 정면을 유지한 채 옆으로 미끄러져 "달리는 느낌이 전혀 나지 않는"
        // 이동이 된다(2026-08-29 사용자 보고). 텔레그래프 1.25초 동안 미리 돌아선다.
        _applyRotation(groupRef, getB03ShuttleRunFacingX(next), 0, 0.25)
        if (next.phase === 'idle') {
          chargeState.current = 'chase'
          queueVisualState('animPhase', 'normal')
        } else if (next.phase === 'telegraph') {
          queueVisualState('animPhase', 'warn')
        } else {
          // 활성 왕복 중에는 평소 이동 애니메이션을 그대로 쓴다(2026-08-29 사용자 지시:
          // "원래 이동하는 애니메이션을 그냥 써라"). 과거의 'run'은 ZombieMesh가 모르는
          // 값이라 전용 포즈를 만들지 못했고, 신규 포즈 추가는 지시 범위 밖이다.
          queueVisualState('animPhase', next.phase === 'active' ? 'normal' : 'stun')
        }
        return
      }
      const trigger = getB03ShuttleRunTrigger({
        hpRatio: hpRef.current / stats.hp, chargeState: chargeState.current, state: previous,
      })
      if (trigger) {
        // 레인 Z는 플레이어가 아니라 "보스의 현재 Z"다. 보스는 _vel.z = 0으로 자기 Z를
        // 그대로 달리므로, 플레이어 Z에 선을 그리면 경고선과 실제 주행선이 어긋난다
        // (피격 판정도 레인 Z와 보스 X를 섞어 쓰기 때문에 같이 어긋났다).
        const { laneZ, startX, endX } = getB03ShuttleRunLaneFromBoss(
          t.x, t.z, stageCombatConfig.bounds.halfX, stageCombatConfig.bounds.halfZ,
        )
        // baseSpeed를 넘겨야 패스 소요시간이 "평소 이동속도 ×3"으로 역산된다(고정 duration 금지).
        const next = startB03ShuttleRun(previous, trigger, { laneZ, startX, endX, baseSpeed: stats.speed })
        logPlaytestEvent('b03-shuttle-start', { trigger, hpRatio: hpRef.current / stats.hp, elapsedSec: Math.round(elapsedMs / 100) / 10 })
        b03ShuttleRef.current = next
        syncB03ShuttleVisual(next)
        _vel.x = 0; _vel.y = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        queueVisualState('animPhase', 'warn')
        return
      }
    }

    if (!isMatilda && !stats.chefBoss && elapsedMs >= nextSightCheckRef.current) {
      sightBlockedRef.current = isStageObjectEnemyTrackingBlocked(t, playerPos, sightObstacles)
      nextSightCheckRef.current = elapsedMs + 90 + (stableEnemyHash(id) % 31)
    }
    if (writeSightBlockedEnemyVelocity(_sightBlockedVelocity, sightBlockedRef.current, id, _dir.x, _dir.z, stats.speed)) {
      _vel.x = _sightBlockedVelocity.x
      _vel.y = 0
      _vel.z = _sightBlockedVelocity.z
      rb.current.setLinvel(_vel, true)
      _applyRotation(groupRef, _vel.x, _vel.z)
      return
    }

    if (type === 'B04' && currentStageId === 'stage4' && stats.chefBoss) {
      const soup = b04SoupBlastRef.current
      if (soup.phase !== 'idle' && soup.phase !== 'done') {
        let next = advanceB04SoupBlast(soup, delta * 1000)
        const hit = consumeB04SoupBlastHit(next, playerPos)
        next = hit.state
        if (hit.damage > 0) damagePlayer(hit.damage)
        b04SoupBlastRef.current = next
        syncB04SoupBlastVisual(next)
        if (soup.phase === 'telegraph' && next.phase === 'explode' && next.circles.length > 0) emitStage4B04Cue(type, 'flaskHit')
        _vel.x = 0; _vel.y = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        queueVisualState('animPhase', 'warn')
        return
      }
      if (chefPhaseRef.current === CHEF_PHASE1 && hpRef.current / stats.hp <= 0.5) {
        if (getB04SoupBlastTrigger({ hpRatio: hpRef.current / stats.hp, state: soup })) {
          const circles = getB04SoupBlastCircles({ player: playerPos, halfX: stageCombatConfig.bounds.halfX, halfZ: stageCombatConfig.bounds.halfZ, obstacles: sightObstacles })
          logPlaytestEvent('b04-soup-blast-start', { circles: circles.length, hpRatio: hpRef.current / stats.hp, elapsedSec: Math.round(elapsedMs / 100) / 10 })
          b04SoupBlastRef.current = startB04SoupBlast(soup, circles)
          syncB04SoupBlastVisual(b04SoupBlastRef.current)
          if (b04SoupBlastRef.current.phase === 'telegraph' && circles.length > 0) emitStage4B04Cue(type, 'zombieChargeRoar')
          _vel.x = 0; _vel.y = 0; _vel.z = 0
          rb.current.setLinvel(_vel, true)
          queueVisualState('animPhase', 'warn')
          return
        }
      }
      if (soup.phase === 'done') {
        const enteringPhase2 = chefPhaseRef.current !== CHEF_PHASE2
        chefPhaseRef.current = CHEF_PHASE2
        setIsChefPhase2(true)
        queueVisualState('animPhase', 'normal')
        if (enteringPhase2) emitStage4B04Cue(type, 'bossRoar')
      }
    }

    // B04 주방장 2페이즈: HP>50% 포격(phase1) → 텔레그래프 → HP<=50% 격노 돌진(phase2).
    // 페이즈 판정은 순수 모듈(lib/chefBossPhase.js). active = 페이즈별 실효 스탯.
    // 다른 적은 chefBoss가 아니라 active === stats (동일 참조) → 기존 거동 완전 불변.
    let active = stats
    if (stats.chefBoss) {
      const hpRatio = hpRef.current / stats.hp
      const prevState = chefPhaseRef.current
      const chefArgs = chefPhaseArgsRef.current
      chefArgs.hpRatio = hpRatio
      // 격노 윈드업 1000ms도 벽시계였다 — 윈드업 도중 멈추면 재개 즉시 격노로 넘어갔다.
      if (prevState === CHEF_TELEGRAPH) chefTelegraphElapsedRef.current += frameDeltaMs
      chefArgs.telegraphElapsedMs = chefTelegraphElapsedRef.current
      const nextState = advanceChefBossPhase(prevState, chefArgs)
      if (prevState !== CHEF_TELEGRAPH && nextState === CHEF_TELEGRAPH) {
        // 격노 전환 진입: 텔레그래프 타이머 시작 + 차저 상태 초기화 + 붉은 격노 신호 점등
        chefTelegraphElapsedRef.current = 0
        chargeState.current = 'chase'
        queueVisualState('animPhase', 'warn')
        if (!hitFlashRef.current) { queueVisualState('hitFlash', true); hitFlashRef.current = true }
      }
      if (prevState === CHEF_TELEGRAPH && nextState === CHEF_PHASE2) {
        // 텔레그래프 종료 → 돌진 개시: 격노 신호 소등 + 차저 포즈 초기화
        if (hitFlashRef.current) { queueVisualState('hitFlash', false); hitFlashRef.current = false }
        chargeState.current = 'chase'
        setIsChefPhase2(true)
        queueVisualState('animPhase', 'normal')
      }
      chefPhaseRef.current = nextState
      active = nextState === CHEF_PHASE2 ? chefActiveStats.phase2 : chefActiveStats.phase1
      if (nextState === CHEF_TELEGRAPH) {
        // 텔레그래프 동안: 이동 정지 + 플레이어 응시 + 붉은 tint 유지(발사·돌진 없음)
        _vel.x = 0; _vel.y = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        if (dist > 0.0001) _applyRotation(groupRef, _dir.x / dist, _dir.z / dist, 0.25)
        if (!hitFlashRef.current) { queueVisualState('hitFlash', true); hitFlashRef.current = true }
        return
      }
    }


    // ?? E04: ?먭굅由?媛먯뿼泥??????????????????????????????????????????????????
    if (active.ranged) {
      // 발사 게이트는 벽시계 대신 게임시간 나이(enemyAgeMsRef)를 단일 시계로 쓴다.
      // ?먰븯??嫄곕━ ?좎?: ?덈Т 媛源뚯슦硫??꾪눜, ?덈Т 硫硫??꾩쭊
      _vel.y = 0
      writeRangedEnemyVelocity(_vel, _dir.x, _dir.z, dist, active.minDist, active.preferDist, active.speed, Number(id) % 2 === 0 ? 1 : -1)
      applySpecialEnemyVelocity()
      if (_dir.length() > 0) _applyRotation(groupRef, _dir.x / _dir.length(), _dir.z / _dir.length())

      const elapsedSec = getRuntimeElapsedMs(useGameStore.getState().elapsedMs) / 1000
      // E04 인트로는 일반 스폰 시계를 유지한다. 보스 구간 차단만 실제 game clock을 사용한다.
      const e04GateSec = elapsedSec + getSpawnCatchUpOffsetSec()
      // stage4는 원거리 "안전지대 소멸"이 시그니처라 보스 구간에도 E04 발사를 유지한다(bossPressure 미적용).
      // 스2/스3의 보스 구간 발사 차단은 그대로.
      const fireArgs = e04FireArgsRef.current
      fireArgs.elapsedSec = e04GateSec
      fireArgs.ageMs = enemyAgeMsRef.current
      fireArgs.activeProjectileCount = enemyProjectilePool.activeCount
      fireArgs.distanceToPlayer = dist
      fireArgs.lastFireElapsedMs = lastFireRef.current
      fireArgs.nowMs = enemyAgeMsRef.current
      fireArgs.cooldownMs = active.rangedCooldown
      fireArgs.introSec = stageCombatConfig.e04IntroSec
      fireArgs.bossPressure = currentStageId === 'stage4' ? false : (elapsedSec >= stageCombatConfig.bossPressureStartSec && elapsedSec < stageCombatConfig.bossPressureEndSec)
      const canFire = (currentStageId === 'stage2' || currentStageId === 'stage3' || currentStageId === 'stage4') && canE04FireProjectile(fireArgs)

      // ?ъ궗泥?諛쒖궗
      if (canFire) {
        lastFireRef.current = enemyAgeMsRef.current
        _fireDir.copy(_dir).normalize()
        // B04도 E04와 같은 fixed pool을 사용한다. 속도만 실효 스탯으로 전달한다.
        // kind는 비주얼 채널이다. B04만 당근·양파·감자·식칼을 순환시키고,
        // E04는 기본 구체(ENEMY_PROJECTILE_KIND_SPHERE)를 그대로 유지한다.
        const projectileKind = stats.chefBoss
          ? chefIngredientKindAt(chefProjectileKindRef.current++)
          : ENEMY_PROJECTILE_KIND_SPHERE
        enemyProjectilePool.spawnInto(enemyHandleScratch, _pos.x, _pos.y, _pos.z,
          _fireDir.x, _fireDir.z, active.rangedDmg, active.rangedSpeed, projectileKind)
      }
      return
    }

    // ?? E05 / B01 ?뚯쭊 ?곹깭 癒몄떊 ???????????????????????????????????????????
    if (active.charger) {
      // 상태 경과는 게임시간으로만 쌓는다. pause 중에는 위 `phase !== 'playing'`에서
      // return하므로 한 ms도 누적되지 않고, 재개 뒤 남은 예고가 그대로 이어진다.
      chargeStateElapsedRef.current += frameDeltaMs

      _vel.y = 0
      if (isMatilda) {
        const contactArgs = matildaContactArgsRef.current
        contactArgs.enemyX = t.x
        contactArgs.enemyZ = t.z
        contactArgs.yaw = groupRef.current ? groupRef.current.rotation.y : 0
        contactArgs.playerX = playerPos.x
        contactArgs.playerZ = playerPos.z
        contactArgs.halfX = matildaHalfExtents.halfX
        contactArgs.halfZ = matildaHalfExtents.halfZ
        const matildaBodyContact = isMatildaBodyContact(contactArgs)
        if (advanceMatildaContactKillCountdown(matildaContactKillCountdownRef.current, matildaBodyContact, delta * 1000)) {
          killPlayer('matilda')
        }

        if (chargeState.current === 'matildaAim') {
          if (dist > 0.0001) {
            chargeDir.current.copy(_dir).normalize()
          } else {
            chargeDir.current.set(-t.x, 0, -t.z).normalize()
          }
          matildaPreviousChargePosRef.current.x = t.x
          matildaPreviousChargePosRef.current.z = t.z
          matildaChargeStallMsRef.current = 0
          matildaDashCountRef.current += 1
          chargeState.current = 'charge'
          queueVisualState('animPhase', 'charge')
          _applyRotation(groupRef, chargeDir.current.x, chargeDir.current.z, 1)
          emitSfx(MATILDA_DASH_SFX)
        } else if (chargeState.current === 'charge') {
          const cd = chargeDir.current
          const previous = matildaPreviousChargePosRef.current
          const movedAlong = (t.x - previous.x) * cd.x + (t.z - previous.z) * cd.z
          const dashSpeed = getMatildaDashSpeed(stats.chargeSpeed, matildaDashCountRef.current)
          const expectedMove = dashSpeed * delta
          const hitDistance = getChargeHitDistance(stats, true)
          const blockedFrame = isMatildaChargeBlockedValues(movedAlong, expectedMove, dist, hitDistance)
          matildaChargeStallMsRef.current = blockedFrame
            ? matildaChargeStallMsRef.current + delta * 1000
            : 0
          if (shouldReverseMatildaChargeOnObstacleValues(movedAlong, expectedMove, dist, hitDistance, matildaChargeStallMsRef.current)) {
            cd.multiplyScalar(-1)
            matildaChargeStallMsRef.current = 0
            emitSfx(MATILDA_DASH_REVERSE_SFX)
          }
          previous.x = t.x
          previous.z = t.z
          _vel.x = cd.x * dashSpeed
          _vel.z = cd.z * dashSpeed
          applySpecialEnemyVelocity()
          _applyRotation(groupRef, cd.x, cd.z, 1)

          if (isMatildaChargingOutward(t, cd, stageCombatConfig.bounds)) {
            chargeState.current = 'matildaLaugh'
            matildaLaughRemainingRef.current = MATILDA_LAUGH_DURATION_MS
            matildaChargeStallMsRef.current = 0
            queueVisualState('animPhase', 'stun')
            _vel.x = 0
            _vel.z = 0
            rb.current.setLinvel(_vel, true)
            emitSfx(MATILDA_LAUGH_SFX)
          }
        } else if (chargeState.current === 'matildaLaugh') {
          _vel.x = 0
          _vel.z = 0
          rb.current.setLinvel(_vel, true)
          if (dist > 0.0001) _applyRotation(groupRef, _dir.x / dist, _dir.z / dist, 0.22)
          if (matildaLaughCuePendingRef.current) {
            matildaLaughCuePendingRef.current = false
            emitSfx(MATILDA_LAUGH_SFX)
          }
          matildaLaughRemainingRef.current -= frameDeltaMs
          if (matildaLaughRemainingRef.current <= 0) {
            chargeState.current = 'matildaAim'
          }
        }
        return
      }

      if (chargeState.current === 'chase') {
        // ?쇰컲 異붽꺽
        _dir.normalize()
        _vel.x = _dir.x * stats.speed; _vel.z = _dir.z * stats.speed
        applySpecialEnemyVelocity()
        _applyRotation(groupRef, _dir.x, _dir.z)

        if (dist < active.warnDist) {
          chargeState.current = 'warn'
          chargeStateElapsedRef.current = 0
          chargeDir.current.copy(_dir)
          _applyRotation(groupRef, chargeDir.current.x, chargeDir.current.z, 0.75)
          queueVisualState('animPhase', 'warn')
          _vel.x = 0; _vel.z = 0
          rb.current.setLinvel(_vel, true)
        }

      } else if (chargeState.current === 'warn') {
        _applyRotation(groupRef, chargeDir.current.x, chargeDir.current.z, 0.45)
        if (chargeStateElapsedRef.current >= active.warnDuration) {
          chargeState.current = 'charge'
          chargeStateElapsedRef.current = 0
          queueVisualState('animPhase', 'charge')
          chargeDir.current.normalize()
          _applyRotation(groupRef, chargeDir.current.x, chargeDir.current.z, 1)
        }

      } else if (chargeState.current === 'charge') {
        const cd = chargeDir.current
        _vel.x = cd.x * active.chargeSpeed; _vel.z = cd.z * active.chargeSpeed
        applySpecialEnemyVelocity()
        _applyRotation(groupRef, cd.x, cd.z, 1)

        // isMatilda는 이 지점에 도달할 때 항상 false다(위 isMatilda 분기가 851행에서 return하므로) —
        // 그래도 브리프대로 안전하게 분기해 마틸다 경로가 재구성되어도 박스 판정을 쓰게 한다.
        let hitPlayer
        if (isMatilda) {
          const contactArgs = matildaContactArgsRef.current
          contactArgs.enemyX = t.x
          contactArgs.enemyZ = t.z
          contactArgs.yaw = groupRef.current ? groupRef.current.rotation.y : 0
          contactArgs.playerX = playerPos.x
          contactArgs.playerZ = playerPos.z
          contactArgs.halfX = matildaHalfExtents.halfX
          contactArgs.halfZ = matildaHalfExtents.halfZ
          hitPlayer = isMatildaBodyContact(contactArgs)
        } else {
          hitPlayer = dist < getChargeHitDistance(stats, false)
        }
        const chargeExpired = chargeStateElapsedRef.current > (active.chargeDuration ?? 1200)
        if (hitPlayer || chargeExpired) {
          if (hitPlayer) damagePlayer(stats.damage)
          chargeState.current = stats.mathTeacherSpecial ? 'mathSwingWindup' : 'stun'
          chargeStateElapsedRef.current = 0
          queueVisualState('animPhase', stats.mathTeacherSpecial ? 'special' : 'stun')
          if (stats.mathTeacherSpecial) {
            const log = mathStartLogRef.current
            log.bossId = id
            log.trigger = hitPlayer ? 'charge-hit' : 'charge-timeout'
            logPlaytestEvent('b01-math-special-start', log)
          }
          _vel.x = 0; _vel.z = 0
          rb.current.setLinvel(_vel, true)
        }

      } else if (chargeState.current === 'mathSwingWindup') {
        _vel.x = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        // 돌진했던 전방(chargeDir)을 그대로 바라본 채 휘두른다. 플레이어 재조준 금지 —
        // 등 뒤로 돌아 들어온 플레이어를 따라 돌면 부채꼴 안전지대가 사라진다.
        _applyRotation(groupRef, chargeDir.current.x, chargeDir.current.z, 1)
        if (chargeStateElapsedRef.current >= MATH_TEACHER_SWING_WINDUP_MS) {
          // 히트박스는 실제 렌더 yaw를 쓴다(비주얼과 어긋나면 안 된다). 그룹이 아직 없으면 돌진 방향으로 폴백.
          const swingYaw = groupRef.current
            ? groupRef.current.rotation.y
            : Math.atan2(chargeDir.current.x, chargeDir.current.z)
          const swingArgs = mathSwingArgsRef.current
          swingArgs.bossId = id
          swingArgs.origin.x = t.x
          swingArgs.origin.z = t.z
          swingArgs.yaw = swingYaw
          const pushedZombies = applyMathTeacherSwing(swingArgs)
          let playerDamage = 0
          const arcArgs = mathSwingArcArgsRef.current
          arcArgs.yaw = swingYaw
          arcArgs.originX = t.x
          arcArgs.originZ = t.z
          arcArgs.targetX = playerPos.x
          arcArgs.targetZ = playerPos.z
          arcArgs.radius = MATH_TEACHER_SWING_RADIUS
          if (isInMathTeacherSwingArc(arcArgs)) {
            const store = useGameStore.getState()
            playerDamage = getMathTeacherPlayerDamage(store.player.hp)
            store.damagePlayer(playerDamage, IGNORE_INVULNERABILITY)
          }
          const log = mathImpactLogRef.current
          log.bossId = id
          log.pushedZombies = pushedZombies
          log.playerHit = playerDamage > 0
          log.playerDamage = playerDamage
          log.playerHpAfter = useGameStore.getState().player.hp
          logPlaytestEvent('b01-math-special-impact', log)
          chargeState.current = 'mathSwingRecover'
          chargeStateElapsedRef.current = 0
        }

      } else if (chargeState.current === 'mathSwingRecover') {
        _vel.x = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        if (chargeStateElapsedRef.current >= MATH_TEACHER_SWING_RECOVERY_MS) {
          chargeState.current = 'stun'
          chargeStateElapsedRef.current = 0
          queueVisualState('animPhase', 'stun')
          const log = mathEndLogRef.current
          log.bossId = id
          logPlaytestEvent('b01-math-special-end', log)
        }

      } else if (chargeState.current === 'stun') {
        _vel.x = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        if (dist > 0.0001) _applyRotation(groupRef, _dir.x / dist, _dir.z / dist, 0.22)
        if (chargeStateElapsedRef.current >= active.stunDuration) {
          chargeState.current = 'chase'
          queueVisualState('animPhase', 'normal')
        }
      }
      return
    }

    // ?? 湲곕낯 異붽꺽 (E01, E02, E03, E06) ????????????????????????????????????
    _vel.y = 0
    if (dist < stats.contactDist * ENEMY_SIZE_MULTIPLIER) {
      if (contactDamageCooldownRef.current <= 0) {
        contactDamageCooldownRef.current = 500
        damagePlayer(stats.damage)
      }
      _vel.x = 0; _vel.z = 0
      rb.current.setLinvel(_vel, true)
    } else {
      _dir.normalize()
      _vel.x = _dir.x * stats.speed; _vel.z = _dir.z * stats.speed
      rb.current.setLinvel(_vel, true)
      _applyRotation(groupRef, _dir.x, _dir.z)
    }


  })

  if (dead.current) return null

  return (
    <>
      <SpawnSmokeEffect position={spawnPos} visualScale={cs * 0.333} />
      {spawnRevealed && (
        <RigidBody
          ref={rb}
          type="dynamic"
          position={spawnPos}
          lockRotations
          linearDamping={8}
          colliders={false}
        >
          <CuboidCollider args={colArgs} sensor={isMatilda} />
          <EnemyVisual groupRef={groupRef} type={type} animPhase={animPhase} hitFlash={hitFlash} hp={hp} isMatilda={isMatilda} scale={stats.scale} isChefPhase2={isChefPhase2} />
        </RigidBody>
      )}
      {type === 'B02' && currentStageId === 'stage2' && (
        <B02CorridorBlockadeVisual
          phase={b02BlockadeVisual.phase}
          lineZs={b02BlockadeVisual.lineZs}
          halfX={stageCombatConfig.bounds.halfX}
        />
      )}
      {type === 'B03' && currentStageId === 'stage3' && (
        <B03ShuttleRunVisual
          phase={b03ShuttleVisual.phase}
          passIndex={b03ShuttleVisual.passIndex}
          laneZ={b03ShuttleVisual.laneZ}
          startX={b03ShuttleVisual.startX}
          endX={b03ShuttleVisual.endX}
        />
      )}
      {type === 'B04' && currentStageId === 'stage4' && (
        <B04SoupBlastVisual
          phase={b04SoupBlastVisual.phase}
          circles={b04SoupBlastVisual.circles}
        />
      )}

    </>
  )
}
