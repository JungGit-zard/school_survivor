import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FLIGHT_FADING, FLIGHT_FLYING, FLIGHT_HOVERING, MINI_ROSARI_HOVER_TIMEOUT_MS, MINI_ROSARI_MAX_ALIVE,
  ONIGIRI_HOVER_TIMEOUT_MS, ONIGIRI_MAX_ALIVE, PROJECTILE_FADE_MS, PROJECTILE_MAX_ALIVE, PROJECTILE_NO_TARGET_TIMEOUT_MS,
  RETIRE_DONE, RETIRE_TIMEOUT, addSwarmProjectile, canLaunchProjectile, clearProjectileSwarm, countFadingProjectiles,
  countHoveringProjectiles, createProjectileSwarm, isProjectileSwarmReady, planOnigiriFrame, projectileCooldownRemainingMs, pickNextOnigiriTarget, projectileFadeProgress, shouldStartFade,
  stepOnigiriFlight, stepProjectileSwarm,
} from './onigiri.js'
import { ONIGIRI_MAX_BOUNCES, WEAPON_CATALOG } from './weaponCatalog.js'
import { SINGLE_PROJECTILE_COOLDOWN_MIN_MS } from './singleProjectileCycle.js'
import { enemyBodies as globalEnemyBodies, enemyPool } from './refs.js'

// 2026-11-22 Terry "주먹밥, 미니로자리를 정리하자" — 표적 없이 3초면 그 자리에서 스르륵(0.4초) 사라짐.
// 같은 날 저녁 개정: "무조건 한 화면에 1개만"(모든 상태 포함) · "1개 발사된 발사체가 사라지면 직후부터 대기시간"
// · 대기 10초 → 업그레이드로 3초까지(최소 3초). 낮의 "화면 3개"와 11-13 "12초/24개, 8초/8개"를 대체한다.
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
    aliveCount: swarm.entries.length,
    maxAlive: swarm.maxAlive,
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
  ['onigiri', ONIGIRI_HOVER_TIMEOUT_MS, ONIGIRI_MAX_ALIVE],
  ['miniRosari', MINI_ROSARI_HOVER_TIMEOUT_MS, MINI_ROSARI_MAX_ALIVE],
])('%s: 1 on screen, cooldown from disappearance, 3s no-target fade (Terry 2026-11-22)', (weaponId, timeoutMs, maxAlive) => {
  const weapon = { ...WEAPON_CATALOG[weaponId].base, active: true }
  const makeSwarm = () => createProjectileSwarm({ speed: SPEED, hoverTimeoutMs: timeoutMs, maxAlive })

  it('uses the ruled numbers: 1 alive, 3s timeout, 0.3–0.5s fade', () => {
    expect([timeoutMs, maxAlive]).toEqual([3000, 1])
    expect(PROJECTILE_MAX_ALIVE).toBe(1)
    expect(PROJECTILE_NO_TARGET_TIMEOUT_MS).toBe(3000)
    expect(PROJECTILE_FADE_MS).toBeGreaterThanOrEqual(300)
    expect(PROJECTILE_FADE_MS).toBeLessThanOrEqual(500)
    // 기본값도 같은 규칙이다(무기가 값을 안 넘겨도 1개·3초). 더 큰 상한을 넘겨도 1로 묶인다.
    const swarm = createProjectileSwarm({ speed: SPEED })
    expect([swarm.maxAlive, swarm.hoverTimeoutMs, swarm.fadeMs]).toEqual([1, 3000, PROJECTILE_FADE_MS])
    for (const asked of [2, 3, 8, 99, Number.POSITIVE_INFINITY]) {
      expect(createProjectileSwarm({ speed: SPEED, maxAlive: asked }).maxAlive).toBe(1)
    }
  })

  it('after 3s with no target it fades in place, then is removed — not a step earlier', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const entry = launchAt(swarm, weapon)
    const retired = []
    const onRetire = (e, r) => retired.push(r)
    stepUntilHovering(swarm, onRetire)
    const steps = Math.round(timeoutMs / 1000 / DT)
    for (let i = 0; i < steps - 2; i += 1) stepProjectileSwarm(swarm, DT, { onRetire })
    expect(entry.state).toBe(FLIGHT_HOVERING)
    expect(retired).toEqual([])
    for (let i = 0; i < 4 && entry.state !== FLIGHT_FADING; i += 1) stepProjectileSwarm(swarm, DT, { onRetire })
    // 3초가 지났다 → 사라지기 시작(아직 목록에 있고, 3개에 센다).
    expect(entry.state).toBe(FLIGHT_FADING)
    expect(entry.flight.hoverMs).toBeGreaterThanOrEqual(timeoutMs)
    expect(entry.flight.hoverMs).toBeLessThan(timeoutMs + DT * 1000 + 1e-6)
    expect(countFadingProjectiles(swarm)).toBe(1)
    expect(countHoveringProjectiles(swarm)).toBe(0)
    expect(swarm.entries).toEqual([entry])
    const x = entry.flight.x
    const z = entry.flight.z
    // 사라지는 동안 제자리에서 진행도가 0→1로 오른다.
    let last = projectileFadeProgress(swarm, entry)
    const fadeSteps = Math.ceil(PROJECTILE_FADE_MS / 1000 / DT)
    for (let i = 0; i < fadeSteps - 2; i += 1) {
      stepProjectileSwarm(swarm, DT, { onRetire })
      const p = projectileFadeProgress(swarm, entry)
      expect(p).toBeGreaterThan(last)
      last = p
      expect([entry.flight.x, entry.flight.z]).toEqual([x, z])
    }
    expect(retired).toEqual([])
    for (let i = 0; i < 4; i += 1) stepProjectileSwarm(swarm, DT, { onRetire })
    expect(retired).toEqual([RETIRE_TIMEOUT])
    expect(swarm.entries).toHaveLength(0)
  })

  it('a fading projectile does not chase an enemy that walks up during the fade', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const entry = launchAt(swarm, weapon)
    stepUntilHovering(swarm)
    entry.flight.hoverMs = timeoutMs
    stepProjectileSwarm(swarm, DT)
    expect(entry.state).toBe(FLIGHT_FADING)
    spawnUnkillable(entry.flight.x + 0.1, entry.flight.z)
    const hits = []
    for (let i = 0; i < 60; i += 1) stepProjectileSwarm(swarm, DT, { onHit: (e) => hits.push(e.id) })
    expect(hits).toEqual([])
    expect(swarm.entries).toHaveLength(0)
  })

  it('resets the no-target timer whenever it acquires a target', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const entry = launchAt(swarm, weapon)
    stepUntilHovering(swarm)
    const partSteps = Math.round((timeoutMs * 0.75) / 1000 / DT)
    for (let i = 0; i < partSteps; i += 1) stepProjectileSwarm(swarm, DT)
    expect(entry.flight.hoverMs).toBeGreaterThan(timeoutMs * 0.7)

    // 새 적이 사거리 안에 → 바로 다음 스텝에 날아가고 대기 시간은 0.
    spawnUnkillable(entry.flight.x + weapon.bounceRange * 0.5, entry.flight.z)
    stepProjectileSwarm(swarm, DT)
    expect(entry.state).toBe(FLIGHT_FLYING)
    expect(entry.flight.hoverMs).toBe(0)
    // 맞히고 다시 뜨면 처음부터 다시 센다 — 앞서 기다린 시간은 남지 않는다.
    stepUntilHovering(swarm)
    for (let i = 0; i < partSteps; i += 1) stepProjectileSwarm(swarm, DT)
    expect(entry.state).toBe(FLIGHT_HOVERING)
    expect(swarm.entries).toHaveLength(1)
  })

  it('edge: an enemy entering range on the very step the timeout would fire wins — it chases, it does not fade', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const entry = launchAt(swarm, weapon)
    stepUntilHovering(swarm)
    entry.flight.hoverMs = timeoutMs - DT * 1000 * 0.5 // 이번 스텝이면 대기 시간이 다 된다
    spawnUnkillable(entry.flight.x, entry.flight.z + weapon.bounceRange * 0.5)
    stepProjectileSwarm(swarm, DT)
    expect(entry.state).toBe(FLIGHT_FLYING)
    expect(swarm.entries).toEqual([entry])
    // 같은 경계에서 표적이 없으면 그 스텝에 사라지기 시작한다(대조군).
    const lone = makeSwarm()
    enemyPool.reset()
    spawnUnkillable(1, 0)
    const e2 = launchAt(lone, weapon)
    stepUntilHovering(lone)
    e2.flight.hoverMs = timeoutMs - DT * 1000 * 0.5
    stepProjectileSwarm(lone, DT)
    expect(e2.state).toBe(FLIGHT_FADING)
    expect(shouldStartFade({ hoverMs: timeoutMs }, FLIGHT_FLYING, timeoutMs)).toBe(false)
    expect(shouldStartFade({ hoverMs: timeoutMs }, FLIGHT_HOVERING, timeoutMs)).toBe(true)
  })

  it('never more than 1 alive: a 2nd throw waits and never removes the live one', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const first = launchAt(swarm, weapon)
    expect(first).toBeTruthy()
    expect(canLaunchProjectile(swarm)).toBe(false)
    // 대기 시간이 찬 것처럼 넘겨도 계획 단계에서 거절되고, 표적도 찾지 않는다.
    const finder = vi.fn(() => ({ rb: null, enemyId: 'x' }))
    expect(planOnigiriFrame({
      weapon, origin: { x: 0, y: 0.32, z: 0 }, findFreshTarget: finder, nextId: () => ++nextId,
      aliveCount: swarm.entries.length, maxAlive: 99, msSinceRetire: Number.POSITIVE_INFINITY,
    })).toBeNull()
    expect(finder).not.toHaveBeenCalled()
    // 계획을 건너뛰고 직접 넣어도 무리가 거절한다(최종 방어선). 살아 있는 것은 그대로다.
    const forced = { id: 999, start: [0, 0.32, 0], initialTarget: first.initialTarget, hitIds: [], maxBounces: 3, damage: 1, bounceRange: 3 }
    expect(addSwarmProjectile(swarm, forced, {})).toBeNull()
    expect(swarm.entries).toEqual([first])
  })

  it('a fading projectile still counts: nothing is thrown until it is gone', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const entry = launchAt(swarm, weapon)
    stepUntilHovering(swarm)
    entry.flight.hoverMs = timeoutMs
    stepProjectileSwarm(swarm, DT)
    expect(countFadingProjectiles(swarm)).toBe(1)
    expect(isProjectileSwarmReady(swarm, weapon)).toBe(false)
    expect(projectileCooldownRemainingMs(swarm, weapon)).toBeNull() // 대기 시간은 아직 시작도 안 했다
    expect(launchAt(swarm, weapon)).toBeNull()
  })

  it('the cooldown clock starts when the projectile disappears, not when it was thrown', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const lv1 = { ...weapon, cooldown: 10000 }
    const fire = () => {
      const launch = planOnigiriFrame({
        weapon: lv1, origin: { x: 0, y: 0.32, z: 0 }, swarm, nextId: () => ++nextId,
        findFreshTarget: (range) => pickNextOnigiriTarget({ from: { x: 0, z: 0 }, range }),
      })
      return launch && addSwarmProjectile(swarm, launch, {})
    }
    // 처음 얻은 순간에는 기다리지 않는다.
    expect(swarm.msSinceRetire).toBe(Number.POSITIVE_INFINITY)
    const entry = fire()
    expect(entry).toBeTruthy()
    // 오래 떠 있게 한다(던진 뒤 10초를 훌쩍 넘겨도 살아 있는 동안은 대기 시간이 흐르지 않는다).
    stepUntilHovering(swarm)
    let aliveMs = 0
    const retired = []
    while (swarm.entries.length) {
      stepProjectileSwarm(swarm, DT, { onRetire: (e, r) => retired.push(r) })
      aliveMs += DT * 1000
      expect(fire()).toBeNull()
    }
    expect(retired).toEqual([RETIRE_TIMEOUT])
    // 사라진 그 스텝에 시계가 0으로 맞춰졌다.
    expect(swarm.msSinceRetire).toBe(0)
    expect(projectileCooldownRemainingMs(swarm, lv1)).toBe(10000)
    // 사라진 뒤 10초(게임 시간)가 다 차는 스텝 전에는 던지지 않고, 다 차면 바로 던진다(부동소수 오차 1스텝 허용).
    let waited = 0
    let next = null
    while (!(next = fire())) {
      expect(swarm.msSinceRetire).toBeLessThan(10000)
      stepProjectileSwarm(swarm, DT)
      waited += 1
      expect(waited).toBeLessThanOrEqual(Math.round(10 / DT) + 1)
    }
    expect(waited).toBeGreaterThanOrEqual(Math.round(10 / DT))
    expect(swarm.msSinceRetire).toBeGreaterThanOrEqual(10000)
    expect(next).toBeTruthy()
    // 판 리셋·무기 재획득은 바로 던질 수 있는 처음 상태다.
    clearProjectileSwarm(swarm)
    expect(swarm.msSinceRetire).toBe(Number.POSITIVE_INFINITY)
  })

  it('a done (bounces spent) projectile also starts the clock at that moment', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const one = { ...weapon, bounces: 1, cooldown: 4750 }
    const launch = planOnigiriFrame({
      weapon: one, origin: { x: 0, y: 0.32, z: 0 }, swarm, nextId: () => ++nextId,
      findFreshTarget: (range) => pickNextOnigiriTarget({ from: { x: 0, z: 0 }, range }),
    })
    addSwarmProjectile(swarm, launch, {})
    const reasons = []
    for (let i = 0; i < 600 && swarm.entries.length; i += 1) stepProjectileSwarm(swarm, DT, { onRetire: (e, r) => reasons.push(r) })
    expect(reasons).toEqual([RETIRE_DONE])
    expect(swarm.msSinceRetire).toBe(0)
    expect(projectileCooldownRemainingMs(swarm, one)).toBe(4750)
  })

  it('cooldown never goes under 3 s, however low the weapon value is stacked', () => {
    const swarm = makeSwarm()
    swarm.msSinceRetire = 0
    for (const cooldown of [2999, 2088, 1000, 1, 0, -5]) {
      expect(projectileCooldownRemainingMs(swarm, { ...weapon, cooldown })).toBe(SINGLE_PROJECTILE_COOLDOWN_MIN_MS)
    }
    swarm.msSinceRetire = SINGLE_PROJECTILE_COOLDOWN_MIN_MS - 1
    expect(isProjectileSwarmReady(swarm, { ...weapon, cooldown: 1 })).toBe(false)
    swarm.msSinceRetire = SINGLE_PROJECTILE_COOLDOWN_MIN_MS
    expect(isProjectileSwarmReady(swarm, { ...weapon, cooldown: 1 })).toBe(true)
  })

  it('stress: max bonuses (bounces 99, cooldown 1 ms, asked cap 99), a crowd for 120 s — never more than 1 alive, every gap ≥ 3 s after disappearance', () => {
    for (let i = 0; i < 25; i += 1) spawnUnkillable(Math.cos(i) * (1 + i * 0.3), Math.sin(i) * (1 + i * 0.3))
    const swarm = createProjectileSwarm({ speed: SPEED, hoverTimeoutMs: timeoutMs, maxAlive: 99 })
    const maxed = { ...weapon, bounces: 99, cooldown: 1 }
    let launched = 0
    let clockMs = 0
    let lastRetireAt = null
    const fire = () => {
      const launch = planOnigiriFrame({
        weapon: maxed, origin: { x: 0, y: 0.32, z: 0 }, swarm, nextId: () => ++nextId, maxAlive: 99,
        findFreshTarget: (range) => pickNextOnigiriTarget({ from: { x: 0, z: 0 }, range }),
      })
      return launch && addSwarmProjectile(swarm, launch, {})
    }
    for (let i = 0; i < 120 * 60; i += 1) {
      if (fire()) {
        launched += 1
        if (lastRetireAt !== null) expect(clockMs - lastRetireAt).toBeGreaterThanOrEqual(SINGLE_PROJECTILE_COOLDOWN_MIN_MS - 1e-6)
      }
      stepProjectileSwarm(swarm, DT, { onRetire: () => { lastRetireAt = clockMs + DT * 1000 } })
      clockMs += DT * 1000
      expect(swarm.entries.length).toBeLessThanOrEqual(1)
    }
    expect(launched).toBeGreaterThan(3)
  })
})

describe('onigiri bounce cap (Terry 2026-11-22: "바운스 횟수가 최대 5회")', () => {
  it('a launch never carries more than 5 bounces, whatever the weapon state says', () => {
    expect(ONIGIRI_MAX_BOUNCES).toBe(5)
    spawnUnkillable(1, 0)
    for (const bounces of [1, 3, 5, 6, 12, 99]) {
      const plan = planOnigiriFrame({
        now: 1e9, lastFireAt: 0, weapon: { ...WEAPON_CATALOG.onigiri.base, bounces }, origin: { x: 0, y: 0.32, z: 0 },
        findFreshTarget: (range) => pickNextOnigiriTarget({ from: { x: 0, z: 0 }, range }),
        nextId: () => ++nextId, bounceCap: ONIGIRI_MAX_BOUNCES,
      })
      expect(plan.maxBounces).toBe(Math.min(5, bounces))
    }
  })

  it('a 5-bounce onigiri hits at most 5 different enemies and is done', () => {
    for (let i = 0; i < 9; i += 1) spawnUnkillable(1 + i * 0.6, 0)
    const swarm = createProjectileSwarm({ speed: SPEED })
    const plan = planOnigiriFrame({
      now: 1e9, lastFireAt: 0, weapon: { ...WEAPON_CATALOG.onigiri.base, bounces: 12 }, origin: { x: 0, y: 0.32, z: 0 },
      findFreshTarget: (range) => pickNextOnigiriTarget({ from: { x: 0, z: 0 }, range }),
      nextId: () => ++nextId, bounceCap: ONIGIRI_MAX_BOUNCES,
    })
    addSwarmProjectile(swarm, plan, {})
    let hits = 0
    const reasons = []
    for (let i = 0; i < 60 * 30 && swarm.entries.length; i += 1) {
      stepProjectileSwarm(swarm, DT, { onHit: () => { hits += 1 }, onRetire: (e, r) => reasons.push(r) })
    }
    expect(hits).toBe(5)
    expect(reasons).toEqual([RETIRE_DONE])
  })
})

describe('time is game time only', () => {
  it('counts only the delta it is stepped with — paused, level-up, dialogue, cutscene and hidden-tab frames never step it', () => {
    spawnUnkillable(1, 0)
    const weapon = { ...WEAPON_CATALOG.onigiri.base, active: true }
    const swarm = createProjectileSwarm({ speed: SPEED })
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
    const swarm = createProjectileSwarm({ speed: SPEED, hoverTimeoutMs: 1 })
    launchAt(swarm, { ...WEAPON_CATALOG.onigiri.base, bounces: 1 })
    const reasons = []
    for (let i = 0; i < 600 && swarm.entries.length; i += 1) stepProjectileSwarm(swarm, DT, { onRetire: (e, r) => reasons.push(r) })
    expect(reasons).toEqual([RETIRE_DONE])
  })
})
