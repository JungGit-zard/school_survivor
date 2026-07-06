// 로비(허브). 타이틀 "게임 시작" 게이트 통과 후 진입한다.
// 상단 sticky 상태바 + 스테이지 리스트 스크롤. 스테이지 선택·상점·랭킹·능력치·무기·설정 진입점.
//
// App.jsx가 주입할 prop 계약:
//   onStartStage(stageId)  — 스테이지 카드 "입장하기" → 게임 시작(App.startGame)
//   onOpenCoinShop()       — 코인상점 화면 진입
//   onOpenRanking(stageId?) — 랭킹 상세 화면 진입(stageId 있으면 해당 스테이지 보드, 없으면 글로벌)
// (설정/닉네임/능력치/무기 모달은 로비 내부에서 자체 처리 — App 배선 불필요)
import { useEffect, useMemo, useRef, useState } from 'react'
import { STAGE_CONFIGS, getStageConfig, isStageUnlocked } from '../lib/stageConfig.js'
import { load as loadPlayerRecords } from '../lib/playerRecords.js'
import { formatSurvivalTime } from '../lib/userRanking.js'
import { getSavedNickname } from '../lib/userNickname.js'
import { getActiveSeason } from '../lib/firebaseRanking.js'
import { loadStageBossPreview, STAGE_BOSS_PREVIEW_EVENT } from '../lib/graphicsStudioConfig.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'
import AbilityModal from './AbilityModal.jsx'
import WeaponModal from './WeaponModal.jsx'
import LobbySettingsModal from './LobbySettingsModal.jsx'
import StageBossPreview from './StageBossPreview.jsx'

const STAGE_UNLOCK_HINT = {
  stage2: 'Stage 1 클리어 시 열림',
}

const STAGE_ENTRY_MOTION_MS = 360

function randomAmbientPosition() {
  return {
    x: Math.round((Math.random() * 70 - 35) * 10) / 10,
    y: Math.round((Math.random() * 70 - 35) * 10) / 10,
    scale: Math.round((1.04 + Math.random() * 0.16) * 100) / 100,
  }
}

function lobbyMotionAllowed() {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  return !reduced && document.documentElement?.dataset?.reducedEffects !== 'true'
}

function formatSeasonCountdown(season, nowMs = Date.now()) {
  if (!season.active) return '시즌 준비중'
  if (season.endsAt == null) return '상시 진행 중'
  const remain = season.endsAt - nowMs
  if (remain <= 0) return '곧 종료'
  const days = Math.floor(remain / 86_400_000)
  const hours = Math.floor((remain % 86_400_000) / 3_600_000)
  if (days > 0) return `종료까지 ${days}일 ${hours}시간`
  const minutes = Math.floor((remain % 3_600_000) / 60_000)
  return `종료까지 ${hours}시간 ${minutes}분`
}

export default function Lobby({ onStartStage, onOpenCoinShop, onOpenRanking, onLogoutToTitle }) {
  const authUser = useAuthStore((s) => s.user)
  const goldTotal = useGameStore((s) => s.goldTotal)
  const [records, setRecords] = useState(loadPlayerRecords)
  const [nickname, setNickname] = useState(() => getSavedNickname(authUser))
  const [modal, setModal] = useState(null) // 'ability' | 'weapon' | 'settings' | null
  const [stageBossPreview, setStageBossPreview] = useState(() => loadStageBossPreview())
  const [ambientPosition, setAmbientPosition] = useState(() => ({ x: 0, y: 0, scale: 1.08 }))

  const stageIds = useMemo(() => Object.keys(STAGE_CONFIGS), [])
  const season = useMemo(() => getActiveSeason(), [])

  useEffect(() => {
    setNickname(getSavedNickname(authUser))
  }, [authUser])

  useEffect(() => {
    const update = (event) => setStageBossPreview(event.detail ?? loadStageBossPreview())
    window.addEventListener(STAGE_BOSS_PREVIEW_EVENT, update)
    return () => window.removeEventListener(STAGE_BOSS_PREVIEW_EVENT, update)
  }, [])

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduceMotion || document.documentElement.hasAttribute('data-reduced-effects')) return
    setAmbientPosition(randomAmbientPosition())
    const timer = window.setInterval(() => setAmbientPosition(randomAmbientPosition()), 2400)
    return () => window.clearInterval(timer)
  }, [])

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
      /* 눌림 마이크로 인터랙션(인라인으로 불가) */
      .lobby-press{ transition: transform 90ms ease }
      .lobby-press:active{ transform: scale(0.96) }
      /* 접근성/멀미 게이트: 모션 정지 */
      @media (prefers-reduced-motion: reduce){ .lobby-anim{ animation: none !important } }
      :root[data-reduced-effects] .lobby-anim{ animation: none !important }
    `
    // StrictMode 이중 마운트 안전: 항상 교체(remove → append).
    document.getElementById('lobby-keyframes')?.remove()
    document.head.appendChild(style)
    return () => { if (document.getElementById('lobby-keyframes') === style) style.remove() }
  }, [])

  // 능력치/설정 모달을 닫을 때 최신 기록/코인 반영을 위해 기록을 다시 읽는다.
  const refreshRecords = () => setRecords(loadPlayerRecords())

  const closeModal = () => {
    setModal(null)
    refreshRecords()
  }

  return (
    <div style={styles.root}>
      {/* 배경 앰비언트 드리프트(콘텐츠 뒤, 클릭 방해 없음) */}
      <div
        className="lobby-anim"
        data-testid="lobby-ambient-drift"
        style={{
          ...styles.ambientDrift,
          transform: `translate3d(${ambientPosition.x}%, ${ambientPosition.y}%, 0) scale(${ambientPosition.scale})`,
        }}
        aria-hidden="true"
      />

      {/* 상단 sticky 상태바 */}
      <header style={styles.statusBar}>
        <div style={styles.profileRow}>
          <div style={styles.profileBlock}>
            <span style={styles.profileEyebrow}>플레이어</span>
            <strong style={styles.profileName}>{nickname || '이름 없는 생존자'}</strong>
          </div>
          <div style={styles.coinBadge}>
            <span style={styles.coinDot} />
            <strong style={styles.coinValue}>{goldTotal}</strong>
          </div>
          <button type="button" aria-label="설정 열기" style={styles.gearButton} onClick={() => setModal('settings')}>
            ⚙
          </button>
        </div>

        <div style={styles.seasonStrip}>
          <div style={styles.seasonMainRow}>
            <span style={styles.seasonLabel}>시즌</span>
            <span style={styles.seasonName}>{season.name}</span>
            <span style={styles.seasonCountdown}>{formatSeasonCountdown(season)}</span>
          </div>
        </div>

      </header>

      {/* 스테이지 리스트 */}
      <div style={styles.stageList} aria-label="스테이지 목록">
        {stageIds.map((stageId, index) => {
          const stage = getStageConfig(stageId)
          const unlocked = isStageUnlocked(stageId, records)
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
              onStart={() => onStartStage?.(stageId)}
              onRanking={() => onOpenRanking?.(stageId)}
            />
          )
        })}
      </div>

      <nav aria-label="로비 메뉴" style={styles.bottomNav}>
        <button type="button" className="lobby-press" style={styles.bottomNavButton} onClick={() => setModal('ability')}>능력치</button>
        <button type="button" className="lobby-press" style={styles.bottomNavButton} onClick={() => setModal('weapon')}>무기</button>
        <button type="button" className="lobby-press" style={styles.bottomNavButtonAccent} onClick={() => onOpenRanking?.()}>랭킹</button>
        <button type="button" className="lobby-press" style={styles.bottomNavButtonReward} onClick={() => onOpenCoinShop?.()}>상점</button>
      </nav>

      {modal === 'ability' && <AbilityModal onClose={closeModal} />}
      {modal === 'weapon' && <WeaponModal onClose={closeModal} />}
      {modal === 'settings' && (
        <LobbySettingsModal onClose={closeModal} onNicknameChange={setNickname} onLogoutToTitle={onLogoutToTitle} />
      )}
    </div>
  )
}

function StageCard({ index = 0, stageId, stage, unlocked, cleared, bestSurvivalSec, stageBossPreview, onStart, onRanking }) {
  const [entryMotionToken, setEntryMotionToken] = useState(0)
  const startTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (startTimerRef.current) window.clearTimeout(startTimerRef.current)
    }
  }, [])

  const queueStart = () => {
    if (!lobbyMotionAllowed()) {
      onStart?.()
      return
    }
    setEntryMotionToken((token) => token + 1)
    if (startTimerRef.current) window.clearTimeout(startTimerRef.current)
    startTimerRef.current = window.setTimeout(() => onStart?.(), STAGE_ENTRY_MOTION_MS)
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
      aria-label={`${stage.label} ${stage.title}`}
    >
      {unlocked ? (
        <div style={styles.previewStack} data-testid="stage-card-preview-row">
          <StageBossPreview framing={stageBossPreview} bossType={stage.bossType} motionToken={entryMotionToken} ariaLabel={`${stageId} 보스 3D`} style={styles.cardBossPreview} />
          {cleared ? <span style={styles.previewClearBadge}>클리어</span> : null}
          <div style={styles.previewTextLayer} data-testid="stage-card-preview-overlay">
            <div style={{ ...styles.cardTitleRow, ...styles.previewTitleRow }}>
              <span style={styles.previewTitle}>
                <span>{stage.label}</span>
                <span>{stage.title}</span>
              </span>
            </div>
            <div style={styles.previewBest}>
              내 최고기록: {bestSurvivalSec > 0 ? formatSurvivalTime(bestSurvivalSec) : '기록 없음'}
            </div>
          </div>
          <button
            type="button"
            className="lobby-press lobby-anim"
            style={{ ...styles.previewEnterButton, animation: 'lobbyCtaPulse 1600ms ease-in-out infinite' }}
            onClick={queueStart}
          >입장하기</button>
          <button type="button" className="lobby-press" style={styles.rankingButton} onClick={onRanking}>점수 레코드</button>
        </div>
      ) : (
        <div style={styles.cardTop} data-testid="stage-card-preview-row">
          <div style={{ ...styles.cardHead, ...styles.cardHeadFull }}>
            <div style={styles.cardTitleRow}>
              <span style={styles.cardTitle}>
                <span>{stage.label}</span>
                <span>{stage.title}</span>
              </span>
              <span style={cleared ? styles.tagCleared : styles.tagUncleared}>{cleared ? '클리어' : '미클리어'}</span>
            </div>
            <div style={styles.cardBest}>
              내 최고기록: {bestSurvivalSec > 0 ? formatSurvivalTime(bestSurvivalSec) : '기록 없음'}
            </div>
          </div>
        </div>
      )}

      {unlocked ? null : (
        <div style={styles.lockHint}>🔒 {STAGE_UNLOCK_HINT[stageId] ?? '이전 스테이지를 클리어하면 열립니다'}</div>
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
    transition: 'transform 2400ms ease-in-out',
    willChange: 'transform',
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
    width: 42,
    height: 42,
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
  previewEnterButton: {
    ...schoolButton('primary'),
    position: 'absolute',
    right: 10,
    bottom: 10,
    zIndex: 3,
    minWidth: 132,
    minHeight: 42,
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
    minHeight: 30,
    padding: '0 6px',
    fontSize: 10,
    lineHeight: 1.05,
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
