import { describe, expect, it } from 'vitest'
import { selectSequentialLevelupChoices } from './upgrades.js'

describe('owned weapon level-up guarantee', () => {
  const orderedKeys = ['acquireA', 'aDamage', 'bDamage', 'health', 'armor']
  const weaponFor = (key) => ({ acquireA: 'A', aDamage: 'A', bDamage: 'B' })[key] ?? null
  const isAcquireKey = (key) => key === 'acquireA'

  it('reserves one eligible owned upgrade and rotates it independently from other displayed weapons', () => {
    const first = selectSequentialLevelupChoices({ orderedKeys, availableKeys: orderedKeys, ownedWeaponCycleIds: [], ownedRotationWeaponIds: ['A', 'B'], isAcquireKey, getWeaponCycleId: weaponFor })
    expect(first.choiceKeys).toContain('aDamage')
    expect(first.nextOwnedWeaponCycleIds).toEqual(['A'])

    const second = selectSequentialLevelupChoices({ orderedKeys, availableKeys: orderedKeys, ownedWeaponCycleIds: first.nextOwnedWeaponCycleIds, ownedRotationWeaponIds: ['A', 'B'], isAcquireKey, getWeaponCycleId: weaponFor })
    expect(second.choiceKeys).toContain('bDamage')
    expect(second.nextOwnedWeaponCycleIds).toEqual(['A', 'B'])
  })

  it('skips an unavailable or maxed owned weapon without suppressing the next eligible one', () => {
    const result = selectSequentialLevelupChoices({ orderedKeys, availableKeys: ['acquireA', 'bDamage', 'health', 'armor'], ownedWeaponCycleIds: ['A'], ownedRotationWeaponIds: ['A', 'B'], isAcquireKey, getWeaponCycleId: weaponFor })
    expect(result.choiceKeys).toContain('bDamage')
    expect(result.nextOwnedWeaponCycleIds).toEqual(['B'])
  })

  it('reserves the owned upgrade ahead of four pending cards and consumes it when it is pending', () => {
    const result = selectSequentialLevelupChoices({
      orderedKeys,
      availableKeys: orderedKeys,
      pendingGuaranteedKeys: ['aDamage', 'acquireA', 'health', 'armor'],
      ownedRotationWeaponIds: ['A', 'B'],
      isAcquireKey,
      getWeaponCycleId: weaponFor,
    })
    expect(result.choiceKeys).toEqual(['aDamage', 'acquireA', 'health', 'armor'])
    expect(result.displayedGuaranteedKeys).toEqual(['aDamage', 'acquireA', 'health', 'armor'])
    expect(result.nextOwnedWeaponCycleIds).toEqual(['A'])
  })
})
