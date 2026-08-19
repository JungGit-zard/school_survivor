import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { useGameStore } from './useGameStore.js'
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

  it('B03/B04는 해금하지 않으며 B01/B02 재호출은 damage를 중첩하지 않는다', () => {
    const before = damageSnapshot(useGameStore.getState().weapons)
    for (const bossId of ['B03', 'B04']) useGameStore.getState().recordBossKill(bossId)
    expect(useGameStore.getState().bossPassiveUnlocks).toEqual({})
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
