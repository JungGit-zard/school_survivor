import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { MISSION_CATALOG } from '../lib/missionCatalog.js'
import { getMissionStatus } from '../lib/missionProgress.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'

const FILTERS = [
  { id: 'recommended', label: '추천' },
  { id: 'progress', label: '진행' },
  { id: 'completed', label: '완료' },
  { id: 'all', label: '전체' },
]

export default function MissionCenter({ onBack }) {
  const user = useAuthStore((state) => state.user)
  const { missionProgress, missionSyncState, togglePinnedMission, saveMissionProgress, claimMissionReward } = useGameStore(useShallow((state) => ({
    missionProgress: state.missionProgress,
    missionSyncState: state.missionSyncState,
    togglePinnedMission: state.togglePinnedMission,
    saveMissionProgress: state.saveMissionProgress,
    claimMissionReward: state.claimMissionReward,
  })))
  const [filter, setFilter] = useState('recommended')
  const [notice, setNotice] = useState('')
  const [claimingMissionId, setClaimingMissionId] = useState('')

  const missions = useMemo(() => {
    const entries = MISSION_CATALOG.map((mission) => ({ mission, ...getMissionStatus(missionProgress, mission) }))
    if (filter === 'progress') return entries.filter((entry) => entry.state === 'active' && entry.counter > 0)
    if (filter === 'completed') return entries.filter((entry) => entry.state === 'completed_unclaimed' || entry.state === 'claimed')
    if (filter === 'recommended') return entries
      .filter((entry) => entry.state === 'completed_unclaimed' || entry.counter > 0 || entry.mission.sourceNumber <= 6)
      .slice(0, 6)
    return entries
  }, [filter, missionProgress])

  const handlePin = async (missionId) => {
    setNotice('')
    if (!togglePinnedMission(missionId)) {
      setNotice('고정 미션은 최대 2개까지 선택할 수 있어요.')
      return
    }
    const saved = await saveMissionProgress()
    if (!saved.ok) setNotice('고정 상태를 저장하지 못했어요. 게임은 계속할 수 있어요.')
  }

  const handleClaim = async (missionId) => {
    if (claimingMissionId) return
    setNotice('')
    setClaimingMissionId(missionId)
    const result = await claimMissionReward(missionId)
    setClaimingMissionId('')
    if (result.ok) return
    const messages = {
      unauthenticated: '로그인이 필요해요.',
      'not-completed': '완료한 미션만 받을 수 있어요.',
      'already-claimed': '이미 받은 보상이에요.',
      'progress-not-hydrated': '미션 데이터를 불러오는 중이에요. 잠시 후 다시 시도해요.',
    }
    setNotice(messages[result.reason] ?? '보상을 저장하지 못했어요. 게임은 계속할 수 있어요.')
  }

  const syncMessage = !user?.uid
    ? '로그인하면 미션 진행이 Firebase에 저장됩니다. 지금도 게임은 할 수 있어요.'
    : missionSyncState === 'hydrated' || missionSyncState === 'saved'
      ? '이 계정의 미션 진행은 Firebase에 저장됩니다.'
      : '미션 진행을 Firebase에 저장하는 중이에요. 게임은 계속할 수 있어요.'

  return (
    <main style={styles.root} aria-label="미션 센터">
      <section style={styles.panel}>
        <header style={styles.header}>
          <div><h1 style={styles.title}>미션 센터</h1><p style={styles.subTitle}>30개의 목표를 확인하고 원하는 미션을 고정하세요.</p></div>
          <button type="button" aria-label="미션 센터 닫기" style={styles.closeButton} onClick={onBack}>×</button>
        </header>
        <p style={styles.sync}>{syncMessage}</p>
        <nav aria-label="미션 필터" style={styles.tabs}>
          {FILTERS.map((item) => <button key={item.id} type="button" style={{ ...styles.tab, ...(filter === item.id ? styles.tabActive : null) }} onClick={() => setFilter(item.id)}>{item.label}</button>)}
        </nav>
        {notice && <p role="status" style={styles.notice}>{notice}</p>}
        <div style={styles.list}>
          {missions.map((entry) => <MissionCard key={entry.mission.id} entry={entry} pinned={missionProgress.pinnedMissionIds.includes(entry.mission.id)} onPin={handlePin} onClaim={handleClaim} claiming={claimingMissionId === entry.mission.id} />)}
          {missions.length === 0 && <p style={styles.empty}>이 필터에 맞는 미션이 아직 없어요. 전체 탭에서 30개 목표를 확인해 보세요.</p>}
        </div>
      </section>
    </main>
  )
}

function MissionCard({ entry, pinned, onPin, onClaim, claiming }) {
  const { mission, state, counter, target } = entry
  const status = state === 'claimed' ? '받음' : state === 'completed_unclaimed' ? '완료' : '진행'
  const progress = Math.min(100, Math.round((counter / Math.max(target, 1)) * 100))
  return (
    <article style={{ ...styles.card, ...(state === 'completed_unclaimed' ? styles.cardComplete : null), ...(state === 'claimed' ? styles.cardClaimed : null) }}>
      <div style={styles.cardHead}>
        <span style={styles.status}>{status}</span>
        <strong style={styles.cardTitle}>{mission.sourceNumber}. {mission.title}</strong>
        <button type="button" style={styles.pinButton} aria-pressed={pinned} aria-label={`${mission.title} ${pinned ? '고정 해제' : '고정'}`} onClick={() => onPin(mission.id)}>{pinned ? '고정됨' : '고정'}</button>
      </div>
      <p style={styles.objective}>{mission.objective}</p>
      <div style={styles.progressRow}><div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${progress}%` }} /></div><span>{counter}/{target}</span></div>
      <div style={styles.rewardRow}>
        <span>보상 {mission.rewardProposal.amount}골드</span>
        {state === 'completed_unclaimed' && <button type="button" disabled={claiming} style={{ ...styles.claimButton, ...(claiming ? styles.pendingButton : null) }} onClick={() => onClaim(mission.id)}>{claiming ? '받는 중…' : '받기'}</button>}
      </div>
    </article>
  )
}

const styles = {
  root: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 12, boxSizing: 'border-box', background: 'rgba(5,2,9,0.72)', color: uiPalette.ink, fontFamily: uiType.family },
  panel: { ...schoolPanel('paper'), width: 'min(100%, 620px)', height: 'min(calc(100dvh - 24px), 760px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '14px 14px 8px', borderBottom: uiBorders.strong },
  title: { margin: 0, fontSize: 22, fontWeight: uiType.weightHeavy }, subTitle: { margin: '4px 0 0', fontSize: 12, fontWeight: 700, lineHeight: 1.35 },
  closeButton: { ...schoolButton('primary'), minWidth: 44, minHeight: 44, padding: 0, fontSize: 26 },
  sync: { margin: 0, padding: '9px 14px', background: 'rgba(24,55,47,0.12)', fontSize: 12, fontWeight: 800, lineHeight: 1.35 },
  tabs: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, padding: 10, borderBottom: uiBorders.hairline },
  tab: { ...schoolButton('paper'), minHeight: 44, padding: '0 4px', fontSize: 13 }, tabActive: { ...schoolButton('primary'), minHeight: 44, padding: '0 4px', fontSize: 13 },
  notice: { margin: '0 10px 8px', padding: '8px 10px', border: uiBorders.hairline, borderRadius: 8, background: '#fff0be', color: '#493f4d', fontSize: 12, fontWeight: 800 },
  list: { flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }, empty: { margin: 0, padding: 14, fontSize: 14, fontWeight: 800, lineHeight: 1.45 },
  card: { ...schoolPanel('paper'), padding: 11, display: 'grid', gap: 8, boxShadow: uiShadows.pressSmall }, cardComplete: { borderColor: uiPalette.rewardDeep, background: '#fff6cf' }, cardClaimed: { opacity: 0.76 },
  cardHead: { display: 'flex', alignItems: 'center', gap: 7 }, status: { padding: '3px 7px', border: uiBorders.hairline, borderRadius: 999, fontSize: 11, fontWeight: uiType.weightHeavy, whiteSpace: 'nowrap' }, cardTitle: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.25, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  pinButton: { ...schoolButton('paper'), minWidth: 44, minHeight: 44, padding: '0 7px', fontSize: 11 }, objective: { margin: 0, fontSize: 13, lineHeight: 1.4, fontWeight: 700, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  progressRow: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: uiType.numeric, fontSize: 12, fontWeight: uiType.weightHeavy }, progressTrack: { flex: 1, height: 9, overflow: 'hidden', border: uiBorders.hairline, borderRadius: 999, background: 'rgba(5,2,9,0.12)' }, progressFill: { height: '100%', background: uiPalette.primary },
  rewardRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, color: uiPalette.rewardDeep, fontSize: 12, fontWeight: uiType.weightHeavy }, claimButton: { ...schoolButton('primary'), minWidth: 72, minHeight: 48, padding: '0 12px', fontSize: 14 }, pendingButton: { minHeight: 48, border: uiBorders.hairline, borderRadius: 7, background: '#9aa0a6', color: '#31363f', fontWeight: 900, cursor: 'not-allowed' },
}
