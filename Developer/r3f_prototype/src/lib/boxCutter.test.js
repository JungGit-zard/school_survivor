import { describe, expect, it } from 'vitest'
import { isPointInBoxCutterStrike, pickBoxCutterTargets } from './boxCutter.js'

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

  it('returns only living enemy targets inside the forward cutter lane', () => {
    const enemies = new Map([
      ['front', { _enemyHit: () => {}, _enemyDead: false, translation: () => ({ x: 0.04, z: 0.62 }) }],
      ['wide', { _enemyHit: () => {}, _enemyDead: false, translation: () => ({ x: 0.38, z: 0.62 }) }],
      ['dead', { _enemyHit: () => {}, _enemyDead: true, translation: () => ({ x: 0, z: 0.5 }) }],
    ])

    const targets = pickBoxCutterTargets({ enemies, origin, facing, range: 0.85, width: 0.22 })

    expect(targets.map((target) => target.enemyId)).toEqual(['front'])
  })
})
