import { describe, expect, it } from 'vitest'
import { getStageObjectSightObstacles } from '../components/StageObjects/stageObjectColliders.js'
import { getStageBounds } from './stageConfig.js'
import {
  advanceB04SoupBlast,
  B04_SOUP_BLAST_EXPLOSION_MS,
  consumeB04SoupBlastHit,
  createB04SoupBlastState,
  getB04SoupBlastCircles,
  getB04SoupBlastTrigger,
  startB04SoupBlast,
} from './b04SoupBlast.js'

describe('B04 국물 대폭발', () => {
  it('50% 전환은 200초 전 한 번만 발동하고 200초부터는 기존 P2로 우회한다', () => {
    const state = createB04SoupBlastState()
    expect(getB04SoupBlastTrigger({ hpRatio: 0.5, elapsedMs: 199_999, state })).toBe(true)
    expect(getB04SoupBlastTrigger({ hpRatio: 0.5, elapsedMs: 200_000, state })).toBe(false)
    expect(getB04SoupBlastTrigger({ hpRatio: 0.5, elapsedMs: 100, state: startB04SoupBlast(state, []) })).toBe(false)
  })

  it('세 원은 경계·장애물을 피하고 서로 겹치지 않으며 중심 안전 경로를 남긴다', () => {
    const circles = getB04SoupBlastCircles({ player: { x: 0, z: 0 }, halfX: 14.4, halfZ: 16, obstacles: [{ x: 3.2, z: 0, halfX: 1, halfZ: 1 }] })
    expect(circles).toHaveLength(3)
    expect(circles.every((circle) => Math.abs(circle.x) < 14.4 && Math.abs(circle.z) < 16)).toBe(true)
    for (let i = 0; i < circles.length; i += 1) for (let j = i + 1; j < circles.length; j += 1) {
      expect(Math.hypot(circles[i].x - circles[j].x, circles[i].z - circles[j].z)).toBeGreaterThan(circles[i].radius * 2)
    }
    expect(circles.every((circle) => Math.hypot(circle.x, circle.z) > circle.radius)).toBe(true)
  })

  it('uses the actual Stage4 obstacle layout to always create three valid circles', () => {
    const bounds = getStageBounds('stage4')
    const obstacles = getStageObjectSightObstacles('stage4')
    for (const player of [{ x: 0, z: 0 }, { x: -13, z: -14.5 }, { x: 13, z: -14.5 }, { x: -13, z: 14.5 }, { x: 13, z: 14.5 }, { x: 0, z: 14.5 }]) {
      const circles = getB04SoupBlastCircles({ player, ...bounds, obstacles })
      expect(circles).toHaveLength(3)
      for (const circle of circles) {
        expect(Math.abs(circle.x)).toBeLessThanOrEqual(bounds.halfX - circle.radius)
        expect(Math.abs(circle.z)).toBeLessThanOrEqual(bounds.halfZ - circle.radius)
        expect(obstacles.some((obstacle) => Math.abs(circle.x - obstacle.x) < circle.radius + obstacle.halfX && Math.abs(circle.z - obstacle.z) < circle.radius + obstacle.halfZ)).toBe(false)
      }
      for (let i = 0; i < circles.length; i += 1) for (let j = i + 1; j < circles.length; j += 1) {
        expect(Math.hypot(circles[i].x - circles[j].x, circles[i].z - circles[j].z)).toBeGreaterThan(circles[i].radius * 2)
      }
    }
  })

  it('1.2초 뒤 동시 폭발은 250ms 동안 보이며 최대 한 번 16 피해 후 P2 전환 준비로 끝난다', () => {
    let state = startB04SoupBlast(createB04SoupBlastState(), [{ x: 2, z: 0, radius: 1 }])
    state = advanceB04SoupBlast(state, 1_200)
    expect(state.phase).toBe('explode')
    const hit = consumeB04SoupBlastHit(state, { x: 2, z: 0 })
    expect(hit.damage).toBe(16)
    expect(consumeB04SoupBlastHit(hit.state, { x: 2, z: 0 }).damage).toBe(0)
    expect(advanceB04SoupBlast(hit.state, B04_SOUP_BLAST_EXPLOSION_MS - 1).phase).toBe('explode')
    expect(advanceB04SoupBlast(hit.state, B04_SOUP_BLAST_EXPLOSION_MS).phase).toBe('done')
  })
})
