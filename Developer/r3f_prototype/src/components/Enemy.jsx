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
  getB03ShuttleRunLaneZ,
  getB03ShuttleRunX,
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
import { getStageObjectSightObstacles, isStageObjectEnemyTrackingBlocked } from './StageObjects/stageObjectColliders.js'
import { isPlayerWeaponSightBlocked } from '../lib/weaponTargeting.js'
import ZombieMesh from './ZombieMesh.jsx'
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
const PLAYER_CONTACT_HALF_EXTENT = 0.136
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
  return Math.abs(localX) <= halfX + PLAYER_CONTACT_HALF_EXTENT
    && Math.abs(localZ) <= halfZ + PLAYER_CONTACT_HALF_EXTENT
}

// XP 媛믪? 援먭낵??30% ?쒕엻瑜좎쓣 蹂댁젙????3.3諛곕줈 梨낆젙 (Planner/B.寃뚯엫湲고쉷,諛몃윴??援ы쁽/B-1 罹먮┃???깆옣,?λ젰移??낃렇?덉씠??援ъ“ 援ы쁽/Rewards_Drops/dual_drop_system_2026-05-08.md 짠7-2).
// 이동속도 전 타입 ×1.1 (2026-08-13 사용자 지시 "폰에서 템포가 느리다 / 기본 좀비 이속이 너무 느리다"):
// 잡몹·러너·원거리·차저·런크루·보스까지 예외 없이 chase speed만 정확히 1.1배로 올린다.
// 반올림 규칙: 곱한 뒤 반올림하지 않는다 — 기존 값이 전부 소수 3자리 이하라 ×1.1이 소수 4자리에서
// 딱 떨어진다(예: 0.475→0.5225, 2.18→2.398). 임의 반올림은 E07=E01×2 불변식을 깨므로 금지.
// 돌진(chargeSpeed)·투사체(rangedSpeed)는 이동속도가 아니라 별도 스킬 파라미터라 대상이 아니다.
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
  // B01 1?ㅽ뀒?댁?: 遺梨꾧섦 ?ъ궗泥??⑦꽩 ?쒓굅. 異붽꺽/?뚯쭊留??ъ슜 (Bang_Rules 2026-05-09 遺濡?.
  // contactDist 0.36: regular charge keeps the 1.5x grace distance; Matilda charge uses exact body contact only.
  // ?댁쟾 0.80? ?묒큺 諛섍꼍??~1.6?대씪 蹂몄껜 ?명삎蹂대떎 ?⑥뵮 而ㅼ꽌 "???우븘???쇨꺽"?섎뒗 臾몄젣媛 ?덉뿀??
  B01: { hp: 1150, speed: 0.5225, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         charger: true, mathTeacherSpecial: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
  B02: { hp: 1150, speed: 0.5225, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
  B03: { hp: 1150, speed: 0.5225, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
  // B04 주방장: 단일 2페이즈 보스. Phase1(HP100~50%)=원거리 포격, Phase2(HP<=50%)=격노 돌진.
  // hp 1500: 더블보스 합(B02+B03=2300)의 절반보다 두툼하게. 페이즈 전환/텔레그래프는 lib/chefBossPhase.js.
  // chefPhase1: E04(cooldown2200/dmg8/speed1.9)보다 느리고 굵은 포격. 맵 halfX 12라 preferDist 5.0.
  // chefPhase2: B02/B03과 동일 차저 계열. mathTeacherSpecial 없음(→ 돌진 후 stun).
  B04: { hp: 1500, speed: 0.5225, damage: 22, scale: 2.00, xp: 0,  contactDist: 0.36,
         chefBoss: true,
         chefPhase1: { ranged: true, rangedCooldown: 2600, rangedDmg: 14, rangedSpeed: 1.6, preferDist: 5.0, minDist: 3.0 },
         chefPhase2: { charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 } },
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
  future: Object.freeze({ surface: '#168895', surfaceOpacity: 0.38, outline: '#063b46', outlineOpacity: 0.7, shadow: '#021923', shadowOpacity: 0.26 }),
})

export function getB02CorridorBlockadeLineVisualState({ phase, index, activeLineIndex }) {
  if (phase === 'telegraph') return 'telegraph'
  if (phase !== 'active') return 'completed'
  if (index < activeLineIndex) return 'completed'
  return index === activeLineIndex ? 'active' : 'future'
}

export function shouldRenderB02CorridorBlockadeVisual({ phase, lineZs }) {
  return (phase === 'telegraph' || phase === 'active') && lineZs.length > 0
}

export function B02CorridorBlockadeVisual({ phase, lineZs, activeLineIndex, halfX }) {
  if (!shouldRenderB02CorridorBlockadeVisual({ phase, lineZs })) return null
  return (
    <group aria-label="B02 복도 봉쇄선">
      {lineZs.map((z, index) => {
        const visualState = getB02CorridorBlockadeLineVisualState({ phase, index, activeLineIndex })
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

export function B04SoupBlastVisual({ phase, circles }) {
  if ((phase !== 'telegraph' && phase !== 'explode') || circles.length === 0) return null
  const visualState = getB04SoupBlastVisualState(phase)
  const visual = B04_SOUP_BLAST_VISUALS[visualState]
  return (
    <group aria-label="B04 국물 대폭발 원형 표식" userData={{ soupBlastState: visualState }}>
      {circles.map((circle, index) => (
        <group key={`${index}:${circle.x}:${circle.z}`} position={[circle.x, 0, circle.z]}>
          <mesh position={[0, 0.022, 0]}>
            <cylinderGeometry args={[circle.radius + 0.18, circle.radius + 0.18, 0.028, 32]} />
            <meshBasicMaterial color={visual.outline} transparent opacity={visual.outlineOpacity} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.047, 0]}>
            <cylinderGeometry args={[circle.radius, circle.radius, 0.024, 32]} />
            <meshBasicMaterial color={visual.surface} transparent opacity={visual.surfaceOpacity} depthWrite={false} toneMapped={false} />
          </mesh>
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

export function hasB03ShuttleRunVisualChanged(previous, state) {
  return previous.phase !== state.phase || previous.laneZ !== state.laneZ || previous.passIndex !== state.passIndex
}

function B03ShuttleRunVisual({ phase, passIndex, laneZ, halfX }) {
  if (phase === 'idle') return null
  const visualState = getB03ShuttleRunVisualState({ phase, passIndex })
  const visual = B03_SHUTTLE_RUN_VISUALS[visualState]
  return (
    <group aria-label="B03 왕복 오래달리기 레인" userData={{ shuttleRunState: visualState }}>
      <mesh position={[0, 0.024, laneZ]}>
        <boxGeometry args={[halfX * 2, 0.028, B03_SHUTTLE_LANE_WIDTH + 0.18]} />
        <meshBasicMaterial color={visual.outline} transparent opacity={visual.outlineOpacity} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.047, laneZ]}>
        <boxGeometry args={[halfX * 2, 0.024, B03_SHUTTLE_LANE_WIDTH]} />
        <meshBasicMaterial color={visual.surface} transparent opacity={visual.surfaceOpacity} depthWrite={false} toneMapped={false} />
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
  // 흰 구 6개만 겹치면 하나의 납작한 흰 덩어리로 뭉개진다 — 스튜디오에서 빌보드와 나란히
  // 놓고 확인했다(2026-08-20). 형태는 구마다 두르는 외곽선으로 낸다. MeshToonMaterial도
  // 시도했지만 라이팅에 의존해 조명이 약한 씬(스튜디오 프리뷰)에서 시커멓게 죽는다 —
  // 연기는 어디서 재생되든 밝아야 하므로 라이팅과 무관한 Basic + 외곽선으로 간다.
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    toneMapped: false,
  }), [])
  // outlineMat이 아니라 평범한 BackSide 헐이다. outlineMat은 스텐실로 부품 사이 seam을
  // 지워 바깥 실루엣만 남기는데, 구름은 그 반대가 필요하다 — 구마다 자기 외곽선이 보여야
  // 뭉게뭉게한 덩어리로 읽힌다. 스텐실을 켜면 6개가 다시 매끈한 흰 덩어리 하나가 된다.
  const outline = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x2a2320,
    side: THREE.BackSide,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    toneMapped: false,
  }), [])
  useEffect(() => () => { material.dispose(); outline.dispose() }, [material, outline])

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
    outline.opacity = opacity
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
            <mesh
              geometry={BIG_SPAWN_PUFF_GEOMETRY}
              material={outline}
              renderOrder={99}
              scale={inflateScale(1.06)}
              userData={{ studioRenderOutline: true }}
            />
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
  const dead                  = useRef(false)
  const knockbackUntilRef     = useRef(0)
  const knockbackDir          = useRef(new THREE.Vector3())
  const knockbackSpeedRef     = useRef(3.8)
  const lastContactDmgRef     = useRef(0)
  const spawnedAtRef          = useRef(performance.now())
  const spawnRevealElapsedRef = useRef(0)
  // 프레임마다 재사용하는 스크래치 객체 — 마틸다 박스 접촉 판정 입력용(RULE-0.2: 매 프레임 객체 생성 금지)
  const matildaContactArgsRef = useRef({ enemyX: 0, enemyZ: 0, yaw: 0, playerX: 0, playerZ: 0, halfX: 0, halfZ: 0 })
  const matildaContactKillCountdownRef = useRef(createMatildaContactKillCountdown())

  // E05 / B01 ?뚯쭊 ?곹깭 癒몄떊
  const chargeState  = useRef(isMatilda ? 'matildaAim' : 'chase')
  const stateTimer   = useRef(0)
  const b02BlockadeRef = useRef(createB02CorridorBlockadeState())
  const b03ShuttleRef = useRef(createB03ShuttleRunState())
  const b04SoupBlastRef = useRef(createB04SoupBlastState())
  const matildaLaughRemainingRef = useRef(0)
  const matildaLaughCuePendingRef = useRef(false)
  const matildaChargeStallMsRef = useRef(0)
  const matildaPreviousChargePosRef = useRef({ x: spawnPos[0], z: spawnPos[2] })
  const chargeDir    = useRef(new THREE.Vector3())

  // B04 주방장 2페이즈 상태
  const chefPhaseRef = useRef(CHEF_PHASE1)
  const chefTelegraphStartRef = useRef(0)

  // E04/B04 projectile state is the shared fixed projectile pool; no React array is mounted.
  const lastFireRef = useRef(0)
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
        && previous.activeLineIndex === state.activeLineIndex
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
    spawnedAtRef.current = performance.now()
    chargeState.current = isMatilda ? 'matildaLaugh' : 'chase'
    matildaLaughRemainingRef.current = isMatilda ? MATILDA_LAUGH_DURATION_MS : 0
    matildaLaughCuePendingRef.current = isMatilda
    matildaChargeStallMsRef.current = 0
    matildaContactKillCountdownRef.current = createMatildaContactKillCountdown()
    matildaPreviousChargePosRef.current.x = spawnPos[0]
    matildaPreviousChargePosRef.current.z = spawnPos[2]
    chefPhaseRef.current = CHEF_PHASE1
    setIsChefPhase2(false)
    chefTelegraphStartRef.current = 0
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
        knockbackUntilRef.current = performance.now() + knockback.durationMs
        rb.current.setLinvel({
          x: knockbackDir.current.x * knockback.speed,
          y: 0,
          z: knockbackDir.current.z * knockback.speed,
        }, true)
      }
      hpRef.current -= finalDamage
      queueVisualState('hp', hpRef.current)
      if (hpRef.current <= 0) {
        dead.current = true
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
          store.recordBossDefeat()
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
        spawnedAtRef.current = performance.now()
        queueVisualState('spawnRevealed', true)
      }
      return
    }
    if (!rb.current || dead.current || phase !== 'playing') return

    const t = rb.current.translation()
    _pos.set(t.x, t.y, t.z)
    _dir.copy(playerPos).sub(_pos)
    _dir.y = 0
    const dist = _dir.length()

    // Update visual registry immediately — before any early return (knockback/ranged/charger)
    const now = performance.now()

    if (now < knockbackUntilRef.current) {
      _vel.x = knockbackDir.current.x * knockbackSpeedRef.current
      _vel.y = 0
      _vel.z = knockbackDir.current.z * knockbackSpeedRef.current
      rb.current.setLinvel(_vel, true)
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
        elapsedMs,
        chargeState: chargeState.current,
        state: previous,
      })
      if (trigger) {
        const lineZs = getB02CorridorBlockadeLineZs({
          bossZ: t.z,
          playerZ: playerPos.z,
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
        if (hit.damage > 0) damagePlayer(hit.damage)
        b03ShuttleRef.current = next
        syncB03ShuttleVisual(next)
        _vel.x = next.phase === 'active' ? (shuttleX - t.x) / Math.max(delta, 0.001) : 0
        _vel.y = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        if (next.phase === 'idle') {
          chargeState.current = 'chase'
          queueVisualState('animPhase', 'normal')
        } else {
          queueVisualState('animPhase', next.phase === 'telegraph' ? 'warn' : 'stun')
        }
        return
      }
      const trigger = getB03ShuttleRunTrigger({
        hpRatio: hpRef.current / stats.hp, elapsedMs, chargeState: chargeState.current, state: previous,
      })
      if (trigger) {
        const halfX = stageCombatConfig.bounds.halfX
        const laneZ = getB03ShuttleRunLaneZ(playerPos.z, stageCombatConfig.bounds.halfZ)
        const edgeInset = 0.9
        const startX = t.x <= 0 ? -halfX + edgeInset : halfX - edgeInset
        const endX = -startX
        const next = startB03ShuttleRun(previous, trigger, { laneZ, startX, endX })
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
        _vel.x = 0; _vel.y = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        queueVisualState('animPhase', 'warn')
        return
      }
      if (chefPhaseRef.current === CHEF_PHASE1 && hpRef.current / stats.hp <= 0.5) {
        if (getB04SoupBlastTrigger({ hpRatio: hpRef.current / stats.hp, elapsedMs, state: soup })) {
          const circles = getB04SoupBlastCircles({ player: playerPos, halfX: stageCombatConfig.bounds.halfX, halfZ: stageCombatConfig.bounds.halfZ, obstacles: sightObstacles })
          logPlaytestEvent('b04-soup-blast-start', { circles: circles.length, hpRatio: hpRef.current / stats.hp, elapsedSec: Math.round(elapsedMs / 100) / 10 })
          b04SoupBlastRef.current = startB04SoupBlast(soup, circles)
          syncB04SoupBlastVisual(b04SoupBlastRef.current)
          _vel.x = 0; _vel.y = 0; _vel.z = 0
          rb.current.setLinvel(_vel, true)
          queueVisualState('animPhase', 'warn')
          return
        }
        if (elapsedMs >= 200_000) {
          chefPhaseRef.current = CHEF_PHASE2
          setIsChefPhase2(true)
          queueVisualState('animPhase', 'normal')
        }
      }
      if (soup.phase === 'done') {
        chefPhaseRef.current = CHEF_PHASE2
        setIsChefPhase2(true)
        queueVisualState('animPhase', 'normal')
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
      chefArgs.telegraphElapsedMs = now - chefTelegraphStartRef.current
      const nextState = advanceChefBossPhase(prevState, chefArgs)
      if (prevState !== CHEF_TELEGRAPH && nextState === CHEF_TELEGRAPH) {
        // 격노 전환 진입: 텔레그래프 타이머 시작 + 차저 상태 초기화 + 붉은 격노 신호 점등
        chefTelegraphStartRef.current = now
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
      const now = performance.now()
      // ?먰븯??嫄곕━ ?좎?: ?덈Т 媛源뚯슦硫??꾪눜, ?덈Т 硫硫??꾩쭊
      _vel.y = 0
      writeRangedEnemyVelocity(_vel, _dir.x, _dir.z, dist, active.minDist, active.preferDist, active.speed, Number(id) % 2 === 0 ? 1 : -1)
      rb.current.setLinvel(_vel, true)
      if (_dir.length() > 0) _applyRotation(groupRef, _dir.x / _dir.length(), _dir.z / _dir.length())

      const elapsedSec = getRuntimeElapsedMs(useGameStore.getState().elapsedMs) / 1000
      // 발사 하한과 bossPressure는 같은 시계여야 한다 — 풀 경로(enemySimulation.isE04FireAllowed)와
      // 동일한 규약으로 둘 다 스폰 시계를 본다. 캐치업이 보스를 앞당겼을 때 두 게이트가 갈리면
      // 발사 창 [introSec, bossSec)이 공집합이 되어 E04가 한 발도 못 쏜다.
      const e04GateSec = elapsedSec + getSpawnCatchUpOffsetSec()
      // stage4는 원거리 "안전지대 소멸"이 시그니처라 보스 구간에도 E04 발사를 유지한다(bossPressure 미적용).
      // 스2/스3의 보스 구간 발사 차단은 그대로.
      const fireArgs = e04FireArgsRef.current
      fireArgs.elapsedSec = e04GateSec
      fireArgs.ageMs = now - spawnedAtRef.current
      fireArgs.activeProjectileCount = enemyProjectilePool.activeCount
      fireArgs.distanceToPlayer = dist
      fireArgs.lastFireElapsedMs = lastFireRef.current
      fireArgs.nowMs = now
      fireArgs.cooldownMs = active.rangedCooldown
      fireArgs.introSec = stageCombatConfig.e04IntroSec
      fireArgs.bossPressure = currentStageId === 'stage4' ? false : (e04GateSec >= stageCombatConfig.bossPressureStartSec && elapsedSec < stageCombatConfig.bossPressureEndSec)
      const canFire = (currentStageId === 'stage2' || currentStageId === 'stage3' || currentStageId === 'stage4') && canE04FireProjectile(fireArgs)

      // ?ъ궗泥?諛쒖궗
      if (canFire) {
        lastFireRef.current = now
        _fireDir.copy(_dir).normalize()
        // B04도 E04와 같은 fixed pool을 사용한다. 속도만 실효 스탯으로 전달한다.
        enemyProjectilePool.spawnInto(enemyHandleScratch, _pos.x, _pos.y, _pos.z,
          _fireDir.x, _fireDir.z, active.rangedDmg, active.rangedSpeed)
      }
      return
    }

    // ?? E05 / B01 ?뚯쭊 ?곹깭 癒몄떊 ???????????????????????????????????????????
    if (active.charger) {
      const now = performance.now()

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
          chargeState.current = 'charge'
          queueVisualState('animPhase', 'charge')
          _applyRotation(groupRef, chargeDir.current.x, chargeDir.current.z, 1)
          emitSfx(MATILDA_DASH_SFX)
        } else if (chargeState.current === 'charge') {
          const cd = chargeDir.current
          const previous = matildaPreviousChargePosRef.current
          const movedAlong = (t.x - previous.x) * cd.x + (t.z - previous.z) * cd.z
          const expectedMove = stats.chargeSpeed * delta
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
          _vel.x = cd.x * stats.chargeSpeed
          _vel.z = cd.z * stats.chargeSpeed
          rb.current.setLinvel(_vel, true)
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
          matildaLaughRemainingRef.current -= delta * 1000
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
        rb.current.setLinvel(_vel, true)
        _applyRotation(groupRef, _dir.x, _dir.z)

        if (dist < active.warnDist) {
          chargeState.current = 'warn'
          stateTimer.current = now
          chargeDir.current.copy(_dir)
          _applyRotation(groupRef, chargeDir.current.x, chargeDir.current.z, 0.75)
          queueVisualState('animPhase', 'warn')
          _vel.x = 0; _vel.z = 0
          rb.current.setLinvel(_vel, true)
        }

      } else if (chargeState.current === 'warn') {
        _applyRotation(groupRef, chargeDir.current.x, chargeDir.current.z, 0.45)
        if (now - stateTimer.current >= active.warnDuration) {
          chargeState.current = 'charge'
          stateTimer.current = now
          queueVisualState('animPhase', 'charge')
          chargeDir.current.normalize()
          _applyRotation(groupRef, chargeDir.current.x, chargeDir.current.z, 1)
        }

      } else if (chargeState.current === 'charge') {
        const cd = chargeDir.current
        _vel.x = cd.x * active.chargeSpeed; _vel.z = cd.z * active.chargeSpeed
        rb.current.setLinvel(_vel, true)
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
        const chargeExpired = now - stateTimer.current > (active.chargeDuration ?? 1200)
        if (hitPlayer || chargeExpired) {
          if (hitPlayer) damagePlayer(stats.damage)
          chargeState.current = stats.mathTeacherSpecial ? 'mathSwingWindup' : 'stun'
          stateTimer.current = now
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
        if (now - stateTimer.current >= MATH_TEACHER_SWING_WINDUP_MS) {
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
          stateTimer.current = now
        }

      } else if (chargeState.current === 'mathSwingRecover') {
        _vel.x = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        if (now - stateTimer.current >= MATH_TEACHER_SWING_RECOVERY_MS) {
          chargeState.current = 'stun'
          stateTimer.current = now
          queueVisualState('animPhase', 'stun')
          const log = mathEndLogRef.current
          log.bossId = id
          logPlaytestEvent('b01-math-special-end', log)
        }

      } else if (chargeState.current === 'stun') {
        _vel.x = 0; _vel.z = 0
        rb.current.setLinvel(_vel, true)
        if (dist > 0.0001) _applyRotation(groupRef, _dir.x / dist, _dir.z / dist, 0.22)
        if (now - stateTimer.current >= active.stunDuration) {
          chargeState.current = 'chase'
          queueVisualState('animPhase', 'normal')
        }
      }
      return
    }

    // ?? 湲곕낯 異붽꺽 (E01, E02, E03, E06) ????????????????????????????????????
    _vel.y = 0
    if (dist < stats.contactDist * ENEMY_SIZE_MULTIPLIER) {
      const now = performance.now()
      if (now - lastContactDmgRef.current >= 500) {
        lastContactDmgRef.current = now
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
          <CuboidCollider args={colArgs} />
          <EnemyVisual groupRef={groupRef} type={type} animPhase={animPhase} hitFlash={hitFlash} hp={hp} isMatilda={isMatilda} scale={stats.scale} isChefPhase2={isChefPhase2} />
        </RigidBody>
      )}
      {type === 'B02' && currentStageId === 'stage2' && (
        <B02CorridorBlockadeVisual
          phase={b02BlockadeVisual.phase}
          lineZs={b02BlockadeVisual.lineZs}
          activeLineIndex={b02BlockadeVisual.activeLineIndex}
          halfX={stageCombatConfig.bounds.halfX}
        />
      )}
      {type === 'B03' && currentStageId === 'stage3' && (
        <B03ShuttleRunVisual
          phase={b03ShuttleVisual.phase}
          passIndex={b03ShuttleVisual.passIndex}
          laneZ={b03ShuttleVisual.laneZ}
          halfX={stageCombatConfig.bounds.halfX}
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
