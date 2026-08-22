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
})
