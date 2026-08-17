import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  COMPASS_BLADE_EXPLOSION_DAMAGE,
  COMPASS_BLADE_EXPLOSION_EDGE_LOCAL_RADIUS,
  COMPASS_BLADE_EXPLOSION_RADIUS,
  COMPASS_BLADE_RESPAWN_MS,
  COMPASS_BLADE_STACKS_TO_EXPLODE,
  getCompassBladeExplosionVisualScale,
  getCompassBladeRespawnUntilMs,
  getCompassBladeOrbitPose,
  resolveCompassBladeHitStack,
  shouldRenderCompassBladeHitBodies,
} from '../../lib/compassBlade.js'
import { ZOMBIE_METER_WORLD_UNITS } from '../../lib/gameplayUnits.js'

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
      explosionRadius: COMPASS_BLADE_EXPLOSION_RADIUS,
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
      explosionRadius: COMPASS_BLADE_EXPLOSION_RADIUS,
    })
    expect(COMPASS_BLADE_EXPLOSION_DAMAGE).toBe(30)
  })

  it('applies the permanent Lv.10 explosion-radius multiplier to the stack blast', () => {
    const result = resolveCompassBladeHitStack({
      currentStack: COMPASS_BLADE_STACKS_TO_EXPLODE - 1,
      explosionRadiusMultiplier: 1.1,
    })

    expect(result.explosionRadius).toBeCloseTo(COMPASS_BLADE_EXPLOSION_RADIUS * 1.1)
  })

  it('covers all nine zombie tiles around the blast, derived from the zombie meter', () => {
    // 사용자 확정 사양: 폭심 기준 상하좌우 + 대각선까지 3×3 = 9 좀비타일.
    // 타일 크기를 하드코딩하지 않고 정본 zm에서 유도한다.
    const tile = ZOMBIE_METER_WORLD_UNITS
    const radius = COMPASS_BLADE_EXPLOSION_RADIUS

    for (const tileX of [-1, 0, 1]) {
      for (const tileZ of [-1, 0, 1]) {
        // 피해 판정은 적 중심점 기준 원이다(scanRadiusEnemiesInto).
        // 9칸 중 어디에 서 있어도 중심이 원 안에 들어와야 한다.
        expect(Math.hypot(tileX * tile, tileZ * tile)).toBeLessThanOrEqual(radius + 1e-9)
      }
    }

    // 한 칸 더 바깥(2타일)은 4방향·대각선 모두 범위 밖이어야 한다 — 9칸을 넘지 않는다.
    expect(2 * tile).toBeGreaterThan(radius)
    expect(radius).toBeCloseTo(Math.SQRT2 * tile, 10)
  })

  it('expands the explosion visual to exactly the damage radius, permanent multiplier included', () => {
    for (const radius of [COMPASS_BLADE_EXPLOSION_RADIUS, COMPASS_BLADE_EXPLOSION_RADIUS * 1.1]) {
      // 그룹 스케일 × 바깥 링의 로컬 반경 = 보이는 폭발의 월드 반경.
      const visualWorldRadius = getCompassBladeExplosionVisualScale(radius, 1)
        * COMPASS_BLADE_EXPLOSION_EDGE_LOCAL_RADIUS
      expect(visualWorldRadius).toBeCloseTo(radius, 10)

      // 확산 도중에는 피해 범위를 넘지 않는다.
      const midWorldRadius = getCompassBladeExplosionVisualScale(radius, 0.5)
        * COMPASS_BLADE_EXPLOSION_EDGE_LOCAL_RADIUS
      expect(midWorldRadius).toBeLessThan(radius)
      expect(midWorldRadius).toBeGreaterThan(0)
    }
  })

  it('keeps the explosion mesh geometry the visual-scale helper was derived from', () => {
    const source = readFileSync(new URL('./CompassBlade.jsx', import.meta.url), 'utf8')

    // COMPASS_BLADE_EXPLOSION_EDGE_LOCAL_RADIUS = 0.72 × (0.95 + 1.4)의 두 입력.
    expect(source).toContain('<ringGeometry args={[0.48, 0.72, 64]} />')
    expect(source).toContain('outerRingRef.current.scale.setScalar(0.95 + t * 1.4)')
    expect(source).toContain('getCompassBladeExplosionVisualScale(radius, t)')
    expect(source).not.toContain('0.24 + radius * 2.9 * t')
  })

  it('detonates at the orbiting potty that landed the hit, not at the enemy body', () => {
    const source = readFileSync(new URL('./CompassBlade.jsx', import.meta.url), 'utf8')

    expect(source).toContain('let blastX = orbitXRef.current[0]')
    expect(source).toContain('blastX = orbitXRef.current[bladeIndex]')
    expect(source).toContain('blastZ = orbitZRef.current[bladeIndex]')
    expect(source).toContain('x: blastX,')
    expect(source).toContain('z: blastZ,')
    // 좀비 몸 좌표를 폭심으로 쓰던 회귀를 막는다.
    expect(source).not.toContain('x: t.x,\n          z: t.z,')
  })

  it('sets a five-second respawn window after an explosion', () => {
    expect(COMPASS_BLADE_RESPAWN_MS).toBe(5000)
    expect(getCompassBladeRespawnUntilMs({ exploded: true, nowMs: 1200 })).toBe(6200)
    expect(getCompassBladeRespawnUntilMs({ exploded: false, nowMs: 1200 })).toBe(0)
  })

  it('keeps the pure orbit loop eligible during the respawn window', () => {
    expect(shouldRenderCompassBladeHitBodies({ active: true, isRespawning: true })).toBe(true)
    expect(shouldRenderCompassBladeHitBodies({ active: true, isRespawning: false })).toBe(true)
    expect(shouldRenderCompassBladeHitBodies({ active: false, isRespawning: true })).toBe(false)
  })

  it('uses squared orbit distance rather than Rapier intersections for hits', () => {
    const source = readFileSync(new URL('./CompassBlade.jsx', import.meta.url), 'utf8')

    expect(source).toContain('scanOrbitEnemiesInto')
    expect(source).not.toContain('enemyBodies.forEach')
    expect(source).toContain('applyEnemyHit')
    expect(source).not.toContain('other.rigidBody')
    expect(source).not.toContain('@react-three/rapier')
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
