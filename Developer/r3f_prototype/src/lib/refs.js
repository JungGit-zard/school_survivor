import * as THREE from 'three'

// 컴포넌트 간 플레이어 위치 공유 (re-render 없이)
export const playerPos = new THREE.Vector3()

// 플레이어가 마지막으로 바라본 방향. 기본값은 화면 위쪽/월드 +Z.
export const playerFacing = new THREE.Vector3(0, 0, 1)

export const bagSwingState = {
  active: false,
  progress: 0,
  lastFired: -Infinity,
  cooldown: 1000,
}

export const enemyBodies = new Map()

export const joystickDir = { x: 0, z: 0, active: false }

export function resetRuntimeRefs() {
  playerPos.set(0, 0, 0)
  playerFacing.set(0, 0, 1)
  bagSwingState.active = false
  bagSwingState.progress = 0
  bagSwingState.lastFired = -Infinity
  bagSwingState.cooldown = 1000
  enemyBodies.clear()
  joystickDir.x = 0
  joystickDir.z = 0
  joystickDir.active = false
}
