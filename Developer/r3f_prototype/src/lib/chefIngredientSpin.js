import * as THREE from 'three'

const spinAxis = new THREE.Vector3()

// 던진 재료가 날아가는 동안의 회전. 인스턴스 인덱스 해시로 축·위상을 고정하고 각도는
// ageMs로만 굴린다 — 프레임마다 난수를 쓰지 않으므로 같은 상태면 항상 같은 그림이 나온다.
export const CHEF_INGREDIENT_SPIN_RAD_PER_MS = 0.0062

export function applyChefIngredientSpin(target, index, ageMs) {
  const hash = Math.imul((Number.isInteger(index) ? index : 0) + 1, 2654435761) >>> 0
  spinAxis.set(
    ((hash & 255) / 127.5) - 1,
    (((hash >>> 8) & 255) / 127.5) - 1,
    (((hash >>> 16) & 255) / 127.5) - 1,
  )
  if (spinAxis.lengthSq() < 1e-6) spinAxis.set(0, 1, 0)
  spinAxis.normalize()
  const phase = (((hash >>> 24) & 255) / 255) * Math.PI * 2
  const age = Number.isFinite(ageMs) ? ageMs : 0
  target.setFromAxisAngle(spinAxis, phase + age * CHEF_INGREDIENT_SPIN_RAD_PER_MS)
  return target
}
