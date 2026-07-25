// 일반 적 웨이브를 한 프레임에 몰아 생성하지 않기 위한 고정 크기 FIFO다.
// 엔트리는 웨이브 발화 RAF에서 한 번 만들어지고, drain은 매 RAF 최대 3개만 소비한다.
export const POOLED_ENEMY_SPAWN_DRAIN_PER_FRAME = 3
export const MAX_PENDING_POOLED_ENEMY_SPAWNS = 256

export function createPooledEnemySpawnDrainQueue(capacity = MAX_PENDING_POOLED_ENEMY_SPAWNS) {
  const safeCapacity = Math.max(1, Math.floor(capacity) || MAX_PENDING_POOLED_ENEMY_SPAWNS)
  return {
    entries: new Array(safeCapacity).fill(null),
    stageTokens: new Uint32Array(safeCapacity),
    read: 0,
    write: 0,
    count: 0,
    dropped: 0,
    staleDropped: 0,
  }
}

export function enqueuePooledEnemySpawn(queue, entry, stageToken) {
  if (!queue || !entry || queue.count >= queue.entries.length) {
    if (queue) queue.dropped += 1
    return false
  }
  const slot = queue.write
  queue.entries[slot] = entry
  queue.stageTokens[slot] = stageToken >>> 0
  queue.write = (slot + 1) % queue.entries.length
  queue.count += 1
  return true
}

export function resetPooledEnemySpawnDrainQueue(queue) {
  if (!queue) return
  queue.entries.fill(null)
  queue.stageTokens.fill(0)
  queue.read = 0
  queue.write = 0
  queue.count = 0
}

// `spawn`은 true/false를 반환할 수 있다. 풀 포화로 false여도 FIFO 소비는 완료된 것으로 처리한다.
// stale token은 새 스테이지에 과거 웨이브가 섞이지 않게 소비·폐기하되 spawn을 호출하지 않는다.
export function drainPooledEnemySpawnQueue(queue, activeStageToken, spawn, limit = POOLED_ENEMY_SPAWN_DRAIN_PER_FRAME) {
  const max = Math.max(0, Math.floor(limit) || 0)
  let consumed = 0
  let spawned = 0
  while (queue && queue.count > 0 && consumed < max) {
    const slot = queue.read
    const entry = queue.entries[slot]
    const token = queue.stageTokens[slot]
    queue.entries[slot] = null
    queue.stageTokens[slot] = 0
    queue.read = (slot + 1) % queue.entries.length
    queue.count -= 1
    consumed += 1
    if (token !== (activeStageToken >>> 0)) {
      queue.staleDropped += 1
      continue
    }
    if (spawn?.(entry)) spawned += 1
  }
  return { consumed, spawned, remaining: queue?.count ?? 0 }
}
