import * as THREE from 'three'
import { createPlayerArmActionState, clearPlayerArmAction } from './playerArmAction.js'
import { createEnemyEntityPool } from './enemyEntityPool.js'
import { createEnemySimulationRuntime } from './enemySimulation.js'
import { createEnemyProjectilePool } from './enemyProjectilePool.js'
import { createPlayerSlowState, createProjectileZombieShotPool } from './projectileZombieShotPool.js'
import { resetRuntimeTime } from './gameRuntimeTime.js'

// 컴포넌트 간 플레이어 위치 공유 (re-render 없이)
export const playerPos = new THREE.Vector3()

// EscapePortal mounts once per active portal. HUD reads this at a low frequency
// so portal navigation never adds React work to the render loop.
export const portalTarget = { active: false, x: 0, z: 0 }

export function publishPortalTarget(x, z) {
  portalTarget.active = true
  portalTarget.x = x
  portalTarget.z = z
}

export function clearPortalTarget() {
  portalTarget.active = false
  portalTarget.x = 0
  portalTarget.z = 0
}

// 카메라가 실제로 보여주는 월드 영역 (Game.jsx가 매 프레임 갱신)
export const screenBounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }

// 플레이어가 마지막으로 바라본 방향. 기본값은 화면 위쪽/월드 +Z.
export const playerFacing = new THREE.Vector3(0, 0, 1)

export const bagSwingState = {
  active: false,
  progress: 0,
  lastFired: -Infinity,
  cooldown: 1000,
}

export const playerArmActionState = createPlayerArmActionState()

export const enemyBodies = new Map()
// 일반 적은 React/Rapier body 대신 이 단일 런타임 정본을 사용한다.
export const enemyPool = createEnemyEntityPool()
export const enemySimulationRuntime = createEnemySimulationRuntime()
export const enemyProjectilePool = createEnemyProjectilePool()
// 투사체 좀비 15종(E46~E60)의 탄·바닥 표식. E04 풀과 분리한다(lib/projectileZombieShotPool.js 머리 주석).
export const projectileZombieShotPool = createProjectileZombieShotPool()
// 물웅덩이·물감·줄넘기 감속. Player.jsx가 매 고정 스텝 읽고, 가장 강한 1개만 적용한다.
export const playerSlow = createPlayerSlowState()
export const enemySightBlocked = new Uint8Array(200)
export const enemyHandleScratch = { index: -1, generation: 0 }

export const joystickDir = { x: 0, z: 0, active: false }

export function resetRuntimeRefs(startPosition = [0, 0, 0]) {
  resetRuntimeTime()
  playerPos.set(...startPosition)
  clearPortalTarget()
  playerFacing.set(0, 0, 1)
  bagSwingState.active = false
  bagSwingState.progress = 0
  bagSwingState.lastFired = -Infinity
  bagSwingState.cooldown = 1000
  clearPlayerArmAction(playerArmActionState)
  enemyBodies.clear()
  enemyPool.reset()
  enemySimulationRuntime.reset()
  enemyProjectilePool.reset()
  projectileZombieShotPool.reset()
  playerSlow.mul = 1
  playerSlow.ms = 0
  enemySightBlocked.fill(0)
  joystickDir.x = 0
  joystickDir.z = 0
  joystickDir.active = false
}
