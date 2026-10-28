import { beforeEach, describe, expect, it } from 'vitest'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { applyWeaponLifesteal, createLifestealState, LIFESTEAL_HEAL_FLASH_INTERVAL_MS } from './weaponLifesteal.js'
import { useGameStore } from '../store/useGameStore.js'

describe('melee lifesteal (30cm ruler, box cutter, bikitty cutter)', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame('stage1')
  })

  it.each(['schoolBag', 'boxCutter', 'bikittyCutter'])('%s carries a modest on-hit heal ratio', (id) => {
    const percent = WEAPON_CATALOG[id].base.healPercentOnHit
    expect(percent).toBeGreaterThan(0)
    // 한 번 맞힐 때 최대 HP 1% 미만 — 흡혈이 무적이 되지 않게(balanceqa 재검토 대상).
    expect(percent).toBeLessThan(0.01)
  })

  it('gives the evolved bikitty cutter the same per-swing ratio as the box cutter', () => {
    // 평균 베기 주기 1.35초(30cm 자 1.3 · 커터칼 1.625 사이)라 같은 값이 맞다.
    const b = WEAPON_CATALOG.bikittyCutter.base
    const avgSwingMs = ((b.segments - 1) * b.cooldown + (b.cooldown + b.reloadMs)) / b.segments
    expect(avgSwingMs).toBeGreaterThanOrEqual(WEAPON_CATALOG.schoolBag.base.cooldown)
    expect(b.healPercentOnHit).toBe(WEAPON_CATALOG.boxCutter.base.healPercentOnHit)
  })

  it('heals a fraction of max HP and throttles the heal flash', () => {
    const store = () => useGameStore.getState()
    const { maxHp } = store().player
    useGameStore.setState((s) => ({ player: { ...s.player, hp: maxHp / 2 } }))
    const state = createLifestealState()
    const weapon = { healPercentOnHit: 0.004 }
    const token0 = store().player.healFlashToken ?? 0

    expect(applyWeaponLifesteal(store(), weapon, 1000, state)).toBeCloseTo(maxHp * 0.004)
    expect(store().player.hp).toBeCloseTo(maxHp / 2 + maxHp * 0.004)
    expect(store().player.healFlashToken).toBe(token0 + 1)

    // 쿨다운 안의 연속 타격은 HP만 회복하고 이펙트는 다시 켜지 않는다.
    applyWeaponLifesteal(store(), weapon, 2300, state)
    applyWeaponLifesteal(store(), weapon, 3600, state)
    expect(store().player.hp).toBeCloseTo(maxHp / 2 + maxHp * 0.012)
    expect(store().player.healFlashToken).toBe(token0 + 1)

    applyWeaponLifesteal(store(), weapon, 1000 + LIFESTEAL_HEAL_FLASH_INTERVAL_MS, state)
    expect(store().player.healFlashToken).toBe(token0 + 2)
  })

  it('does nothing at full HP or without a heal ratio', () => {
    const store = () => useGameStore.getState()
    const before = store().player
    expect(applyWeaponLifesteal(store(), { healPercentOnHit: 0.004 }, 0, createLifestealState())).toBe(0)
    useGameStore.setState((s) => ({ player: { ...s.player, hp: 10 } }))
    expect(applyWeaponLifesteal(store(), {}, 0, createLifestealState())).toBe(0)
    expect(store().player.hp).toBe(10)
    expect(before.healFlashToken).toBe(store().player.healFlashToken)
  })

  it('keeps the heal ratio on the in-run weapon objects', () => {
    useGameStore.setState((s) => ({ weapons: s.weapons }))
    const { weapons } = useGameStore.getState()
    for (const id of ['schoolBag', 'boxCutter', 'bikittyCutter']) {
      if (weapons[id]) expect(weapons[id].healPercentOnHit).toBe(WEAPON_CATALOG[id].base.healPercentOnHit)
    }
  })
})
