import { enemyBodies as globalEnemyBodies, enemyPool } from './refs.js'
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

export function findNearestUnhitEnemy(enemyBodies, fromX, fromZ, hitSet, range) {
  let poolIndex = -1
  let minDSq = range * range
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    if (hitSet.has(enemyPool.proxies[index]._enemyId)) continue
    const dx = enemyPool.posX[index] - fromX
    const dz = enemyPool.posZ[index] - fromZ
    const dSq = dx * dx + dz * dz
    if (dSq < minDSq) {
      minDSq = dSq
      poolIndex = index
    }
  }

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
  }
}

function retargetFlight(flight, enemyBodies) {
  const next = findNearestUnhitEnemy(enemyBodies, flight.x, flight.z, flight.hitSet, flight.bounceRange)
  flight.target = next
  if (next) flight.hitSet.add(next.enemyId)
  return next
}

export function stepOnigiriFlight(flight, delta, speed, enemyBodies = globalEnemyBodies) {
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

  flight.dirX = dx / dist
  flight.dirZ = dz / dist
  flight.x += flight.dirX * speed * delta
  flight.z += flight.dirZ * speed * delta
  return FLIGHT_FLYING
}
