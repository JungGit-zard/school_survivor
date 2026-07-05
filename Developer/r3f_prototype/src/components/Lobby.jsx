// 로비(허브). 타이틀 "게임 시작" 게이트 통과 후 진입한다.
// 상단 sticky 상태바 + 스테이지 리스트 스크롤. 스테이지 선택·상점·랭킹·능력치·무기·설정 진입점.
//
// App.jsx가 주입할 prop 계약:
//   onStartStage(stageId)  — 스테이지 카드 "입장하기" → 게임 시작(App.startGame)
//   onOpenCoinShop()       — 코인상점 화면 진입
//   onOpenRanking(stageId?) — 랭킹 상세 화면 진입(stageId 있으면 해당 스테이지 보드, 없으면 글로벌)
// (설정/닉네임/능력치/무기 모달은 로비 내부에서 자체 처리 — App 배선 불필요)
import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { STAGE_CONFIGS, getStageConfig, isStageUnlocked } from '../lib/stageConfig.js'
import { load as loadPlayerRecords } from '../lib/playerRecords.js'
import { formatSurvivalTime } from '../lib/userRanking.js'
import { getSavedNickname } from '../lib/userNickname.js'
import { getActiveSeason } from '../lib/firebaseRanking.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'
import AbilityModal from './AbilityModal.jsx'
import WeaponModal from './WeaponModal.jsx'
import LobbySettingsModal from './LobbySettingsModal.jsx'

const STAGE_UNLOCK_HINT = {
  stage2: 'Stage 1 클리어 시 열림',
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

  const stageIds = useMemo(() => Object.keys(STAGE_CONFIGS), [])
  const season = useMemo(() => getActiveSeason(), [])

  useEffect(() => {
    setNickname(getSavedNickname(authUser))
  }, [authUser])

  // 능력치/설정 모달을 닫을 때 최신 기록/코인 반영을 위해 기록을 다시 읽는다.
  const refreshRecords = () => setRecords(loadPlayerRecords())

  const closeModal = () => {
    setModal(null)
    refreshRecords()
  }

  return (
    <div style={styles.root}>
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
        {stageIds.map((stageId) => {
          const stage = getStageConfig(stageId)
          const unlocked = isStageUnlocked(stageId, records)
          const bestSurvivalSec = records[stage.bestRecordKey] ?? 0
          const cleared = (records[stage.clearRecordKey] ?? 0) > 0
          return (
            <StageCard
              key={stageId}
              stageId={stageId}
              stage={stage}
              unlocked={unlocked}
              cleared={cleared}
              bestSurvivalSec={bestSurvivalSec}
              onStart={() => onStartStage?.(stageId)}
              onRanking={() => onOpenRanking?.(stageId)}
            />
          )
        })}
      </div>

      <nav aria-label="로비 메뉴" style={styles.bottomNav}>
        <button type="button" style={styles.bottomNavButton} onClick={() => setModal('ability')}>능력치</button>
        <button type="button" style={styles.bottomNavButton} onClick={() => setModal('weapon')}>무기</button>
        <button type="button" style={styles.bottomNavButtonAccent} onClick={() => onOpenRanking?.()}>랭킹</button>
        <button type="button" style={styles.bottomNavButtonReward} onClick={() => onOpenCoinShop?.()}>상점</button>
      </nav>

      {modal === 'ability' && <AbilityModal onClose={closeModal} />}
      {modal === 'weapon' && <WeaponModal onClose={closeModal} />}
      {modal === 'settings' && (
        <LobbySettingsModal onClose={closeModal} onNicknameChange={setNickname} onLogoutToTitle={onLogoutToTitle} />
      )}
    </div>
  )
}

function StageCard({ stageId, stage, unlocked, cleared, bestSurvivalSec, onStart, onRanking }) {
  const stageNumber = stageId.replace('stage', '')
  return (
    <section style={{ ...styles.card, ...(unlocked ? null : styles.cardLocked) }} aria-label={`${stage.label} ${stage.title}`}>
      <div style={styles.cardTop}>
        <div style={styles.thumb}>
          <span style={styles.thumbLabel}>STAGE</span>
          <span style={styles.thumbNumber}>{stageNumber}</span>
        </div>
        <div style={styles.cardHead}>
          <div style={styles.cardTitleRow}>
            <span style={styles.cardTitle}>{stage.label} · {stage.title}</span>
            <span style={cleared ? styles.tagCleared : styles.tagUncleared}>{cleared ? '클리어' : '미클리어'}</span>
          </div>
          <div style={styles.cardBest}>
            내 최고기록: {bestSurvivalSec > 0 ? formatSurvivalTime(bestSurvivalSec) : '기록 없음'}
          </div>
        </div>
      </div>

      {unlocked ? (
        <>
          <StageMonsterPreview stageId={stageId} />
          <div style={styles.cardActions}>
            <button type="button" style={styles.rankingButton} onClick={onRanking}>랭킹 상세히</button>
            <button type="button" style={styles.enterButton} onClick={onStart}>입장하기</button>
          </div>
        </>
      ) : (
        <div style={styles.lockHint}>🔒 {STAGE_UNLOCK_HINT[stageId] ?? '이전 스테이지를 클리어하면 열립니다'}</div>
      )}
    </section>
  )
}

function StageMonsterPreview({ stageId }) {
  const accent = stageId === 'stage2' ? '#7b36d9' : '#3d7f33'
  const skin = stageId === 'stage2' ? '#8f61d8' : '#84a85f'
  return (
    <div style={styles.monsterPreview} aria-label={`${stageId} 대표 좀비 3D`}>
      <Canvas orthographic camera={{ position: [0, 2.1, 5], zoom: 58 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 4]} intensity={2.4} />
        <group rotation={[0.15, -0.5, 0]} position={[0, -0.52, 0]}>
          <ZombieBlock size={[0.62, 0.62, 0.48]} position={[0, 1.25, 0]} color={skin} />
          <ZombieBlock size={[0.58, 0.62, 0.42]} position={[0, 0.58, 0]} color={accent} />
          <ZombieBlock size={[0.2, 0.56, 0.2]} position={[-0.48, 0.5, 0.04]} color={accent} rotation={[-0.8, 0, 0.15]} />
          <ZombieBlock size={[0.2, 0.56, 0.2]} position={[0.48, 0.5, 0.04]} color={accent} rotation={[-0.8, 0, -0.15]} />
          <ZombieBlock size={[0.22, 0.58, 0.22]} position={[-0.18, -0.05, 0]} color={accent} />
          <ZombieBlock size={[0.22, 0.58, 0.22]} position={[0.18, -0.05, 0]} color={accent} />
          <ZombieBlock size={[0.1, 0.1, 0.04]} position={[-0.14, 1.28, 0.26]} color="#f2ffd3" outline={false} />
          <ZombieBlock size={[0.1, 0.1, 0.04]} position={[0.14, 1.28, 0.26]} color="#f2ffd3" outline={false} />
        </group>
      </Canvas>
    </div>
  )
}

function ZombieBlock({ size, position, color, rotation = [0, 0, 0], outline = true }) {
  return (
    <group position={position} rotation={rotation}>
      {outline && (
        <mesh scale={[1.08, 1.08, 1.08]} renderOrder={0}>
          <boxGeometry args={size} />
          <meshBasicMaterial color="#050209" side={THREE.BackSide} />
        </mesh>
      )}
      <mesh renderOrder={1}>
        <boxGeometry args={size} />
        <meshToonMaterial color={color} />
      </mesh>
    </group>
  )
}

const styles = {
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #18372f 0%, #131018 62%, #151019 100%)',
    color: uiPalette.paperLight,
    fontFamily: uiType.family,
    boxSizing: 'border-box',
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
    gap: 10,
    padding: 12,
    boxSizing: 'border-box',
  },
  cardLocked: {
    opacity: 0.6,
  },
  cardTop: {
    display: 'flex',
    gap: 11,
    alignItems: 'center',
  },
  thumb: {
    flex: '0 0 auto',
    width: 60,
    height: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.chalkboard,
    color: uiPalette.reward,
    boxShadow: uiShadows.pressSmall,
  },
  thumbLabel: {
    fontSize: 9,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 1,
  },
  thumbNumber: {
    fontFamily: uiType.numeric,
    fontSize: 30,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    color: uiPalette.paperLight,
  },
  cardHead: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    minWidth: 0,
    color: uiPalette.ink,
    fontSize: 16,
    lineHeight: 1.15,
    fontWeight: uiType.weightHeavy,
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
  monsterPreview: {
    width: '100%',
    height: 104,
    border: uiBorders.hairline,
    borderRadius: 8,
    background: 'linear-gradient(180deg, rgba(24,55,47,0.9), rgba(16,40,32,0.92))',
    overflow: 'hidden',
  },
  cardActions: {
    display: 'flex',
    gap: 8,
  },
  rankingButton: {
    ...schoolButton('paper'),
    flex: '0 0 auto',
    minWidth: 108,
    minHeight: 46,
    fontSize: 14,
  },
  enterButton: {
    ...schoolButton('primary'),
    flex: 1,
    minHeight: 46,
    fontSize: 17,
    letterSpacing: 0.5,
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
