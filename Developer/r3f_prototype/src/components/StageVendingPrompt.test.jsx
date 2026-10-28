// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import StageVendingPrompt from './StageVendingPrompt.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { playerPos } from '../lib/refs.js'
import { getStageVendingPlacement } from '../lib/stageVending.js'
import { STAGE_CONFIGS, isStageVisible } from '../lib/stageConfig.js'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { installProgressTransactionTestClient } from '../../test/progressTransactionClient.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let host, root, fixtureId = 0
// Stage unlock needs per-stage boss-defeat evidence; without it resetGame(stageN) is refused.
const UNLOCK_ALL_RECORDS = Object.fromEntries(Object.keys(STAGE_CONFIGS).map(id => [`${id}BossDefeats`, 1]))
const live = () => useGameStore.getState()
const button = () => host.querySelector('[data-testid="stage-vending-buy"]')
const backdrop = () => host.querySelector('[data-testid="stage-vending-backdrop"]')
function move(stage = 'stage1') {
  const { x, z } = getStageVendingPlacement(stage).position
  playerPos.set(x, 0, z)
}
function mount() { act(() => root.render(<StageVendingPrompt />)) }
function click() { act(() => button().dispatchEvent(new MouseEvent('click', { bubbles: true }))) }
beforeEach(() => {
  vi.useFakeTimers()
  _seedHydratedFirebaseProgressForTests({ uid: `vending-ui-test-${++fixtureId}` }, { progress: { goldTotal: 20, records: UNLOCK_ALL_RECORDS } })
  installProgressTransactionTestClient()
  live().resetGame('stage1')
  useGameStore.setState(s => ({ phase: 'playing', goldTotal: 20, player: { ...s.player, hp: 40, maxHp: 100 } }))
  move()
  host = document.createElement('div'); document.body.append(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers() })
describe('real prompt + real store', () => {
  it.each(Object.keys(STAGE_CONFIGS).filter(id => STAGE_CONFIGS[id].playable !== false && isStageVisible(id)))('%s: real HUD purchase heals, clamps and prevents a second debit', (stageId) => {
    live().resetGame(stageId)
    move(stageId)
    useGameStore.setState(s => ({ phase: 'playing', goldTotal: 20, player: { ...s.player, hp: 90, maxHp: 100 } }))
    mount()
    expect(live().phase).toBe('paused')
    expect(live().pauseSource).toBe('vending')
    expect(button().disabled).toBe(false)
    click()
    expect(live().player.hp).toBe(100)
    expect(live().goldTotal).toBe(15)
    expect(live().stageVendingPurchasedItemIds).toEqual(['recoveryDrink'])
    // 구매 직후 팝업이 즉시 닫히고 진행이 재개되며, 구매 완료 상태로는 다시 멈추지 않는다.
    expect(button()).toBeNull()
    expect(live().phase).toBe('playing')
    act(() => vi.advanceTimersByTime(500))
    expect(button()).toBeNull()
    expect(live().phase).toBe('playing')
    expect(live().purchaseStageVendingItem('recoveryDrink').reason).toBe('already-purchased')
    expect(live().goldTotal).toBe(15)
    // Same-stage retry starts a new run and restores the per-stage entitlement.
    act(() => {
      live().resetGame(stageId)
      move(stageId)
      useGameStore.setState(s => ({ phase: 'playing', goldTotal: 15, player: { ...s.player, hp: 40 } }))
    })
    expect(button().disabled).toBe(false)
    click()
    expect(live().player.hp).toBe(75)
    expect(live().goldTotal).toBe(10)
  })
  it('click heals once, debits persistent wallet and closes immediately', () => {
    mount(); expect(button().disabled).toBe(false)
    click(); expect(live().player.hp).toBe(75); expect(live().goldTotal).toBe(15)
    expect(button()).toBeNull()
    expect(live().phase).toBe('playing')
    expect(live().pauseSource).toBeNull()
  })
  it('reserves pause clearance with safe-area bottom and keeps the ready status non-red', () => {
    mount()
    expect(host.querySelector('[data-testid="stage-vending-prompt"]').style.bottom).toContain('160px')
    expect(host.querySelector('[data-testid="stage-vending-status"]').style.color).toBe('rgb(187, 247, 208)')
  })
  it('an outside tap closes the popup, resumes play, spends nothing and does not leak the touch', () => {
    mount()
    expect(live().pauseSource).toBe('vending')
    const leaked = vi.fn()
    window.addEventListener('pointerdown', leaked)
    window.addEventListener('touchstart', leaked)
    act(() => {
      backdrop().dispatchEvent(new Event('pointerdown', { bubbles: true }))
      backdrop().dispatchEvent(new Event('touchstart', { bubbles: true }))
    })
    window.removeEventListener('pointerdown', leaked)
    window.removeEventListener('touchstart', leaked)
    expect(leaked).not.toHaveBeenCalled()
    // 손을 뗀 뒤 click에서 닫는다(고스트 클릭 방지).
    expect(button()).not.toBeNull()
    act(() => backdrop().dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(button()).toBeNull()
    expect(live().phase).toBe('playing')
    expect(live().pauseSource).toBeNull()
    expect(live().goldTotal).toBe(20)
    expect(live().stageVendingPurchasedItemIds).toEqual([])
    // 범위 안에 머무는 동안은 다시 멈추지 않고, 벗어났다 돌아오면 다시 열린다.
    act(() => vi.advanceTimersByTime(500))
    expect(button()).toBeNull()
    act(() => { playerPos.set(999, 0, 999); vi.advanceTimersByTime(100) })
    act(() => { move(); vi.advanceTimersByTime(100) })
    expect(button()).not.toBeNull()
    expect(live().pauseSource).toBe('vending')
  })
  it('a resume from ESC/P or the pause button also closes it without an instant reopen', () => {
    mount()
    expect(live().pauseSource).toBe('vending')
    act(() => live().togglePause())
    expect(live().phase).toBe('playing')
    expect(button()).toBeNull()
    act(() => vi.advanceTimersByTime(500))
    expect(live().phase).toBe('playing')
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
    expect(host.querySelector('[data-testid="stage-vending-status"]').textContent).toBe('자판기에서 조금 멀어졌어요')
  })
  it('all non-playing phases and dead player hide purchase UI', () => {
    mount()
    for (const phase of ['paused', 'levelup', 'cleared', 'gameover']) {
      act(() => useGameStore.setState({ phase, pauseSource: phase === 'paused' ? 'manual' : null })); expect(button()).toBeNull()
    }
    act(() => useGameStore.setState(s => ({ phase: 'playing', pauseSource: null, player: { ...s.player, hp: 0 } })))
    expect(button()).toBeNull()
  })
  it('resets feedback and entitlement on a new run/stage', () => {
    mount(); click()
    act(() => { live().resetGame('stage2'); move('stage2'); useGameStore.setState(s => ({ player: { ...s.player, hp: 40 }, goldTotal: 20 })) })
    expect(live().stageVendingPurchasedItemIds).toEqual([])
    expect(button().disabled).toBe(false)
  })
})
