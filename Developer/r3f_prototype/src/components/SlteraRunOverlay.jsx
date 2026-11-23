import { useEffect, useRef, useState } from 'react'
import { setStreamingBgmSuspended } from '../lib/streamingBgm.js'
import { setRacerOverlayOpen } from '../lib/racerOverlayState.js'
import { stopDialogueVoice } from '../lib/dialogueVoice.js'
import { useT } from '../lib/i18n.js'
import { schoolButton } from '../lib/uiStyle.js'

// 슬테라 코스트 런(Stage 3 니쿠오 컷에서 '탑니다'). 같은 출처 정적 페이지를 전체 화면 iframe으로 띄운다.
// 이 컴포넌트는 스토어·저장소에 직접 쓰지 않는다. 레이서 킬 수는 onExit 콜백으로만 넘긴다.
// 레이서 페이지 자체도 브라우저 저장소·네트워크 쓰기가 없다(scripts/sync-sltera-run.mjs가 확인).
// 체육관 → 식당 전용 코스(Stage 3 → Stage 4), embed 모드: 레이서가 끝에서 '학교로 돌아가기'와 exit 메시지를 낸다.
// Cloudflare Pages가 /index.html → / 로 리다이렉트하므로 폴더 경로를 바로 쓴다.
export const SLTERA_RUN_SRC = '/minigame/sltera-run/?course=gym-to-cafeteria&embed=1'
export const SLTERA_RUN_EXIT_MESSAGE = 'sltera-run:exit'
export const SLTERA_RUN_READY_MESSAGE = 'sltera-run:ready'
// 레이서가 이 시간 안에 첫 프레임(ready)을 못 내면 학교로 돌아가는 버튼을 띄운다(WebGL 실패·모듈 404 대비).
export const SLTERA_RUN_READY_TIMEOUT_MS = 8000

export function isSlteraRunExitMessage(event, origin = globalThis.location?.origin) {
  return Boolean(event && event.origin === origin && event.data?.type === SLTERA_RUN_EXIT_MESSAGE)
}

export function isSlteraRunReadyMessage(event, origin = globalThis.location?.origin) {
  return Boolean(event && event.origin === origin && event.data?.type === SLTERA_RUN_READY_MESSAGE)
}

// exit 메시지 → 단일 결과 객체 { kills, arrived }. HUD가 이 값을 finalizeDeferredStageResult로 넘긴다
// (점수 반영 규칙·상한은 스토어/서버 몫). 값이 없거나 이상하면 0 / false.
export function readSlteraRunResult(data) {
  const kills = Number(data?.kills)
  return Object.freeze({
    kills: Number.isFinite(kills) && kills > 0 ? Math.floor(kills) : 0,
    arrived: data?.arrived === true,
  })
}

export default function SlteraRunOverlay({ onExit }) {
  const t = useT()
  const frameRef = useRef(null)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  const exitedRef = useRef(false)
  const [showFallback, setShowFallback] = useState(false)
  // onExit은 메시지·버튼·오류 어느 경로로 와도 딱 한 번만 부른다.
  const exitOnce = (result) => {
    if (exitedRef.current) return
    exitedRef.current = true
    onExitRef.current?.(result)
  }
  const exitOnceRef = useRef(exitOnce)

  useEffect(() => {
    // 레이서는 자기 엔진음·음악이 있다 — 그동안만 게임 BGM을 멈추고(재생 위치 유지) 돌아오면 다시 튼다.
    stopDialogueVoice()
    setStreamingBgmSuspended(true)
    setRacerOverlayOpen(true) // 레이서 동안 게임 캔버스 렌더 정지(WebGL 두 개 동시 구동 방지)
    const fallbackTimer = setTimeout(() => setShowFallback(true), SLTERA_RUN_READY_TIMEOUT_MS)
    const onMessage = (event) => {
      // 우리 iframe에서 온 메시지만 받는다(같은 출처의 다른 창·프레임 무시).
      const frameWindow = frameRef.current?.contentWindow
      if (!frameWindow || event.source !== frameWindow) return
      if (isSlteraRunReadyMessage(event)) {
        clearTimeout(fallbackTimer)
        setShowFallback(false)
        return
      }
      if (!isSlteraRunExitMessage(event)) return
      exitOnceRef.current(readSlteraRunResult(event.data))
    }
    window.addEventListener('message', onMessage)
    return () => {
      clearTimeout(fallbackTimer)
      window.removeEventListener('message', onMessage)
      setStreamingBgmSuspended(false)
      setRacerOverlayOpen(false)
    }
  }, [])

  // 로드 직후 포커스를 iframe으로 넘겨 키보드(방향키·Esc)가 바로 레이서로 간다.
  const focusFrame = () => {
    try { frameRef.current?.contentWindow?.focus() } catch { /* ignore */ }
  }

  return (
    <div data-testid="sltera-run-overlay" style={styles.root}>
      <iframe
        ref={frameRef}
        data-testid="sltera-run-frame"
        title={t('hud.slteraRun.title')}
        src={SLTERA_RUN_SRC}
        allow="autoplay; fullscreen"
        onLoad={focusFrame}
        style={styles.frame}
      />
      {showFallback ? (
        <button
          type="button"
          data-testid="sltera-run-fallback-exit"
          onClick={() => exitOnce({ kills: 0, arrived: false })}
          style={styles.fallbackButton}
        >
          {t('hud.slteraRun.backToSchool')}
        </button>
      ) : null}
    </div>
  )
}

const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: '#000',
    pointerEvents: 'auto',
  },
  frame: {
    display: 'block',
    width: '100%',
    height: '100%',
    border: 0,
  },
  fallbackButton: {
    ...schoolButton('primary'),
    position: 'absolute',
    left: '50%',
    bottom: 'max(24px, env(safe-area-inset-bottom))',
    transform: 'translateX(-50%)',
    minHeight: 48,
    minWidth: 160,
    padding: '0 22px',
    zIndex: 1,
  },
}
