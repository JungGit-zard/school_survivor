import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './StageVendingPrompt.css'
import { useGameStore } from '../store/useGameStore.js'
import { playerPos } from '../lib/refs.js'
import { useLocale } from '../lib/i18n.js'
import {
  STAGE_VENDING_ITEM_IDS,
  getStageVendingItem,
  getStageVendingPlacement,
  getStageVendingRemainingPurchases,
  isWithinStageVendingRange,
} from '../lib/stageVending.js'

const SUCCESS_FEEDBACK_MS = 1600
const PROXIMITY_POLL_MS = 100

// 프롬프트 전용 ko/en/ja 문구. 공용 locale 파일과 분리해 HUD 한 곳에서 관리한다.
const COPY = Object.freeze({
  ko: Object.freeze({
    full: 'HP가 가득 차 있어요',
    insufficient: '골드 부족',
    purchased: '이번 스테이지 구매 완료',
    available: '근처 자판기에서 구매 가능',
    success: '회복 음료 구매 완료! HP가 회복됐어요',
    outOfRange: '',
    notPlaying: '',
    farAway: '자판기에서 조금 멀어졌어요',
    loading: '계정 골드를 불러오는 중이에요',
    blocked: '지금은 구매할 수 없어요',
    title: '회복 음료',
    meta: '골드 {price} · HP +{heal}',
    remaining: '이번 스테이지 남은 구매 {left}/{limit}',
    buy: '구매하기',
    buttonPurchased: '구매 완료',
    buttonFull: 'HP 가득',
    buttonInsufficient: '골드 부족',
  }),
  en: Object.freeze({
    full: 'Your HP is already full',
    insufficient: 'Not enough gold',
    purchased: 'Already bought on this stage',
    available: 'Vending machine nearby',
    success: 'Recovery drink bought! HP restored',
    outOfRange: '',
    notPlaying: '',
    farAway: 'You moved away from the vending machine',
    loading: 'Loading your account gold…',
    blocked: 'You can’t buy this right now',
    title: 'Recovery Drink',
    meta: '{price} gold · HP +{heal}',
    remaining: 'Left this stage: {left}/{limit}',
    buy: 'Buy',
    buttonPurchased: 'Bought',
    buttonFull: 'HP full',
    buttonInsufficient: 'Need gold',
  }),
  ja: Object.freeze({
    full: 'HPはすでに満タンです',
    insufficient: 'ゴールドが足りません',
    purchased: 'このステージでは購入済みです',
    available: '近くの自販機で購入できます',
    success: '回復ドリンクを購入！HPが回復しました',
    outOfRange: '',
    notPlaying: '',
    farAway: '自販機から少し離れました',
    loading: 'アカウントのゴールドを読み込み中です',
    blocked: '今は購入できません',
    title: '回復ドリンク',
    meta: 'ゴールド {price} · HP +{heal}',
    remaining: 'このステージの残り購入回数 {left}/{limit}',
    buy: '購入する',
    buttonPurchased: '購入済み',
    buttonFull: 'HP満タン',
    buttonInsufficient: 'ゴールド不足',
  }),
})

function fill(text, params) {
  return text.replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match))
}

export function getStageVendingUiState({ phase, pauseSource = null, player, goldTotal, purchasedItemIds, inRange, item }) {
  const active = phase === 'playing' || (phase === 'paused' && pauseSource === 'vending')
  if (!active || !Number.isFinite(player?.hp) || player.hp <= 0) return 'notPlaying'
  if (!inRange) return 'outOfRange'
  if (getStageVendingRemainingPurchases(item, purchasedItemIds) <= 0) return 'purchased'
  if ((player?.hp ?? 0) >= (player?.maxHp ?? 0)) return 'full'
  if ((goldTotal ?? 0) < item.priceGold) return 'insufficient'
  return 'available'
}

export default function StageVendingPrompt() {
  const item = getStageVendingItem(STAGE_VENDING_ITEM_IDS.RECOVERY_DRINK)
  const locale = useLocale()
  const STATUS_COPY = COPY[locale] ?? COPY.ko
  const {
    phase,
    pauseSource,
    player,
    currentStageId,
    gameKey,
    goldTotal,
    purchasedItemIds,
    purchaseStageVendingItem,
    openStageVending,
    closeStageVending,
  } = useGameStore((state) => ({
    phase: state.phase,
    pauseSource: state.pauseSource,
    player: state.player,
    currentStageId: state.currentStageId,
    gameKey: state.gameKey,
    goldTotal: state.goldTotal,
    purchasedItemIds: state.stageVendingPurchasedItemIds,
    purchaseStageVendingItem: state.purchaseStageVendingItem,
    openStageVending: state.openStageVending,
    closeStageVending: state.closeStageVending,
  }))
  const placement = useMemo(() => getStageVendingPlacement(currentStageId), [currentStageId])
  const [inRange, setInRange] = useState(() => isWithinStageVendingRange(playerPos, placement))
  const [feedback, setFeedback] = useState(null)

  // 닫은 팝업은 자판기 범위를 벗어났다가 다시 들어올 때까지 다시 열지 않는다.
  const [dismissed, setDismissed] = useState(false)
  const isOpen = phase === 'paused' && pauseSource === 'vending'
  const wasOpenRef = useRef(false)

  useEffect(() => { if (!inRange) setDismissed(false) }, [inRange])

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
    pauseSource,
    player,
    goldTotal,
    purchasedItemIds,
    inRange,
    item,
  })
  // 살 수 있을 때만 띄운다 — 체력 가득·골드 부족·구매 완료면 진행을 멈추지 않는다(Terry 10-29).
  const shouldOpen = phase === 'playing' && !dismissed && !!placement && !!item && state === 'available'
  useEffect(() => {
    // 구매·바깥 탭·ESC/P 등 어떤 경로로 vending 일시정지가 풀려도 닫힘으로 기억하고 바로 다시 열지 않는다.
    if (wasOpenRef.current && !isOpen) {
      wasOpenRef.current = false
      setDismissed(true)
      setFeedback(null)
      return
    }
    wasOpenRef.current = isOpen
    if (shouldOpen) openStageVending()
  }, [isOpen, shouldOpen, openStageVending])
  // 새 런/스테이지는 닫힘 기억을 초기화한다(위 효과보다 뒤에 두어 같은 커밋에서 이긴다).
  useEffect(() => { setFeedback(null); setDismissed(false) }, [currentStageId, gameKey])
  const visible = isOpen && state !== 'outOfRange' && state !== 'notPlaying'
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
      // 스토어가 구매와 함께 vending 일시정지를 풀어 팝업이 즉시 닫힌다.
      setDismissed(true)
      return
    }
    const reasonCopy = {
      'full-health': STATUS_COPY.full,
      'insufficient-gold': STATUS_COPY.insufficient,
      'already-purchased': STATUS_COPY.purchased,
      'out-of-range': STATUS_COPY.farAway,
      'not-playing': '',
      'not-alive': '',
      progressUnavailable: STATUS_COPY.loading,
    }
    setFeedback({ type: 'blocked', message: reasonCopy[result.reason] ?? STATUS_COPY.blocked })
  }, [STATUS_COPY, currentStageId, gameKey, item.id, placement, purchaseStageVendingItem])

  const onBackdropClick = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    setDismissed(true)
    closeStageVending()
  }, [closeStageVending])

  if (!visible || !placement || !item) return null

  // 바깥 탭 백드롭: 같은 탭이 조이스틱(캔버스 대상 touchstart)이나 아래 HUD 버튼으로 새지 않도록
  // pointerdown/touchstart 전파를 막고, 손을 뗀 뒤의 click에서 닫는다(고스트 클릭 방지).
  return (
    <>
    <div
      data-testid="stage-vending-backdrop"
      aria-hidden="true"
      style={styles.backdrop}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onClick={onBackdropClick}
    />
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
            <div style={styles.title}>{STATUS_COPY.title}</div>
            <div style={styles.meta}>{fill(STATUS_COPY.meta, { price: item.priceGold, heal: item.healHp })}</div>
            <div data-testid="stage-vending-limit" style={styles.meta}>{fill(STATUS_COPY.remaining, { left: getStageVendingRemainingPurchases(item, purchasedItemIds), limit: item.purchaseLimitPerStage })}</div>
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
          {state === 'purchased' ? STATUS_COPY.buttonPurchased : state === 'full' ? STATUS_COPY.buttonFull : state === 'insufficient' ? STATUS_COPY.buttonInsufficient : STATUS_COPY.buy}
        </button>
      </div>
    </div>
    </>
  )
}

const styles = {
  backdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 23,
    pointerEvents: 'auto',
    touchAction: 'none',
    background: 'rgba(8, 12, 20, 0.28)',
  },
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
