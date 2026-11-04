import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { SHOT_KIND, SHOT_MOTION, createProjectileZombieShotPool, createShotSpec } from './projectileZombieShotPool.js'
import {
  AMBUSH_PROPS, DECAL_VISUAL, SHOT_VISUALS, SHOT_VISUAL_FALLBACK, composeShotQuaternion, createAmbushPropGeometries,
  createDecalGeometries, createOutlineGeometry, createShotGeometries, getAmbushPropIndex, getDecalVisuals,
  getShotHeading, getShotVisualIndex,
} from './projectileZombieShotGeometry.js'

const SHOT_KINDS = [
  SHOT_KIND.ERASER, SHOT_KIND.PAPER_PLANE, SHOT_KIND.RULER, SHOT_KIND.WATER_BLOB, SHOT_KIND.VOLLEYBALL,
  SHOT_KIND.MUSIC_NOTE, SHOT_KIND.FLASK, SHOT_KIND.PAINT, SHOT_KIND.SOUND_WAVE, SHOT_KIND.BASEBALL,
  SHOT_KIND.HEAL_CAPSULE, SHOT_KIND.ATTENDANCE_CARD, SHOT_KIND.JUMP_ROPE, SHOT_KIND.MILK_CARTON, SHOT_KIND.DRAIN_WATER,
]

describe('projectile zombie shot kind → geometry mapping', () => {
  it('gives every shot kind 16..30 its own distinct, non-fallback look', () => {
    const indices = SHOT_KINDS.map((kind) => getShotVisualIndex(kind, kind === SHOT_KIND.FLASK ? SHOT_MOTION.SPLIT : SHOT_MOTION.STRAIGHT))
    expect(indices).not.toContain(SHOT_VISUAL_FALLBACK)
    expect(new Set(indices).size).toBe(SHOT_KINDS.length)
    expect(SHOT_VISUALS[getShotVisualIndex(SHOT_KIND.PAPER_PLANE, SHOT_MOTION.HOMING)].key).toBe('paperPlane')
    expect(SHOT_VISUALS[getShotVisualIndex(SHOT_KIND.JUMP_ROPE, SHOT_MOTION.RETURN)].key).toBe('jumpRope')
  })

  it('turns the flask into split shards once it has split', () => {
    expect(SHOT_VISUALS[getShotVisualIndex(SHOT_KIND.FLASK, SHOT_MOTION.SPLIT)].key).toBe('flask')
    expect(SHOT_VISUALS[getShotVisualIndex(SHOT_KIND.FLASK, SHOT_MOTION.STRAIGHT)].key).toBe('flaskShard')
  })

  it('falls back to a plain sphere for unknown kinds', () => {
    expect(getShotVisualIndex(99, SHOT_MOTION.STRAIGHT)).toBe(SHOT_VISUAL_FALLBACK)
    expect(getShotVisualIndex(0, SHOT_MOTION.STRAIGHT)).toBe(SHOT_VISUAL_FALLBACK)
  })

  it('maps ground markers to flat ring/fill/puddle/line decals', () => {
    expect(getDecalVisuals(SHOT_KIND.DECAL_AIM_LINE, SHOT_MOTION.DECAL, 3)).toEqual([DECAL_VISUAL.LINE])
    expect(getDecalVisuals(SHOT_KIND.DECAL_MARKER, SHOT_MOTION.DECAL, 0)).toEqual([DECAL_VISUAL.RING, DECAL_VISUAL.MARKER_FILL])
    expect(getDecalVisuals(SHOT_KIND.DECAL_HEAL, SHOT_MOTION.DECAL, 0)).toEqual([DECAL_VISUAL.RING, DECAL_VISUAL.MARKER_FILL])
    expect(getDecalVisuals(SHOT_KIND.ZONE_WATER, SHOT_MOTION.ZONE, 0)).toEqual([DECAL_VISUAL.PUDDLE_FILL])
    expect(getDecalVisuals(SHOT_KIND.ZONE_PAINT, SHOT_MOTION.ZONE, 0)).toEqual([DECAL_VISUAL.PUDDLE_FILL])
  })

  it('maps only E58 (61) and E60 (63) to ambush props', () => {
    expect(AMBUSH_PROPS[getAmbushPropIndex(61)]).toBe('ropeCoil')
    expect(AMBUSH_PROPS[getAmbushPropIndex(63)]).toBe('drainGrate')
    for (const type of [1, 49, 60, 62, 64]) expect(getAmbushPropIndex(type)).toBe(-1)
  })
})

describe('projectile zombie shot geometry', () => {
  it('builds low-poly vertex-coloured toon geometry of readable size for every look', () => {
    const geometries = createShotGeometries()
    expect(geometries).toHaveLength(SHOT_VISUALS.length)
    geometries.forEach((g, i) => {
      expect(g.attributes.position, SHOT_VISUALS[i].key).toBeTruthy()
      expect(g.attributes.normal).toBeTruthy()
      expect(g.attributes.color).toBeTruthy()
      expect(g.attributes.position.count).toBeLessThan(1200)
      g.computeBoundingSphere()
      expect(g.boundingSphere.radius, SHOT_VISUALS[i].key).toBeGreaterThan(0.07)
      expect(g.boundingSphere.radius, SHOT_VISUALS[i].key).toBeLessThan(0.45)
      for (const v of g.attributes.position.array) expect(Number.isFinite(v)).toBe(true)
      g.dispose()
    })
  })

  it('points the paper plane nose and the rope tail along the model axis', () => {
    const [plane] = [createShotGeometries()[getShotVisualIndex(SHOT_KIND.PAPER_PLANE, SHOT_MOTION.HOMING)]]
    plane.computeBoundingBox()
    expect(plane.boundingBox.max.z).toBeGreaterThan(0.14) // 코가 +Z
    expect(plane.boundingBox.max.y - plane.boundingBox.min.y).toBeLessThan(0.12) // 납작하다
    const rope = createShotGeometries()[getShotVisualIndex(SHOT_KIND.JUMP_ROPE, SHOT_MOTION.RETURN)]
    rope.computeBoundingBox()
    expect(rope.boundingBox.min.z).toBeLessThan(-0.35) // 줄 꼬리가 뒤(-Z)로
  })

  it('inflates outline hulls outward by a constant thickness', () => {
    const [eraser] = createShotGeometries()
    const outline = createOutlineGeometry(eraser, 0.013)
    eraser.computeBoundingBox(); outline.computeBoundingBox()
    expect(outline.boundingBox.max.x - eraser.boundingBox.max.x).toBeCloseTo(0.013, 3)
    expect(outline.attributes.color).toBeUndefined()
  })

  it('keeps decals flat on the floor and ambush props low with a dark centre hole', () => {
    for (const g of createDecalGeometries()) {
      g.computeBoundingBox()
      expect(g.boundingBox.max.y - g.boundingBox.min.y).toBeLessThan(1e-6)
    }
    for (const g of createAmbushPropGeometries()) {
      g.computeBoundingBox()
      expect(g.boundingBox.max.y).toBeLessThan(0.1)
      expect(g.boundingBox.max.x).toBeGreaterThan(0.25)
    }
  })
})

describe('projectile zombie shot orientation', () => {
  const forward = new THREE.Vector3()
  const q = new THREE.Quaternion()
  const planeVisual = getShotVisualIndex(SHOT_KIND.PAPER_PLANE, SHOT_MOTION.HOMING)
  const rulerVisual = getShotVisualIndex(SHOT_KIND.RULER, SHOT_MOTION.RETURN)

  it('aims pointed shots along their heading', () => {
    composeShotQuaternion(q, getShotVisualIndex(SHOT_KIND.PAINT, SHOT_MOTION.STRAIGHT), 1, 0, 300, 2)
    forward.set(0, 0, 1).applyQuaternion(q)
    expect(forward.x).toBeCloseTo(1, 5)
    composeShotQuaternion(q, planeVisual, 0, -1, 0, 0)
    forward.set(0, 0, 1).applyQuaternion(q)
    expect(forward.z).toBeCloseTo(-1, 5)
  })

  it('spins the ruler over time and is deterministic per slot', () => {
    const a = composeShotQuaternion(new THREE.Quaternion(), rulerVisual, 1, 0, 100, 3)
    const b = composeShotQuaternion(new THREE.Quaternion(), rulerVisual, 1, 0, 100, 3)
    const later = composeShotQuaternion(new THREE.Quaternion(), rulerVisual, 1, 0, 400, 3)
    expect(a.equals(b)).toBe(true)
    expect(a.angleTo(later)).toBeGreaterThan(0.5)
    const nan = composeShotQuaternion(new THREE.Quaternion(), rulerVisual, 1, 0, Number.NaN, 3)
    expect(Number.isFinite(nan.x + nan.y + nan.z + nan.w)).toBe(true)
  })

  it('reads lob heading from the landing point and boomerang heading from the launch direction', () => {
    const pool = createProjectileZombieShotPool(4)
    const lob = { ...createShotSpec(), kind: SHOT_KIND.WATER_BLOB, motion: SHOT_MOTION.LOB, speed: 1, p0: 0, p1: 5, p2: 1000 }
    const i = pool.spawn(0, 0, 1, 0, lob)
    const h = getShotHeading(pool, i, { x: 0, z: 0 })
    expect(h.x).toBeCloseTo(0, 5)
    expect(h.z).toBeGreaterThan(0)
    const ret = { ...createShotSpec(), kind: SHOT_KIND.RULER, motion: SHOT_MOTION.RETURN, speed: 3, p0: 4 }
    const j = pool.spawn(0, 0, -1, 0, ret)
    pool.velX[j] = 2 // 되돌아오는 중이어도 처음 던진 방향을 본다
    const r = getShotHeading(pool, j, { x: 0, z: 0 })
    expect(r.x).toBeCloseTo(-1, 5)
  })
})
