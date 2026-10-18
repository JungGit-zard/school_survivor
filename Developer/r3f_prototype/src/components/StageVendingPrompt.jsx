import React, { useCallback, useEffect, useMemo, useState } from 'react'
import './StageVendingPrompt.css'
import { useGameStore } from '../store/useGameStore.js'
import { playerPos } from '../lib/refs.js'
import {
  STAGE_VENDING_ITEM_IDS,
  getStageVendingItem,
  getStageVendingPlacement,
  isWithinStageVendingRange,
} from '../lib/stageVending.js'

const SUCCESS_FEEDBACK_MS = 1600
const PROXIMITY_POLL_MS = 100

const STATUS_COPY = Object.freeze({
  full: 'HP가 가득 차 있어요',
  insufficient: '골드 부족',
  purchased: '이번 스테이지 구매 완료',
  available: '근처 자판기에서 구매 가능',
  success: '회복 음료 구매 완료! HP가 회복됐어요',
  outOfRange: '',
  notPlaying: '',
})

export function getStageVendingUiState({ phase, player, goldTotal, purchasedItemIds, inRange, item }) {
  if (phase !== 'playing' || !Number.isFinite(player?.hp) || player.hp <= 0) return 'notPlaying'
  if (!inRange) return 'outOfRange'
  if (purchasedItemIds.includes(item.id)) return 'purchased'
  if ((player?.hp ?? 0) >= (player?.maxHp ?? 0)) return 'full'
  if ((goldTotal ?? 0) < item.priceGold) return 'insufficient'
  return 'available'
}

export default function StageVendingPrompt() {
  const item = getStageVendingItem(STAGE_VENDING_ITEM_IDS.RECOVERY_DRINK)
  const {
    phase,
    player,
    currentStageId,
    gameKey,
    goldTotal,
    purchasedItemIds,
    purchaseStageVendingItem,
  } = useGameStore((state) => ({
    phase: state.phase,
    player: state.player,
    currentStageId: state.currentStageId,
    gameKey: state.gameKey,
    goldTotal: state.goldTotal,
    purchasedItemIds: state.stageVendingPurchasedItemIds,
    purchaseStageVendingItem: state.purchaseStageVendingItem,
  }))
  const placement = useMemo(() => getStageVendingPlacement(currentStageId), [currentStageId])
  const [inRange, setInRange] = useState(() => isWithinStageVendingRange(playerPos, placement))
  const [feedback, setFeedback] = useState(null)

  useEffect(() => { setFeedback(null) }, [currentStageId, gameKey])

  useEffect(() => {
    const update = () => setInRange(isWithinStageVendingRange(playerPos, placement))
    update()
    if (phase !== 'playing' || !placement) return undefined
    const timer = window.setInterval(update, PROXIMITY_POLL_MS)
    return () => window.clearInterval(timer)
  }, [phase, placement, gameKey])

  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(null), SUCCESS_FEEDBACK_MS)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const state = getStageVendingUiState({
    phase,
    player,
    goldTotal,
    purchasedItemIds,
    inRange,
    item,
  })
  const visible = state !== 'outOfRange' && state !== 'notPlaying'
  const disabled = state !== 'available'
  const statusText = feedback?.message ?? STATUS_COPY[state]

  const onPurchase = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!placement) return
    const result = purchaseStageVendingItem(item.id, {
      machineId: placement.id,
      stageId: currentStageId,
      gameKey,
    })
    if (result.ok) {
      setFeedback({ type: 'success', message: STATUS_COPY.success })
      return
    }
    const reasonCopy = {
      'full-health': STATUS_COPY.full,
      'insufficient-gold': STATUS_COPY.insufficient,
      'already-purchased': STATUS_COPY.purchased,
      'out-of-range': '자판기에서 조금 멀어졌어요',
      'not-playing': '',
      'not-alive': '',
      progressUnavailable: '계정 골드를 불러오는 중이에요',
    }
    setFeedback({ type: 'blocked', message: reasonCopy[result.reason] ?? '지금은 구매할 수 없어요' })
  }, [currentStageId, gameKey, item.id, placement, purchaseStageVendingItem])

  if (!visible || !placement || !item) return null

  return (
    <div
      data-testid="stage-vending-prompt"
      className="stage-vending-prompt"
      style={styles.root}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <div className="stage-vending-card" style={styles.card}>
        <div className="stage-vending-title" style={styles.titleRow}>
          <span aria-hidden="true" style={styles.icon}>🧃</span>
          <div>
            <div style={styles.title}>회복 음료</div>
            <div style={styles.meta}>골드 {item.priceGold} · HP +{item.healHp}</div>
          </div>
        </div>
        <div
          role="status"
          aria-live="polite"
          data-testid="stage-vending-status"
          style={{ ...styles.status, ...((feedback?.type === 'success' || state === 'purchased' || !disabled) ? styles.statusReady : styles.statusBlocked) }}
        >
          {statusText}
        </div>
        <button
          type="button"
          data-testid="stage-vending-buy"
          onClick={onPurchase}
          disabled={disabled}
          style={{ ...styles.button, ...(disabled ? styles.buttonDisabled : styles.buttonEnabled) }}
        >
          {state === 'purchased' ? '구매 완료' : state === 'full' ? 'HP 가득' : state === 'insufficient' ? '골드 부족' : '구매하기'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  root: {
    position: 'absolute',
    left: 'max(14px, env(safe-area-inset-left, 0px))',
    right: 'max(14px, env(safe-area-inset-right, 0px))',
    bottom: 'var(--stage-vending-bottom, calc(160px + env(safe-area-inset-bottom, 0px)))',
    margin: '0 auto',
    zIndex: 24,
    maxWidth: 'var(--stage-vending-max-width, 330px)',
    pointerEvents: 'none',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    pointerEvents: 'auto',
    touchAction: 'manipulation',
    display: 'grid',
    gap: 'var(--stage-vending-gap, 8px)',
    padding: 'var(--stage-vending-padding, 10px 12px 12px)',
    borderRadius: 16,
    border: '2px solid rgba(156, 200, 216, 0.92)',
    background: 'linear-gradient(180deg, rgba(17,24,39,0.94), rgba(31,41,55,0.92))',
    boxShadow: '0 10px 28px rgba(0,0,0,0.36)',
    color: '#f8fafc',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    display: 'grid',
    placeItems: 'center',
    width: 38,
    height: 38,
    borderRadius: 12,
    background: '#c6f4ff',
    color: '#111827',
    fontSize: 22,
  },
  title: {
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1.2,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: 800,
    color: '#ffe08a',
  },
  status: {
    minHeight: 20,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.3,
  },
  statusReady: {
    color: '#bbf7d0',
  },
  statusBlocked: {
    color: '#fecaca',
  },
  button: {
    minHeight: 46,
    minWidth: 44,
    border: 0,
    borderRadius: 14,
    padding: '0 16px',
    fontSize: 15,
    fontWeight: 950,
    letterSpacing: '-0.01em',
  },
  buttonEnabled: {
    color: '#102018',
    background: 'linear-gradient(180deg, #7bf0b0, #4dffbd)',
    boxShadow: '0 5px 0 #20705a',
    cursor: 'pointer',
  },
  buttonDisabled: {
    color: '#e5e7eb',
    background: '#64748b',
    boxShadow: 'none',
    cursor: 'not-allowed',
  },
}
