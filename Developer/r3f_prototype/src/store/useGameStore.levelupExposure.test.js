// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './useGameStore.js'

describe('level-up acquire exposure ledger', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
    useGameStore.setState({ phase: 'levelup', levelUpChoiceSerial: 41 })
  })

  it('records one immutable acquire exposure snapshot per level-up serial', () => {
    useGameStore.getState().recordLevelupAcquireExposure(['acquireA', 'acquireB', 'acquireA'], 41)
    expect(useGameStore.getState()).toMatchObject({
      levelUpAcquireExposureKeys: ['acquireA', 'acquireB'],
      levelUpAcquireExposureSerial: 41,
    })

    useGameStore.getState().recordLevelupAcquireExposure(['acquireC'], 41)
    expect(useGameStore.getState().levelUpAcquireExposureKeys).toEqual(['acquireA', 'acquireB'])
  })

  it('run reset clears the exposure ledger back to the first cycle', () => {
    useGameStore.getState().recordLevelupAcquireExposure(['acquireA'], 41)
    useGameStore.getState().resetGame()
    expect(useGameStore.getState()).toMatchObject({
      levelUpAcquireExposureKeys: [],
      levelUpAcquireExposureSerial: -1,
    })
  })

  it('records the displayed weapon groups once per level-up serial', () => {
    useGameStore.getState().recordLevelupWeaponCycle(['pencilThrow', 'schoolBag', 'pencilThrow'], 41)
    useGameStore.getState().recordLevelupWeaponCycle(['tumbler'], 41)

    expect(useGameStore.getState()).toMatchObject({
      levelUpWeaponCycleIds: ['pencilThrow', 'schoolBag'],
      levelUpWeaponCycleSerial: 41,
    })
  })

  it('clears the displayed-weapon cycle for every new run or stage', () => {
    useGameStore.getState().recordLevelupWeaponCycle(['pencilThrow'], 41)

    useGameStore.getState().resetGame()
    expect(useGameStore.getState()).toMatchObject({ levelUpWeaponCycleIds: [], levelUpWeaponCycleSerial: -1 })

    useGameStore.setState({ phase: 'levelup', levelUpChoiceSerial: 42 })
    useGameStore.getState().recordLevelupWeaponCycle(['pencilThrow'], 42)
    useGameStore.getState().resetGame('stage2')
    expect(useGameStore.getState()).toMatchObject({ levelUpWeaponCycleIds: [], levelUpWeaponCycleSerial: -1 })
  })
})
