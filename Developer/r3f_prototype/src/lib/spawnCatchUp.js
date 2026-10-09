// 화면 안 몬스터가 3마리 이하이면 다음 일반 스폰을 즉시 당긴다.
// 스폰 시계만 전진하며 보스·HUD·탈출 포탈은 실제 시간을 유지한다.
// 이미 예약/생성 중인 몹이 있으면 추가 점프를 막아 프레임별 스케줄 소진을 방지한다.
// 오프셋은 단조 증가하며 오버타임에서도 상한 없이 동작한다.
// Legacy upper-bound export for existing consumers; no wait is applied now.
export const EMPTY_ARENA_MAX_SEC = 2
export const LOW_DENSITY_ENEMY_THRESHOLD = 3

// 보스 HUD가 쓰는 고정 예고 시간이다. 보스는 캐치업 후보가 아니며 실제 game clock에서만 등장한다.
export const BOSS_TELEGRAPH_LEAD_SEC = 3

export function createSpawnCatchUpState() {
  return { offsetSec: 0, emptyForSec: 0 }
}

export function resetSpawnCatchUpState(state) {
  if (!state) return state
  state.offsetSec = 0
  state.emptyForSec = 0
  return state
}

// 한 프레임 전진. 이번 프레임에 앞당긴 초를 반환한다(점프 없으면 0).
export function advanceSpawnCatchUp(state, options = {}) {
  if (!state) return 0
  const { liveEnemyCount = 0, queuedEnemyCount = 0, spawnSec = 0, nextPendingSpawnSec = null } = options
  state.emptyForSec = 0
  if (!Number.isFinite(liveEnemyCount) || liveEnemyCount < 0 || liveEnemyCount > LOW_DENSITY_ENEMY_THRESHOLD) return 0
  if (!Number.isFinite(queuedEnemyCount) || queuedEnemyCount > 0) return 0

  if (!Number.isFinite(nextPendingSpawnSec) || !Number.isFinite(spawnSec) || nextPendingSpawnSec <= spawnSec) {
    // 당길 미래 스폰이 없다. 없는 스폰을 생성하거나 시계를 되감지 않는다.
    return 0
  }

  const jump = nextPendingSpawnSec - spawnSec
  state.offsetSec += jump
  state.emptyForSec = 0
  return jump
}

// HUD처럼 프레임 루프 밖에서 오프셋을 읽어야 하는 소비자를 위한 모듈 전역 게시판.
// Enemies의 프레임 루프가 매 프레임 갱신하고, 스테이지 리셋에서 0으로 되돌린다.
let publishedOffsetSec = 0

export function publishSpawnCatchUpOffsetSec(offsetSec) {
  publishedOffsetSec = Number.isFinite(offsetSec) && offsetSec > 0 ? offsetSec : 0
  return publishedOffsetSec
}

export function getSpawnCatchUpOffsetSec() {
  return publishedOffsetSec
}
