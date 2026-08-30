export const B04_SOUP_BLAST_DAMAGE = 16
export const B04_SOUP_BLAST_TELEGRAPH_MS = 1_200
export const B04_SOUP_BLAST_EXPLOSION_MS = 250
export const B04_SOUP_BLAST_RADIUS = 1.1

const SOUP_RING_OFFSETS = Object.freeze([
  [3.2, 0], [-3.2, 0], [0, 3.2], [0, -3.2], [3.2, 3.2], [3.2, -3.2], [-3.2, 3.2], [-3.2, -3.2],
  [5.2, 0], [-5.2, 0], [0, 5.2], [0, -5.2], [5.2, 5.2], [5.2, -5.2], [-5.2, 5.2], [-5.2, -5.2],
])
const SOUP_FALLBACK_GRID = Object.freeze([
  [-10, -12], [-5, -12], [0, -12], [5, -12], [10, -12],
  [-10, -6], [-5, -6], [0, -6], [5, -6], [10, -6],
  [-10, 0], [-5, 0], [0, 0], [5, 0], [10, 0],
  [-10, 6], [-5, 6], [0, 6], [5, 6], [10, 6],
  [-10, 12], [-5, 12], [0, 12], [5, 12], [10, 12],
])

export function createB04SoupBlastState() {
  return { phase: 'idle', elapsedMs: 0, circles: [], damagedPlayer: false, triggered: false }
}

// HP 50%에 닿으면 경과 시간과 무관하게 반드시 발현한다(2026-08-23 사용자 지시).
// 시간 초과로 폭발을 건너뛰고 P2로 직행하던 경로는 없앴다 — 격노 전환은 항상 폭발 뒤에 온다.
export function getB04SoupBlastTrigger({ hpRatio = 1, state } = {}) {
  return !!state && state.phase === 'idle' && !state.triggered && hpRatio <= 0.5
}

// 장애물은 회전 OBB(halfX/halfZ는 로컬 반치수)라 로컬 공간에서 비교한다.
function overlapsObstacle(circle, obstacle) {
  const deltaX = circle.x - obstacle.x
  const deltaZ = circle.z - obstacle.z
  const sin = obstacle.sinY !== undefined
    ? obstacle.sinY
    : (obstacle.rotationY ? Math.sin(obstacle.rotationY) : 0)
  if (sin === 0) {
    return Math.abs(deltaX) < circle.radius + obstacle.halfX
      && Math.abs(deltaZ) < circle.radius + obstacle.halfZ
  }
  const cos = obstacle.cosY !== undefined ? obstacle.cosY : Math.cos(obstacle.rotationY)
  return Math.abs(deltaX * cos - deltaZ * sin) < circle.radius + obstacle.halfX
    && Math.abs(deltaX * sin + deltaZ * cos) < circle.radius + obstacle.halfZ
}

export function getB04SoupBlastCircles({ player, halfX, halfZ, obstacles = [] }) {
  const radius = B04_SOUP_BLAST_RADIUS
  const candidates = [
    ...SOUP_RING_OFFSETS.map(([dx, dz]) => [player.x + dx, player.z + dz]),
    ...SOUP_FALLBACK_GRID,
  ]
  const circles = []
  for (const [candidateX, candidateZ] of candidates) {
    const circle = {
      x: Math.max(-halfX + radius, Math.min(halfX - radius, candidateX)),
      z: Math.max(-halfZ + radius, Math.min(halfZ - radius, candidateZ)),
      radius,
    }
    if (Math.hypot(circle.x - player.x, circle.z - player.z) <= radius * 1.5) continue
    if (obstacles.some((obstacle) => overlapsObstacle(circle, obstacle))) continue
    if (circles.some((existing) => Math.hypot(existing.x - circle.x, existing.z - circle.z) <= existing.radius + circle.radius)) continue
    circles.push(circle)
    if (circles.length === 3) return circles
  }
  return circles
}

export function startB04SoupBlast(state, circles) {
  if (!state || state.phase !== 'idle') return state
  return { ...state, phase: 'telegraph', elapsedMs: 0, circles, damagedPlayer: false, triggered: true }
}

export function advanceB04SoupBlast(state, deltaMs = 0) {
  if (!state || state.phase === 'idle' || state.phase === 'done') return state
  const elapsedMs = state.elapsedMs + Math.max(0, deltaMs)
  if (state.phase === 'telegraph') return elapsedMs < B04_SOUP_BLAST_TELEGRAPH_MS
    ? { ...state, elapsedMs }
    : { ...state, phase: 'explode', elapsedMs: 0 }
  if (state.phase === 'explode') return elapsedMs < B04_SOUP_BLAST_EXPLOSION_MS
    ? { ...state, elapsedMs }
    : { ...state, phase: 'done', elapsedMs: 0 }
  return state
}

export function consumeB04SoupBlastHit(state, player) {
  if (state?.phase !== 'explode' || state.damagedPlayer
    || !state.circles.some((circle) => Math.hypot(player.x - circle.x, player.z - circle.z) < circle.radius)) return { state, damage: 0 }
  return { state: { ...state, damagedPlayer: true }, damage: B04_SOUP_BLAST_DAMAGE }
}
