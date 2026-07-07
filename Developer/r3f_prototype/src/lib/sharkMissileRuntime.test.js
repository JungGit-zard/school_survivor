import { describe, expect, it } from 'vitest'
import { SHARK_DART, canFireSharkMissile, createSharkMissileLaunch, isSharkHomingPhase, pickSharkWanderPoint, shortestAngleDelta } from './sharkMissileRuntime.js'

describe('shark missile runtime firing rules', () => {
  const activeWeapon = {
    active: true,
    cooldown: 7000,
    damage: 30,
    radius: 1.8,
    range: 28,
    speed: 8.5,
    retargetIntervalMs: 300,
  }

  it('can fire immediately when the weapon is active and no missile has been launched yet', () => {
    expect(canFireSharkMissile({
      phase: 'playing',
      weapon: activeWeapon,
      nowMs: 250,
      lastFireMs: null,
      activeMissileCount: 0,
    })).toBe(true)
  })

  it('waits for cooldown after the first launch', () => {
    expect(canFireSharkMissile({
      phase: 'playing',
      weapon: activeWeapon,
      nowMs: 5_000,
      lastFireMs: 0,
      activeMissileCount: 0,
    })).toBe(false)

    expect(canFireSharkMissile({
      phase: 'playing',
      weapon: activeWeapon,
      nowMs: 7_000,
      lastFireMs: 0,
      activeMissileCount: 0,
    })).toBe(true)
  })

  it('does not fire outside playing phase or while another shark missile is active', () => {
    expect(canFireSharkMissile({
      phase: 'title',
      weapon: activeWeapon,
      nowMs: 30_000,
      lastFireMs: null,
      activeMissileCount: 0,
    })).toBe(false)

    expect(canFireSharkMissile({
      phase: 'playing',
      weapon: activeWeapon,
      nowMs: 30_000,
      lastFireMs: null,
      activeMissileCount: 1,
    })).toBe(false)
  })

  it('builds the in-game launch payload from the player and cluster target', () => {
    expect(createSharkMissileLaunch({
      id: 7,
      playerPosition: { x: 1, y: 0.2, z: -3 },
      target: { x: 5, z: -8 },
      weapon: activeWeapon,
    })).toEqual({
      id: 7,
      start: [1, 0.66, -3],
      initialTarget: { x: 5, z: -8 },
      damage: 30,
      radius: 1.8,
      range: 28,
      speed: 8.5,
      retargetIntervalMs: 300,
    })
  })

  it('keeps homing yaw stable when the missile is already facing the target', () => {
    expect(shortestAngleDelta(0, 0)).toBeCloseTo(0)
    expect(shortestAngleDelta(Math.PI / 2, Math.PI / 2)).toBeCloseTo(0)
  })

  it('uses the shortest wraparound yaw turn near the -pi/pi boundary', () => {
    expect(shortestAngleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2)
    expect(shortestAngleDelta(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(-0.2)
  })
})

describe('shark missile dart flight plan (기획 정본)', () => {
  it('총 비행 시간은 1.5초, 마지막 0.45초만 밀집점 귀소', () => {
    expect(SHARK_DART.DURATION_SEC).toBe(1.5)
    expect(isSharkHomingPhase(0)).toBe(false)
    expect(isSharkHomingPhase(1.0)).toBe(false)
    expect(isSharkHomingPhase(SHARK_DART.HOMING_START_SEC)).toBe(true)
    expect(isSharkHomingPhase(1.4)).toBe(true)
  })

  it('비행 속도는 절반(9)이며, 귀소 커버 거리는 4.05유닛(밀집점에 못 닿을 수 있음)', () => {
    // 사용자 요청 사양: 발사 후 비행 속도 절반(18→9), 총 비행 1.5s 유지.
    expect(SHARK_DART.SPEED).toBe(9)
    // 귀소 구간(잔여시간 × 속도)이 짧아 먼 밀집점엔 다 못 닿는다. 이 경우
    // 1.5s 만료 시 그 위치(밀집지역 근방)에서 폭발 — 의도된 사양이다.
    const homingReach = (SHARK_DART.DURATION_SEC - SHARK_DART.HOMING_START_SEC) * SHARK_DART.SPEED
    expect(homingReach).toBeCloseTo(4.05)
  })

  it('방랑 웨이포인트는 항상 화면 경계 안(여백 1유닛)에 생성된다', () => {
    const bounds = { minX: -8, maxX: 8, minZ: -12, maxZ: 12 }
    let s = 7
    const random = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
    for (let i = 0; i < 200; i++) {
      const p = pickSharkWanderPoint(bounds, random)
      expect(p.x).toBeGreaterThanOrEqual(bounds.minX + 1)
      expect(p.x).toBeLessThanOrEqual(bounds.maxX - 1)
      expect(p.z).toBeGreaterThanOrEqual(bounds.minZ + 1)
      expect(p.z).toBeLessThanOrEqual(bounds.maxZ - 1)
    }
  })

  it('레벨1 공격력 기본값은 보조배터리(16)의 1.3배', () => {
    const launch = createSharkMissileLaunch({
      id: 1,
      playerPosition: { x: 0, y: 0, z: 0 },
      target: { x: 1, z: 1 },
      weapon: { radius: 1.8, range: 28 }, // damage 미지정 → 기본값
    })
    expect(launch.damage).toBe(16 * 1.3)
  })
})
