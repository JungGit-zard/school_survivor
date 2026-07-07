import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import TitleScene3D from './TitleScene3D.jsx'
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

const REVEAL_CHEATS_CODE = ['arrowup', 'arrowdown', 'arrowup', 'arrowdown', 'a', 's', 'd']

// 타이틀 화면은 "게임 시작" 하나만 남긴다(인지적 시작 행위). 로그인/닉네임 게이트를 통과하면
// 스테이지가 아니라 로비(onEnterLobby)로 진입한다. 스테이지 선택·상점·랭킹·설정은 로비로 이관.
// 코나미식 치트 시퀀스 + devCheatsVisible 치트 메뉴 노출 경로는 그대로 보존한다.
export default function TitleScreen({ onEnterLobby, devCheatsVisible = false, onRevealDevCheats }) {
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
  const titleStyle = settings.reducedEffects ? styles.titleReduced : styles.title
  const primaryButtonStyle = settings.reducedEffects ? styles.primaryButtonReduced : styles.primaryButton
  const adminOperations = getAdminOperationsConfig()
  const cheatMenuButtonVisible = devCheatsVisible && adminOperations.cheatMenuButtonVisible

  // 타이틀 진입 시 저장된 연출 설정을 전역 톤에 반영(설정 편집 UI는 로비로 이관됨).
  useEffect(() => {
    applyReducedEffects(settings.reducedEffects)
  }, [settings.reducedEffects])

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
      <Canvas
        camera={{ fov: 34, position: [0, 6.8, 11.8], near: 0.1, far: 100 }}
        gl={{ stencil: true, antialias: true }}
        shadows
        style={styles.canvas}
      >
        <TitleScene3D />
      </Canvas>

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
        <div style={styles.serviceName}>탈출! 좀비학교🧟‍♀️</div>
        <h1 style={titleStyle}>
          <span style={styles.titleAccent}>탈출!</span>
          <span>좀비학교🧟‍♀️</span>
        </h1>
        <p style={styles.subtitle}>감염된 학교에서 4분만 버티면, 교문이 열린다</p>
      </div>

      <div style={styles.actions}>
        <div style={styles.mainActionStack}>
          <button type="button" style={{ ...primaryButtonStyle, ...styles.mainActionButton }} onClick={handleStartClick}>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    color: uiPalette.chalk,
    fontSize: 'clamp(46.8px, 14.04vw, 65px)',
    lineHeight: 0.96,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 0,
    WebkitTextFillColor: uiPalette.chalk,
    textShadow: '0 0 18px rgba(255,170,80,0.45), 0 0 30px rgba(65,116,90,0.42)',
  },
  titleReduced: {
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    color: uiPalette.chalk,
    fontSize: 'clamp(46.8px, 14.04vw, 65px)',
    lineHeight: 0.96,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 0,
    WebkitTextFillColor: uiPalette.chalk,
    textShadow: 'none',
  },
  titleAccent: {
    color: uiPalette.warning,
    WebkitTextFillColor: uiPalette.warning,
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
  primaryButtonReduced: {
    ...schoolButton('primary'),
    minHeight: 58,
    background: uiPalette.cta,
    color: uiPalette.ink,
    fontSize: 20,
    boxShadow: uiShadows.press,
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
