import { playerPos } from './refs.js'

const BASE_PULL_RADIUS = 1.5
let _pullRadius = BASE_PULL_RADIUS
let _pullRadiusSq = BASE_PULL_RADIUS * BASE_PULL_RADIUS

export const COLLECT_RADIUS_SQ = 0.22 * 0.22

export function setMagnetMultiplier(mult) {
  const m = Number.isFinite(mult) && mult > 0 ? mult : 1
  _pullRadius = BASE_PULL_RADIUS * m
  _pullRadiusSq = _pullRadius * _pullRadius
}

export function getPullRadiusSq() {
  return _pullRadiusSq
}

// 자석 흡입 + 수집 한 프레임 step.
// 반환값으로 호출자가 추가 처리(획득/제거)를 한다.
//   'collected' — 플레이어와 닿음. 호출자: 획득 액션 + 컴포넌트 제거.
//   'pulled'    — 자석 반경 안에서 끌려오는 중. 위치는 pRef에 갱신됨.
//   'idle'      — 반경 밖. 위치 변화 없음.
export function stepMagnetPull(pRef, delta) {
  const p = pRef.current
  const dx = playerPos.x - p.x
  const dz = playerPos.z - p.z
  const distSq = dx * dx + dz * dz

  if (distSq < COLLECT_RADIUS_SQ) return 'collected'
  if (distSq >= _pullRadiusSq)    return 'idle'

  const dist = Math.sqrt(distSq)
  const pullSpeed = 3.0 + (1 - dist / _pullRadius) * 15.0
  p.x += (dx / dist) * pullSpeed * delta
  p.z += (dz / dist) * pullSpeed * delta
  return 'pulled'
}
