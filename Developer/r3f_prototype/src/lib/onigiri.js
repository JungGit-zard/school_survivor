import { enemyBodies as globalEnemyBodies, enemyPool, enemySimulationRuntime } from './refs.js'
import { captureEnemyGeneration, isEnemyHitLive } from './weaponCollision.js'

function isPoolProxy(rb) {
  return Number.isInteger(rb?.index) && rb.index >= 0 && rb.index < enemyPool.proxies.length
    && enemyPool.proxies[rb.index] === rb
}

// 일반 적은 EntityPool이 정본이다. enemyBodies(Map)는 최대 3개의 보스/특수 적 호환용이며
// 기본값은 전역 enemyBodies이지만, 테스트에서는 고정 픽스처 Map을 넘겨 순수하게 검증한다.
// 공중에 떠서 표적을 찾는 발사체가 많아도 매 프레임 싸게 돌도록, 찾는 동안은 객체를 만들지 않는다
// (모듈 스크래치 + 미리 만든 Map 콜백). 결과 객체는 표적을 찾았을 때만 1개 만든다.
const _scan = { fromX: 0, fromZ: 0, hitSet: null, minDSq: 0, rb: null, enemyId: null, found: false }
const EMPTY_HIT_SET = new Set()

function scanSpecialEnemy(rb, enemyId) {
  if (isPoolProxy(rb)) return // 풀 프록시가 Map에 중복 등록되어도 풀 루프에서 이미 처리했다.
  if (_scan.hitSet.has(enemyId) || !isEnemyHitLive(rb)) return
  const et = rb.translation()
  const dx = et.x - _scan.fromX
  const dz = et.z - _scan.fromZ
  const dSq = dx * dx + dz * dz
  if (dSq < _scan.minDSq) {
    _scan.minDSq = dSq
    _scan.rb = rb
    _scan.enemyId = enemyId
    _scan.found = true
  }
}

// 풀 적 후보 1명 비교. 결과는 전체 선형 순회(인덱스 오름차순, 더 가까울 때만 교체)와 같아야 하므로
// 거리가 같으면 더 작은 인덱스가 이긴다 — 공간 격자는 셀 순서로 돌기 때문에 이 규칙이 필요하다.
// 첫 후보는 사거리 안(range² 미만)일 때만 잡는다.
const _pool = { fromX: 0, fromZ: 0, hitSet: null, minDSq: 0, index: -1 }
const _cellRange = { minX: 0, minZ: 0, maxX: -1, maxZ: -1 }

function considerPoolEnemy(index) {
  if (!enemyPool.active[index]) return
  if (_pool.hitSet.has(enemyPool.proxies[index]._enemyId)) return
  const dx = enemyPool.posX[index] - _pool.fromX
  const dz = enemyPool.posZ[index] - _pool.fromZ
  const dSq = dx * dx + dz * dz
  if (dSq < _pool.minDSq || (_pool.index >= 0 && dSq === _pool.minDSq && index < _pool.index)) {
    _pool.minDSq = dSq
    _pool.index = index
  }
}

// 적 시뮬레이션이 매 스텝 끝에 다시 짓는 공간 격자(종이비행기 scanRadiusEnemiesInto와 같은 격자).
// 격자가 지금 풀 상태와 맞을 때만 쓰고, 아니면(스폰·이동 직후, 테스트) 전체 순회로 돌아간다.
// 어느 쪽이든 고르는 적은 같다 — 격자는 사거리 상자 안의 셀만 보게 해 줄 뿐이다.
function scanPoolNearest(fromX, fromZ, hitSet, range) {
  _pool.fromX = fromX; _pool.fromZ = fromZ; _pool.hitSet = hitSet
  _pool.minDSq = range * range; _pool.index = -1
  const grid = enemySimulationRuntime.grid
  if (grid.isCurrentFor(enemyPool)) {
    if (grid.getCellRangeInto(_cellRange, fromX - range, fromZ - range, fromX + range, fromZ + range)) {
      for (let cellZ = _cellRange.minZ; cellZ <= _cellRange.maxZ; cellZ += 1) {
        for (let cellX = _cellRange.minX; cellX <= _cellRange.maxX; cellX += 1) {
          let index = grid.head[cellZ * grid.axisSize + cellX]
          while (index >= 0) {
            considerPoolEnemy(index)
            index = grid.next[index]
          }
        }
      }
    }
    let index = grid.overflowHead
    while (index >= 0) {
      considerPoolEnemy(index)
      index = grid.overflowNext[index]
    }
  } else {
    for (let index = 0; index <= enemyPool.highestActive; index += 1) considerPoolEnemy(index)
  }
  _pool.hitSet = null
}

export function findNearestUnhitEnemy(enemyBodies, fromX, fromZ, hitSet, range) {
  scanPoolNearest(fromX, fromZ, hitSet, range)
  const poolIndex = _pool.index
  const minDSq = _pool.minDSq

  _scan.fromX = fromX; _scan.fromZ = fromZ; _scan.hitSet = hitSet; _scan.minDSq = minDSq
  _scan.rb = null; _scan.enemyId = null; _scan.found = false
  enemyBodies.forEach(scanSpecialEnemy)
  _scan.hitSet = null

  if (_scan.found) {
    const rb = _scan.rb
    _scan.rb = null
    return { rb, enemyId: _scan.enemyId, generation: captureEnemyGeneration(rb) }
  }
  if (poolIndex < 0) return null
  const rb = enemyPool.proxies[poolIndex]
  return { rb, enemyId: rb._enemyId, generation: enemyPool.generation[poolIndex] }
}

export function pickNextOnigiriTarget({ enemyBodies = globalEnemyBodies, from, hitSet = EMPTY_HIT_SET, range = Number.POSITIVE_INFINITY }) {
  return findNearestUnhitEnemy(enemyBodies, from.x, from.z, hitSet, range)
}

function seededNoise(seed) {
  const x = Math.sin(seed * 917.37) * 43758.5453
  return x - Math.floor(x)
}

export function createOnigiriBurstGrains({ id, x, z, count = 14 }) {
  return Array.from({ length: count }, (_, index) => {
    const seed = id * 41.9 + index * 13.17
    const angle = (Math.PI * 2 * index) / count + (seededNoise(seed) - 0.5) * 0.38
    return {
      key: `${id}-${index}`,
      x,
      z,
      angle,
      speed: 0.62 + seededNoise(seed + 1) * 0.52,
      lift: 0.12 + seededNoise(seed + 2) * 0.12,
      size: 0.032 + seededNoise(seed + 3) * 0.02,
      spin: (seededNoise(seed + 4) - 0.5) * 8,
      delayMs: seededNoise(seed + 5) * 24,
    }
  })
}

// 오니기리 발사 사양의 단일 출처. 새 투척(쿨다운 투척)의 출발점은 언제나 이번 프레임의
// 주인공 몸 위치(origin = playerPos)다(2026-11-02 Terry: "어떤 상황에서도 무조건 발사점은 로자리").
export function createOnigiriLaunch({ id, origin, target, weapon }) {
  return {
    id,
    start:          [origin.x, origin.y, origin.z],
    initialTarget:  target,
    hitIds:         [target.enemyId],
    maxBounces:     weapon.bounces ?? 2,
    damage:         weapon.damage,
    bounceRange:    weapon.bounceRange ?? 4.5,
    critChance:     weapon.critChance,
    critMultiplier: weapon.critMultiplier,
  }
}

// 새 투척 판단(오니기리·꼬마 로자리 공용). 이미 날고 있는 발사체 수는 입력으로 받지 않는다 →
// 동시 발사 수 상한·대기가 구조적으로 없다(2026-11-02 Terry: "화면상 오니기리가 몇 개 있더라도 늘려").
// 쿨다운이 차고 사거리(weapon.range) 안에 적이 있으면 주인공 몸에서 1발 던진다.
export function planOnigiriFrame({ now, lastFireAt, weapon, origin, findFreshTarget, nextId }) {
  if (now - lastFireAt < weapon.cooldown) return null
  const target = findFreshTarget(weapon.range ?? 18)
  if (!target) return null
  return createOnigiriLaunch({ id: nextId(), origin, target, weapon })
}

// ── 날아가는 발사체 1개의 프레임 진행(오니기리·꼬마 로자리 공용, 2026-11-02 Terry 확정 규칙) ──
// - 바운스가 남은 발사체는 사라지지 않는다. 맞힌 뒤에는 그 자리에서 bounceRange 안의 아직 안 맞힌
//   가장 가까운 적에게 이어서 날아간다.
// - 날아가던 표적이 먼저 죽어도 사라지지 않고, 현재 위치에서 같은 규칙으로 다시 조준한다.
// - 닿는 적이 없으면 그 자리에 떠서(수평 이동 없음 — 맵을 떠돌지 않는다) 매 프레임 다시 찾고,
//   적이 bounceRange 안에 들어오면 바로 날아간다.
// - 바운스를 다 쓰면 끝난다(또는 판 종료·무기 해제로 컴포넌트가 내려갈 때).
// - 2026-11-13 Terry "대기 시간+안전 상한": 위 "사라지지 않는다"는 **떠서 기다리는** 발사체에 한해 아래 대기
//   시간·상한으로 바뀐다. 날아가거나 바운스 중인 발사체는 그대로 사라지지 않는다(아래 상수 참고).
export const ONIGIRI_HIT_RADIUS = 0.30
export const FLIGHT_FLYING = 'flying'
export const FLIGHT_HOVERING = 'hovering'
export const FLIGHT_HIT = 'hit'   // 이번 프레임에 맞혔고 바운스가 남았다
export const FLIGHT_DONE = 'done' // 이번 프레임에 맞혔고 바운스를 다 썼다

export function createOnigiriFlight({ start, initialTarget, hitIds, maxBounces, bounceRange }) {
  return {
    x: start[0],
    z: start[2],
    target: initialTarget,
    bouncesLeft: maxBounces,
    hitSet: new Set(hitIds),
    bounceRange,
    dirX: 0,
    dirZ: 1,
    // FLIGHT_HIT/DONE 프레임에 호출 측이 피해를 줄 대상과 충돌 위치.
    hitTarget: null,
    hitFromX: 0,
    hitFromZ: 0,
    // 떠서 기다리는 상태와 그 누적 시간(ms). 표적을 잡는 프레임마다 0으로 돌아간다.
    hovering: false,
    hoverMs: 0,
    // 안전 상한 초과로 이번에 내보낼 대상(markHoverEvictions가 매 프레임 다시 정한다).
    evict: false,
    // 따라잡지 못하는 추격 포기(2026-11-14): 지금 쫓는 표적, 그 추격 구간의 기준 거리와 경과 시간(ms),
    // 포기한 표적 id 모음(맞힌 것도 바운스도 아니다 — 다시 고르지 않을 뿐).
    chaseTarget: null,
    chaseRefDist: 0,
    chaseMs: 0,
    gaveUp: new Set(),
  }
}

function retargetFlight(flight, enemyBodies) {
  const next = findNearestUnhitEnemy(enemyBodies, flight.x, flight.z, flight.hitSet, flight.bounceRange)
  flight.target = next
  if (next) flight.hitSet.add(next.enemyId)
  return next
}

// 2026-11-13 Terry "대기 시간+안전 상한" — 11-02 "사라지지 않는다"를 떠서 기다리는(FLIGHT_HOVERING) 발사체에
// 한해 대체한다. 수치는 여기 한 곳에서만 조정한다.
// - 대기 시간: 표적 없이 이만큼 떠 있으면 사라진다(오니기리 = 기존 쌀알 터짐, 꼬마 로자리 = 작게 줄어드는 펑).
// - 안전 상한: 떠서 기다리는 수가 이보다 많으면 가장 오래 기다린 것부터 같은 방식으로 사라진다.
// 바뀌지 않는 것: 새 투척은 막지 않는다 · 투척은 로자리 몸에서 · 기다리던 발사체는 적이 사거리에 들어온
// 바로 다음 프레임에 날아간다 · 날거나 바운스 중인 발사체는 상한으로 지우지 않는다 · 표적을 잡으면 대기 시간 0.
export const ONIGIRI_HOVER_TIMEOUT_MS = 12000
export const ONIGIRI_HOVER_CAP = 24
export const MINI_ROSARI_HOVER_TIMEOUT_MS = 8000
export const MINI_ROSARI_HOVER_CAP = 8

// 따라잡지 못하는 추격은 포기한다(2026-11-14, 위 대기 시간+안전 상한의 구멍 막기 — 실기기 벤치마크).
// 마틸다(B01)가 대시마다 빨라지면 날아가는 발사체(1.375u/s)가 영영 못 따라잡아 바운스도 대기도 아닌
// 채로 무한히 쌓였다. 날아가는 동안 표적까지 거리가 CHASE_GIVE_UP_MS(게임 시간) 안에 CHASE_MIN_PROGRESS만큼
// 줄지 않으면 그 표적을 포기하고(gaveUp에 기록, 다시 고르지 않음) 평소대로 다음 표적을 찾는다. 없으면 떠서
// 기다리고, 그 뒤는 위 대기 시간·상한이 맡는다. 0.5u 줄 때마다 구간을 새로 잰다.
// - 3초·0.5u: 평균 0.17u/s 이상 가까워지면 추격이 이어진다 → 정면으로 1.2u/s까지 달아나는 적(E03 러너
//   1.1u/s 포함 일반 좀비 전부)은 그대로 따라잡는다. 서 있는 적이면 3초에 4.1u를 좁히므로 여유가 크다.
// - 짧은 회피(예: 2u/s로 1초 대시 뒤 멈춤)는 3초 안에 다시 0.5u 이상 좁혀 포기하지 않는다.
// 새 투척(언제나 로자리에서, 막지 않음)·마틸다 속도·탈출 뒤 압박은 바꾸지 않는다.
export const CHASE_GIVE_UP_MS = 3000
export const CHASE_MIN_PROGRESS = 0.5

export function stepOnigiriFlight(flight, delta, speed, enemyBodies = globalEnemyBodies) {
  const state = advanceOnigiriFlight(flight, delta, speed, enemyBodies)
  if (state === FLIGHT_HOVERING) {
    flight.hovering = true
    flight.hoverMs += delta * 1000
  } else {
    flight.hovering = false
    flight.hoverMs = 0
  }
  return state
}

// 이번 프레임 진행 결과가 "떠서 기다림"이고, 대기 시간이 다 됐거나 상한 초과로 지목됐으면 true.
// 이번 프레임에 표적을 잡은 발사체(FLYING/HIT)는 지목돼 있어도 남는다.
export function shouldRetireHoveringFlight(flight, state, timeoutMs) {
  return state === FLIGHT_HOVERING && (flight.hoverMs >= timeoutMs || flight.evict === true)
}

// 안전 상한: entries[i].flight 중 떠서 기다리는 것이 cap보다 많으면 가장 오래 기다린 것부터 (초과분만큼)
// evict를 켠다. 같은 시간이면 앞(먼저 던진) 것이 먼저다. 날거나 바운스 중인 것은 세지도 지목하지도 않는다.
// 반환값 = 지목한 수. 할당 없음.
export function markHoverEvictions(entries, cap) {
  let hovering = 0
  for (let i = 0; i < entries.length; i += 1) {
    const flight = entries[i].flight
    if (!flight) continue
    flight.evict = false
    if (flight.hovering) hovering += 1
  }
  let excess = hovering - cap
  let marked = 0
  while (excess > 0) {
    let pick = null
    for (let i = 0; i < entries.length; i += 1) {
      const flight = entries[i].flight
      if (!flight || !flight.hovering || flight.evict) continue
      if (!pick || flight.hoverMs > pick.hoverMs) pick = flight
    }
    if (!pick) break
    pick.evict = true
    marked += 1
    excess -= 1
  }
  return marked
}

function advanceOnigiriFlight(flight, delta, speed, enemyBodies) {
  flight.hitTarget = null
  if (flight.bouncesLeft <= 0) return FLIGHT_DONE

  const current = flight.target
  if (current && !isEnemyHitLive(current.rb, current.generation)) flight.target = null
  if (!flight.target && !retargetFlight(flight, enemyBodies)) return FLIGHT_HOVERING

  const target = flight.target
  const t = target.rb.translation()
  const dx = t.x - flight.x
  const dz = t.z - flight.z
  const dist = Math.hypot(dx, dz)

  if (dist < ONIGIRI_HIT_RADIUS) {
    flight.hitTarget = target
    flight.hitFromX = flight.x
    flight.hitFromZ = flight.z
    flight.x = t.x
    flight.z = t.z
    flight.bouncesLeft -= 1
    flight.target = null
    if (flight.bouncesLeft <= 0) return FLIGHT_DONE
    retargetFlight(flight, enemyBodies)
    return FLIGHT_HIT
  }

  // 추격 진척(게임 시간). 표적이 바뀌면 그 자리 거리부터 새로 잰다.
  if (flight.chaseTarget !== target) {
    flight.chaseTarget = target
    flight.chaseRefDist = dist
    flight.chaseMs = 0
  } else {
    flight.chaseMs += delta * 1000
    if (dist <= flight.chaseRefDist - CHASE_MIN_PROGRESS) {
      flight.chaseRefDist = dist
      flight.chaseMs = 0
    } else if (flight.chaseMs >= CHASE_GIVE_UP_MS) {
      // 포기: 이 표적은 이미 hitSet(고른 적 모음)에 있어 다시 고르지 않는다. gaveUp은 그 사실의 기록이다.
      flight.gaveUp.add(target.enemyId)
      flight.hitSet.add(target.enemyId)
      flight.target = null
      flight.chaseTarget = null
      return retargetFlight(flight, enemyBodies) ? FLIGHT_FLYING : FLIGHT_HOVERING
    }
  }

  flight.dirX = dx / dist
  flight.dirZ = dz / dist
  flight.x += flight.dirX * speed * delta
  flight.z += flight.dirZ * speed * delta
  return FLIGHT_FLYING
}

// 끝난(또는 리셋으로 비운) 발사체가 적 참조·포기 기록을 붙잡고 있지 않게 한다.
function releaseFlight(flight) {
  flight.target = null
  flight.chaseTarget = null
  flight.hitTarget = null
  flight.gaveUp.clear()
}

// ── 발사체 무리 1스텝(오니기리·꼬마 로자리 공용, 2026-11-13) ──
// 무기 1개가 자기 발사체 전부를 **한 루프에서** 진행한다. 순서가 고정이라 결과가 결정적이다.
//   1) 던진 순서대로 각 발사체를 stepOnigiriFlight로 진행(이번 스텝에 막 던진 것은 다음 스텝부터 — 예전
//      컴포넌트가 커밋 뒤 첫 프레임부터 돌던 것과 같다). 맞힌 프레임이면 onHit(entry).
//   2) 바운스를 다 쓴 것은 'done'으로 끝낸다.
//   3) 이번 스텝의 최신 대기 상태로 안전 상한을 지목하고(markHoverEvictions), 대기 시간이 다 됐거나 지목된
//      대기 발사체를 'timeout'/'cap'으로 끝낸다. 이번 스텝에 표적을 잡은(FLYING/HIT) 발사체는 남는다.
//   4) 끝난 것은 onRetire(entry, reason)를 부른 뒤 목록에서 제자리 제거한다(할당 없음).
// 이 함수가 끝난 시점에는 언제나 "떠서 기다리는 수 ≤ hoverCap"이다.
// delta는 게임 시간(usePlayingFrame의 고정 스텝)이다 — 일시정지·레벨업·대화·컷신·탭 숨김 중에는 스텝이
// 돌지 않으므로 대기 시간도 흐르지 않는다.
export const RETIRE_DONE = 'done'
export const RETIRE_TIMEOUT = 'timeout'
export const RETIRE_CAP = 'cap'

export function createProjectileSwarm({ speed, hoverTimeoutMs, hoverCap }) {
  return { entries: [], speed, hoverTimeoutMs, hoverCap }
}

// 새 발사체를 무리에 넣는다. launch = planOnigiriFrame 결과. extra는 무기별 시각 상태(슬롯 등).
export function addSwarmProjectile(swarm, launch, extra) {
  const entry = Object.assign({ ...launch, flight: createOnigiriFlight(launch), state: null, retired: null, justLaunched: true }, extra)
  swarm.entries.push(entry)
  return entry
}

export function maxHoverMs(swarm) {
  let max = 0
  for (let i = 0; i < swarm.entries.length; i += 1) max = Math.max(max, swarm.entries[i].flight.hoverMs)
  return max
}

export function countHoveringProjectiles(swarm) {
  let n = 0
  for (let i = 0; i < swarm.entries.length; i += 1) if (swarm.entries[i].flight.hovering) n += 1
  return n
}

export function stepProjectileSwarm(swarm, delta, { onHit = null, onRetire = null, enemyBodies = globalEnemyBodies } = {}) {
  const entries = swarm.entries
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]
    if (entry.justLaunched) { entry.justLaunched = false; continue }
    const state = stepOnigiriFlight(entry.flight, delta, swarm.speed, enemyBodies)
    entry.state = state
    if (entry.flight.hitTarget && onHit) onHit(entry)
    if (state === FLIGHT_DONE) entry.retired = RETIRE_DONE
  }
  markHoverEvictions(entries, swarm.hoverCap)
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]
    if (entry.retired || !shouldRetireHoveringFlight(entry.flight, entry.state, swarm.hoverTimeoutMs)) continue
    entry.retired = entry.flight.hoverMs >= swarm.hoverTimeoutMs ? RETIRE_TIMEOUT : RETIRE_CAP
    entry.flight.hovering = false
  }
  let kept = 0
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]
    if (entry.retired) {
      if (onRetire) onRetire(entry, entry.retired)
      releaseFlight(entry.flight)
      continue
    }
    entries[kept++] = entry
  }
  entries.length = kept
  return kept
}

// 무기 해제·판 리셋: 남은 발사체를 전부 onRetire 없이 비운다(호출 측이 슬롯을 함께 놓는다).
export function clearProjectileSwarm(swarm, onEach = null) {
  for (let i = 0; i < swarm.entries.length; i += 1) {
    if (onEach) onEach(swarm.entries[i])
    releaseFlight(swarm.entries[i].flight)
  }
  swarm.entries.length = 0
}
