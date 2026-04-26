import * as THREE from 'three'

// 컴포넌트 간 플레이어 위치 공유 (re-render 없이)
export const playerPos = new THREE.Vector3()

// 플레이어가 마지막으로 바라본 방향. 기본값은 화면 위쪽/월드 +Z.
export const playerFacing = new THREE.Vector3(0, 0, 1)

export const bagSwingState = {
  active: false,
  progress: 0,
}

export const enemyBodies = new Map()
