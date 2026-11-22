import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FLIGHT_FADING, FLIGHT_FLYING, FLIGHT_HOVERING, MINI_ROSARI_HOVER_TIMEOUT_MS, MINI_ROSARI_MAX_ALIVE,
  ONIGIRI_HOVER_TIMEOUT_MS, ONIGIRI_MAX_ALIVE, PROJECTILE_FADE_MS, PROJECTILE_MAX_ALIVE, PROJECTILE_NO_TARGET_TIMEOUT_MS,
  RETIRE_DONE, RETIRE_TIMEOUT, addSwarmProjectile, canLaunchProjectile, countFadingProjectiles, countHoveringProjectiles,
  createProjectileSwarm, planOnigiriFrame, pickNextOnigiriTarget, projectileFadeProgress, shouldStartFade,
  stepOnigiriFlight, stepProjectileSwarm,
} from './onigiri.js'
import { ONIGIRI_MAX_BOUNCES, WEAPON_CATALOG } from './weaponCatalog.js'
import { enemyBodies as globalEnemyBodies, enemyPool } from './refs.js'

// 2026-11-22 Terry "주먹밥, 미니로자리를 정리하자" — 무기마다 화면 최대 3개(모든 상태), 3개면 던지지 않고 기다림,
// 표적 없이 3초면 그 자리에서 스르륵(0.4초) 사라짐. 11-13 "오니기리 12초/24개, 꼬마 로자리 8초/8개"를 대체한다.
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
])('%s: 3 on screen, 3s no-target fade (Terry 2026-11-22)', (weaponId, timeoutMs, maxAlive) => {
  const weapon = { ...WEAPON_CATALOG[weaponId].base, active: true }
  const makeSwarm = () => createProjectileSwarm({ speed: SPEED, hoverTimeoutMs: timeoutMs, maxAlive })

  it('uses the ruled numbers: 3 alive, 3s timeout, 0.3–0.5s fade', () => {
    expect([timeoutMs, maxAlive]).toEqual([3000, 3])
    expect(PROJECTILE_MAX_ALIVE).toBe(3)
    expect(PROJECTILE_NO_TARGET_TIMEOUT_MS).toBe(3000)
    expect(PROJECTILE_FADE_MS).toBeGreaterThanOrEqual(300)
    expect(PROJECTILE_FADE_MS).toBeLessThanOrEqual(500)
    // 기본값도 같은 규칙이다(무기가 값을 안 넘겨도 3개·3초).
    const swarm = createProjectileSwarm({ speed: SPEED })
    expect([swarm.maxAlive, swarm.hoverTimeoutMs, swarm.fadeMs]).toEqual([3, 3000, PROJECTILE_FADE_MS])
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

  it('never more than 3 alive: a 4th throw waits and never removes a live projectile', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    const first = [launchAt(swarm, weapon), launchAt(swarm, weapon), launchAt(swarm, weapon)]
    expect(first.every(Boolean)).toBe(true)
    expect(canLaunchProjectile(swarm)).toBe(false)
    // 쿨다운이 찬 상태로 다시 던져 봐도 계획 단계에서 거절되고, 표적도 찾지 않는다.
    const finder = vi.fn(() => ({ rb: null, enemyId: 'x' }))
    expect(planOnigiriFrame({
      now: 1e9, lastFireAt: 0, weapon, origin: { x: 0, y: 0.32, z: 0 }, findFreshTarget: finder,
      nextId: () => ++nextId, aliveCount: swarm.entries.length, maxAlive: swarm.maxAlive,
    })).toBeNull()
    expect(finder).not.toHaveBeenCalled()
    // 계획을 건너뛰고 직접 넣어도 무리가 거절한다(최종 방어선). 살아 있는 것은 그대로다.
    const forced = { id: 999, start: [0, 0.32, 0], initialTarget: first[0].initialTarget, hitIds: [], maxBounces: 3, damage: 1, bounceRange: 3 }
    expect(addSwarmProjectile(swarm, forced, {})).toBeNull()
    expect(swarm.entries).toEqual(first)
  })

  it('the waiting throw fires on the first step after one disappears (fade included in the count)', () => {
    spawnUnkillable(1, 0)
    const swarm = makeSwarm()
    for (let k = 0; k < 3; k += 1) launchAt(swarm, weapon)
    stepUntilHovering(swarm)
    // 3개 모두 사라지는 중이어도 자리는 나지 않는다.
    for (const e of swarm.entries) e.flight.hoverMs = timeoutMs
    stepProjectileSwarm(swarm, DT)
    expect(countFadingProjectiles(swarm)).toBe(3)
    expect(launchAt(swarm, weapon)).toBeNull()
    let freedAt = null
    for (let i = 0; i < 120 && freedAt === null; i += 1) {
      stepProjectileSwarm(swarm, DT)
      if (canLaunchProjectile(swarm)) freedAt = i
    }
    expect(freedAt).not.toBeNull()
    // 자리가 난 바로 그 스텝 뒤의 투척이 들어간다(다음 쿨다운까지 기다리지 않는다 — 쿨다운은 이미 찼다).
    expect(launchAt(swarm, weapon)).not.toBeNull()
    expect(swarm.entries.length).toBeLessThanOrEqual(3)
  })

  it('stress: max level, cooldown 1ms, a crowd of unkillable enemies for 60s — never more than 3 alive', () => {
    for (let i = 0; i < 25; i += 1) spawnUnkillable(Math.cos(i) * (1 + i * 0.3), Math.sin(i) * (1 + i * 0.3))
    const swarm = makeSwarm()
    const maxed = { ...weapon, bounces: 99, cooldown: 1 }
    let launched = 0
    let max = 0
    for (let i = 0; i < 60 * 60; i += 1) {
      if (launchAt(swarm, maxed)) launched += 1
      stepProjectileSwarm(swarm, DT)
      max = Math.max(max, swarm.entries.length)
      expect(swarm.entries.length).toBeLessThanOrEqual(3)
    }
    expect(max).toBe(3)
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
