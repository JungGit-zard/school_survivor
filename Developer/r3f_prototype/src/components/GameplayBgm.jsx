import { useEffect, useRef } from 'react'
import gameplayBgmUrl from '../assets/audio/gameplay_bgm.wav'

const PAUSED_PHASES = new Set(['paused', 'levelup'])
const TERMINAL_PHASES = new Set(['gameover', 'cleared'])

// One game-run-owned music voice. It deliberately has no global registry: mounting
// is restricted to ReadyGameApp's game screen, so title/lobby and gameplay cannot overlap.
export default function GameplayBgm({ phase, userStarted }) {
  const audioRef = useRef(null)
  const pendingRef = useRef(false)
  const stoppedRef = useRef(false)

  useEffect(() => {
    let audio
    try {
      audio = new Audio(gameplayBgmUrl)
      audio.loop = true
      audio.preload = 'auto'
      audio.volume = 0.18
      audio.load?.()
      audioRef.current = audio
    } catch {
      return undefined
    }
    return () => {
      pendingRef.current = false
      stoppedRef.current = true
      if (audioRef.current === audio) audioRef.current = null
      try {
        audio.pause()
        audio.src = ''
      } catch {
        // Audio cleanup is best-effort and never changes game state.
      }
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (TERMINAL_PHASES.has(phase)) {
      stoppedRef.current = true
      pendingRef.current = false
      try {
        audio.pause()
        audio.src = ''
      } catch {}
      return
    }
    if (PAUSED_PHASES.has(phase)) {
      try { audio.pause() } catch {}
      return
    }
    if (phase !== 'playing' || !userStarted || stoppedRef.current || pendingRef.current) return

    pendingRef.current = true
    let playResult
    try {
      playResult = audio.play()
    } catch {
      pendingRef.current = false
      return
    }
    // A rejected initial play is intentionally retried only on a later phase
    // transition back into playing (for example pause/resume), never on a timer.
    if (playResult && typeof playResult.then === 'function') {
      playResult.then(() => {
        pendingRef.current = false
      }).catch(() => {
        pendingRef.current = false
      })
    } else {
      pendingRef.current = false
    }
  }, [phase, userStarted])

  return null
}
