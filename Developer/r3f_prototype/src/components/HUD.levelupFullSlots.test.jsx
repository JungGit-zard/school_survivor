// Terry 2026-11-25: 무기 슬롯이 꽉 찬 뒤 레벨업 4칸에는 연필이 아닌 보유 무기 강화가 반드시 1장 이상 있어야 한다.
// "연필 아니면 버리기"만 남는 화면이 절대 나오면 안 된다(확률이 아닌 하드 보장).
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/weaponUnlocks.js', async (importOriginal) => {
  const actual = await importOriginal()
  // 최악 조건: 계정 해금이 전부 끝나 획득 카드 후보가 가장 많은 상태.
  return { ...actual, isUnlocked: () => true }
})

import { pickFour, UPGRADES } from './HUD.jsx'
import { MAX_OWNED_WEAPONS, UPGRADE_EFFECTS, isUpgradeAvailable } from '../lib/upgrades.js'
import { useGameStore } from '../store/useGameStore.js'

const PENCIL = 'pencilThrow'

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const shuffle = (items, rand) => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

let baseWeapons
let basePlayer
const upgradableWeaponIds = () => [...new Set(UPGRADES
  .map((upgrade) => UPGRADE_EFFECTS[upgrade.key])
  .filter((effect) => effect?.weapon && effect.kind !== 'acquire')
  .map((effect) => effect.weapon))]
  .filter((id) => baseWeapons[id])

function buildWeapons(ownedLevels) {
  return Object.fromEntries(Object.entries(baseWeapons).map(([id, weapon]) => [
    id,
    ownedLevels[id] != null ? { ...weapon, active: true, level: ownedLevels[id] } : { ...weapon, active: false },
  ]))
}

const isOwnedUpgrade = (key, weapons) => {
  const effect = UPGRADE_EFFECTS[key]
  return Boolean(effect?.weapon && effect.kind !== 'acquire' && weapons[effect.weapon]?.active)
}

function nonPencilUpgradableOwned(weapons, level, player) {
  return Object.entries(UPGRADE_EFFECTS).some(([, effect]) => effect.weapon
    && effect.weapon !== PENCIL
    && effect.kind !== 'acquire'
    && weapons[effect.weapon]?.active
    && isUpgradeAvailable(effect, level, weapons, player))
}

function expectValidScreen(choiceKeys, weapons, level, player) {
  expect(choiceKeys.length).toBeLessThanOrEqual(4)
  expect(new Set(choiceKeys).size).toBe(choiceKeys.length)
  for (const key of choiceKeys) {
    expect(isUpgradeAvailable(UPGRADE_EFFECTS[key], level, weapons, player)).toBe(true)
    const effect = UPGRADE_EFFECTS[key]
    if (effect?.weapon && effect.kind !== 'acquire') expect(weapons[effect.weapon].level).toBeLessThan(5)
  }
}

describe('full weapon slots level-up guarantee', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame('stage1')
    baseWeapons = useGameStore.getState().weapons
    basePlayer = useGameStore.getState().player
  })

  it('always offers a non-pencil owned-weapon upgrade across 2000 seeded full-slot screens', () => {
    const ids = upgradableWeaponIds().filter((id) => id !== PENCIL)
    expect(ids.length).toBeGreaterThanOrEqual(MAX_OWNED_WEAPONS - 1)
    let checked = 0
    for (let seed = 1; seed <= 2000; seed += 1) {
      const rand = mulberry32(seed)
      const owned = [PENCIL, ...shuffle(ids, rand).slice(0, MAX_OWNED_WEAPONS - 1)]
      const levels = Object.fromEntries(owned.map((id) => [id, 1 + Math.floor(rand() * 5)]))
      // 연필 외 최소 1개는 강화 가능하게 남긴다.
      if (owned.slice(1).every((id) => levels[id] >= 5)) levels[owned[1 + Math.floor(rand() * 9)]] = 1 + Math.floor(rand() * 4)
      const weapons = buildWeapons(levels)
      const level = 10 + Math.floor(rand() * 60)
      const player = { ...basePlayer, level }
      if (!nonPencilUpgradableOwned(weapons, level, player)) continue
      const ownedCycle = shuffle(owned, rand).slice(0, Math.floor(rand() * owned.length))
      const weaponCycle = shuffle(Object.keys(baseWeapons), rand).slice(0, Math.floor(rand() * 8))
      const { choiceKeys } = pickFour(level, weapons, player, [], [], weaponCycle, ownedCycle,
        upgradableWeaponIds())
      expectValidScreen(choiceKeys, weapons, level, player)
      const hasNonPencilOwned = choiceKeys.some((key) => isOwnedUpgrade(key, weapons) && UPGRADE_EFFECTS[key].weapon !== PENCIL)
      if (!hasNonPencilOwned) throw new Error(`seed ${seed}: ${choiceKeys.join(',')}`)
      checked += 1
    }
    expect(checked).toBeGreaterThan(1500)
  })

  it('keeps the guarantee on every screen of a 60-level full-slot run fed by its own ledgers', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const rand = mulberry32(seed * 977)
      const owned = [PENCIL, ...shuffle(upgradableWeaponIds().filter((id) => id !== PENCIL), rand).slice(0, 9)]
      let weapons = buildWeapons(Object.fromEntries(owned.map((id) => [id, 1])))
      let exposed = []
      let weaponCycle = []
      let ownedCycle = []
      for (let level = 10; level < 70; level += 1) {
        const player = { ...basePlayer, level }
        const selection = pickFour(level, weapons, player, [], exposed, weaponCycle, ownedCycle, upgradableWeaponIds())
        const { choiceKeys } = selection
        expectValidScreen(choiceKeys, weapons, level, player)
        if (nonPencilUpgradableOwned(weapons, level, player)) {
          expect(choiceKeys.some((key) => isOwnedUpgrade(key, weapons) && UPGRADE_EFFECTS[key].weapon !== PENCIL)).toBe(true)
        }
        exposed = selection.nextExposedAcquireKeys
        weaponCycle = selection.nextWeaponCycleIds
        ownedCycle = selection.nextOwnedWeaponCycleIds
        // 버리지 않는 쪽: 보유 무기 강화 중 무작위 하나를 고른다.
        const ownedPicks = choiceKeys.filter((key) => isOwnedUpgrade(key, weapons))
        if (ownedPicks.length === 0) continue
        const pick = UPGRADE_EFFECTS[ownedPicks[Math.floor(rand() * ownedPicks.length)]]
        weapons = { ...weapons, [pick.weapon]: { ...weapons[pick.weapon], level: Math.min(5, weapons[pick.weapon].level + 1) } }
      }
    }
  })

  it('falls back to pencil only when every other owned weapon is maxed', () => {
    const owned = [PENCIL, ...upgradableWeaponIds().filter((id) => id !== PENCIL).slice(0, 9)]
    const weapons = buildWeapons(Object.fromEntries(owned.map((id) => [id, id === PENCIL ? 2 : 5])))
    const player = { ...basePlayer, level: 30 }
    const { choiceKeys } = pickFour(30, weapons, player, [], [], [], [], upgradableWeaponIds())
    expectValidScreen(choiceKeys, weapons, 30, player)
    expect(choiceKeys.some((key) => isOwnedUpgrade(key, weapons) && UPGRADE_EFFECTS[key].weapon === PENCIL)).toBe(true)
  })

  it('does not crash and offers no owned-weapon upgrade when every owned weapon is maxed', () => {
    const owned = [PENCIL, ...upgradableWeaponIds().filter((id) => id !== PENCIL).slice(0, 9)]
    const weapons = buildWeapons(Object.fromEntries(owned.map((id) => [id, 5])))
    const player = { ...basePlayer, level: 40 }
    const { choiceKeys } = pickFour(40, weapons, player, [], [], [], [], upgradableWeaponIds())
    expectValidScreen(choiceKeys, weapons, 40, player)
    expect(choiceKeys.some((key) => isOwnedUpgrade(key, weapons))).toBe(false)
  })
})
