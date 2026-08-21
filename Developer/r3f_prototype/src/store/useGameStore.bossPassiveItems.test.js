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
const B02_TARGET_WEAPON_IDS = ['pencilThrow', 'bell', 'onigiri']

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

  it('B02 첫 처치는 복도 출입증을 해금하고 현재 런과 다음 런의 세 대상 damage만 정확히 1.05배 한다', () => {
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
    const before = damageSnapshot(useGameStore.getState().weapons)
    useGameStore.getState().recordBossKill('B04')
    expect(useGameStore.getState().bossPassiveUnlocks).toEqual({ b04ServingLadle: true })
    expect(damageSnapshot(useGameStore.getState().weapons)).toEqual(before)

    useGameStore.getState().recordBossKill('B01')
    const once = damageSnapshot(useGameStore.getState().weapons)
    useGameStore.getState().recordBossKill('B01')
    expect(damageSnapshot(useGameStore.getState().weapons)).toEqual(once)

    useGameStore.getState().recordBossKill('B02')
    const b02Once = damageSnapshot(useGameStore.getState().weapons)
    useGameStore.getState().recordBossKill('B02')
    expect(damageSnapshot(useGameStore.getState().weapons)).toEqual(b02Once)
  })

  it('applies B04 max HP once while preserving the current HP ratio', () => {
    useGameStore.setState((state) => ({ player: { ...state.player, hp: 45, maxHp: 90 } }))
    useGameStore.getState().recordBossKill('B04')
    const once = useGameStore.getState().player
    expect(once).toMatchObject({ maxHp: 94.5, hp: 47.25, bossPassiveMaxHpMultiplier: 1.05 })
    useGameStore.getState().recordBossKill('B04')
    expect(useGameStore.getState().player).toEqual(once)
  })

  it.each([
    ['B01', 'boxCutter', 'boxCutterDamage'],
    ['B01', 'schoolBag', 'bagDamage'],
    ['B01', 'bikittyCutter', 'bikittyCutterDamage'],
    ['B02', 'pencilThrow', 'pencilDamage'],
    ['B02', 'bell', 'bellDamage'],
    ['B02', 'onigiri', 'onigiiriDamage'],
  ])('B01/B02 대상 무기 %s의 damage 카드는 최종 증가분에도 5%%를 적용한다', (bossId, weaponId, upgradeKey) => {
    useGameStore.getState().recordBossKill(bossId)
    const before = useGameStore.getState().weapons[weaponId].damage

    useGameStore.getState().applyUpgrade(upgradeKey)

    expect(useGameStore.getState().weapons[weaponId].damage)
      .toBeCloseTo(before + UPGRADE_EFFECTS[upgradeKey].dmg * 1.05, 12)
  })

  it('B01 damage 카드 증가분은 치비코 보정과 함께 적용된다', () => {
    useGameStore.getState().recordBossKill('B01')
    useGameStore.getState().cheatAcquireWeapon('boxCutter')
    useGameStore.getState().cheatAcquireWeapon('chibiko')
    const before = useGameStore.getState().weapons.boxCutter.damage

    useGameStore.getState().applyUpgrade('boxCutterDamage')

    expect(useGameStore.getState().weapons.boxCutter.damage)
      .toBeCloseTo(before + UPGRADE_EFFECTS.boxCutterDamage.dmg * 1.05 * 1.1, 12)
    expect(useGameStore.getState().weapons.boxCutter.chibikoBoostApplied).toBe(true)
  })

  it('B04 최대 체력 패시브 뒤 maxHealth 카드는 maxHp와 회복량을 21 올리고, 미해금이면 20만 올린다', () => {
    const noPassiveBefore = useGameStore.getState().player
    useGameStore.getState().applyUpgrade('maxHealth')
    expect(useGameStore.getState().player.maxHp).toBe(noPassiveBefore.maxHp + 20)
    expect(useGameStore.getState().player.hp).toBe(noPassiveBefore.hp + 20)

    useGameStore.getState().resetGame('stage4')
    useGameStore.getState().recordBossKill('B04')
    const passiveBefore = useGameStore.getState().player
    useGameStore.getState().applyUpgrade('maxHealth')
    expect(useGameStore.getState().player.maxHp).toBeCloseTo(passiveBefore.maxHp + 21, 12)
    expect(useGameStore.getState().player.hp).toBeCloseTo(passiveBefore.hp + 21, 12)
  })

  it('B03 첫 처치는 현재와 다음 런 이동속도를 5% 올리되 기존 cap을 넘지 않는다', () => {
    const before = useGameStore.getState().player.speed
    useGameStore.getState().recordBossKill('B03')
    expect(useGameStore.getState().bossPassiveUnlocks).toEqual({ b03GymWhistle: true })
    expect(useGameStore.getState().player.speed).toBeCloseTo(before * 1.05, 12)
    useGameStore.getState().recordBossKill('B03')
    expect(useGameStore.getState().player.speed).toBeCloseTo(before * 1.05, 12)
    useGameStore.getState().resetGame('stage3')
    expect(useGameStore.getState().player.speed).toBeCloseTo(before * 1.05, 12)
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
    for (const id of B02_TARGET_WEAPON_IDS) expect(state.weapons[id].damage).toBeCloseTo(before[id] * 1.05, 12)
    expect(state.player.speed).toBeCloseTo(3.15, 12)
    expect(state.player.maxHp).toBeCloseTo(105, 12)
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
