import { playerPos } from './refs.js'

// 수집 시작/흡입 반경 0.22 → 0.38 → 1.2 (2026-08-01).
// 0.38은 E01 접촉 판정 0.373(CONTACT_DIST 0.28 × ENEMY_SIZE_MULTIPLIER 4/3)과 거의 같아서,
// 경험치를 주우려면 피격 거리까지 들어가야 했다. 초반 성장 루프가 성립하도록
// 1.2 반경에 닿으면 즉시 삭제하지 않고 부드럽게 플레이어 쪽으로 흡입을 시작한다.
const BASE_PULL_RADIUS = 1.2
const FINAL_COLLECT_RADIUS = 0.22
let _pullRadius = 0
let _pullRadiusSq = 0

export const COLLECT_RADIUS_SQ = BASE_PULL_RADIUS * BASE_PULL_RADIUS

export function setMagnetMultiplier(mult) {
  const m = Number.isFinite(mult) && mult >= 0 ? mult : 1
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
  const finalCollectRadiusSq = FINAL_COLLECT_RADIUS * FINAL_COLLECT_RADIUS
  const attractRadiusSq = Math.max(COLLECT_RADIUS_SQ, _pullRadiusSq)

  if (distSq < finalCollectRadiusSq) return 'collected'
  if (distSq >= attractRadiusSq) return 'idle'

  const dist = Math.sqrt(distSq)
  const attractRadius = Math.sqrt(attractRadiusSq)
  const pullSpeed = 3.0 + (1 - dist / attractRadius) * 15.0
  const step = Math.min(dist - FINAL_COLLECT_RADIUS * 0.65, pullSpeed * delta)
  p.x += (dx / dist) * step
  p.z += (dz / dist) * step
  return 'pulled'
}
