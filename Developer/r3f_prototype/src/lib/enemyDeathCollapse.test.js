import { describe, expect, it, vi } from 'vitest'
import {
  ENEMY_DEATH_COLLAPSE_FADE_START_MS,
  ENEMY_DEATH_COLLAPSE_LIFETIME_MS,
  ENEMY_DEATH_COLLAPSE_STYLES,
  FAR_SCATTER_FADE_START_MS,
  ZOMBIE_COLLAPSE_PARTS,
  collapsePieceScaleForStyle,
  collapseStyleForIntensity,
  createShuffledDeathStyleBag,
  createCollapseMotion,
  nextEnemyDeathCollapseStyle,
  pickEnemyDeathCollapseStyle,
  resolveCollapsePartOpacity,
  resolveCollapseIntensity,
  resetDeathStyleBagForTests,
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

  it('creates a forward fall motion with slight part staggering', () => {
    const motion = createCollapseMotion({
      seed: 12.5,
      part: ZOMBIE_COLLAPSE_PARTS[4],
      index: 4,
      style: 'forwardFall',
    })

    expect(motion.y).toBeGreaterThan(0)
    expect(motion.gravity).toBeGreaterThan(8)
    expect(motion.delayMs).toBeGreaterThanOrEqual(0)
    expect(motion.z).toBeGreaterThan(0.5)
  })

  it('makes the four fall directions visually dominant and distinct', () => {
    const body = ZOMBIE_COLLAPSE_PARTS.find((part) => part.key === 'body')
    const forward = createCollapseMotion({ seed: 12.5, part: body, index: 3, style: 'forwardFall' })
    const backward = createCollapseMotion({ seed: 12.5, part: body, index: 3, style: 'backwardFall' })
    const left = createCollapseMotion({ seed: 12.5, part: body, index: 3, style: 'leftFall' })
    const right = createCollapseMotion({ seed: 12.5, part: body, index: 3, style: 'rightFall' })

    expect(forward.z).toBeGreaterThan(1.35)
    expect(forward.rx).toBeGreaterThan(3.8)
    expect(backward.z).toBeLessThan(-1.35)
    expect(backward.rx).toBeLessThan(-3.8)
    expect(left.x).toBeLessThan(-1.35)
    expect(left.rz).toBeLessThan(-3.8)
    expect(right.x).toBeGreaterThan(1.35)
    expect(right.rz).toBeGreaterThan(3.8)
  })

  it('marks backstep and prone sink deaths as staged animations', () => {
    const body = ZOMBIE_COLLAPSE_PARTS.find((part) => part.key === 'body')
    const backstep = createCollapseMotion({ seed: 12.5, part: body, index: 3, style: 'backstepFall' })
    const proneSink = createCollapseMotion({ seed: 12.5, part: body, index: 3, style: 'proneSink' })

    expect(backstep.mode).toBe('backstep')
    expect(backstep.steps).toBe(3)
    expect(backstep.z).toBeLessThan(-1.2)
    expect(backstep.fadeStartMs).toBeGreaterThanOrEqual(560)
    expect(proneSink.mode).toBe('proneSink')
    expect(proneSink.sinkDepth).toBeGreaterThan(0.6)
    expect(proneSink.rx).toBeGreaterThan(3)
    expect(proneSink.fadeStartMs).toBeGreaterThanOrEqual(500)
  })

  it('uses a foot-tip pivot for left and right falls', () => {
    const body = ZOMBIE_COLLAPSE_PARTS.find((part) => part.key === 'body')
    const left = createCollapseMotion({ seed: 12.5, part: body, index: 3, style: 'leftFall' })
    const right = createCollapseMotion({ seed: 12.5, part: body, index: 3, style: 'rightFall' })

    expect(left.mode).toBe('sidePivot')
    expect(left.pivotDirection).toBe(-1)
    expect(left.pivotYOffset).toBeLessThan(-0.5)
    expect(left.pivotXOffset).toBeLessThan(0)
    expect(right.mode).toBe('sidePivot')
    expect(right.pivotDirection).toBe(1)
    expect(right.pivotYOffset).toBeLessThan(-0.5)
    expect(right.pivotXOffset).toBeGreaterThan(0)
  })

  it('swings the legs at half speed during backstep death', () => {
    const leg = ZOMBIE_COLLAPSE_PARTS.find((part) => part.key === 'legL')
    const foot = ZOMBIE_COLLAPSE_PARTS.find((part) => part.key === 'footR')
    const legMotion = createCollapseMotion({ seed: 12.5, part: leg, index: 8, style: 'backstepFall' })
    const footMotion = createCollapseMotion({ seed: 12.5, part: foot, index: 11, style: 'backstepFall' })

    expect(legMotion.mode).toBe('backstep')
    expect(legMotion.walkSwing).toBeGreaterThan(0.45)
    expect(legMotion.walkCycleMs).toBe(190)
    expect(footMotion.walkSwing).toBeGreaterThan(0.35)
    expect(footMotion.walkCycleMs).toBe(190)
  })

  it('uses the exact requested 11 death styles', () => {
    expect(ENEMY_DEATH_COLLAPSE_STYLES).toEqual([
      'forwardFall',
      'backwardFall',
      'leftFall',
      'rightFall',
      'backstepFall',
      'proneSink',
      'shatter1',
      'shatter2',
      'shatter3',
      'shatter4',
      'shatter5',
    ])
    expect(pickEnemyDeathCollapseStyle(0)).toBe('forwardFall')
    expect(pickEnemyDeathCollapseStyle(0.99)).toBe('shatter5')
  })

  it('shuffles a full death style bag so every style appears before repeats', () => {
    const bag = createShuffledDeathStyleBag(() => 0.5)

    expect(bag).toHaveLength(ENEMY_DEATH_COLLAPSE_STYLES.length)
    expect(new Set(bag)).toEqual(new Set(ENEMY_DEATH_COLLAPSE_STYLES))
  })

  it('deals every death style once before the bag repeats', () => {
    resetDeathStyleBagForTests()
    const drawn = Array.from({ length: 11 }, () => nextEnemyDeathCollapseStyle(() => 0.5))

    expect(new Set(drawn)).toEqual(new Set(ENEMY_DEATH_COLLAPSE_STYLES))
  })

  it('creates five separate shatter strengths', () => {
    const styles = ['shatter1', 'shatter2', 'shatter3', 'shatter4', 'shatter5']
    const motions = styles.map((style) => (
      createCollapseMotion({
        seed: 12.5,
        part: ZOMBIE_COLLAPSE_PARTS[0],
        index: 0,
        style,
      })
    ))
    const signatures = motions.map((motion) => (
      `${motion.x.toFixed(3)}:${motion.z.toFixed(3)}:${motion.y.toFixed(3)}:${motion.distanceScale.toFixed(3)}`
    ))

    expect(new Set(signatures).size).toBe(5)
    motions.forEach((motion) => {
      expect(motion.gravity).toBe(0)
      expect(motion.linearDamping).toBeGreaterThan(0)
      expect(Math.hypot(motion.x, motion.z)).toBeGreaterThan(0.1)
      expect(motion.y).toBeGreaterThan(0.1)
    })
  })

  it('makes shatter strength 5 stronger and smaller than strength 1', () => {
    const weak = createCollapseMotion({
      seed: 12.5,
      part: ZOMBIE_COLLAPSE_PARTS[0],
      index: 0,
      style: 'shatter1',
    })
    const strong = createCollapseMotion({
      seed: 12.5,
      part: ZOMBIE_COLLAPSE_PARTS[0],
      index: 0,
      style: 'shatter5',
    })

    expect(Math.hypot(strong.x, strong.z)).toBeGreaterThan(Math.hypot(weak.x, weak.z))
    expect(strong.y).toBeGreaterThan(weak.y)
    expect(collapsePieceScaleForStyle('shatter5')).toBeLessThan(collapsePieceScaleForStyle('shatter1'))
  })

  it('fades far shatter fragments before the shared collapse fade starts', () => {
    let farMotion = null
    for (let i = 0; i < 200 && !farMotion; i++) {
      const motion = createCollapseMotion({
        seed: i + 0.25,
        part: ZOMBIE_COLLAPSE_PARTS[0],
        index: 0,
        style: 'shatter5',
      })
      if (motion.farFadeStartMs !== undefined) farMotion = motion
    }

    expect(farMotion).toBeTruthy()
    expect(farMotion.farFadeStartMs).toBe(FAR_SCATTER_FADE_START_MS)
    expect(resolveCollapsePartOpacity(FAR_SCATTER_FADE_START_MS - 1, farMotion)).toBe(1)
    expect(resolveCollapsePartOpacity(FAR_SCATTER_FADE_START_MS + 80, farMotion)).toBeLessThan(1)
    expect(resolveCollapsePartOpacity(ENEMY_DEATH_COLLAPSE_FADE_START_MS - 1, {})).toBe(1)
  })
})

describe('death shatter intensity by killing-hit power', () => {
  it('collapseStyleForIntensity can pick any death style for any intensity', () => {
    const randomSpy = vi.spyOn(Math, 'random')
    try {
      resetDeathStyleBagForTests()
      randomSpy.mockReturnValue(0)
      expect(collapseStyleForIntensity('strong')).toBe('forwardFall')

      resetDeathStyleBagForTests()
      randomSpy.mockReturnValue(0.99)
      expect(ENEMY_DEATH_COLLAPSE_STYLES).toContain(collapseStyleForIntensity('weak'))
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('collapseStyleForIntensity returns one of all death styles for any intensity', () => {

    const allStyles = ENEMY_DEATH_COLLAPSE_STYLES
    expect(allStyles).toContain(collapseStyleForIntensity('weak', 12.5))
    expect(allStyles).toContain(collapseStyleForIntensity('medium', 99.9))
    expect(allStyles).toContain(collapseStyleForIntensity('strong', 42.0))
    expect(allStyles).toContain(collapseStyleForIntensity(undefined))

    const results = new Set([0,1,2,3,4,5,6,7,8,9].map(i =>
      collapseStyleForIntensity('medium', i * 31.7)
    ))
    expect(results.size).toBeGreaterThan(1)
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

  it('shrinks only the five shatter strengths', () => {
    expect(collapsePieceScaleForStyle('forwardFall')).toBe(1)
    expect(collapsePieceScaleForStyle('backwardFall')).toBe(1)
    expect(collapsePieceScaleForStyle('shatter1')).toBe(0.95)
    expect(collapsePieceScaleForStyle('shatter5')).toBe(0.42)
    expect(collapsePieceScaleForStyle(undefined)).toBe(1)
  })
})
