import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react'
import GoogleAccountPanel from './GoogleAccountPanel.jsx'
import { requestCloudProgressSave } from '../lib/firebaseProgress.js'
import { getSavedNickname, saveNicknameForUser, validateNickname } from '../lib/userNickname.js'
import { getAdminOperationsConfig } from '../lib/adminConfig.js'
import {
  applyReducedEffects,
  loadTitleSettings,
  unlockAllNonStarterWeapons,
} from '../lib/titleSettings.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'
import titleBgmUrl from '../assets/audio/title_bgm.m4a'

const TitleSceneCanvas = lazy(() => import('./TitleSceneCanvas.jsx'))

const REVEAL_CHEATS_CODE = ['arrowup', 'arrowdown', 'arrowup', 'arrowdown', 'a', 's', 'd']
const TITLE_ACCENT_LETTERS = [
  { char: '탈', order: 0, x: '-110vw', y: '-5vh', rotation: '-18deg' },
  { char: '출', order: 1, x: '8vw', y: '-55vh', rotation: '14deg' },
  { char: '!', order: 6, x: '15vw', y: '-65vh', rotation: '24deg' },
]
const TITLE_SCHOOL_LETTERS = [
  { char: '좀', order: 2, x: '110vw', y: '-8vh', rotation: '16deg' },
  { char: '비', order: 3, x: '-6vw', y: '75vh', rotation: '-12deg' },
  { char: '학', order: 4, x: '-100vw', y: '-35vh', rotation: '-16deg' },
  { char: '교', order: 5, x: '100vw', y: '-28vh', rotation: '18deg' },
]
const TITLE_EMOJI_CLUSTER = '🧟‍♀️❤️'
const TITLE_SCHOOL_EMOJI = '🏫'
const TITLE_INTRO_CSS = `
  @keyframes titleLetterSlam {
    0% { opacity: 0; transform: translate3d(var(--title-enter-x), var(--title-enter-y), 0) rotate(var(--title-enter-rotation)) scale(0.72); }
    58% { opacity: 1; transform: translate3d(0, 0, 0) rotate(0deg) scale(1.16); }
    74% { opacity: 1; transform: translate3d(0, 5px, 0) rotate(0deg) scale(0.92); }
    100% { opacity: 1; transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
  }
  @keyframes titleZombieScurry {
    0% { opacity: 0; transform: translate3d(105vw, 8px, 0) rotate(8deg) scale(0.82); }
    25% { opacity: 1; transform: translate3d(70vw, -8px, 0) rotate(-6deg) scale(0.88); }
    50% { opacity: 1; transform: translate3d(38vw, 0, 0) rotate(5deg) scale(0.92); }
    75% { opacity: 1; transform: translate3d(10vw, -6px, 0) rotate(-3deg) scale(0.97); }
    90% { opacity: 1; transform: translate3d(0, 3px, 0) rotate(0deg) scale(0.92); }
    100% { opacity: 1; transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
  }
  @keyframes titleSceneGather {
    0% { opacity: 0; transform: translate3d(0, 105vh, 0); }
    72% { opacity: 1; transform: translate3d(0, -2vh, 0); }
    100% { opacity: 1; transform: translate3d(0, 0, 0); }
  }
  .title-intro-letter { animation: titleLetterSlam 520ms cubic-bezier(.16,.84,.28,1.08) backwards; }
  .title-intro-zombie { animation: titleZombieScurry 900ms ease-out backwards; }
  .title-intro-scene { animation: titleSceneGather 850ms cubic-bezier(.16,.84,.28,1.04) backwards; }
`

function TitleLetter({ config }) {
  return (
    <span
      aria-hidden="true"
      className="title-intro-letter"
      data-title-char={config.char}
      style={{
        ...styles.titleLetter,
        '--title-enter-x': config.x,
        '--title-enter-y': config.y,
        '--title-enter-rotation': config.rotation,
        animationDelay: `${120 + config.order * 230}ms`,
      }}
    >
      {config.char}
    </span>
  )
}

// 타이틀 화면은 "게임 시작" 하나만 남긴다(인지적 시작 행위). 로그인/닉네임 게이트를 통과하면
// 스테이지가 아니라 로비(onEnterLobby)로 진입한다. 스테이지 선택·상점·랭킹·설정은 로비로 이관.
// 코나미식 치트 시퀀스 + devCheatsVisible 치트 메뉴 노출 경로는 그대로 보존한다.
export default function TitleScreen({
  onEnterLobby,
  devCheatsVisible = false,
  onRevealDevCheats,
  studioVisualsReady = true,
  ensureStudioCloudReady,
}) {
  const [cheatOpen, setCheatOpen] = useState(false)
  const [nicknameOpen, setNicknameOpen] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [settings] = useState(loadTitleSettings)
  const [cheatRevealMessage, setCheatRevealMessage] = useState(false)
  const authUser = useAuthStore((s) => s.user)
  const signingIn = useAuthStore((s) => s.signingIn)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const resetPassiveUpgrades = useGameStore((s) => s.resetPassiveUpgrades)
  const cheatBufferRef = useRef([])
  const adminOperations = getAdminOperationsConfig()
  const cheatMenuButtonVisible = devCheatsVisible && adminOperations.cheatMenuButtonVisible

  // 타이틀 연출은 항상 재생하고, 화면을 벗어날 때 저장된 전역 설정을 복원한다.
  useEffect(() => {
    applyReducedEffects(false)
    return () => applyReducedEffects(settings.reducedEffects)
  }, [settings.reducedEffects])

  // 타이틀 BGM: 타이틀 DOM 커밋 직후(첫 페인트 전) 루프 재생을 시도하고,
  // 언마운트(게임 시작/로비 이동) 시 정지·정리한다.
  // 새로고침 시 자동재생을 브라우저 정책 한도 내 최대로 시도한다:
  //  1) useLayoutEffect에서 즉시 play() + 실패 시 300ms/1500ms 지연 재시도(Chrome MEI가 높을 때 첫 시도 레이스 커버)
  //  2) 그래도 거부되면 첫 pointerdown/touchstart/keydown 제스처에서 재시도(모바일 사파리 포함)
  //  3) 탭이 visible로 복귀할 때도 재시도
  // 성공하면 리스너·타이머를 모두 정리하고, 언마운트 시에도 누수 없이 정리한다. 에러는 조용히 무시.
  useLayoutEffect(() => {
    let audio
    try {
      audio = new Audio(titleBgmUrl)
    } catch {
      return undefined
    }
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0.5
    try {
      audio.load?.()
    } catch {
      // load() 실패는 이후 play() 재시도 경로에 맡긴다.
    }
    if (typeof window !== 'undefined') window.__titleBgm = audio

    let disposed = false
    let playing = false
    let retryBound = false
    const timers = []

    const clearTimers = () => {
      while (timers.length) clearTimeout(timers.pop())
    }
    const unbindRetry = () => {
      if (!retryBound) return
      retryBound = false
      window.removeEventListener('pointerdown', tryPlay)
      window.removeEventListener('touchstart', tryPlay)
      window.removeEventListener('keydown', tryPlay)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
    const bindRetry = () => {
      if (disposed || playing || retryBound) return
      retryBound = true
      window.addEventListener('pointerdown', tryPlay)
      window.addEventListener('touchstart', tryPlay)
      window.addEventListener('keydown', tryPlay)
      document.addEventListener('visibilitychange', handleVisibility)
    }
    const handleSuccess = () => {
      if (disposed) return
      playing = true
      clearTimers()
      unbindRetry()
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible') tryPlay()
    }
    function tryPlay() {
      if (disposed || playing) return
      let result
      try {
        result = audio.play()
      } catch {
        bindRetry()
        return
      }
      if (result && typeof result.then === 'function') {
        result.then(handleSuccess).catch(bindRetry)
      } else {
        handleSuccess()
      }
    }

    tryPlay()
    // 첫 시도가 autoplay 판정 레이스로 실패한 경우를 커버하는 지연 재시도.
    for (const delay of [300, 1500]) {
      timers.push(setTimeout(tryPlay, delay))
    }

    return () => {
      disposed = true
      clearTimers()
      unbindRetry()
      try {
        audio.pause()
        audio.src = ''
      } catch {
        // 정리 실패는 무시
      }
    }
  }, [])

  useEffect(() => {
    if (!cheatOpen && !nicknameOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setCheatOpen(false)
        setNicknameOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cheatOpen, nicknameOpen])

  useEffect(() => {
    const handleCheatKeyDown = (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return

      const key = normalizeRevealCheatKey(event.key)
      if (!key) return

      cheatBufferRef.current = [...cheatBufferRef.current, key].slice(-REVEAL_CHEATS_CODE.length)
      if (!REVEAL_CHEATS_CODE.every((part, index) => cheatBufferRef.current[index] === part)) return

      cheatBufferRef.current = []
      onRevealDevCheats?.()
      setCheatRevealMessage(true)
    }

    window.addEventListener('keydown', handleCheatKeyDown)
    return () => window.removeEventListener('keydown', handleCheatKeyDown)
  }, [onRevealDevCheats])

  useEffect(() => {
    if (!cheatRevealMessage) return undefined
    const timer = setTimeout(() => setCheatRevealMessage(false), 1800)
    return () => clearTimeout(timer)
  }, [cheatRevealMessage])

  const handleUnlockAllWeapons = () => {
    unlockAllNonStarterWeapons()
  }

  const handleResetPassiveUpgrades = () => {
    resetPassiveUpgrades()
  }

  // 로그인/닉네임 게이트 보존: 미로그인 → 구글 로그인 → 닉네임 없으면 닉네임 모달 → 있으면 로비 진입.
  const handleStartClick = async () => {
    let user = authUser
    if (!user?.uid) {
      if (signingIn) return
      user = await signInWithGoogle()
      if (!user?.uid) return
    }
    if (ensureStudioCloudReady && !await ensureStudioCloudReady(user)) return

    const savedNickname = getSavedNickname(user)
    setCheatOpen(false)

    if (savedNickname) {
      onEnterLobby?.()
    } else {
      setNicknameInput(normalizeInitialNickname(user?.displayName))
      setNicknameError('')
      setNicknameOpen(true)
    }
  }

  const handleNicknameSubmit = (event) => {
    event.preventDefault()
    const result = saveNicknameForUser(authUser, nicknameInput)
    if (!result.ok) {
      setNicknameError(result.error)
      return
    }

    setNicknameInput(result.nickname)
    setNicknameError('')
    setNicknameOpen(false)
    requestCloudProgressSave()
    onEnterLobby?.()
  }

  const closeCheat = () => {
    setCheatOpen(false)
  }

  return (
    <div style={styles.root}>
      <style data-title-intro-css>{TITLE_INTRO_CSS}</style>
      <Suspense
        fallback={(
          <div data-testid="mock-canvas" className="title-intro-scene" style={{ ...styles.canvas, animationDelay: '3000ms' }}>
            <div data-testid="mock-title-scene" data-reduced-effects="false" />
          </div>
        )}
      >
        {studioVisualsReady ? (
          <TitleSceneCanvas className="title-intro-scene" style={{ ...styles.canvas, animationDelay: '3000ms' }} />
        ) : null}
      </Suspense>

      <div style={styles.tint} />
      <div style={styles.vignette} />
      <GoogleAccountPanel />
      {cheatRevealMessage && (
        <div style={styles.cheatRevealToast}>치트키가 보입니다</div>
      )}
      {cheatMenuButtonVisible && (
        <button
          type="button"
          aria-label="치트 메뉴 열기"
          aria-haspopup="dialog"
          aria-expanded={cheatOpen}
          style={styles.cheatMenuButton}
          onClick={() => setCheatOpen(true)}
        >
          치트
        </button>
      )}
      <div style={styles.content}>
        <div aria-hidden="true" data-title-service-name style={styles.serviceName}>탈출! 좀비학교</div>
        <h1 aria-label="탈출! 좀비학교" style={styles.title}>
          <span style={{ ...styles.titleAccent, ...styles.titleWord }}>
            {TITLE_ACCENT_LETTERS.map((config) => (
              <TitleLetter key={config.char} config={config} />
            ))}
            <span
              aria-hidden="true"
              className="title-intro-zombie"
              data-title-emoji
              style={{ ...styles.titleEmoji, animationDelay: '2050ms' }}
            >
              {TITLE_SCHOOL_EMOJI}
            </span>
          </span>
          <span style={styles.titleWord}>
            {TITLE_SCHOOL_LETTERS.map((config) => (
              <TitleLetter key={config.char} config={config} />
            ))}
            <span
              aria-hidden="true"
              className="title-intro-zombie"
              data-title-emoji
              style={{ ...styles.titleEmoji, animationDelay: '2050ms' }}
            >
              {TITLE_EMOJI_CLUSTER}
            </span>
          </span>
        </h1>
        <p style={styles.subtitle}>감염된 학교에서 4분만 버티면, 교문이 열린다</p>
      </div>

      <div style={styles.actions}>
        <div style={styles.mainActionStack}>
          <button type="button" style={{ ...styles.primaryButton, ...styles.mainActionButton }} onClick={handleStartClick}>
            게임 시작
          </button>
        </div>
      </div>

      {cheatOpen && cheatMenuButtonVisible && (
        <div style={styles.modalLayer}>
          <button type="button" aria-label="치트 메뉴 닫기 배경" style={styles.modalScrim} onClick={closeCheat} />
          <section role="dialog" aria-modal="true" aria-labelledby="title-cheat-heading" style={styles.cheatModal}>
            <div style={styles.modalHeader}>
              <h2 id="title-cheat-heading" style={styles.modalTitle}>치트 메뉴</h2>
              <button type="button" aria-label="닫기" style={styles.closeButton} onClick={closeCheat}>
                ×
              </button>
            </div>

            <div style={styles.sectionLabel}>개발 기능</div>
            <div style={styles.cheatButtons}>
              <button type="button" style={styles.cheatButton} onClick={handleUnlockAllWeapons}>
                모든 무기 해금
              </button>
              <button type="button" style={styles.resetButton} onClick={handleResetPassiveUpgrades}>
                코인 레벨업 초기화
              </button>
            </div>
          </section>
        </div>
      )}

      {nicknameOpen && (
        <div style={styles.modalLayer}>
          <button type="button" aria-label="닉네임 입력 닫기 배경" style={styles.modalScrim} onClick={() => setNicknameOpen(false)} />
          <section role="dialog" aria-modal="true" aria-labelledby="title-nickname-heading" style={styles.nicknameModal}>
            <div style={styles.modalHeader}>
              <h2 id="title-nickname-heading" style={styles.modalTitle}>닉네임 설정</h2>
              <button type="button" aria-label="닫기" style={styles.closeButton} onClick={() => setNicknameOpen(false)}>
                ×
              </button>
            </div>

            <form style={styles.nicknameForm} onSubmit={handleNicknameSubmit}>
              <label style={styles.nicknameLabel} htmlFor="title-nickname-input">
                유저 닉네임
              </label>
              <input
                id="title-nickname-input"
                aria-label="유저 닉네임"
                value={nicknameInput}
                maxLength={12}
                style={styles.nicknameInput}
                onChange={(event) => {
                  setNicknameInput(event.target.value)
                  if (nicknameError) {
                    const result = validateNickname(event.target.value)
                    if (result.ok) setNicknameError('')
                  }
                }}
                autoFocus
              />
              <p style={nicknameError ? styles.nicknameError : styles.nicknameHint}>
                {nicknameError || 'Google 로그인 중이면 이 닉네임이 계정 진행도에 함께 저장됩니다.'}
              </p>
              <button type="submit" style={styles.nicknameSubmitButton}>
                저장하고 시작
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

function normalizeInitialNickname(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, 12)
}

function normalizeRevealCheatKey(key) {
  if (key === 'ArrowUp') return 'arrowup'
  if (key === 'ArrowDown') return 'arrowdown'
  if (typeof key !== 'string' || key.length !== 1) return null
  const lower = key.toLowerCase()
  return lower >= 'a' && lower <= 'z' ? lower : null
}

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#151019',
    fontFamily: uiType.family,
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    background: '#1c1824',
  },
  tint: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(13,10,18,0.54) 0%, rgba(13,10,18,0.03) 36%, rgba(13,10,18,0.76) 100%)',
    pointerEvents: 'none',
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(120% 88% at 50% 44%, rgba(0,0,0,0) 46%, rgba(8,6,12,0.58) 100%)',
    pointerEvents: 'none',
  },
  cheatMenuButton: {
    position: 'absolute',
    top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 8px))',
    right: 'max(12px, calc(env(safe-area-inset-right, 0px) + 8px))',
    width: 52,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    border: uiBorders.strong,
    borderRadius: 999,
    background: uiPalette.reward,
    color: uiPalette.ink,
    fontSize: 13,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    cursor: 'pointer',
    boxShadow: uiShadows.pressSmall,
    zIndex: 3,
  },
  cheatRevealToast: {
    position: 'absolute',
    top: 'max(68px, calc(env(safe-area-inset-top, 0px) + 62px))',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 12px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.chalkboard,
    color: uiPalette.reward,
    fontSize: 13,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    boxShadow: uiShadows.pressSmall,
    zIndex: 4,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
  content: {
    position: 'absolute',
    top: 'max(8%, calc(env(safe-area-inset-top, 0px) + 64px))',
    left: 22,
    right: 22,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    pointerEvents: 'none',
    zIndex: 2,
  },
  serviceName: {
    padding: '4px 10px',
    border: uiBorders.strong,
    borderRadius: 999,
    background: uiPalette.chalkboard,
    color: uiPalette.reward,
    fontSize: 12,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 0,
    textShadow: `0 2px 0 ${uiPalette.ink}`,
    boxShadow: uiShadows.pressSmall,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    color: uiPalette.chalk,
    fontSize: 'clamp(46.8px, 14.04vw, 65px)',
    lineHeight: 0.96,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 0,
    WebkitTextFillColor: uiPalette.chalk,
    textShadow: '0 0 18px rgba(255,170,80,0.45), 0 0 30px rgba(65,116,90,0.42)',
  },
  titleAccent: {
    color: uiPalette.warning,
    WebkitTextFillColor: uiPalette.warning,
  },
  titleWord: {
    display: 'inline-flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
  },
  titleLetter: {
    display: 'inline-block',
    transformOrigin: '50% 88%',
  },
  titleEmoji: {
    display: 'inline-block',
    alignSelf: 'center',
    marginLeft: 4,
    fontSize: '0.6em',
    lineHeight: 1,
    WebkitTextFillColor: 'initial',
    transformOrigin: '50% 90%',
  },
  subtitle: {
    color: uiPalette.chalk,
    fontSize: 'clamp(12px, 3.7vw, 15px)',
    lineHeight: 1.35,
    fontWeight: uiType.weightStrong,
    letterSpacing: 0,
    maxWidth: 336,
    margin: '10px 0 0',
    textShadow: `0 3px 0 ${uiPalette.ink}, 0 0 8px rgba(0,0,0,0.45)`,
  },
  actions: {
    position: 'absolute',
    left: 'max(20px, calc(env(safe-area-inset-left, 0px) + 18px))',
    right: 'max(20px, calc(env(safe-area-inset-right, 0px) + 18px))',
    bottom: 'max(16px, calc(env(safe-area-inset-bottom, 0px) + 8px))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 3,
  },
  mainActionStack: {
    width: 'min(252px, 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: '11px 12px 12px',
    border: uiBorders.strong,
    borderRadius: 10,
    background: 'rgba(246,234,208,0.86)',
    boxShadow: uiShadows.panel,
    transform: 'rotate(-0.8deg)',
    pointerEvents: 'auto',
  },
  mainActionButton: {
    width: '100%',
    minWidth: 180,
    maxWidth: 230,
    transform: 'rotate(0.8deg)',
  },
  primaryButton: {
    ...schoolButton('primary'),
    minHeight: 58,
    fontSize: 21,
    letterSpacing: 1,
  },
  cheatButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  cheatButton: {
    ...schoolButton('reward'),
    minHeight: 30,
    fontSize: 11,
    lineHeight: 1.15,
    boxShadow: uiShadows.pressSmall,
  },
  resetButton: {
    ...schoolButton('paper'),
    minHeight: 30,
    fontSize: 11,
    lineHeight: 1.15,
    boxShadow: uiShadows.pressSmall,
  },
  modalLayer: {
    position: 'absolute',
    inset: 0,
    zIndex: 5,
  },
  modalScrim: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 0,
    padding: 0,
    background: 'rgba(5,2,9,0.42)',
    backdropFilter: 'blur(2px)',
    cursor: 'pointer',
  },
  cheatModal: {
    ...schoolPanel('dark'),
    position: 'absolute',
    top: '50%',
    left: 'max(24px, calc(env(safe-area-inset-left, 0px) + 16px))',
    right: 'max(24px, calc(env(safe-area-inset-right, 0px) + 16px))',
    transform: 'translateY(-50%)',
    padding: 14,
  },
  nicknameModal: {
    ...schoolPanel('dark'),
    position: 'absolute',
    top: '50%',
    left: 'max(24px, calc(env(safe-area-inset-left, 0px) + 16px))',
    right: 'max(24px, calc(env(safe-area-inset-right, 0px) + 16px))',
    transform: 'translateY(-50%)',
    padding: 14,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 9,
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 0,
  },
  closeButton: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.paperLight,
    color: uiPalette.ink,
    fontSize: 20,
    fontWeight: uiType.weightHeavy,
    cursor: 'pointer',
  },
  sectionLabel: {
    margin: '11px 0 7px',
    color: uiPalette.reward,
    fontSize: 12,
    fontWeight: uiType.weightStrong,
    letterSpacing: 0,
  },
  nicknameForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  nicknameLabel: {
    color: uiPalette.reward,
    fontSize: 12,
    lineHeight: 1,
    fontWeight: uiType.weightStrong,
  },
  nicknameInput: {
    width: '100%',
    minHeight: 46,
    padding: '0 11px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.paperLight,
    color: uiPalette.ink,
    fontSize: 17,
    lineHeight: 1,
    fontWeight: 900,
    outline: 'none',
    boxShadow: uiShadows.pressSmall,
    boxSizing: 'border-box',
  },
  nicknameHint: {
    minHeight: 30,
    margin: 0,
    color: '#c8c1d7',
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 800,
  },
  nicknameError: {
    minHeight: 30,
    margin: 0,
    color: uiPalette.warning,
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 900,
  },
  nicknameSubmitButton: {
    ...schoolButton('primary'),
    width: '100%',
    minHeight: 46,
    fontSize: 16,
    lineHeight: 1,
  },
}
