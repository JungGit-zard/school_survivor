import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MATILDA_ARM_LAYOUT,
  MATILDA_BACK_HAIR_COVERAGE,
  MATILDA_BODY_CENTER_Y,
  MATILDA_DEFAULT_FACE_TEXTURE_SOURCE,
  MATILDA_DEFAULT_MOVEMENT_POSE,
  MATILDA_FACE_TEXTURE_SLOT,
  MATILDA_FORWARD_LEAN_RAD,
  MATILDA_IDLE_ANIMATION,
  MATILDA_IDLE_POSE,
  MATILDA_MOVEMENT_POSE,
  MATILDA_MODEL_PARTS,
  MATILDA_PALETTE,
  MATILDA_REFERENCE_FEATURES,
  MATILDA_VISUAL_SCALE,
  MATILDA_WORLD_HEIGHT,
} from './MatildaMesh.jsx'
import { PLAYER_MESH_WORLD_HEIGHT } from '../lib/characterVisualScale.js'

describe('MatildaMesh model contract', () => {
  it('keeps Matilda twice as tall as the player without touching enemy stats', () => {
    expect(MATILDA_VISUAL_SCALE).toBeGreaterThan(0)
    expect(MATILDA_WORLD_HEIGHT).toBeCloseTo(PLAYER_MESH_WORLD_HEIGHT * 2, 4)
  })

  it('contains the concept-art readable parts', () => {
    expect(MATILDA_MODEL_PARTS).toEqual(expect.arrayContaining([
      'head',
      'longHair',
      'backLongHair',
      'horns',
      'pointedEars',
      'batWings',
      'dress',
      'puffySleeves',
      'skirt',
      'magentaRibbon',
      'arms',
      'legs',
      'boots',
      'tail',
    ]))
  })

  it('keeps the chibi succubus reference silhouette readable', () => {
    expect(MATILDA_REFERENCE_FEATURES).toMatchObject({
      chibiProportions: true,
      frontBangs: true,
      largeBatWings: true,
      puffySleeves: true,
      shortSkirt: true,
      heartRibbon: true,
    })
  })

  it('prepares a front head slot for a supplied face texture', () => {
    expect(MATILDA_FACE_TEXTURE_SLOT.target).toBe('head-front')
    expect(MATILDA_FACE_TEXTURE_SLOT.propName).toBe('faceTextureUrl')
    expect(MATILDA_FACE_TEXTURE_SLOT.width).toBe(0.60)
    expect(MATILDA_FACE_TEXTURE_SLOT.height).toBe(0.56)
    expect(MATILDA_FACE_TEXTURE_SLOT.y).toBe(1.43)
    expect(MATILDA_FACE_TEXTURE_SLOT.z).toBeGreaterThan(MATILDA_FACE_TEXTURE_SLOT.headCenterZ)
  })

  it('uses the supplied face texture as the default head-front texture', () => {
    expect(MATILDA_DEFAULT_FACE_TEXTURE_SOURCE).toBe('assets/character/matilda_face_texture.png')
  })

  it('uses the approved succubus palette anchors', () => {
    expect(MATILDA_PALETTE).toMatchObject({
      hair: 0xb43752,
      horn: 0x171018,
      wingMembrane: 0x3b1d45,
      dress: 0x241426,
      trim: 0xd94b8c,
      skin: 0xffc7a6,
    })
  })

  it('covers the back of the head and upper back with long hair', () => {
    expect(MATILDA_BACK_HAIR_COVERAGE.backHairWidth).toBeGreaterThan(MATILDA_BACK_HAIR_COVERAGE.headWidth)
    expect(MATILDA_BACK_HAIR_COVERAGE.backHairTopY).toBeGreaterThan(MATILDA_BACK_HAIR_COVERAGE.headCenterY)
    expect(MATILDA_BACK_HAIR_COVERAGE.backHairBottomY).toBeLessThan(MATILDA_BACK_HAIR_COVERAGE.upperBackY)
    expect(MATILDA_BACK_HAIR_COVERAGE.backHairZ).toBeLessThan(MATILDA_BACK_HAIR_COVERAGE.headZ)
  })

  it('hangs arms from the shoulders and flares them outward toward the hands', () => {
    expect(MATILDA_ARM_LAYOUT.left.shoulderX).toBeGreaterThan(MATILDA_ARM_LAYOUT.left.handX)
    expect(MATILDA_ARM_LAYOUT.right.shoulderX).toBeLessThan(MATILDA_ARM_LAYOUT.right.handX)
    expect(MATILDA_ARM_LAYOUT.left.shoulderY).toBeGreaterThan(MATILDA_ARM_LAYOUT.left.handY)
    expect(MATILDA_ARM_LAYOUT.right.shoulderY).toBeGreaterThan(MATILDA_ARM_LAYOUT.right.handY)
    expect(MATILDA_ARM_LAYOUT.left.rotationZ).toBeLessThan(0)
    expect(MATILDA_ARM_LAYOUT.right.rotationZ).toBeGreaterThan(0)
  })

  it('keeps Matilda idle as a small ground-hover bob, not a chase lean', () => {
    expect(MATILDA_DEFAULT_MOVEMENT_POSE).toBe(false)
    expect(MATILDA_IDLE_ANIMATION.floatBaseY).toBeGreaterThan(0)
    expect(MATILDA_IDLE_ANIMATION.floatBobY).toBeGreaterThan(0)
    expect(MATILDA_IDLE_ANIMATION.swayZ).toBeGreaterThan(0)
    expect(MATILDA_IDLE_POSE.upperLeanX).toBe(0)
    expect(MATILDA_IDLE_POSE.headLeanX).toBe(0)
    expect(MATILDA_IDLE_POSE.leftFoot.positionZ).toBeGreaterThan(0)
    expect(MATILDA_IDLE_POSE.rightFoot.positionZ).toBeGreaterThan(0)
    expect(MATILDA_IDLE_POSE.leftFoot.rotationX).toBe(0)
    expect(MATILDA_IDLE_POSE.rightFoot.rotationX).toBe(0)
  })

  it('keeps the movement pose separate from the idle hover', () => {
    expect(MATILDA_MOVEMENT_POSE.rootFloatY).toBeGreaterThan(0)
    expect(MATILDA_MOVEMENT_POSE.upperLeanX).toBeGreaterThan(MATILDA_IDLE_POSE.upperLeanX)
    expect(MATILDA_MOVEMENT_POSE.headLeanX).toBe(0)
    expect(MATILDA_MOVEMENT_POSE.leftFoot.rotationX).toBe(0)
    expect(MATILDA_MOVEMENT_POSE.rightFoot.rotationX).toBe(0)
  })

  it('leans Matilda forward 45 degrees from her center while moving straight', () => {
    expect(MATILDA_FORWARD_LEAN_RAD).toBeCloseTo(Math.PI / 4, 6)
    expect(MATILDA_MOVEMENT_POSE.upperLeanX).toBe(MATILDA_FORWARD_LEAN_RAD)
    expect(MATILDA_MOVEMENT_POSE.headLeanX).toBe(0)
    expect(MATILDA_MOVEMENT_POSE.rootFloatY).toBe(MATILDA_IDLE_POSE.rootFloatY)
    expect(MATILDA_MOVEMENT_POSE.rootOffsetZ).toBe(0)
    expect(MATILDA_MOVEMENT_POSE.upperPivotOffsetY).toBeCloseTo(MATILDA_BODY_CENTER_Y * (1 - Math.cos(MATILDA_FORWARD_LEAN_RAD)), 6)
    expect(MATILDA_MOVEMENT_POSE.upperPivotOffsetZ).toBeCloseTo(-MATILDA_BODY_CENTER_Y * Math.sin(MATILDA_FORWARD_LEAN_RAD), 6)
    expect(MATILDA_MOVEMENT_POSE.leftFoot.positionZ).toBe(MATILDA_IDLE_POSE.leftFoot.positionZ)
    expect(MATILDA_MOVEMENT_POSE.rightFoot.positionZ).toBe(MATILDA_IDLE_POSE.rightFoot.positionZ)
  })

  it('keeps legs and boots inside the moving body group', () => {
    const source = readFileSync(new URL('./MatildaMesh.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain('</group>\n      <Part size={[0.22, 0.56, 0.20]} position={[-0.17, -0.07, 0.02]}')
    expect(source).toContain('<Part groupRef={rightFootRef} size={[0.34, 0.24, 0.34]} position={pose.rightFoot.position}')
  })
})
