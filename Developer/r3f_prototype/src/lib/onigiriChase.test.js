import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CHASE_GIVE_UP_MS, CHASE_MIN_PROGRESS, FLIGHT_HIT, FLIGHT_HOVERING, MINI_ROSARI_HOVER_CAP, MINI_ROSARI_HOVER_TIMEOUT_MS,
  ONIGIRI_HOVER_CAP, ONIGIRI_HOVER_TIMEOUT_MS, RETIRE_TIMEOUT, addSwarmProjectile, clearProjectileSwarm,
  countHoveringProjectiles, createProjectileSwarm, pickNextOnigiriTarget, planOnigiriFrame, stepProjectileSwarm,
} from './onigiri.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { enemyBodies as globalEnemyBodies, enemyPool } from './refs.js'

// 2026-11-14 실기기 벤치마크 구멍: 대시마다 빨라지는 마틸다(B01)를 1.375u/s로 쫓는 발사체가 영영 못 따라잡아
// 바운스도 대기도 아닌 채로 무한히 쌓였다(오니기리 28·분신 43개, 4,011 draw calls). 따라잡지 못하는 추격은
// 포기한다 — CHASE_GIVE_UP_MS(게임 시간) 안에 CHASE_MIN_PROGRESS만큼 가까워지지 못하면.

const DT = 1 / 60
const SPEED = 11 / 8

afterEach(() => {
  globalEnemyBodies.clear()
  enemyPool.reset()
})

// 마틸다 같은 특수 적(Map 등록). pos를 바꾸면 움직인다.
function movingBoss(id, x, z) {
  const pos = { x, z }
  const rb = { _enemyHit: vi.fn(() => true), _enemyDead: false, translation: () => ({ x: pos.x, y: 0, z: pos.z }) }
  globalEnemyBodies.set(id, rb)
  return { pos, rb }
}

function swarmFor(timeoutMs = ONIGIRI_HOVER_TIMEOUT_MS, cap = ONIGIRI_HOVER_CAP) {
  return createProjectileSwarm({ speed: SPEED, hoverTimeoutMs: timeoutMs, hoverCap: cap })
}

let nextId = 0
function launch(swarm, weapon, player = { x: 0, y: 0.32, z: 0 }) {
  const plan = planOnigiriFrame({
    now: 1e9, lastFireAt: 0, weapon, origin: player,
    findFreshTarget: (range) => pickNextOnigiriTarget({ from: player, range }),
    nextId: () => ++nextId,
  })
  return plan && addSwarmProjectile(swarm, plan, {})
}

const onigiri = { ...WEAPON_CATALOG.onigiri.base, active: true, bounces: 12, cooldown: 4000 }

describe('a chase that is not closing in gives up (2026-11-14)', () => {
  it('uses the chosen window: 3s of game time, 0.5u of net closing', () => {
    expect([CHASE_GIVE_UP_MS, CHASE_MIN_PROGRESS]).toEqual([3000, 0.5])
  })

  it('test 1: a target running away faster than 1.375u/s — gives up within the window, never re-picks it, hovers, then times out', () => {
    const boss = movingBoss('B01', 3, 0)
    const swarm = swarmFor()
    const entry = launch(swarm, onigiri)
    const flight = entry.flight
    const reasons = []
    let gaveUpAt = null
    let t = 0
    for (let i = 0; i < 60 * 30 && swarm.entries.length; i += 1) {
      boss.pos.x += 2.0 * DT // 정면으로 2u/s 도주
      stepProjectileSwarm(swarm, DT, { onRetire: (e, r) => reasons.push([r, t]) })
      t += DT
      if (gaveUpAt === null && flight.gaveUp.has('B01')) gaveUpAt = t
      if (gaveUpAt !== null && swarm.entries.length) {
        expect(flight.target?.enemyId).not.toBe('B01') // 다시 고르지 않는다
        expect(entry.state).toBe(FLIGHT_HOVERING)
      }
    }
    expect(gaveUpAt).toBeGreaterThanOrEqual(CHASE_GIVE_UP_MS / 1000)
    expect(gaveUpAt).toBeLessThan(CHASE_GIVE_UP_MS / 1000 + 0.1)
    expect(boss.rb._enemyHit).not.toHaveBeenCalled() // 포기는 맞힌 것도 바운스도 아니다
    expect(flight.bouncesLeft).toBe(12)
    expect(reasons).toHaveLength(1)
    expect(reasons[0][0]).toBe(RETIRE_TIMEOUT)
    expect(reasons[0][1] - gaveUpAt).toBeCloseTo(ONIGIRI_HOVER_TIMEOUT_MS / 1000, 1)
  })

  it('test 1b: after giving up it retargets normally when another enemy is in bounce range', () => {
    const boss = movingBoss('B01', 3, 0)
    const swarm = swarmFor()
    const entry = launch(swarm, onigiri)
    let handle = null
    for (let i = 0; i < 60 * 5; i += 1) {
      boss.pos.x += 2.0 * DT
      if (i === 60 * 2) {
        handle = enemyPool.spawn({ type: 'E01', x: entry.flight.x, y: 0, z: entry.flight.z + 2, hp: 1e9, maxHp: 1e9 })
        enemyPool.setHitHandler(handle, () => true)
      }
      stepProjectileSwarm(swarm, DT)
      if (entry.flight.gaveUp.has('B01')) break
    }
    expect(entry.flight.gaveUp.has('B01')).toBe(true)
    expect(entry.flight.target.rb).toBe(enemyPool.get(handle))
  })

  it.each([
    ['running away at 1.0u/s', 1.0, 0],
    ['an E03 runner fleeing at 1.1u/s', 1.1, 0],
    ['crossing sideways at 1.0u/s', 0, 1.0],
    ['standing still', 0, 0],
  ])('test 2: a target slower than the projectile (%s) is still caught, with no give-up', (_, vx, vz) => {
    const boss = movingBoss('B01', 4, 0)
    const swarm = swarmFor()
    const entry = launch(swarm, onigiri)
    let hit = false
    for (let i = 0; i < 60 * 40 && !hit; i += 1) {
      boss.pos.x += vx * DT
      boss.pos.z += vz * DT
      stepProjectileSwarm(swarm, DT)
      hit = entry.state === FLIGHT_HIT
    }
    expect(hit).toBe(true)
    expect(entry.flight.gaveUp.size).toBe(0)
    expect(boss.rb._enemyHit).not.toHaveBeenCalled() // 피해는 onHit 콜백 몫(여기선 없음)
  })

  it.each([
    ['a 1s dash at 2u/s, then stops', [[1.0, 2.0]]],
    ['a 1.5s dash at 2u/s, then stops', [[1.5, 2.0]]],
    ['two short 0.6s dashes at 2.5u/s', [[0.6, 2.5], [0.8, 0], [0.6, 2.5]]],
  ])('test 3: a target that dodges briefly (%s) and then becomes reachable is still caught — no premature give-up', (_, segments) => {
    const boss = movingBoss('B01', 3, 0)
    const swarm = swarmFor()
    const entry = launch(swarm, onigiri)
    let t = 0
    let hit = false
    const speedAt = (time) => {
      let acc = 0
      for (const [len, v] of segments) {
        if (time < acc + len) return v
        acc += len
      }
      return 0
    }
    for (let i = 0; i < 60 * 30 && !hit; i += 1) {
      boss.pos.x += speedAt(t) * DT
      stepProjectileSwarm(swarm, DT)
      t += DT
      hit = entry.state === FLIGHT_HIT
    }
    expect(hit).toBe(true)
    expect(entry.flight.gaveUp.size).toBe(0)
  })

  it('test 5: the given-up set and target references are cleared on retire and on reset', () => {
    const boss = movingBoss('B01', 3, 0)
    const swarm = swarmFor()
    const retired = []
    const entry = launch(swarm, onigiri)
    for (let i = 0; i < 60 * 20 && swarm.entries.length; i += 1) {
      boss.pos.x += 2 * DT
      if (entry.flight.gaveUp.size) expect(entry.flight.gaveUp.has('B01')).toBe(true)
      stepProjectileSwarm(swarm, DT, { onRetire: (e) => retired.push(e) })
    }
    expect(retired).toEqual([entry])
    expect(entry.flight.gaveUp.size).toBe(0)
    expect(entry.flight.target).toBeNull()
    expect(entry.flight.chaseTarget).toBeNull()

    // 리셋(무기 해제·gameKey): 포기 기록을 들고 있던 발사체도 비운다.
    boss.pos.x = 3 // 앞 추격 동안 멀리 달아났다 — 다시 사거리 안으로
    const swarm2 = swarmFor()
    const e2 = launch(swarm2, onigiri)
    for (let i = 0; i < 60 * 4; i += 1) { boss.pos.x += 2 * DT; stepProjectileSwarm(swarm2, DT) }
    expect(e2.flight.gaveUp.has('B01')).toBe(true)
    clearProjectileSwarm(swarm2)
    expect(swarm2.entries).toHaveLength(0)
    expect(e2.flight.gaveUp.size).toBe(0)
    expect(e2.flight.target).toBeNull()
  })
})

// test 4: 탈출 뒤 10분 — 대시마다 빨라지는 마틸다 같은 표적 하나만 있는 최악의 경우.
// 마틸다는 로자리 둘레 반지름 5u 원을 돈다(두 무기 사거리 안: 오니기리 18u, 분신 7.5u → 쿨다운마다 계속 던진다).
// 속도: 처음 60초 0.5u/s(잡힌다), 이후 20초마다 대시 +0.35u/s, 상한 5u/s(1.375u/s를 곧 넘는다).
//
// 상한 근거(발사체 1개의 수명): 표적이 마틸다뿐이므로 첫 추격이 끝나면(맞힘 또는 포기) 마틸다는 hitSet에 있어
// 다시 고르지 않는다 → 떠서 기다리다 대기 시간에 끝난다. 첫 추격은 3초마다 0.5u 이상 좁혀야 이어지고 기준 거리는
// 그때마다 0.5u씩만 줄어드므로, 시작 거리 ≤ 5u + 한 스텝 여유 → 구간 ≤ ceil(5.5/0.5) = 11개 → ≤ 33초(+3초 마지막 구간).
// 수명 ≤ 36s + 대기 시간 + 1 → 동시에 살아 있는 수 ≤ ceil(수명 / 쿨다운) + 1.
// 오니기리(4000ms, 12s): ceil(49/4)+1 = 14. 꼬마 로자리(2400ms, 8s): ceil(45/2.4)+1 = 20.
// (수정 전에는 추격이 끝나지 않아 이 수가 시간에 비례해 끝없이 늘었다.)
describe('test 4: 10 minutes post-exit with a Matilda-like target that speeds up per dash', () => {
  it.each([
    ['onigiri', { ...WEAPON_CATALOG.onigiri.base, active: true, bounces: 12, cooldown: 4000 }, ONIGIRI_HOVER_TIMEOUT_MS, ONIGIRI_HOVER_CAP, 14],
    ['miniRosari', { ...WEAPON_CATALOG.miniRosari.base, active: true, bounces: 9, cooldown: 2400 }, MINI_ROSARI_HOVER_TIMEOUT_MS, MINI_ROSARI_HOVER_CAP, 20],
  ])('%s: live projectiles (flying + hovering) stay under the derived bound the whole time', (_, weapon, timeoutMs, cap, bound) => {
    const boss = movingBoss('B01', 5, 0)
    const swarm = swarmFor(timeoutMs, cap)
    const player = { x: 0, y: 0.32, z: 0 }
    let angle = 0
    let lastFire = -1e9
    let maxLive = 0
    let maxChaseSec = 0
    let launched = 0
    let liveAt9Min = 0
    const steps = 60 * 600
    for (let i = 0; i < steps; i += 1) {
      const t = i * DT
      const speed = t < 60 ? 0.5 : Math.min(5, 0.5 + 0.35 * Math.floor((t - 60) / 20 + 1))
      angle += (speed / 5) * DT
      boss.pos.x = Math.cos(angle) * 5
      boss.pos.z = Math.sin(angle) * 5
      if ((t * 1000) - lastFire >= weapon.cooldown) {
        const plan = planOnigiriFrame({
          now: t * 1000, lastFireAt: lastFire, weapon, origin: player,
          findFreshTarget: (range) => pickNextOnigiriTarget({ from: player, range }),
          nextId: () => ++nextId,
        })
        if (plan) { addSwarmProjectile(swarm, plan, { born: t }); lastFire = t * 1000; launched += 1 }
      }
      stepProjectileSwarm(swarm, DT)
      expect(countHoveringProjectiles(swarm)).toBeLessThanOrEqual(cap)
      maxLive = Math.max(maxLive, swarm.entries.length)
      for (const e of swarm.entries) {
        if (!e.flight.hovering) maxChaseSec = Math.max(maxChaseSec, t - e.born)
      }
      if (i === 60 * 540) liveAt9Min = swarm.entries.length
    }
    expect(launched).toBeGreaterThan(100) // 10분 내내 계속 던졌다(새 투척은 막지 않음)
    expect(maxLive).toBeLessThanOrEqual(bound)
    expect(maxChaseSec).toBeLessThanOrEqual(36.5)
    expect(liveAt9Min).toBeLessThanOrEqual(bound)
    expect(swarm.entries.length).toBeLessThanOrEqual(bound)
  }, 120_000)
})
