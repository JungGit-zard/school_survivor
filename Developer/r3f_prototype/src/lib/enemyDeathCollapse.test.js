import { describe, expect, it } from 'vitest'
import {
  COLLAPSE_INTENSITY_STYLE,
  ENEMY_DEATH_COLLAPSE_FADE_START_MS,
  ENEMY_DEATH_COLLAPSE_LIFETIME_MS,
  ENEMY_DEATH_COLLAPSE_STYLES,
  ZOMBIE_COLLAPSE_PARTS,
  collapsePieceScaleForStyle,
  collapseStyleForIntensity,
  createCollapseMotion,
  pickEnemyDeathCollapseStyle,
  resolveCollapseIntensity,
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
      style: 'bodyCollapse',
    })

    expect(motion.y).toBeGreaterThan(0)
    expect(motion.gravity).toBeGreaterThan(8)
    expect(motion.delayMs).toBe(32)
    expect(Math.hypot(motion.x, motion.z)).toBeGreaterThan(0.2)
  })

  it('chooses between the restored three death effects', () => {
    expect(ENEMY_DEATH_COLLAPSE_STYLES).toEqual(['bodyCollapse', 'scatter', 'crumble'])
    expect(pickEnemyDeathCollapseStyle(0)).toBe('bodyCollapse')
    expect(pickEnemyDeathCollapseStyle(0.34)).toBe('scatter')
    expect(pickEnemyDeathCollapseStyle(0.99)).toBe('crumble')
  })

  it('restores the scatter shatter motion', () => {
    const motion = createCollapseMotion({
      seed: 12.5,
      part: ZOMBIE_COLLAPSE_PARTS[0],
      index: 0,
      style: 'scatter',
    })

    expect(motion.gravity).toBe(0)
    expect(motion.distanceScale).toBe(1)
    expect(motion.linearDamping).toBeLessThan(1.3)
    expect(Math.hypot(motion.x, motion.z)).toBeGreaterThan(4)
    expect(motion.y).toBeGreaterThan(1.5)
  })

  it('restores the in-place crumble motion', () => {
    const motion = createCollapseMotion({
      seed: 12.5,
      part: ZOMBIE_COLLAPSE_PARTS[3],
      index: 3,
      style: 'crumble',
    })

    expect(motion.gravity).toBeGreaterThan(12)
    expect(Math.hypot(motion.x, motion.z)).toBeLessThan(1)
    expect(motion.delayMs).toBe(30)
  })
})

describe('death shatter intensity by killing-hit power', () => {
  it('maps each intensity to weak/medium/strong shatter styles', () => {
    expect(COLLAPSE_INTENSITY_STYLE).toEqual({
      weak: 'crumble',
      medium: 'bodyCollapse',
      strong: 'scatter',
    })
    expect(collapseStyleForIntensity('weak')).toBe('crumble')
    expect(collapseStyleForIntensity('medium')).toBe('bodyCollapse')
    expect(collapseStyleForIntensity('strong')).toBe('scatter')
    // unknown/undefined falls back to the medium style
    expect(collapseStyleForIntensity(undefined)).toBe('bodyCollapse')
  })

  it('weak: a light finishing hit relative to max HP, no knockback', () => {
    // pencil-class: 5 dmg on an 8 HP zombie, knockback 0
    expect(resolveCollapseIntensity({ killingDamage: 5, maxHp: 8, knockback: 0 })).toBe('weak')
    // chip damage on a tanky enemy
    expect(resolveCollapseIntensity({ killingDamage: 5, maxHp: 320, knockback: 0 })).toBe('weak')
  })

  it('strong: a heavy/explosive finishing hit (high damage ratio and/or knockback)', () => {
    // bell-class blast: high knockback finishing a weak zombie
    expect(resolveCollapseIntensity({ killingDamage: 10, maxHp: 8, knockback: 4.8 })).toBe('strong')
    // box cutter: large damage relative to max HP plus some knockback
    expect(resolveCollapseIntensity({ killingDamage: 24, maxHp: 8, knockback: 1.8 })).toBe('strong')
  })

  it('medium: a moderate finishing hit between the two extremes', () => {
    const intensity = resolveCollapseIntensity({ killingDamage: 16, maxHp: 320, knockback: 3.2 })
    expect(intensity).toBe('medium')
  })

  it('defaults to weak for an empty/no-power kill', () => {
    expect(resolveCollapseIntensity()).toBe('weak')
  })

  it('halves fragment piece size only for the strongest (scatter) shatter', () => {
    expect(collapsePieceScaleForStyle('scatter')).toBe(0.5)
    expect(collapsePieceScaleForStyle('bodyCollapse')).toBe(1)
    expect(collapsePieceScaleForStyle('crumble')).toBe(1)
    expect(collapsePieceScaleForStyle(undefined)).toBe(1)
  })
})
