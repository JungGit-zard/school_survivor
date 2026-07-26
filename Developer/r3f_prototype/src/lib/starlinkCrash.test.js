import { describe, expect, it } from 'vitest'
import {
  STARLINK_CRASH_FIRE_COUNT,
  CRASH_FALL_MS,
  CRASH_EXPLOSION_MS,
  CRASH_START_HEIGHT,
  CRASH_START_LATERAL,
  CRASH_LAND_MIN_DIST,
  CRASH_LAND_MAX_DIST,
  CRASH_TILT_RAD,
  ZOMLON_ESCAPE_SPEED,
  ZOMLON_MAX_ESCAPE_MS,
  advanceCrashCounter,
  pickCrashLandingPoint,
  selectCrashLandingPoint,
  refreshCrashLandingEnd,
  consumeCrashImpactEnd,
  getCrashPose,
  getCrashPhase,
  pickEscapeDirection,
  getZomlonPosition,
  isEscapeDone,
} from './starlinkCrash.js'

const BOUNDS = { minX: -10, maxX: 10, minZ: -8, maxZ: 8 }

describe('advanceCrashCounter', () => {
  it('15회째 발사에서만 trigger하고 카운터를 리셋한다 (새 위성 도착 간주)', () => {
    let state = { count: 0, trigger: false }
    const triggers = []
    for (let fire = 1; fire <= 30; fire++) {
      state = advanceCrashCounter(state.count)
      if (state.trigger) triggers.push(fire)
    }
    expect(triggers).toEqual([15, 30])
    expect(STARLINK_CRASH_FIRE_COUNT).toBe(15)
  })

  it('trigger 시 count는 0으로 돌아가 발사가 계속 이어질 수 있다', () => {
    expect(advanceCrashCounter(14)).toEqual({ count: 0, trigger: true })
    expect(advanceCrashCounter(0)).toEqual({ count: 1, trigger: false })
    expect(advanceCrashCounter(13)).toEqual({ count: 14, trigger: false })
  })
})

describe('pickCrashLandingPoint', () => {
  it('플레이어 기준 1.6~3.5 거리 안 무작위 지점을 고른다', () => {
    for (let i = 0; i < 40; i++) {
      const p = pickCrashLandingPoint(3, -2)
      const dist = Math.hypot(p.x - 3, p.z - (-2))
      expect(dist).toBeGreaterThanOrEqual(CRASH_LAND_MIN_DIST - 1e-9)
      expect(dist).toBeLessThanOrEqual(CRASH_LAND_MAX_DIST + 1e-9)
    }
  })

  it('주입된 rand로 결정적으로 동작한다', () => {
    const p = pickCrashLandingPoint(0, 0, () => 0)
    expect(p.x).toBeCloseTo(CRASH_LAND_MIN_DIST)
    expect(p.z).toBeCloseTo(0)
  })
})

describe('selectCrashLandingPoint', () => {
  const player = { x: 1, z: -2 }

  function body(type, x, z, { dead = false, live = true } = {}) {
    return {
      _enemyType: type,
      _enemyDead: dead,
      _enemyHit: live ? () => true : null,
      translation: () => ({ x, z }),
    }
  }

  it('화면 안의 살아 있는 보스를 정확히 선택하며 랜덤 낙하지점은 사용하지 않는다', () => {
    const random = () => { throw new Error('boss priority must not randomize') }
    const landing = selectCrashLandingPoint({
      playerPos: player,
      enemyBodies: new Map([
        ['normal', body('E01', 0, 0)],
        ['boss', body('B03', 4.25, -3.5)],
      ]),
      screenBounds: BOUNDS,
      random,
    })

    expect(landing).toEqual({ x: 4.25, z: -3.5, bossId: 'boss' })
  })

  it('여러 보스에서는 Map 삽입 순서와 무관하게 가장 작은 안정 ID를 선택한다', () => {
    const landing = selectCrashLandingPoint({
      playerPos: player,
      enemyBodies: new Map([
        ['boss-z', body('B04', 8, 7)],
        ['boss-a', body('B01', -4, 5)],
      ]),
      screenBounds: BOUNDS,
      random: () => 0,
    })

    expect(landing).toEqual({ x: -4, z: 5, bossId: 'boss-a' })
  })

  it('죽었거나 화면 밖이거나 보스가 아니거나 유효하지 않은 위치는 제외하고 플레이어 주변 랜덤 지점으로 대체한다', () => {
    const invalid = body('B02', Number.NaN, 0)
    const landing = selectCrashLandingPoint({
      playerPos: player,
      enemyBodies: new Map([
        ['dead', body('B01', 0, 0, { dead: true })],
        ['outside', body('B02', 11, 0)],
        ['normal', body('E01', 0, 0)],
        ['invalid', invalid],
      ]),
      screenBounds: BOUNDS,
      random: () => 0,
    })

    expect(landing).toEqual({ x: 1 + CRASH_LAND_MIN_DIST, z: -2, bossId: null })
  })

  it('skips an invalid Rapier boss without calling its translation function', () => {
    const translation = () => { throw new Error('invalid body translation must not run') }
    const landing = selectCrashLandingPoint({
      playerPos: player,
      enemyBodies: new Map([['invalid-boss', {
        _enemyType: 'B02', _enemyDead: false, _enemyHit: () => true,
        isValid: () => false, translation,
      }]]),
      screenBounds: BOUNDS,
      random: () => 0,
    })

    expect(landing).toEqual({ x: 1 + CRASH_LAND_MIN_DIST, z: -2, bossId: null })
  })
})

describe('consumeCrashImpactEnd', () => {
  it('returns the current mutable end exactly once on the landed transition', () => {
    const latestEnd = { x: 7, z: 4 }
    expect(consumeCrashImpactEnd(false, 'falling', latestEnd)).toBeNull()
    expect(consumeCrashImpactEnd(false, 'landed', latestEnd)).toBe(latestEnd)
    expect(consumeCrashImpactEnd(true, 'landed', latestEnd)).toBeNull()
  })
})

describe('refreshCrashLandingEnd', () => {
  it('keeps a selected live boss visually and combat-wise locked to its latest finite position without allocating a new end object', () => {
    let position = { x: 3, z: -2 }
    const bodies = new Map([[
      'boss-a', {
        _enemyDead: false,
        _enemyHit: () => true,
        translation: () => position,
      },
    ]])
    const end = { x: 3, z: -2 }

    expect(refreshCrashLandingEnd(end, 'boss-a', bodies)).toBe(true)
    expect(end).toEqual({ x: 3, z: -2 })

    position = { x: 7, z: 4 }
    expect(refreshCrashLandingEnd(end, 'boss-a', bodies)).toBe(true)
    expect(end).toEqual({ x: 7, z: 4 })

    bodies.delete('boss-a')
    expect(refreshCrashLandingEnd(end, 'boss-a', bodies)).toBe(false)
    expect(end).toEqual({ x: 7, z: 4 })
  })

  it('does not move a random landing point when no boss was selected', () => {
    const end = { x: 2, z: 3 }
    expect(refreshCrashLandingEnd(end, null, new Map())).toBe(false)
    expect(end).toEqual({ x: 2, z: 3 })
  })

  it('keeps the last end when the selected Rapier body becomes invalid without reading translation', () => {
    const end = { x: 7, z: 4 }
    const bodies = new Map([['boss-a', {
      _enemyDead: false, _enemyHit: () => true,
      isValid: () => false,
      translation: () => { throw new Error('invalid body translation must not run') },
    }]])

    expect(refreshCrashLandingEnd(end, 'boss-a', bodies)).toBe(false)
    expect(end).toEqual({ x: 7, z: 4 })
  })
})

describe('getCrashPose', () => {
  const end = { x: 2, z: -1 }

  it('uses the slower broken satellite fall duration', () => {
    expect(CRASH_FALL_MS).toBe(2700)
  })

  it('t=0: 화면 위 시작 고도 + 측면 오프셋에서 출발한다', () => {
    const pose = getCrashPose(end, 0)
    expect(pose.y).toBe(CRASH_START_HEIGHT)
    expect(pose.x).toBeCloseTo(end.x + CRASH_START_LATERAL.x)
    expect(pose.z).toBeCloseTo(end.z + CRASH_START_LATERAL.z)
  })

  it('t=1: 정확히 착지점(y=0)에 도달한다', () => {
    const pose = getCrashPose(end, 1)
    expect(pose.x).toBeCloseTo(end.x)
    expect(pose.y).toBe(0)
    expect(pose.z).toBeCloseTo(end.z)
  })

  it('ease-in: 전반부보다 후반부 낙하량이 크다 (중력 가속감)', () => {
    const early = CRASH_START_HEIGHT - getCrashPose(end, 0.5).y
    const late = getCrashPose(end, 0.5).y - getCrashPose(end, 1).y
    expect(late).toBeGreaterThan(early)
  })

  it('t는 0..1로 clamp되고 spin/tilt가 함께 보간된다', () => {
    expect(getCrashPose(end, -1)).toEqual(getCrashPose(end, 0))
    expect(getCrashPose(end, 2)).toEqual(getCrashPose(end, 1))
    expect(getCrashPose(end, 0).spin).toBe(0)
    expect(getCrashPose(end, 1).spin).toBeGreaterThan(Math.PI * 2)
    expect(CRASH_TILT_RAD).toBeCloseTo(Math.PI / 4)
    expect(getCrashPose(end, 0.5).tilt).toBeCloseTo(Math.PI / 4)
  })
})

describe('getCrashPhase', () => {
  it('낙하 시간 안에서는 falling + 진행도', () => {
    expect(getCrashPhase(0)).toEqual({ phase: 'falling', t: 0 })
    const mid = getCrashPhase(CRASH_FALL_MS / 2)
    expect(mid.phase).toBe('falling')
    expect(mid.t).toBeCloseTo(0.5)
  })

  it('착지 이후에는 landed + 폭발 진행도(1에서 clamp)', () => {
    const atLanding = getCrashPhase(CRASH_FALL_MS)
    expect(atLanding.phase).toBe('landed')
    expect(atLanding.t).toBe(0)
    expect(atLanding.explosionMs).toBe(0)

    const midExplosion = getCrashPhase(CRASH_FALL_MS + CRASH_EXPLOSION_MS / 2)
    expect(midExplosion.t).toBeCloseTo(0.5)

    const after = getCrashPhase(CRASH_FALL_MS + CRASH_EXPLOSION_MS * 3)
    expect(after.t).toBe(1)
    expect(after.explosionMs).toBe(CRASH_EXPLOSION_MS * 3)
  })
})

describe('pickEscapeDirection', () => {
  it('가장 가까운 화면 가장자리 방향을 고른다', () => {
    expect(pickEscapeDirection(-9, 0, BOUNDS)).toEqual({ x: -1, z: 0 })
    expect(pickEscapeDirection(9, 0, BOUNDS)).toEqual({ x: 1, z: 0 })
    expect(pickEscapeDirection(0, -7, BOUNDS)).toEqual({ x: 0, z: -1 })
    expect(pickEscapeDirection(0, 7, BOUNDS)).toEqual({ x: 0, z: 1 })
  })

  it('중앙에서도 항상 단위 방향 하나를 반환한다', () => {
    const dir = pickEscapeDirection(0, 0, BOUNDS)
    expect(Math.abs(dir.x) + Math.abs(dir.z)).toBe(1)
  })
})

describe('getZomlonPosition / isEscapeDone', () => {
  const origin = { x: 1, z: 2 }
  const dir = { x: 1, z: 0 }

  it('도주 경과 시간 × 속도만큼 직선 이동한다', () => {
    expect(getZomlonPosition(origin, dir, 0)).toEqual({ x: 1, z: 2 })
    expect(ZOMLON_ESCAPE_SPEED).toBe(3)
    expect(getZomlonPosition(origin, dir, 1000)).toEqual({ x: 4, z: 2 })
    expect(getZomlonPosition(origin, dir, 1000, 6)).toEqual({ x: 7, z: 2 })
    expect(getZomlonPosition(origin, { x: 0, z: -1 }, 500, 6)).toEqual({ x: 1, z: -1 })
  })

  it('화면 경계 + 마진 밖으로 나가면 종료된다', () => {
    expect(isEscapeDone({ x: 0, z: 0 }, BOUNDS, 100)).toBe(false)
    expect(isEscapeDone({ x: BOUNDS.maxX + 0.5, z: 0 }, BOUNDS, 100)).toBe(false) // 마진 안
    expect(isEscapeDone({ x: BOUNDS.maxX + 2, z: 0 }, BOUNDS, 100)).toBe(true)
    expect(isEscapeDone({ x: 0, z: BOUNDS.minZ - 2 }, BOUNDS, 100)).toBe(true)
  })

  it('최대 도주 시간을 넘기면 위치와 무관하게 종료된다 (안전 언마운트)', () => {
    expect(isEscapeDone({ x: 0, z: 0 }, BOUNDS, ZOMLON_MAX_ESCAPE_MS)).toBe(true)
  })
})
