// 교과서 착지점 계산 — 사망 위치에서 튕겨 나가되, 플레이어가 도달 불가능한
// 지점(이동 경계 밖, 책상/의자 콜라이더 안)에는 떨어지지 않게 한다.
// 배경: 착지점이 장애물을 무시하면 자석 Lv0(반경 0)에서는 영구 수집 불가.
import { getPlayerMovementBounds } from './playerMovementBounds.js'
import { getStageObjectColliders } from '../components/StageObjects/stageObjectColliders.js'

const TOSS_MIN = 0.7
const TOSS_MAX = 1.6
const RETRIES = 8
// 원 근사 여유: 책 반경(~0.18) + 콜라이더 회전 오차 흡수
const BLOCKER_MARGIN = 0.3

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// 스테이지별 차단 오브젝트를 원(circle)으로 근사해 캐시
const _blockerCache = new Map() // stageId → [{x, z, rSq}]

export function getLandingBlockers(stageId = 'stage1') {
  let blockers = _blockerCache.get(stageId)
  if (blockers) return blockers
  blockers = getStageObjectColliders(stageId).map(({ position, parts }) => {
    // 가장 큰 파트의 반대각선 절반을 반지름으로 (회전 무관 보수적 근사)
    let r = 0
    for (const p of parts) r = Math.max(r, Math.hypot(p.args[0], p.args[2]))
    const radius = r + BLOCKER_MARGIN
    return { x: position[0], z: position[2], rSq: radius * radius }
  })
  _blockerCache.set(stageId, blockers)
  return blockers
}

function isBlocked(x, z, blockers) {
  for (const b of blockers) {
    const dx = x - b.x
    const dz = z - b.z
    if (dx * dx + dz * dz < b.rSq) return true
  }
  return false
}

export function computeTextbookLanding(pos, stageId = 'stage1', random = Math.random) {
  const { minX, maxX, minZ, maxZ } = getPlayerMovementBounds(stageId)
  const blockers = getLandingBlockers(stageId)

  let fallback = null
  for (let i = 0; i < RETRIES; i++) {
    const ang = random() * Math.PI * 2
    const dist = TOSS_MIN + random() * (TOSS_MAX - TOSS_MIN)
    const x = clamp(pos[0] + Math.sin(ang) * dist, minX, maxX)
    const z = clamp(pos[2] + Math.cos(ang) * dist, minZ, maxZ)
    if (!isBlocked(x, z, blockers)) return { x, z }
    fallback ??= { x, z }
  }
  // 폴백: 사망 위치 자체를 경계 안으로 클램프 — 적이 서 있던 곳은 대체로 도달 가능
  const fx = clamp(pos[0], minX, maxX)
  const fz = clamp(pos[2], minZ, maxZ)
  if (!isBlocked(fx, fz, blockers)) return { x: fx, z: fz }
  // 최후: 막힌 지점을 덮고 있는 블로커 바깥으로 밀어낸다(수집 가능 보장).
  // 밀어낸 지점이 이웃 블로커에 겹칠 수 있어 소수 회 반복.
  const p = fallback ?? { x: fx, z: fz }
  for (let pass = 0; pass < 3; pass++) {
    let moved = false
    for (const b of blockers) {
      const dx = p.x - b.x
      const dz = p.z - b.z
      const dSq = dx * dx + dz * dz
      if (dSq >= b.rSq) continue
      const d = Math.sqrt(dSq) || 1e-6
      const r = Math.sqrt(b.rSq) + 0.15
      p.x = clamp(b.x + (dx / d) * r, minX, maxX)
      p.z = clamp(b.z + (dz / d) * r, minZ, maxZ)
      moved = true
    }
    if (!moved) break
  }
  return p
}
