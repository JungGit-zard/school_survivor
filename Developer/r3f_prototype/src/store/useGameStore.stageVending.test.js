import { seedStageEntryForTests } from '../../test/progressTransactionClient.js'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const ranking = vi.hoisted(() => ({ submitRun: vi.fn() }))
vi.mock('../lib/firebaseRanking.js', async (importOriginal) => ({
  ...(await importOriginal()),
  submitRun: ranking.submitRun,
}))

import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { installProgressTransactionTestClient } from '../../test/progressTransactionClient.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests, readFirebasePlayerProgress } from '../lib/firebaseProgress.js'
import { STAGE_VENDING_ITEM_IDS, getStageVendingPlacement } from '../lib/stageVending.js'
import { playerPos } from '../lib/refs.js'

let fixtureId = 0
function seedProgressGold(goldTotal = 20) {
  const uid = `stage-vending-test-${++fixtureId}`
  _seedHydratedFirebaseProgressForTests({ uid }, {
    schemaVersion: 1,
    profile: { uid, displayName: '', nickname: '' },
    progress: { goldTotal },
  })
}

function resetStageWithGold(stageId = 'stage1', goldTotal = 20) {
  seedProgressGold(goldTotal)
  installProgressTransactionTestClient()
  seedStageEntryForTests(stageId); useGameStore.getState().resetGame(stageId)
  useGameStore.setState({ goldTotal })
  ranking.submitRun.mockClear()
}

function vendingPosition(stageId = 'stage1') {
  const placement = getStageVendingPlacement(stageId)
  return { x: placement.position.x, z: placement.position.z }
}

function movePlayerToVending(stageId = 'stage1') {
  const position = vendingPosition(stageId)
  playerPos.set(position.x, 0, position.z)
}

describe('useGameStore stage vending purchase', () => {
  beforeEach(() => {
    ranking.submitRun.mockResolvedValue({ written: [], skipped: [], failed: [] })
    _resetFirebaseProgressForTests()
    resetStageWithGold('stage1', 20)
    movePlayerToVending('stage1')
  })

  it('살아있는 playing 상태에서 범위 안 회복 음료 구매는 즉시 회복하고 기존 영구 골드 지갑만 차감한다', () => {
    useGameStore.setState((state) => ({
      player: { ...state.player, hp: 40, maxHp: 100 },
      goldSession: 9,
    }))

    const result = useGameStore.getState().purchaseStageVendingItem(
      STAGE_VENDING_ITEM_IDS.RECOVERY_DRINK,
      { machineId: getStageVendingPlacement('stage1').id, stageId: 'stage1', gameKey: useGameStore.getState().gameKey },
    )

    const state = useGameStore.getState()
    expect(result).toMatchObject({ ok: true, itemId: 'recoveryDrink', goldSpent: 5, hpRestored: 35, nextGold: 15 })
    expect(state.player.hp).toBe(75)
    expect(state.player.maxHp).toBe(100)
    expect(state.goldTotal).toBe(15)
    expect(state.goldSession).toBe(9)
    expect(state.stageVendingPurchasedItemIds).toEqual(['recoveryDrink'])
    expect(readFirebasePlayerProgress().goldTotal).toBe(15)
  })

  it('hydrate가 없으면 회복·차감·구매권 모두 거절한다', () => {
    useGameStore.setState(s => ({ player: { ...s.player, hp: 40 } }))
    _resetFirebaseProgressForTests()
    expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink')).toMatchObject({ ok: false, reason: 'progressUnavailable' })
    expect(useGameStore.getState().player.hp).toBe(40)
    expect(useGameStore.getState().goldTotal).toBe(20)
    expect(useGameStore.getState().stageVendingPurchasedItemIds).toEqual([])
  })

  it('sign-out in progress cannot spend the previously hydrated account wallet', () => {
    useGameStore.setState(s => ({ player: { ...s.player, hp: 40 } }))
    useAuthStore.setState({ user: null, status: 'signedOut' })
    expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink')).toMatchObject({ ok: false, reason: 'progressUnavailable' })
    expect(useGameStore.getState().player.hp).toBe(40)
    expect(useGameStore.getState().goldTotal).toBe(20)
    expect(readFirebasePlayerProgress().goldTotal).toBe(20)
    expect(useGameStore.getState().stageVendingPurchasedItemIds).toEqual([])
  })

  it('newly hydrated account cannot spend inside a run owned by the previous account', () => {
    useGameStore.setState(s => ({ player: { ...s.player, hp: 40 } }))
    _seedHydratedFirebaseProgressForTests({ uid: 'vending-other-account' }, { progress: { goldTotal: 20 } })
    useAuthStore.setState({ user: { uid: 'vending-other-account' }, status: 'signedIn' })
    expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink')).toMatchObject({ ok: false, reason: 'progressUnavailable' })
    expect(useGameStore.getState().player.hp).toBe(40)
    expect(useGameStore.getState().goldTotal).toBe(20)
    expect(readFirebasePlayerProgress().goldTotal).toBe(20)
  })

  it('구독자가 동기 재진입하여 골드를 얻어도 영구 지갑을 과거 차감값으로 되돌리지 않는다', () => {
    useGameStore.setState(s => ({ player: { ...s.player, hp: 40 } }))
    let notified = false
    const unsubscribe = useGameStore.subscribe((state) => {
      if (notified || !state.stageVendingPurchasedItemIds.length) return
      notified = true
      state.gainGold(1)
    })
    try {
      expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink').ok).toBe(true)
      expect(notified).toBe(true)
      expect(useGameStore.getState().goldTotal).toBe(16)
      expect(readFirebasePlayerProgress().goldTotal).toBe(16)
    } finally { unsubscribe() }
  })

  it('최대 체력에서는 골드와 구매권을 낭비하지 않는다', () => {
    useGameStore.setState((state) => ({ player: { ...state.player, hp: 100, maxHp: 100 } }))

    const result = useGameStore.getState().purchaseStageVendingItem('recoveryDrink')

    expect(result).toMatchObject({ ok: false, reason: 'full-health' })
    expect(useGameStore.getState().goldTotal).toBe(20)
    expect(useGameStore.getState().stageVendingPurchasedItemIds).toEqual([])
  })

  it('같은 아이템은 같은 스테이지 런에서 중복 구매되지 않는다', () => {
    useGameStore.setState((state) => ({ player: { ...state.player, hp: 10, maxHp: 100 } }))

    const machineId = getStageVendingPlacement('stage1').id
    expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink', { machineId }).ok).toBe(true)
    const second = useGameStore.getState().purchaseStageVendingItem('recoveryDrink', { machineId })

    expect(second).toMatchObject({ ok: false, reason: 'already-purchased' })
    expect(useGameStore.getState().goldTotal).toBe(15)
    expect(useGameStore.getState().stageVendingPurchasedItemIds).toEqual(['recoveryDrink'])
  })

  it('잘못된 아이템, 비playing/dead, 범위 밖, 골드 부족은 모두 원자적으로 no-op 처리한다', () => {
    const basePlayer = { ...useGameStore.getState().player, hp: 30, maxHp: 100 }
    useGameStore.setState({ player: basePlayer })

    expect(useGameStore.getState().purchaseStageVendingItem('bad-item')).toMatchObject({ ok: false, reason: 'invalid-item' })
    useGameStore.setState({ phase: 'paused', pauseSource: 'manual' })
    expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink')).toMatchObject({ ok: false, reason: 'not-playing' })
    useGameStore.setState({ phase: 'playing', pauseSource: null, player: { ...basePlayer, hp: 0 } })
    expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink')).toMatchObject({ ok: false, reason: 'not-alive' })
    useGameStore.setState({ player: basePlayer })
    playerPos.set(999, 0, 999)
    expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink')).toMatchObject({ ok: false, reason: 'out-of-range' })
    movePlayerToVending('stage1')
    useGameStore.setState({ goldTotal: 4 })
    expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink')).toMatchObject({ ok: false, reason: 'insufficient-gold' })

    const state = useGameStore.getState()
    expect(state.player.hp).toBe(30)
    expect(state.goldTotal).toBe(4)
    expect(state.stageVendingPurchasedItemIds).toEqual([])
  })

  it('구매 기록은 스테이지 이동/재시도/새 런 resetGame에서 초기화된다', () => {
    useGameStore.setState((state) => ({ player: { ...state.player, hp: 20, maxHp: 100 } }))
    expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink').ok).toBe(true)
    expect(useGameStore.getState().stageVendingPurchasedItemIds).toEqual(['recoveryDrink'])

    seedStageEntryForTests('stage2'); useGameStore.getState().resetGame('stage2')

    expect(useGameStore.getState().currentStageId).toBe('stage2')
    expect(useGameStore.getState().stageVendingPurchasedItemIds).toEqual([])
  })

  it('stale stage/game/machine 요청과 stale caller position을 거부한다', () => {
    useGameStore.setState((state) => ({ player: { ...state.player, hp: 20, maxHp: 100 } }))
    const current = useGameStore.getState()

    expect(current.purchaseStageVendingItem('recoveryDrink', { stageId: 'stage2' })).toMatchObject({ ok: false, reason: 'stale-stage' })
    expect(current.purchaseStageVendingItem('recoveryDrink', { gameKey: current.gameKey - 1 })).toMatchObject({ ok: false, reason: 'stale-run' })
    expect(current.purchaseStageVendingItem('recoveryDrink', { machineId: 'vending-other' })).toMatchObject({ ok: false, reason: 'stale-machine' })

    playerPos.set(999, 0, 999)
    expect(current.purchaseStageVendingItem('recoveryDrink', { playerPosition: vendingPosition('stage1') })).toMatchObject({ ok: false, reason: 'out-of-range' })
  })

  it('구매 기록은 클리어와 수동 quit에서도 닫힌다', () => {
    useGameStore.setState((state) => ({ player: { ...state.player, hp: 20, maxHp: 100 } }))
    expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink').ok).toBe(true)
    useGameStore.getState().clearStage()
    expect(useGameStore.getState().stageVendingPurchasedItemIds).toEqual([])

    resetStageWithGold('stage1', 20)
    movePlayerToVending('stage1')
    useGameStore.setState((state) => ({ player: { ...state.player, hp: 20, maxHp: 100 } }))
    expect(useGameStore.getState().purchaseStageVendingItem('recoveryDrink').ok).toBe(true)
    useGameStore.setState({ phase: 'paused', pauseSource: 'manual' })
    expect(useGameStore.getState().quitPausedRun()).toBe(true)
    expect(useGameStore.getState().stageVendingPurchasedItemIds).toEqual([])
  })
})
