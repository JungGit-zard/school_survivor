// @vitest-environment jsdom
// 자판기 구매 한도(승인된 기존 설계: 동일 아이템 스테이지당 1회, 퇴장·재시도·다음 스테이지에서 초기화)를
// 구매 전에 "남은 구매 N/1"로 보여주고 ko/en/ja로 표시한다. 한도 숫자는 새로 정하지 않는다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import StageVendingPrompt from './StageVendingPrompt.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { playerPos } from '../lib/refs.js'
import { getStageVendingItem, getStageVendingPlacement, getStageVendingRemainingPurchases, STAGE_VENDING_ITEM_IDS } from '../lib/stageVending.js'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { useLocaleStore } from '../lib/i18n.js'
import { installProgressTransactionTestClient } from '../../test/progressTransactionClient.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let host, root, fixtureId = 0
const live = () => useGameStore.getState()
const meta = () => host.querySelector('[data-testid="stage-vending-limit"]')?.textContent
const button = () => host.querySelector('[data-testid="stage-vending-buy"]')
function mount() { act(() => root.render(<StageVendingPrompt />)) }
function click() { act(() => button().dispatchEvent(new MouseEvent('click', { bubbles: true }))) }
beforeEach(() => {
  vi.useFakeTimers()
  _seedHydratedFirebaseProgressForTests({ uid: `vending-limit-test-${++fixtureId}` }, { progress: { goldTotal: 20 } })
  installProgressTransactionTestClient()
  live().resetGame('stage1')
  useGameStore.setState(s => ({ phase: 'playing', goldTotal: 20, player: { ...s.player, hp: 40, maxHp: 100 } }))
  const { x, z } = getStageVendingPlacement('stage1').position
  playerPos.set(x, 0, z)
  host = document.createElement('div'); document.body.append(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); useLocaleStore.setState({ locale: 'ko' }) })

it('keeps the approved per-stage limit of one recovery drink', () => {
  const item = getStageVendingItem(STAGE_VENDING_ITEM_IDS.RECOVERY_DRINK)
  expect(item.purchaseLimitPerStage).toBe(1)
  expect(getStageVendingRemainingPurchases(item, [])).toBe(1)
  expect(getStageVendingRemainingPurchases(item, ['recoveryDrink'])).toBe(0)
})

it('shows the remaining purchases before and after buying, and restores it on retry', () => {
  mount()
  expect(meta()).toBe('이번 스테이지 남은 구매 1/1')
  click()
  expect(live().goldTotal).toBe(15)
  // 구매 직후 팝업은 닫히고, 남은 구매 0이면 같은 스테이지에서 다시 띄우지 않는다.
  expect(meta()).toBeUndefined()
  expect(getStageVendingRemainingPurchases(getStageVendingItem('recoveryDrink'), live().stageVendingPurchasedItemIds)).toBe(0)
  act(() => vi.advanceTimersByTime(500))
  expect(meta()).toBeUndefined()
  expect(live().goldTotal).toBe(15)
  act(() => {
    live().resetGame('stage1')
    const { x, z } = getStageVendingPlacement('stage1').position
    playerPos.set(x, 0, z)
    useGameStore.setState(s => ({ phase: 'playing', goldTotal: 15, player: { ...s.player, hp: 40 } }))
  })
  expect(meta()).toBe('이번 스테이지 남은 구매 1/1')
})

it.each([
  ['en', 'Left this stage: 1/1', 'Buy'],
  ['ja', 'このステージの残り購入回数 1/1', '購入する'],
])('localizes the prompt in %s', (locale, limitText, buyText) => {
  useLocaleStore.setState({ locale })
  mount()
  expect(meta()).toBe(limitText)
  expect(button().textContent).toBe(buyText)
})
