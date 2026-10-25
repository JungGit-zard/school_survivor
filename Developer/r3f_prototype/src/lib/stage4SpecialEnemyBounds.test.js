import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ENEMY_STATS, getEnemyColliderHalfExtents, resolveRangedEnemyVelocity, writeSpecialEnemyVelocityWithinStageBounds } from '../components/Enemy.jsx'
import { getStageBounds } from './stageConfig.js'

const bounds = getStageBounds('stage4')
const halfExtents = getEnemyColliderHalfExtents(ENEMY_STATS.B04)
const [halfWidth, , halfDepth] = halfExtents
const delta = 1 / 30
const enemySource = readFileSync(new URL('../components/Enemy.jsx', import.meta.url), 'utf8')

describe('Stage 4 B04 lateral-boundary regression', () => {
  it.each([
    ['right (+X)', halfWidth, 1, -1],
    ['left (-X)', -halfWidth, -1, 1],
  ])('keeps B04 targetable at the %s combat edge', (_side, edgeSign, strafeSign, playerSign) => {
    const edgeX = bounds.halfX - halfWidth
    const positionX = edgeSign > 0 ? edgeX : -edgeX
    const velocity = resolveRangedEnemyVelocity({
      dirX: 0,
      dirZ: -5,
      dist: 5,
      minDist: 3,
      preferDist: 5,
      speed: 1.6,
      strafeSign,
    })
    const playerX = positionX + playerSign * 2.25
    const rawNextX = positionX + velocity.x * delta
    const boundedVelocity = { x: 0, z: 0 }
    writeSpecialEnemyVelocityWithinStageBounds(
      boundedVelocity,
      { x: positionX, z: 0 },
      velocity,
      bounds,
      halfExtents,
      delta,
    )

    const nextX = positionX + boundedVelocity.x * delta

    // Right (+X) preserves the original exact target-loss evidence: 2.25 -> 2.29.
    expect(Math.abs(rawNextX - playerX)).toBeCloseTo(2.29, 12)
    expect(Math.abs(nextX - playerX)).toBeLessThanOrEqual(2.25)
    expect(nextX).toBeGreaterThanOrEqual(-edgeX)
    expect(nextX).toBeLessThanOrEqual(edgeX)
  })

  it.each([
    ['north (+Z)', 1],
    ['south (-Z)', -1],
  ])('does not permit an outward helper velocity at the %s combat edge', (_side, sign) => {
    const edgeZ = bounds.halfZ - halfDepth
    const boundedVelocity = { x: 0, z: 0 }
    writeSpecialEnemyVelocityWithinStageBounds(
      boundedVelocity,
      { x: 0, z: sign * edgeZ },
      { x: 0, z: sign * 4 },
      bounds,
      halfExtents,
      delta,
    )

    expect(boundedVelocity.x).toBe(0)
    expect(boundedVelocity.z).toBe(0)
  })

  it.each([
    ['B04', ENEMY_STATS.B04],
    ['Stage 4 Matilda (B01 collider)', ENEMY_STATS.B01],
  ])('blocks an outward knockback velocity for %s using its own collider extents', (_name, stats) => {
    const extents = getEnemyColliderHalfExtents(stats)
    const edgeX = bounds.halfX - extents[0]
    const boundedVelocity = { x: 0, z: 0 }
    writeSpecialEnemyVelocityWithinStageBounds(
      boundedVelocity,
      { x: edgeX, z: 0 },
      { x: 3.8, z: 0 },
      bounds,
      extents,
      delta,
    )

    expect(boundedVelocity).toEqual({ x: 0, z: 0 })
  })

  it('queues hit knockback for the frame-boundary path instead of setting direct Rapier velocity', () => {
    const hitStart = enemySource.indexOf('rb.current._enemyHit =')
    const hitEnd = enemySource.indexOf('hpRef.current -= finalDamage', hitStart)
    const hitCallback = enemySource.slice(hitStart, hitEnd)
    // 넉백은 벽시계 기한(knockbackUntilRef)에서 pause 안전한 잔량(knockbackRemainingRef)으로
    // 바뀌었다. 이 검사의 의도는 이름이 아니라 "히트 콜백은 큐에 넣기만 하고 직접
    // setLinvel하지 않는다 / 프레임 경로는 경계 보정을 거친다"는 것이라 그대로 유지한다.
    const knockbackFrameStart = enemySource.indexOf('if (knockbackRemainingRef.current > 0)')
    const knockbackFrameEnd = enemySource.indexOf('const elapsedMs', knockbackFrameStart)
    const knockbackFrame = enemySource.slice(knockbackFrameStart, knockbackFrameEnd)

    expect(hitCallback).toContain('knockbackRemainingRef.current')
    expect(hitCallback).not.toContain('setLinvel')
    expect(knockbackFrame).toContain('applySpecialEnemyVelocity()')
  })
})
