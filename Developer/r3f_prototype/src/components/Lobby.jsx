// 로비(허브). 타이틀 "게임 시작" 게이트 통과 후 진입한다.
// 상단 sticky 상태바 + 스테이지 리스트 스크롤. 스테이지 선택·상점·랭킹·무기·설정 진입점.
//
// App.jsx가 주입할 prop 계약:
//   onStartStage(stageId)  — 스테이지 카드 "입장하기" → 게임 시작(App.startGame)
//   onOpenCoinShop()       — 코인상점 화면 진입
//   onOpenRanking(stageId?) — 랭킹 상세 화면 진입(stageId 있으면 해당 스테이지 보드, 없으면 글로벌)
// (설정/닉네임/무기 모달은 로비 내부에서 자체 처리 — App 배선 불필요)
import { useEffect, useMemo, useRef, useState } from 'react'
import { STAGE_CONFIGS, getStageConfig, isStageUnlocked } from '../lib/stageConfig.js'
import { load as loadPlayerRecords } from '../lib/playerRecords.js'
import { isFirebaseProgressHydrated } from '../lib/firebaseProgress.js'
import { formatSurvivalTime } from '../lib/userRanking.js'
import { getActiveSeason } from '../lib/firebaseRanking.js'
import { loadStageBossPreview, STAGE_BOSS_PREVIEW_EVENT } from '../lib/graphicsStudioConfig.js'
import { playSfx } from '../lib/sfxRegistry.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { stageTitle, t as translate, useT } from '../lib/i18n.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'
import WeaponModal from './WeaponModal.jsx'
import LobbySettingsModal from './LobbySettingsModal.jsx'
import StageBossPreview from './StageBossPreview.jsx'
import { StageLockPreview } from './StageLock.jsx'
import { preloadGameCanvasChunk } from './gameCanvasLoader.js'
import { preloadStageEntryAssets } from '../lib/stageEntryPreload.js'

const STAGE_UNLOCK_HINT_KEYS = {
  stage2: 'lobby.unlock.stage2',
  stage4: 'lobby.unlock.stage4',
}

// 카드 클릭 뒤 약 1초 동안 보스별 쇼타임을 보여준 뒤 해당 스테이지를 시작한다.
const STAGE_SHOWTIME_MS = 1000
const AMBIENT_DRIFT_INTERVAL_MS = 2400
const TOUCH_FEEDBACK_MS = 320

export const BOSS_SHOWTIME = Object.freeze({
  B01: { labelKey: 'lobby.showtime.B01', label: '돌진!', sounds: [{ id: 'bossRoar', volume: 0.9, rate: 0.9 }, { id: 'bossSpawn', volume: 0.62, delay: 170 }] },
  B02: { labelKey: 'lobby.showtime.B02', label: '선생님 스윙!', sounds: [{ id: 'zombieTankGroan', volume: 0.78, rate: 1.12 }, { id: 'zombieRangedShoot', volume: 0.52, delay: 210, rate: 0.9 }] },
  B03: { labelKey: 'lobby.showtime.B03', label: '근육 포즈!', sounds: [{ id: 'zombieChargeRoar', volume: 0.82, rate: 0.82 }, { id: 'zombieGiantThud', volume: 0.72, delay: 240, rate: 1.05 }] },
})

function lobbyMotionAllowed() {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  return !reduced && document.documentElement?.dataset?.reducedEffects !== 'true'
}

function nextAmbientPosition(random = Math.random) {
  return {
    x: Math.round((random() * 70 - 35) * 10) / 10,
    y: Math.round((random() * 70 - 35) * 10) / 10,
    scale: 1.08,
  }
}

function formatSeasonCountdown(season, nowMs = Date.now()) {
  if (!season.active) return translate('lobby.seasonPreparing')
  if (season.endsAt == null) return translate('lobby.seasonAlways')
  const remain = season.endsAt - nowMs
  if (remain <= 0) return translate('lobby.seasonEndingSoon')
  const days = Math.floor(remain / 86_400_000)
  const hours = Math.floor((remain % 86_400_000) / 3_600_000)
  if (days > 0) return translate('lobby.seasonEndsDays', { days, hours })
  const minutes = Math.floor((remain % 3_600_000) / 60_000)
  return translate('lobby.seasonEndsHours', { hours, minutes })
}

export default function Lobby({ onStartStage, onOpenCoinShop, onOpenRanking, onOpenMissionCenter, onLogoutToTitle, devAllStagesUnlocked = false }) {
  const t = useT()
  const authUser = useAuthStore((s) => s.user)
  const progressStatus = useAuthStore((s) => s.progressStatus)
  const goldTotal = useGameStore((s) => s.goldTotal)
  const [recordsRefreshVersion, setRecordsRefreshVersion] = useState(0)
  const [modal, setModal] = useState(null) // 'weapon' | 'settings' | null
  const [stageBossPreview, setStageBossPreview] = useState(() => loadStageBossPreview())
  const [showtimeStageId, setShowtimeStageId] = useState(null)
  const showtimeStageRef = useRef(null)
  const ambientDriftRef = useRef(null)
  const touchAmbientRef = useRef(null)
  const touchPulseRef = useRef(null)
  const touchAmbientTimerRef = useRef(null)
  const feedbackTimerRef = useRef(null)
  const feedbackButtonRef = useRef(null)

  const stageIds = useMemo(() => Object.keys(STAGE_CONFIGS), [])
  const season = useMemo(() => getActiveSeason(), [])

  useEffect(() => {
    const update = (event) => setStageBossPreview(event.detail ?? loadStageBossPreview())
    window.addEventListener(STAGE_BOSS_PREVIEW_EVENT, update)
    return () => window.removeEventListener(STAGE_BOSS_PREVIEW_EVENT, update)
  }, [])

  const records = useMemo(() => {
    if (progressStatus !== 'ready' || !isFirebaseProgressHydrated(authUser)) return null
    return loadPlayerRecords()
  }, [authUser?.uid, progressStatus, recordsRefreshVersion])

  // 배경 빛덩이는 터치/포인터 지점으로 서서히 따라간다(CSS transform transition으로 이징).
  // ref로 transform만 직접 갱신 → 리렌더 없음. transform은 GPU 컴포지터 처리라 무부하.
  useEffect(() => {
    if (!lobbyMotionAllowed()) return
    const timer = window.setInterval(() => {
      const ambient = ambientDriftRef.current
      if (!ambient) return
      const next = nextAmbientPosition()
      ambient.style.transform = `translate3d(${next.x}%, ${next.y}%, 0) scale(${next.scale})`
    }, AMBIENT_DRIFT_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => {
    window.clearTimeout(touchAmbientTimerRef.current)
    window.clearTimeout(feedbackTimerRef.current)
  }, [])

  // The title/lobby keeps no WebGL context alive.  Only warm the JS chunk while
  // idle; GPU upload/compile remains in the actual gameplay Canvas.
  useEffect(() => {
    const warm = () => { preloadGameCanvasChunk().catch(() => {}) }
    const idleId = window.requestIdleCallback?.(warm, { timeout: 900 })
    const timeoutId = idleId == null ? window.setTimeout(warm, 80) : 0
    return () => {
      if (idleId != null) window.cancelIdleCallback?.(idleId)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])

  const handleLobbyPointerDown = (event) => {
    if (!lobbyMotionAllowed()) return
    const x = event.clientX / window.innerWidth - 0.5
    const y = event.clientY / window.innerHeight - 0.5
    const touchAmbient = touchAmbientRef.current
    if (touchAmbient) {
      touchAmbient.style.opacity = '1'
      touchAmbient.style.transform = `translate3d(${Math.round(x * 45 * 10) / 10}%, ${Math.round(y * 45 * 10) / 10}%, 0) scale(1.1)`
      window.clearTimeout(touchAmbientTimerRef.current)
      touchAmbientTimerRef.current = window.setTimeout(() => {
        touchAmbient.style.opacity = '0'
      }, 620)
    }
    const pulse = touchPulseRef.current
    if (pulse) {
      pulse.style.left = `${Math.max(0, Math.min(100, (event.clientX / window.innerWidth) * 100))}%`
      pulse.style.top = `${Math.max(0, Math.min(100, (event.clientY / window.innerHeight) * 100))}%`
      pulse.classList.remove('lobby-touch-pulse-active')
      void pulse.offsetWidth
      pulse.classList.add('lobby-touch-pulse-active')
    }
    const button = event.target.closest?.('button')
    if (!button) return
    feedbackButtonRef.current?.classList.remove('lobby-touch-feedback')
    window.clearTimeout(feedbackTimerRef.current)
    feedbackButtonRef.current = button
    button.classList.add('lobby-touch-feedback')
    feedbackTimerRef.current = window.setTimeout(() => {
      button.classList.remove('lobby-touch-feedback')
      if (feedbackButtonRef.current === button) feedbackButtonRef.current = null
    }, TOUCH_FEEDBACK_MS)
  }

  // 로비 "생기(juice)"용 CSS 키프레임 + :active/게이트 규칙 주입. 최초 1회만.
  // 인라인 styles 객체에는 @keyframes·:active를 담을 수 없어 HUD.jsx와 동일한 idiom을 쓴다.
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'lobby-keyframes'
    style.textContent = `
      @keyframes lobbyCardEnter { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      @keyframes lobbyCtaPulse {
        0%,100%{filter:drop-shadow(0 0 2px rgba(89,199,255,0.35)) brightness(1)}
        50%{filter:drop-shadow(0 0 14px rgba(89,199,255,0.8)) brightness(1.16)}
      }
      @keyframes lobbyTouchPulse {
        from{opacity:0.8;transform:translate(-50%,-50%) scale(0.25)}
        to{opacity:0;transform:translate(-50%,-50%) scale(1)}
      }
      /* 눌림 마이크로 인터랙션(인라인으로 불가) */
      .lobby-press{ transition: transform 90ms ease, filter 180ms ease, box-shadow 180ms ease }
      .lobby-press:active{ transform: scale(0.96) }
      .lobby-press.lobby-touch-feedback{ filter:brightness(1.18);box-shadow:0 0 16px rgba(126,228,200,0.78) }
      .lobby-touch-pulse-active{ animation:lobbyTouchPulse 520ms ease-out both }
      /* 접근성/멀미 게이트: 모션 정지 */
      @media (prefers-reduced-motion: reduce){ .lobby-anim{ animation: none !important } }
      :root[data-reduced-effects] .lobby-anim{ animation: none !important }
    `
    // StrictMode 이중 마운트 안전: 항상 교체(remove → append).
    document.getElementById('lobby-keyframes')?.remove()
    document.head.appendChild(style)
    return () => { if (document.getElementById('lobby-keyframes') === style) style.remove() }
  }, [])

  // 설정/무기 모달을 닫을 때 최신 기록/코인 반영을 위해 기록을 다시 읽는다.
  const refreshRecords = () => {
    if (progressStatus !== 'ready' || !isFirebaseProgressHydrated(authUser)) return
    setRecordsRefreshVersion((version) => version + 1)
  }

  const closeModal = () => {
    setModal(null)
    refreshRecords()
  }

  const beginStageShowtime = (stageId) => {
    if (showtimeStageRef.current) return false
    showtimeStageRef.current = stageId
    setShowtimeStageId(stageId)
    return true
  }

  const finishStageShowtime = (stageId) => {
    if (showtimeStageRef.current !== stageId) return
    showtimeStageRef.current = null
    setShowtimeStageId(null)
  }

  return (
    <div style={styles.root} onPointerDown={handleLobbyPointerDown}>
      {/* 배경 앰비언트 드리프트(콘텐츠 뒤, 클릭 방해 없음) */}
      <div
        ref={ambientDriftRef}
        className="lobby-anim"
        data-testid="lobby-ambient-drift"
        style={styles.ambientDrift}
        aria-hidden="true"
      />
      <div ref={touchAmbientRef} data-testid="lobby-touch-ambient" style={styles.touchAmbient} aria-hidden="true" />
      <div ref={touchPulseRef} data-testid="lobby-touch-pulse" style={styles.touchPulse} aria-hidden="true" />

      {/* 상단 sticky 상태바 */}
      <header style={styles.statusBar}>
        <div style={styles.profileRow}>
          <div style={styles.profileBlock}>
            <span style={styles.profileEyebrow}>{t('lobby.player')}</span>
            <strong style={styles.profileName}>{authUser?.displayName?.trim() || authUser?.email?.trim() || ''}</strong>
          </div>
          <div style={styles.coinBadge}>
            <span style={styles.coinDot} />
            <strong style={styles.coinValue}>{goldTotal}</strong>
          </div>
          <button type="button" aria-label={t('lobby.openSettings')} style={styles.gearButton} onClick={() => !showtimeStageId && setModal('settings')}>
            ⚙
          </button>
        </div>

        <div style={styles.seasonStrip}>
          <div style={styles.seasonMainRow}>
            <span style={styles.seasonLabel}>{t('lobby.season')}</span>
            <span style={styles.seasonName}>{season.name}</span>
            <span style={styles.seasonCountdown}>{formatSeasonCountdown(season)}</span>
          </div>
        </div>

      </header>

      {/* 스테이지 리스트 */}
      <div style={styles.stageList} aria-label={t('lobby.stageListAria')}>
        {records ? stageIds.map((stageId, index) => {
          const stage = getStageConfig(stageId)
          const unlocked = devAllStagesUnlocked || isStageUnlocked(stageId, records)
          const bestSurvivalSec = records[stage.bestRecordKey] ?? 0
          const cleared = (records[stage.clearRecordKey] ?? 0) > 0
          return (
            <StageCard
              key={stageId}
              index={index}
              stageId={stageId}
              stage={stage}
              unlocked={unlocked}
              cleared={cleared}
              bestSurvivalSec={bestSurvivalSec}
              stageBossPreview={stageBossPreview}
              showtimeStageId={showtimeStageId}
              devAllStagesUnlocked={devAllStagesUnlocked}
              onBeginShowtime={beginStageShowtime}
              onFinishShowtime={finishStageShowtime}
              onStart={() => onStartStage?.(stageId)}
              onRanking={() => onOpenRanking?.(stageId)}
            />
          )
        }) : <div data-testid="lobby-records-pending" aria-busy="true" style={styles.recordsPending}>{t('loading.game')}</div>}
      </div>

      <nav aria-label={t('lobby.menuAria')} style={styles.bottomNav}>
        <button type="button" className="lobby-press" style={styles.bottomNavButton} onClick={() => !showtimeStageId && setModal('weapon')}>{t('lobby.weapons')}</button>
        <button type="button" className="lobby-press" style={styles.bottomNavButtonAccent} onClick={() => !showtimeStageId && onOpenRanking?.()}>{t('lobby.ranking')}</button>
        <button type="button" className="lobby-press" style={styles.bottomNavButtonReward} onClick={() => !showtimeStageId && onOpenCoinShop?.()}>{t('lobby.shop')}</button>
        <button type="button" className="lobby-press" style={styles.bottomNavButton} onClick={() => !showtimeStageId && onOpenMissionCenter?.()}>미션</button>
      </nav>

      {modal === 'weapon' && <WeaponModal onClose={closeModal} />}
      {/* onNicknameChange는 넘기지 않는다. 로비 이름은 authUser.displayName로 그리고(위 profileName),
          닉네임은 saveNicknameForUser가 Firebase 프로필에 직접 쓴다 — 로비가 들고 있을 상태가 없다.
          예전에 있던 setNickname 상태가 제거됐는데 이 prop만 남아 ReferenceError로 설정 화면이
          통째로 죽었다(2026-08-11 v40 실기기 재현). */}
      {modal === 'settings' && (
        <LobbySettingsModal onClose={closeModal} onLogoutToTitle={onLogoutToTitle} />
      )}
    </div>
  )
}

function showtimeLabel(translateFn, bossType) {
  const entry = BOSS_SHOWTIME[bossType] ?? BOSS_SHOWTIME.B01
  return translateFn(entry.labelKey, null, entry.label)
}

function StageCard({ index = 0, stageId, stage, unlocked, cleared, bestSurvivalSec, stageBossPreview, showtimeStageId, devAllStagesUnlocked = false, onBeginShowtime, onFinishShowtime, onStart, onRanking }) {
  const t = useT()
  const localizedStageTitle = stageTitle(stageId, stage.title)
  const [showtimeToken, setShowtimeToken] = useState(0)
  const [showtimeActive, setShowtimeActive] = useState(false)
  const startTimerRef = useRef(null)
  const soundTimerRefs = useRef([])
  const showtimePendingRef = useRef(false)
  const lobbyBossType = stage.lobbyBossType ?? stage.bossType
  const playable = stage.playable !== false || devAllStagesUnlocked
  const canStart = unlocked && playable

  useEffect(() => {
    return () => {
      if (startTimerRef.current) window.clearTimeout(startTimerRef.current)
      soundTimerRefs.current.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const queueStart = () => {
    if (!canStart || showtimePendingRef.current || !onBeginShowtime?.(stageId)) return
    preloadGameCanvasChunk().catch(() => {})
    preloadStageEntryAssets(stageId)
    showtimePendingRef.current = true
    setShowtimeActive(true)
    setShowtimeToken((token) => token + 1)
    const cues = BOSS_SHOWTIME[lobbyBossType]?.sounds ?? BOSS_SHOWTIME.B01.sounds
    cues.forEach(({ id, volume, delay = 0, rate = 1 }) => {
      if (delay) soundTimerRefs.current.push(window.setTimeout(() => playSfx(id, volume, { rate }), delay))
      else playSfx(id, volume, { rate })
    })
    if (startTimerRef.current) window.clearTimeout(startTimerRef.current)
    startTimerRef.current = window.setTimeout(() => {
      setShowtimeActive(false)
      onFinishShowtime?.(stageId)
      onStart?.()
    }, STAGE_SHOWTIME_MS)
  }

  const handleCardClick = (event) => {
    if (event.target.closest?.('button')) return
    queueStart()
  }

  return (
    <section
      className="lobby-anim"
      style={{
        ...styles.card,
        ...(unlocked ? null : styles.cardLocked),
        // 잠금 카드는 opacity:0.6 딤을 유지해야 하므로(fill:both가 1로 덮음) 해제 카드만 스태거.
        ...(unlocked
          ? {
              animation: 'lobbyCardEnter 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
              animationDelay: `${index * 70}ms`,
            }
          : null),
      }}
      aria-label={`${stage.label} ${localizedStageTitle}`}
      onClick={handleCardClick}
      onPointerEnter={() => preloadStageEntryAssets(stageId)}
      onFocus={() => preloadStageEntryAssets(stageId)}
    >
      {unlocked ? (
        <div style={styles.previewStack} data-testid="stage-card-preview-row">
          <StageBossPreview framing={stageBossPreview} bossType={lobbyBossType} motionToken={showtimeToken} reactOnTap={false} ariaLabel={t('lobby.bossPreviewAria', { stage: stageId })} style={styles.cardBossPreview} />
          {showtimeActive ? <span data-testid="stage-card-showtime" style={styles.showtimeLabel}>{showtimeLabel(t, lobbyBossType)}</span> : null}
          {cleared ? <span style={styles.previewClearBadge}>{t('lobby.cleared')}</span> : null}
          <div style={styles.previewTextLayer} data-testid="stage-card-preview-overlay">
            <div style={{ ...styles.cardTitleRow, ...styles.previewTitleRow }}>
              <span style={styles.previewTitle}>
                <span>{stage.label}</span>
                <span>{localizedStageTitle}</span>
              </span>
            </div>
            <div style={styles.previewBest}>
              {t('lobby.bestRecord', { value: bestSurvivalSec > 0 ? formatSurvivalTime(bestSurvivalSec) : t('lobby.noRecord') })}
            </div>
          </div>
          {playable ? (
            <>
              <button
                type="button"
                className="lobby-press lobby-anim"
                style={{ ...styles.previewEnterButton, animation: 'lobbyCtaPulse 1600ms ease-in-out infinite' }}
                onClick={(event) => {
                  event.stopPropagation()
                  queueStart()
                }}
              >{t('lobby.enter')}</button>
              <button type="button" className="lobby-press" style={styles.rankingButton} onClick={(event) => {
                event.stopPropagation()
                if (!showtimeStageId) onRanking()
              }}>{t('lobby.scoreRecord')}</button>
            </>
          ) : (
            <>
              <button
                type="button"
                style={{ ...styles.previewEnterButton, ...styles.previewDisabledButton }}
                disabled
                onClick={(event) => event.stopPropagation()}
              >{t('lobby.comingSoon')}</button>
              <button
                type="button"
                style={{ ...styles.rankingButton, ...styles.previewDisabledButton }}
                disabled
                onClick={(event) => event.stopPropagation()}
              >{t('lobby.scoreRecord')}</button>
            </>
          )}
        </div>
      ) : (
        <div style={styles.previewStack} data-testid="stage-card-preview-row">
          <StageLockPreview
            ariaLabel={t('lobby.lockPreviewAria', { stage: stageId })}
            style={styles.cardBossPreview}
          />
          {cleared ? <span style={styles.previewClearBadge}>{t('lobby.cleared')}</span> : null}
          <div style={styles.previewTextLayer} data-testid="stage-card-preview-overlay">
            <div style={{ ...styles.cardTitleRow, ...styles.previewTitleRow }}>
              <span style={styles.previewTitle}>
                <span>{stage.label}</span>
                <span>{localizedStageTitle}</span>
              </span>
            </div>
            <div style={styles.previewBest}>
              {t('lobby.bestRecord', { value: bestSurvivalSec > 0 ? formatSurvivalTime(bestSurvivalSec) : t('lobby.noRecord') })}
            </div>
          </div>
          <button
            type="button"
            style={{ ...styles.previewEnterButton, ...styles.previewDisabledButton, ...styles.lockedHintEntryButton }}
            disabled
            onClick={(event) => event.stopPropagation()}
          >{t(STAGE_UNLOCK_HINT_KEYS[stageId] ?? 'lobby.lockedDefault')}</button>
          <button
            type="button"
            style={{ ...styles.rankingButton, ...styles.previewDisabledButton }}
            disabled
            onClick={(event) => event.stopPropagation()}
          >{t('lobby.scoreRecord')}</button>
        </div>
      )}
    </section>
  )
}

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #18372f 0%, #131018 62%, #151019 100%)',
    color: uiPalette.paperLight,
    fontFamily: uiType.family,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  ambientDrift: {
    position: 'absolute',
    inset: '-15%',
    zIndex: 0,
    pointerEvents: 'none',
    background:
      'radial-gradient(34% 55% at 28% 7%, rgba(126,228,200,0.6) 0%, rgba(126,228,200,0) 60%),' +
      'radial-gradient(36% 55% at 72% 95%, rgba(89,199,255,0.55) 0%, rgba(89,199,255,0) 60%)',
    transition: `transform ${AMBIENT_DRIFT_INTERVAL_MS}ms ease-in-out`,
    transform: 'translate3d(0%, 0%, 0) scale(1.08)',
    willChange: 'transform',
  },
  touchAmbient: {
    position: 'absolute',
    inset: '-15%',
    zIndex: 0,
    pointerEvents: 'none',
    opacity: 0,
    background: 'radial-gradient(30% 44% at 50% 50%, rgba(236,255,191,0.32) 0%, rgba(126,228,200,0) 70%)',
    transform: 'translate3d(0%, 0%, 0) scale(1.1)',
    transition: 'opacity 620ms ease-out, transform 900ms ease-out',
    willChange: 'opacity, transform',
  },
  touchPulse: {
    position: 'absolute',
    zIndex: 4,
    width: 180,
    height: 180,
    left: '50%',
    top: '50%',
    border: '2px solid rgba(236,255,191,0.72)',
    borderRadius: '50%',
    boxShadow: '0 0 24px rgba(126,228,200,0.55)',
    opacity: 0,
    pointerEvents: 'none',
  },
  statusBar: {
    position: 'sticky',
    top: 0,
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 'max(12px, calc(env(safe-area-inset-top, 0px) + 10px)) 12px 10px',
    background: 'rgba(16,40,32,0.96)',
    borderBottom: uiBorders.strong,
    boxShadow: uiShadows.pressSmall,
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  profileBlock: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  profileEyebrow: {
    color: uiPalette.reward,
    fontSize: 10,
    lineHeight: 1,
    fontWeight: uiType.weightStrong,
  },
  profileName: {
    minWidth: 0,
    overflow: 'hidden',
    fontSize: 19,
    lineHeight: 1.1,
    fontWeight: uiType.weightHeavy,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textShadow: `0 2px 0 ${uiPalette.ink}`,
  },
  coinBadge: {
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 11px',
    border: uiBorders.strong,
    borderRadius: 999,
    background: uiPalette.reward,
    color: uiPalette.ink,
    boxShadow: uiShadows.pressSmall,
  },
  coinDot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #fff5b0 0%, #ffd23c 55%, #aa7000 100%)',
    border: `1.5px solid ${uiPalette.ink}`,
    flexShrink: 0,
  },
  coinValue: {
    fontFamily: uiType.numeric,
    fontSize: 16,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
  },
  gearButton: {
    flex: '0 0 auto',
    width: 44,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.paperLight,
    color: uiPalette.ink,
    fontSize: 20,
    fontWeight: uiType.weightStrong,
    cursor: 'pointer',
    boxShadow: uiShadows.pressSmall,
  },
  seasonStrip: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '7px 10px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.cta,
    color: uiPalette.ink,
    boxShadow: uiShadows.pressSmall,
  },
  seasonMainRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  seasonLabel: {
    flex: '0 0 auto',
    padding: '2px 7px',
    border: uiBorders.strong,
    borderRadius: 999,
    background: uiPalette.ink,
    color: uiPalette.reward,
    fontSize: 10,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
  },
  seasonName: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    fontSize: 13,
    lineHeight: 1.1,
    fontWeight: uiType.weightHeavy,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  seasonCountdown: {
    flex: '0 0 auto',
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 900,
    color: 'rgba(5,2,9,0.72)',
  },
  stageList: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '12px 12px max(16px, calc(env(safe-area-inset-bottom, 0px) + 12px))',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  recordsPending: {
    minHeight: 120,
    display: 'grid',
    placeItems: 'center',
    color: uiPalette.paperLight,
    fontWeight: uiType.weightStrong,
  },
  bottomNav: {
    position: 'relative',
    zIndex: 1,
    flex: '0 0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 7,
    padding: '8px 10px max(10px, calc(env(safe-area-inset-bottom, 0px) + 8px))',
    borderTop: uiBorders.strong,
    background: 'rgba(16,40,32,0.97)',
    boxShadow: '0 -3px 0 #050209',
    boxSizing: 'border-box',
  },
  bottomNavButton: {
    ...schoolButton('paper'),
    minWidth: 0,
    minHeight: 48,
    padding: '0 4px',
    fontSize: 13,
    lineHeight: 1,
    boxShadow: uiShadows.pressSmall,
  },
  bottomNavButtonAccent: {
    ...schoolButton('primary'),
    minWidth: 0,
    minHeight: 48,
    padding: '0 4px',
    fontSize: 13,
    lineHeight: 1,
    boxShadow: uiShadows.pressSmall,
  },
  bottomNavButtonReward: {
    ...schoolButton('reward'),
    minWidth: 0,
    minHeight: 48,
    padding: '0 4px',
    fontSize: 13,
    lineHeight: 1,
    boxShadow: uiShadows.pressSmall,
  },
  card: {
    ...schoolPanel('paper'),
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 5,
    boxSizing: 'border-box',
  },
  cardLocked: {
    opacity: 0.6,
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  previewStack: {
    position: 'relative',
    minWidth: 0,
  },
  cardBossPreview: {
    height: 144,
  },
  cardHead: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  cardHeadFull: {
    flex: 1,
  },
  previewTextLayer: {
    position: 'absolute',
    top: 9,
    left: 10,
    right: 10,
    zIndex: 2,
    pointerEvents: 'none',
    textAlign: 'right',
  },
  previewClearBadge: {
    position: 'absolute',
    top: 9,
    left: 10,
    zIndex: 3,
    padding: '2px 8px',
    border: uiBorders.strong,
    borderRadius: 999,
    background: uiPalette.infection,
    color: uiPalette.ink,
    fontSize: 10,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
  },
  showtimeLabel: {
    position: 'absolute',
    right: 10,
    bottom: 58,
    zIndex: 4,
    padding: '4px 8px',
    border: uiBorders.strong,
    borderRadius: 999,
    background: uiPalette.infection,
    color: uiPalette.paperLight,
    fontSize: 12,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    textShadow: `0 2px 0 ${uiPalette.ink}`,
  },
  previewEnterButton: {
    ...schoolButton('primary'),
    position: 'absolute',
    right: 10,
    bottom: 10,
    zIndex: 3,
    minWidth: 132,
    minHeight: 44,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  previewTitleRow: {
    justifyContent: 'flex-end',
  },
  cardTitle: {
    minWidth: 0,
    display: 'grid',
    gap: 2,
    color: uiPalette.ink,
    fontSize: 18,
    lineHeight: 1.15,
    fontWeight: uiType.weightHeavy,
  },
  previewTitle: {
    minWidth: 0,
    display: 'grid',
    gap: 2,
    color: uiPalette.paperLight,
    fontSize: 19,
    lineHeight: 1.15,
    fontWeight: uiType.weightHeavy,
    textShadow: `0 2px 0 ${uiPalette.ink}, 2px 0 0 ${uiPalette.ink}, -2px 0 0 ${uiPalette.ink}`,
  },
  tagCleared: {
    flex: '0 0 auto',
    padding: '2px 8px',
    border: uiBorders.strong,
    borderRadius: 999,
    background: uiPalette.infection,
    color: uiPalette.ink,
    fontSize: 10,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
  },
  tagUncleared: {
    flex: '0 0 auto',
    padding: '2px 8px',
    border: uiBorders.hairline,
    borderRadius: 999,
    background: 'rgba(5,2,9,0.08)',
    color: 'rgba(5,2,9,0.6)',
    fontSize: 10,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
  },
  cardBest: {
    color: '#493f4d',
    fontSize: 12,
    lineHeight: 1.2,
    fontWeight: 800,
  },
  previewBest: {
    marginTop: 5,
    color: uiPalette.paperLight,
    fontSize: 12,
    lineHeight: 1.2,
    fontWeight: 900,
    textShadow: `0 2px 0 ${uiPalette.ink}, 1px 0 0 ${uiPalette.ink}, -1px 0 0 ${uiPalette.ink}`,
  },
  rankingButton: {
    ...schoolButton('paper'),
    position: 'absolute',
    top: 34,
    left: 10,
    zIndex: 3,
    width: 74,
    minWidth: 74,
    minHeight: 44,
    padding: '0 6px',
    fontSize: 10,
    lineHeight: 1.05,
  },
  previewDisabledButton: {
    background: '#9aa0a6',
    color: '#31363f',
    cursor: 'not-allowed',
    animation: 'none',
    opacity: 0.92,
    filter: 'none',
  },
  lockedHintEntryButton: {
    padding: '0 8px',
    fontSize: 11,
    lineHeight: 1.12,
    letterSpacing: 0,
    whiteSpace: 'normal',
  },
  lockHint: {
    padding: '9px 11px',
    border: uiBorders.hairline,
    borderRadius: 8,
    background: 'rgba(24,55,47,0.14)',
    color: '#493f4d',
    fontSize: 12,
    lineHeight: 1.3,
    fontWeight: 800,
    textAlign: 'center',
  },
}
