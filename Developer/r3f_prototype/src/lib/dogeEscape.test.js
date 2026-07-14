import { describe, it, expect } from 'vitest'
import {
  DOGE_DANCE_HOLD_MS,
  DOGE_ESCAPE_SPEED,
  DOGE_ESCAPE_MARGIN,
  dogeEscapeDirection,
  dogeHasEscaped,
} from './dogeEscape.js'
import { getStageBounds } from './stageConfig.js'

const CENTER = [0, 0, 0]

describe('doge escape (황금고블린 도주 로직)', () => {
  it('escapes toward the nearest boundary axis (stage1: ±x, halfX 10 < halfZ 14.4)', () => {
    const bounds = getStageBounds('stage1')
    expect(dogeEscapeDirection(CENTER, bounds, () => 0.9)).toEqual([1, 0])
    expect(dogeEscapeDirection(CENTER, bounds, () => 0.1)).toEqual([-1, 0])
  })

  it('picks the z axis when the z boundary is nearer', () => {
    const bounds = { halfX: 10, halfZ: 10 }
    // x쪽 잔여 9, z쪽 잔여 2 → z축 도주.
    expect(dogeEscapeDirection([1, 0, 8], bounds, () => 0.9)).toEqual([0, 1])
  })

  it('is decisively slower than the slowest zombie (E01 0.475) and stays catchable', () => {
    expect(DOGE_ESCAPE_SPEED).toBeLessThan(0.475)
    // 스폰 후 제자리 춤 유지가 존재해 플레이어에게 반응 시간을 준다.
    expect(DOGE_DANCE_HOLD_MS).toBeGreaterThanOrEqual(1000)
  })

  it('takes roughly 15-25s from center to the nearest stage1 boundary', () => {
    const { halfX } = getStageBounds('stage1') // 최근접 경계 10u
    const travelSec = halfX / DOGE_ESCAPE_SPEED
    expect(travelSec).toBeGreaterThanOrEqual(15)
    expect(travelSec).toBeLessThanOrEqual(25)
  })

  it('does not despawn inside the map or exactly at the boundary (margin grace)', () => {
    const bounds = getStageBounds('stage1')
    expect(dogeHasEscaped([0, 0, 0], bounds)).toBe(false)
    expect(dogeHasEscaped([bounds.halfX, 0, 0], bounds)).toBe(false)        // 경계선상 — 유예
    expect(dogeHasEscaped([bounds.halfX + DOGE_ESCAPE_MARGIN, 0, 0], bounds)).toBe(true)
    expect(dogeHasEscaped([0, 0, -(bounds.halfZ + DOGE_ESCAPE_MARGIN)], bounds)).toBe(true)
  })

  it('linear walk simulation escapes at the expected time and never earlier', () => {
    const bounds = getStageBounds('stage1')
    const dir = dogeEscapeDirection(CENTER, bounds, () => 0.9) // [1, 0]
    const pos = [...CENTER]
    const dt = 1 / 60
    let escapedAt = null
    for (let t = 0; t < 40 && escapedAt === null; t += dt) {
      pos[0] += dir[0] * DOGE_ESCAPE_SPEED * dt
      pos[2] += dir[1] * DOGE_ESCAPE_SPEED * dt
      if (dogeHasEscaped(pos, bounds)) escapedAt = t
    }
    // (halfX + margin) / speed = (10 + 0.6) / 0.4 = 26.5s
    expect(escapedAt).toBeGreaterThan(26)
    expect(escapedAt).toBeLessThan(27)
  })
})
