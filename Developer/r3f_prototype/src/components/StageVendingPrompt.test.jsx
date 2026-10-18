// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import StageVendingPrompt from './StageVendingPrompt.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { playerPos } from '../lib/refs.js'
import { getStageVendingPlacement } from '../lib/stageVending.js'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { installProgressTransactionTestClient } from '../../test/progressTransactionClient.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let host, root, fixtureId = 0
const live = () => useGameStore.getState()
const button = () => host.querySelector('[data-testid="stage-vending-buy"]')
function move(stage = 'stage1') {
  const { x, z } = getStageVendingPlacement(stage).position
  playerPos.set(x, 0, z)
}
function mount() { act(() => root.render(<StageVendingPrompt />)) }
function click() { act(() => button().dispatchEvent(new MouseEvent('click', { bubbles: true }))) }
beforeEach(() => {
  vi.useFakeTimers()
  _seedHydratedFirebaseProgressForTests({ uid: `vending-ui-test-${++fixtureId}` }, { progress: { goldTotal: 20 } })
  installProgressTransactionTestClient()
  live().resetGame('stage1')
  useGameStore.setState(s => ({ phase: 'playing', goldTotal: 20, player: { ...s.player, hp: 40, maxHp: 100 } }))
  move()
  host = document.createElement('div'); document.body.append(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers() })
describe('real prompt + real store', () => {
  it('click heals once, debits persistent wallet and shows sold-out feedback', () => {
    mount(); expect(button().disabled).toBe(false)
    click(); expect(live().player.hp).toBe(75); expect(live().goldTotal).toBe(15)
    expect(button().disabled).toBe(true)
    act(() => vi.advanceTimersByTime(1700))
    expect(button().textContent).toBe('구매 완료')
  })
  it('reserves pause clearance with safe-area bottom and keeps success feedback non-red', () => {
    mount()
    expect(host.querySelector('[data-testid="stage-vending-prompt"]').style.bottom).toContain('160px')
    click()
    expect(host.querySelector('[data-testid="stage-vending-status"]').style.color).toBe('rgb(187, 247, 208)')
  })
  it.each([['full', { hp: 100 }, 20], ['insufficient', { hp: 40 }, 4]])('%s cannot consume gold or purchase right', (status, player, gold) => {
    useGameStore.setState(s => ({ player: { ...s.player, ...player }, goldTotal: gold }))
    mount(); expect(button().disabled).toBe(true)
    expect(button().textContent).toBe(status === 'full' ? 'HP 가득' : '골드 부족')
    expect(live().stageVendingPurchasedItemIds).toEqual([])
  })
  it('store rechecks actual range even before the 100ms UI poll catches movement', () => {
    mount(); playerPos.set(999, 0, 999); click()
    expect(live().goldTotal).toBe(20); expect(live().player.hp).toBe(40)
    act(() => vi.advanceTimersByTime(100))
    expect(button()).toBeNull()
  })
  it('all non-playing phases and dead player hide purchase UI', () => {
    mount()
    for (const phase of ['paused', 'levelup', 'cleared', 'gameover']) {
      act(() => useGameStore.setState({ phase })); expect(button()).toBeNull()
    }
    act(() => useGameStore.setState(s => ({ phase: 'playing', player: { ...s.player, hp: 0 } })))
    expect(button()).toBeNull()
  })
  it('resets feedback and entitlement on a new run/stage', () => {
    mount(); click()
    act(() => { live().resetGame('stage2'); move('stage2'); useGameStore.setState(s => ({ player: { ...s.player, hp: 40 }, goldTotal: 20 })) })
    expect(live().stageVendingPurchasedItemIds).toEqual([])
    expect(button().disabled).toBe(false)
  })
})
