import { describe, expect, it } from 'vitest'
import { canE04FireProjectile, getStage2E04Cap, getE04Cap, getE04IntroSec } from './stage2ProjectileRules.js'

describe('stage 2 E04 projectile rules', () => {
  it('blocks E04 before the 72 second introduction window', () => {
    expect(canE04FireProjectile({
      elapsedSec: 71.9,
      ageMs: 2000,
      activeProjectileCount: 0,
      distanceToPlayer: 5,
      lastFireElapsedMs: 0,
      nowMs: 3000,
    })).toBe(false)
  })

  it('requires spawn age and cooldown before the first shot', () => {
    expect(canE04FireProjectile({
      elapsedSec: 91,
      ageMs: 899,
      activeProjectileCount: 0,
      distanceToPlayer: 5,
      lastFireElapsedMs: 0,
      nowMs: 3000,
    })).toBe(false)

    expect(canE04FireProjectile({
      elapsedSec: 91,
      ageMs: 901,
      activeProjectileCount: 0,
      distanceToPlayer: 5,
      lastFireElapsedMs: 0,
      nowMs: 3000,
    })).toBe(true)
  })

  it('honors global projectile, close-range, and boss pressure gates', () => {
    const base = {
      elapsedSec: 190,
      ageMs: 2000,
      activeProjectileCount: 0,
      distanceToPlayer: 5,
      lastFireElapsedMs: 0,
      nowMs: 3000,
    }

    expect(canE04FireProjectile({ ...base, activeProjectileCount: 6 })).toBe(false)
    expect(canE04FireProjectile({ ...base, distanceToPlayer: 2.9 })).toBe(false)
    expect(canE04FireProjectile({ ...base, bossPressure: true })).toBe(false)
  })

  it('raises E04 cap over the stage timeline', () => {
    expect(getStage2E04Cap(80)).toBe(1)
    expect(getStage2E04Cap(120)).toBe(2)
    expect(getStage2E04Cap(200)).toBe(2)
    expect(getStage2E04Cap(220)).toBe(2)
  })

  it('getE04Cap: stage2는 기존 상한을 위임(불변), stage3는 조기·다구간용으로 상향', () => {
    // stage2 위임 — getStage2E04Cap와 동일.
    expect(getE04Cap(80, 'stage2')).toBe(1)
    expect(getE04Cap(120, 'stage2')).toBe(2)
    expect(getE04Cap(80)).toBe(1)  // 기본 stageId=stage2
    // stage3 — 132s 전 2기, 이후 3기.
    expect(getE04Cap(50, 'stage3')).toBe(2)
    expect(getE04Cap(131, 'stage3')).toBe(2)
    expect(getE04Cap(132, 'stage3')).toBe(3)
    expect(getE04Cap(220, 'stage3')).toBe(3)
  })

  it('getE04Cap: stage4는 60s 전 2기·이후 3기(모바일 공정성상 상한 3 초과 금지)', () => {
    expect(getE04Cap(30, 'stage4')).toBe(2)
    expect(getE04Cap(59, 'stage4')).toBe(2)
    expect(getE04Cap(60, 'stage4')).toBe(3)
    expect(getE04Cap(200, 'stage4')).toBe(3)
    // 상한 3 초과 없음(전 구간 검증).
    for (let s = 0; s <= 240; s += 10) {
      expect(getE04Cap(s, 'stage4')).toBeLessThanOrEqual(3)
    }
  })
})

describe('stage-aware E04 발사 인트로 게이트 (stage4 시그니처 + 스2/스3 불변)', () => {
  it('getE04IntroSec: stage4만 18s, 그 외 72s', () => {
    expect(getE04IntroSec('stage4')).toBe(18)
    expect(getE04IntroSec('stage2')).toBe(72)
    expect(getE04IntroSec('stage3')).toBe(72)
    expect(getE04IntroSec()).toBe(72)
  })

  const ready = (overrides = {}) => ({
    ageMs: 2000,
    activeProjectileCount: 0,
    distanceToPlayer: 5,
    lastFireElapsedMs: 0,
    nowMs: 3000,
    ...overrides,
  })

  it('stage4: 18s부터 발사 가능, 17s는 불가(introSec=18)', () => {
    expect(canE04FireProjectile(ready({ elapsedSec: 17, introSec: 18 }))).toBe(false)
    expect(canE04FireProjectile(ready({ elapsedSec: 18, introSec: 18 }))).toBe(true)
  })

  it('stage2 불변: introSec 미지정(기본 72)에서 71s 불가·72s 가능', () => {
    expect(canE04FireProjectile(ready({ elapsedSec: 71 }))).toBe(false)
    expect(canE04FireProjectile(ready({ elapsedSec: 72 }))).toBe(true)
  })

  it('stage4는 보스 구간에도 발사 유지(bossPressure 미적용) — 호출측이 false를 넘긴다', () => {
    // Enemy.jsx가 stage4일 때 bossPressure:false를 넘기므로, 보스 구간 시간대(140~240)에도 발사 가능.
    expect(canE04FireProjectile(ready({ elapsedSec: 150, introSec: 18, bossPressure: false }))).toBe(true)
    // 반례(불변 확인): bossPressure:true면 여전히 차단(스2/스3 경로).
    expect(canE04FireProjectile(ready({ elapsedSec: 150, introSec: 18, bossPressure: true }))).toBe(false)
  })
})
