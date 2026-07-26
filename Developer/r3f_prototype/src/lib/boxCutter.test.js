import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPointInBoxCutterStrike, pickBoxCutterTargets, ENEMY_HIT_PAD } from './boxCutter.js'
import { enemyBodies, enemyPool } from './refs.js'

afterEach(() => {
  enemyBodies.clear()
  enemyPool.reset()
})

function spawnPooledEnemy(x, z, hit = vi.fn()) {
  const handle = enemyPool.spawn({ type: 'E01', x, y: 0, z, hp: 10, maxHp: 10 })
  enemyPool.setHitHandler(handle, hit)
  return { handle, hit }
}

describe('box cutter strike targeting', () => {
  const origin = { x: 0, z: 0 }
  const facing = { x: 0, z: 1 }

  it('hits enemies in a narrow forward stab lane', () => {
    expect(isPointInBoxCutterStrike({
      origin,
      facing,
      point: { x: 0.08, z: 0.55 },
      range: 0.85,
      width: 0.22,
    })).toBe(true)
  })

  it('uses the boosted default range when range is omitted', () => {
    expect(isPointInBoxCutterStrike({
      origin,
      facing,
      point: { x: 0.04, z: 1.2 },
      width: 0.22,
    })).toBe(true)
  })

  it('rejects enemies behind or outside the narrow lane', () => {
    expect(isPointInBoxCutterStrike({
      origin,
      facing,
      point: { x: 0, z: -0.2 },
      range: 0.85,
      width: 0.22,
    })).toBe(false)

    expect(isPointInBoxCutterStrike({
      origin,
      facing,
      point: { x: 0.3, z: 0.55 },
      range: 0.85,
      width: 0.22,
    })).toBe(false)
  })

  it('weapon level 1 stats (range 1.4, width 0.18) — hits inside lane', () => {
    // 카탈로그 base: range 1.4 (0.7의 2배), width 0.18
    expect(isPointInBoxCutterStrike({ origin, facing, point: { x: 0.04, z: 1.2 }, range: 1.4, width: 0.18 })).toBe(true)
  })

  it('weapon level 1 stats — rejects beyond range 1.4', () => {
    expect(isPointInBoxCutterStrike({ origin, facing, point: { x: 0.04, z: 1.45 }, range: 1.4, width: 0.18 })).toBe(false)
  })

  it('weapon level 1 stats — rejects beyond narrow width 0.18', () => {
    expect(isPointInBoxCutterStrike({ origin, facing, point: { x: 0.12, z: 1.0 }, range: 1.4, width: 0.18 })).toBe(false)
  })

  it('returns only living enemy targets inside the forward cutter lane', () => {
    const enemies = new Map([
      ['front', { _enemyHit: () => {}, _enemyDead: false, translation: () => ({ x: 0.04, z: 0.62 }) }],
      ['wide', { _enemyHit: () => {}, _enemyDead: false, translation: () => ({ x: 0.38, z: 0.62 }) }],
      ['dead', { _enemyHit: () => {}, _enemyDead: true, translation: () => ({ x: 0, z: 0.5 }) }],
    ])

    const targets = pickBoxCutterTargets({ enemies, origin, facing, range: 0.85, width: 0.22 })

    expect(targets.map((target) => target.enemyId)).toEqual(['front'])
  })

  it('does not select a target hidden behind a prop', () => {
    const enemies = new Map([
      ['front', { _enemyHit: () => {}, _enemyDead: false, translation: () => ({ x: 0.04, z: 0.62 }) }],
    ])

    const targets = pickBoxCutterTargets({
      enemies,
      origin,
      facing,
      range: 0.85,
      width: 0.22,
      sightBlocker: () => true,
    })

    expect(targets).toEqual([])
  })

  it('hits a pooled standard enemy directly in front of the player', () => {
    const pooled = spawnPooledEnemy(0.04, 0.62)

    const targets = pickBoxCutterTargets({ origin, facing, range: 0.85, width: 0.22 })

    expect(targets).toHaveLength(1)
    expect(targets[0].rb).toBe(enemyPool.get(pooled.handle))
    expect(targets[0].generation).toBe(pooled.handle.generation)
  })

  it('accepts a pooled enemy whose center is outside the raw lane but within ENEMY_HIT_PAD (radius padding)', () => {
    // width 0.18 → 반폭 0.09. 좀비 중심을 0.09~(0.09+PAD) 사이에 두면, 패딩 없이는 탈락하지만
    // pickBoxCutterTargets는 ENEMY_HIT_PAD(E01 콜라이더 반폭)만큼 옆으로 넓혀 판정해야 한다.
    const lateral = 0.09 + ENEMY_HIT_PAD / 2
    const pooled = spawnPooledEnemy(lateral, 0.62)

    expect(isPointInBoxCutterStrike({ origin, facing, point: { x: lateral, z: 0.62 }, range: 1.4, width: 0.18 })).toBe(false)

    const targets = pickBoxCutterTargets({ origin, facing, range: 1.4, width: 0.18 })

    expect(targets.map((t) => t.rb)).toContain(enemyPool.get(pooled.handle))
  })

  it('does not double-count a pooled proxy that is also duplicated in the Map', () => {
    const pooled = spawnPooledEnemy(0.04, 0.62)
    enemyBodies.set('dup', enemyPool.get(pooled.handle))

    const targets = pickBoxCutterTargets({ origin, facing, range: 0.85, width: 0.22 })

    expect(targets).toHaveLength(1)
  })
})
