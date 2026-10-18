import { describe, it, expect } from 'vitest'
import { useGameStore } from './useGameStore.js'

describe('actual-game vending integration', () => {
  it('exposes the atomic purchase action and per-stage entitlement in the real store', () => {
    expect(useGameStore.getState().purchaseStageVendingItem).toBeTypeOf('function')
    expect(useGameStore.getState().stageVendingPurchasedItemIds).toEqual([])
  })
})
