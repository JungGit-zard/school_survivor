import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FLIGHT_FLYING, FLIGHT_HOVERING, MINI_ROSARI_HOVER_CAP, MINI_ROSARI_HOVER_TIMEOUT_MS, ONIGIRI_HOVER_CAP,
  ONIGIRI_HOVER_TIMEOUT_MS, RETIRE_CAP, RETIRE_DONE, RETIRE_TIMEOUT, addSwarmProjectile, countHoveringProjectiles,
  createProjectileSwarm, markHoverEvictions, planOnigiriFrame, pickNextOnigiriTarget, shouldRetireHoveringFlight,
  stepOnigiriFlight, stepProjectileSwarm,
} from './onigiri.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { enemyBodies as globalEnemyBodies, enemyPool } from './refs.js'

// 2026-11-13 Terry "대기 시간+안전 상한" — 떠서 기다리는 오니기리 12초/24개, 꼬마 로자리 8초/8개.
// 이 파일은 공용 진행기(lib/onigiri.js)의 규칙을 무기별로 고정한다. 컴포넌트 배선은
// components/Weapons/OnigiriMiniRosari.hover.runtime.test.jsx가 실제 마운트로 확인한다.

const DT = 1 / 60
const SPEED = 11 / 8

afterEach(() => {
  globalEnemyBodies.clear()
  enemyPool.reset()
})

function spawnUnkillable(x, z, type = 'E01') {
  const handle = enemyPool.spawn({ type, x, y: 0, z, hp: 1e9, maxHp: 1e9 })
  enemyPool.setHitHandler(handle, vi.fn(() => true))
  return handle
}

let nextId = 0
function launchAt(swarm, weapon, player = { x: 0, y: 0.32, z: 0 }) {
  const launch = planOnigiriFrame({
    now: 1e9, lastFireAt: 0, weapon, origin: player,
    findFreshTarget: (range) => pickNextOnigiriTarget({ from: player, range }),
    nextId: () => ++nextId,
  })
  return launch && addSwarmProjectile(swarm, launch, {})
}

// 맞아도 안 죽는 적 1명 → 던진 발사체는 맞힌 뒤 다음 표적이 없어 그 자리에 뜬다.
function stepUntilHovering(swarm, onRetire = () => {}) {
  for (let i = 0; i < 600; i += 1) {
    stepProjectileSwarm(swarm, DT, { onRetire })
    if (swarm.entries.every((e) => e.flight.hovering)) return
  }
  throw new Error('never hovered')
}

describe.each([
  ['onigiri', ONIGIRI_HOVER_TIMEOUT_MS, ONIGIRI_HOVER_CAP],
  ['miniRosari', MINI_ROSARI_HOVER_TIMEOUT_MS, MINI_ROSARI_HOVER_CAP],
])('%s hover timeout + safety cap (Terry 2026-11-13)', (weaponId, timeoutMs, cap) => {
  const weapon = { ...WEAPON_CATALOG[weaponId].base, active: true }
  const makeSwarm = () => createProjectileSwarm({ speed: SPEED, hoverTimeoutMs: timeoutMs, hoverCap: cap })

  it('uses the ruled numbers', () => {
    expect([timeoutMs, cap]).toEqual({ onigiri: [12000, 24], miniRosari: [8000, 8] }[weaponId])
  })

  it('removes itself after hovering the timeout with no target, not a step earlier', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    launchAt(swarm, weapon)
    const retired = []
    stepUntilHovering(swarm, (e, reason) => retired.push(reason))
    expect(retired).toEqual([])
    const steps = Math.round(timeoutMs / 1000 / DT)
    for (let i = 0; i < steps - 2; i += 1) stepProjectileSwarm(swarm, DT, { onRetire: (e, r) => retired.push(r) })
    expect(retired).toEqual([])
    expect(swarm.entries).toHaveLength(1)
    for (let i = 0; i < 4; i += 1) stepProjectileSwarm(swarm, DT, { onRetire: (e, r) => retired.push(r) })
    expect(retired).toEqual([RETIRE_TIMEOUT])
    expect(swarm.entries).toHaveLength(0)
  })

  it('resets the hover timer whenever it acquires a target', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const entry = launchAt(swarm, weapon)
    stepUntilHovering(swarm)
    const halfSteps = Math.round((timeoutMs * 0.75) / 1000 / DT)
    for (let i = 0; i < halfSteps; i += 1) stepProjectileSwarm(swarm, DT)
    expect(entry.flight.hoverMs).toBeGreaterThan(timeoutMs * 0.7)

    // 새 적이 사거리 안에 → 바로 다음 스텝에 날아가고 대기 시간은 0.
    spawnUnkillable(entry.flight.x + weapon.bounceRange * 0.5, entry.flight.z)
    stepProjectileSwarm(swarm, DT)
    expect(entry.state).toBe(FLIGHT_FLYING)
    expect(entry.flight.hoverMs).toBe(0)
    // 맞히고 다시 뜨면 처음부터 다시 센다 — 앞서 기다린 시간은 남지 않는다.
    stepUntilHovering(swarm)
    for (let i = 0; i < halfSteps; i += 1) stepProjectileSwarm(swarm, DT)
    expect(swarm.entries).toHaveLength(1)
  })

  it('edge (3): an enemy entering range on the very step the timeout would fire wins — it chases, it is not removed', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const entry = launchAt(swarm, weapon)
    stepUntilHovering(swarm)
    entry.flight.hoverMs = timeoutMs - DT * 1000 * 0.5 // 이번 스텝이면 대기 시간이 다 된다
    spawnUnkillable(entry.flight.x, entry.flight.z + weapon.bounceRange * 0.5)
    const retired = []
    stepProjectileSwarm(swarm, DT, { onRetire: (e, r) => retired.push(r) })
    expect(retired).toEqual([])
    expect(entry.state).toBe(FLIGHT_FLYING)
    expect(swarm.entries).toEqual([entry])
    // 같은 경계에서 표적이 없으면 그 스텝에 사라진다(대조군).
    const lone = makeSwarm()
    enemyPool.reset()
    spawnUnkillable(1, 0)
    const e2 = launchAt(lone, weapon)
    stepUntilHovering(lone)
    e2.flight.hoverMs = timeoutMs - DT * 1000 * 0.5
    stepProjectileSwarm(lone, DT, { onRetire: (e, r) => retired.push(r) })
    expect(retired).toEqual([RETIRE_TIMEOUT])
  })

  it('edge (3b): a cap-marked projectile that acquires a target on that step is spared', () => {
    const flight = { hovering: true, hoverMs: 99999, evict: true }
    expect(shouldRetireHoveringFlight(flight, FLIGHT_FLYING, timeoutMs)).toBe(false)
    expect(shouldRetireHoveringFlight(flight, FLIGHT_HOVERING, timeoutMs)).toBe(true)
  })

  it('over the cap, the longest-hovering one goes first; in-flight ones are never touched', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const retiredIds = []
    const onRetire = (e, reason) => retiredIds.push([e.id, reason])
    // 1개를 먼저 띄워 가장 오래 기다리게 하고, 나머지 cap-1개는 한꺼번에 띄운다(대기 시간보다 훨씬 짧게).
    const hovering = [launchAt(swarm, weapon)]
    stepUntilHovering(swarm, onRetire)
    for (let i = 0; i < 30; i += 1) stepProjectileSwarm(swarm, DT, { onRetire })
    for (let k = 1; k < cap; k += 1) hovering.push(launchAt(swarm, weapon))
    stepUntilHovering(swarm, onRetire)
    expect(hovering[0].flight.hoverMs).toBeGreaterThan(hovering[1].flight.hoverMs)
    expect(countHoveringProjectiles(swarm)).toBe(cap)
    expect(retiredIds).toEqual([])
    // 아직 날아가는 발사체(멀리 있는 다른 적을 향해) — 상한과 무관해야 한다.
    const far = spawnUnkillable(-12, 0)
    const flying = launchAt(swarm, weapon, { x: -6, y: 0.32, z: 0 })
    expect(flying.initialTarget.rb).toBe(enemyPool.get(far))
    // 1개 더 뜨면 상한 초과 → 가장 오래 기다린 hovering[0]이 사라진다.
    const extra = launchAt(swarm, weapon)
    stepUntilHoveringExcept(swarm, extra, onRetire)
    expect(retiredIds).toEqual([[hovering[0].id, RETIRE_CAP]])
    expect(swarm.entries).toContain(flying)
    expect(flying.flight.hovering).toBe(false)
    expect(countHoveringProjectiles(swarm)).toBe(cap)
  })

  function stepUntilHoveringExcept(swarm, entry, onRetire) {
    for (let i = 0; i < 600; i += 1) {
      stepProjectileSwarm(swarm, DT, { onRetire })
      if (entry.flight.hovering) return
    }
    throw new Error('never hovered')
  }
})

describe('cap eviction is deterministic and never touches flying or bouncing projectiles (edge 4)', () => {
  const entry = (id, hovering, hoverMs) => ({ id, flight: { hovering, hoverMs, evict: false } })

  it('several projectiles crossing the cap on the same step: ties go to the earliest thrown, same answer every time', () => {
    const make = () => [
      entry(1, true, 500), entry(2, false, 0), entry(3, true, 900), entry(4, true, 900),
      entry(5, true, 900), entry(6, false, 0), entry(7, true, 100), entry(8, true, 0),
    ]
    const runs = [0, 1, 2].map(() => {
      const list = make()
      expect(markHoverEvictions(list, 3)).toBe(3) // 대기 6개, 상한 3 → 3개
      return list.filter((e) => e.flight.evict).map((e) => e.id)
    })
    expect(runs[0]).toEqual([3, 4, 5]) // 900ms 동점 셋, 던진 순서대로
    expect(runs[1]).toEqual(runs[0])
    expect(runs[2]).toEqual(runs[0])
  })

  it('never marks a flying or bouncing projectile, even when only they could make room', () => {
    const list = [entry(1, false, 0), entry(2, false, 0), entry(3, true, 10)]
    expect(markHoverEvictions(list, 0)).toBe(1)
    expect(list.map((e) => e.flight.evict)).toEqual([false, false, true])
  })

  it('clears stale marks every step (a projectile that started flying is no longer marked)', () => {
    const list = [entry(1, true, 50), entry(2, true, 40)]
    markHoverEvictions(list, 1)
    expect(list[0].flight.evict).toBe(true)
    list[0].flight.hovering = false // 표적을 잡았다
    markHoverEvictions(list, 1)
    expect(list.map((e) => e.flight.evict)).toEqual([false, false])
  })

  it('a swarm step leaves bouncing projectiles alone and keeps hovering <= cap after every step', () => {
    // 적 4명이 한 줄로: 바운스 중인 발사체는 계속 다음 적으로 간다.
    for (let i = 0; i < 4; i += 1) spawnUnkillable(1 + i * 0.6, 0)
    const swarm = createProjectileSwarm({ speed: SPEED, hoverTimeoutMs: 1e9, hoverCap: 2 })
    const weapon = { ...WEAPON_CATALOG.onigiri.base, bounces: 99, bounceRange: 4.5 }
    const retired = []
    for (let k = 0; k < 6; k += 1) launchAt(swarm, weapon)
    for (let i = 0; i < 2400; i += 1) {
      stepProjectileSwarm(swarm, DT, { onRetire: (e, r) => retired.push([e.id, r, e.flight.hitSet.size]) })
      expect(countHoveringProjectiles(swarm)).toBeLessThanOrEqual(2)
    }
    // 상한으로 사라진 것은 전부 4명을 다 맞혀 갈 곳이 없어 뜬 것뿐이다(바운스 중 제거 없음).
    expect(retired.length).toBe(4)
    for (const [, reason, hits] of retired) {
      expect(reason).toBe(RETIRE_CAP)
      expect(hits).toBe(4)
    }
  })
})

describe('hover time is game time only (edge 1)', () => {
  it('counts only the delta it is stepped with — paused, level-up, dialogue, cutscene and hidden-tab frames never step it', () => {
    spawnUnkillable(1, 0)
    const weapon = { ...WEAPON_CATALOG.onigiri.base, active: true }
    const swarm = createProjectileSwarm({ speed: SPEED, hoverTimeoutMs: ONIGIRI_HOVER_TIMEOUT_MS, hoverCap: ONIGIRI_HOVER_CAP })
    const entry = launchAt(swarm, weapon)
    stepUntilHovering(swarm)
    const before = entry.flight.hoverMs
    for (let i = 0; i < 30; i += 1) stepProjectileSwarm(swarm, DT)
    expect(entry.flight.hoverMs).toBeCloseTo(before + 30 * DT * 1000, 6)
    // 진행기 자체는 벽시계를 읽지 않는다.
    const nowSpy = vi.spyOn(performance, 'now')
    const dateSpy = vi.spyOn(Date, 'now')
    stepOnigiriFlight(entry.flight, DT, SPEED)
    expect(nowSpy).not.toHaveBeenCalled()
    expect(dateSpy).not.toHaveBeenCalled()
    nowSpy.mockRestore(); dateSpy.mockRestore()
  })

  it('a done projectile retires as done, not timeout', () => {
    spawnUnkillable(1, 0)
    const swarm = createProjectileSwarm({ speed: SPEED, hoverTimeoutMs: 1, hoverCap: 0 })
    launchAt(swarm, { ...WEAPON_CATALOG.onigiri.base, bounces: 1 })
    const reasons = []
    for (let i = 0; i < 600 && swarm.entries.length; i += 1) stepProjectileSwarm(swarm, DT, { onRetire: (e, r) => reasons.push(r) })
    expect(reasons).toEqual([RETIRE_DONE])
  })
})
