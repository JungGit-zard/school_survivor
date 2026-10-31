import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ConsentGate from './ConsentGate.jsx'
import GoogleAccountPanel from './GoogleAccountPanel.jsx'
import { ZOMBIE_BOARD_COPY } from './zombieBoardCopy.js'
import TitleSceneCanvas from './TitleSceneCanvas.jsx'
import { isFirebaseProgressHydrated, requestCloudProgressSave } from '../lib/firebaseProgress.js'
import { getSavedNickname, saveNicknameForUser, validateNickname } from '../lib/userNickname.js'
import { getAdminOperationsConfig } from '../lib/adminConfig.js'
import {
  applyHitCameraShake,
  applyLanguage,
  applyReducedEffects,
  loadGuestSessionSettings,
  loadTitleSettings,
  saveGuestSessionSettings,
  saveTitleSettings,
  unlockAllStagesForDevCheat,
} from '../lib/titleSettings.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { LOCALE_OPTIONS, useLocale, useT } from '../lib/i18n.js'
import { useAuthStore } from '../store/useAuthStore.js'
import {
  clearPendingStartAfterLogin,
  consumePendingStartAfterLogin,
} from '../lib/loginContinuation.js'
import { acquireStreamingBgm } from '../lib/streamingBgm.js'
import { TITLE_BGM_URL as titleBgmUrl } from '../lib/titleBgm.js'

const REVEAL_CHEATS_CODE = ['arrowup', 'arrowdown', 'arrowup', 'arrowdown', 'a', 's', 'd']
const DEV_CHEATS_ENABLED = import.meta.env.DEV
// 한국어 정본 슬램 배치. 문자 수·진입 벡터·순서를 그대로 보존한다.
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
// 다른 언어는 글자 수가 달라 정본 배열을 쓸 수 없다. 같은 진입 벡터 풀을 순환시켜
// 글자별 슬램을 만들고, 전체 인트로 길이는 한국어와 같게 유지한다.
const TITLE_ENTER_VECTORS = [
  { x: '-110vw', y: '-5vh', rotation: '-18deg' },
  { x: '110vw', y: '-8vh', rotation: '16deg' },
  { x: '8vw', y: '-55vh', rotation: '14deg' },
  { x: '-6vw', y: '75vh', rotation: '-12deg' },
  { x: '-100vw', y: '-35vh', rotation: '-16deg' },
  { x: '100vw', y: '-28vh', rotation: '18deg' },
  { x: '15vw', y: '-65vh', rotation: '24deg' },
]
const TITLE_SLAM_SPAN_MS = 805

function buildTitleLetters(word, startOrder) {
  return Array.from(word, (char, index) => ({
    char: char === ' ' ? ' ' : char,
    order: startOrder + index,
    ...TITLE_ENTER_VECTORS[(startOrder + index) % TITLE_ENTER_VECTORS.length],
  }))
}

function getTitleWords(locale, translate) {
  if (locale === 'ko') return { accent: TITLE_ACCENT_LETTERS, school: TITLE_SCHOOL_LETTERS }
  const accentWord = translate('title.wordAccent')
  const schoolWord = translate('title.wordSchool')
  const accent = buildTitleLetters(accentWord, 0)
  const school = buildTitleLetters(schoolWord, accent.length)
  return { accent, school }
}

function titleLetterDelayMs(order, total) {
  return 60 + order * Math.max(35, Math.round(TITLE_SLAM_SPAN_MS / Math.max(1, total)))
}
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
  .title-intro-letter { animation: titleLetterSlam 260ms cubic-bezier(.16,.84,.28,1.08) backwards; }
  .title-intro-zombie { animation: titleZombieScurry 450ms ease-out backwards; }
  .title-intro-scene { animation: titleSceneGather 425ms cubic-bezier(.16,.84,.28,1.04) backwards; }
  .title-main-action:focus-visible, .title-language-action:focus-visible { outline:3px solid #fff8e8; outline-offset:3px; }
`

function TitleLetter({ config, total }) {
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
        animationDelay: `${titleLetterDelayMs(config.order, total)}ms`,
      }}
    >
      {config.char}
    </span>
  )
}

// "게임 시작"은 로그인 여부와 무관하게 바로 로비(onEnterLobby)로 들어간다 — 미로그인은 게스트 플레이.
// Google 로그인은 좌상단 GoogleAccountPanel의 "Google 로그인" 버튼(보조 동선)으로만 한다
// (2026-10-31 첫 20명 확보: 첫 탭이 로그인 창으로 튀지 않게).
// 스테이지 선택·상점·랭킹·설정은 로비에서 처리한다.
// 「로자리의 방」 진입점도 로비(스테이지 선택) 좌상단으로 옮겼다 — 타이틀에는 두지 않는다
// (2026-10-29 Terry: "로그인 - 게임시작 - 스테이지선택 화면 좌상단").
// 코나미식 치트 시퀀스 + devCheatsVisible 치트 메뉴 노출 경로는 그대로 보존한다.
export default function TitleScreen({
  onEnterLobby,
  devCheatsVisible = false,
  onRevealDevCheats,
  onUnlockAllStages,
}) {
  const t = useT()
  const locale = useLocale()
  const [cheatOpen, setCheatOpen] = useState(false)
  const [nicknameOpen, setNicknameOpen] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentUser, setConsentUser] = useState(null)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const authUser = useAuthStore((s) => s.user)
  const authSigningIn = useAuthStore((s) => s.signingIn)
  const [settings] = useState(() => (
    isFirebaseProgressHydrated(authUser) ? loadTitleSettings() : !authUser?.uid ? loadGuestSessionSettings() : {
      vibration: true,
      reducedEffects: false,
      hitCameraShake: true,
      unlockAllWeaponsCheat: false,
      unlockAllStagesCheat: false,
    }
  ))
  const [cheatRevealMessage, setCheatRevealMessage] = useState(false)
  const cheatBufferRef = useRef([])
  const adminOperations = getAdminOperationsConfig()
  const cheatMenuButtonVisible = DEV_CHEATS_ENABLED && devCheatsVisible && adminOperations.cheatMenuButtonVisible
  const titleWords = getTitleWords(locale, t)
  const titleLetterTotal = titleWords.accent.length + titleWords.school.length
  const mainActionBusy = !authUser?.uid && authSigningIn
  const mainActionStyle = mainActionBusy
    ? { ...styles.primaryButton, ...styles.mainActionButton, ...styles.mainActionButtonBusy }
    : { ...styles.primaryButton, ...styles.mainActionButton }

  // 타이틀 연출은 항상 재생하고, 화면을 벗어날 때 저장된 전역 설정을 복원한다.
  useEffect(() => {
    applyReducedEffects(false)
    applyHitCameraShake(settings.hitCameraShake)
    return () => {
      applyReducedEffects(settings.reducedEffects)
      applyHitCameraShake(settings.hitCameraShake)
    }
  }, [settings.hitCameraShake, settings.reducedEffects])

  // 타이틀 BGM: 타이틀 DOM 커밋 직후(첫 페인트 전) 루프 재생을 시도한다.
  // 공유 스트리밍 플레이어(streamingBgm)가 네이티브 <audio loop>로 끊김 없이 반복하고,
  // 자동재생 거부 시 첫 제스처·탭 복귀·bfcache 복귀에서 재시도하며, 스트림 정지/오류 시 이어서 재로드한다.
  // 300ms/1500ms 지연 재시도는 Chrome MEI 첫 시도 레이스를 커버한다.
  useLayoutEffect(() => {
    let handle
    try {
      handle = acquireStreamingBgm(titleBgmUrl, { volume: 0.5 })
    } catch {
      return undefined
    }
    if (typeof window !== 'undefined') window.__titleBgm = handle.audio
    const timers = [300, 1500].map((delay) => setTimeout(() => handle.setActive(true), delay))
    return () => {
      timers.forEach(clearTimeout)
      handle.release()
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
    if (!DEV_CHEATS_ENABLED) return undefined

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
    void import('../lib/titleSettings.js')
      .then(({ unlockAllNonStarterWeapons }) => unlockAllNonStarterWeapons())
      .catch(() => {})
  }

  const handleUnlockAllStages = () => {
    unlockAllStagesForDevCheat()
    onUnlockAllStages?.()
    requestCloudProgressSave()
  }

  const handleResetPassiveUpgrades = () => {
    void import('../store/useGameStore.js')
      .then(({ useGameStore }) => useGameStore.getState().resetPassiveUpgrades())
      .catch(() => {})
  }

  // 닉네임 판정 이후 단계: 닉네임 있으면 로비로, 없으면 닉네임 모달로.
  const proceedPastConsent = (user) => {
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

  const enterLobbyFromStart = () => {
    clearPendingStartAfterLogin()
    onEnterLobby?.()
  }

  useEffect(() => {
    if (!authUser?.uid) return
    if (!consumePendingStartAfterLogin()) return
    setCheatOpen(false)
    setNicknameOpen(false)
    setConsentOpen(false)
    setConsentUser(null)
    enterLobbyFromStart()
  }, [authUser?.uid])

  // 게임 시작: 로그인 사용자·게스트 모두 즉시 로비로. Google 로그인은 계정 패널에서만 띄운다.
  // 패널에서 로그인 진행 중(mainActionBusy)에는 중복 진입을 막는다.
  const handleStartClick = () => {
    if (mainActionBusy) return
    setCheatOpen(false)
    setNicknameOpen(false)
    setConsentOpen(false)
    setConsentUser(null)
    enterLobbyFromStart()
  }

  const handleConsentConfirmed = () => {
    setConsentOpen(false)
    const user = consentUser
    setConsentUser(null)
    proceedPastConsent(user)
  }

  const handleConsentCancel = () => {
    setConsentOpen(false)
    setConsentUser(null)
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

  // 타이틀 언어 선택: 로비 설정 모달과 같은 저장 경로(titleSettings)를 쓴다.
  // 계정이 하이드레이트됐으면 계정 설정에, 게스트면 이번 접속 메모리에 둔다. 새 저장소는 없다.
  const selectLanguage = (language) => {
    setLanguageMenuOpen(false)
    if (isFirebaseProgressHydrated(authUser)) {
      saveTitleSettings({ language })
      Promise.resolve(requestCloudProgressSave()).catch(() => {})
    } else if (!authUser?.uid) {
      saveGuestSessionSettings({ language })
    }
    applyLanguage(language)
  }

  return (
    <div style={styles.root}>
      <style data-title-intro-css>{TITLE_INTRO_CSS}</style>
      <TitleSceneCanvas
        className="title-intro-scene"
        style={{ ...styles.canvas, animationDelay: '1500ms' }}
      />

      <div style={styles.tint} />
      <div style={styles.vignette} />
      <GoogleAccountPanel />
      <a href={`/landing?lang=${encodeURIComponent(locale || 'ko')}#inquiry`} className="title-main-action" style={{
        ...styles.contactLink,
        ...(cheatMenuButtonVisible ? { top: 'max(66px, calc(env(safe-area-inset-top, 0px) + 60px))' } : {}),
      }}>{(ZOMBIE_BOARD_COPY[locale] || ZOMBIE_BOARD_COPY.ko).contact}</a>
      <div
        data-title-language
        onKeyDown={(event) => { if (event.key === 'Escape') setLanguageMenuOpen(false) }}
        style={{
          ...styles.languageAnchor,
          ...(cheatMenuButtonVisible ? { top: 'max(118px, calc(env(safe-area-inset-top, 0px) + 112px))' } : {}),
        }}
      >
        <button
          type="button"
          className="title-language-action"
          aria-label={t('settings.languageAria')}
          aria-haspopup="true"
          aria-expanded={languageMenuOpen}
          style={styles.languageButton}
          onClick={() => setLanguageMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">🌐</span>
          <span>{(locale || 'ko').toUpperCase()}</span>
        </button>
        {languageMenuOpen && (
          <>
            <button
              type="button"
              aria-label={t('common.close')}
              tabIndex={-1}
              style={styles.languageScrim}
              onClick={() => setLanguageMenuOpen(false)}
            />
            <div role="group" aria-label={t('settings.languageAria')} style={styles.languageMenu}>
              {LOCALE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  lang={option.id}
                  className="title-language-action"
                  aria-pressed={locale === option.id}
                  style={styles.languageOption(locale === option.id)}
                  onClick={() => selectLanguage(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {cheatRevealMessage && (
        <div style={styles.cheatRevealToast}>{t('title.cheatToast')}</div>
      )}
      {cheatMenuButtonVisible && (
        <button
          type="button"
          aria-label={t('title.cheatOpenAria')}
          aria-haspopup="dialog"
          aria-expanded={cheatOpen}
          style={styles.cheatMenuButton}
          onClick={() => setCheatOpen(true)}
        >
          {t('title.cheatButton')}
        </button>
      )}
      <div style={styles.content}>
        <div aria-hidden="true" data-title-service-name style={styles.serviceName}>{t('title.serviceName')}</div>
        <h1 aria-label={t('title.serviceName')} style={{ ...styles.title, fontSize: t('title.fontSize') }}>
          <span style={{ ...styles.titleAccent, ...styles.titleWord }}>
            {titleWords.accent.map((config) => (
              <TitleLetter key={`${config.char}-${config.order}`} config={config} total={titleLetterTotal} />
            ))}
            <span
              aria-hidden="true"
              className="title-intro-zombie"
              data-title-emoji
              style={{ ...styles.titleEmoji, animationDelay: '1025ms' }}
            >
              {TITLE_SCHOOL_EMOJI}
            </span>
          </span>
          <span style={styles.titleWord}>
            {titleWords.school.map((config) => (
              <TitleLetter key={`${config.char}-${config.order}`} config={config} total={titleLetterTotal} />
            ))}
            <span
              aria-hidden="true"
              className="title-intro-zombie"
              data-title-emoji
              style={{ ...styles.titleEmoji, animationDelay: '1025ms' }}
            >
              {TITLE_EMOJI_CLUSTER}
            </span>
          </span>
        </h1>
        <p style={styles.subtitle}>{t('title.subtitle')}</p>
      </div>

        <div style={styles.actions}>
        <div style={styles.mainActionStack}>
          <button
            type="button"
            className="title-main-action"
            style={mainActionStyle}
            disabled={mainActionBusy}
            aria-busy={mainActionBusy ? 'true' : undefined}
            onClick={handleStartClick}
          >
            {mainActionBusy ? t('account.signingIn') : t('title.start')}
          </button>
          <a href="/landing" className="title-main-action" style={{ ...styles.homepageButton, ...styles.mainActionButton }}>
            {t('title.homepage')}
          </a>
        </div>
      </div>

      {cheatOpen && cheatMenuButtonVisible && (
        <div style={styles.modalLayer}>
          <button type="button" aria-label={t('title.cheatCloseAria')} style={styles.modalScrim} onClick={closeCheat} />
          <section role="dialog" aria-modal="true" aria-labelledby="title-cheat-heading" style={styles.cheatModal}>
            <div style={styles.modalHeader}>
              <h2 id="title-cheat-heading" style={styles.modalTitle}>{t('title.cheatHeading')}</h2>
              <button type="button" aria-label={t('common.close')} style={styles.closeButton} onClick={closeCheat}>
                ×
              </button>
            </div>

            <div style={styles.sectionLabel}>{t('title.devSection')}</div>
            <div style={styles.cheatButtons}>
              <button type="button" style={styles.cheatButton} onClick={handleUnlockAllWeapons}>
                {t('title.unlockWeapons')}
              </button>
              <button type="button" style={styles.cheatButton} onClick={handleUnlockAllStages}>
                {t('title.unlockStages')}
              </button>
              <button type="button" style={styles.resetButton} onClick={handleResetPassiveUpgrades}>
                {t('title.resetPassives')}
              </button>
            </div>
          </section>
        </div>
      )}

      {consentOpen && consentUser && (
        <ConsentGate
          user={consentUser}
          onConfirmed={handleConsentConfirmed}
          onCancel={handleConsentCancel}
        />
      )}

      {nicknameOpen && (
        <div style={styles.modalLayer}>
          <button type="button" aria-label={t('title.nicknameCloseAria')} style={styles.modalScrim} onClick={() => setNicknameOpen(false)} />
          <section role="dialog" aria-modal="true" aria-labelledby="title-nickname-heading" style={styles.nicknameModal}>
            <div style={styles.modalHeader}>
              <h2 id="title-nickname-heading" style={styles.modalTitle}>{t('title.nicknameHeading')}</h2>
              <button type="button" aria-label={t('common.close')} style={styles.closeButton} onClick={() => setNicknameOpen(false)}>
                ×
              </button>
            </div>

            <form style={styles.nicknameForm} onSubmit={handleNicknameSubmit}>
              <label style={styles.nicknameLabel} htmlFor="title-nickname-input">
                {t('title.nicknameLabel')}
              </label>
              <input
                id="title-nickname-input"
                aria-label={t('title.nicknameLabel')}
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
                {nicknameError || t('title.nicknameHint')}
              </p>
              <button type="submit" style={styles.nicknameSubmitButton}>
                {t('title.nicknameSubmit')}
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
  // 문의 링크 바로 아래, 같은 우측 열(72px). 타이틀 글자는 가운데라 겹치지 않는다.
  languageAnchor: {
    position: 'absolute',
    top: 'max(66px, calc(env(safe-area-inset-top, 0px) + 60px))',
    right: 'max(12px, calc(env(safe-area-inset-right, 0px) + 8px))',
    zIndex: 4,
  },
  languageButton: {
    ...schoolButton('paper'),
    position: 'relative',
    zIndex: 1,
    width: 72,
    minHeight: 44,
    padding: '6px 4px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    fontSize: 13,
    lineHeight: 1,
    cursor: 'pointer',
  },
  languageScrim: {
    position: 'fixed',
    inset: 0,
    border: 0,
    padding: 0,
    background: 'transparent',
    cursor: 'default',
  },
  languageMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    zIndex: 1,
    width: 132,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 6,
    boxSizing: 'border-box',
    border: uiBorders.strong,
    borderRadius: 10,
    background: 'rgba(246,234,208,0.96)',
    boxShadow: uiShadows.panel,
  },
  languageOption: (active) => ({
    ...schoolButton(active ? 'primary' : 'paper'),
    width: '100%',
    minHeight: 44,
    padding: '6px 8px',
    boxSizing: 'border-box',
    fontSize: 15,
    lineHeight: 1.1,
    cursor: 'pointer',
  }),
  contactLink: {
    ...schoolButton('paper'),
    position: 'absolute',
    top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 8px))',
    right: 'max(12px, calc(env(safe-area-inset-right, 0px) + 8px))',
    width: 72,
    minWidth: 44,
    minHeight: 44,
    padding: '6px 4px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    lineHeight: 1.2,
    overflowWrap: 'anywhere',
    textAlign: 'center',
    textDecoration: 'none',
    zIndex: 3,
  },
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
  mainActionButtonBusy: {
    cursor: 'wait',
    opacity: 0.76,
    filter: 'saturate(0.78)',
  },
  primaryButton: {
    ...schoolButton('primary'),
    minHeight: 58,
    fontSize: 21,
    letterSpacing: 1,
  },
  homepageButton: {
    ...schoolButton('paper'),
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    textDecoration: 'none',
    fontSize: 16,
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
