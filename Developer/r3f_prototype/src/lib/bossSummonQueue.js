// 보스 소환 요청 링버퍼(길이 8). Enemy.jsx(보스 React 컴포넌트)가 push하고 Enemies.jsx 프레임 루프가 비운다.
// Stage 5 B10 교감 좀비의 '교무회의 소집'(HP 85/50/25% 각 1회), Stage 6 B05 교장 좀비의 '운동장 10바퀴'(타이머)가 쓴다.
// bossTypeCode로 어느 보스의 소환인지 구분한다(0 = 미지정, B10 링으로 처리).
// gameKey 태그로 이전 런의 요청이 새 런에 새어 들지 않게 한다. 프레임 경로라 고정 크기 typed array만 쓴다.

export const BOSS_SUMMON_QUEUE_CAPACITY = 8

const gameKeys = new Float64Array(BOSS_SUMMON_QUEUE_CAPACITY)
const xs = new Float32Array(BOSS_SUMMON_QUEUE_CAPACITY)
const zs = new Float32Array(BOSS_SUMMON_QUEUE_CAPACITY)
const bossTypeCodes = new Uint16Array(BOSS_SUMMON_QUEUE_CAPACITY)
let read = 0
let count = 0

export function pushBossSummon(gameKey, x, z, bossTypeCode = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || count >= BOSS_SUMMON_QUEUE_CAPACITY) return false
  const slot = (read + count) % BOSS_SUMMON_QUEUE_CAPACITY
  gameKeys[slot] = gameKey
  xs[slot] = x
  zs[slot] = z
  bossTypeCodes[slot] = Number.isInteger(bossTypeCode) && bossTypeCode > 0 ? bossTypeCode : 0
  count += 1
  return true
}

// 가장 오래된 요청 하나를 out에 담고 true. 비었으면 false.
export function drainBossSummonInto(out) {
  if (count === 0) return false
  out.gameKey = gameKeys[read]
  out.x = xs[read]
  out.z = zs[read]
  out.bossTypeCode = bossTypeCodes[read]
  read = (read + 1) % BOSS_SUMMON_QUEUE_CAPACITY
  count -= 1
  return true
}

export function getBossSummonQueueCount() {
  return count
}

export function resetBossSummonQueue() {
  read = 0
  count = 0
}
