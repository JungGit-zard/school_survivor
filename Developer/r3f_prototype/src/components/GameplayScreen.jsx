import { Suspense, lazy, useEffect, useRef } from 'react'
import VirtualJoystick from './VirtualJoystick.jsx'
import { loadGameCanvas } from './gameCanvasLoader.js'
import { useGameStore } from '../store/useGameStore.js'
import { t } from '../lib/i18n.js'
import { subscribeWholeScreenCriticalShake } from '../lib/criticalScreenShake.js'

const GameCanvas = lazy(loadGameCanvas)
const HUD = lazy(() => import('./HUD.jsx'))

export default function GameplayScreen({
  mobileJoystickEnabled,
  phoneFrameRef,
  onOpenCoinShop,
  onGoToTitle,
  onGoToLobby,
  onGoToRanking,
  devCheatsVisible,
}) {
  const criticalShakeAnimationRef = useRef(null)
  const gameKey = useGameStore((state) => state.gameKey)
  const phase = useGameStore((state) => state.phase)

  useEffect(() => {
    const pauseIfPlaying = () => {
      const { phase: currentPhase, pauseGame } = useGameStore.getState()
      if (currentPhase === 'playing') pauseGame('auto')
    }
    const handleVisibility = () => {
      if (document.hidden || document.visibilityState === 'hidden') pauseIfPlaying()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', pauseIfPlaying)
    window.addEventListener('blur', pauseIfPlaying)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', pauseIfPlaying)
      window.removeEventListener('blur', pauseIfPlaying)
    }
  }, [])

  useEffect(() => subscribeWholeScreenCriticalShake(({ strong, durationMs }) => {
    const screen = phoneFrameRef?.current
    if (!screen || typeof screen.animate !== 'function') return
    criticalShakeAnimationRef.current?.cancel()
    const x = strong ? 18 : 12
    const y = strong ? 10 : 6
    criticalShakeAnimationRef.current = screen.animate([
      { transform: 'translate3d(0, 0, 0) scale(1)' },
      { transform: `translate3d(${x}px, 0, 0) scale(1)` },
      { transform: `translate3d(0, ${y}px, 0) scale(1)` },
      { transform: 'translate3d(0, 0, 0) scale(1)' },
    ], { duration: durationMs, easing: 'ease-out' })
  }), [phoneFrameRef])

  useEffect(() => () => criticalShakeAnimationRef.current?.cancel(), [])

  return (
    <>
      <Suspense fallback={<div style={styles.loading}>{t('loading.game')}</div>}>
        <GameCanvas gameKey={gameKey} phase={phase} />
        <HUD
          onOpenCoinShop={onOpenCoinShop}
          onGoToTitle={onGoToTitle}
          onGoToLobby={onGoToLobby}
          onGoToRanking={onGoToRanking}
          devCheatsVisible={devCheatsVisible}
        />
      </Suspense>
      {mobileJoystickEnabled && <VirtualJoystick enabled phase={phase} playAreaRef={phoneFrameRef} />}
    </>
  )
}

const styles = {
  loading: {
    position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#16121d',
    color: '#f8fafc', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: 800, zIndex: 20,
  },
}
