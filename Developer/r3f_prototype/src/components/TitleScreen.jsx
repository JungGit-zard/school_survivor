import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import GoogleAccountPanel from './GoogleAccountPanel.jsx'
import TitleMoreSheet from './TitleMoreSheet.jsx'
import TitleSceneCanvas from './TitleSceneCanvas.jsx'
import TitleBackdrop from './TitleBackdrop.jsx'
import { isFirebaseProgressHydrated, requestCloudProgressSave } from '../lib/firebaseProgress.js'
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
import { paperSticker, schoolButton, schoolPanel, sunnyCta, sunnyPalette, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { LOCALE_OPTIONS, useLocale, useT } from '../lib/i18n.js'
import { useAuthStore } from '../store/useAuthStore.js'
import {
  clearPendingStartAfterLogin,
  consumePendingStartAfterLogin,
} from '../lib/loginContinuation.js'
import { acquireStreamingBgm } from '../lib/streamingBgm.js'
import { TITLE_BGM_URL as titleBgmUrl } from '../lib/titleBgm.js'
import { SlteraInstantSpawnToggle, SlteraMasterTitleToggle } from './SlteraInstantSpawn.jsx'

const REVEAL_CHEATS_CODE = ['arrowup', 'arrowdown', 'arrowup', 'arrowdown', 'a', 's', 'd']
const DEV_CHEATS_ENABLED = import.meta.env.DEV
const P = sunnyPalette

// 2026-11-03 타이틀 Stage 1(Terry "밝고 예쁘게, AI 티 안 나게"): 글자가 사방에서 날아드는 슬램 대신
// 칠판에 분필로 왼쪽부터 쓰듯 읽는 순서대로 나타난다(전체 약 0.8초). 이모지는 쓰지 않는다.
// 글자마다 살짝 다른 기울기·높이로 손글씨처럼 고르지 않게 둔다(결정적 값 — 매번 같은 모양).
const TITLE_LETTER_JITTER = [
  { rotate: -3, lift: 0 },
  { rotate: 2, lift: -1 },
  { rotate: -1, lift: 1 },
  { rotate: 3, lift: 0 },
  { rotate: -2, lift: 1 },
  { rotate: 1, lift: -1 },
]
const TITLE_WRITE_SPAN_MS = 640
const TITLE_LETTER_WRITE_MS = 150

function buildTitleLetters(word, startOrder) {
  return Array.from(word, (char, index) => ({
    // 띄어쓰기는 NBSP로 — inline-block 글자 안의 일반 공백은 0폭으로 접힌다.
    char: char === ' ' ? '\u00a0' : char,
    order: startOrder + index,
    ...TITLE_LETTER_JITTER[(startOrder + index) % TITLE_LETTER_JITTER.length],
  }))
}

function getTitleWords(translate) {
  const accent = buildTitleLetters(translate('title.wordAccent'), 0)
  const school = buildTitleLetters(translate('title.wordSchool'), accent.length)
  return { accent, school }
}

// 제목 글자 크기는 게임 프레임(=TitleScreen 루트, container-type) 폭 기준이다. 로케일 문자열의 vw는
// 창 폭이라, 짧은 가로 화면(915x412 → 프레임 232px)에서 "MBIE SCHOO"처럼 잘렸다(2026-11-03).
// 가장 긴 줄의 대략적 em 폭으로 프레임 안에 들어가는 상한을 함께 건다.
// 여백 = 좌우 content 22px*2 + 칠판 안쪽 여백 12px*2 + 테두리 3px*2 + 여유 6px.
const TITLE_SIDE_GUTTER_PX = 80
function estimateTitleLineEm(letters) {
  let em = 0
  for (const { char } of letters) {
    if (char === ' ') em += 0.3
    else if (/[　-鿿가-힯＀-￯]/.test(char)) em += 1
    else em += 0.74
  }
  return em
}

export function fitTitleFontSize(base, words) {
  if (!/\d/.test(String(base))) return base
  const frameBase = String(base).replace(/(\d)vw\b/g, '$1cqw')
  const lineEm = Math.max(estimateTitleLineEm(words.accent), estimateTitleLineEm(words.school))
  return `min(${frameBase}, calc((100cqw - ${TITLE_SIDE_GUTTER_PX}px) / ${lineEm.toFixed(2)}))`
}

// 짧은 가로 화면(높이 390)에서는 높이로도 상한을 걸어 칠판이 START 이름표까지 내려오지 않게 한다.
function titleHeadingFontSize(base, words) {
  const fit = fitTitleFontSize(base, words)
  return /\d/.test(String(fit)) ? `min(${fit}, 6.6vh)` : fit
}

export function titleLetterDelayMs(order, total) {
  return 60 + Math.round((order * TITLE_WRITE_SPAN_MS) / Math.max(1, total))
}

const TITLE_INTRO_CSS = `
  @keyframes titleChalkWrite {
    0% { opacity: 0; clip-path: inset(0 100% 0 0); }
    35% { opacity: 1; }
    100% { opacity: 1; clip-path: inset(0 0 0 0); }
  }
  @keyframes titleChalkUnderline {
    from { stroke-dashoffset: 1; }
    to { stroke-dashoffset: 0; }
  }
  @keyframes titleSceneGather {
    0% { opacity: 0; transform: translate3d(0, 105vh, 0); }
    72% { opacity: 1; transform: translate3d(0, -2vh, 0); }
    100% { opacity: 1; transform: translate3d(0, 0, 0); }
  }
  .title-intro-letter { animation: titleChalkWrite ${TITLE_LETTER_WRITE_MS}ms cubic-bezier(.3,.7,.4,1) backwards; }
  .title-chalk-underline path { stroke-dasharray: 1; animation: titleChalkUnderline 220ms ease-out 760ms backwards; }
  .title-intro-scene { animation: titleSceneGather 425ms cubic-bezier(.16,.84,.28,1.04) backwards; }
  .title-start-tag { transform: rotate(-1.6deg); transition: transform 90ms ease-out, box-shadow 90ms ease-out; }
  .title-start-tag::after { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 12px; background: ${P.red}; border-right: 2.5px solid ${P.line}; border-radius: 3px 0 0 3px; }
  .title-start-tag:hover:not(:disabled) { transform: rotate(-1.6deg) translate3d(0, -1px, 0); }
  .title-start-tag:active:not(:disabled) { transform: rotate(-1.6deg) translate3d(2px, 4px, 0); box-shadow: 1px 1px 0 ${P.line}; }
  .title-sticker:active { transform: translate3d(1px, 2px, 0) !important; box-shadow: 0 1px 0 ${P.line} !important; }
  .title-main-action:focus-visible, .title-language-action:focus-visible, .title-util-action:focus-visible { outline: 3px solid ${P.line}; outline-offset: 3px; }
  @media (max-height: 480px) {
    .title-content .title-subtitle { display: none; }
    .title-content [data-title-board] { padding: 8px 12px 9px !important; }
    .title-chalk-underline { display: none !important; }
    .title-start-tag { min-height: 48px !important; height: 48px !important; font-size: 18px !important; letter-spacing: 0 !important; white-space: nowrap; padding: 0 10px 0 22px !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .title-intro-letter, .title-intro-scene, .title-chalk-underline path { animation: none; }
    .title-start-tag, .title-sticker { transition: none; }
  }
`

function TitleLetter({ config, total }) {
  return (
    <span
      aria-hidden="true"
      className="title-intro-letter"
      data-title-char={config.char}
      style={{
        ...styles.titleLetter,
        transform: `translateY(${config.lift}px) rotate(${config.rotate}deg)`,
        animationDelay: `${titleLetterDelayMs(config.order, total)}ms`,
      }}
    >
      {config.char}
    </span>
  )
}

// 분필 질감: 글자 가장자리를 1px 남짓 흔들고 군데군데 가루가 빠진 듯 알파를 깎는다.
function ChalkFilterDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <filter id="title-chalk-texture" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.1" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.5 0 0 0 1.55" result="speckle" />
        <feComposite in="rough" in2="speckle" operator="in" />
      </filter>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <path d="M3 5 H17 M3 10 H17 M3 15 H17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10" cy="10" r="7.6" />
        <path d="M2.6 10 H17.4 M10 2.4 C6.6 6 6.6 14 10 17.6 M10 2.4 C13.4 6 13.4 14 10 17.6" />
      </g>
    </svg>
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
  onStart,
  devCheatsVisible = false,
  onRevealDevCheats,
  onUnlockAllStages,
}) {
  const t = useT()
  const locale = useLocale()
  const [cheatOpen, setCheatOpen] = useState(false)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreButtonRef = useRef(null)
  const authUser = useAuthStore((s) => s.user)
  const authSigningIn = useAuthStore((s) => s.signingIn)
  const signOutOfGoogle = useAuthStore((s) => s.signOutOfGoogle)
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
  const titleWords = getTitleWords(t)
  const titleLetterTotal = titleWords.accent.length + titleWords.school.length
  const mainActionBusy = !authUser?.uid && authSigningIn
  const mainActionStyle = mainActionBusy
    ? { ...styles.primaryButton, ...styles.mainActionButton, ...styles.mainActionButtonBusy }
    : { ...styles.primaryButton, ...styles.mainActionButton }
  const currentLocaleLabel = (LOCALE_OPTIONS.find((option) => option.id === (locale || 'ko')) || LOCALE_OPTIONS[0]).label

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
    if (!cheatOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setCheatOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cheatOpen])

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

  const enterLobbyFromStart = () => {
    clearPendingStartAfterLogin()
    onEnterLobby?.()
  }

  useEffect(() => {
    if (!authUser?.uid) return
    if (!consumePendingStartAfterLogin()) return
    setCheatOpen(false)
    setMoreOpen(false)
    enterLobbyFromStart()
  }, [authUser?.uid])

  // 게임 시작: Google 로그인은 계정 패널에서만 띄운다. 어디로 갈지(첫 플레이어는 Stage 1 바로 진입,
  // 돌아온 플레이어는 로비)는 onStart를 준 부모(ReadyGameApp)가 정한다. 없으면 로비로.
  // 패널에서 로그인 진행 중(mainActionBusy)에는 중복 진입을 막는다.
  const handleStartClick = () => {
    if (mainActionBusy) return
    setCheatOpen(false)
    setMoreOpen(false)
    if (onStart) {
      clearPendingStartAfterLogin()
      onStart()
      return
    }
    enterLobbyFromStart()
  }

  // ≡ 시트를 닫으면 포커스를 ≡ 버튼으로 돌려 준다(키보드·스크린리더 사용자가 위치를 잃지 않게).
  const closeMore = useCallback(() => {
    setMoreOpen(false)
    moreButtonRef.current?.focus()
  }, [])

  const handleSignOut = () => {
    Promise.resolve(signOutOfGoogle?.()).catch(() => {})
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
      <ChalkFilterDefs />
      <TitleBackdrop />
      <TitleSceneCanvas
        className="title-intro-scene"
        style={{ ...styles.canvas, animationDelay: '1500ms' }}
      />

      {/* 상단 줄(2026-11-08 타이틀 정리 1단계): 왼쪽 로그인/계정 칩, 오른쪽 [🌐][≡]. 높이 44px 한 줄, 기울기 0°.
          문의하기·홈페이지는 ≡ 시트로 옮겼다. 포커스 순서: 로그인 → 🌐 → ≡ → START. */}
      <div data-title-topbar style={cheatMenuButtonVisible ? { ...styles.topBar, ...styles.topBarBesideCheat } : styles.topBar}>
        <GoogleAccountPanel compact />
        <div style={styles.topBarRight}>
          <div
            data-title-language
            onKeyDown={(event) => { if (event.key === 'Escape') setLanguageMenuOpen(false) }}
            style={styles.languageAnchor}
          >
            <button
              type="button"
              className="title-language-action title-sticker"
              aria-label={t('title.languageCurrent', { language: currentLocaleLabel })}
              aria-haspopup="true"
              aria-expanded={languageMenuOpen}
              style={styles.utilButton}
              onClick={() => setLanguageMenuOpen((open) => !open)}
            >
              <GlobeIcon />
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
          <button
            ref={moreButtonRef}
            type="button"
            className="title-util-action title-sticker"
            data-title-more-button
            aria-label={t('title.more')}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls={moreOpen ? 'title-more-sheet' : undefined}
            style={styles.utilButton}
            onClick={() => { setLanguageMenuOpen(false); setMoreOpen(true) }}
          >
            <MenuIcon />
          </button>
        </div>
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
      <SlteraMasterTitleToggle />
      <div className="title-content" style={styles.content}>
        <div data-title-board style={styles.board}>
          <h1 aria-label={t('title.serviceName')} style={{ ...styles.title, fontSize: titleHeadingFontSize(t('title.fontSize'), titleWords) }}>
            <span style={{ ...styles.titleAccent, ...styles.titleWord }}>
              {titleWords.accent.map((config) => (
                <TitleLetter key={`${config.char}-${config.order}`} config={config} total={titleLetterTotal} />
              ))}
            </span>
            <span style={styles.titleWord}>
              {titleWords.school.map((config) => (
                <TitleLetter key={`${config.char}-${config.order}`} config={config} total={titleLetterTotal} />
              ))}
            </span>
          </h1>
          <svg className="title-chalk-underline" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true" focusable="false" style={styles.underline}>
            <path d="M3 6 C40 2 78 8 116 4 C146 1 172 7 197 4" pathLength="1" fill="none" stroke={P.orange} strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="title-subtitle" style={styles.subtitle}>{t('title.subtitle')}</p>
        </div>
      </div>

      <div style={styles.actions}>
        <div className="title-main-stack" style={styles.mainActionStack}>
          <button
            type="button"
            className="title-main-action title-start-tag"
            style={mainActionStyle}
            disabled={mainActionBusy}
            aria-busy={mainActionBusy ? 'true' : undefined}
            onClick={handleStartClick}
          >
            {mainActionBusy ? t('account.signingIn') : t('title.start')}
          </button>
        </div>
      </div>

      {moreOpen && (
        <TitleMoreSheet
          locale={locale}
          onClose={closeMore}
          signedIn={Boolean(authUser?.uid)}
          onSignOut={handleSignOut}
        />
      )}

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
              <SlteraInstantSpawnToggle style={styles.cheatButton} />
            </div>
          </section>
        </div>
      )}

    </div>
  )
}

function normalizeRevealCheatKey(key) {
  if (key === 'ArrowUp') return 'arrowup'
  if (key === 'ArrowDown') return 'arrowdown'
  if (typeof key !== 'string' || key.length !== 1) return null
  const lower = key.toLowerCase()
  return lower >= 'a' && lower <= 'z' ? lower : null
}

const styles = {
  // 상단 줄: 한 높이(44px), 좌우 안전 영역 + 8px, 요소 간격 8px(2026-11-08 타이틀 정리 1단계).
  topBar: {
    position: 'absolute',
    top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 8px))',
    left: 'max(12px, calc(env(safe-area-inset-left, 0px) + 8px))',
    right: 'max(12px, calc(env(safe-area-inset-right, 0px) + 8px))',
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    zIndex: 4,
    pointerEvents: 'none',
  },
  // 개발 빌드에서 치트 버튼(우상단 52px, 위치 그대로)이 보이면 상단 줄 오른쪽 끝을 그 옆으로 비켜 둔다.
  topBarBesideCheat: {
    right: 'max(72px, calc(env(safe-area-inset-right, 0px) + 68px))',
  },
  topBarRight: {
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'auto',
  },
  languageAnchor: {
    position: 'relative',
    zIndex: 4,
  },
  // 지구본·≡ 공용: 정확히 44x44, 아이콘 18px, 기울기 0°.
  utilButton: {
    ...paperSticker(0),
    position: 'relative',
    zIndex: 1,
    width: 44,
    height: 44,
    padding: 0,
    boxSizing: 'border-box',
    display: 'grid',
    placeItems: 'center',
    fontFamily: uiType.family,
    lineHeight: 1,
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
    border: `2px solid ${P.line}`,
    borderRadius: 6,
    background: P.cream,
    boxShadow: `3px 4px 0 ${P.line}`,
  },
  languageOption: (active) => ({
    ...paperSticker(0),
    background: active ? P.chalkboard : P.cream,
    color: active ? P.cream : P.line,
    boxShadow: 'none',
    width: '100%',
    minHeight: 44,
    padding: '6px 8px',
    boxSizing: 'border-box',
    fontFamily: uiType.family,
    fontSize: 15,
    lineHeight: 1.1,
  }),
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    // 제목 글자 크기(cqw)의 기준 — 창이 아니라 게임 프레임 폭.
    containerType: 'inline-size',
    background: P.sky,
    fontFamily: uiType.family,
  },
  // 캔버스는 투명 — 뒤의 TitleBackdrop(하늘·학교·운동장)이 비친다.
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    background: 'transparent',
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
    // 상단 줄(44px) 아래 12px에서 시작한다 — 칠판 아래로 3D 보스 얼굴이 보이게 위로 붙인다.
    top: 'calc(max(12px, calc(env(safe-area-inset-top, 0px) + 8px)) + 56px)',
    left: 24,
    right: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    pointerEvents: 'none',
    zIndex: 2,
  },
  board: {
    position: 'relative',
    maxWidth: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '13px 12px 11px',
    border: `3px solid ${P.line}`,
    borderRadius: 8,
    background: P.chalkboard,
    boxShadow: `3px 5px 0 ${P.line}`,
    transform: 'rotate(-1.2deg)',
  },
  underline: {
    display: 'block',
    width: '62%',
    height: 8,
    marginTop: 1,
    overflow: 'visible',
  },
  title: {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    color: P.cream,
    fontSize: 'clamp(46.8px, 14.04vw, 65px)',
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 0,
    WebkitTextFillColor: P.cream,
    // 번짐·네온 없음. 분필 가루가 아래로 살짝 밀린 정도의 납작한 그림자.
    textShadow: '0 1px 0 rgba(31,58,48,0.55)',
    filter: 'url(#title-chalk-texture)',
  },
  titleAccent: {
    color: P.orange,
    WebkitTextFillColor: P.orange,
  },
  titleWord: {
    display: 'inline-flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
  },
  titleLetter: {
    display: 'inline-block',
    transformOrigin: '50% 80%',
  },
  subtitle: {
    color: P.cream,
    fontSize: 14,
    lineHeight: 1.35,
    fontWeight: uiType.weightStrong,
    letterSpacing: 0,
    maxWidth: 300,
    textWrap: 'balance',
    wordBreak: 'keep-all',
    margin: '3px 0 2px',
  },
  // START 아래에는 아무것도 두지 않는다(홈페이지 링크 오탭 문제 제거).
  actions: {
    position: 'absolute',
    left: 'max(24px, calc(env(safe-area-inset-left, 0px) + 16px))',
    right: 'max(24px, calc(env(safe-area-inset-right, 0px) + 16px))',
    bottom: 'max(28px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 3,
  },
  mainActionStack: {
    width: 'min(280px, 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'auto',
  },
  // 출석부 이름표: 화면에서 유일한 오렌지 채움 버튼 + 왼쪽 빨간 띠(::after). 기울기·눌림은 .title-start-tag CSS.
  mainActionButton: {
    position: 'relative',
    width: '100%',
    minWidth: 180,
    padding: '0 14px 0 26px',
  },
  mainActionButtonBusy: {
    cursor: 'wait',
    opacity: 0.76,
    filter: 'saturate(0.78)',
  },
  primaryButton: {
    ...sunnyCta(),
    height: 64,
    minHeight: 64,
    fontFamily: uiType.family,
    fontSize: 22,
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
  cheatModal: {
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
}
