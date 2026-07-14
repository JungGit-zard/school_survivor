import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  COMPASS_BLADE_EXPLOSION_DAMAGE,
  COMPASS_BLADE_ONE_TILE_RADIUS,
  COMPASS_BLADE_RESPAWN_MS,
  COMPASS_BLADE_STACKS_TO_EXPLODE,
  getCompassBladeRespawnUntilMs,
  getCompassBladeOrbitPose,
  resolveCompassBladeHitStack,
  shouldRenderCompassBladeHitBodies,
} from '../../lib/compassBlade.js'

describe('CompassBladeWeapon orbit pose', () => {
  it('computes one shared world pose for the collider and visual blade', () => {
    const pose = getCompassBladeOrbitPose({
      elapsedSec: 0,
      index: 0,
      count: 1,
      radius: 1.15,
      orbitSpeed: 3.4,
      player: { x: 10, y: 0.2, z: -4 },
    })

    expect(pose.position).toEqual({ x: 10, y: 0.36, z: -2.85 })
    expect(pose.rotation).toEqual({ x: 0, y: Math.PI / 2, z: 0 })
  })

  it('spreads multiple blades evenly around the player', () => {
    const pose = getCompassBladeOrbitPose({
      elapsedSec: 0,
      index: 1,
      count: 3,
      radius: 1.2,
      orbitSpeed: 3.4,
      player: { x: 0, y: 0, z: 0 },
    })

    expect(pose.position.x).toBeCloseTo(Math.sin((Math.PI * 2) / 3) * 1.2, 5)
    expect(pose.position.y).toBe(0.16)
    expect(pose.position.z).toBeCloseTo(Math.cos((Math.PI * 2) / 3) * 1.2, 5)
  })

  it('builds one stack on each rotating contact hit before the explosion threshold', () => {
    const result = resolveCompassBladeHitStack({
      currentStack: 3,
      hitDamage: 8,
    })

    expect(result).toEqual({
      stack: 4,
      exploded: false,
      explosionDamage: 0,
      explosionRadius: COMPASS_BLADE_ONE_TILE_RADIUS,
    })
  })

  it('explodes on the fifth contact hit for fixed 30 damage in a one-tile radius', () => {
    const hitDamage = 8
    const result = resolveCompassBladeHitStack({
      currentStack: COMPASS_BLADE_STACKS_TO_EXPLODE - 1,
      hitDamage,
    })

    expect(COMPASS_BLADE_STACKS_TO_EXPLODE).toBe(5)
    expect(result).toEqual({
      stack: 0,
      exploded: true,
      explosionDamage: COMPASS_BLADE_EXPLOSION_DAMAGE, // 30 고정 (플라스크 리워크로 파생 해제)
      explosionRadius: COMPASS_BLADE_ONE_TILE_RADIUS,
    })
    expect(COMPASS_BLADE_EXPLOSION_DAMAGE).toBe(30)
  })

  it('sets a five-second respawn window after an explosion', () => {
    expect(COMPASS_BLADE_RESPAWN_MS).toBe(5000)
    expect(getCompassBladeRespawnUntilMs({ exploded: true, nowMs: 1200 })).toBe(6200)
    expect(getCompassBladeRespawnUntilMs({ exploded: false, nowMs: 1200 })).toBe(0)
  })

  it('keeps Rapier hit bodies mounted during the respawn window', () => {
    expect(shouldRenderCompassBladeHitBodies({ active: true, isRespawning: true })).toBe(true)
    expect(shouldRenderCompassBladeHitBodies({ active: true, isRespawning: false })).toBe(true)
    expect(shouldRenderCompassBladeHitBodies({ active: false, isRespawning: true })).toBe(false)
  })

  it('renders the visual model as the duck potty reference instead of the old compass blade', () => {
    const source = readFileSync(new URL('./CompassBlade.jsx', import.meta.url), 'utf8')

    expect(source).toContain('DUCK_POTTY_BODY')
    expect(source).toContain('DUCK_POTTY_ORANGE')
    expect(source).toContain('오리좌변기 장난감')
    expect(source).toContain('튼튼한 옆 손잡이')
    expect(source).toContain('포티 시트 구멍')
    expect(source).toContain('주황색 부리와 발')
    expect(source).toContain('DuckPottyHandle')
    expect(source).toContain('DuckFoot')
    expect(source).toContain('<mesh material={outlineMaterial} scale={inflateScale(outlineArgs)} userData={{ studioRenderOutline: true }}>')
    expect(source).not.toContain('function CompassLeg')
  })
})
