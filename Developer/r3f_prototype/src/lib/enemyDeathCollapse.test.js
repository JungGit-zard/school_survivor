import { describe, expect, it } from 'vitest'
import {
  ENEMY_DEATH_COLLAPSE_FADE_START_MS,
  ENEMY_DEATH_COLLAPSE_LIFETIME_MS,
  ZOMBIE_COLLAPSE_PARTS,
  createCollapseMotion,
} from './enemyDeathCollapse.js'

describe('enemy death collapse body pieces', () => {
  it('uses zombie body parts instead of a tiny generic debris set', () => {
    const keys = ZOMBIE_COLLAPSE_PARTS.map((part) => part.key)

    expect(keys).toEqual(expect.arrayContaining([
      'head',
      'eyeL',
      'eyeR',
      'body',
      'armL',
      'handL',
      'armR',
      'handR',
      'legL',
      'footL',
      'legR',
      'footR',
    ]))
    expect(ZOMBIE_COLLAPSE_PARTS).toHaveLength(12)
  })

  it('fades after the body has started collapsing', () => {
    expect(ENEMY_DEATH_COLLAPSE_FADE_START_MS).toBeGreaterThan(300)
    expect(ENEMY_DEATH_COLLAPSE_LIFETIME_MS).toBeGreaterThan(ENEMY_DEATH_COLLAPSE_FADE_START_MS)
    expect(ENEMY_DEATH_COLLAPSE_LIFETIME_MS).toBeLessThanOrEqual(900)
  })

  it('creates downward collapse motion with slight part staggering', () => {
    const motion = createCollapseMotion({
      seed: 12.5,
      part: ZOMBIE_COLLAPSE_PARTS[4],
      index: 4,
    })

    expect(motion.y).toBeGreaterThan(0)
    expect(motion.gravity).toBeGreaterThan(8)
    expect(motion.delayMs).toBe(32)
    expect(Math.hypot(motion.x, motion.z)).toBeGreaterThan(0.2)
  })
})
