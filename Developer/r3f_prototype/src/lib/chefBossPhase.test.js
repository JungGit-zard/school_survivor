import { describe, expect, it } from 'vitest'
import {
  CHEF_PHASE1,
  CHEF_TELEGRAPH,
  CHEF_PHASE2,
  CHEF_ENRAGE_HP_RATIO,
  CHEF_TELEGRAPH_MS,
  advanceChefBossPhase,
  isChefTelegraph,
  isChefEnraged,
  resolveChefBossActiveStats,
} from './chefBossPhase.js'

describe('chefBossPhase — 페이즈 판정', () => {
  it('HP>50% 동안은 phase1(포격) 유지', () => {
    expect(advanceChefBossPhase(CHEF_PHASE1, { hpRatio: 1.0 })).toBe(CHEF_PHASE1)
    expect(advanceChefBossPhase(CHEF_PHASE1, { hpRatio: 0.51 })).toBe(CHEF_PHASE1)
  })

  it('HP<=50% 경계에서 텔레그래프로 전환 (0.5 포함)', () => {
    expect(CHEF_ENRAGE_HP_RATIO).toBe(0.5)
    expect(advanceChefBossPhase(CHEF_PHASE1, { hpRatio: 0.5 })).toBe(CHEF_TELEGRAPH)
    expect(advanceChefBossPhase(CHEF_PHASE1, { hpRatio: 0.4999 })).toBe(CHEF_TELEGRAPH)
  })

  it('텔레그래프는 지속시간 경과 전에는 유지, 경과 후 phase2로 전환', () => {
    expect(CHEF_TELEGRAPH_MS).toBeGreaterThanOrEqual(800)
    expect(CHEF_TELEGRAPH_MS).toBeLessThanOrEqual(1200)
    expect(advanceChefBossPhase(CHEF_TELEGRAPH, { hpRatio: 0.3, telegraphElapsedMs: 0 })).toBe(CHEF_TELEGRAPH)
    expect(advanceChefBossPhase(CHEF_TELEGRAPH, { hpRatio: 0.3, telegraphElapsedMs: CHEF_TELEGRAPH_MS - 1 })).toBe(CHEF_TELEGRAPH)
    expect(advanceChefBossPhase(CHEF_TELEGRAPH, { hpRatio: 0.3, telegraphElapsedMs: CHEF_TELEGRAPH_MS })).toBe(CHEF_PHASE2)
    expect(advanceChefBossPhase(CHEF_TELEGRAPH, { hpRatio: 0.3, telegraphElapsedMs: CHEF_TELEGRAPH_MS + 500 })).toBe(CHEF_PHASE2)
  })

  it('단방향: phase2 도달 후에는 HP가 회복돼도 phase2 유지', () => {
    expect(advanceChefBossPhase(CHEF_PHASE2, { hpRatio: 0.9, telegraphElapsedMs: 0 })).toBe(CHEF_PHASE2)
    expect(advanceChefBossPhase(CHEF_PHASE2, { hpRatio: 1.0 })).toBe(CHEF_PHASE2)
  })

  it('기본 인자 방어: 인자 없으면 phase1 유지', () => {
    expect(advanceChefBossPhase(CHEF_PHASE1)).toBe(CHEF_PHASE1)
  })
})

describe('chefBossPhase — 헬퍼', () => {
  it('isChefTelegraph / isChefEnraged', () => {
    expect(isChefTelegraph(CHEF_TELEGRAPH)).toBe(true)
    expect(isChefTelegraph(CHEF_PHASE1)).toBe(false)
    expect(isChefEnraged(CHEF_PHASE1)).toBe(false)
    expect(isChefEnraged(CHEF_TELEGRAPH)).toBe(true)
    expect(isChefEnraged(CHEF_PHASE2)).toBe(true)
  })
})

describe('chefBossPhase — 실효 스탯 선택', () => {
  const chefStats = {
    chefBoss: true,
    hp: 1500,
    speed: 0.475,
    damage: 22,
    contactDist: 0.36,
    chefPhase1: { ranged: true, rangedCooldown: 2600, rangedDmg: 14, rangedSpeed: 1.6, preferDist: 5.0, minDist: 3.0 },
    chefPhase2: { charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 },
  }

  it('phase1/telegraph는 포격 블록(ranged) 병합, charger 아님', () => {
    const p1 = resolveChefBossActiveStats(chefStats, CHEF_PHASE1)
    expect(p1.ranged).toBe(true)
    expect(p1.rangedCooldown).toBe(2600)
    expect(p1.charger).toBeUndefined()
    const tel = resolveChefBossActiveStats(chefStats, CHEF_TELEGRAPH)
    expect(tel.ranged).toBe(true)
    expect(tel.charger).toBeUndefined()
  })

  it('phase2는 차저 블록(charger) 병합, ranged 아님', () => {
    const p2 = resolveChefBossActiveStats(chefStats, CHEF_PHASE2)
    expect(p2.charger).toBe(true)
    expect(p2.chargeSpeed).toBe(1.4)
    expect(p2.chargeDuration).toBe(2200)
    expect(p2.ranged).toBeUndefined()
    expect(p2.mathTeacherSpecial).toBeUndefined()
  })

  it('공통 스탯(speed/damage/contactDist)은 양 페이즈 동일 유지', () => {
    const p1 = resolveChefBossActiveStats(chefStats, CHEF_PHASE1)
    const p2 = resolveChefBossActiveStats(chefStats, CHEF_PHASE2)
    expect(p1.speed).toBe(0.475)
    expect(p2.speed).toBe(0.475)
    expect(p1.damage).toBe(22)
    expect(p2.contactDist).toBe(0.36)
  })

  it('chefBoss가 아니면 스탯 객체를 그대로(동일 참조) 반환', () => {
    const plain = { charger: true, chargeSpeed: 1.7 }
    expect(resolveChefBossActiveStats(plain, CHEF_PHASE2)).toBe(plain)
  })
})
