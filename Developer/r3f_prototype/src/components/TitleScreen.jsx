import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import TitleScene3D from './TitleScene3D.jsx'
import GoogleAccountPanel from './GoogleAccountPanel.jsx'
import { getAllWeaponIds, isStarter } from '../lib/weaponCatalog.js'
import { setUnlocked as setWeaponUnlocked } from '../lib/weaponUnlocks.js'
import { getStageConfig } from '../lib/stageConfig.js'
import { requestCloudProgressSave } from '../lib/firebaseProgress.js'
import { getSavedNickname, saveNicknameForUser, validateNickname } from '../lib/userNickname.js'
import { getAdminOperationsConfig } from '../lib/adminConfig.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'

const SETTINGS_STORAGE_KEY = 'school_survivor:titleSettings'
const REVEAL_CHEATS_CODE = ['arrowup', 'arrowdown', 'arrowup', 'arrowdown', 'a', 's', 'd']
const DEFAULT_SETTINGS = {
  vibration: true,
  reducedEffects: false,
  unlockAllWeaponsCheat: false,
}

export default function TitleScreen({ onStart, onOpenCoinShop, onOpenRanking, devCheatsVisible = false, onRevealDevCheats }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cheatOpen, setCheatOpen] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [nicknameOpen, setNicknameOpen] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [nicknameFromSettings, setNicknameFromSettings] = useState(false)
  const [pendingStageId, setPendingStageId] = useState('stage1')
  const [settings, setSettings] = useState(loadTitleSettings)
  const [selectedStageId, setSelectedStageId] = useState('stage1')
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
  const stage1 = getStageConfig('stage1')
  const stage2 = getStageConfig('stage2')

  useEffect(() => {
    saveTitleSettings(settings)

    if (typeof document === 'undefined') return
    if (settings.reducedEffects) {
      document.documentElement.dataset.reducedEffects = 'true'
    } else {
      document.documentElement.removeAttribute('data-reduced-effects')
    }
  }, [settings])

  useEffect(() => {
    if (!settingsOpen && !cheatOpen && !nicknameOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
        setCheatOpen(false)
        setNicknameOpen(false)
        setControlsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [settingsOpen, cheatOpen, nicknameOpen])

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

  const toggleSetting = (key) => {
    setSettings((current) => {
      const next = { ...current, [key]: !current[key] }

      if (key === 'vibration' && next.vibration && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(18)
      }
      if (key === 'unlockAllWeaponsCheat' && next.unlockAllWeaponsCheat) {
        unlockAllNonStarterWeapons()
      }

      return next
    })
  }

  const handleUnlockAllWeapons = () => {
    unlockAllNonStarterWeapons()
    setSettings((current) => (
      current.unlockAllWeaponsCheat ? current : { ...current, unlockAllWeaponsCheat: true }
    ))
  }

  const handleResetPassiveUpgrades = () => {
    resetPassiveUpgrades()
  }

  const handleStartClick = async () => {
    let user = authUser
    if (!user?.uid) {
      if (signingIn) return
      user = await signInWithGoogle()
      if (!user?.uid) return
    }

    const savedNickname = getSavedNickname(user)
    setPendingStageId(selectedStageId)
    setCheatOpen(false)
    setSettingsOpen(false)

    if (savedNickname) {
      // 이미 닉네임 설정됨 → 바로 시작
      onStart(selectedStageId)
    } else {
      // 최초 진입 → 닉네임 입력 모달
      setNicknameInput(normalizeInitialNickname(user?.displayName))
      setNicknameError('')
      setNicknameFromSettings(false)
      setNicknameOpen(true)
    }
  }

  const handleOpenNicknameFromSettings = () => {
    if (!authUser?.uid) return
    setNicknameInput(getSavedNickname(authUser) || normalizeInitialNickname(authUser?.displayName))
    setNicknameError('')
    setNicknameFromSettings(true)
    setSettingsOpen(false)
    setNicknameOpen(true)
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

    if (!nicknameFromSettings) {
      onStart(pendingStageId)
    }
    setNicknameFromSettings(false)
  }

  const closeSettings = () => {
    setSettingsOpen(false)
    setControlsOpen(false)
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
      <button
        type="button"
        aria-label="설정 열기"
        aria-haspopup="dialog"
        aria-expanded={settingsOpen}
        style={styles.settingsButton}
        onClick={() => setSettingsOpen(true)}
      >
        ⚙
      </button>
      <div style={styles.content}>
        <div style={styles.serviceName}>Escape! zombie school</div>
        <h1 style={titleStyle}>
          <span style={styles.titleAccent}>Escape!</span>
          <span>zombie school</span>
        </h1>
        <p style={styles.subtitle}>감염된 학교에서 4분만 버티면, 교문이 열린다</p>
      </div>

      <div style={styles.actions}>
        <div style={styles.mainActionStack}>
          <button type="button" style={{ ...primaryButtonStyle, ...styles.mainActionButton }} onClick={handleStartClick}>
            게임 시작
          </button>
          <button type="button" style={{ ...styles.coinShopButton, ...styles.mainActionButton }} onClick={() => onOpenCoinShop?.()}>
            🪙 코인상점
          </button>
          <button type="button" style={{ ...styles.rankingButton, ...styles.mainActionButton }} onClick={() => onOpenRanking?.()}>
            유저랭킹
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

            <div style={styles.sectionLabel}>시작 스테이지</div>
            <div style={styles.stageSelect} aria-label="시작 스테이지 선택">
              <button
                type="button"
                style={styles.stageButton(selectedStageId === 'stage1', false)}
                onClick={() => setSelectedStageId('stage1')}
              >
                <span style={styles.stageButtonLabel}>{stage1.label}</span>
                <span style={styles.stageButtonDesc}>교실 생존</span>
              </button>
              <button
                type="button"
                style={styles.stageButton(selectedStageId === 'stage2', false)}
                onClick={() => setSelectedStageId('stage2')}
              >
                <span style={styles.stageButtonLabel}>{stage2.label}</span>
                <span style={styles.stageButtonDesc}>복도 탄환</span>
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
              <h2 id="title-nickname-heading" style={styles.modalTitle}>{nicknameFromSettings ? '닉네임 변경' : '닉네임 설정'}</h2>
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
                {nicknameFromSettings ? '저장' : '저장하고 시작'}
              </button>
            </form>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div style={styles.modalLayer}>
          <button type="button" aria-label="설정 닫기 배경" style={styles.modalScrim} onClick={closeSettings} />
          <section role="dialog" aria-modal="true" aria-labelledby="title-settings-heading" style={styles.settingsModal}>
            <div style={styles.modalHeader}>
              <h2 id="title-settings-heading" style={styles.modalTitle}>설정</h2>
              <button type="button" aria-label="닫기" style={styles.closeButton} onClick={closeSettings}>
                ×
              </button>
            </div>

            <div style={styles.sectionLabel}>프로필</div>
            <button type="button" style={styles.settingRow} onClick={handleOpenNicknameFromSettings}>
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>닉네임</strong>
                <span style={styles.rowDescription}>
                  {getSavedNickname(authUser) || '미설정'}
                </span>
              </span>
              <span style={styles.arrow}>›</span>
            </button>

            <div style={styles.sectionLabel}>게임 환경</div>
            <button
              type="button"
              aria-label={settings.vibration ? '진동 끄기' : '진동 켜기'}
              style={styles.settingRow}
              onClick={() => toggleSetting('vibration')}
            >
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>진동</strong>
                <span style={styles.rowDescription}>피격/보상 피드백을 진동으로 알림</span>
              </span>
              <span style={styles.toggleTrack(settings.vibration)}>
                <span style={styles.toggleKnob(settings.vibration)} />
              </span>
            </button>

            <button
              type="button"
              aria-label={settings.reducedEffects ? '연출 줄이기 끄기' : '연출 줄이기 켜기'}
              style={styles.settingRow}
              onClick={() => toggleSetting('reducedEffects')}
            >
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>연출 줄이기</strong>
                <span style={styles.rowDescription}>강한 그림자와 빛 번짐을 낮춤</span>
              </span>
              <span style={styles.toggleTrack(settings.reducedEffects)}>
                <span style={styles.toggleKnob(settings.reducedEffects)} />
              </span>
            </button>

            <div style={styles.sectionLabel}>도움말</div>
            <button type="button" style={styles.settingRow} onClick={() => setControlsOpen((current) => !current)}>
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>조작법 보기</strong>
                <span style={styles.rowDescription}>이동, 레벨업 카드, 일시정지 안내</span>
              </span>
              <span style={styles.arrow}>{controlsOpen ? '⌃' : '›'}</span>
            </button>

            {controlsOpen && (
              <div style={styles.controlsPanel}>
                <p style={styles.controlLine}>모바일: 화면 아래 조이스틱으로 이동합니다.</p>
                <p style={styles.controlLine}>레벨업: 카드를 눌러 무기나 패시브를 선택합니다.</p>
                <p style={styles.controlLine}>일시정지: 전투 화면의 일시정지 버튼을 사용합니다.</p>
              </div>
            )}

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

function loadTitleSettings() {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS

    const parsed = JSON.parse(raw)
    return {
      vibration: typeof parsed.vibration === 'boolean' ? parsed.vibration : DEFAULT_SETTINGS.vibration,
      reducedEffects: typeof parsed.reducedEffects === 'boolean' ? parsed.reducedEffects : DEFAULT_SETTINGS.reducedEffects,
      unlockAllWeaponsCheat: typeof parsed.unlockAllWeaponsCheat === 'boolean' ? parsed.unlockAllWeaponsCheat : DEFAULT_SETTINGS.unlockAllWeaponsCheat,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function unlockAllNonStarterWeapons() {
  for (const id of getAllWeaponIds()) {
    if (!isStarter(id)) setWeaponUnlocked(id)
  }
}

function saveTitleSettings(settings) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
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
  settingsButton: {
    position: 'absolute',
    top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 8px))',
    right: 'max(12px, calc(env(safe-area-inset-right, 0px) + 8px))',
    width: 44,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.paperLight,
    color: uiPalette.ink,
    fontSize: 22,
    fontWeight: uiType.weightStrong,
    cursor: 'pointer',
    boxShadow: uiShadows.pressSmall,
    zIndex: 3,
  },
  cheatMenuButton: {
    position: 'absolute',
    top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 8px))',
    right: 'max(66px, calc(env(safe-area-inset-right, 0px) + 60px))',
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
    fontSize: 'clamp(36px, 10.8vw, 50px)',
    lineHeight: 0.96,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 0,
    WebkitTextFillColor: uiPalette.chalk,
    WebkitTextStroke: `1.25px ${uiPalette.ink}`,
    textShadow: `0 2px 0 ${uiPalette.ink}, 0 0 18px rgba(255,170,80,0.45), 0 0 30px rgba(65,116,90,0.42)`,
  },
  titleReduced: {
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    color: uiPalette.chalk,
    fontSize: 'clamp(36px, 10.8vw, 50px)',
    lineHeight: 0.96,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 0,
    WebkitTextFillColor: uiPalette.chalk,
    textShadow: `0 3px 0 ${uiPalette.ink}`,
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
  stageSelectLabel: {
    marginTop: 8,
    marginBottom: 4,
    color: '#c8c1d7',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stageSelect: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 8,
    pointerEvents: 'auto',
  },
  stageButton: (selected, locked) => ({
    minHeight: 45,
    border: uiBorders.strong,
    borderRadius: 8,
    background: locked ? 'rgba(92,86,104,0.78)' : selected ? uiPalette.reward : uiPalette.paper,
    color: uiPalette.ink,
    cursor: locked ? 'not-allowed' : 'pointer',
    boxShadow: uiShadows.press,
    opacity: locked ? 0.82 : 1,
  }),
  stageButtonLabel: {
    display: 'block',
    fontSize: 14,
    lineHeight: 1.15,
    fontWeight: 1000,
  },
  stageButtonDesc: {
    display: 'block',
    marginTop: 2,
    fontSize: 11,
    lineHeight: 1.15,
    fontWeight: 800,
  },
  stageLockHint: {
    margin: '0 0 8px',
    padding: '5px 8px',
    border: uiBorders.hairline,
    borderRadius: 8,
    background: 'rgba(24,55,47,0.88)',
    color: uiPalette.paperLight,
    fontSize: 11,
    lineHeight: 1.3,
    fontWeight: 800,
    textAlign: 'center',
    pointerEvents: 'none',
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
  coinShopButton: {
    ...schoolButton('reward'),
    minHeight: 48,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  rankingButton: {
    ...schoolButton('paper'),
    minHeight: 48,
    fontSize: 16,
    letterSpacing: 0,
  },
  cheatActions: {
    marginTop: 8,
    border: '1.5px solid rgba(247,209,126,0.35)',
    borderRadius: 8,
    padding: '6px 8px',
    background: 'rgba(22,18,29,0.72)',
    pointerEvents: 'auto',
  },
  cheatLabel: {
    color: '#f7d17e',
    fontSize: 10,
    fontWeight: 900,
    marginBottom: 5,
    letterSpacing: 0.5,
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
  settingsModal: {
    ...schoolPanel('dark'),
    position: 'absolute',
    top: '50%',
    left: 'max(24px, calc(env(safe-area-inset-left, 0px) + 16px))',
    right: 'max(24px, calc(env(safe-area-inset-right, 0px) + 16px))',
    transform: 'translateY(-50%)',
    maxHeight: '68%',
    overflow: 'auto',
    padding: 14,
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
  settingRow: {
    width: '100%',
    minHeight: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 10px',
    marginBottom: 7,
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.chalkboard,
    color: uiPalette.paperLight,
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: uiShadows.pressSmall,
  },
  rowText: {
    minWidth: 0,
    display: 'block',
  },
  rowTitle: {
    display: 'block',
    fontSize: 13,
    lineHeight: 1.2,
    fontWeight: uiType.weightStrong,
  },
  rowDescription: {
    display: 'block',
    marginTop: 3,
    color: uiPalette.mutedChalk,
    fontSize: 10,
    lineHeight: 1.25,
    fontWeight: 700,
  },
  toggleTrack: (enabled) => ({
    flex: '0 0 auto',
    width: 50,
    height: 28,
    padding: 3,
    border: uiBorders.strong,
    borderRadius: 999,
    background: enabled ? uiPalette.cta : '#5d5668',
    boxSizing: 'border-box',
  }),
  toggleKnob: (enabled) => ({
    display: 'block',
    width: 18,
    height: 18,
    border: uiBorders.strong,
    borderRadius: '50%',
    background: uiPalette.paperLight,
    transform: enabled ? 'translateX(20px)' : 'translateX(0)',
    transition: 'transform 120ms ease',
  }),
  arrow: {
    flex: '0 0 auto',
    color: uiPalette.reward,
    fontSize: 25,
    lineHeight: 1,
    fontWeight: 1000,
  },
  controlsPanel: {
    margin: '1px 0 3px',
    padding: '9px 10px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.chalkboardDeep,
    boxShadow: uiShadows.pressSmall,
  },
  controlLine: {
    margin: '0 0 5px',
    color: uiPalette.paperLight,
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 750,
  },
}
