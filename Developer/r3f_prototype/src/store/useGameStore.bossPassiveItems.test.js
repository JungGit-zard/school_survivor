import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { useGameStore } from './useGameStore.js'
import { UPGRADE_EFFECTS } from '../lib/upgrades.js'
import {
  _resetFirebaseProgressForTests,
  _seedHydratedFirebaseProgressForTests,
  _setFirebaseProgressClientForTests,
} from '../lib/firebaseProgress.js'

const TARGET_WEAPON_IDS = ['boxCutter', 'schoolBag', 'bikittyCutter']
const B02_TARGET_WEAPON_IDS = ['lineDraw', 'bell', 'studentLantern']
const B03_TARGET_WEAPON_IDS = ['miniRosari', 'chibiko', 'onigiri']
const B04_TARGET_WEAPON_IDS = ['tumbler', 'scienceFlask', 'eraserBomb']

function damageSnapshot(weapons) {
  return Object.fromEntries(Object.entries(weapons).map(([id, weapon]) => [id, weapon.damage]))
}

describe('B01 삼각자 보스 패시브 런타임', () => {
  beforeEach(() => {
    _setFirebaseProgressClientForTests({ save: async () => {}, load: async () => null })
    _seedHydratedFirebaseProgressForTests()
    useGameStore.setState({ bossPassiveUnlocks: {} })
    useGameStore.getState().resetGame('stage1')
  })

  it('B01 첫 처치는 삼각자를 해금하고 현재 런의 세 대상 damage만 정확히 1.05배 한다', () => {
    const before = damageSnapshot(useGameStore.getState().weapons)

    useGameStore.getState().recordBossKill('B01')

    const state = useGameStore.getState()
    expect(state.bossPassiveUnlocks).toEqual({ b01SetSquare: true })
    for (const id of TARGET_WEAPON_IDS) expect(state.weapons[id].damage).toBeCloseTo(before[id] * 1.05, 12)
    for (const [id, weapon] of Object.entries(state.weapons)) {
      if (!TARGET_WEAPON_IDS.includes(id)) expect(weapon.damage).toBe(before[id])
    }
  })

  it('실제 Enemy 보스 사망 경로는 boss type을 store로 전달한다', () => {
    const enemySource = readFileSync(new URL('../components/Enemy.jsx', import.meta.url), 'utf8')
    expect(enemySource).toContain('store.recordBossKill(type)')
  })

  it('B02 첫 처치는 복도 통제선을 해금하고 현재 런과 다음 런의 세 대상 damage만 정확히 1.05배 한다', () => {
    const before = damageSnapshot(useGameStore.getState().weapons)

    useGameStore.getState().recordBossKill('B02')

    let state = useGameStore.getState()
    expect(state.bossPassiveUnlocks).toEqual({ b02CorridorPass: true })
    for (const id of B02_TARGET_WEAPON_IDS) expect(state.weapons[id].damage).toBeCloseTo(before[id] * 1.05, 12)
    for (const [id, weapon] of Object.entries(state.weapons)) {
      if (!B02_TARGET_WEAPON_IDS.includes(id)) expect(weapon.damage).toBe(before[id])
    }

    const once = damageSnapshot(state.weapons)
    useGameStore.getState().recordBossKill('B02')
    expect(damageSnapshot(useGameStore.getState().weapons)).toEqual(once)

    useGameStore.getState().resetGame('stage2')
    state = useGameStore.getState()
    for (const id of B02_TARGET_WEAPON_IDS) expect(state.weapons[id].damage).toBeCloseTo(before[id] * 1.05, 12)
  })

  it('B04를 해금해도 B01/B02 재호출은 damage를 중첩하지 않는다', () => {
    useGameStore.getState().recordBossKill('B04')
    expect(useGameStore.getState().bossPassiveUnlocks).toEqual({ b04ServingLadle: true })

    useGameStore.getState().recordBossKill('B01')
    const once = damageSnapshot(useGameStore.getState().weapons)
    useGameStore.getState().recordBossKill('B01')
    expect(damageSnapshot(useGameStore.getState().weapons)).toEqual(once)

    useGameStore.getState().recordBossKill('B02')
    const b02Once = damageSnapshot(useGameStore.getState().weapons)
    useGameStore.getState().recordBossKill('B02')
    expect(damageSnapshot(useGameStore.getState().weapons)).toEqual(b02Once)
  })

  it.each([
    ['B03', 'b03GymWhistle', 'stage3', B03_TARGET_WEAPON_IDS],
    ['B04', 'b04ServingLadle', 'stage4', B04_TARGET_WEAPON_IDS],
  ])('%s 첫 처치는 %s를 해금하고 현재 런과 다음 런의 세 대상 damage만 정확히 1.05배 한다', (bossId, itemId, stageId, targetIds) => {
    const before = damageSnapshot(useGameStore.getState().weapons)
    const playerBefore = useGameStore.getState().player

    useGameStore.getState().recordBossKill(bossId)

    let state = useGameStore.getState()
    expect(state.bossPassiveUnlocks).toEqual({ [itemId]: true })
    for (const id of targetIds) expect(state.weapons[id].damage).toBeCloseTo(before[id] * 1.05, 12)
    for (const [id, weapon] of Object.entries(state.weapons)) {
      if (!targetIds.includes(id)) expect(weapon.damage).toBe(before[id])
    }
    expect(state.player.speed).toBe(playerBefore.speed)
    expect(state.player.maxHp).toBe(playerBefore.maxHp)

    const once = damageSnapshot(state.weapons)
    useGameStore.getState().recordBossKill(bossId)
    expect(damageSnapshot(useGameStore.getState().weapons)).toEqual(once)

    useGameStore.getState().resetGame(stageId)
    state = useGameStore.getState()
    for (const id of targetIds) expect(state.weapons[id].damage).toBeCloseTo(before[id] * 1.05, 12)
  })

  it.each([
    ['B01', 'boxCutter', 'boxCutterDamage'],
    ['B01', 'schoolBag', 'bagDamage'],
    ['B01', 'bikittyCutter', 'bikittyCutterDamage'],
    ['B02', 'lineDraw', 'lineDrawDamage'],
    ['B02', 'bell', 'bellDamage'],
    ['B02', 'studentLantern', 'lanternDamage'],
    ['B03', 'miniRosari', 'miniRosariDamage'],
    ['B03', 'chibiko', 'chibikoDamage'],
    ['B03', 'onigiri', 'onigiiriDamage'],
    ['B04', 'tumbler', 'tumblerDamage'],
    ['B04', 'scienceFlask', 'flaskDamage'],
    ['B04', 'eraserBomb', 'eraserDamage'],
  ])('보스 %s 대상 무기 %s의 damage 카드는 최종 증가분에도 5%%를 적용한다', (bossId, weaponId, upgradeKey) => {
    useGameStore.getState().recordBossKill(bossId)
    useGameStore.getState().cheatAcquireWeapon(weaponId)
    const before = useGameStore.getState().weapons[weaponId].damage

    useGameStore.getState().applyUpgrade(upgradeKey)

    // 1d445298: cutter damage cards scale current damage (damageMultiplier) instead of adding dmg.
    // The base already carries the boss passive, so the increase keeps the 5% proportionally.
    const effect = UPGRADE_EFFECTS[upgradeKey]
    expect(useGameStore.getState().weapons[weaponId].damage)
      .toBeCloseTo(Number.isFinite(effect.damageMultiplier) ? before * effect.damageMultiplier : before + effect.dmg * 1.05, 12)
  })

  it('B01 damage 카드 증가분은 치비코 보정과 함께 적용된다', () => {
    useGameStore.getState().recordBossKill('B01')
    useGameStore.getState().cheatAcquireWeapon('boxCutter')
    useGameStore.getState().cheatAcquireWeapon('chibiko')
    const before = useGameStore.getState().weapons.boxCutter.damage

    useGameStore.getState().applyUpgrade('boxCutterDamage')

    // 1d445298: ratio cards scale the chibiko-boosted current damage directly (applyUpgradeWithChibikoBoost).
    expect(useGameStore.getState().weapons.boxCutter.damage)
      .toBeCloseTo(before * UPGRADE_EFFECTS.boxCutterDamage.damageMultiplier, 12)
    expect(useGameStore.getState().weapons.boxCutter.chibikoBoostApplied).toBe(true)
  })

  it('B04 해금 뒤에도 maxHealth 카드는 maxHp와 회복량을 정확히 7 올린다', () => {
    useGameStore.getState().recordBossKill('B04')
    const before = useGameStore.getState().player
    useGameStore.getState().applyUpgrade('maxHealth')
    expect(useGameStore.getState().player.maxHp).toBe(before.maxHp + 7)
    expect(useGameStore.getState().player.hp).toBe(before.hp + 7)
  })

  it('Firebase 정본에서 새 런과 reloadPersistentProgress로 다시 빌드해도 삼각자를 유지한다', () => {
    const before = damageSnapshot(useGameStore.getState().weapons)
    useGameStore.getState().recordBossKill('B01')
    useGameStore.getState().resetGame('stage2')

    let state = useGameStore.getState()
    expect(state.bossPassiveUnlocks).toEqual({ b01SetSquare: true })
    for (const id of TARGET_WEAPON_IDS) expect(state.weapons[id].damage).toBeCloseTo(before[id] * 1.05, 12)

    useGameStore.setState({ bossPassiveUnlocks: {}, weapons: {} })
    expect(useGameStore.getState().reloadPersistentProgress()).toBe(true)
    state = useGameStore.getState()
    expect(state.bossPassiveUnlocks).toEqual({ b01SetSquare: true })
    for (const id of TARGET_WEAPON_IDS) expect(state.weapons[id].damage).toBeCloseTo(before[id] * 1.05, 12)
  })

  it('Firebase 정본에서 B02~B04 해금도 reloadPersistentProgress 뒤 다음 런 효과로 복원한다', () => {
    const before = damageSnapshot(useGameStore.getState().weapons)
    useGameStore.getState().recordBossKill('B02')
    useGameStore.getState().recordBossKill('B03')
    useGameStore.getState().recordBossKill('B04')
    useGameStore.getState().resetGame('stage4')
    useGameStore.setState({ bossPassiveUnlocks: {}, weapons: {} })

    expect(useGameStore.getState().reloadPersistentProgress()).toBe(true)

    const state = useGameStore.getState()
    expect(state.bossPassiveUnlocks).toEqual({ b02CorridorPass: true, b03GymWhistle: true, b04ServingLadle: true })
    for (const id of [...B02_TARGET_WEAPON_IDS, ...B03_TARGET_WEAPON_IDS, ...B04_TARGET_WEAPON_IDS]) {
      expect(state.weapons[id].damage).toBeCloseTo(before[id] * 1.05, 12)
    }
    // reload를 두 번 해도 1.05 × 1.05가 되지 않는다(balanceqa 권고 2026-10-31).
    expect(useGameStore.getState().reloadPersistentProgress()).toBe(true)
    expect(useGameStore.getState().weapons.onigiri.damage).toBeCloseTo(before.onigiri * 1.05, 12)
  })

  it('미hydrate 상태에서도 B01 처치와 다음 resetGame은 메모리 해금을 유지하고 플레이를 막지 않는다', () => {
    _resetFirebaseProgressForTests()
    useGameStore.setState({ bossPassiveUnlocks: {} })
    expect(() => useGameStore.getState().resetGame('stage1')).not.toThrow()
    const before = damageSnapshot(useGameStore.getState().weapons)

    expect(() => useGameStore.getState().recordBossKill('B01')).not.toThrow()
    expect(useGameStore.getState().bossPassiveUnlocks).toEqual({ b01SetSquare: true })
    for (const id of TARGET_WEAPON_IDS) expect(useGameStore.getState().weapons[id].damage).toBeCloseTo(before[id] * 1.05, 12)

    expect(() => useGameStore.getState().resetGame('stage1')).not.toThrow()
    for (const id of TARGET_WEAPON_IDS) expect(useGameStore.getState().weapons[id].damage).toBeCloseTo(before[id] * 1.05, 12)
  })
})
