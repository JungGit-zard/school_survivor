import { describe, expect, it } from 'vitest'
import {
  COLLAPSE_INTENSITY_STYLE,
  ENEMY_DEATH_COLLAPSE_FADE_START_MS,
  ENEMY_DEATH_COLLAPSE_LIFETIME_MS,
  ENEMY_DEATH_COLLAPSE_STYLES,
  FAR_SCATTER_FADE_START_MS,
  SCATTER_COLLAPSE_VARIANTS,
  WEAK_COLLAPSE_STYLES,
  ZOMBIE_COLLAPSE_PARTS,
  collapsePieceScaleForStyle,
  collapseStyleForIntensity,
  createCollapseMotion,
  pickEnemyDeathCollapseStyle,
  pickWeakCollapseStyle,
  resolveCollapsePartOpacity,
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

  it('chooses between the restored death effects plus slump and kneel patterns', () => {
    expect(ENEMY_DEATH_COLLAPSE_STYLES).toEqual(['bodyCollapse', 'scatter', 'crumble', 'slump', 'kneel'])
    expect(pickEnemyDeathCollapseStyle(0)).toBe('bodyCollapse')
    expect(pickEnemyDeathCollapseStyle(0.21)).toBe('scatter')
    expect(pickEnemyDeathCollapseStyle(0.41)).toBe('crumble')
    expect(pickEnemyDeathCollapseStyle(0.61)).toBe('slump')
    expect(pickEnemyDeathCollapseStyle(0.99)).toBe('kneel')
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
    // 3단계 확산 혼합: tight/mid/wide 중 하나 — 최솟값은 tight 기준
    expect(motion.linearDamping).toBeGreaterThan(0)
    expect(Math.hypot(motion.x, motion.z)).toBeGreaterThan(0.5)
    expect(motion.y).toBeGreaterThan(0.4)
  })

  it('gives explosive scatter deaths seven fragment patterns including halfBurst', () => {
    expect(SCATTER_COLLAPSE_VARIANTS).toEqual(['burst', 'spiral', 'wave', 'ring', 'fountain', 'cross', 'halfBurst'])

    const motions = SCATTER_COLLAPSE_VARIANTS.map((scatterVariant) => (
      createCollapseMotion({
        seed: 12.5,
        part: ZOMBIE_COLLAPSE_PARTS[0],
        index: 0,
        style: 'scatter',
        scatterVariant,
      })
    ))
    const signatures = motions.map((motion) => (
      `${motion.x.toFixed(3)}:${motion.z.toFixed(3)}:${motion.delayMs}:${motion.distanceScale}`
    ))

    expect(new Set(signatures).size).toBe(7)
    motions.forEach((motion) => {
      expect(motion.gravity).toBe(0)
      // 3단계 확산 혼합 — tight 티어는 spread가 작을 수 있음
      expect(Math.hypot(motion.x, motion.z)).toBeGreaterThan(0.5)
      expect(motion.y).toBeGreaterThan(0.4)
    })
  })

  it('adds readable ring, fountain, and cross scatter silhouettes', () => {
    const ring = createCollapseMotion({
      seed: 12.5,
      part: ZOMBIE_COLLAPSE_PARTS[0],
      index: 0,
      style: 'scatter',
      scatterVariant: 'ring',
    })
    const fountain = createCollapseMotion({
      seed: 12.5,
      part: ZOMBIE_COLLAPSE_PARTS[0],
      index: 0,
      style: 'scatter',
      scatterVariant: 'fountain',
    })
    const cross = createCollapseMotion({
      seed: 12.5,
      part: ZOMBIE_COLLAPSE_PARTS[4],
      index: 4,
      style: 'scatter',
      scatterVariant: 'cross',
    })

    expect(ring.distanceScale).toBeGreaterThan(1.1)
    expect(fountain.y).toBeGreaterThan(ring.y)
    expect(Math.hypot(fountain.x, fountain.z)).toBeLessThan(Math.hypot(ring.x, ring.z))
    expect(Math.max(Math.abs(cross.x), Math.abs(cross.z))).toBeGreaterThan(
      Math.min(Math.abs(cross.x), Math.abs(cross.z)) * 3,
    )
  })

  it('fades far scatter fragments before the shared collapse fade starts', () => {
    let farMotion = null
    for (let i = 0; i < 200 && !farMotion; i++) {
      const motion = createCollapseMotion({
        seed: i + 0.25,
        part: ZOMBIE_COLLAPSE_PARTS[0],
        index: 0,
        style: 'scatter',
      })
      if (motion.farFadeStartMs !== undefined) farMotion = motion
    }

    expect(farMotion).toBeTruthy()
    expect(farMotion.farFadeStartMs).toBe(FAR_SCATTER_FADE_START_MS)
    expect(resolveCollapsePartOpacity(FAR_SCATTER_FADE_START_MS - 1, farMotion)).toBe(1)
    expect(resolveCollapsePartOpacity(FAR_SCATTER_FADE_START_MS + 80, farMotion)).toBeLessThan(1)
    expect(resolveCollapsePartOpacity(ENEMY_DEATH_COLLAPSE_FADE_START_MS - 1, {})).toBe(1)
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

  it('creates a slump-down death motion that sits into place before fading', () => {
    const head = createCollapseMotion({
      seed: 12.5,
      part: ZOMBIE_COLLAPSE_PARTS.find((part) => part.key === 'head'),
      index: 0,
      style: 'slump',
    })
    const body = createCollapseMotion({
      seed: 13.5,
      part: ZOMBIE_COLLAPSE_PARTS.find((part) => part.key === 'body'),
      index: 3,
      style: 'slump',
    })
    const leg = createCollapseMotion({
      seed: 14.5,
      part: ZOMBIE_COLLAPSE_PARTS.find((part) => part.key === 'legL'),
      index: 8,
      style: 'slump',
    })

    expect(head.y).toBeLessThan(0)
    expect(body.y).toBeLessThan(0)
    expect(Math.hypot(body.x, body.z)).toBeLessThan(0.45)
    expect(body.gravity).toBeLessThan(8)
    expect(head.settleY).toBeGreaterThan(body.settleY)
    expect(leg.settleY).toBeLessThan(body.settleY)
    expect(body.linearDamping).toBeGreaterThan(3)
    expect(body.spinDamping).toBeGreaterThan(2)
  })
})

describe('death shatter intensity by killing-hit power', () => {
  it('collapseStyleForIntensity returns one of all 5 styles for any intensity', () => {
    // 모든 강도에서 전체 스타일 풀 랜덤 — 단일 고정 없음
    const allStyles = ENEMY_DEATH_COLLAPSE_STYLES
    expect(allStyles).toContain(collapseStyleForIntensity('weak', 12.5))
    expect(allStyles).toContain(collapseStyleForIntensity('medium', 99.9))
    expect(allStyles).toContain(collapseStyleForIntensity('strong', 42.0))
    expect(allStyles).toContain(collapseStyleForIntensity(undefined))
    // 씨드가 다르면 다른 결과 가능 — 5가지 스타일 중 2개 이상 발현
    const results = new Set([0,1,2,3,4,5,6,7,8,9].map(i =>
      collapseStyleForIntensity('medium', i * 31.7)
    ))
    expect(results.size).toBeGreaterThan(1)
  })

  it('pickWeakCollapseStyle still works for crumble/slump/kneel ordering', () => {
    expect(WEAK_COLLAPSE_STYLES).toEqual(['crumble', 'slump', 'kneel'])
    expect(pickWeakCollapseStyle(0)).toBe('crumble')
    expect(pickWeakCollapseStyle(0.5)).toBe('slump')
    expect(pickWeakCollapseStyle(0.99)).toBe('kneel')
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
    expect(collapsePieceScaleForStyle('slump')).toBe(1)
    expect(collapsePieceScaleForStyle(undefined)).toBe(1)
  })
})
