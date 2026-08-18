import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  COMPASS_BLADE_EXPLOSION_DAMAGE,
  COMPASS_BLADE_EXPLOSION_DURATION_SEC,
  COMPASS_BLADE_EXPLOSION_EDGE_LOCAL_RADIUS,
  COMPASS_BLADE_EXPLOSION_RADIUS,
  COMPASS_BLADE_RESPAWN_MS,
  COMPASS_BLADE_STACKS_TO_EXPLODE,
  getCompassBladeExplosionExpansion,
  getCompassBladeExplosionVisualScale,
  getCompassBladeRespawnUntilMs,
  getCompassBladeOrbitPose,
  resolveCompassBladeHitStack,
  shouldRenderCompassBladeHitBodies,
} from '../../lib/compassBlade.js'
import { ZOMBIE_METER_WORLD_UNITS } from '../../lib/gameplayUnits.js'
import { WEAPON_CATALOG } from '../../lib/weaponCatalog.js'
import { TUMBLER_SUSTAINED_MULTIPLIER } from '../../lib/tumblerFalloff.js'

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
      currentStack: COMPASS_BLADE_STACKS_TO_EXPLODE - 2,
      hitDamage: 8,
    })

    expect(result).toEqual({
      stack: COMPASS_BLADE_STACKS_TO_EXPLODE - 1,
      exploded: false,
      explosionDamage: 0,
      explosionRadius: COMPASS_BLADE_EXPLOSION_RADIUS,
    })
  })

  it('explodes on the third contact hit for fixed 30 damage in a one-tile radius', () => {
    const hitDamage = 8
    const result = resolveCompassBladeHitStack({
      currentStack: COMPASS_BLADE_STACKS_TO_EXPLODE - 1,
      hitDamage,
    })

    // 5 → 3 (2026-08-18). 적별 500ms 게이트라 5스택은 붙잡고 있어도 2.5초, 궤도 이탈까지
    // 감안하면 수 초가 걸려 "터질 때쯤 플레이어는 딴 데"가 됐다.
    expect(COMPASS_BLADE_STACKS_TO_EXPLODE).toBe(3)
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
    expect(source).toContain('outerRingRef.current.scale.setScalar(0.95 + e * 1.4)')
    expect(source).toContain('getCompassBladeExplosionVisualScale(radius, e)')
    expect(source).not.toContain('0.24 + radius * 2.9 * t')
  })

  it('drives every expansion off the eased progress, never raw lifetime', () => {
    const source = readFileSync(new URL('./CompassBlade.jsx', import.meta.url), 'utf8')

    // 크기를 t로 되돌리는 회귀 방지. 하나라도 t로 돌아가면 그 요소만 뒤늦게 벌어져
    // 폭발이 다시 "천천히 부푸는" 연출이 된다. 불투명도(fastPop·lateFade)는 t가 맞다.
    expect(source).toContain('const e = getCompassBladeExplosionExpansion(t)')
    expect(source).toContain('ageRef.current / COMPASS_BLADE_EXPLOSION_DURATION_SEC')
    for (const scaleExpr of [
      'flashRef.current.scale.setScalar(0.65 + e * 0.7)',
      'innerRingRef.current.scale.setScalar(0.72 + e * 0.9)',
      'burstRef.current.scale.set(1.2 + e * 0.8, 1.3 + e * 1.8, 1.2 + e * 0.8)',
    ]) {
      expect(source).toContain(scaleExpr)
    }
  })

  it('reaches the damage radius while still visible, and clears before the player outruns it', () => {
    // 사용자 신고: "폭발반응이 느려서 캐릭터가 많이 이동한 뒤 엉뚱한 곳에서 터지는 느낌".
    // 원인은 확산이 선형이라 링이 실제 피해 반경에 닿는 순간 이미 투명했다는 것이다.
    // 보이는 링의 월드 반경 = 그룹 스케일 × 바깥 링 자체 스케일 × ringGeometry 바깥 반경.
    const visibleRadiusAt = (t) => {
      const e = getCompassBladeExplosionExpansion(t)
      return getCompassBladeExplosionVisualScale(COMPASS_BLADE_EXPLOSION_RADIUS, e)
        * 0.72 * (0.95 + e * 1.4)
    }

    expect(getCompassBladeExplosionExpansion(0)).toBe(0)
    expect(getCompassBladeExplosionExpansion(1)).toBe(1)
    // 수명 30% 지점(≈100ms)에서 이미 피해 반경의 80% 이상이고, 링 불투명도는 아직 0.7이다.
    expect(visibleRadiusAt(0.3)).toBeGreaterThan(COMPASS_BLADE_EXPLOSION_RADIUS * 0.8)
    // 끝에서는 정확히 피해 반경 — 비주얼이 판정보다 커져 "닿았는데 안 죽는다"가 되면 안 된다.
    expect(visibleRadiusAt(1)).toBeCloseTo(COMPASS_BLADE_EXPLOSION_RADIUS, 10)

    // 폭심은 월드 고정이라 수명이 길수록 달리는 플레이어 등 뒤에 남는다. 궤도 반경(1.15)
    // 안에 머물러야 "요강이 터졌다"로 읽힌다 — 플레이어 이동속도는 대략 3.5 wu/s.
    expect(COMPASS_BLADE_EXPLOSION_DURATION_SEC * 3.5).toBeLessThan(WEAPON_CATALOG.compassBlade.base.radius + 0.1)
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

  it('sets a three-second respawn window after an explosion', () => {
    expect(COMPASS_BLADE_RESPAWN_MS).toBe(3000)
    expect(getCompassBladeRespawnUntilMs({ exploded: true, nowMs: 1200 })).toBe(4200)
    expect(getCompassBladeRespawnUntilMs({ exploded: false, nowMs: 1200 })).toBe(0)
  })

  // 스택과 리스폰을 같이 줄인 이유. 스택만 5→3으로 줄이면 폭발은 빨라지지만 5초 공백이
  // 더 자주 와서 요강이 사라져 있는 시간 비율이 67% → 77%로 늘어난다.
  it('keeps the potties on screen for the same share of the cycle as before', () => {
    const { hitsPerSecond } = WEAPON_CATALOG.compassBlade.base
    const chargeSec = COMPASS_BLADE_STACKS_TO_EXPLODE / hitsPerSecond
    const downtimeShare = (COMPASS_BLADE_RESPAWN_MS / 1000) / (chargeSec + COMPASS_BLADE_RESPAWN_MS / 1000)

    expect(chargeSec).toBeCloseTo(1.5, 10)
    expect(downtimeShare).toBeCloseTo(5 / 7.5, 10)
  })

  it('stays weaker than the tumbler, explosion included', () => {
    // 사용자 확정 사양(2026-08-18): "오리요강은 텀블러보다 낮은 공격력으로 유지하다가
    // 폭발이 가미된 것". 폭발까지 더한 사이클 실화력으로 비교해야 의미가 있다.
    const crit = (w) => 1 + w.critChance * (w.critMultiplier - 1)
    const potty = WEAPON_CATALOG.compassBlade.base
    const tumbler = WEAPON_CATALOG.tumbler.base

    const cycleSec = COMPASS_BLADE_STACKS_TO_EXPLODE / potty.hitsPerSecond + COMPASS_BLADE_RESPAWN_MS / 1000
    // 폭발은 canCrit:false(CompassBlade.jsx explode)라 치명타 배율을 곱하지 않는다.
    const pottyDps = (COMPASS_BLADE_STACKS_TO_EXPLODE * potty.damage * crit(potty) + COMPASS_BLADE_EXPLOSION_DAMAGE) / cycleSec
    const tumblerDps = tumbler.damage * tumbler.hitsPerSecond * TUMBLER_SUSTAINED_MULTIPLIER * crit(tumbler)

    expect(potty.damage).toBeLessThan(tumbler.damage)
    expect(potty.damage * potty.hitsPerSecond).toBeLessThan(tumbler.damage * tumbler.hitsPerSecond * TUMBLER_SUSTAINED_MULTIPLIER)
    expect(pottyDps).toBeLessThan(tumblerDps)
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
